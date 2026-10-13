// Базовые помощники генератора: шаблоны, экранирование, ссылки, форматирование, изображения.
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// --- режим сборки -----------------------------------------------------------
// prod  — чистые ЧПУ от корня домена (/avto-iz-yaponii/), для сервера и продакшена
// local — относительные ссылки с index.html, сайт открывается двойным кликом
const state = { mode: 'prod', current: '/', base: '' };
export const setMode = (m) => { state.mode = m; };
export const getMode = () => state.mode;
// Базовый путь, если сайт лежит не в корне домена (демо на GitHub Pages: /maxgroup). Пустая строка — сайт в корне.
export const setBase = (b) => { state.base = String(b || '').replace(/\/+$/, ''); };
export const getBase = () => state.base;
export const setCurrent = (url) => { state.current = url; };
export const getCurrent = () => state.current;

// --- шаблоны -----------------------------------------------------------------

/** Тег-шаблон: склеивает массивы, пропускает null/undefined/false. Экранирования нет — используйте esc(). */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += flat(values[i]);
  });
  return out;
}

function flat(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(flat).join('');
  return String(v);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Атрибуты из объекта: attrs({class:'a', hidden:true, id:null}) → ' class="a" hidden' */
export function attrs(o = {}) {
  return Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}

export const cx = (...parts) => parts.flat().filter(Boolean).join(' ');

// --- ссылки --------------------------------------------------------------------

/** Внутренняя ссылка. Принимает абсолютный путь сайта ('/avto-iz-yaponii/', '/assets/img/x.webp', '/#calc'). */
export function u(path) {
  if (!path) return '#';
  if (/^(https?:|mailto:|tel:|#|data:|\/\/)/.test(path)) return path;
  if (state.mode !== 'local') {
    // сайт в подпапке: корневой адрес получает базовый путь; уже дополненный адрес второй раз не меняется
    if (!state.base || !path.startsWith('/') || path === state.base || path.startsWith(state.base + '/')) return path;
    return state.base + path;
  }
  const [p, hash = ''] = path.split('#');
  const from = state.current.endsWith('/') ? state.current : posix.dirname(state.current) + '/';
  let target = p;
  if (target.endsWith('/')) target += 'index.html';
  let rel = posix.relative(from, target) || 'index.html';
  return rel + (hash ? '#' + hash : '');
}

/** Путь к файлу из /assets: a('img/cars/x/01.webp') */
export const a = (file) => u('/assets/' + String(file).replace(/^\/?(assets\/)?/, ''));

/** Абсолютный URL для canonical / OG / schema.org */
export const abs = (site, path) => site.url.replace(/\/$/, '') + path;

// --- форматирование --------------------------------------------------------------

const NBSP = ' ';
const NNBSP = ' '; // узкий неразрывный пробел для разрядов

export const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
export const price = (n) => (n || n === 0 ? `${num(n)}${NBSP}₽` : 'по запросу');
export const km = (n) => (n || n === 0 ? `${num(n)}${NBSP}км` : '—');

/** Цена коротко: 1 505 000 → «1,5 млн ₽», 850 000 → «850 тыс. ₽» */
export function priceShort(n) {
  if (!n && n !== 0) return 'по запросу';
  if (n >= 1_000_000) {
    const m = Math.round(n / 100_000) / 10;
    return `${String(m).replace('.', ',')}${NBSP}млн${NBSP}₽`;
  }
  return `${Math.round(n / 1000)}${NBSP}тыс.${NBSP}₽`;
}

/** Объём двигателя: 1496 → «1.5 л» */
export const liters = (cc) => (cc ? `${(Math.round(cc / 100) / 10).toFixed(1)}${NBSP}л` : null);

/** Склонение: plural(5, ['автомобиль','автомобиля','автомобилей']) */
export function plural(n, forms) {
  const a10 = Math.abs(n) % 10;
  const a100 = Math.abs(n) % 100;
  if (a10 === 1 && a100 !== 11) return forms[0];
  if (a10 >= 2 && a10 <= 4 && (a100 < 12 || a100 > 14)) return forms[1];
  return forms[2];
}

export const count = (n, forms) => `${num(n)}${NBSP}${plural(n, forms)}`;

/** Первая буква — строчная, остальное не трогаем: «Стоимость до Владивостока» → «стоимость до Владивостока». */
export const lcFirst = (s) => { const t = String(s ?? ''); return t.charAt(0).toLowerCase() + t.slice(1); };

const WJ = '\u2060'; // соединитель слов: запрещает перенос, ничего не рисует

// Типографика применяется только к тексту: содержимое тегов (адреса ссылок, атрибуты) не трогаем.
const outsideTags = (fn) => (s) => {
  const str = String(s ?? '');
  return str.includes('<') ? str.replace(/(^|>)([^<]+)/g, (m, lead, text) => lead + fn(text)) : fn(str);
};

const glueText = (s) =>
  s
    .replace(/([а-яё])\/(?=[а-яё])/gi, `$1/${WJ}`) // только кириллица («ж/д», «л/с»): адреса ссылок не затрагиваются
    .replace(/(\d)–(?=\d)/g, `$1–${WJ}`)
    .replace(/(\d)-(?=[а-яё])/gi, `$1-${WJ}`)
    .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NNBSP}`)
    .replace(/(\d)[ \u00a0]?(₽|€|\$|¥|₩|%)/g, `$1${NBSP}$2`)
    .replace(/(\d) (км|л\.с\.|кВт|см³|л|млн|млрд|тыс\.|дней|дня|день|дн\.|лет|года|год|г\.|месяцев|месяца|мес\.|недель|недели|часов|часа|юаней|иен|вон)(?![а-яёa-z])/gi, `$1${NBSP}$2`)
    .replace(/(тыс\.|млн|млрд) (₽|€|\$|¥|₩|руб)/g, `$1${NBSP}$2`)
    .replace(/№ (?=\d)/g, `№${NBSP}`);

/** Склейка от неудачных переносов: «ж/д», диапазоны «3–5», «30-минутная», разряды «20 000», единицы после чисел. */
export const glue = outsideTags(glueText);

/** Типографика кириллицы: неразрывные пробелы после коротких предлогов и перед тире + склейка чисел и единиц. */
export const typo = outsideTags((s) =>
  glueText(
    s
      .replace(/(^|[\s(«])(в|во|с|со|к|ко|у|о|об|от|до|по|из|за|на|не|ни|и|а|но|да|для|при|под|над|без|или|что|как|же|ли|бы)[ \t\n]+/giu, `$1$2${NBSP}`)
      .replace(/[ \t\n]+—/g, `${NBSP}—`)
  )
);

/** То же для готового HTML: обрабатывает только текст между тегами. */
export const typoHtml = typo;

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .split('')
    .map((c) => (c in TRANSLIT ? TRANSLIT[c] : c))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const dateRu = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  const m = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${d.getUTCDate()} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

// --- изображения -------------------------------------------------------------------

const sizeCache = new Map();

/** Размеры изображения (webp / png / jpeg / svg) без зависимостей. Путь — относительно корня проекта. */
export function imgSize(file) {
  if (sizeCache.has(file)) return sizeCache.get(file);
  let res = null;
  const full = join(ROOT, file);
  if (existsSync(full)) {
    try {
      const fd = openSync(full, 'r');
      const buf = Buffer.alloc(64 * 1024);
      const n = readSync(fd, buf, 0, buf.length, 0);
      closeSync(fd);
      res = parseSize(buf.subarray(0, n), full);
    } catch {
      res = null;
    }
  }
  sizeCache.set(file, res);
  return res;
}

function parseSize(b, full) {
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = b.toString('ascii', 12, 16);
    if (fmt === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (fmt === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (fmt === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  }
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length - 9) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5) };
      o += 2 + b.readUInt16BE(o + 2);
    }
  }
  if (full.endsWith('.svg')) {
    const s = readFileSync(full, 'utf8');
    const vb = s.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
    if (vb) return { w: Math.round(+vb[1]), h: Math.round(+vb[2]) };
  }
  return null;
}

export const fileExists = (file) => existsSync(join(ROOT, file));

/**
 * <img> с размерами (без CLS), lazy-загрузкой и srcset, если рядом лежат уменьшенные версии (-640, -960).
 * src — путь относительно корня проекта: 'assets/img/cars/x/01.webp'
 */
export function img({ src, alt = '', cls, lazy = true, sizes, priority = false, w, h, attrs: extra = {} }) {
  if (!src) return '';
  const rel = String(src).replace(/^\//, '');
  const size = imgSize(rel);
  const width = w || size?.w;
  const height = h || size?.h;
  const set = [];
  const m = rel.match(/^(.*)\.(webp|jpg|jpeg|png)$/i);
  if (m && size) {
    for (const sw of [480, 800]) {
      const variant = `${m[1]}-${sw}.${m[2]}`;
      if (sw < size.w && fileExists(variant)) set.push(`${a(variant)} ${sw}w`);
    }
    if (set.length) set.push(`${a(rel)} ${size.w}w`);
  }
  return `<img${attrs({
    class: cls,
    src: a(rel),
    srcset: set.length ? set.join(', ') : null,
    sizes: set.length ? sizes || '(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw' : null,
    alt,
    width,
    height,
    loading: lazy && !priority ? 'lazy' : null,
    decoding: priority ? null : 'async',
    fetchpriority: priority ? 'high' : null,
    ...extra,
  })}>`;
}

// --- минимальный Markdown → HTML (для статей блога и SEO-текстов) ------------------------

export function inlineMd(s) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => (/^\/?assets\//.test(src) ? img({ src: src.replace(/^\//, ''), alt, sizes: '(max-width: 900px) 100vw, 60vw' }) : `<img src="${u(src)}" alt="${alt}" loading="lazy">`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
      const ext = /^https?:/.test(href);
      return `<a href="${u(href)}"${ext ? ' target="_blank" rel="noopener nofollow"' : ''}>${text}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function slugHeading(text) {
  return slugify(text.replace(/<[^>]+>/g, '')).slice(0, 60) || 'section';
}

/** Возвращает { html, toc: [{id, text, level}] } */
export function markdown(src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  const toc = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{1,4}\s|[-*]\s|\d+[.)]\s|>\s?|\|)/.test(l) || /^:::/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      const level = m[1].length;
      const text = inlineMd(m[2].trim());
      const id = slugHeading(m[2]);
      if (level === 2) toc.push({ id, text: m[2].trim(), level });
      out.push(`<h${level} id="${id}">${text}</h${level}>`);
      i++;
    } else if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
      out.push(`<ul>${items.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ul>`);
    } else if (/^\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+[.)]\s+/, '')); i++; }
      out.push(`<ol>${items.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ol>`);
    } else if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote><p>${inlineMd(q.join(' '))}</p></blockquote>`);
    } else if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(/^\|[\s:|-]+\|?$/.test(rows[1] || '') ? 2 : 1).map(cells);
      const isNum = (c) => /^[\d\s.,–—%₽€$¥≈~от до]+$/.test(c) && /\d/.test(c);
      out.push(
        `<div class="table-wrap"><table class="table"><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${body.map((r) => `<tr>${r.map((c, ci) => `<td${ci > 0 && isNum(c) ? ' class="num"' : ''}>${inlineMd(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
      );
    } else if ((m = line.match(/^:::(\w+)\s*(.*)$/))) {
      // :::note Текст врезки (до строки :::)
      const kind = m[1];
      const buf = m[2] ? [m[2]] : [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(`<div class="note${kind === 'warn' ? ' note--warn' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3v.01"/></svg><div>${inlineMd(buf.join(' ').trim())}</div></div>`);
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { buf.push(lines[i].trim()); i++; }
      if (buf.length) out.push(`<p>${inlineMd(buf.join(' '))}</p>`);
      else i++;
    }
  }
  return { html: typoHtml(out.join('\n')), toc };
}

/** Front matter: ---\nkey: value\n--- */
export function frontMatter(src) {
  const m = String(src).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, '');
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

/** Первый вариант строки, который помещается в max знаков (для title/description); иначе — последний. */
export const fit = (max, ...variants) => variants.find((v) => String(v).length <= max) || variants[variants.length - 1];

export const readJson = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
export const readText = (file) => readFileSync(join(ROOT, file), 'utf8');
export const uniq = (arr) => [...new Set(arr)];
export const by = (key) => (x, y) => (x[key] > y[key] ? 1 : x[key] < y[key] ? -1 : 0);
export const groupBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); (m[k] ||= []).push(x); return m; }, {});
export const stripTags = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
export const clip = (s, n) => { const t = stripTags(s); return t.length <= n ? t : t.slice(0, n - 1).replace(/[\s,.;:—-]+\S*$/, '') + '…'; };
