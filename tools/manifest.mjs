// Справочник сущностей каталога для авторов текстов: какие страницы марок, моделей, подборок и срезов существуют
// и какие автомобили на них показаны. Запуск: node tools/manifest.mjs > data/content-manifest.json
import { loadContext } from '../src/data/index.mjs';

const ctx = loadContext({ version: 'x', date: new Date().toISOString().slice(0, 10), year: 2026 });
// powerHp — мощность, которую показывает сайт (null, если источник сам помечает её как ошибку: тогда значение в powerHpSource);
// isLowPower — авто входит в подборку и под бейдж «до 160 л.с.»; powerDoubt/powerNote — пометка из data/car-flags.json;
// isPassing — бейдж «Проходной»; recyclingFee — утильсбор в расчёте заказчика; routeSurchargeShown — расходы особого маршрута выделены строкой.
const car = (c) => ({ id: c.id, title: c.titleFull, year: c.year, mileageKm: c.mileageKm, engine: c.engine?.type, volumeCc: c.engine?.volumeCc, powerHp: c.engine?.powerHp, powerHpSource: c.engine?.powerHpSource || undefined, isLowPower: c.isLowPower, powerDoubt: c.powerDoubt || undefined, powerNote: c.powerNote || undefined, isPassing: c.isPassing, drive: c.drive, body: c.body, priceRub: c.priceRub, priceIsPartial: c.priceIsPartial, recyclingFee: c.recyclingFee ?? undefined, sanctionRoute: Boolean(c.sanctionBadge), routeSurchargeShown: c.sanctionBadge ? c.hasRouteSurcharge : undefined, auctionGrade: c.auctionGrade || undefined, url: c.url });
// priceFrom — минимальная цена списка; priceFromPartial: true — это цена без утильсбора, её нельзя называть «под ключ»;
// priceFromFull — минимальная цена среди авто с полной ценой (null, если таких нет) — её и показывают шаблоны как «под ключ от».
const prices = (x) => ({ priceFrom: x.priceFrom, priceFromPartial: x.priceFromPartial, priceFromFull: x.priceFromFull });
const out = {
  note: 'Ключи (key) — имена сущностей для data/content/brands/*.json и data/content/models/*.json. Цены — с сайта заказчика на 12–13.10.2026: «под ключ во Владивостоке», а у авто с priceIsPartial: true — рассчитанная часть без утилизационного сбора (не «под ключ»).',
  brands: ctx.brands.map((b) => ({ key: `${b.country}/${b.slug}`, file: `data/content/brands/${b.country}-${b.slug}.json`, name: b.name, country: b.country, url: b.url, ...prices(b), models: b.models.map((m) => m.name), cars: b.cars.map(car) })),
  models: ctx.models.map((m) => ({ key: `${m.country}/${m.brandSlug}/${m.slug}`, file: `data/content/models/${m.country}-${m.brandSlug}-${m.slug}.json`, name: `${m.brand} ${m.name}`, country: m.country, url: m.url, ...prices(m), cars: m.cars.map(car) })),
  selections: ctx.selections.map((s) => ({ slug: s.slug, name: s.name, h1: s.h1, global: s.global, url: s.url, count: s.count, ...prices(s), cars: s.cars.map((c) => c.id), slices: s.slices.map((x) => ({ key: `${x.country}/${s.slug}`, h1: x.h1, url: x.url, count: x.count, ...prices(x), cars: x.cars.map((c) => c.id) })) })),
  routes: { home: '/', catalog: '/catalog/', countries: ctx.countries.map((c) => ctx.R.country(c.slug)), calculator: ctx.R.calculator, howTo: ctx.R.howTo, auctionSheet: ctx.R.auctionSheet, delivery: ctx.R.delivery, cases: ctx.R.cases, reviews: ctx.R.reviews, faq: ctx.R.faq, blog: ctx.R.blog, services: ctx.services.map((s) => s.url), cities: ctx.cities.map((c) => c.url) },
};
console.log(JSON.stringify(out, null, 1));
