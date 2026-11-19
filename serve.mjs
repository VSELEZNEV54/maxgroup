#!/usr/bin/env node
// Локальный сервер для просмотра собранного сайта: node serve.mjs [порт]  → http://localhost:4317
import { createServer, request as httpRequest } from 'node:http';
import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { setBase } from './src/lib/core.mjs';
import { loadContext } from './src/data/index.mjs';
import { base } from './src/layout/base.mjs';
import { modelOfferPage } from './src/pages/model-offers.mjs';
import { fetchModelOffers } from './src/data/model-offers.mjs';
import { freshUntil, offerList } from './src/components/model-offers.mjs';

// node serve.mjs [порт] [папка]  — по умолчанию порт 4317 (или $PORT), папка dist
// node serve.mjs 4318 dist-pages --base=/maxgroup  — сборка для подпапки (демо на GitHub Pages) отдаётся по адресу /maxgroup/
const argv = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const BASE = (process.argv.slice(2).find((x) => x.startsWith('--base=')) || '').slice(7).replace(/\/+$/, '');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), argv[1] || 'dist');
const PORT = Number(argv[0] || process.env.PORT || 4317);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

setBase(BASE);
const today = new Date().toISOString().slice(0, 10);
const ctx = loadContext({ date: today, contentDate: today, year: Number(today.slice(0, 4)), version: 'preview', base: BASE });
const profiles = new Map(ctx.popularModels.map((p) => [p.key, p]));
const profilePaths = new Map(ctx.popularModels.map((p) => [p.url, p]));
const selectionPages = new Set(ctx.popularModels.flatMap((p) => [p.url, p.pricesUrl]));
const previewPhoto = (car) => BASE + '/model-media/' + car.id + '.webp';
const stockCache = new Map();
const photoSources = new Map();
const pendingPhotos = new Map();

function rememberPhotos(snapshot) {
  const until = Date.parse(freshUntil(snapshot.checkedAt));
  if (until <= Date.now()) return;
  for (const car of snapshot.cars) photoSources.set(car.id, { url: car.photo, until });
}
for (const p of profiles.values()) if (p.offers) rememberPhotos(p.offers);

function currentStock(profile) {
  const cached = stockCache.get(profile.sourceNumber);
  if (cached && cached.until > Date.now()) return cached.result;
  const result = fetchModelOffers(profile).then((snapshot) => {
    for (const [id, source] of photoSources) if (source.until <= Date.now()) photoSources.delete(id);
    rememberPhotos(snapshot);
    return snapshot;
  });
  stockCache.set(profile.sourceNumber, { result, until: Date.now() + 5 * 60 * 1000 });
  return result;
}

function webpThumbnail(data) {
  const script = fileURLToPath(new URL('./tools/webp.py', import.meta.url));
  return new Promise((resolve, reject) => {
    const child = execFile('python3', [script, '--thumbnail'], { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 },
      (error, output) => error ? reject(error) : resolve(output));
    child.stdin.on('error', reject);
    child.stdin.end(data);
  });
}

async function currentPhoto(url, format) {
  const key = format + ':' + url;
  const pending = pendingPhotos.get(key);
  if (pending) return pending;
  const result = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !/^image\/(?:jpeg|png|webp|avif)\b/i.test(type)) throw new Error('Фото недоступно');
    const original = Buffer.from(await response.arrayBuffer());
    const webp = format === 'webp';
    return { type: webp ? 'image/webp' : type, cache: response.headers.get('cache-control') || 'no-cache', data: webp ? await webpThumbnail(original) : original };
  })();
  pendingPhotos.set(key, result);
  try { return await result; } finally { pendingPhotos.delete(key); }
}

async function resolve(pathname) {
  let p = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, p);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
    await stat(file);
    return file;
  } catch {
    return null;
  }
}

// Прием и хранение заявок остаются в Django. Обоим интерфейсам доступен один origin с CSRF.
function previewLeads(req, res, path) {
  const upstream = httpRequest({
    hostname: '127.0.0.1', port: Number(process.env.SITE_PORT || 8000), path, method: req.method,
    headers: req.headers, timeout: 10000,
  }, (result) => {
    res.writeHead(result.statusCode, result.headers);
    result.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'Cache-Control': 'no-store' });
    res.end();
  });
  req.pipe(upstream);
}

function modelPreview(doc) {
  return doc.replace('<body ', `<body data-preview-leads="${BASE}/api/leads/" `);
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const full = url.pathname;
  if (BASE) {
    // всё, что вне подпапки, ведёт на главную — как на хостинге, где сайт занимает только свой путь
    if (full !== BASE && !full.startsWith(BASE + '/')) {
      res.writeHead(302, { Location: BASE + '/' });
      return res.end();
    }
    url.pathname = full.slice(BASE.length) || '';
  }
  if ((url.pathname === '/api/leads/' && req.method === 'POST') ||
      (url.pathname === '/api/leads/context/' && req.method === 'GET')) return previewLeads(req, res, url.pathname);
  const stockKey = /^\/model-inventory\/([a-z]+\/[a-z0-9-]+)\.json$/.exec(url.pathname);
  const profile = stockKey && profiles.get(stockKey[1]);
  if (profile) {
    try {
      const snapshot = await currentStock(profile);
      const fragment = offerList(profile, snapshot, previewPhoto);
      const json = JSON.stringify({ checkedAt: snapshot.checkedAt, expires: freshUntil(snapshot.checkedAt), html: fragment.replace(/ё/g, 'е').replace(/Ё/g, 'Е') });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(json);
    } catch {
      // При сбое поставщика отдаем последний датированный снимок обычным путем.
    }
  }
  let file = url.pathname ? await resolve(url.pathname) : null;
  const lotPath = /^(\/.+\/)lot-(\d+)\/$/.exec(url.pathname);
  const marketModel = lotPath && profilePaths.get(lotPath[1]);
  if (marketModel && (!file || stockCache.has(marketModel.sourceNumber))) {
    try {
      const snapshot = await currentStock(marketModel);
      const offer = snapshot.cars.find((car) => String(car.id) === lotPath[2]);
      if (offer) {
        const page = modelOfferPage(ctx, marketModel, offer, snapshot.checkedAt, previewPhoto);
        res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
        return res.end(modelPreview(base(ctx, page, page.render())).replace(/ё/g, 'е').replace(/Ё/g, 'Е'));
      }
    } catch {
      // Остается датированная страница этого же лота из последней сборки.
    }
  }
  const photoId = /^\/model-media\/(\d+)\.(webp|jpg)$/.exec(url.pathname);
  const source = photoId && photoSources.get(Number(photoId[1]));
  if (source?.until > Date.now() && (!file || (await stat(file)).mtimeMs < Date.now() - 86400000)) {
    try {
      const photo = await currentPhoto(source.url, photoId[2]);
      res.writeHead(200, { 'Content-Type': photo.type, 'Content-Length': photo.data.length, 'Cache-Control': photo.cache });
      return res.end(photo.data);
    } catch {
      if (!file) {
        res.writeHead(502, { 'Cache-Control': 'no-store' });
        return res.end();
      }
    }
  }
  let status = 200;
  if (!file && !extname(full) && !full.endsWith('/')) {
    res.writeHead(301, { Location: full + '/' + url.search });
    return res.end();
  }
  if (!file) { file = join(ROOT, '404.html'); status = 404; }
  try {
    let data = await readFile(file);
    if (status === 200 && (selectionPages.has(url.pathname) || marketModel)) data = Buffer.from(modelPreview(data.toString('utf8')));
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range && /^bytes=/.test(range)) {
      // видео в Safari требует поддержки Range
      const [a, b] = range.replace('bytes=', '').split('-');
      const start = Number(a) || 0;
      const end = b ? Number(b) : data.length - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return res.end(data.subarray(start, end + 1));
    }
    res.writeHead(status, { 'Content-Type': type, 'Content-Length': data.length, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}).listen(PORT, () => console.log(`Макс Групп: http://localhost:${PORT}${BASE}/`));
