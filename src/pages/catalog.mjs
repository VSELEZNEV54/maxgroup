import { includeModelProfiles } from '../components/catalog-filters.mjs';
// Каталог: хаб, страны, марки, модели, подборки.
import { html, esc, u, abs, price, priceShort, count, typo, groupBy } from '../lib/core.mjs';
import { faqLd, itemListLd, aggregateOfferLd } from '../lib/seo.mjs';
import { icon, label, duo, btn, more, reveal, sectionHead, faqList, chips, caseCard, ctaBand, seoText, linkBlock, card, rail, railNav, note } from '../components/ui.mjs';
import { carsBlock, catalogLandingHead, directoryFilters, popularModelCard, modelsPriceTable, yearsPriceTable, priceParts, countryCompare, brandTiles, fromPrice, fromShort } from '../components/catalog.mjs';
import { miniCalcSection } from '../components/calc.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const CATALOG = { name: 'Каталог', url: R.catalog };
const varWord = ['вариант', 'варианта', 'вариантов'];
const topModelLinks = (ctx) => ctx.countries.map((cn) => ({ name: `Топ-30 ${cn.from}`, url: R.topModels(cn.slug) }));
const md = (ctx, s) => (s ? ctx.md(s) : '');
const images = (cars) => cars.flatMap((c) => c.photos.slice(0, 1)).slice(0, 8);
/** Превью для мессенджеров: первое фото раздела (headTags подставит JPG 1200×630 из assets/img/og, см. tools/og.py) */
const ogOf = (cars) => { const p = cars.find((c) => c.photos.length)?.photos[0]; return p ? p.replace(/^assets\//, '') : undefined; };
/** «о Toyota», но «об Audi» */
const about = (name) => `${/^[aeiouаеёиоуыэюя]/i.test(name) ? 'об' : 'о'} ${name}`;

// --- title и цена «от» ----------------------------------------------------------------------------

const BRAND = ' | Макс Групп';

/**
 * <title>: варианты идут от самого содержательного к короткому. Суффикс « | Макс Групп» добавляется,
 * только если с ним заголовок не длиннее 65 знаков; без суффикса вариант годится до 70 знаков.
 */
function fitTitle(...variants) {
  for (const v of variants) {
    if ((v + BRAND).length <= 65) return v + BRAND;
    if (v.length <= 70) return v;
  }
  return variants[variants.length - 1];
}

/**
 * Формулировки цены «от» для title и description. x — марка, модель, подборка или срез.
 * «Под ключ» пишем только про цену, в которую вошел утилизационный сбор (см. fromPrice в components/catalog.mjs).
 */
function priceWords(x, year) {
  const f = fromPrice(x);
  if (!f) return { partial: false, t1: `цены ${year}`, t2: `цены ${year}`, d: 'цены по запросу', dVl: 'цена по запросу' };
  const S = priceShort(f.value);
  const P = price(f.value);
  return f.partial
    ? { partial: true, t1: `цены ${year} от ${S} без утильсбора`, t2: `цены ${year} от ${S} без утильсбора`, d: `цены во Владивостоке от ${P} без утилизационного сбора`, dVl: `цена во Владивостоке от ${P} без утилизационного сбора` }
    : { partial: false, t1: `цены ${year} под ключ от ${S}`, t2: `цены ${year} от ${S}`, d: `цены под ключ от ${P}`, dVl: `цена под ключ во Владивостоке от ${P}` };
}

const DESC_TAILS = ['Список моделей с ценами, расчет растаможки и доставка по России.', 'Расчет растаможки и доставка по России.'];

/**
 * Описание подборки или среза: живые цифры и только законченные предложения — лид на полуслове не обрезается.
 * tail — готовая фраза подборки (поле desc в src/data/selections.mjs); если не помещается в 165 знаков — типовая концовка.
 */
function selDesc(h1, x, tail) {
  const f = fromPrice(x);
  const sep = h1.includes(':') ? '.' : ':';
  const n = count(x.count, varWord);
  let out;
  if (!f) out = `${h1}${sep} ${n} в каталоге.`;
  else if (f.partial) out = `${h1}${sep} ${n}, цены во Владивостоке от ${price(f.value)} без утилизационного сбора.`;
  // «под ключ» дважды не повторяем: в названиях бюджетных подборок оно уже есть
  else out = `${h1}${sep} ${n}, цены ${/под ключ/i.test(h1) ? '' : 'под ключ '}во Владивостоке от ${price(f.value)}.`;
  const add = [tail, ...DESC_TAILS].filter(Boolean).find((t) => out.length + 1 + t.length <= 165);
  return add ? `${out} ${add}` : out;
}

// --- «Полезно прочитать»: статьи блога по тегам ---------------------------------------------------

/**
 * 2-4 статьи блога для блока перелинковки. tags — [тег | [тег, вес]]: сравниваются с tags статьи без учета регистра.
 * Если совпадений мало, добавляются общие статьи о растаможке и выборе страны.
 */
function usefulPosts(ctx, tags, { limit = 4 } = {}) {
  const want = new Map();
  for (const t of tags) {
    if (!t) continue;
    const [name, w] = Array.isArray(t) ? t : [t, 1];
    if (name) want.set(String(name).toLowerCase(), Math.max(w, want.get(String(name).toLowerCase()) || 0));
  }
  const posts = ctx.posts || [];
  const list = posts
    .map((p) => ({ p, s: [].concat(p.tags || []).reduce((sum, t) => sum + (want.get(String(t).toLowerCase()) || 0), 0) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.p.slug.localeCompare(y.p.slug))
    .slice(0, limit)
    .map((x) => x.p);
  for (const slug of ['rastamozhka-avto-2026', 'yaponiya-koreya-ili-kitaj']) {
    if (list.length >= 2) break;
    const p = posts.find((x) => x.slug === slug);
    if (p && !list.includes(p)) list.push(p);
  }
  return { title: 'Полезно прочитать', items: list.map((p) => ({ name: p.short || p.title, url: p.url })) };
}

const COUNTRY_TAGS = {
  japan: [['аукционы японии', 2], ['правый руль', 1], ['смета под ключ', 1]],
  korea: [['проверка истории', 2], ['левый руль', 1]],
  china: [['новые автомобили', 1], ['электромобили', 1]],
};

const SELECTION_TAGS = {
  'do-160-ls': [['до 160 л.с.', 3], ['льготный утильсбор', 2], ['утильсбор', 1]],
  'prohodnye-avto': [['проходные 3-5 лет', 3], ['возраст автомобиля', 2], ['пошлина', 1]],
  'do-1-mln': [['смета под ключ', 3], ['растаможка', 2], ['до 160 л.с.', 1]],
  'do-1-5-mln': [['смета под ключ', 3], ['растаможка', 2], ['до 160 л.с.', 1]],
  'do-2-mln': [['смета под ключ', 3], ['растаможка', 2], ['до 160 л.с.', 1]],
  'do-3-mln': [['смета под ключ', 3], ['растаможка', 2], ['проходные 3-5 лет', 1]],
  krossovery: [['сравнение рынков', 2], ['список моделей', 1], ['утильсбор', 1]],
  miniveny: [['минивэны', 3]],
  sedany: [['сравнение рынков', 2], ['левый руль', 1], ['утильсбор', 1]],
  'kei-kary': [['правый руль', 2], ['аукционы японии', 1], ['до 160 л.с.', 1]],
  gibridy: [['гибриды', 3]],
  elektromobili: [['электромобили', 3]],
  dizelnye: [['проверка истории', 2], ['левый руль', 1]],
  'polnyj-privod': [['сравнение рынков', 2], ['список моделей', 1]],
  'novye-avto': [['новые автомобили', 3], ['пошлина', 2], ['растаможка', 1]],
};

/** Теги по составу автомобилей: тип двигателя, кузов, льготы */
function carTags(cars, w = 1) {
  const some = (fn) => cars.some(fn);
  return [
    some((c) => c.isHybrid) && ['гибриды', w],
    some((c) => c.isElectric || c.isEvTariff) && ['электромобили', w],
    some((c) => /минивэн/i.test(c.body || '')) && ['минивэны', w],
    some((c) => c.isLowPower) && ['до 160 л.с.', w],
    some((c) => c.isPassing) && ['проходные 3-5 лет', w],
  ];
}

// --- общий хвост листинга ---------------------------------------------------------------------------

/** Ряд кейсов: до четырех карточек занимают всю ширину, больше — лента с прокруткой */
function casesRow(cases) {
  const n = cases.length;
  if (n > 4) return rail(cases.slice(0, 8).map((c, i) => caseCard(c, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' });
  const stack = n > 2;
  const col = n === 1 ? '100%' : `minmax(280px, calc((100% - ${n - 1} * var(--gap)) / ${n}))`;
  return `<div class="cases-fill">${rail(cases.map((c, i) => caseCard(c, { i, stack })), { col, colMobile: n === 1 ? '100%' : 'minmax(260px, 78%)' })}</div>`;
}

/**
 * Общий хвост листинга: кейсы → FAQ → SEO-текст → перелинковка → CTA.
 * prev — фон секции перед хвостом ('paper' | 'white' | 'dark'): две секции одного фона подряд идут без верхнего отступа.
 * faqTopic — тема для заголовка FAQ («о Toyota из Японии»).
 */
function listingTail(ctx, { cases = [], faq = [], faqTopic, seo, links = [], cta = {}, casesTitle, prev = 'paper' }) {
  const flush = (bg, before) => (bg === before ? ' section--flush-top' : '');
  const beforeFaq = cases.length ? 'paper' : prev;
  const beforeSeo = faq.length ? 'white' : beforeFaq;
  return html`
    ${cases.length
      ? html`
    <section class="section${flush('paper', prev)}">
      <div class="container">
        ${sectionHead({ label: 'Привезенные авто', title: casesTitle || duo('Такие автомобили', 'мы уже привозили'), lead: 'Реальные автомобили клиентов с ценами на момент покупки.', aside: cases.length > 4 ? railNav() : '', actions: more('Все привезенные авто', R.cases) })}
        ${casesRow(cases)}
      </div>
    </section>`
      : ''}
    ${faq.length
      ? html`
    <section class="section section--white${flush('white', beforeFaq)}">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${faqTopic ? duo('Частые вопросы', faqTopic) : duo('Частые', 'вопросы')}</h2>
            <p class="lead">Не нашли ответ? Спросите менеджера: ответим в рабочее время.</p>
            ${btn('Задать вопрос', R.contacts, { variant: 'dark', modal: 'request', subject: 'Вопрос менеджеру', attrs: { 'data-modal-title': 'Задайте вопрос менеджеру', 'data-modal-text': 'Оставьте контакты, и мы перезвоним или напишем в мессенджер в рабочее время.' } })}
          </div>
          <div class="split__body">${faqList(faq)}</div>
        </div>
      </div>
    </section>`
      : ''}
    ${seo || links.some((l) => l.items?.length)
      ? html`
    <section class="section section--sm${flush('paper', beforeSeo)}">
      <div class="container">
        ${seo ? seoText(seo) : ''}
        ${links.some((l) => l.items?.length) ? `<div class="${seo ? 'u-mt-7' : ''}">${links.filter((l) => l.items?.length).map((l) => linkBlock(l.title, l.items)).join('')}</div>` : ''}
      </div>
    </section>`
      : ''}
    ${ctaBand(ctx, cta)}`;
}

/** Текст из Markdown с подзаголовками ### раскладывается на две колонки — по смысловым блокам */
function proseCols(htmlBody) {
  const parts = htmlBody.split(/(?=<h3\b)/).filter((x) => x.trim());
  if (parts.length < 2) return `<div class="prose u-mt-7">${htmlBody}</div>`;
  // блоки делим между колонками так, чтобы колонки были близки по длине
  const total = parts.reduce((n, x) => n + x.length, 0);
  let left = [];
  let acc = 0;
  for (const part of parts) {
    if (left.length && acc + part.length / 2 > total / 2) break;
    left.push(part);
    acc += part.length;
  }
  if (left.length === parts.length) left = parts.slice(0, -1);
  const right = parts.slice(left.length);
  return `<div class="prose-cols u-mt-7"><div class="prose">${left.join('')}</div><div class="prose">${right.join('')}</div></div>`;
}

// --- хаб каталога -------------------------------------------------------------------------------

function listingScope(ctx, brand, model) {
  const scope = {
    brand: brand.slug,
    countryUrl: R.country(brand.country),
    brands: ctx.brandsOf(brand.country).map((b) => ({ value: b.slug, name: b.name, url: b.url })),
  };
  if (model) {
    scope.model = model.slug;
    scope.brandUrl = brand.url;
    scope.models = brand.models.map((m) => ({ value: m.slug, name: m.name, url: m.url }));
  }
  return scope;
}

function hubPage(ctx) {
  const { cars } = ctx;
  const c = ctx.content.catalog || {};
  const faq = c.faq || [];
  const withExamples = [...ctx.models].sort((x, y) => y.count - x.count).slice(0, 15);
  const all = ctx.priceStats(cars);
  const pw = priceWords(all, ctx.build.year);
  return {
    url: R.catalog,
    type: 'catalog',
    title: fitTitle(`Каталог авто из Японии, Кореи и Китая | цены ${ctx.build.year} под ключ`, 'Каталог авто из Японии, Кореи и Китая | цены под ключ'),
    description: `Каталог авто под заказ из Японии, Кореи и Китая: ${count(cars.length, ['пример', 'примера', 'примеров'])}, ${pw.d.replace('цены под ключ', 'цены под ключ во Владивостоке')}. Фильтр по стране, марке, бюджету и мощности.`,
    h1: 'Каталог автомобилей из Азии',
    breadcrumbs: [HOME, CATALOG],
    headerOver: true,
    scripts: ['catalog', 'quiz'],
    priority: 0.9,
    changefreq: 'daily',
    images: images(cars),
    jsonld: [itemListLd(ctx.site, 'Каталог автомобилей из Азии', cars.slice(0, 24).map((x) => ({ url: x.url, name: x.titleYear }))), faqLd(faq)].filter(Boolean),
    render: () => html`
    ${catalogLandingHead({
      crumbs: [HOME, CATALOG],
      h1: duo('Каталог автомобилей', 'из Японии, Кореи и Китая'),
      lead: 'Сравните автомобили по пробегу, состоянию и цене во Владивостоке.',
    })}
    ${carsBlock(ctx, cars, { scope: includeModelProfiles(ctx, cars), quizFilters: true })}
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Марки', title: duo('Каталог по маркам', 'и странам'), lead: 'Выберите марку, и мы покажем модели из каталога и цены во Владивостоке.' })}
        ${ctx.nav.countries.map((cn) => {
          const list = cars.filter((x) => x.country === cn.slug);
          return html`
        <div class="linkblock">
          <h3 class="h4"><a class="link" href="${u(cn.url)}">Авто ${esc(cn.from)}</a></h3>
          <p class="muted small" style="margin:-6px 0 14px">${typo(`${count(list.length, varWord)} · ${fromShort(ctx.priceStats(list))} · ${cn.steering}`)}</p>
          ${chips(ctx.brandsOf(cn.slug).map((b) => ({ name: b.name, url: b.url, count: b.count })))}
        </div>`;
        })}
        <div class="linkblock">
          <h3 class="h4">Модели с примерами автомобилей</h3>
          ${chips(withExamples.map((m) => ({ name: `${m.brand} ${m.name}`, url: m.url, count: m.count })))}
        </div>
      </div>
    </section>
    ${priceParts()}
    ${listingTail(ctx, {
      cases: ctx.cases.slice(0, 8),
      faq,
      faqTopic: 'о каталоге и ценах',
      seo: md(ctx, c.seo),
      links: [
        { title: 'Топ-30 по заказам', items: topModelLinks(ctx) },
        { title: 'Доставка по России', items: ctx.cities.slice(0, 14).map((x) => ({ name: x.name, url: x.url })) },
        usefulPosts(ctx, [['растаможка', 2], ['сравнение рынков', 2], ['утильсбор', 1], ['доставка по россии', 1]]),
      ],
      cta: { subject: 'Заявка из каталога' },
      prev: 'paper',
    })}`,
  };
}

// --- страна -------------------------------------------------------------------------------------

function countryPage(ctx, cn) {
  const cars = ctx.cars.filter((x) => x.country === cn.slug);
  const brands = ctx.brandsOf(cn.slug);
  const models = ctx.models.filter((m) => m.country === cn.slug).sort((x, y) => y.count - x.count);
  const c = ctx.content.countries?.[cn.slug] || {};
  const faq = c.faq || [];
  const pw = priceWords(ctx.priceStats(cars), ctx.build.year);
  const headline = `Авто ${cn.from} под заказ с доставкой${cn.slug === 'japan' ? ' за 25 дней' : ''}`;
  const cases = ctx.cases.filter((x) => x.countrySlug === cn.slug);
  const crumbsList = [HOME, CATALOG, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }];
  return {
    url: R.country(cn.slug),
    type: 'country',
    title: c.title || fitTitle(`Авто ${cn.from} под заказ | ${pw.t1}`, `Авто ${cn.from} под заказ | ${pw.t2}`),
    description: c.description || `Авто ${cn.from} под заказ с доставкой по России: ${count(cars.length, varWord)} в каталоге, ${pw.dVl}. Таможенное оформление берем на себя.`,
    h1: headline,
    breadcrumbs: crumbsList,
    headerOver: true,
    scripts: ['catalog', 'quiz', 'calc-core', 'calc'],
    priority: 0.9,
    changefreq: 'daily',
    images: images(cars),
    ogImage: cn.image,
    jsonld: [itemListLd(ctx.site, `Автомобили ${cn.from}`, cars.slice(0, 24).map((x) => ({ url: x.url, name: x.titleYear }))), faqLd(faq)].filter(Boolean),
    render: () => html`
    ${catalogLandingHead({
      crumbs: crumbsList, country: cn, h1: typo(headline), video: cn.landingVideo,
      lead: {
        japan: 'Подберём авто под ваш бюджет и доставим до Владивостока за 25 дней. Затем отправим в ваш город.',
        korea: 'Проверим историю и пробег автомобиля в Корее, рассчитаем стоимость под ключ во Владивостоке и доставку в ваш город.',
        china: 'Подберём автомобиль у китайских дилеров, проверим комплектацию и состояние. Рассчитаем цену под ключ с доставкой в ваш город.',
      }[cn.slug],
    })}
    ${carsBlock(ctx, cars, { scope: includeModelProfiles(ctx, cars, cn.slug), country: cn.slug,
      heading: `Автомобили ${cn.from} в каталоге`, subject: `Подбор авто ${cn.from}` })}
    ${c.advantages?.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: `Почему ${cn.name}`, title: duo(c.advantagesTitle || `Что дает покупка ${cn.inLoc}`, c.advantagesMuted || 'и о чем стоит знать заранее'), lead: c.advantagesLead })}
        <div class="grid grid--3">
          ${c.advantages.map((x, i) => card({ icon: x.icon, title: x.title, text: x.text, tall: true, i: i % 3 }))}
        </div>
        ${c.limits ? `<div class="u-mt-5">${note(md(ctx, c.limits), { warn: true })}</div>` : ''}
      </div>
    </section>`
      : ''}
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Марки и модели', title: duo('Что можно заказать', cn.from), lead: c.modelsLead || `Марки и модели ${cn.from} из каталога с ценами во Владивостоке.` })}
        ${brandTiles(brands, { from: cn.from })}
        <div class="u-mt-5">${more('Топ-30 автомобилей ' + cn.from, R.topModels(cn.slug))}</div>
        <div class="u-mt-7">
          <h3 class="h4" style="margin-bottom:16px">Цены моделей ${esc(cn.from)} в каталоге</h3>
          ${modelsPriceTable(models.slice(0, 12))}
        </div>
      </div>
    </section>
    ${c.process?.length
      ? html`
    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Как это работает', title: duo(`Как мы покупаем авто ${cn.inLoc}`, 'и привозим во Владивосток'), lead: c.processLead })}
        <div class="grid grid--4">
          ${c.process.map((s, i) => html`<article class="step step--light"${reveal(i % 4)}><div class="step__head"><span class="step__num">Шаг ${String(i + 1).padStart(2, '0')}</span></div><h3 class="step__title">${typo(s.title)}</h3><p class="step__text">${typo(s.text)}</p></article>`)}
        </div>
      </div>
    </section>`
      : ''}
    ${ctx.content.countryCompare?.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Сравнение', title: duo('Япония, Корея или Китай:', 'что выбрать'), lead: 'Коротко о различиях трех рынков. Если сомневаетесь, посчитаем один и тот же класс автомобиля из разных стран.' })}
        ${countryCompare(ctx, cn.slug)}
      </div>
    </section>`
      : ''}
    ${miniCalcSection(ctx, { country: cn.slug })}
    ${priceParts({ white: true })}
    ${listingTail(ctx, {
      cases,
      casesTitle: duo(`Авто ${cn.from},`, 'которые мы привезли'),
      faq,
      faqTopic: `об авто ${cn.from}`,
      seo: md(ctx, c.seo),
      links: [
        { title: `Марки ${cn.from}`, items: brands.map((b) => ({ name: `${b.name} ${cn.from}`, url: b.url })) },
        { title: `Модели ${cn.from} в каталоге`, items: models.slice(0, 18).map((m) => ({ name: `${m.brand} ${m.name}`, url: m.url })) },
        { title: `Подборки ${cn.from}`, items: ctx.slicesOf(cn.slug).map((x) => ({ name: x.h1, url: x.url })) },
        { title: 'Другие страны', items: ctx.nav.countries.filter((x) => x.slug !== cn.slug).map((x) => ({ name: `Авто ${x.from}`, url: x.url })) },
        { title: `Доставка авто ${cn.from} по России`, items: ctx.cities.slice(0, 14).map((x) => ({ name: x.name, url: x.url })) },
        usefulPosts(ctx, [[cn.navTitle, 2], ...(COUNTRY_TAGS[cn.slug] || [])]),
      ],
      cta: { subject: `Заявка: авто ${cn.from}`, title: duo(`Подберем автомобиль ${cn.from}`, 'под ваш бюджет') },
      prev: 'white',
    })}`,
  };
}

// --- марка в стране -----------------------------------------------------------------------------

function brandPage(ctx, b) {
  const cn = ctx.countryBySlug[b.country];
  const c = ctx.content.brands?.[`${b.country}/${b.slug}`] || {};
  const faq = c.faq || [];
  const crumbsList = [HOME, CATALOG, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }, { name: b.name, url: b.url }];
  const elsewhere = ctx.brands.filter((x) => x.slug === b.slug && x.country !== b.country);
  const siblings = ctx.brandsOf(b.country).filter((x) => x.slug !== b.slug);
  const cases = ctx.cases.filter((x) => new RegExp(`^${b.name}\\b`, 'i').test(x.name));
  const pw = priceWords(b, ctx.build.year);
  const head = `${b.name} ${cn.from} под заказ`;
  const modelNames = (n) => b.models.slice(0, n).map((m) => m.name).join(', ');
  const descs = [5, 4, 3, 2].map((n) => `${head}: ${count(b.count, varWord)} в каталоге, ${pw.d}. Модели: ${modelNames(n)}. Доставка и растаможка во Владивостоке.`);
  return {
    url: b.url,
    type: 'brand',
    title: fitTitle(`${head} | ${pw.t1}`, `${head} | ${pw.t2}`, `${head} | цены ${ctx.build.year}`),
    description: descs.find((d) => d.length <= 165) || `${head}: ${count(b.count, varWord)} в каталоге, ${pw.d}. Доставка и растаможка во Владивостоке.`,
    h1: head,
    breadcrumbs: crumbsList,
    headerOver: true,
    scripts: ['catalog', 'quiz'],
    priority: 0.8,
    images: images(b.cars),
    ogImage: ogOf(b.cars),
    jsonld: [itemListLd(ctx.site, `${b.name} ${cn.from}`, b.cars.map((x) => ({ url: x.url, name: x.titleYear }))), faqLd(faq)].filter(Boolean),
    render: () => html`
    ${catalogLandingHead({
      crumbs: crumbsList, country: cn, photo: b.photo, requestTitle: `Подберём ${b.name} ${cn.from}`,
      h1: duo(`${b.name} ${cn.from}`, 'под заказ'),
      lead: `Сравните модели ${esc(b.name)} по году выпуска, пробегу и цене во Владивостоке.`,
    })}
    ${carsBlock(ctx, b.cars, { scope: includeModelProfiles(ctx, b.cars, b.country, listingScope(ctx, b)), country: b.country,
      heading: `${b.name} ${cn.from} в каталоге`, subject: `Подбор ${b.name} ${cn.from}` })}
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Модели и цены', title: duo(`Модели ${b.name}`, `${cn.from}: ${b.hasPartial ? 'цены во Владивостоке' : 'цены под ключ'}`), lead: c.modelsLead || `Сколько стоит ${b.name} ${cn.from} с доставкой во Владивосток и таможенным оформлением. Цены по моделям из каталога.` })}
        ${modelsPriceTable(b.models)}
        ${c.about ? proseCols(md(ctx, c.about)) : ''}
      </div>
    </section>
    ${c.points?.length
      ? html`
    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'На что смотреть', title: duo(`${b.name} ${cn.from}:`, 'что важно знать до покупки') })}
        <div class="grid grid--${c.points.length === 2 ? 2 : 3}">${c.points.map((x, i) => card({ icon: x.icon || 'check', title: x.title, text: x.text, tall: true, i: i % 3 }))}</div>
      </div>
    </section>`
      : ''}
    ${listingTail(ctx, {
      cases,
      casesTitle: duo(`${b.name},`, 'которые мы привезли'),
      faq,
      faqTopic: `${about(b.name)} ${cn.from}`,
      seo: md(ctx, c.seo),
      links: [
        { title: `Модели ${b.name} ${cn.from}`, items: b.models.map((m) => ({ name: `${b.name} ${m.name}`, url: m.url })) },
        { title: `${b.name} из других стран`, items: elsewhere.map((x) => ({ name: `${x.name} ${ctx.countryBySlug[x.country].from}`, url: x.url })) },
        { title: `Другие марки ${cn.from}`, items: siblings.map((x) => ({ name: x.name, url: x.url })) },
        { title: 'Подборки', items: ctx.selections.filter((s) => s.cars.some((x) => x.brandSlug === b.slug && x.country === b.country)).map((s) => ({ name: s.name, url: s.url })) },
        usefulPosts(ctx, [[cn.navTitle, 2], ...(COUNTRY_TAGS[cn.slug] || []), [b.name, 3], ...b.models.map((m) => [`${b.name} ${m.name}`, 3]), ...carTags(b.cars, 2)]),
      ],
      cta: { subject: `Заявка: ${b.name} ${cn.from}`, title: duo(`Подберем ${b.name}`, 'под ваш бюджет'), car: b.name },
      prev: c.points?.length ? 'paper' : 'white',
    })}`,
  };
}

// --- модель ----------------------------------------------------------------------------------------

function modelPage(ctx, m) {
  const cn = ctx.countryBySlug[m.country];
  const brand = ctx.brands.find((b) => b.slug === m.brandSlug && b.country === m.country);
  const c = ctx.content.models?.[`${m.country}/${m.brandSlug}/${m.slug}`] || {};
  const faq = c.faq || [];
  const name = `${m.brand} ${m.name}`;
  const crumbsList = [HOME, CATALOG, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }, { name: m.brand, url: brand.url }, { name: m.name, url: m.url }];
  const siblings = brand.models.filter((x) => x.slug !== m.slug);
  const elsewhere = ctx.models.filter((x) => x.slug === m.slug && x.brandSlug === m.brandSlug && x.country !== m.country);
  const body = m.cars[0]?.body;
  const alike = ctx.models.filter((x) => x !== m && x.cars[0]?.body === body && Math.abs(x.priceFrom - m.priceFrom) < m.priceFrom * 0.45).slice(0, 8);
  const cases = ctx.cases.filter((x) => x.name.toLowerCase().includes(name.toLowerCase()));
  const years = m.yearFrom === m.yearTo ? String(m.yearFrom) : `${m.yearFrom}-${m.yearTo}`;
  const yearsOf = `${years} ${m.yearFrom === m.yearTo ? 'года' : 'годов'}`;
  const pw = priceWords(m, ctx.build.year);
  const head = `${name} ${cn.from}`;
  return {
    url: m.url,
    type: 'model',
    title: fitTitle(`${head} | купить под заказ, ${pw.t1}`, `${head} | купить под заказ, ${pw.t2}`, `${head} под заказ | ${pw.t2}`, `${head} | ${pw.t2}`),
    description: [
      `${head} под заказ: ${count(m.count, varWord)} ${yearsOf}, ${pw.dVl}. Проверка перед покупкой, доставка и растаможка.`,
      `${head} под заказ: ${count(m.count, varWord)} ${yearsOf}, ${pw.dVl}. Проверка, доставка и растаможка.`,
    ].find((d) => d.length <= 165) || `${head} под заказ: ${count(m.count, varWord)} ${yearsOf}, ${pw.dVl}.`,
    h1: head,
    breadcrumbs: crumbsList,
    headerOver: true,
    scripts: ['catalog', 'quiz'],
    priority: 0.7,
    images: images(m.cars),
    ogImage: m.photo ? m.photo.replace(/^assets\//, '') : undefined,
    jsonld: [
      itemListLd(ctx.site, head, m.cars.map((x) => ({ url: x.url, name: x.titleYear }))),
      // Product + AggregateOffer — только на странице модели и только по автомобилям с полной ценой
      aggregateOfferLd(ctx.site, { name: head, description: c.lead || `${head} под заказ с доставкой по России`, url: m.url, cars: m.cars, brand: m.brand, image: m.photo }),
      faqLd(faq),
    ].filter(Boolean),
    render: () => html`
    ${catalogLandingHead({
      crumbs: crumbsList, country: cn, photo: m.photo, requestTitle: `Подберём ${name}`,
      h1: duo(name, `${cn.from}: ${m.allPartial ? 'цены и расчет' : 'цены под ключ'}`),
      lead: 'Комплектации, пробег и цена во Владивостоке для каждого автомобиля.',
    })}
    ${carsBlock(ctx, m.cars, { scope: includeModelProfiles(ctx, m.cars, m.country, listingScope(ctx, brand, m)), country: m.country,
      heading: `${name} в каталоге`, subject: `Подбор ${head}` })}
    <section class="section section--white">
      <div class="container">
        <div class="split split--even">
          <div${reveal()}>
            ${label('Обзор модели')}
            <h2 class="u-mt-5">${duo(`Что нужно знать`, about(name))}</h2>
            <div class="prose u-mt-6">${c.about ? md(ctx, c.about) : `<p>${typo(`Модель ${name} есть в каталоге авто ${cn.from}. Здесь собраны примеры ${yearsOf} выпуска с ценой во Владивостоке; под заказ подберем автомобиль с нужным пробегом, комплектацией и цветом.`)}</p>`}</div>
            ${m.popularProfiles?.map((entry) => popularModelCard(entry, { embedded: true }))}
          </div>
          <div${reveal(1)}>
            <h3 class="h4" style="margin-bottom:16px">Цены на ${esc(name)} по годам</h3>
            ${yearsPriceTable(m.cars)}
            ${c.specs?.length ? `<h3 class="h4" style="margin:32px 0 16px">Характеристики</h3><dl class="spec">${c.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
            <div class="u-mt-5">${note(`Цена зависит от года, пробега, аукционной оценки и курса валют. Точный расчет под конкретный автомобиль пришлет менеджер. Или <a class="link" href="${u(R.calculator)}">посчитайте в калькуляторе</a>.`)}</div>
          </div>
        </div>
      </div>
    </section>
    ${c.points?.length
      ? html`
    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Плюсы и нюансы', title: duo(`${name}:`, 'за что выбирают и на что смотреть') })}
        <div class="grid grid--${c.points.length === 2 ? 2 : 3}">${c.points.map((x, i) => card({ icon: x.icon || 'check', title: x.title, text: x.text, tall: true, i: i % 3 }))}</div>
      </div>
    </section>`
      : ''}
    ${listingTail(ctx, {
      cases,
      casesTitle: duo(`${name},`, 'которые мы привезли'),
      faq,
      faqTopic: about(name),
      seo: md(ctx, c.seo),
      links: [
        { title: `Другие модели ${m.brand} ${cn.from}`, items: siblings.map((x) => ({ name: `${x.brand} ${x.name}`, url: x.url })) },
        { title: `${name} из других стран`, items: elsewhere.map((x) => ({ name: `${name} ${ctx.countryBySlug[x.country].from}`, url: x.url })) },
        { title: 'Похожие модели', items: alike.map((x) => ({ name: `${x.brand} ${x.name}`, url: x.url })) },
        { title: 'Разделы каталога', items: [{ name: `Все ${m.brand} ${cn.from}`, url: brand.url }, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }, ...ctx.selections.filter((s) => s.cars.some((x) => x.modelSlug === m.slug && x.brandSlug === m.brandSlug)).slice(0, 6).map((s) => ({ name: s.name, url: s.url }))] },
        // для модели важнее ее собственные признаки (гибрид, минивэн, льгота), чем общие статьи о стране
        usefulPosts(ctx, [[name, 4], [cn.navTitle, 1], ...(COUNTRY_TAGS[cn.slug] || []).map(([t]) => [t, 1]), ...carTags(m.cars, 3)], { limit: 3 }),
      ],
      cta: { subject: `Заявка: ${head}`, title: duo(`Привезем ${name}`, 'под ваш бюджет'), car: name },
      prev: c.points?.length ? 'paper' : 'white',
    })}`,
  };
}

// --- подборки ----------------------------------------------------------------------------------------

function topModelsPage(ctx, cn) {
  const entries = ctx.popularModels.filter((entry) => entry.country === cn.slug);
  const url = R.topModels(cn.slug);
  const h1 = `Топ-30 автомобилей ${cn.from}`;
  const breadcrumbs = [HOME, CATALOG, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }, { name: 'Топ-30 по заказам', url }];
  return {
    url, type: 'selection', h1, breadcrumbs, headerOver: true, scripts: ['catalog'],
    title: `${h1} по заказам | Макс Групп`,
    description: `30 популярных моделей ${cn.from} по данным Макс Групп. Годы выпуска, двигатели, типовые комплектации и ориентиры цен под ключ и автомобили для заказа.`,
    jsonld: [{ '@type': 'ItemList', name: h1, itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: entries.length, itemListElement: entries.map((entry) => ({ '@type': 'WebPage', name: entry.name, url: abs(ctx.site, entry.url) })) }],
    render: () => html`
    ${catalogLandingHead({
      crumbs: breadcrumbs, country: cn,
      h1: duo('Топ-30 автомобилей', cn.from),
      lead: 'Модели, которые клиенты Макс Групп заказывают чаще всего.',
      actions: chips(ctx.countries.map((country) => ({ name: country.navTitle, url: R.topModels(country.slug) })), { current: url }),
    })}
    <section class="section section--sm section--flush-top catalog-listing" aria-label="Поиск автомобилей и карточки моделей">
      <div class="container">
        ${directoryFilters(ctx, cn.slug)}
        <div class="grid grid--3">${entries.map((entry, i) => popularModelCard(entry, { priority: i === 0 }))}</div>
      </div>
    </section>`,
  };
}

function selectionsHub(ctx) {
  const groups = groupBy(ctx.selections.filter((s) => s.count > 0), (s) => s.group);
  const crumbsList = [HOME, CATALOG, { name: 'Подборки', url: R.selections }];
  return {
    url: R.selections,
    type: 'catalog', headerOver: true, scripts: ['catalog'],
    title: 'Подборки авто из Азии: бюджет, кузов, растаможка | Макс Групп',
    description: 'Подборки авто из Японии, Кореи и Китая: до 160 л.с., проходные 3-5 лет, до 1,5, 2 и 3 млн ₽, кроссоверы, минивэны, гибриды. Цены и расчет по каждой машине.',
    h1: 'Подборки автомобилей из Азии',
    breadcrumbs: crumbsList,
    priority: 0.7,
    render: () => html`
    ${catalogLandingHead({ crumbs: crumbsList, h1: duo('Подборки автомобилей', 'под задачу и бюджет'), lead: 'Выберите автомобили по бюджету, типу кузова или условиям растаможки.' })}
    <section class="section section--sm section--flush-top catalog-listing">
      <div class="container">
        ${directoryFilters(ctx)}
        ${linkBlock('Топ-30 по заказам', topModelLinks(ctx), { tag: 'h2' })}
        ${Object.entries(groups).map(([g, list]) => html`
        <div class="linkblock">
          <h2 class="h3">${esc(g)}</h2>
          <div class="grid grid--${Math.max(2, Math.min(3, list.length))}">
            ${list.map((s, i) => card({ icon: s.icon, title: s.name, text: s.lead, href: s.url, i: i % 3, tag: 'h3', foot: `<span class="muted small">${count(s.count, varWord)} · ${fromShort(s)}</span>` }))}
          </div>
        </div>`)}
      </div>
    </section>
    ${ctaBand(ctx, { subject: 'Заявка: подборки' })}`,
  };
}

/** title подборки и среза: год и цена «от»; «под ключ» не повторяем, если оно уже есть в названии */
function selTitle(h1, pw, year) {
  return fitTitle(`${h1} | ${/под ключ/i.test(h1) ? pw.t2 : pw.t1}`, `${h1} | ${pw.t2}`, `${h1} | цены ${year}`);
}

function selectionPage(ctx, s) {
  const c = ctx.content.selections?.[s.slug] || {};
  const faq = c.faq || [];
  const crumbsList = [HOME, CATALOG, { name: 'Подборки', url: R.selections }, { name: s.name, url: s.url }];
  const byCountry = ctx.nav.countries.map((cn) => ({ cn, n: s.cars.filter((x) => x.country === cn.slug).length })).filter((x) => x.n);
  const models = [...new Map(s.cars.map((x) => [x.modelUrl, { name: x.title, url: x.modelUrl }])).values()].slice(0, 18);
  return {
    url: s.url,
    type: 'selection',
    title: c.title || selTitle(s.h1, priceWords(s, ctx.build.year), ctx.build.year),
    description: c.description || selDesc(s.h1, s, s.desc),
    h1: s.h1,
    breadcrumbs: crumbsList,
    headerOver: true,
    scripts: ['catalog', 'quiz'],
    priority: 0.8,
    images: images(s.cars),
    ogImage: ogOf(s.cars),
    jsonld: [itemListLd(ctx.site, s.h1, s.cars.slice(0, 24).map((x) => ({ url: x.url, name: x.titleYear }))), faqLd(faq)].filter(Boolean),
    render: () => html`
    ${catalogLandingHead({
      crumbs: crumbsList, photo: s.cars.find((car) => car.photos.length)?.photos[0],
      h1: typo(s.h1),
      lead: s.catalogLead,
    })}
    ${carsBlock(ctx, s.cars, { heading: 'Автомобили в подборке', subject: `Подбор: ${s.name}` })}
    ${c.blocks?.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Разбираемся', title: duo(c.blocksTitle || s.name, c.blocksMuted || 'что важно знать') })}
        <div class="grid grid--3">${c.blocks.map((x, i) => card({ icon: x.icon || s.icon, title: x.title, text: x.text, tall: true, i: i % 3 }))}</div>
      </div>
    </section>`
      : ''}
    ${listingTail(ctx, {
      faq,
      faqTopic: s.about,
      seo: md(ctx, c.seo),
      links: [
        { title: 'Модели в подборке', items: models },
        { title: 'По странам', items: [...s.slices.map((x) => ({ name: x.h1, url: x.url })), ...byCountry.filter((x) => !s.slices.some((y) => y.country === x.cn.slug)).map((x) => ({ name: `Авто ${x.cn.from}`, url: R.country(x.cn.slug) }))] },
        { title: 'Другие подборки', items: ctx.selections.filter((x) => x.slug !== s.slug && x.count > 0).map((x) => ({ name: x.name, url: x.url })) },
        usefulPosts(ctx, [[s.name, 3], ...(SELECTION_TAGS[s.slug] || [])]),
      ],
      cta: { subject: `Заявка: ${s.name}` },
      prev: c.blocks?.length ? 'dark' : 'paper',
    })}`,
  };
}

// --- срез подборки внутри страны («Авто из Японии до 160 л.с.») --------------------------------------

function slicePage(ctx, sl) {
  const { cn, selection: s } = sl;
  const c = ctx.content.slices?.[`${cn.slug}/${s.slug}`] || {};
  const base = ctx.content.selections?.[s.slug] || {};
  const faq = c.faq || [];
  const crumbsList = [HOME, CATALOG, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }, { name: s.name, url: sl.url }];
  const brands = [...new Map(sl.cars.map((x) => [x.brandUrl, { name: `${x.brand} ${cn.from}`, url: x.brandUrl }])).values()];
  const models = [...new Map(sl.cars.map((x) => [x.modelUrl, { name: x.title, url: x.modelUrl }])).values()].slice(0, 18);
  const others = s.slices.filter((x) => x.country !== cn.slug);
  const blocks = c.blocks || base.blocks || [];
  return {
    url: sl.url,
    type: 'selection',
    title: c.title || selTitle(sl.h1, priceWords(sl, ctx.build.year), ctx.build.year),
    description: c.description || selDesc(sl.h1, sl, s.desc),
    h1: sl.h1,
    breadcrumbs: crumbsList,
    headerOver: true,
    scripts: ['catalog', 'quiz'],
    priority: 0.7,
    images: images(sl.cars),
    ogImage: ogOf(sl.cars),
    jsonld: [itemListLd(ctx.site, sl.h1, sl.cars.map((x) => ({ url: x.url, name: x.titleYear }))), faqLd(faq)].filter(Boolean),
    render: () => html`
    ${catalogLandingHead({
      crumbs: crumbsList, country: cn, photo: sl.cars.find((car) => car.photos.length)?.photos[0],
      h1: typo(sl.h1),
      lead: s.catalogLead,
    })}
    ${carsBlock(ctx, sl.cars, { country: cn.slug, heading: 'Автомобили в подборке', subject: `Подбор: ${sl.h1}` })}
    ${blocks.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Разбираемся', title: duo(s.name, `${cn.from}: что важно знать`) })}
        <div class="grid grid--3">${blocks.map((x, i) => card({ icon: x.icon || s.icon, title: x.title, text: x.text, tall: true, i: i % 3 }))}</div>
      </div>
    </section>`
      : ''}
    ${listingTail(ctx, {
      faq,
      faqTopic: s.about ? `${s.about} ${cn.from}` : undefined,
      seo: md(ctx, c.seo),
      links: [
        { title: 'Марки в подборке', items: brands },
        { title: 'Модели в подборке', items: models },
        { title: `${s.name}: другие страны`, items: [...(s.global ? [{ name: `${s.name}: все страны`, url: s.url }] : []), ...others.map((x) => ({ name: x.h1, url: x.url }))] },
        { title: `Другие подборки ${cn.from}`, items: ctx.slicesOf(cn.slug).filter((x) => x.slug !== s.slug).map((x) => ({ name: x.name, url: x.url })) },
        usefulPosts(ctx, [[s.name, 3], ...(SELECTION_TAGS[s.slug] || []), [cn.navTitle, 1]]),
      ],
      cta: { subject: `Заявка: ${sl.h1}` },
      prev: blocks.length ? 'dark' : 'paper',
    })}`,
  };
}

export function catalogPages(ctx) {
  if (!ctx.cars.length && !ctx.popularModels.length) return [];
  return [
    hubPage(ctx),
    ...ctx.countries.map((cn) => countryPage(ctx, cn)),
    ...ctx.countries.map((cn) => topModelsPage(ctx, cn)),
    ...ctx.brands.map((b) => brandPage(ctx, b)),
    ...ctx.models.filter((m) => !m.popularProfiles?.some((entry) => entry.url === m.url)).map((m) => modelPage(ctx, m)),
    selectionsHub(ctx),
    ...ctx.selections.filter((s) => s.global && s.count > 0).map((s) => selectionPage(ctx, s)),
    ...ctx.slices.map((sl) => slicePage(ctx, sl)),
  ];
}
