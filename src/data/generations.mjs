// Одна история модели для визуального фильтра и привязки объявлений к поколению.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/core.mjs';

const makes = new Map();

export function generationsFor(brand, model) {
  if (!brand || !model) return [];
  if (!makes.has(brand)) {
    const path = join(ROOT, 'data/generations', brand + '.json');
    makes.set(brand, existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {});
  }
  return makes.get(brand)[model]?.generations || [];
}

const frame = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hasCode = (codes, code) => codes?.some((c) => c.split(/[,/]/).some((part) => frame(part) === code));

function within(range, year, month) {
  if (!year) return true;
  const start = range.from * 12 + (range.fromMonth || 1);
  const end = range.to ? range.to * 12 + (range.toMonth || 12) : Infinity;
  return year * 12 + (month || 12) >= start && year * 12 + (month || 1) <= end;
}

// Если в переходный год подходят два рестайлинга и кузов их не различает,
// лот остаётся в выдаче модели до выбора конкретной версии.
export function generationId(brand, model, { generation, year, month, country }) {
  const records = generationsFor(brand, model);
  const code = frame(generation);
  const exact = records.find((g) => g.id === generation);
  if (exact) return exact.id;
  if (!year && !code) return null;

  const local = country && records.some((g) => g.ranges?.some((r) => r.market === country));
  const rangesFor = (g) => local ? (g.ranges || []).filter((r) => r.market === country) : (g.ranges?.length ? g.ranges : [g]);
  const candidates = records.filter((g) => rangesFor(g).some((r) => within(r, year, month)));
  if (code) {
    const withCode = candidates.filter((g) => rangesFor(g).some((r) => within(r, year, month) && hasCode(r.codes, code)) || hasCode(g.codes, code));
    if (withCode.length) return withCode.length === 1 ? withCode[0].id : null;
    const known = records.filter((g) => hasCode(g.codes, code) || rangesFor(g).some((r) => hasCode(r.codes, code)));
    // Год регистрации может быть позже выпуска. Уникальный заводской код точнее.
    if (known.length) return known.length === 1 ? known[0].id : null;
  }
  return candidates.length === 1 ? candidates[0].id : null;
}

export function numericGrade(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  return /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : null;
}
