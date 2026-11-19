// Публичный каталог CarHub. Запрос строится только из профиля модели из нашего реестра.
import { liters, slugify } from '../lib/core.mjs';
import { R } from '../routes.mjs';
import { generationId, numericGrade } from './generations.mjs';
const COUNTRIES = { japan: 'JP', china: 'CN', korea: 'KR' };

// Названия семейств в справочнике CarHub могут отличаться от названий в нашей подборке.
// Для объединенных семейств дополнительно проверяем обозначение в исходном объявлении.
const FAMILIES = {
  'Toyota Corolla Fielder Hybrid': { family: 'Corolla', variant: /fielder/i },
  'Toyota Corolla Touring Hybrid': { family: 'Corolla', variant: /touring/i },
  'Honda Fit e:HEV': { family: 'Fit', variant: /e[: -]?hev/i },
  'Honda Vezel e:HEV': { family: 'Vezel', variant: /e[: -]?hev/i },
  'Nissan Serena e-Power': { family: 'Serena', variant: /e[- ]?power/i },
  'Geely Coolray': { family: 'Binyue' },
  'Haval Chitu (Jolion)': { family: 'Chitu' },
  'Toyota Levin': { family: 'Corolla Levin' },
  'Mazda 3': { family: 'Mazda3' },
  'Hyundai ix25': { family: 'ix25', aliases: ['BAIC Hyundai ix25'] },
  'Volkswagen Tiguan L': { family: 'Tiguan', variant: /tiguan\s*[- ]?l\b/i },
  'Audi Q2L': { family: 'Q2', variant: /q2\s*l\b/i },
  'Mercedes-Benz A-Class (A180L)': { family: 'A-Class', variant: /\ba\s*180\s*l\b/i },
  'Hyundai Avante (Elantra)': { family: 'Elantra / Avante' },
  'Kia K3': { family: 'K3 / Cerato' },
  'Mercedes-Benz C200d': { family: 'C-Class', variant: /\bc\s*200\s*d\b/i },
};

export const OFFER_LIFETIME = 24 * 60 * 60 * 1000;

export function modelParts(name) {
  const [, brand, model] = /^(Renault Korea \(Samsung\)|\S+) (.+)$/.exec(name);
  return { brand, model };
}

/** Представление одного предложения в общем каталоге Макс Групп. */
export function offerVehicle(entry, offer) {
  const { brand, model } = modelParts(entry.name);
  const brandSlug = slugify(brand.replace(' (Samsung)', ''));
  const modelSlug = slugify(model);
  const profileUrl = entry.url || R.model(entry.country, brandSlug, modelSlug);
  const titleFull = [offer.title, offer.trim].filter(Boolean).join(' ');
  return {
    id: 'lot-' + offer.id, url: R.modelOffer(profileUrl, offer.id), country: entry.country, brand, model, brandSlug, modelSlug,
    titleFull, titleYear: [titleFull, offer.year].filter(Boolean).join(', '), year: offer.year,
    mileageKm: offer.km, auctionGrade: offer.grade, generation: offer.generation, body: offer.body,
    generationKey: generationId(brandSlug, modelSlug, { ...offer, country: entry.country }),
    gradeValue: numericGrade(offer.grade),
    engine: { type: offer.fuel, powerHp: offer.hp, volumeCc: offer.cc },
    engineLabel: [liters(offer.cc), offer.fuel].filter(Boolean).join(' · '),
    drive: offer.drive, transmission: offer.transmission, isLowPower: false,
    priceRub: offer.price, priceLabel: offer.price ? offer.priceLabel : '', priceNotice: offer.priceNotice,
    priceIsPartial: Boolean(offer.price && (offer.priceKind === 'known_part' || /часть стоимости/i.test(offer.priceLabel))),
    photos: [],
  };
}

function queryFor(entry) {
  const { brand, model } = modelParts(entry.name);
  const override = FAMILIES[entry.name];
  const manufacturer = { 'Renault Korea (Samsung)': 'Renault', SsangYong: 'KG Mobility' }[brand] || brand;
  const baseModel = model.replace(/\s+(?:Hybrid|e:HEV|e-Power|\(T32\))$/i, '');
  const family = override?.family || baseModel;
  const country = COUNTRIES[entry.country];
  const params = new URLSearchParams({ source_country: country, manufacturer, model: family, available_only: 'true', photo_only: 'true', limit: '48' });
  const years = entry.years.match(/\d{4}/g);
  if (years?.[0]) params.set('year_min', years[0]);
  if (years?.[1]) params.set('year_max', years[1]);
  const engine = entry.engine || '';
  const lpg = /\bLPG\b|(?:^| )газ(?: |$)/i.test(engine);
  if (/гибрид|e-power/i.test(engine)) params.set('engine_type', 'hybrid');
  else if (/дизель/i.test(engine)) params.set('engine_type', 'diesel');
  else if (engine && !lpg) params.set('engine_type', 'gasoline');
  const modelNames = [baseModel, family, ...family.split(' / '), ...(override?.aliases || [])];
  return { params, country, variant: override?.variant, lpg,
    makes: new Set([manufacturer, brand].map(normalizeName)), models: new Set(modelNames.map(normalizeName)) };
}

const normalizeName = (name) => String(name || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

function compactOffer(car, query) {
  const { listing, identity, specs, media } = car;
  if (car.source?.country !== query.country || listing?.sell_status !== 'active' || !Number.isSafeInteger(car.id) || car.id <= 0) return null;
  if (!query.makes.has(normalizeName(identity?.manufacturer)) || !query.models.has(normalizeName(identity?.model))) return null;
  if (query.params.get('engine_type') === 'hybrid' && !/hybrid|гибрид/i.test([specs?.powertrain_type, specs?.fuel_type].join(' '))) return null;
  const title = [identity?.title, identity?.trim].filter(Boolean).join(' ');
  if (!title || (query.variant && !query.variant.test([identity.model, title].join(' ')))) return null;
  if (query.lpg && !/LPG|LP[ei]|газ(?!ол)|엘피/i.test([specs?.fuel_type, title].join(' '))) return null;
  if (!media?.main_photo?.startsWith('https://carhubauto.ru/')) return null;
  const p = car.pricing?.presentation;
  return {
    id: car.id, title: identity.title, trim: identity.trim || '', year: listing.year, km: listing.mileage_km,
    generation: typeof identity.generation === 'string' ? identity.generation : undefined,
    grade: car.auction?.grade ?? car.vehicle_history?.vehicle?.find((row) => row.label === 'Аукционная оценка')?.value,
    fuel: specs?.fuel_type || '', photo: media.main_photo,
    hp: specs?.engine_power_hp ?? undefined, cc: specs?.engine_displacement_cc ?? undefined,
    drive: specs?.drive_type || undefined, body: specs?.body_type || undefined, transmission: specs?.transmission || undefined,
    price: Number.isFinite(p?.amount_rub) && p.amount_rub > 0 && ['final', 'estimated', 'known_part'].includes(p.kind) ? p.amount_rub : null,
    priceKind: p?.kind, priceLabel: p?.label || '', priceNotice: p?.notice || '',
  };
}

// Ограничение распространяется и на параллельные запросы разных страниц.
let nextRequest = 0;
async function fetchCars(params) {
  const start = Math.max(Date.now(), nextRequest);
  nextRequest = start + 600;
  if (start > Date.now()) await new Promise((resolve) => setTimeout(resolve, start - Date.now()));
  const response = await fetch('https://carhubauto.ru/api/v2/cars?' + params, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('CarHub HTTP ' + response.status);
  const data = await response.json();
  if (!Array.isArray(data.data) || !Number.isFinite(Date.parse(data.generated_at))) throw new Error('Некорректный ответ каталога');
  return data;
}

async function collect(query) {
  const cars = new Map();
  let checkedAt;
  for (let page = 0; page < 3; page++) {
    const data = await fetchCars(query.params);
    checkedAt ??= data.generated_at;
    for (const car of data.data) {
      const offer = compactOffer(car, query);
      if (offer) cars.set(offer.id, offer);
      if (cars.size === 8) break;
    }
    if (cars.size === 8 || !data.pagination?.next_cursor) break;
    query.params.set('cursor', data.pagination.next_cursor);
  }
  return { checkedAt, cars: [...cars.values()] };
}

export async function fetchModelOffers(entry) {
  const query = queryFor(entry);
  const snapshot = await collect(query);
  // Единственный год в таблице описывает пример комплектации. Показываем ближайшие
  // более ранние машины той же модели, если подходящих этого года и новее нет.
  if (snapshot.cars.length || !/^\d{4}$/.test(entry.years)) return snapshot;
  query.params.delete('year_min');
  query.params.delete('cursor');
  query.params.set('year_max', String(Number(entry.years) - 1));
  query.params.set('sort', 'year_desc');
  return collect(query);
}
