// Привезенные авто: хаб кейсов (/privezennye-avto/) и страница каждого автомобиля клиента.
// Факты — только из data/source/maxgroup.json → cases; тексты — data/content/cases/*.json (общие блоки — _hub.json).
import { html, esc, u, a, abs, img, imgSize, typo, price, priceShort, num, count } from '../lib/core.mjs';
import { faqLd, itemListLd } from '../lib/seo.mjs';
import { icon, stars, label, duo, btn, more, reveal, sectionHead, crumbs, caseCard, faqList, linkBlock, ctaBand, specList, ticks, note, route, rail, railNav } from '../components/ui.mjs';
import { fromShort } from '../components/catalog.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const HUB = { name: 'Привезенные авто', url: R.cases };
const carWord = ['автомобиль', 'автомобиля', 'автомобилей'];

const plain = (s) => String(s).replace(/[  ]/g, ' ');
const fill = (tpl, vars) => String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const tokens = (s) => String(s).toLowerCase().replace(/[^a-z0-9а-яё]+/g, ' ').trim().split(' ').filter(Boolean);
const shortName = (name) => name.replace(/\s+(19|20)\d{2}$/, '');
/** Типографика текстов кейса: typo() + неразрывный пробел между разрядами («37 000 км» не рвется на «37 / 000») */
const tt = (s) => typo(s).replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0');
/** Предлог перед названием: «об Audi A3L», но «о Ford Ranger» (перед гласным звуком — «об») */
const about = (name) => `${/^[aeiouаиоуыэ]/i.test(name) ? 'об' : 'о'} ${name}`;
const range = (arr) => (arr?.length ? (arr[0] === arr[1] ? String(arr[0]) : `${arr[0]}-${arr[1]}`) : '');
/** Диапазон цен для плитки: нижняя граница в единицах верхней («от 0,85 до 4,3 млн ₽»), чтобы строка помещалась в колонку */
const rangeShort = (lo, hi) => {
  if (hi < 1_000_000) return `от ${Math.round(lo / 1000)} до ${priceShort(hi)}`;
  const m = lo >= 1_000_000 ? Math.round(lo / 100_000) / 10 : Math.round(lo / 10_000) / 100;
  return `от ${String(m).replace('.', ',')} до ${priceShort(hi)}`;
};
/** Рыночные ориентиры сроков из calc-rules.json — для ответов о сроке доставки */
function timingVars(ctx) {
  const c = ctx.calc?.costs || {};
  return {
    jpWeeks: range(c.japan?.transit?.auctionToVladivostokWeeks),
    krWeeks: range(c.korea?.transit?.purchaseToVladivostokWeeks),
    cnWeeks: range(c.china?.transit?.paymentToUssuriyskWeeks),
    afterArrival: range(c.vladivostok?.timing?.totalAfterArrivalDays),
  };
}
/** Статьи блога по списку адресов: [{ name, url }] — только те, что есть в ctx.posts */
const postLinks = (ctx, slugs = []) => [...new Set(slugs)].map((slug) => ctx.posts.find((p) => p.slug === slug)).filter(Boolean).map((p) => ({ name: p.short || p.title, url: p.url }));
/** Размеры фото в сетке хаба: 4 колонки → 3 (до 1180px) → 2 (до 900px); горизонтальный снимок занимает две колонки */
const GRID_SIZES = { wide: '(max-width: 900px) 100vw, (max-width: 1180px) 66vw, 50vw', normal: '(max-width: 900px) 50vw, (max-width: 1180px) 33vw, 25vw' };

// Статусы считаем сами: в общих данных код «in-transit» не получает свой цвет (см. отчет, sharedNeeds).
const STATUS = {
  delivered: { key: 'delivered', label: 'Доставлен', cls: 'status--ok', hash: 'dostavlen', total: 'Доставлено' },
  transit: { key: 'transit', label: 'В пути', cls: 'status--transit', hash: 'v-puti', total: 'В пути' },
  auction: { key: 'auction', label: 'На торгах', cls: 'status--auction', hash: 'na-torgah', total: 'На торгах' },
};

function statusOf(c) {
  const code = String(c.statusCode || '').toLowerCase();
  if (/transit/.test(code) || /пути/i.test(c.status || '')) return STATUS.transit;
  if (/auction/.test(code) || /торг/i.test(c.status || '')) return STATUS.auction;
  return STATUS.delivered;
}

// Города из кейсов, которых нет в data/cities.json (страниц доставки для них нет)
const CITY_FORMS = {
  'Большой Камень': { gen: 'Большого Камня', acc: 'в Большой Камень', meta: 'Приморский край' },
  Владивосток: { gen: 'Владивостока', acc: 'во Владивосток', meta: 'Выдача на месте' },
};
const cityGen = (c) => c.city?.nameGen || CITY_FORMS[c.clientCity]?.gen || c.clientCity;
const cityAcc = (c) => (c.city ? `в ${c.city.nameAcc || c.city.name}` : CITY_FORMS[c.clientCity]?.acc || `в ${c.clientCity}`);
const daysText = (city) => String(city.daysLabel || '').replace(/\s*дн\.?$/, ' дней');

/** Кейсы с вычисленными полями: статус, страна, пропорции фото, город из справочника доставки, аукционная оценка */
function enrich(ctx) {
  const extra = ctx.content.cases || {};
  return ctx.cases.map((c, i) => {
    const st = statusOf(c);
    const size = imgSize(c.image) || (c.imageSize ? { w: c.imageSize[0], h: c.imageSize[1] } : null);
    const city = c.clientCity ? ctx.cities.find((x) => x.name === c.clientCity) || null : null;
    const specs = c.specs || {};
    return {
      ...c,
      i,
      st,
      statusLabel: st.label,
      statusCls: st.cls,
      cn: c.countrySlug ? ctx.countryBySlug[c.countrySlug] : null,
      wide: size ? size.w > size.h : false,
      city,
      grade: specs['Аукционная оценка'] || specs['Общая оценка'] || null,
      multi: /\sи\s/.test(c.name),
      short: shortName(c.name),
      extra: extra[c.slug] || {},
    };
  });
}

// --- связь с каталогом -----------------------------------------------------------------------------

const BRAND_ALIAS = { geome: 'geely' };

/** Токены названия кейса после марки (или null, если марка не совпала). «Mercedes-Benz» и «Mercedes» считаем одной маркой. */
function afterBrand(caseTokens, brandName) {
  const flat = tokens(brandName).join('');
  for (let n = 1; n <= 3 && n <= caseTokens.length; n++) {
    const head = caseTokens.slice(0, n).map((x) => BRAND_ALIAS[x] || x).join('');
    if (head === flat) {
      const rest = caseTokens.slice(n);
      return flat === 'mercedes' && rest[0] === 'benz' ? rest.slice(1) : rest;
    }
  }
  return null;
}

/**
 * Модели и марки каталога, которые совпадают с названием кейса. Модель — только при точном совпадении слов.
 * Сначала ищем в стране кейса; если там марки нет — берем ту же марку из других стран каталога.
 */
function catalogMatch(ctx, c) {
  const find = (scope) => {
    const models = [];
    const brands = [];
    for (const name of c.name.split(/\s+и\s+/)) {
      const t = tokens(name);
      for (const b of ctx.brands.filter(scope)) {
        const rest = afterBrand(t, b.name);
        if (!rest) continue;
        if (!brands.includes(b)) brands.push(b);
        const hit = b.models
          .map((m) => ({ m, k: tokens(m.name) }))
          .filter(({ k }) => k.length && k.every((x, i) => rest[i] === x))
          .sort((x, y) => y.k.length - x.k.length)[0];
        if (hit && !models.includes(hit.m)) models.push(hit.m);
      }
    }
    return { models, brands };
  };
  const own = find((x) => !c.countrySlug || x.country === c.countrySlug);
  return own.brands.length || !c.countrySlug ? own : find(() => true);
}

/** Похожие кейсы: та же марка, та же страна, близкая цена */
function similarCases(list, c) {
  const brand = (x) => tokens(x.name)[0];
  return list
    .filter((x) => x.slug !== c.slug)
    .map((x) => ({
      x,
      s:
        (brand(x) === brand(c) ? 4 : 0) +
        (c.countrySlug && x.countrySlug === c.countrySlug ? 2 : 0) +
        (x.st.key === c.st.key ? 0.5 : 0) +
        (x.price && c.price ? Math.max(0, 1.5 - Math.abs(x.price - c.price) / c.price) : 0) +
        (x.price ? 0.25 : 0),
    }))
    .sort((p, q) => q.s - p.s || p.x.i - q.x.i)
    .slice(0, 6)
    .map((p) => p.x);
}

// --- общие блоки ---------------------------------------------------------------------------------------

/** Отзыв с крупными фотографиями (лента на хабе) */
function shotReview(r, i) {
  const photos = r.photos.slice(0, 3);
  return html`
          <article class="shot" data-review${reveal(Math.min(i, 4))}>
            <div class="shot__media shot__media--${photos.length}" data-gallery>
              ${photos.map((p, pi) => `<a href="${a(p)}" data-gallery-item data-alt="Фото ${pi + 1} к отзыву, ${esc(r.author)}">${img({ src: p, alt: `Фото автомобиля клиента к отзыву, ${r.author}`, sizes: photos.length > 1 ? '140px' : '(max-width: 900px) 80vw, 27vw' })}</a>`)}
            </div>
            <div class="shot__body">
              <div class="review__head">
                <span class="review__avatar" aria-hidden="true">${esc((r.author || '?').trim()[0].toUpperCase())}</span>
                <div>
                  <div class="review__name">${esc(r.author)}</div>
                  <div class="review__src">${esc(r.source)}</div>
                </div>
                ${stars(r.rating || 5)}
              </div>
              <p class="review__text is-clamped">${esc(r.text)}</p>
              <div class="review__foot">
                <button class="link" type="button" data-review-more>Читать полностью</button>
                ${r.url ? `<a class="link" href="${esc(r.url)}" target="_blank" rel="noopener nofollow">Отзыв в ${esc(r.source)}</a>` : ''}
              </div>
            </div>
          </article>`;
}

/** Отзыв-цитата на странице кейса */
function quoteBlock(r, meta) {
  return html`
        <figure class="case-quote" data-review${reveal()}>
          <div class="case-quote__side">
            ${label(meta.kind === 'model' ? 'Отзыв о модели' : 'Отзыв клиента')}
            <h3 class="case-quote__title">${duo(meta.title[0], meta.title[1])}</h3>
            <p class="case-quote__cap">${typo(meta.caption)}</p>
            ${r.photos.length
              ? `<div class="review__photos" data-gallery>${r.photos.map((p, pi) => `<a href="${a(p)}" data-gallery-item data-alt="Фото ${pi + 1} к отзыву, ${esc(r.author)}">${img({ src: p, alt: `Фото автомобиля к отзыву, ${r.author}`, sizes: '84px' })}</a>`).join('')}</div>`
              : ''}
          </div>
          <div class="case-quote__main">
            <blockquote class="review__text is-clamped">${esc(r.text)}</blockquote>
            <figcaption class="case-quote__foot">
              <div class="review__head">
                <span class="review__avatar" aria-hidden="true">${esc((r.author || '?').trim()[0].toUpperCase())}</span>
                <div>
                  <div class="review__name">${esc(r.author)}</div>
                  <div class="review__src">${esc(r.source)}</div>
                </div>
                ${stars(r.rating || 5)}
              </div>
              <div class="case-quote__links">
                <button class="link" type="button" data-review-more>Читать полностью</button>
                ${r.url ? `<a class="link" href="${esc(r.url)}" target="_blank" rel="noopener nofollow">Открыть в ${esc(r.source)}</a>` : ''}
              </div>
            </figcaption>
          </div>
        </figure>`;
}

// --- хаб --------------------------------------------------------------------------------------------------

function hubPage(ctx, list) {
  const { site } = ctx;
  const t = ctx.content.cases?._hub?.hub || {};
  const by = (k) => list.filter((c) => c.st.key === k);
  const delivered = by('delivered');
  const transit = by('transit');
  const auction = by('auction');
  const prices = list.map((c) => c.price).filter(Boolean);
  const priceFrom = prices.length ? Math.min(...prices) : null;
  const priceTo = prices.length ? Math.max(...prices) : null;
  const countries = ctx.countries.map((cn) => ({ cn, n: list.filter((c) => c.countrySlug === cn.slug).length })).filter((x) => x.n > 0);
  const withTerm = list.find((c) => c.deliveryTerm);
  const vars = {
    total: list.length,
    delivered: delivered.length,
    transit: transit.length,
    auction: auction.length,
    priceFrom: priceFrom ? plain(price(priceFrom)) : '',
    // пути без u(): строки собираются до рендера, относительными в локальной сборке их делает base.mjs
    calculator: R.calculator,
    catalog: R.catalog,
    delivery: R.delivery,
    auctionSheet: R.auctionSheet,
    termFact: withTerm ? `В карточке ${withTerm.name} указан срок доставки ${withTerm.deliveryTerm}. ` : '',
    ...timingVars(ctx),
  };
  const faq = (t.faq || []).map((f) => ({ q: f.q, a: fill(f.a, vars) }));
  const crumbsList = [HOME, HUB];
  const title = fill(t.title, vars);
  const description = fill(t.description, vars);

  // сетка: горизонтальные фото занимают две колонки; плитка-заявка делает число ячеек кратным 4, 3 и 2
  const PROMO_AT = 8;
  const cells = list.reduce((s, c) => s + (c.wide ? 2 : 1), 0);
  const promoWide = (cells + 1) % 4 !== 0;
  // плитки собираем внутри render(): caseCard и btn строят ссылки через u(), а она зависит от текущей страницы
  const promo = () => html`
          <div class="promo-tile promo-tile--accent cases-grid__promo on-dark${promoWide ? ' is-wide' : ''}">
            <div>
              ${label('Под заказ')}
              <p class="promo-tile__title">${typo(t.promo.title)}</p>
              <p>${typo(t.promo.text)}</p>
            </div>
            ${btn('Хочу такой же', R.contacts, { variant: 'light', modal: 'request', subject: 'Хочу такой же автомобиль (привезенные авто, плитка)', attrs: { 'data-modal-title': 'Привезем такой же автомобиль', 'data-modal-text': 'Назовите модель и бюджет, и мы подберем варианты и пришлем расчет под ключ.' } })}
          </div>`;
  // у широких плиток слот вдвое больше: без своего sizes браузер берет файл 480px и фото выходит размытым
  const gridSizes = (c) => (c.wide ? GRID_SIZES.wide : GRID_SIZES.normal);
  const tiles = () => {
    const out = list.map(
      (c, i) => html`
          <div class="cases-grid__item${c.wide ? ' is-wide' : ''}" data-case data-status="${c.st.key}" data-country="${c.countrySlug || ''}">
            ${caseCard(c, { i: i % 4, stack: true, sizes: gridSizes(c) }).replace(/ sizes="[^"]*"/, ` sizes="${gridSizes(c)}"`)}
          </div>`
    );
    out.splice(Math.min(PROMO_AT, out.length), 0, promo());
    return out;
  };

  const chip = (group, value, text, n, { dot } = {}) =>
    `<button class="chip" type="button" data-cf="${group}" data-v="${value}" aria-pressed="${value === '' ? 'true' : 'false'}">${dot ? `<i class="cases-dot cases-dot--${dot}" aria-hidden="true"></i>` : ''}${esc(text)}${n !== undefined ? `<small>${n}</small>` : ''}</button>`;

  // география: города из карточек сделок, от дальних к ближним
  const dist = (c) => c.city?.distanceKm ?? (c.clientCity === 'Владивосток' ? 0 : 1);
  const geo = list.filter((c) => c.clientCity).sort((x, y) => dist(y) - dist(x));
  const geoText = (c) => {
    if (c.extra.selfPickup) return `${t.geo.selfDrive}${c.city ? `: ${num(c.city.distanceKm)} км` : ''}`;
    if (c.city) return `Автовозом из Владивостока: ориентировочно <span class="nowrap">${daysText(c.city)}</span>, от ${price(c.city.priceFrom)}`;
    if (c.clientCity === 'Владивосток') return 'Клиент получает автомобиль во Владивостоке';
    return t.geo.local;
  };

  const photoReviews = ctx.reviews.filter((r) => r.photos.length);
  const selections = ctx.selections.filter((s) => s.count > 0);

  return {
    url: R.cases,
    type: 'cases',
    title,
    description,
    h1: `${t.h1[0]} ${t.h1[1]}`,
    breadcrumbs: crumbsList,
    headerOver: true,
    priority: 0.8,
    changefreq: 'weekly',
    images: list.slice(0, 8).map((c) => c.image),
    ogImage: list[0] ? list[0].image.replace(/^assets\//, '') : undefined,
    jsonld: [itemListLd(site, 'Привезенные автомобили клиентов Макс Групп', list.map((c) => ({ url: c.url, name: c.name }))), faqLd(faq)].filter(Boolean),
    render: () => html`
    <section class="page-head page-head--dark on-dark page-head--photo cases-head">
      <div class="page-head__bg">${img({ src: 'assets/img/hero/bridge-kei.webp', alt: 'Автомобиль на вантовом мосту во Владивостоке ночью', priority: true, sizes: '100vw' })}</div>
      <div class="container">${crumbs(crumbsList)}</div>
      <div class="container">
        <div class="page-head__grid">
          <div class="page-head__main">
            <div style="margin-bottom:16px">${label(t.label)}</div>
            <h1>${duo(t.h1[0], t.h1[1])}</h1>
          </div>
          <div class="page-head__side">
            <p class="lead">${typo(t.lead)}</p>
            <div class="page-head__actions">
              ${btn('Хочу такой же', R.contacts, { variant: 'light', modal: 'request', subject: 'Хочу такой же автомобиль (привезенные авто)', attrs: { 'data-modal-title': 'Привезем такой же автомобиль', 'data-modal-text': 'Назовите модель и бюджет, и мы подберем варианты и пришлем расчет под ключ.' } })}
              ${btn('Смотреть каталог', R.catalog, { variant: 'ghost', arrow: false })}
            </div>
          </div>
        </div>
        <div class="cases-stats">
          ${[delivered, transit, auction].map((group, i) => {
            const st = [STATUS.delivered, STATUS.transit, STATUS.auction][i];
            return html`
          <a class="cases-stat" href="#avto" data-cases-set="${st.key}">
            <span class="cases-stat__value">${group.length}</span>
            <span class="cases-stat__name"><i class="cases-dot cases-dot--${st.key}" aria-hidden="true"></i>${esc(st.total)}</span>
            <span class="cases-stat__text">${typo(t.stats[st.key])}</span>
          </a>`;
          })}
          ${priceFrom
            ? html`
          <div class="cases-stat">
            <span class="cases-stat__value cases-stat__value--range">${rangeShort(priceFrom, priceTo)}</span>
            <span class="cases-stat__name">Диапазон цен</span>
            <span class="cases-stat__text">${typo(t.stats.price)}</span>
          </div>`
            : ''}
        </div>
      </div>
    </section>

    <section class="section" id="avto" data-cases>
      <div class="container">
        <div class="cases-bar">
          <div class="cases-bar__head">
            <h2 class="h3">${duo(t.gridTitle[0], t.gridTitle[1])}</h2>
            <span class="cases-bar__count" data-cases-count aria-live="polite">${count(list.length, carWord)}</span>
          </div>
          <div class="cases-bar__filters">
            <div class="chips" role="group" aria-label="Статус автомобиля">
              ${chip('status', '', 'Все', list.length)}
              ${delivered.length ? chip('status', 'delivered', STATUS.delivered.label, delivered.length, { dot: 'delivered' }) : ''}
              ${transit.length ? chip('status', 'transit', STATUS.transit.label, transit.length, { dot: 'transit' }) : ''}
              ${auction.length ? chip('status', 'auction', STATUS.auction.label, auction.length, { dot: 'auction' }) : ''}
            </div>
            ${countries.length > 1
              ? html`<div class="chips" role="group" aria-label="Страна покупки">
              ${chip('country', '', 'Все страны')}
              ${countries.map((x) => chip('country', x.cn.slug, x.cn.navTitle, x.n))}
            </div>`
              : ''}
          </div>
        </div>
        <div class="cases-grid">
          ${tiles()}
        </div>
        <div class="empty u-mt-5" data-cases-empty hidden>
          ${icon('search', 'card__icon')}
          <h3>${typo(t.empty.title)}</h3>
          <p>${typo(t.empty.text)}</p>
          <div class="btn-row">
            <button class="btn btn--ghost" type="button" data-cases-reset>Сбросить фильтр</button>
            ${btn('Оставить заявку', R.contacts, { modal: 'request', subject: 'Подбор автомобиля (привезенные авто, пустой фильтр)' })}
          </div>
        </div>
        <div class="section-foot">
          <p class="muted" style="max-width:72ch">${typo(t.gridNote)}</p>
          ${btn('Рассчитать стоимость', R.calculator, { variant: 'dark' })}
        </div>
      </div>
      <script>
(function () {
  var root = document.querySelector('[data-cases]');
  if (!root) return;
  var items = [].slice.call(root.querySelectorAll('[data-case]'));
  var btns = [].slice.call(root.querySelectorAll('[data-cf]'));
  var countEl = root.querySelector('[data-cases-count]');
  var empty = root.querySelector('[data-cases-empty]');
  var grid = root.querySelector('.cases-grid');
  var state = { status: '', country: '' };
  var forms = ['автомобиль', 'автомобиля', 'автомобилей'];
  function word(n) { var d = n % 10, h = n % 100; return d === 1 && h !== 11 ? forms[0] : d >= 2 && d <= 4 && (h < 12 || h > 14) ? forms[1] : forms[2]; }
  function apply() {
    var n = 0;
    items.forEach(function (el) {
      var ok = (!state.status || el.dataset.status === state.status) && (!state.country || el.dataset.country === state.country);
      el.hidden = !ok;
      if (ok) n++;
    });
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(state[b.dataset.cf] === b.dataset.v)); });
    if (countEl) countEl.textContent = n + '\\u00a0' + word(n) + (n < items.length ? ' из ' + items.length : '');
    if (empty) empty.hidden = n > 0;
    if (grid) { grid.classList.toggle('is-filtered', n < items.length); grid.classList.toggle('is-empty', n === 0); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cf]');
    if (b) { state[b.dataset.cf] = b.dataset.v; apply(); return; }
    var s = e.target.closest('[data-cases-set]');
    if (s) { state.status = s.dataset.casesSet; state.country = ''; apply(); return; }
    if (e.target.closest('[data-cases-reset]')) { state.status = ''; state.country = ''; apply(); }
  });
  var byHash = { '#dostavlen': 'delivered', '#v-puti': 'transit', '#na-torgah': 'auction' };
  if (byHash[location.hash]) { state.status = byHash[location.hash]; apply(); root.scrollIntoView(); }
})();
      </script>
    </section>

    ${geo.length
      ? html`
    <section class="section section--dark cases-geo">
      <div class="cases-geo__bg">${img({ src: 'assets/img/hero/bridge-drive.webp', alt: '', sizes: '100vw' })}</div>
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(t.geo.label)}
            <h2>${duo(t.geo.title[0], t.geo.title[1])}</h2>
            <p class="lead">${typo(t.geo.lead)}</p>
            ${more(t.geo.more, R.delivery)}
          </div>
          <div class="split__body geo-list">
            ${geo.map((c, i) => {
              const far = c.clientCity !== 'Владивосток';
              const meta = c.city ? `${num(c.city.distanceKm)} км от Владивостока` : CITY_FORMS[c.clientCity]?.meta || '';
              return html`
            <article class="geo-row"${reveal(Math.min(i, 4))}>
              <div class="geo-row__city">
                <h3>${c.city ? `<a href="${u(c.city.url)}">${esc(c.clientCity)}</a>` : esc(c.clientCity)}</h3>
                ${meta ? `<span>${esc(meta)}</span>` : ''}
              </div>
              <div class="geo-row__body">
                ${route([c.countryName, 'Владивосток', far ? c.clientCity : null])}
                <a class="geo-row__car" href="${u(c.url)}">${esc(c.name)} ${icon('arrow')}</a>
                <p>${typo(geoText(c))}</p>
              </div>
              <span class="status ${c.st.cls}">${esc(c.st.label)}</span>
            </article>`;
            })}
            <p class="geo-list__note">${typo(t.geo.note)}</p>
          </div>
        </div>
      </div>
    </section>`
      : ''}

    ${photoReviews.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({
          label: t.reviews.label,
          title: duo(t.reviews.title[0], t.reviews.title[1]),
          lead: t.reviews.lead,
          aside: photoReviews.length > 3 ? railNav() : '',
        })}
        ${rail(photoReviews.map((r, i) => shotReview(r, i)), { col: 'minmax(320px, 26.4%)', colMobile: 'minmax(272px, 82%)' })}
        <div class="section-foot">
          <div class="btn-row">
            <a class="btn btn--ghost btn--sm" href="${esc(site.contacts.maps.twoGis)}" target="_blank" rel="noopener nofollow">Мы в 2ГИС ${icon('external')}</a>
            <a class="btn btn--ghost btn--sm" href="${esc(site.contacts.maps.yandex)}" target="_blank" rel="noopener nofollow">Мы на Яндекс Картах ${icon('external')}</a>
          </div>
          ${btn(fill(t.reviews.more, { reviews: count(ctx.reviews.length, ['отзыв', 'отзыва', 'отзывов']) }), R.reviews, { variant: 'dark' })}
        </div>
      </div>
    </section>`
      : ''}

    <section class="section">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(t.faqHead.label)}
            <h2>${duo(t.faqHead.title[0], t.faqHead.title[1])}</h2>
            <p class="lead">${typo(t.faqHead.lead)}</p>
            ${more('Как читать аукционный лист', R.auctionSheet)}
          </div>
          <div class="split__body">${faqList(faq)}</div>
        </div>
        <div class="u-mt-8">
          ${linkBlock('Каталог по странам', [...ctx.countries.map((cn) => ({ name: `Авто ${cn.from}`, url: R.country(cn.slug) })), { name: 'Весь каталог', url: R.catalog }])}
          ${linkBlock('Подборки', selections.slice(0, 12).map((s) => ({ name: s.name, url: s.url })))}
          ${linkBlock('Доставка в города', ctx.cities.slice(0, 16).map((x) => ({ name: x.name, url: x.url })))}
          ${linkBlock('Услуги и инструменты', [...ctx.services.map((s) => ({ name: s.navName || s.name, url: s.url })), { name: 'Калькулятор стоимости', url: R.calculator }, { name: 'Как заказать автомобиль', url: R.howTo }, { name: 'Как читать аукционный лист', url: R.auctionSheet }, { name: 'Отзывы клиентов', url: R.reviews }])}
          ${linkBlock('Статьи блога', postLinks(ctx, t.posts))}
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { label: t.cta.label, title: duo(t.cta.title[0], t.cta.title[1]), text: t.cta.text, subject: 'Хочу такой же автомобиль (привезенные авто)', bg: 'assets/img/hero/street-far.webp', fields: ['name', 'phone', 'car', 'city'], cta: 'Хочу такой же' })}`,
  };
}

// --- страница кейса ------------------------------------------------------------------------------------------

// кадры из видео заказчика без сторонних водяных знаков
const CTA_BG = ['assets/img/hero/gclass-road.webp', 'assets/img/hero/street-night.webp', 'assets/img/hero/kei-blue.webp', 'assets/img/hero/city-towers.webp'];

function h1Tail(c) {
  if (c.st.key === 'transit') return c.cn ? `везем ${c.cn.from}` : 'везем под заказ';
  if (c.st.key === 'auction') return 'на торгах';
  return c.cn ? `привезли ${c.cn.from}` : 'привезли под заказ';
}

const TITLE_BRAND = ' | Макс Групп';
const TITLE_MAX = 65;

/**
 * Title кейса. Варианты идут от полного к короткому; сначала пробуем с брендом, затем без него:
 * суффикс « | Макс Групп» ставится, только если весь заголовок укладывается в 65 знаков.
 */
function caseTitle(c) {
  const p = c.price ? plain(price(c.price)) : null;
  const from = c.cn ? ` ${c.cn.from}` : '';
  let full; // варианты, в которых сохранены страна и суть сделки
  let short; // запасной вариант без страны
  if (c.st.key === 'transit') {
    const to = c.clientCity ? ` ${cityAcc(c)}` : '';
    full = [`${c.name}${from}: везем под заказ${to}`, `${c.name}${from}: везем под заказ`];
    short = `${c.name}: везем${from || ' под заказ'}`;
  } else if (c.st.key === 'auction') {
    full = [`${c.name}: лот на торгах, подбор под заказ`, `${c.name}: лот на торгах`];
    short = `${c.name}: на торгах`;
  } else if (p) {
    full = [`${c.name}${from}: привезли под заказ за ${p}`, `${c.name}${from}: привезли за ${p}`];
    short = `${c.name}: привезли за ${p}`;
  } else {
    full = [`${c.name}${from}: привезли под заказ во Владивосток`, `${c.name}${from}: привезли под заказ`];
    short = `${c.name}: привезли под заказ`;
  }
  const v = [...full.map((x) => x + TITLE_BRAND), ...full, short + TITLE_BRAND, short];
  return v.find((x) => x.length <= TITLE_MAX) || short;
}

function caseDescription(c) {
  const from = c.cn ? ` ${c.cn.from}` : '';
  const forWhom = c.clientCity ? ` для клиента из ${cityGen(c)}` : '';
  const first =
    c.st.key === 'transit'
      ? `${c.name}: везем под заказ${from}${forWhom}.`
      : c.st.key === 'auction'
        ? `${c.name}: лот, отобранный для торгов под заказ клиента.`
        : `${c.name}: привезли под заказ${from}${forWhom}.`;
  const specs = Object.entries(c.specs || {})
    .filter(([k]) => !/год выпуска|цвет/i.test(k))
    .slice(0, 4)
    .map(([k, v]) => `${k.toLowerCase()}: ${v}`);
  // состав цены из источника: «В стоимость под ключ входят: таможенное оформление, СБКТС, ЭПТС»
  const inc = (c.priceIncludes || []).map((x) => (/^[А-ЯЁ][а-яё]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x));
  const incList = inc.length > 1 ? `${inc.slice(0, -1).join(', ')} и ${inc.at(-1)}` : inc[0] || '';
  // части в порядке показа; prio — очередность, в которой они занимают место в 165 знаках (цена важнее характеристик).
  // У части может быть несколько вариантов (alts) — берется первый, который помещается.
  const parts = [
    { prio: 0, alts: [first] },
    { prio: 3, alts: [specs.length ? `${specs.join('; ')}.`.replace(/^./, (x) => x.toUpperCase()) : ''] },
    { prio: 1, alts: [c.price ? `${c.priceLabel}: ${price(c.price)}.` : ''] },
    { prio: 4, alts: incList ? [`В стоимость под ключ вошли ${incList}.`, `В цене: ${incList}.`] : [''] },
    { prio: 2, alts: [c.deliveryTerm ? `Срок доставки: ${c.deliveryTerm}.` : ''] },
    { prio: 5, alts: [c.multi ? 'Реальные автомобили клиентов Макс Групп: фото, статус и детали сделки.' : 'Реальный автомобиль клиента Макс Групп: фото, статус и детали сделки.', 'Фото, статус и детали сделки.'] },
    { prio: 6, alts: ['Расчет такого же авто под ключ с доставкой по России.', 'Расчет такого же авто под ключ.'] },
  ].filter((p) => p.alts[0]);
  let left = 165;
  for (const p of [...parts].sort((x, y) => x.prio - y.prio)) {
    p.text = p.alts.find((x) => x.length + 1 <= left) || (p.prio === 0 ? p.alts[0] : '');
    if (p.text) left -= p.text.length + 1;
  }
  return plain(parts.filter((p) => p.text).map((p) => p.text).join(' '));
}

/** Дат сделок в источнике нет, поэтому кейс размечается не как Article (статья без даты), а как WebPage об автомобиле */
function caseLd(site, c, { h1, description }) {
  const org = { '@id': abs(site, '/#organization') };
  const brand = c.name.split(' ')[0];
  const mileage = c.specs?.['Пробег'] ? Number(String(c.specs['Пробег']).replace(/\D/g, '')) : null;
  return {
    '@type': 'WebPage',
    '@id': abs(site, c.url + '#webpage'),
    url: abs(site, c.url),
    name: h1,
    description,
    inLanguage: 'ru-RU',
    isPartOf: { '@id': abs(site, '/#website') },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(site, '/' + c.image) },
    publisher: org,
    about: c.multi
      ? undefined
      : {
          '@type': 'Car',
          name: c.name,
          brand: { '@type': 'Brand', name: brand },
          vehicleModelDate: c.year ? String(c.year) : undefined,
          mileageFromOdometer: mileage || mileage === 0 ? { '@type': 'QuantitativeValue', value: mileage, unitCode: 'KMT' } : undefined,
          color: c.specs?.['Цвет'] || undefined,
        },
  };
}

function casePage(ctx, list, c) {
  const { site } = ctx;
  const t = ctx.content.cases?._hub?.page || {};
  const guide = ctx.content.guide || {};
  const ex = c.extra;
  const from = c.cn ? ` ${c.cn.from}` : '';
  const h1 = `${c.name}, ${h1Tail(c)}`;
  const title = caseTitle(c);
  const description = caseDescription(c);
  const crumbsList = [HOME, HUB, { name: c.name, url: c.url }];
  const far = c.clientCity && c.clientCity !== 'Владивосток';
  const { models, brands } = catalogMatch(ctx, c);
  const sim = similarCases(list, c);
  const review = ex.review ? ctx.reviews.find((r) => r.author === ex.review.author) : null;
  const subject = `Хочу такой же: ${c.name}`;
  const wantBtn = (variant = 'primary', extra = {}) =>
    btn(c.multi ? 'Хочу такой же автомобиль' : 'Хочу такой же', R.contacts, {
      variant,
      modal: 'request',
      subject,
      ...extra,
      attrs: { 'data-modal-title': `${c.short}: привезем такой же`, 'data-modal-text': 'Оставьте контакты, и мы подберем автомобиль той же модели и пришлем расчет под ключ.', 'data-modal-car': c.multi ? null : c.short, 'data-modal-label': 'Привезенные авто' },
    });

  // паспорт сделки
  // ссылки в строках, собранных до рендера, — абсолютные пути без u() (см. комментарий в hubPage)
  const gradeLink = ` · <a class="link small" href="${R.auctionSheet}">как читать</a>`;
  const rows = [
    ['Статус', esc(c.st.label)],
    c.cn ? ['Страна', `<a class="link" href="${R.country(c.cn.slug)}">${esc(c.cn.name)}</a>`] : null,
    ...Object.entries(c.specs || {}).map(([k, v]) => [k, esc(v) + (/оценка/i.test(k) ? gradeLink : '')]),
    c.deliveryTerm ? ['Срок доставки', esc(c.deliveryTerm)] : null,
    c.clientName ? ['Клиент', esc(c.clientName)] : null,
    c.clientCity ? ['Город клиента', c.city ? `<a class="link" href="${c.city.url}">${esc(c.clientCity)}</a>` : esc(c.clientCity)] : null,
  ].filter(Boolean);
  const noPriceText = c.st.key === 'auction' ? 'Цена по итогам торгов' : c.st.key === 'transit' ? 'В пути во Владивосток' : 'Цена сделки не публиковалась';

  // блок о цене
  const priceKind = c.price ? (c.priceIncludes?.length ? 'includes' : 'plain') : c.st.key === 'auction' ? 'auction' : c.st.key === 'transit' ? 'transit' : 'none';
  const priceNote = fill(t.priceNote?.[priceKind], { priceLabel: c.priceLabel || '' });

  // расшифровка аукционной оценки из справочника
  const gradeItems = [...(guide.grades?.numeric || []), ...(guide.grades?.special || [])];
  const gradeMeaning = c.grade ? gradeItems.find((x) => x.code === String(c.grade))?.meaning : null;
  const interior = c.specs?.['Салон'] ? (guide.interior?.items || []).find((x) => x.code === c.specs['Салон'])?.meaning : null;

  // «сколько стоит сейчас»: ссылки в каталог и инструменты
  const now = [];
  for (const m of models.slice(0, 3)) {
    const cn = ctx.countryBySlug[m.country];
    now.push({ kind: 'Модель в каталоге', title: `${m.brand} ${m.name} ${cn.from}`, meta: `${count(m.count, ['вариант', 'варианта', 'вариантов'])} · ${fromShort(m)}`, url: m.url });
  }
  for (const b of brands.slice(0, models.length ? 2 : 3)) {
    const cn = ctx.countryBySlug[b.country];
    now.push({ kind: 'Марка в каталоге', title: `${b.name} ${cn.from}`, meta: `${count(b.count, ['вариант', 'варианта', 'вариантов'])} · ${fromShort(b)}`, url: b.url });
  }
  if (c.cn) now.push({ kind: 'Страна', title: `Авто ${c.cn.from}`, meta: c.cn.source, url: R.country(c.cn.slug) });
  else now.push({ kind: 'Каталог', title: 'Автомобили из Азии', meta: 'Япония · Корея · Китай', url: R.catalog });
  now.push({ kind: 'Инструмент', title: 'Калькулятор стоимости', meta: 'Пошлина, утильсбор, доставка', url: R.calculator });
  if (c.city) now.push({ kind: 'Доставка', title: `Доставка ${cityAcc(c)}`, meta: `${daysText(c.city)} · от ${priceShort(c.city.priceFrom)}`, url: c.city.url });
  if (c.grade) now.push({ kind: 'Справочник', title: 'Как читать аукционный лист', meta: `Оценка ${c.grade} и другие отметки`, url: R.auctionSheet });
  if (now.length < 4) now.push({ kind: 'Услуга', title: 'Автомобиль под заказ', meta: 'Подбор, покупка, оформление', url: R.service('avto-pod-zakaz') });
  now.splice(6);
  const nowCols = now.length === 6 ? 3 : now.length;

  // вопросы по сделке
  const f = t.faq || {};
  const bestModel = models[0];
  const vars = {
    name: `${c.short}${from}`,
    price: c.price ? price(c.price) : '',
    priceLabel: c.priceLabel || '',
    term: c.deliveryTerm || '',
    calculator: R.calculator,
    auctionSheet: R.auctionSheet,
    where: c.cn ? ` ${c.cn.inLoc}` : '',
    catalogUrl: bestModel ? bestModel.url : c.cn ? R.country(c.cn.slug) : R.catalog,
    catalogText: bestModel ? `каталоге: ${bestModel.brand} ${bestModel.name} ${ctx.countryBySlug[bestModel.country].from}` : c.cn ? `каталоге авто ${c.cn.from}` : 'каталоге',
    cityAcc: c.city ? cityAcc(c) : '',
    cityUrl: c.city ? c.city.url : '',
    deliveryPrice: c.city ? price(c.city.priceFrom) : '',
    deliveryDays: c.city ? daysText(c.city) : '',
    grade: c.grade || '',
    meaning: gradeMeaning || '',
    ...timingVars(ctx),
  };
  // срок: факт из карточки → рыночный ориентир по стране → опыт из отзывов (он про японские аукционы) → оформление
  const termText = f.term
    ? (c.deliveryTerm ? f.term.withTerm : f.term.noTerm) +
      (f.term.market?.[c.countrySlug || 'none'] || '') +
      (!c.countrySlug || c.countrySlug === 'japan' ? f.term.reviews || '' : '') +
      (c.countrySlug === 'china' ? '' : f.term.after || '') + // для Китая оформление уже названо в ориентире
      (f.term.common || '')
    : '';
  // статьи блога по теме сделки: оценка листа, страна покупки, доставка в город клиента
  const pp = t.posts || {};
  const posts = postLinks(ctx, [c.grade ? pp.grade : null, ...(pp[c.countrySlug || 'none'] || []), c.city ? pp.city : null].filter(Boolean)).slice(0, 4);
  const faq = [
    f.price ? { q: fill(c.multi ? 'Сколько стоят такие автомобили сейчас?' : f.price.q, vars), a: fill(c.price ? f.price.withPrice : f.price.noPrice, vars) } : null,
    f.term ? { q: f.term.q, a: fill(termText, vars) } : null,
    f.same ? { q: fill(c.multi ? 'Можно ли заказать такой же автомобиль?' : f.same.q, vars), a: fill(f.same.a, vars) } : null,
    f.city && c.city ? { q: fill(f.city.q, vars), a: fill(f.city.a + (ex.selfPickup ? f.city.selfPickup : ''), vars) } : null,
    f.grade && c.grade && gradeMeaning ? { q: fill(f.grade.q, vars), a: fill(f.grade.a, vars) } : null,
  ].filter(Boolean);

  const story = (ex.story?.length ? ex.story : [`Автомобиль клиента Макс Групп: ${c.name}. Статус: ${c.st.label.toLowerCase()}.`]).map((p) => tt(p)).join('\n\n');
  const cta = c.st.key === 'delivered' ? t.cta.delivered : t.cta.other;
  const ctaTitle = c.multi ? duo('Хотите такой же', 'автомобиль?') : duo(fill(cta.title[0], { short: c.short }), fill(cta.title[1], { short: c.short }));
  const alt = `${c.name}${from ? ` ${c.cn.from}` : ''}, ${c.st.label.toLowerCase()}, автомобиль клиента Макс Групп`;

  const deal = () => html`
              ${c.price
                ? `<div class="casehero__price"><span class="casehero__sum">${price(c.price)}</span><span class="casehero__cap">${esc(c.priceLabel || 'Стоимость')}</span></div>`
                : `<div class="casehero__price"><span class="casehero__sum casehero__sum--text">${esc(noPriceText)}</span></div>`}
              <div class="casehero__actions">
                ${wantBtn('primary')}
                ${btn('Рассчитать стоимость', R.calculator, { variant: 'ghost', arrow: false })}
              </div>`;

  return {
    url: c.url,
    type: 'case',
    title,
    description,
    h1,
    breadcrumbs: crumbsList,
    ogType: 'article',
    ogImage: c.image.replace(/^assets\//, ''),
    priority: 0.5,
    changefreq: 'monthly',
    images: [c.image],
    jsonld: [caseLd(site, c, { h1, description }), faqLd(faq)].filter(Boolean),
    render: () => html`
    <section class="page-head" style="padding-bottom:0">
      <div class="container">${crumbs(crumbsList)}</div>
    </section>
    <section class="section section--sm casehero-sec">
      <div class="container">
        <div class="casehero${c.wide ? ' casehero--wide' : ''}">
          <div class="casehero__left">
            <div class="casehero__media" data-gallery>
              <a class="casehero__photo" href="${a(c.image)}" data-gallery-item data-alt="${esc(alt)}" aria-label="Открыть фотографию ${esc(c.name)}">
                ${img({ src: c.image, alt, priority: true, sizes: '(max-width: 900px) 100vw, 46vw', attrs: c.imageFocus ? { style: `object-position:${c.imageFocus}` } : {} })}
              </a>
              <span class="status ${c.st.cls}">${esc(c.st.label)}</span>
              <span class="casehero__zoom" aria-hidden="true">${icon('search')} Увеличить</span>
            </div>
            ${c.wide ? `<div class="casehero__deal on-dark">${deal()}</div>` : ''}
          </div>
          <div class="casehero__pass">
            <div class="casehero__top">
              ${label(c.cn ? `Кейс · ${c.cn.name}` : 'Кейс · авто под заказ')}
              <h1 class="casehero__title">${esc(c.name)},<span class="mute"> ${esc(h1Tail(c))}</span></h1>
              ${route([c.countryName, 'Владивосток', far ? c.clientCity : null], 'route--lg')}
              ${ex.lead ? `<p class="casehero__lead">${tt(ex.lead)}</p>` : ''}
            </div>
            <div class="casehero__mid">
              ${specList(rows, { cols: rows.length > 5 })}
              ${c.features?.length ? `<div class="casehero__features">${c.features.map((x) => `<span class="badge badge--line">${esc(x)}</span>`).join('')}</div>` : ''}
            </div>
            ${c.wide ? '' : `<div class="casehero__foot">${deal()}</div>`}
          </div>
        </div>
      </div>
    </section>

    <section class="section section--white">
      <div class="container">
        <div class="split split--even case-story">
          <div${reveal()}>
            ${label('История сделки')}
            <h2 class="u-mt-5">${c.multi ? duo('Два автомобиля:', 'что известно о сделке') : duo(`${c.short}:`, 'история сделки')}</h2>
            <div class="prose u-mt-6">${ctx.md(story)}</div>
          </div>
          <div class="case-side"${reveal(1)}>
            <div class="case-box">
              ${label(priceKind === 'includes' ? 'Состав цены' : 'О цене')}
              ${priceKind === 'includes'
                ? `<h3 class="case-box__title">В стоимость под ключ входят</h3>${ticks(c.priceIncludes)}`
                : `<h3 class="case-box__title">${c.price ? `${esc(c.priceLabel)}: ${price(c.price)}` : esc(noPriceText)}</h3>`}
              <p class="case-box__text">${typo(priceNote)}</p>
              <div class="btn-row">
                ${btn('Запросить расчет на сегодня', R.contacts, { variant: 'dark', size: 'sm', modal: 'request', subject: `Расчет на сегодня: ${c.name}`, attrs: { 'data-modal-title': `${c.short}: расчет на сегодня`, 'data-modal-text': 'Оставьте контакты, и мы посчитаем такой же автомобиль по актуальному курсу и ставкам.', 'data-modal-car': c.multi ? null : c.short } })}
              </div>
            </div>
            ${c.grade
              ? note(
                  `<strong>Аукционная оценка ${esc(c.grade)}</strong>${gradeMeaning ? `: ${esc(gradeMeaning)}` : ''}.${interior ? ` Салон ${esc(c.specs['Салон'])}: ${esc(interior)}.` : ''} <a class="link" href="${u(R.auctionSheet)}">Как читать аукционный лист</a>`
                )
              : ''}
          </div>
        </div>
        ${review ? quoteBlock(review, ex.review) : ''}
      </div>
    </section>

    <section class="section section--dark case-now">
      <div class="container">
        ${sectionHead({
          label: t.now.label,
          title: c.multi ? duo('Сколько стоят такие автомобили', t.now.titleMuted) : duo(`Сколько стоит ${c.short}`, t.now.titleMuted),
          lead: c.price ? t.now.lead : t.now.leadNoPrice,
          actions: btn('Рассчитать в калькуляторе', R.calculator, { variant: 'light' }) + wantBtn('ghost', { arrow: false }),
        })}
        <div class="now-grid" style="--cols:${nowCols}">
          ${now.map(
            (x, i) => html`
          <a class="now-link" href="${u(x.url)}"${reveal(Math.min(i, 5))}>
            <span class="now-link__kind">${esc(x.kind)}</span>
            <span class="now-link__title">${esc(x.title)}</span>
            <span class="now-link__meta"><span>${esc(x.meta)}</span>${icon('arrow')}</span>
          </a>`
          )}
        </div>
      </div>
    </section>

    ${sim.length
      ? html`
    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Похожие кейсы', title: duo('Другие автомобили,', 'которые мы привезли и везем'), aside: sim.length > 4 ? railNav() : '', actions: more(`Все ${list.length} автомобилей`, R.cases) })}
        ${rail(sim.map((x, i) => caseCard(x, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
      </div>
    </section>`
      : ''}

    <section class="section section--white">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${c.multi ? duo('Вопросы', 'о такой поставке') : duo('Вопросы', about(c.short))}</h2>
            <p class="lead">Цена на сегодня, срок и заказ такого же автомобиля. Не нашли ответ? Спросите менеджера.</p>
            ${more('Как заказать автомобиль', R.howTo)}
            ${more('Все вопросы', R.faq)}
          </div>
          <div class="split__body">${faqList(faq)}</div>
        </div>
        ${posts.length ? `<div class="u-mt-8">${linkBlock(pp.title || 'Полезно знать', posts)}</div>` : ''}
      </div>
    </section>

    ${ctaBand(ctx, { label: 'Хочу такой же', title: ctaTitle, text: cta.text, subject, car: c.multi ? '' : c.short, bg: CTA_BG[c.i % CTA_BG.length], cta: 'Хочу такой же' })}`,
  };
}

export function casesPages(ctx) {
  if (!ctx.cases.length) return [];
  const list = enrich(ctx);
  return [hubPage(ctx, list), ...list.map((c) => casePage(ctx, list, c))];
}
