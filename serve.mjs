#!/usr/bin/env node
// Локальный сервер для просмотра собранного сайта: node serve.mjs [порт]  → http://localhost:4317
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

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
  let file = url.pathname ? await resolve(url.pathname) : null;
  let status = 200;
  if (!file && !extname(full) && !full.endsWith('/')) {
    res.writeHead(301, { Location: full + '/' + url.search });
    return res.end();
  }
  if (!file) { file = join(ROOT, '404.html'); status = 404; }
  try {
    const data = await readFile(file);
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
