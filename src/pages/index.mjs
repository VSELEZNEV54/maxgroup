// Реестр страниц. Модули подхватываются автоматически: любой файл src/pages/*.mjs,
// экспортирующий функцию с именем на …Pages (homePages, catalogPages, …), участвует в сборке.
// Описание страницы: { url, type, title, description, h1, render(ctx, page) → HTML, breadcrumbs, jsonld, … } — см. src/GUIDE.md
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

export async function collectPages(ctx) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'index.mjs').sort((a, b) => (a === 'home.mjs' ? -1 : b === 'home.mjs' ? 1 : a.localeCompare(b)));
  const pages = [];
  const problems = [];
  for (const f of files) {
    let mod;
    try {
      mod = await import(pathToFileURL(join(dir, f)).href);
    } catch (e) {
      problems.push(`модуль src/pages/${f} не загрузился: ${e.message.split('\n')[0]}`);
      continue;
    }
    for (const [name, fn] of Object.entries(mod)) {
      if (typeof fn !== 'function' || !/Pages$/.test(name)) continue;
      try {
        const list = await fn(ctx);
        for (const p of list) pages.push({ ...p, module: f });
      } catch (e) {
        problems.push(`${f} → ${name}(): ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
      }
    }
  }
  const seen = new Map();
  for (const p of pages) {
    if (seen.has(p.url)) problems.push(`дубль адреса ${p.url}: ${seen.get(p.url)} и ${p.module}`);
    seen.set(p.url, p.module);
  }
  const unique = pages.filter((p, i) => pages.findIndex((x) => x.url === p.url) === i);
  return { pages: unique, problems };
}
