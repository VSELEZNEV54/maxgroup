#!/usr/bin/env node
// Генератор статического сайта «Макс Групп».
//   node build.mjs            → dist/        чистые ЧПУ, для сервера и продакшена
//   node build.mjs --local    → dist-local/  относительные ссылки, открывается двойным кликом по index.html
//   node build.mjs --out=dir  → в другую папку (для параллельной работы)
//   node build.mjs --quiet    → без подробного отчёта; --verbose → все предупреждения; --only=/uslugi/ → отчёт только по адресам с этим префиксом
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, statSync, lstatSync, renameSync, symlinkSync, copyFileSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, setMode, setCurrent, abs, u } from './src/lib/core.mjs';
import { loadContext } from './src/data/index.mjs';
import { base } from './src/layout/base.mjs';
import { collectPages } from './src/pages/index.mjs';
import { resetFormIds } from './src/components/forms.mjs';
import { lint } from './src/lib/lint.mjs';

const args = new Set(process.argv.slice(2));
const local = args.has('--local');
const quiet = args.has('--quiet');
const outArg = process.argv.slice(2).find((x) => x.startsWith('--out='));
const outName = outArg ? outArg.slice(6) : local ? 'dist-local' : 'dist';
// Папка проекта может лежать в iCloud Drive (Рабочий стол, Документы). Чтобы тысячи собранных файлов не уходили
// в синхронизацию и не плодили дубликаты «имя 2.webp», сборка пишется в «<имя>.nosync» (iCloud такие папки не трогает),
// а рядом кладётся ссылка с обычным именем: dist → dist.nosync.
const OUT = join(ROOT, `${outName}.nosync`);
const outLink = join(ROOT, outName);
try {
  const st = lstatSync(outLink);
  if (st.isDirectory() && !st.isSymbolicLink()) {
    if (existsSync(OUT)) rmSync(outLink, { recursive: true, force: true });
    else renameSync(outLink, OUT);
  }
} catch { /* ссылки ещё нет */ }
mkdirSync(OUT, { recursive: true });
try { lstatSync(outLink); } catch { symlinkSync(`${outName}.nosync`, outLink); }
const t0 = Date.now();

setMode(local ? 'local' : 'prod');

// --- стили и скрипты -----------------------------------------------------------------

const cssDir = join(ROOT, 'src', 'css');
const cssFiles = readdirSync(cssDir).filter((f) => f.endsWith('.css')).sort();
let css = readFileSync(join(ROOT, 'assets', 'fonts', 'fonts.css'), 'utf8') + '\n' + cssFiles.map((f) => readFileSync(join(cssDir, f), 'utf8')).join('\n');
const cssMin = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*\n\s*/g, '\n')
  .replace(/\n+/g, '\n')
  .replace(/\s*([{};,>])\s*/g, (m, c) => (c === '>' ? m : c))
  .replace(/;}/g, '}')
  .replace(/:\s+/g, ':')
  .trim();

const jsDir = join(ROOT, 'src', 'js');
const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith('.js'));
const version = createHash('sha1').update(cssMin + jsFiles.map((f) => readFileSync(join(jsDir, f), 'utf8')).join('')).digest('hex').slice(0, 8);

// --- контекст и страницы ----------------------------------------------------------------

// Даты — по владивостокскому времени: toISOString() даёт UTC, и ночная сборка получала вчерашнее число.
const dayVl = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Vladivostok' }).format(d);
const today = dayVl(new Date());
// Дата содержимого для lastmod в sitemap.xml — последнее изменение исходников (данные, тексты, шаблоны), а не момент сборки:
// lastmod, который меняется у всех страниц при каждой сборке, поисковики перестают учитывать.
function latestMtime(dir) {
  let max = 0;
  if (!existsSync(dir)) return max;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || / \d+(\.[a-z0-9]+)?$/i.test(e.name)) continue;
    const full = join(dir, e.name);
    max = Math.max(max, e.isDirectory() ? latestMtime(full) : statSync(full).mtimeMs);
  }
  return max;
}
const contentMs = Math.max(...['data', 'content', 'src'].map((d) => latestMtime(join(ROOT, d))));
const contentDate = contentMs ? dayVl(new Date(contentMs)) : today;
const ctx = loadContext({ version, date: today, contentDate, year: Number(today.slice(0, 4)), local });
const { pages, problems } = await collectPages(ctx);

// --- запись ---------------------------------------------------------------------------------

function write(rel, content) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function copyTree(src, dst) {
  let n = 0;
  if (!existsSync(src)) return 0;
  mkdirSync(dst, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    // служебные файлы и дубликаты синхронизации («01 2.webp») не копируем
    if (e.name.startsWith('.') || / \d+(\.[a-z0-9]+)?$/i.test(e.name)) continue;
    const s = join(src, e.name);
    const d = join(dst, e.name);
    if (e.isDirectory()) n += copyTree(s, d);
    else {
      const ss = statSync(s);
      if (existsSync(d)) {
        const ds = statSync(d);
        if (ds.size === ss.size && Math.abs(ds.mtimeMs - ss.mtimeMs) < 1500) continue;
      }
      copyFileSync(s, d);
      utimesSync(d, ss.atime, ss.mtime);
      n++;
    }
  }
  return n;
}

// чистим только HTML прошлой сборки — тяжёлые ассеты копируются инкрементально
for (const e of existsSync(OUT) ? readdirSync(OUT) : []) {
  if (e !== 'assets') rmSync(join(OUT, e), { recursive: true, force: true });
}
mkdirSync(OUT, { recursive: true });

const rendered = [];
for (const page of pages) {
  setCurrent(page.url);
  resetFormIds();
  let body;
  try {
    body = page.render(ctx, page);
  } catch (e) {
    problems.push(`${page.url} (${page.module}): ошибка рендера — ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
    continue;
  }
  let doc = base(ctx, page, body);
  // локальный режим: любые оставшиеся абсолютные пути (например, из текстов и Markdown) делаем относительными
  if (local) doc = doc.replace(/\s(href|src|poster|data-src|data-src-mobile)="(\/[^"/][^"]*|\/)"/g, (m, attr, path) => ` ${attr}="${u(path)}"`);
  const rel = page.url.endsWith('/') ? page.url.slice(1) + 'index.html' : page.url.slice(1);
  write(rel, doc);
  rendered.push({ page, rel, html: doc });
}

write('assets/css/main.css', cssMin);
for (const f of jsFiles) write(`assets/js/${f}`, readFileSync(join(jsDir, f), 'utf8'));
let copied = 0;
for (const dir of ['img', 'video', 'fonts']) {
  const from = join(ROOT, 'assets', dir);
  const to = join(OUT, 'assets', dir);
  // временные сборки (--out=…) не дублируют 75 МБ ассетов, а ссылаются на исходную папку
  if (outArg) {
    try { lstatSync(to); } catch { symlinkSync(from, to); }
  } else copied += copyTree(from, to);
}

// --- служебные файлы -----------------------------------------------------------------------------

const indexable = pages.filter((p) => !p.noindex && !p.url.endsWith('.html'));
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  indexable
    .map((p) => {
      const images = (p.images || []).slice(0, 8).map((i) => `    <image:image><image:loc>${abs(ctx.site, '/' + i.replace(/^\//, ''))}</image:loc></image:image>`).join('\n');
      return `  <url>\n    <loc>${abs(ctx.site, p.url)}</loc>\n    <lastmod>${p.modified || p.lastmod || contentDate}</lastmod>\n    <changefreq>${p.changefreq || 'weekly'}</changefreq>\n    <priority>${(p.priority ?? 0.6).toFixed(1)}</priority>${images ? '\n' + images : ''}\n  </url>`;
    })
    .join('\n') +
  `\n</urlset>\n`;
write('sitemap.xml', sitemap);

write(
  'robots.txt',
  [
    // рекламные метки (utm, yclid, gclid) не закрываем: на таких адресах робот должен увидеть canonical;
    // для Яндекса они склеиваются через Clean-param
    'User-agent: *',
    'Allow: /',
    'Disallow: /*?sort=',
    'Disallow: /*&sort=',
    '',
    'User-agent: Yandex',
    'Allow: /',
    'Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&ysclid&gclid&from',
    // параметры клиентских фильтров каталога и калькулятора не создают новых страниц
    'Clean-param: country&brand&model&price-max&price-min&year-min&year-max&mileage-max&hp-max&body&fuel&drive&sort /catalog/',
    'Clean-param: country&brand&model&price-max&year-min&body&fuel&drive&hp-max&sort /podborki/',
    'Clean-param: brand&model&price-max&year-min&body&fuel&drive&hp-max&sort /avto-iz-yaponii/',
    'Clean-param: brand&model&price-max&year-min&body&fuel&drive&hp-max&sort /avto-iz-korei/',
    'Clean-param: brand&model&price-max&year-min&body&fuel&drive&hp-max&sort /avto-iz-kitaya/',
    'Clean-param: country&price&year&month&fuel&cc&hp&ehp&e30&city&body&personal&markup&view&ref /kalkulyator/',
    '',
    `Sitemap: ${abs(ctx.site, '/sitemap.xml')}`,
    '',
  ].join('\n')
);

write(
  'site.webmanifest',
  JSON.stringify(
    {
      name: `${ctx.site.name} — авто из Азии`,
      short_name: ctx.site.name,
      lang: 'ru',
      start_url: '/',
      display: 'browser',
      background_color: '#0a0c0f',
      theme_color: '#0a0c0f',
      icons: [
        { src: '/assets/img/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/assets/img/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2
  )
);

// llms.txt — краткая карта сайта для ИИ-ассистентов и нейро-ответов
const sect = (title, list) => (list.length ? `\n## ${title}\n\n${list.map((p) => `- [${p.h1 || p.title}](${abs(ctx.site, p.url)}): ${p.description}`).join('\n')}\n` : '');
const byType = (t) => indexable.filter((p) => p.type === t);
write(
  'llms.txt',
  `# ${ctx.site.name}\n\n> ${ctx.site.description}\n\n` +
    `Адрес: ${ctx.site.contacts.addressFull}. Телефон: ${ctx.site.contacts.phones[0].label}. Режим работы: ${ctx.site.contacts.hours} (время владивостокское).\n` +
    sect('Главное', [...byType('home'), ...byType('catalog'), ...byType('calculator'), ...byType('about'), ...byType('contacts')]) +
    sect('Каталог по странам', byType('country')) +
    sect('Услуги', byType('service')) +
    sect('Подборки', byType('selection')) +
    sect('Марки', byType('brand')) +
    sect('Справочные материалы', [...byType('faq'), ...byType('guide'), ...byType('post')]) +
    sect('Доставка по городам', [...byType('delivery'), ...byType('city')])
);

// часть роботов и браузеров запрашивает иконку в корне сайта, а не по адресу из <link rel="icon">
const favicon = join(ROOT, 'assets', 'img', 'brand', 'favicon.ico');
if (existsSync(favicon)) copyFileSync(favicon, join(OUT, 'favicon.ico'));

// Дубликаты синхронизации («index 2.html», «kia 2/», «02 3.webp») могут появиться в папке сборки, пока она пишется.
// Убираем их, чтобы копии страниц не уехали на сервер. По ссылкам (assets при --out) не ходим — исходники не трогаем.
function sweepDuplicates(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (/ \d+(\.[a-z0-9]+)?$/i.test(e.name)) { rmSync(full, { recursive: true, force: true }); n++; }
    else if (e.isDirectory()) n += sweepDuplicates(full);
  }
  return n;
}
const swept = sweepDuplicates(OUT);

// --- отчёт --------------------------------------------------------------------------------------------

const report = lint(ctx, rendered, OUT);
report.errors.unshift(...problems);
report.stats.syncDuplicatesRemoved = swept;
write('build-report.json', JSON.stringify(report, null, 2));

const ms = Date.now() - t0;
console.log(`✓ ${rendered.length} страниц → ${outName}/  (${ms} мс, ассетов скопировано: ${copied}, версия ${version})`);
if (swept) console.log(`  убрано дубликатов синхронизации из папки сборки: ${swept}`);
const onlyArg = process.argv.slice(2).find((x) => x.startsWith('--only='));
if (onlyArg) {
  const pre = onlyArg.slice(7).split(',');
  const keep = (line) => pre.some((x) => line.startsWith(x) || line.includes(` (${x}`)) || !line.startsWith('/');
  report.errors = report.errors.filter(keep);
  report.warnings = report.warnings.filter(keep);
}
if (!quiet) {
  const types = {};
  for (const p of pages) types[p.type || 'other'] = (types[p.type || 'other'] || 0) + 1;
  console.log('  типы страниц:', Object.entries(types).map(([k, v]) => `${k}:${v}`).join('  '));
  console.log(`  SEO-проверка: ошибок ${report.errors.length}, предупреждений ${report.warnings.length}`);
  for (const e of report.errors.slice(0, 40)) console.log('   ✗', e);
  for (const w of report.warnings.slice(0, args.has('--verbose') ? 400 : 12)) console.log('   !', w);
  if (report.warnings.length > 12 && !args.has('--verbose')) console.log(`   … ещё ${report.warnings.length - 12} (см. dist/build-report.json или --verbose)`);
}
process.exitCode = report.errors.length && args.has('--strict') ? 1 : 0;
