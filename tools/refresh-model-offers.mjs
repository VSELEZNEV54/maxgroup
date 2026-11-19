// Обновление раздела цен для статической сборки. При сбое прежний полный снимок остается на месте.
import { renameSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, slugify } from '../src/lib/core.mjs';
import { fetchModelOffers } from '../src/data/model-offers.mjs';

const snapshots = {};
for (const entry of readJson('data/popular-models.json')) {
  const key = entry.country + '/' + slugify(entry.name);
  try {
    snapshots[key] = await fetchModelOffers(entry);
  } catch (error) {
    console.warn(`${entry.name}: ${error.message}. Повтор через минуту.`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
    snapshots[key] = await fetchModelOffers(entry);
  }
  console.log(entry.name, snapshots[key].cars.length);
}
const dir = mkdtempSync(join(ROOT, 'data', '.offers-'));
try {
  const file = join(dir, 'model-offers.json');
  writeFileSync(file, JSON.stringify(snapshots, null, 2) + '\n');
  renameSync(file, join(ROOT, 'data', 'model-offers.json'));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
