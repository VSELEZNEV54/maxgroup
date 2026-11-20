// Сборка контекста данных: все, что нужно шаблонам, в одном объекте ctx.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, readText, slugify, groupBy, liters, frontMatter, markdown, fileExists, plural } from '../lib/core.mjs';
import { R } from '../routes.mjs';
import { modelParts } from './model-offers.mjs';
import { generationId, numericGrade } from './generations.mjs';
import { site, source } from './site.mjs';
import { countries, countryBySlug } from './countries.mjs';
import { selections as selectionDefs } from './selections.mjs';
import { services, serviceGroups } from './services.mjs';

const optionalJson = (file, fallback) => (existsSync(join(ROOT, file)) ? readJson(file) : fallback);
// пометки к автомобилям (спорная мощность и т.п.) — исходные данные заказчика не правим, см. data/car-flags.json
const carFlags = optionalJson('data/car-flags.json', {});

// --- автомобили ---------------------------------------------------------------------

const COUNTRY_ALIASES = { japan: 'japan', korea: 'korea', china: 'china', Япония: 'japan', Корея: 'korea', 'Южная Корея': 'korea', Китай: 'china' };

/**
 * Возрастная категория для таможни: le3 (до 3 лет) | 3to5 | gt5.
 * Берем ту же, что стоит в расчете цены на сайте заказчика («Тариф: …»), иначе считаем по правилу:
 * известен только год — датой выпуска считается 1 июля, год и месяц — 15-е число (Решение Совета ЕЭК № 107).
 */
const CALC_DATE = Date.UTC(2026, 9, 13);
function ageCategory(raw, breakdown) {
  const note = breakdown.find((r) => r.key === 'customs_payments')?.note || '';
  if (/до 3 лет/i.test(note)) return 'le3';
  if (/от 3 до 5|3[--]5/i.test(note)) return '3to5';
  if (/старше 5/i.test(note)) return 'gt5';
  if (!raw.year) return null;
  const made = raw.month ? Date.UTC(raw.year, raw.month - 1, 15) : Date.UTC(raw.year, 6, 1);
  const years = (CALC_DATE - made) / (365.25 * 864e5);
  return years <= 3 ? 'le3' : years <= 5 ? '3to5' : 'gt5';
}

function truckClass(body) {
  const b = String(body || '').toLowerCase();
  // кей-кары в каталоге — высокие «коробочки» (около 1,8 м), по высоте это старший тариф
  if (/внедорожник|пикап|микроавтобус|минивэн|минивен|фургон|кей/.test(b)) return 'suv';
  if (/кроссовер|suv|компактвэн|вэн/.test(b)) return 'crossover';
  return 'sedan';
}

function normalizeCar(raw) {
  const country = COUNTRY_ALIASES[raw.country] || raw.country;
  const brandSlug = slugify(raw.brand);
  const modelSlug = slugify(raw.model);
  const cn = countryBySlug[country];
  const flag = carFlags[raw.id] || {};
  // мощность, которую сам источник помечает как ошибку справочника, не показываем как факт (остается в powerHpSource)
  const eng = flag.hidePower && raw.engine ? { ...raw.engine, powerHp: null, powerHpSource: raw.engine.powerHp || null } : raw.engine || {};
  const trim = raw.trim && raw.trim.length <= 26 && !/^\d{4}$/.test(raw.trim) ? raw.trim : null;
  const partial = Boolean(raw.priceIsPartial);
  // расшифровка цены приходит с сайта заказчика готовой структурой — показываем как есть
  const breakdown = (raw.priceBreakdown || []).filter((r) => r.amountRub).map((r) => ({
    key: r.key,
    name: r.key === 'japan_freight' ? 'Фрахт до Владивостока' : r.label.replace(/Max Group/i, 'Макс Групп'),
    rub: r.amountRub,
    note: r.note || null,
    bullets: r.bullets || [],
    original: r.amountOriginal && r.currency ? { amount: r.amountOriginal, currency: r.currency } : null,
  }));
  const customsNote = breakdown.find((r) => r.key === 'customs_payments')?.note || '';
  const feeRow = breakdown.find((r) => r.key === 'recycling_fee') || null;
  const isElectric = /электро/i.test(eng.type || '');
  const isHybrid = /гибрид/i.test(eng.type || '');
  const car = {
    ...raw,
    engine: raw.engine ? eng : raw.engine,
    country,
    brandSlug,
    modelSlug,
    generationKey: generationId(brandSlug, modelSlug, { ...raw, country }),
    gradeValue: numericGrade(raw.auctionGrade),
    countryName: cn?.name,
    truckClass: truckClass(raw.body),
    title: `${raw.brand} ${raw.model}`,
    titleFull: [raw.brand, raw.model, trim].filter(Boolean).join(' '),
    titleYear: `${raw.brand} ${raw.model} ${raw.year || ''}`.trim(),
    trim,
    photos: (raw.photos || []).filter((p) => fileExists(p)),
    auctionSheet: raw.auctionSheet && fileExists(raw.auctionSheet) ? raw.auctionSheet : null,
    engineLabel: [/электро/i.test(eng.type || '') ? null : liters(eng.volumeCc), eng.type].filter(Boolean).join(' · ') || eng.type || null,
    isElectric,
    isHybrid,
    // последовательный гибрид (EREV): колеса крутит электромотор, заказчик считает таможню по тарифу электромобиля
    isSeriesHybrid: isHybrid && /последовательн|erev/i.test(eng.subtype || ''),
    isEvTariff: /электромобил/i.test(customsNote),
    recyclingFee: feeRow ? feeRow.rub : null,
    // особый маршрут: у японских авто расходы выделены строкой «Фрахт (доплата…)», у корейских надбавка в расчете не выделена
    hasRouteSurcharge: breakdown.some((r) => r.key === 'japan_freight'),
    powerDoubt: Boolean(flag.powerDoubt),
    powerNote: flag.note || null,
    ageYears: raw.year ? 2026 - raw.year : null,
    ageCat: ageCategory(raw, breakdown),
    priceIsPartial: partial,
    priceBreakdown: breakdown,
    // короткая подпись для карточек и полная — для страницы автомобиля
    priceLabel: partial ? 'во Владивостоке, без утильсбора' : 'под ключ во Владивостоке',
    priceLabelFull: partial ? 'Рассчитанная часть стоимости во Владивостоке, без утилизационного сбора' : 'Предварительная цена под ключ во Владивостоке',
  };
  // «проходной» — таможенная категория 3-5 лет; для электромобилей и авто, посчитанных по тарифу электромобиля
  // (последовательные гибриды), понятие не применяется: пошлина от возраста не зависит
  car.isPassing = car.ageCat === '3to5' && !car.isElectric && !car.isEvTariff;
  // «до 160 л.с.» — только там, где льгота не вызывает сомнений: мощность до 160 л.с., не электромобиль,
  // у гибридов — ДВС до 110 л.с. (мощность электромотора прибавляется), утильсбор в расчете заказчика льготный,
  // и автомобиль не помечен в data/car-flags.json
  const hp = eng.powerHp || null;
  car.isLowPower = Boolean(hp) && hp <= 160 && !car.isElectric && (!car.isHybrid || hp <= 110) && (!feeRow || feeRow.rub <= 5200) && !car.powerDoubt;
  car.url = R.car(car);
  car.brandUrl = R.brand(country, brandSlug);
  car.modelUrl = R.model(country, brandSlug, modelSlug);
  return car;
}

// --- кейсы («привезли и везем») -------------------------------------------------------

const CASE_STATUS = {
  delivered: { label: 'Доставлен', cls: 'status--ok' },
  in_transit: { label: 'В пути', cls: 'status--transit' },
  'in-transit': { label: 'В пути', cls: 'status--transit' },
  'on-auction': { label: 'На торгах', cls: 'status--auction' },
  transit: { label: 'В пути', cls: 'status--transit' },
  auction: { label: 'На торгах', cls: 'status--auction' },
  at_auction: { label: 'На торгах', cls: 'status--auction' },
};

function normalizeCase(raw) {
  const st = CASE_STATUS[raw.statusCode] || { label: raw.status || 'Доставлен', cls: 'status--ok' };
  const slug = slugify(raw.name);
  const country = COUNTRY_ALIASES[raw.country] || null;
  return {
    ...raw,
    slug,
    url: R.case(slug),
    statusLabel: st.label,
    statusCls: st.cls,
    countrySlug: country,
    countryName: country ? countryBySlug[country].name : raw.country || null,
  };
}

// --- блог ---------------------------------------------------------------------------------

function loadPosts() {
  const dir = join(ROOT, 'content', 'blog');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, body } = frontMatter(readText(join('content', 'blog', f)));
      const md = markdown(body);
      const slug = data.slug || f.replace(/\.md$/, '');
      const words = body.split(/\s+/).length;
      return { ...data, slug, url: R.post(slug), html: md.html, toc: md.toc, readMin: Math.max(3, Math.round(words / 180)), words };
    })
    // порядок ленты: поле order из front matter, затем дата (новые выше), затем slug
    .sort((x, y) => (+x.order || 1e6) - (+y.order || 1e6) || (x.date === y.date ? x.slug.localeCompare(y.slug) : x.date < y.date ? 1 : -1));
}

// --- тексты страниц ------------------------------------------------------------------------------
// data/content/*.json            → объединяются по ключам верхнего уровня (countries, selections, services, home…)
// data/content/brands/*.json     → content.brands['japan/toyota']   (в файле поле "key")
// data/content/models/*.json     → content.models['japan/toyota/alphard']
// data/content/cities/*.json     → content.cities['novosibirsk']
// data/content/cases/*.json      → content.cases['ford-ranger-2025']

function loadContent() {
  const dir = join(ROOT, 'data', 'content');
  const content = { brands: {}, models: {}, cities: {}, cases: {} };
  if (!existsSync(dir)) return content;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.json')) {
      const data = readJson(join('data', 'content', e.name));
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && content[k] && typeof content[k] === 'object') Object.assign(content[k], v);
        else content[k] = v;
      }
    } else if (e.isDirectory() && content[e.name]) {
      for (const f of readdirSync(join(dir, e.name)).filter((x) => x.endsWith('.json'))) {
        const data = readJson(join('data', 'content', e.name, f));
        const key = data.key || f.replace(/\.json$/, '');
        content[e.name][key] = data;
      }
    }
  }
  return content;
}

// --- цены «от» -----------------------------------------------------------------------------------
// У части авто цена неполная (priceIsPartial — без утилизационного сбора). Если самая дешевая машина списка такая,
// цену «от» нельзя называть «под ключ»: шаблоны смотрят на priceFromPartial и пишут «от X без утильсбора».

/** { priceFrom, priceTo, priceFromPartial, priceFromFull, hasPartial, allPartial } для списка автомобилей */
export function priceStats(list) {
  const priced = list.filter((c) => c.priceRub);
  if (!priced.length) return { priceFrom: null, priceTo: null, priceFromPartial: false, priceFromFull: null, hasPartial: false, allPartial: false };
  const cheapest = priced.reduce((m, c) => (c.priceRub < m.priceRub ? c : m));
  const full = priced.filter((c) => !c.priceIsPartial).map((c) => c.priceRub);
  return {
    priceFrom: cheapest.priceRub,
    priceTo: Math.max(...priced.map((c) => c.priceRub)),
    priceFromPartial: Boolean(cheapest.priceIsPartial),
    priceFromFull: full.length ? Math.min(...full) : null,
    hasPartial: full.length < priced.length,
    allPartial: full.length === 0,
  };
}

// Запись подборки описывает типовую комплектацию. Связь с каталогом ведет к семейству модели в той же стране.
function loadPopularModels(models) {
  const photos = readJson('data/popular-model-photos.json');
  const offers = readJson('data/model-offers.json');
  const intros = readJson('data/popular-model-descriptions.json');
  const byName = new Map(models.map((m) => [`${m.country}/${slugify(m.brand + ' ' + m.name)}`, m]));
  // Название Coolray для Binyue подтверждено в data/content/models/china-geely-binyue.json.
  const aliases = { 'china/geely-coolray': 'china/geely-binyue' };
  return readJson('data/popular-models.json').map((row) => {
    const slug = slugify(row.name);
    const key = `${row.country}/${slug}`;
    const family = row.name.replace(/\s+(?:Hybrid|e:HEV|e-Power|\([^()]+\))$/i, '');
    const model = byName.get(key) || byName.get(aliases[key]) || byName.get(`${row.country}/${slugify(family)}`);
    const { brand, model: modelName } = modelParts(row.name);
    const brandSlug = slugify(brand.replace(/ \(Samsung\)$/, ''));
    const url = R.model(row.country, brandSlug, slugify(modelName));
    if (!photos[key]?.src || !fileExists(photos[key].src)) throw new Error(`Нет фотографии для ${row.name}`);
    const entry = { ...row, slug, key, url, pricesUrl: R.modelPrices(url), brand, intro: intros[key], photo: photos[key], offers: offers[key], modelUrl: model?.url };
    if (model) {
      (model.popularProfiles ??= []).push(entry);
      for (const car of model.cars) {
        if (/Hybrid|e:HEV|e-Power/i.test(row.name) && car.engine?.type !== 'гибрид') continue;
        if (/e:HEV|e-Power/i.test(row.name) && !/e:HEV|e-Power/i.test(car.trim || '')) continue;
        car.modelInTop30 = true;
      }
    }
    return entry;
  });
}

// В меню сначала идут марки с лотами. Для остальных доступны подбор по стране
// и модели из подборки заказчика. Счетчики относятся только к реальным лотам.
function marketBrands(country, lots, directory, profiles) {
  const brands = new Map();
  function add(name) {
    const slug = slugify(name);
    if (!brands.has(slug)) brands.set(slug, {
      name, slug, models: [],
      url: `${R.home}?market=${country}&make=${encodeURIComponent(slug)}#podbor`,
    });
    return brands.get(slug);
  }
  for (const lot of lots) {
    const brand = add(lot.name);
    Object.assign(brand, { url: lot.url, count: lot.count, models: lot.models.map((m) => ({ name: m.name, slug: m.slug })) });
  }
  for (const [name, models] of Object.entries(directory)) {
    const brand = add(name);
    const known = new Set(brand.models.map((m) => m.slug));
    for (const model of models) {
      const slug = slugify(model) || model;
      if (!known.has(slug)) {
        brand.models.push({ name: model, slug });
        known.add(slug);
      }
    }
  }
  for (const profile of profiles.filter((p) => p.country === country)) {
    const name = [...brands.values()].filter((b) => profile.name.toLowerCase().startsWith(b.name.toLowerCase() + ' '))
      .sort((a, b) => b.name.length - a.name.length)[0]?.name || profile.name.split(' ')[0];
    const brand = add(name);
    const model = profile.name.slice(name.length).trim().replace(/^\(Samsung\)\s*/i, '');
    const slug = slugify(model);
    if (model && !brand.models.some((m) => m.slug === slug)) brand.models.push({ name: model, slug });
  }
  return [...brands.values()].sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name, 'ru'));
}

// --- контекст ---------------------------------------------------------------------------------

export function loadContext(build) {
  const brandMeta = optionalJson('data/brands.json', {});
  const modelMeta = optionalJson('data/models.json', {});
  const rawCars = optionalJson('data/cars.json', null) || optionalJson('data/source/cars.json', []);
  const cars = rawCars.map((c) => normalizeCar(c)).filter((c) => countryBySlug[c.country] && c.priceRub);

  // марки и модели — в разрезе страны (посадочные «Toyota из Японии», «BMW из Кореи»)
  const brands = [];
  const models = [];
  for (const cn of countries) {
    const inCountry = cars.filter((c) => c.country === cn.slug);
    const byBrand = groupBy(inCountry, (c) => c.brandSlug);
    for (const [brandSlug, list] of Object.entries(byBrand)) {
      const meta = brandMeta[`${cn.slug}/${brandSlug}`] || brandMeta[brandSlug] || {};
      const brand = {
        slug: brandSlug,
        name: list[0].brand,
        country: cn.slug,
        url: R.brand(cn.slug, brandSlug),
        cars: list,
        count: list.length,
        ...priceStats(list),
        ...meta,
      };
      brand.models = [];
      const byModel = groupBy(list, (c) => c.modelSlug);
      for (const [modelSlug, mlist] of Object.entries(byModel)) {
        const mmeta = modelMeta[`${cn.slug}/${brandSlug}/${modelSlug}`] || {};
        const model = {
          slug: modelSlug,
          name: mlist[0].model,
          brand: brand.name,
          brandSlug,
          country: cn.slug,
          url: R.model(cn.slug, brandSlug, modelSlug),
          cars: mlist,
          count: mlist.length,
          ...priceStats(mlist),
          yearFrom: Math.min(...mlist.map((c) => c.year).filter(Boolean)),
          yearTo: Math.max(...mlist.map((c) => c.year).filter(Boolean)),
          photo: mlist.find((c) => c.photos.length)?.photos[0] || null,
          ...mmeta,
        };
        brand.models.push(model);
        models.push(model);
      }
      brand.models.sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
      brand.photo = list.find((c) => c.photos.length)?.photos[0] || null;
      brands.push(brand);
    }
  }
  const brandsOf = (country) => brands.filter((b) => b.country === country).sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
  const popularModels = loadPopularModels(models);
  const markets = readJson('data/market-brands.json').markets;

  const MIN_SLICE = 4; // страновой срез создается, только если в нем есть что показать
  const brandSlugs = new Set(brands.map((b) => b.slug));
  const selections = selectionDefs.map((s) => {
    if (brandSlugs.has(s.slug)) throw new Error(`Слаг подборки «${s.slug}» совпадает со слагом марки`);
    const list = cars.filter(s.test);
    const sel = { ...s, global: s.global !== false, cars: list, count: list.length, ...priceStats(list) };
    sel.slices = countries
      .filter((cn) => !s.only || s.only.includes(cn.slug))
      .map((cn) => {
        const sub = list.filter((c) => c.country === cn.slug);
        return { country: cn.slug, cn, selection: sel, slug: s.slug, name: s.name, h1: s.h1c(cn), url: R.countrySelection(cn.slug, s.slug), cars: sub, count: sub.length, ...priceStats(sub) };
      })
      .filter((x) => x.count >= MIN_SLICE);
    // подборка только для одной страны живет внутри страны; в /podborki/ ведем на ее срез
    sel.url = sel.global ? R.selection(s.slug) : sel.slices[0]?.url || null;
    return sel;
  }).filter((s) => s.url && (!s.global || s.count >= 3)); // общая подборка появляется, когда в ней есть хотя бы 3 автомобиля
  const slices = selections.flatMap((s) => s.slices);
  const slicesOf = (country) => slices.filter((x) => x.country === country);

  const cases = (source.cases || []).map(normalizeCase);
  const reviews = (source.reviews || []).map((r, i) => ({ ...r, text: r.excerpt || r.text, id: i + 1, photos: (r.photos || []).filter((p) => fileExists(p)) }));
  const cities = optionalJson('data/cities.json', []).map((c) => ({ ...c, url: R.city(c.slug) }));
  const posts = loadPosts();
  const faq = optionalJson('data/faq.json', []);
  const calc = optionalJson('data/source/calc-rules.json', null);
  const content = loadContent();

  const carWord = (n) => `${n} ${plural(n, ['авто', 'авто', 'авто'])}`;

  const nav = {
    catalogUrl: R.catalog,
    selectionsUrl: R.selections,
    servicesUrl: R.services,
    deliveryUrl: R.delivery,
    countries: countries.map((cn) => ({
      ...cn,
      url: R.country(cn.slug),
      count: cars.filter((c) => c.country === cn.slug).length,
      brands: marketBrands(cn.slug, brandsOf(cn.slug), markets[cn.slug], popularModels),
    })),
    selections: selections.filter((s) => s.count > 0 && s.nav !== false).slice(0, 10).map((s) => ({ name: s.name, url: s.url, count: s.count })),
    serviceGroups: serviceGroups.map((g) => ({ ...g, items: g.items.map((slug) => services.find((s) => s.slug === slug)).filter(Boolean).map((s) => ({ name: s.navName || s.name, url: s.url })) })),
    top: [
      { name: 'Калькулятор', url: R.calculator },
      { name: 'Доставка', url: R.delivery, panel: 'mega-delivery', groups: [
        { title: 'Доставка по России', items: [
          { name: 'Все о доставке', url: R.delivery },
          { name: 'Города и тарифы', url: R.delivery + '#goroda' },
          { name: 'Способы доставки', url: R.delivery + '#sposoby' },
          { name: 'Доставка автовозом', url: R.delivery + '#avtovoz' },
        ] },
        { title: 'По городам', items: ['novosibirsk', 'krasnoyarsk', 'irkutsk', 'ekaterinburg', 'moskva', 'sankt-peterburg']
          .map((slug) => cities.find((city) => city.slug === slug)).filter(Boolean).map((city) => ({ name: city.name, url: city.url })) },
      ] },
      { name: 'Привезенные авто', url: R.cases },
      { name: 'Отзывы', url: R.reviews },
      { name: 'Полезное', url: R.clients, panel: 'mega-useful', groups: [{ items: [
        { name: 'Информация для клиентов', url: R.clients }, { name: 'Блог', url: R.blog },
        { name: 'Вопросы и ответы', url: R.faq }, { name: 'Видео и обзоры', url: R.video },
      ] }] },
      { name: 'О компании', url: R.about, panel: 'mega-company', groups: [{ title: 'Компания', items: [
        { name: 'О компании', url: R.about }, { name: 'Контактные данные', url: R.contacts },
        { name: 'Реквизиты', url: R.contacts + '#rekvizity' },
      ] }], promo: { label: 'Офис во Владивостоке', title: site.contacts.street, text: `${site.contacts.office} · ${site.contacts.hours}`, cta: 'Как добраться', url: R.contacts + '#kak-dobratsya' } },
    ],
    footerCompany: [
      { name: 'О компании', url: R.about },
      { name: 'Привезенные авто', url: R.cases },
      { name: 'Отзывы', url: R.reviews },
      { name: 'Доставка по России', url: R.delivery },
      { name: 'Как заказать авто', url: R.howTo },
      { name: 'Калькулятор', url: R.calculator },
      { name: 'Блог', url: R.blog },
      { name: 'Вопросы и ответы', url: R.faq },
      { name: 'Видео', url: R.video },
      { name: 'Контакты', url: R.contacts },
    ],
    cities: cities.map((c) => ({ name: c.name, url: c.url })),
  };

  return {
    site,
    source,
    build,
    R,
    nav,
    countries,
    countryBySlug,
    cars,
    brands,
    brandsOf,
    models,
    popularModels,
    selections,
    slices,
    slicesOf,
    services,
    serviceGroups,
    cases,
    reviews,
    team: [site.salesManager],
    cities,
    posts,
    faq,
    calc,
    content,
    carWord,
    carFlags,
    priceStats,
    md: (src) => markdown(String(src)).html,
  };
}
