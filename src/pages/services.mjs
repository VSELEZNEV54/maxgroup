// Услуги: хаб /uslugi/ и пять посадочных (авто под заказ, аукционы Японии, таможня, платежный агент, автокредит).
// Тексты — data/content/services.json. Отраслевые цифры подставляются из data/source/calc-rules.json через плейсхолдеры {…}.
import { html, esc, u, img, typo, price, priceShort, num, dateRu } from '../lib/core.mjs';
import { faqLd, serviceLd, howToLd, itemListLd } from '../lib/seo.mjs';
import {
  icon, stars, label, duo, btn, more, reveal, sectionHead, pageHead, fact, card, carCard, caseCard, reviewCard, faqList, chips, step, table, ticks, note, route, rail, railNav, linkBlock, ctaBand,
} from '../components/ui.mjs';
import { priceParts } from '../components/catalog.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const HUB = { name: 'Услуги', url: R.services };

// Шапки. У четырех услуг — 3D-рендеры с maxgroupvl.ru (текст слева, объект справа).
// У аукционов и кредита кадры из видео: рендер руля стоит в плитке аукционов на главной, а баннер кредита светлый.
const HEAD = {
  'avto-pod-zakaz': { photo: 'assets/img/services/service-car.webp', alt: 'Автомобиль под заказ: седан в темной студии', kind: 'render' },
  'aukciony-yaponii': { photo: 'assets/img/hero/bridge-kei.webp', alt: 'Японский кей-кар на Золотом мосту во Владивостоке', kind: 'frame' },
  'tamozhennoe-oformlenie': { photo: 'assets/img/services/service-container.webp', alt: 'Морской контейнер: таможенное оформление автомобилей', kind: 'render' },
  'platezhnyj-agent': { photo: 'assets/img/services/service-card.webp', alt: 'Банковская карта: оплата автомобиля за рубеж', kind: 'render' },
  avtokredit: { photo: 'assets/img/hero/gclass-road.webp', alt: 'Белый внедорожник на ночной дороге во Владивостоке', kind: 'frame' },
};
const HUB_PHOTO = 'assets/img/hero/bridge-drive.webp';
const HUB_CTA_BG = 'assets/img/hero/city-towers.webp';
const CTA_BG = {
  'avto-pod-zakaz': 'assets/img/hero/gclass-close-2.webp',
  'aukciony-yaponii': 'assets/img/hero/kei-blue.webp',
  'tamozhennoe-oformlenie': 'assets/img/hero/bridge-drive.webp',
  'platezhnyj-agent': 'assets/img/hero/street-far.webp',
  avtokredit: 'assets/img/hero/street-night.webp',
};
// Статьи блога по теме услуги: перелинковка коммерческих страниц с информационными (ключ hub — для /uslugi/)
const POSTS = {
  hub: ['yaponiya-koreya-ili-kitaj', 'rastamozhka-avto-2026', 'dostavka-avto-iz-vladivostoka'],
  'avto-pod-zakaz': ['yaponiya-koreya-ili-kitaj', 'skolko-stoit-privezti-avto-iz-yaponii', 'prohodnye-avto-3-5-let'],
  'aukciony-yaponii': ['kak-kupit-avto-na-aukcione-yaponii', 'ocenki-aukcionnogo-lista', 'skolko-stoit-privezti-avto-iz-yaponii'],
  'tamozhennoe-oformlenie': ['rastamozhka-avto-2026', 'sbkts-i-epts-chto-eto', 'utilsbor-2026-160-ls'],
  'platezhnyj-agent': ['kak-kupit-avto-iz-korei', 'kak-privezti-avto-iz-kitaya', 'skolko-stoit-privezti-avto-iz-yaponii'],
  avtokredit: ['skolko-stoit-privezti-avto-iz-yaponii', 'avto-do-160-ls-spisok', 'yaponiya-koreya-ili-kitaj'],
};
const FAQ_TITLE = {
  'avto-pod-zakaz': ['Вопросы', 'о заказе автомобиля'],
  'aukciony-yaponii': ['Вопросы', 'об аукционах Японии'],
  'tamozhennoe-oformlenie': ['Вопросы', 'о растаможке'],
  'platezhnyj-agent': ['Вопросы', 'об оплате за рубеж'],
  avtokredit: ['Вопросы', 'об автокредите'],
};

// --- цифры из calc-rules.json → плейсхолдеры в текстах -----------------------------------------------

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dec = (n, d) => (d === undefined ? String(n) : Number(n).toFixed(d)).replace('.', ',');
const rng = (a, f = (x) => x) => `${f(a[0])}-${f(a[1])}`;

/** Адрес подборки, если ее страница существует; иначе — хаб подборок */
const selUrl = (ctx, slug) => { const s = ctx.selections.find((x) => x.slug === slug && x.count > 0 && x.url); return s ? s.url : R.selections; };

function buildVars(ctx) {
  const v = {
    ratingCount: ctx.site.rating.count,
    url160: selUrl(ctx, 'do-160-ls'),
    urlPassing: selUrl(ctx, 'prohodnye-avto'),
    urlHowTo: R.howTo || R.service('avto-pod-zakaz'),
  };
  const c = ctx.calc;
  if (!c) return v;
  const date = c.rates.default;
  const year = date.slice(0, 4);
  const rate = c.rates.cbr[date];
  const used = c.ets['3to5'];
  const old = c.ets.gt5;
  const base = c.utilFee.baseRateRub;
  const vl = c.costs.vladivostok;
  const full12 = c.utilFee.full.ice['1001_2000'][year][0];
  const mk = ['JPY', 'KRW', 'CNY'].flatMap((k) => c.rates.transfer.markupRange[k]).map((x) => Math.round(x * 100));
  const cnf = c.costs.japan.cAndFByPriceJpy.map((x) => x.cAndFJpy / 1000);
  return Object.assign(v, {
    asOf: `${dateRu(date)} года`,
    asOfMonth: `${MONTHS[Number(date.slice(5, 7)) - 1]} ${year}`,
    year,
    eur: dec(rate.EUR, 2),
    etsMin35: dec(Math.min(...used.map((x) => x.eurPerCc)), 1),
    etsMax35: dec(Math.max(...used.map((x) => x.eurPerCc)), 1),
    etsMinOld: dec(Math.min(...old.map((x) => x.eurPerCc)), 1),
    etsMaxOld: dec(Math.max(...old.map((x) => x.eurPerCc)), 1),
    utilNew: num(c.utilFee.preferential.amountNewRub),
    utilOld: num(c.utilFee.preferential.amountOldRub),
    feeMin: num(c.customsFee.scale[0].feeRub),
    feeMax: num(c.customsFee.scale.at(-1).feeRub),
    vlDays: rng(vl.timing.totalAfterArrivalDays),
    declDays: rng(vl.timing.customsReleaseDays),
    docsDays: rng(vl.timing.sbktsEptsDays),
    bundleRange: rng(vl.itemsRub.bundleRange, (x) => Math.round(x / 1000)),
    seaDays: rng(c.costs.japan.transit.seaDays),
    jpWeeks: rng(c.costs.japan.transit.auctionToVladivostokWeeks),
    krWeeks: rng(c.costs.korea.transit.purchaseToVladivostokWeeks),
    cnWeeks: rng(c.costs.china.transit.paymentToUssuriyskWeeks),
    jpCnfMin: Math.min(...cnf),
    jpCnfMax: Math.max(...cnf),
    evDuty: Math.round(c.stp.dutyPct * 100),
    vat: Math.round(c.stp.vatPct * 100),
    markupRange: `${Math.min(...mk)}-${Math.max(...mk)}`,
    fullUtil12New: num(Math.round(full12[0] * base)),
    fullUtil12Old: num(Math.round(full12[1] * base)),
  });
}

const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
function deepFill(x, v) {
  if (typeof x === 'string') return fill(x, v);
  if (Array.isArray(x)) return x.map((y) => deepFill(y, v));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, deepFill(y, v)]));
  return x;
}

// --- общие блоки ---------------------------------------------------------------------------------------

const two = (n) => String(n).padStart(2, '0');
// цена «от … под ключ» — только по автомобилям с полным расчетом (без priceIsPartial: там цена без утильсбора)
const minPrice = (cars) => { const p = cars.filter((c) => !c.priceIsPartial).map((c) => c.priceRub).filter(Boolean); return p.length ? Math.min(...p) : null; };
// подписи из данных понижаем только в первой букве: «Стоимость до Владивостока» → «стоимость до Владивостока»
const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// легкая типографика для текстов, взятых с сайта заказчика дословно: тире в диапазонах, неразрывный пробел в числах
const dash = (s) => String(s).replace(/(\d)-(\d)/g, '$1-$2').replace(/([A-Za-zА-Яа-я])-(\d)/g, '$1-$2').replace(/(\d) (\d{3})(?!\d)/g, '$1\u00A0$2');

/** Темная шапка услуги с фото. Композиция одна: текст слева, объект справа; kind (render | frame) задает только обработку фона в 61-services.css */
function head(ctx, s, c, crumbs) {
  const h = HEAD[s.slug];
  const actions =
    btn(c.head.cta, R.contacts, { variant: 'light', modal: 'request', subject: c.cta.subject, attrs: { 'data-modal-title': c.head.modalTitle, 'data-modal-text': c.head.modalText, 'data-modal-label': s.navName || s.name } }) +
    btn('Рассчитать стоимость', R.calculator, { variant: 'ghost', arrow: false });
  return html`
    <div class="svc-head svc-head--${h.kind} svc-head--${s.slug}">
      ${pageHead({
        crumbs,
        label: c.label,
        h1: duo(c.h1Parts[0], c.h1Parts[1]),
        lead: c.lead,
        kv: c.kv,
        actions,
        photo: h.photo,
        photoAlt: h.alt,
        single: true,
      })}
    </div>`;
}

/** Нумерованные строки-«таблица»: номер, заголовок, пояснение */
function rows(items, { tag = 'h3', cls = '' } = {}) {
  return html`
          <ol class="svc-rows ${cls}">
            ${items.map(
              (it, i) => html`
            <li class="svc-row"${reveal(Math.min(i, 5))}>
              <span class="svc-row__num">${two(i + 1)}</span>
              <${tag} class="svc-row__title">${typo(it.title || it.k)}</${tag}>
              <p class="svc-row__text">${typo(it.text || it.v)}</p>
            </li>`
            )}
          </ol>`;
}

/** Темная плитка-призыв в конце сетки карточек */
function promoTile({ label: lbl, title, text, action, i = 3 }) {
  return html`
          <article class="svc-promo on-dark"${reveal(i)}>
            ${label(lbl)}
            <div>
              <h3 class="svc-promo__title">${typo(title)}</h3>
              <p>${typo(text)}</p>
              ${action}
            </div>
          </article>`;
}

/** Полоса коротких фактов под блоком */
function strip(items) {
  return html`
        <dl class="svc-strip">
          ${items.map((x, i) => `<div class="svc-strip__item"${reveal(i)}><dt>${esc(x.value)}</dt><dd>${typo(x.text)}</dd></div>`)}
        </dl>`;
}

function stepsSection(b, { cls = '', layout = 'grid3', foot = '', actions = '' } = {}) {
  const cards = b.items.map((s, i) => step(s, i, { light: true }));
  const body =
    layout === 'rail'
      ? rail(cards, { col: 'minmax(300px, 27%)', colMobile: 'minmax(270px, 82%)' })
      : `<div class="${layout === 'five' ? 'svc-steps' : layout === 'four' ? 'grid grid--4 svc-stepgrid' : 'grid grid--3 svc-stepgrid'}">${cards.join('')}</div>`;
  return html`
    <section class="section ${cls}" id="kak-eto-rabotaet">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead, aside: layout === 'rail' ? railNav() : '', actions })}
        ${body}
        ${foot}
      </div>
    </section>`;
}

function casesSection(ctx, b, list, { cls = '', foot = '' } = {}) {
  if (!list.length) return '';
  return html`
    <section class="section ${cls}" id="privezennye-avto">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead, aside: list.length > 4 ? railNav() : '', actions: more('Все привезенные авто', R.cases) })}
        ${rail(list.map((x, i) => caseCard(x, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
        ${foot}
      </div>
    </section>`;
}

const pickReviews = (ctx, authors = []) => authors.map((a) => ctx.reviews.find((r) => r.author === a)).filter(Boolean);

function reviewsSection(ctx, b, { cls = 'section--white', rating = false, after = '' } = {}) {
  const list = pickReviews(ctx, b.authors);
  if (!list.length) return '';
  const { site } = ctx;
  const aside = rating
    ? html`<div class="rating">
            <div class="rating__value">5,0</div>
            <div class="rating__meta">${stars(5)}<span>оценка в каждом из ${site.rating.count} отзывов:<br>${site.rating.twoGisCount} в 2ГИС, ${site.rating.count - site.rating.twoGisCount} на Яндекс Картах</span></div>
          </div>`
    : '';
  return html`
    <section class="section ${cls}" id="otzyvy">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead, aside, actions: more('Все отзывы', R.reviews) })}
        <div class="grid grid--3">
          ${list.map((r, i) => reviewCard(r, { i }))}
        </div>
        ${after}
      </div>
    </section>`;
}

function faqSection(ctx, s, c, { cls = 'section--white' } = {}) {
  const t = (s && FAQ_TITLE[s.slug]) || ['Частые', 'вопросы'];
  const topic = s ? s.navName || s.name : 'Услуги';
  return html`
    <section class="section ${cls}" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${duo(t[0], t[1])}</h2>
            <p class="lead">${typo('Не нашли ответ? Спросите менеджера: ответим в рабочее время.')}</p>
            ${btn('Задать вопрос', R.contacts, { variant: 'dark', modal: 'request', subject: `Вопрос: ${topic}`, attrs: { 'data-modal-title': 'Задайте вопрос менеджеру', 'data-modal-text': 'Оставьте контакты, и мы перезвоним или напишем в мессенджер в рабочее время.' } })}
          </div>
          <div class="split__body">${faqList(c.faq)}</div>
        </div>
      </div>
    </section>`;
}

/** Перелинковка: остальные услуги, каталог, доставка, полезное */
function crossLinks(ctx, s, { cls = 'section--white' } = {}) {
  const others = ctx.services.filter((x) => x.slug !== s?.slug);
  const catalog = [
    ...ctx.nav.countries.map((cn) => ({ name: `Авто ${cn.from}`, url: cn.url, count: cn.count || undefined })),
    ...ctx.selections.filter((x) => x.count > 0).slice(0, 8).map((x) => ({ name: x.name, url: x.url })),
    { name: 'Весь каталог', url: R.catalog },
  ];
  const cities = [...ctx.cities.slice(0, 12).map((x) => ({ name: x.name, url: x.url })), { name: 'Все города', url: R.delivery }];
  const useful = [
    { name: 'Калькулятор стоимости', url: R.calculator },
    ...(R.howTo ? [{ name: 'Как заказать автомобиль', url: R.howTo }] : []),
    { name: 'Как читать аукционный лист', url: R.auctionSheet },
    { name: 'Привезенные авто', url: R.cases },
    { name: 'Отзывы клиентов', url: R.reviews },
    { name: 'Вопросы и ответы', url: R.faq },
    { name: 'О компании', url: R.about },
    { name: 'Контакты', url: R.contacts },
  ];
  const posts = (POSTS[s ? s.slug : 'hub'] || [])
    .map((slug) => (ctx.posts || []).find((p) => p.slug === slug))
    .filter(Boolean)
    .map((p) => ({ name: p.short || p.title, url: p.url }));
  if (posts.length) posts.push({ name: 'Все статьи', url: R.blog });
  return html`
    <section class="section section--sm ${cls}">
      <div class="container">
        ${s
          ? html`
        <div class="linkblock">
          <h2 class="h4">Другие услуги</h2>
          <div class="tiles svc-others">
            ${others.map(
              (x, i) => html`
            <a class="tile" href="${u(x.url)}"${reveal(Math.min(i, 4))}>
              <span class="tile__name">${esc(x.navName || x.name)}</span>
              <span class="tile__meta"><span>${esc(x.label)}</span>${icon('arrow')}</span>
            </a>`
            )}
            <a class="tile svc-tile-calc" href="${u(R.calculator)}"${reveal(4)}>
              <span class="tile__name">Калькулятор</span>
              <span class="tile__meta"><span>Цена под ключ</span>${icon('arrow')}</span>
            </a>
          </div>
        </div>`
          : ''}
        ${linkBlock('Каталог автомобилей', catalog, { tag: s ? 'h3' : 'h2' })}
        ${linkBlock('Доставка по России', cities, { tag: s ? 'h3' : 'h2' })}
        ${linkBlock('Полезное', useful, { tag: s ? 'h3' : 'h2' })}
        ${linkBlock('Статьи по теме', posts, { tag: s ? 'h3' : 'h2' })}
      </div>
    </section>`;
}

function cta(ctx, s, c) {
  const x = c.cta;
  return ctaBand(ctx, {
    label: s ? s.navName || s.name : 'Заявка',
    title: duo(x.title[0], x.title[1]),
    text: x.text,
    subject: x.subject,
    bg: s ? CTA_BG[s.slug] : HUB_CTA_BG,
    fields: x.fields || ['name', 'phone', 'car'],
    cta: x.cta || 'Получить расчет',
    panelTitle: x.panelTitle || 'Рассчитаем авто под ключ',
    panelText: x.panelText || 'Ответим в рабочее время, пришлем варианты и полный расчет.',
  });
}

// --- авто под заказ ----------------------------------------------------------------------------------------

function introSplit(ctx, c, { extra = '' } = {}) {
  const b = c.intro;
  return html`
    <section class="section" id="sut-uslugi">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(b.label)}
            <h2>${duo(b.title[0], b.title[1])}</h2>
            ${b.lead ? `<p class="lead">${typo(b.lead)}</p>` : ''}
          </div>
          <div class="split__body svc-stack">
            <div class="prose"${reveal(1)}>${ctx.md(b.body)}</div>
            ${b.forWhom
              ? html`
            <div>
              <h3 class="h4 svc-sub">${esc(b.forWhomTitle || 'Кому подходит')}</h3>
              ${rows(b.forWhom, { tag: 'h4' })}
            </div>`
              : ''}
            ${extra}
          </div>
        </div>
      </div>
    </section>`;
}

function includesBento(ctx, s, c) {
  const b = c.includes;
  const f = b.feature;
  return html`
    <section class="section section--white" id="chto-vhodit">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="svc-bento">
          <article class="svc-feature on-dark"${reveal()}>
            <div class="svc-feature__bg">${img({ src: 'assets/' + s.image, alt: '', sizes: '(max-width: 1000px) 100vw, 42vw' })}</div>
            ${label(f.label)}
            <div class="svc-feature__body">
              <h3 class="svc-feature__title">${typo(f.title)}</h3>
              <p>${typo(f.text)}</p>
              ${ticks(f.ticks)}
            </div>
          </article>
          <div class="grid grid--2">
            ${b.items.map((x, i) => card({ icon: x.icon, title: x.title, text: x.text, i: (i % 2) + 1 }))}
          </div>
        </div>
      </div>
    </section>`;
}

function marketsSection(ctx, c) {
  const b = c.markets;
  return html`
    <section class="section section--dark" id="strany">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead, actions: more('Весь каталог', R.catalog) })}
        <div class="grid grid--3">
          ${ctx.nav.countries.map((cn, i) => {
            const m = b.items[cn.slug];
            if (!m) return '';
            const from = minPrice(ctx.cars.filter((x) => x.country === cn.slug));
            return html`
          <article class="svc-market"${reveal(i)}>
            <div class="svc-market__top">${label(`${cn.code} · ${m.source}`)}<span class="svc-market__steer">${esc(cn.steering)}</span></div>
            <h3 class="svc-market__title"><a href="${u(cn.url)}">Авто ${esc(cn.from)}</a></h3>
            <ul class="svc-market__list">${m.points.map((p) => `<li>${typo(p)}</li>`)}</ul>
            <div class="svc-market__foot">
              <div><b>${from ? `от ${priceShort(from)}` : 'Цена по запросу'}</b><small>под ключ во Владивостоке</small></div>
              <span class="svc-market__go" aria-hidden="true">${icon('arrow')}</span>
            </div>
          </article>`;
          })}
        </div>
        <div class="u-mt-5">${note(typo(b.note))}</div>
      </div>
    </section>`;
}

function renderOrder(ctx, s, c, crumbs) {
  const cases = ctx.cases.filter((x) => x.price).slice(0, 10);
  return [
    head(ctx, s, c, crumbs),
    introSplit(ctx, c),
    includesBento(ctx, s, c),
    marketsSection(ctx, c),
    stepsSection(c.steps, { layout: 'grid3', actions: R.howTo ? more('Подробная инструкция: как заказать автомобиль', R.howTo) : '' }),
    priceParts({ white: true }),
    casesSection(ctx, c.proof, cases, { foot: strip(c.proof.strip) }),
    reviewsSection(ctx, c.reviews, { cls: 'section--white', rating: true }),
    faqSection(ctx, s, c, { cls: '' }),
    crossLinks(ctx, s, { cls: 'section--white' }),
    cta(ctx, s, c),
  ].join('\n');
}

// --- аукционы Японии -----------------------------------------------------------------------------------------

function auctionIntro(ctx, c) {
  const b = c.intro;
  const codes = ctx.source.auctionSheetGuide?.highlights || [];
  return html`
    <section class="section" id="sut-uslugi">
      <div class="container">
        <div class="split split--even svc-gap">
          <div${reveal()}>
            ${label(b.label)}
            <h2 class="u-mt-5">${duo(b.title[0], b.title[1])}</h2>
            <div class="prose u-mt-6">${ctx.md(b.body)}</div>
            <div class="u-mt-6">${more(b.more, R.auctionSheet)}</div>
          </div>
          <div class="svc-codes"${reveal(1)}>
            <h3 class="h4 svc-sub">${esc(b.codesTitle)}</h3>
            ${codes.map((x, i) => `<div class="svc-code${i === codes.length - 1 ? ' svc-code--dark on-dark' : ''}"><b>${esc(dash(x.code))}</b><span>${typo(x.meaning)}</span></div>`)}
          </div>
        </div>
      </div>
    </section>`;
}

function auctionIncludes(c) {
  const b = c.includes;
  return html`
    <section class="section section--white" id="chto-vhodit">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        ${rows(b.items, { cls: 'svc-rows--wide' })}
      </div>
    </section>`;
}

function auctionHow(c) {
  const b = c.how;
  const list = (items, name) => `<ul>${items.map((t) => `<li>${icon(name)}<span>${typo(t)}</span></li>`).join('')}</ul>`;
  return html`
    <section class="section section--dark" id="kak-ustroeny-torgi">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="grid grid--4 svc-cards">
          ${b.items.map((x, i) => card({ label: two(i + 1), title: x.title, text: x.text, tall: true, i }))}
        </div>
        <div class="svc-allow">
          <div class="svc-allow__col svc-allow__col--yes"${reveal()}>
            <h3>${esc(b.allowedTitle)}</h3>
            ${list(b.allowed, 'check')}
          </div>
          <div class="svc-allow__col svc-allow__col--yes"${reveal(1)}>
            <h3>${esc(b.checkTitle)}</h3>
            ${list(b.check, 'check')}
          </div>
        </div>
        <div class="u-mt-5">${note(typo(b.note))}</div>
      </div>
    </section>`;
}

function gradesSection(ctx, c) {
  const b = c.grades;
  const guide = ctx.source.auctionSheetGuide;
  const sections = guide?.sections || [];
  const condition = sections.find((x) => x.anchor === 'condition')?.items || [];
  const salon = sections.find((x) => x.eyebrow === 'салон')?.items || [];
  if (!condition.length) return '';
  const byCode = Object.fromEntries(condition.map((x) => [x.code, x.meaning]));
  return html`
    <section class="section" id="ocenki">
      <div class="container">
        ${sectionHead({
          label: b.label,
          title: duo(b.title[0], b.title[1]),
          lead: b.lead,
          actions:
            btn(b.cta, R.contacts, { variant: 'dark', modal: 'request', subject: 'Расшифровка аукционного листа', attrs: { 'data-modal-title': 'Расшифруем аукционный лист', 'data-modal-text': 'Оставьте контакты: менеджер попросит прислать лист в мессенджер и объяснит каждую отметку.' } }) + more(b.more, R.auctionSheet),
        })}
        <div class="svc-grades">
          ${b.groups.map(
            (g, i) => html`
          <article class="svc-grade${i === b.groups.length - 1 ? ' svc-grade--risk on-dark' : ''}"${reveal(i)}>
            <div class="svc-grade__head">
              <span class="svc-grade__range">${esc(g.codes[0])}…${esc(g.codes.at(-1))}</span>
              <h3>${typo(g.title)}</h3>
              <p>${typo(g.text)}</p>
            </div>
            <dl class="svc-grade__list">
              ${g.codes.filter((k) => byCode[k]).map((k) => `<div><dt>${esc(k)}</dt><dd>${typo(dash(byCode[k]))}</dd></div>`)}
            </dl>
          </article>`
          )}
        </div>
        ${salon.length
          ? html`
        <div class="svc-salon"${reveal()}>
          <div class="svc-salon__head">
            <h3 class="h4">${esc(b.salonTitle)}</h3>
            <p>${typo(b.salonLead)}</p>
          </div>
          ${salon.map((x) => `<div class="svc-salon__cell"><b>${esc(x.code)}</b><span>${typo(x.meaning)}</span></div>`)}
        </div>`
          : ''}
      </div>
    </section>`;
}

/** Карточка лота: кейс с аукционной оценкой на фото */
function lotCard(c, i) {
  const grade = c.specs['Аукционная оценка'] || c.specs['Общая оценка'];
  const list = [['Год', c.specs['Год выпуска']], ['Пробег', c.specs['Пробег']], ['Двигатель', c.specs['Двигатель']], ['Привод', c.specs['Привод']]].filter(([, v]) => v).slice(0, 3);
  return html`
          <article class="case case--stack lot"${reveal(Math.min(i, 5))}>
            <div class="case__media">
              ${img({ src: c.image, alt: `${c.name}, аукционная оценка ${grade}`, sizes: '(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw', attrs: c.imageFocus ? { style: `object-position:${c.imageFocus}` } : {} })}
              <span class="status ${c.statusCls}">${esc(c.statusLabel)}</span>
              <span class="lot__grade"><b>${esc(grade)}</b>оценка</span>
            </div>
            <div class="case__body">
              ${route(['Аукцион', 'Владивосток', c.clientCity && c.clientCity !== 'Владивосток' ? c.clientCity : null])}
              <h3 class="case__title"><a href="${u(c.url)}">${esc(c.name)}</a></h3>
              <dl class="case__list">${list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
              <div class="case__foot">
                ${c.price ? `<div class="case__price">${price(c.price)}<small>${esc(lcFirst(c.priceLabel || 'Стоимость'))}</small></div>` : `<div class="case__price"><small>${esc(c.statusLabel)}</small></div>`}
                <span class="car__go" aria-hidden="true">${icon('arrow')}</span>
              </div>
            </div>
          </article>`;
}

function lotsSection(ctx, c) {
  const b = c.proof;
  // кейс Mercedes-Benz CLA не показываем: в исходных данных оценка в тексте и на фото-коллаже расходится
  const lots = ctx.cases.filter((x) => (x.specs?.['Аукционная оценка'] || x.specs?.['Общая оценка']) && !/CLA/.test(x.name)).slice(0, 3);
  if (!lots.length) return '';
  const japan = ctx.countryBySlug.japan;
  // срезы каталога Японии: «Авто из Японии до 160 л.с.» и т. п.
  const slices = (typeof ctx.slicesOf === 'function' ? ctx.slicesOf('japan') : []).slice(0, 8).map((x) => ({ name: x.h1, url: x.url, count: x.count }));
  return html`
    <section class="section" id="loty">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead, actions: more('Все привезенные авто', R.cases) })}
        <div class="grid grid--4">
          ${lots.map((x, i) => lotCard(x, i))}
          ${promoTile({
            label: 'Подбор лотов',
            title: b.promoTitle,
            text: b.promoText,
            action: btn('Подобрать лоты', R.contacts, { variant: 'light', modal: 'request', subject: c.cta.subject, attrs: { 'data-modal-title': c.head.modalTitle, 'data-modal-text': c.head.modalText } }),
            i: lots.length,
          })}
        </div>
        <div class="section-foot">
          <p class="muted" style="max-width:56ch">${typo('В каталоге собраны примеры лотов с японских аукционов с расчетом цены во Владивостоке.')}</p>
          ${btn(`Каталог авто ${japan?.from || 'из Японии'}`, R.country('japan'), { variant: 'dark' })}
        </div>
        ${slices.length ? `<div class="u-mt-5">${chips(slices)}</div>` : ''}
      </div>
    </section>`;
}

function renderAuctions(ctx, s, c, crumbs) {
  return [
    head(ctx, s, c, crumbs),
    auctionIntro(ctx, c),
    auctionIncludes(c),
    auctionHow(c),
    gradesSection(ctx, c),
    stepsSection(c.steps, { cls: 'section--white', layout: 'rail', foot: strip(c.strip) }),
    lotsSection(ctx, c),
    reviewsSection(ctx, c.reviews, { cls: 'section--white' }),
    faqSection(ctx, s, c, { cls: '' }),
    crossLinks(ctx, s, { cls: 'section--white' }),
    cta(ctx, s, c),
  ].join('\n');
}

// --- таможенное оформление ----------------------------------------------------------------------------------------

function customsIntro(ctx, c) {
  const b = c.intro;
  return html`
    <section class="section" id="sut-uslugi">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]) })}
        <div class="svc-cols">
          <div${reveal()}>
            <h3 class="h4 svc-sub">${esc(b.forWhomTitle)}</h3>
            ${rows(b.forWhom, { tag: 'h4', cls: 'svc-rows--stack' })}
          </div>
          <div class="prose"${reveal(1)}>${ctx.md(b.body)}</div>
        </div>
      </div>
    </section>`;
}

function customsIncludes(ctx, s, c) {
  const b = c.includes;
  return html`
    <section class="section section--white" id="chto-vhodit">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="svc-docs">
          <article class="svc-docs__card svc-docs__card--dark on-dark"${reveal()}>
            <div class="svc-docs__bg">${img({ src: 'assets/' + s.image, alt: '', sizes: '(max-width: 1000px) 100vw, 42vw' })}</div>
            <h3 class="svc-docs__title">${esc(b.doTitle)}</h3>
            ${ticks(b.do)}
          </article>
          <article class="svc-docs__card"${reveal(1)}>
            <h3 class="svc-docs__title">${esc(b.getTitle)}</h3>
            ${rows(b.get, { tag: 'h4' })}
          </article>
        </div>
      </div>
    </section>`;
}

function watchSection(c) {
  const b = c.watch;
  return html`
    <section class="section section--dark" id="chto-vliyaet">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="grid grid--4">
          ${b.items.map((x, i) => fact({ ...x, i }))}
        </div>
      </div>
    </section>`;
}

function ratesSection(ctx, c) {
  const b = c.rates;
  const k = ctx.calc;
  if (!k) return '';
  const year = k.rates.default.slice(0, 4);
  const base = k.utilFee.baseRateRub;
  const eur = (n) => `${dec(n, 1)} €`;
  const span = (list, i, unit, f = num) => (list[i].max === null ? `свыше ${f(list[i - 1].max)} ${unit}` : i === 0 ? `до ${f(list[i].max)} ${unit}` : `${f(list[i - 1].max + (unit === 'см³' ? 1 : 0))}-${f(list[i].max)} ${unit}`);

  const used = k.ets['3to5'].map((x) => ({ max: x.maxCc, v: x.eurPerCc }));
  const usedT = table(['Объем двигателя', '3-5 лет', 'Старше 5 лет'], used.map((x, i) => [span(used, i, 'см³'), eur(x.v), eur(k.ets.gt5[i].eurPerCc)]), { numCols: [1, 2] });

  const fresh = k.ets.le3.map((x) => ({ max: x.maxValueEur, pct: x.pct, min: x.minEurPerCc }));
  const freshT = table(['Стоимость автомобиля', 'Ставка', 'Минимум за 1 см³'], fresh.map((x, i) => [span(fresh, i, '€'), `${Math.round(x.pct * 100)}%`, eur(x.min)]), { numCols: [1, 2] });

  const ice = k.utilFee.personal.ice;
  const pref = k.utilFee.preferential;
  const coef = (vol, idx) => ice[vol][year][idx].map((x) => price(Math.round(x * base)));
  const utilT = table(
    ['Мощность и объем двигателя', 'До 3 лет', 'Старше 3 лет'],
    [
      [`<strong>до 160 л.с.</strong>, до 3,0 л`, `<strong>${price(pref.amountNewRub)}</strong>`, `<strong>${price(pref.amountOldRub)}</strong>`],
      ['160-190 л.с., 1,0-2,0 л', ...coef('1001_2000', 4)],
      ['190-220 л.с., 1,0-2,0 л', ...coef('1001_2000', 5)],
      ['160-190 л.с., 2,0-3,0 л', ...coef('2001_3000', 4)],
      ['190-220 л.с., 2,0-3,0 л', ...coef('2001_3000', 5)],
    ],
    { numCols: [1, 2] }
  );

  const fee = k.customsFee.scale.map((x) => ({ max: x.maxValueRub, v: x.feeRub }));
  const feeT = table(['Таможенная стоимость', 'Сбор'], fee.map((x, i) => [span(fee, i, '₽'), price(x.v)]), { numCols: [1] });

  const ex = k.stp.exciseRubPerHp[year].map((x) => ({ max: x.maxHp, v: x.rate }));
  const evT = table(['Мощность (30-минутная)', 'Акциз за 1 л.с.'], ex.map((x, i) => [span(ex, i, 'л.с.'), x.v ? price(x.v) : 'не взимается']), { numCols: [1] });

  const tabs = Object.entries(b.tabs);
  const cap = (title, text) => `<div class="svc-table__cap"><h3>${esc(title)}</h3><p>${typo(text)}</p></div>`;
  const panels = {
    duty: html`
          <div class="svc-tables">
            <div class="svc-table">${cap('Автомобили 3-5 лет и старше', b.dutyUsed)}${usedT}</div>
            <div class="svc-table">${cap('Автомобили до 3 лет', b.dutyNew)}${freshT}</div>
          </div>`,
    util: html`
          <div class="svc-tables svc-tables--aside">
            <div class="svc-table">${cap('Утилизационный сбор', b.util)}${utilT}</div>
            <div class="svc-aside">${note(typo(b.utilNote), { warn: true })}<div class="u-mt-5">${chips([{ name: 'Авто до 160 л.с.', url: selUrl(ctx, 'do-160-ls') }, { name: 'Проходные 3-5 лет', url: selUrl(ctx, 'prohodnye-avto') }])}</div></div>
          </div>`,
    fee: html`
          <div class="svc-tables svc-tables--aside">
            <div class="svc-table">${cap('Сбор за таможенные операции', b.fee)}${feeT}</div>
            <div class="svc-aside">${note(typo(b.feeNote))}</div>
          </div>`,
    ev: html`
          <div class="svc-tables svc-tables--aside">
            <div class="svc-table">${cap('Электромобили и последовательные гибриды', b.ev)}${evT}</div>
            <div class="svc-aside">${note(typo(b.evNote))}<div class="u-mt-5">${chips([{ name: 'Электромобили в каталоге', url: selUrl(ctx, 'elektromobili') }])}</div></div>
          </div>`,
  };
  return html`
    <section class="section" id="stavki" data-tabs-scope>
      <div class="container">
        ${sectionHead({
          label: b.label,
          title: duo(b.title[0], b.title[1]),
          lead: b.lead,
          aside: html`<div class="tabs" role="tablist" aria-label="Вид платежа" data-tabs>
            ${tabs.map(([key, name], i) => `<button class="tabs__btn" type="button" role="tab" id="stavki-tab-${key}" aria-controls="stavki-panel-${key}" aria-selected="${i === 0}" data-tab="${key}"${i ? ' tabindex="-1"' : ''}>${esc(name)}</button>`)}
          </div>`,
        })}
        ${tabs.map(([key], i) => `<div role="tabpanel" id="stavki-panel-${key}" aria-labelledby="stavki-tab-${key}" data-tab-panel="${key}"${i ? ' hidden' : ''}>${panels[key]}</div>`)}
        <div class="section-foot">
          <p class="muted small" style="max-width:64ch">${typo(b.footnote)}</p>
          ${btn(b.cta, R.calculator, { variant: 'dark' })}
        </div>
      </div>
    </section>`;
}

function renderCustoms(ctx, s, c, crumbs) {
  const withCustoms = ctx.cases.filter((x) => (x.priceIncludes || []).some((p) => /тамож/i.test(p))).slice(0, 3);
  const proof = withCustoms.length
    ? html`
        <div class="svc-after">
          <h3 class="h4 svc-sub">${typo(c.proof.title)}</h3>
          <div class="grid grid--4">
            ${withCustoms.map((x, i) => caseCard(x, { i, stack: true, tag: 'h4' }))}
            ${promoTile({
              label: 'Калькулятор',
              title: c.proof.promoTitle,
              text: c.proof.promoText,
              action: btn('Открыть калькулятор', R.calculator, { variant: 'light' }),
              i: withCustoms.length,
            })}
          </div>
        </div>`
    : '';
  return [
    head(ctx, s, c, crumbs),
    customsIntro(ctx, c),
    customsIncludes(ctx, s, c),
    watchSection(c),
    ratesSection(ctx, c),
    stepsSection(c.steps, { cls: 'section--white', layout: 'five' }),
    reviewsSection(ctx, c.reviews, { cls: '', after: proof }),
    faqSection(ctx, s, c, { cls: 'section--white' }),
    crossLinks(ctx, s, { cls: '' }),
    cta(ctx, s, c),
  ].join('\n');
}

// --- платежный агент ---------------------------------------------------------------------------------------------------

function payIntro(ctx, c) {
  const b = c.intro;
  return html`
    <section class="section" id="sut-uslugi">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), layout: 'stack' })}
        <div class="svc-cols svc-cols--rev">
          <div class="prose"${reveal()}>${ctx.md(b.body)}</div>
          <ul class="svc-points">
            ${b.points.map((x, i) => `<li class="svc-point"${reveal(i + 1)}>${icon('check')}<h3>${typo(x.title)}</h3><p>${typo(x.text)}</p></li>`)}
          </ul>
        </div>
      </div>
    </section>`;
}

function flowSection(c) {
  const b = c.flow;
  return html`
    <section class="section section--dark" id="marshrut-platezha">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <ol class="svc-flow">
          ${b.nodes.map(
            (x, i) => html`
          <li class="svc-flow__node"${reveal(i)}>
            <span class="svc-flow__num">Звено ${two(i + 1)}</span>
            <h3 class="svc-flow__title">${typo(x.title)}</h3>
            <p class="svc-flow__text">${typo(x.text)}</p>
            <div class="svc-flow__doc">${icon('doc-check')}<div><span>Документ</span>${esc(x.doc)}</div></div>
          </li>`
          )}
        </ol>
      </div>
    </section>`;
}

function payBenefits(c) {
  const b = c.benefits;
  const icons = ['shield', 'doc', 'doc-check', 'users'];
  return html`
    <section class="section section--white" id="chto-vhodit">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(b.label)}
            <h2>${duo(b.title[0], b.title[1])}</h2>
            <p class="lead">${typo(b.lead)}</p>
            ${more('Таможенный брокер', R.service('tamozhennoe-oformlenie'))}
          </div>
          <div class="split__body grid grid--2 svc-cards">
            ${b.items.map((x, i) => card({ icon: icons[i % icons.length], title: x.title, text: x.text, tall: true, i: i % 2 }))}
          </div>
        </div>
      </div>
    </section>`;
}

function fxSection(ctx, c) {
  const b = c.rates;
  const k = ctx.calc;
  if (!k) return '';
  const r = k.rates.cbr[k.rates.default];
  const list = [
    ['JPY', '100 японских иен', r.JPY * 100],
    ['KRW', '1 000 корейских вон', r.KRW * 1000],
    ['CNY', '1 китайский юань', r.CNY],
    ['USD', '1 доллар США', r.USD],
    ['EUR', '1 евро', r.EUR],
  ];
  return html`
    <section class="section" id="kurs">
      <div class="container">
        <div class="split split--even svc-gap">
          <div${reveal()}>
            ${label(b.label)}
            <h2 class="u-mt-5">${duo(b.title[0], b.title[1])}</h2>
            <div class="prose u-mt-6">${ctx.md(b.body)}</div>
          </div>
          <div${reveal(1)}>
            <h3 class="h4 svc-sub">${esc(b.tableTitle)}</h3>
            <dl class="svc-fx">
              ${list.map(([code, name, val]) => `<div class="svc-fx__row"><dt><span class="svc-fx__code">${code}</span>${esc(name)}</dt><dd>${dec(val, 2)}&nbsp;₽</dd></div>`)}
            </dl>
            <p class="muted small u-mt-4">${typo(b.note)}</p>
          </div>
        </div>
      </div>
    </section>`;
}

function quoteSection(ctx, c) {
  const q = c.quote;
  const r = ctx.reviews.find((x) => x.author === q?.author);
  if (!r || !r.text.includes(q.text.slice(0, 40))) return '';
  return html`
    <section class="section" id="otzyvy">
      <div class="container">
        <figure class="svc-quote"${reveal()}>
          <div class="svc-quote__aside">
            ${label('Отзыв клиента')}
            <div class="rating">
              <div class="rating__value">5,0</div>
              <div class="rating__meta">${stars(5)}<span>оценка в каждом из ${ctx.site.rating.count} отзывов<br>из 2ГИС и Яндекс Карт</span></div>
            </div>
          </div>
          <div>
            <blockquote><p>«${esc(q.text)}»</p></blockquote>
            <figcaption class="svc-quote__by">
              <span class="review__avatar" aria-hidden="true">${esc(r.author.trim()[0].toUpperCase())}</span>
              <span><b>${esc(r.author)}</b><br><span class="muted small">фрагмент отзыва в ${esc(r.source)}</span></span>
              <span class="svc-quote__links">${r.url ? `<a class="link" href="${esc(r.url)}" target="_blank" rel="noopener nofollow">Читать полностью</a>` : ''}${more('Все отзывы', R.reviews)}</span>
            </figcaption>
          </div>
        </figure>
      </div>
    </section>`;
}

function renderPayments(ctx, s, c, crumbs) {
  return [
    head(ctx, s, c, crumbs),
    payIntro(ctx, c),
    flowSection(c),
    payBenefits(c),
    fxSection(ctx, c),
    stepsSection(c.steps, { cls: 'section--white', layout: 'four' }),
    quoteSection(ctx, c),
    faqSection(ctx, s, c, { cls: 'section--white' }),
    crossLinks(ctx, s, { cls: '' }),
    cta(ctx, s, c),
  ].join('\n');
}

// --- автокредит -----------------------------------------------------------------------------------------------------------------

function creditBanner(ctx, c) {
  const credit = ctx.source.credit;
  const b = c.intro;
  const leadWords = credit.banner.lead.split(' ');
  return html`
    <section class="section section--sm" id="sut-uslugi">
      <div class="container">
        <div class="credit svc-credit"${reveal()}>
          <div class="credit__bg">${img({ src: credit.banner.images.desktop, alt: credit.banner.imageAlt, sizes: '100vw' })}</div>
          <div class="credit__copy">
            ${label(b.label)}
            <h2>${duo(leadWords.slice(0, 3).join(' '), leadWords.slice(3).join(' '))}</h2>
            <p>${typo(credit.banner.text)}</p>
            <p>${typo(b.more)}</p>
            <div class="credit__foot">
              ${btn(c.head.cta, R.contacts, { variant: 'primary', modal: 'request', subject: 'Автокредит', attrs: { 'data-modal-title': c.head.modalTitle, 'data-modal-text': c.head.modalText, 'data-modal-label': 'Автокредит' } })}
              ${more('Посчитать цену под ключ', R.calculator)}
            </div>
          </div>
        </div>
        <dl class="svc-strip svc-strip--tight">
          ${credit.banner.benefits.map((t, i) => `<div class="svc-strip__item"${reveal(i)}><dt>${esc(t)}</dt><dd>${typo(b.benefitTexts[t] || b.benefitTexts[t.replace(/ё/g, 'е')] || '')}</dd></div>`)}
        </dl>
      </div>
    </section>`;
}

function banksSection(ctx, c) {
  const credit = ctx.source.credit;
  const b = c.banks;
  const words = credit.banksBlock.title.split(' ');
  const cut = Math.min(2, words.length - 1);
  const modal = (bank) => ({
    variant: 'dark',
    modal: 'request',
    subject: bank ? `Автокредит: ${bank}` : 'Автокредит',
    attrs: { 'data-modal-title': credit.modal.title, 'data-modal-text': credit.modal.text.replace('{банк}', bank || credit.modal.defaultBank), 'data-modal-label': 'Автокредит' },
  });
  return html`
    <section class="section section--white" id="banki">
      <div class="container">
        ${sectionHead({
          label: b.label,
          title: duo(words.slice(0, cut).join(' '), words.slice(cut).join(' ')),
          lead: credit.banksBlock.texts.at(-1),
          actions: btn(b.any, R.contacts, modal(null)),
        })}
        <div class="svc-banks">
          ${credit.banks.map((x, i) => {
            const name = x.name === 'Сбер Банк' ? 'Сбер' : x.name;
            const m = modal(name);
            return html`
          <article class="bank"${reveal(Math.min(i, 4))}>
            <div class="bank__media">${img({ src: x.image3d, alt: `${name}, банк-партнер Макс Групп`, sizes: '(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 20vw' })}</div>
            <div class="bank__body">
              <span class="bank__logo">${img({ src: x.logo, alt: '', sizes: '120px' })}</span>
              <h3 class="bank__name">${esc(name)}</h3>
              <a class="bank__link" href="${u(R.contacts)}" data-modal="request" data-modal-subject="${esc(m.subject)}" data-modal-title="${esc(m.attrs['data-modal-title'])}" data-modal-text="${esc(m.attrs['data-modal-text'])}" data-modal-label="Автокредит">Заявка в банк ${icon('arrow')}</a>
            </div>
          </article>`;
          })}
        </div>
        <p class="muted small u-mt-5" style="max-width:72ch">${typo(b.lead)}</p>
      </div>
    </section>`;
}

function honestSection(c) {
  const b = c.honest;
  return html`
    <section class="section section--dark" id="usloviya">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="grid grid--3 svc-cards">
          ${b.items.map((x, i) => card({ label: two(i + 1), title: x.title, text: x.text, tall: true, i, foot: x.link ? more(x.link.text, x.link.url) : '' }))}
        </div>
      </div>
    </section>`;
}

function creditCars(ctx, c) {
  const b = c.cars;
  // только автомобили с полной ценой под ключ: у priceIsPartial цена без утильсбора
  const sorted = [...ctx.cars].filter((x) => x.priceRub && !x.priceIsPartial && x.photos.length).sort((x, y) => x.priceRub - y.priceRub);
  if (sorted.length < 4) return '';
  // по одному-два автомобиля из каждой страны, от доступных к более дорогим
  const pick = [];
  for (const cn of ['japan', 'korea', 'china', 'japan', 'korea', 'china']) {
    const next = sorted.find((x) => x.country === cn && !pick.includes(x) && !pick.some((p) => p.modelSlug === x.modelSlug));
    if (next) pick.push(next);
    if (pick.length === 4) break;
  }
  while (pick.length < 4) pick.push(sorted.find((x) => !pick.includes(x)));
  const budgets = ['do-1-5-mln', 'do-2-mln', 'do-3-mln'].map((slug) => ctx.selections.find((x) => x.slug === slug)).filter((x) => x && x.count > 0);
  return html`
    <section class="section section--white" id="katalog">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="grid grid--4">
          ${pick.map((x, i) => carCard(x, { i }))}
        </div>
        <div class="section-foot">
          ${chips([...budgets.map((x) => ({ name: x.name, url: x.url, count: x.count })), ...ctx.nav.countries.map((cn) => ({ name: `Авто ${cn.from}`, url: cn.url }))])}
          ${btn(`Весь каталог: ${ctx.carWord(ctx.cars.length)}`, R.catalog, { variant: 'dark' })}
        </div>
      </div>
    </section>`;
}

function renderCredit(ctx, s, c, crumbs) {
  return [
    head(ctx, s, c, crumbs),
    creditBanner(ctx, c),
    banksSection(ctx, c),
    honestSection(c),
    stepsSection(c.steps, { layout: 'rail' }),
    creditCars(ctx, c),
    faqSection(ctx, s, c, { cls: '' }),
    crossLinks(ctx, s, { cls: 'section--white' }),
    cta(ctx, s, c),
  ].join('\n');
}

// --- хаб /uslugi/ ------------------------------------------------------------------------------------------------------------------

// раскладка плиток хаба: ширина в 12-колоночной сетке
const HUB_SPAN = { 'avto-pod-zakaz': 7, 'aukciony-yaponii': 5, 'tamozhennoe-oformlenie': 5, 'platezhnyj-agent': 7, avtokredit: 12 };
const HUB_ORDER = ['avto-pod-zakaz', 'aukciony-yaponii', 'tamozhennoe-oformlenie', 'platezhnyj-agent', 'avtokredit'];

function hubGrid(ctx, c) {
  const b = c.grid;
  const list = HUB_ORDER.map((slug) => ctx.services.find((x) => x.slug === slug)).filter(Boolean);
  return html`
    <section class="section" id="uslugi">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="svc-grid svc-grid--hub">
          ${list.map((s, i) => {
            const frame = s.slug === 'aukciony-yaponii';
            const light = s.slug === 'avtokredit';
            const src = frame ? HEAD[s.slug].photo : 'assets/' + s.image;
            const tags = c.tags?.[s.slug] || [];
            return html`
          <article class="svc svc--${HUB_SPAN[s.slug] || 6}${light ? ' svc--light' : ' on-dark'}${frame ? ' svc--frame' : ''}"${reveal(i % 2)}>
            <div class="svc__bg">${img({ src, alt: '', sizes: '(max-width: 900px) 100vw, 58vw' })}</div>
            <div class="svc__top">
              ${label(s.label)}
              <span class="svc__arrow" aria-hidden="true">${icon('arrow')}</span>
            </div>
            <div>
              <h3 class="svc__title"><a href="${u(s.url)}">${esc(s.name)}</a></h3>
              <p class="svc__text">${typo(s.short)}</p>
              ${tags.length ? `<ul class="svc__tags">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
            </div>
          </article>`;
          })}
        </div>
      </div>
    </section>`;
}

function stagesSection(ctx, c) {
  const b = c.stages;
  const link = (slug) => {
    if (slug === 'delivery') return more('Доставка по России', R.delivery);
    const s = ctx.services.find((x) => x.slug === slug);
    return s ? more(s.navName || s.name, s.url) : '';
  };
  return html`
    <section class="section section--white" id="etapy">
      <div class="container">
        ${sectionHead({ label: b.label, title: duo(b.title[0], b.title[1]), lead: b.lead })}
        <div class="svc-stages">
          <div class="svc-stages__head" aria-hidden="true">${b.cols.map((x) => `<span class="label label--plain">${esc(x)}</span>`)}</div>
          ${b.rows.map(
            (r, i) => html`
          <article class="svc-stage"${reveal(Math.min(i, 5))}>
            <div class="svc-stage__name"><span>${two(i + 1)}</span><h3>${typo(r.stage)}</h3></div>
            <p data-k="${esc(b.cols[1])}">${typo(r.we)}</p>
            <p data-k="${esc(b.cols[2])}">${typo(r.you)}</p>
            <div class="svc-stage__link">${link(r.service)}</div>
          </article>`
          )}
        </div>
      </div>
    </section>`;
}

function calcSection(c) {
  const b = c.calc;
  return html`
    <section class="section section--dark" id="kalkulyator">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(b.label)}
            <h2>${duo(b.title[0], b.title[1])}</h2>
            <p class="lead">${typo(b.lead)}</p>
            ${btn(b.cta, R.calculator, { variant: 'light' })}
            <p class="small svc-dim">${typo(b.note)}</p>
          </div>
          <div class="split__body grid grid--2">
            ${b.facts.map((f, i) => fact({ ...f, i: i % 2 }))}
          </div>
        </div>
      </div>
    </section>`;
}

function hubPage(ctx, vars) {
  const c = deepFill(ctx.content.servicesHub || {}, vars);
  if (!c.title) return null;
  const crumbs = [HOME, HUB];
  return {
    url: R.services,
    type: 'service',
    title: c.title,
    description: c.description,
    h1: c.h1,
    breadcrumbs: crumbs,
    headerOver: true,
    priority: 0.8,
    ogImage: HUB_PHOTO.replace(/^assets\//, ''),
    jsonld: [itemListLd(ctx.site, 'Услуги Макс Групп', ctx.services.map((s) => ({ url: s.url, name: s.name }))), faqLd(c.faq)].filter(Boolean),
    render: () =>
      [
        html`
    <div class="svc-head svc-head--frame svc-head--hub">
      ${pageHead({
        crumbs,
        label: c.label,
        h1: duo(c.h1Parts[0], c.h1Parts[1]),
        lead: c.lead,
        kv: c.kv,
        single: true,
        actions: btn('Получить консультацию', R.contacts, { variant: 'light', modal: 'request', subject: c.cta.subject }) + btn('Рассчитать стоимость', R.calculator, { variant: 'ghost', arrow: false }),
        photo: HUB_PHOTO,
        photoAlt: 'Автомобиль на Золотом мосту во Владивостоке ночью',
      })}
    </div>`,
        hubGrid(ctx, c),
        stagesSection(ctx, c),
        calcSection(c),
        faqSection(ctx, null, c, { cls: '' }),
        crossLinks(ctx, null, { cls: 'section--white' }),
        cta(ctx, null, c),
      ].join('\n'),
  };
}

// --- сборка страниц ------------------------------------------------------------------------------------------------------------------

const RENDER = {
  'avto-pod-zakaz': renderOrder,
  'aukciony-yaponii': renderAuctions,
  'tamozhennoe-oformlenie': renderCustoms,
  'platezhnyj-agent': renderPayments,
  avtokredit: renderCredit,
};

function servicePage(ctx, s, vars) {
  const raw = ctx.content.services?.[s.slug];
  const render = RENDER[s.slug];
  if (!raw || !render) return null;
  const c = deepFill(raw, vars);
  if (!c.kv && s.slug === 'avtokredit') {
    // факты шапки — дословно с сайта заказчика: «Одобрение от 1 дня», «Банки-партнеры», «Страхование на всех этапах»
    const cr = ctx.source.credit;
    c.kv = [
      { k: 'Одобрение', v: 'от 1 дня' },
      { k: 'Банки-партнеры', v: String(cr.banks.length) },
      { k: 'Страхование', v: 'на всех этапах' },
    ];
  }
  const crumbs = [HOME, HUB, { name: s.navName || s.name, url: s.url }];
  const photo = HEAD[s.slug].photo.replace(/^assets\//, '');
  return {
    url: s.url,
    type: 'service',
    title: c.title,
    description: c.description,
    h1: c.h1,
    breadcrumbs: crumbs,
    headerOver: true,
    priority: 0.8,
    ogImage: photo,
    jsonld: [
      serviceLd(ctx.site, { name: c.h1, description: c.description, url: s.url, serviceType: c.serviceType || s.name, areaServed: c.areaServed }),
      faqLd(c.faq),
      c.steps?.howTo ? howToLd(ctx.site, { name: c.steps.howTo, description: c.steps.lead || c.lead, steps: c.steps.items }) : null,
    ].filter(Boolean),
    render: () => render(ctx, s, c, crumbs),
  };
}

export function servicesPages(ctx) {
  const vars = buildVars(ctx);
  return [hubPage(ctx, vars), ...ctx.services.map((s) => servicePage(ctx, s, vars))].filter(Boolean);
}
