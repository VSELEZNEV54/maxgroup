// SEO- и ссылочная проверка собранного сайта. Запускается в конце каждой сборки.
import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';

const text = (s) => s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;| | /g, ' ').replace(/\s+/g, ' ').trim();

export function lint(ctx, rendered, outDir) {
  const errors = [];
  const warnings = [];
  const titles = new Map();
  const descs = new Map();
  const h1s = new Map();
  const urls = new Set(rendered.map((r) => r.page.url));
  const stats = { pages: rendered.length, words: 0, internalLinks: 0, images: 0, thin: 0 };
  const inbound = new Map();
  const base = ctx.build.base || '';

  for (const { page, html, rel } of rendered) {
    const where = page.url;
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1]));
    const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0];
    const words = text(main).split(' ').filter(Boolean).length;
    stats.words += words;

    if (!title) errors.push(`${where}: нет <title>`);
    if (!page.noindex) {
      if (title.length > 72) warnings.push(`${where}: title длиннее 72 знаков (${title.length})`);
      if (title.length < 25) warnings.push(`${where}: title короче 25 знаков (${title.length})`);
      if (!desc) errors.push(`${where}: нет meta description`);
      else if (desc.length < 70) warnings.push(`${where}: description короче 70 знаков (${desc.length})`);
      else if (desc.length > 170) warnings.push(`${where}: description длиннее 170 знаков (${desc.length})`);
      // описание собирается из законченных предложений: хвост «…» — признак обрезки на полуслове
      if (/(…|\.\.\.)$/.test(desc.trim())) warnings.push(`${where}: description оборван многоточием`);
      if (h1.length !== 1) errors.push(`${where}: на странице ${h1.length} H1 (нужен ровно один)`);
      if (titles.has(title)) errors.push(`${where}: дубль title со страницей ${titles.get(title)}`);
      else titles.set(title, where);
      if (desc && descs.has(desc)) warnings.push(`${where}: дубль description со страницей ${descs.get(desc)}`);
      else if (desc) descs.set(desc, where);
      if (h1[0] && h1s.has(h1[0])) warnings.push(`${where}: дубль H1 «${h1[0]}» со страницей ${h1s.get(h1[0])}`);
      else if (h1[0]) h1s.set(h1[0], where);
      if (words < 250 && !['notFound', 'sitemap', 'privacy'].includes(page.type)) { stats.thin++; warnings.push(`${where}: мало текста (${words} слов)`); }
      if (!/<link rel="canonical"/.test(html)) errors.push(`${where}: нет canonical`);
      if (!/application\/ld\+json/.test(html)) errors.push(`${where}: нет JSON-LD`);
    }

    // порядок заголовков: без скачков через уровень
    const levels = [...main.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) { warnings.push(`${where}: скачок уровня заголовков h${levels[i - 1]} → h${levels[i]}`); break; }
    }

    // изображения
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      stats.images++;
      const tag = m[0];
      if (!/\salt="/.test(tag)) errors.push(`${where}: <img> без alt — ${tag.slice(0, 90)}`);
      if (!/\swidth="/.test(tag) && !/data-lightbox-img/.test(tag)) warnings.push(`${where}: <img> без width/height — ${(tag.match(/src="([^"]*)"/) || [])[1]}`);
    }

    // внутренние ссылки и файлы
    if (ctx.build.local) continue;
    for (const m of html.matchAll(/\s(?:href|src|poster|action|data-src|data-src-mobile|data-calc-url)="([^"]+)"/g)) {
      let href = m[1].replace(/&amp;/g, '&');
      if (/^(https?:|mailto:|tel:|data:|#|\/\/|javascript:)/.test(href)) continue;
      href = href.split('#')[0].split('?')[0];
      if (!href) continue;
      if (!href.startsWith('/')) href = posix.join(posix.dirname('/' + rel), href);
      // сайт в подпапке: ссылка обязана начинаться с базового пути; дальше проверяем ее как обычную
      else if (base) {
        if (href !== base && !href.startsWith(base + '/')) { errors.push(`${where}: ссылка мимо базового пути ${base} — ${href}`); continue; }
        href = href.slice(base.length) || '/';
      }
      if (href.startsWith('/assets/') || /\.(xml|txt|webmanifest|ico|png|json)$/.test(href)) {
        if (!existsSync(join(outDir, href)) && !/main\.css|\/js\//.test(href) && !/sitemap\.xml|robots\.txt|site\.webmanifest/.test(href)) errors.push(`${where}: нет файла ${href}`);
        continue;
      }
      stats.internalLinks++;
      if (!urls.has(href)) errors.push(`${where}: битая внутренняя ссылка ${href}`);
      else if (href !== page.url) inbound.set(href, (inbound.get(href) || 0) + 1);
    }
  }

  if (!ctx.build.local) {
    for (const { page } of rendered) {
      if (page.noindex || page.url === '/' || page.url.endsWith('.html')) continue;
      const n = inbound.get(page.url) || 0;
      if (n === 0) errors.push(`${page.url}: страница-сирота (нет входящих внутренних ссылок)`);
      else if (n < 2) warnings.push(`${page.url}: всего одна входящая внутренняя ссылка`);
    }
  }

  const uniq = (a) => [...new Set(a)];
  return { stats: { ...stats, avgWords: Math.round(stats.words / Math.max(1, stats.pages)) }, errors: uniq(errors), warnings: uniq(warnings) };
}
