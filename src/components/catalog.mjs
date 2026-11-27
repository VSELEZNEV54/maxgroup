// Блоки каталога: панель фильтров, сетка автомобилей, таблица цен, «что входит в цену», сравнение стран.
import { html, esc, u, price, cardPrice, priceShort, km, num, img, typo, plural, count, cx } from '../lib/core.mjs';
import { icon, carCard, btn, reveal, duo, sectionHead, specList, pageHead, leadForm } from './ui.mjs';
import { R } from '../routes.mjs';
import { filtersBar, filteredEmpty, resultsHead, includeModelProfiles, inventoryCounts } from './catalog-filters.mjs';
import { quizSection } from './quiz.mjs';

export const profilePrice = (entry) => entry.priceRub ? 'от ' + cardPrice(entry.priceRub) : 'По запросу';
export const profilePriceLabel = (entry) => ['Ориентир под ключ', entry.priceDestination].filter(Boolean).join(' ');

export function catalogLandingHead({ crumbs, h1, lead, photo, video, country, requestTitle, actions }) {
  const title = requestTitle || (country ? `Подберём авто ${country.from}` : 'Подберём авто под ваш бюджет');
  const subject = ['Подбор автомобиля', ...crumbs.slice(1).map((crumb) => crumb.name)].join(' · ');
  return pageHead({
    cls: country && !photo ? 'catalog-landing catalog-landing--country' : 'catalog-landing', lightSide: true, crumbs, h1, lead,
    photo: photo || country?.landingPhoto || 'img/misc/quiz-port-lineup.webp',
    video,
    side: html`<aside class="catalog-landing__request" aria-label="Заявка на подбор">
      <h2 class="h3">${typo(esc(title))}</h2>
      <p>Пришлём подходящие варианты с ценами и расчётом доставки в ваш город.</p>
      ${leadForm({ fields: ['name', 'phone'], nameLabel: 'Имя', subject, cta: 'Получить подборку' })}
    </aside>`,
    mainActions: actions,
  });
}

// Указатели подборок и топ-30 направляют поиск в каталог автомобилей соответствующего рынка.
export function directoryFilters(ctx, market) {
  const cars = market ? ctx.cars.filter((car) => car.country === market) : ctx.cars;
  const scope = { ...includeModelProfiles(ctx, cars, market), market, facets: inventoryCounts(cars) };
  const destination = market ? R.country(market) : R.catalog;
  return html`<div class="catalog-search" data-catalog-search>
    ${filtersBar(cars, { scope, destination })}
  </div>`;
}

export function salesManagerCard(site) {
  const manager = site.salesManager;
  const phone = site.contacts.phones[0];
  return html`<div class="manager">
    <div class="manager__photo" aria-hidden="true">${img({ src: manager.photo, alt: '', cls: 'sales-portrait', sizes: '56px' })}</div>
    <div>
      <div class="manager__name">${esc(manager.name)}</div>
      <div class="manager__role">${esc(manager.role)}</div>
    </div>
    <a class="manager__phone" href="tel:${esc(phone.tel)}"><small class="manager__role">${esc(phone.department)}</small><br>${esc(phone.label)}</a>
  </div>`;
}

export function popularModelCard(entry, { embedded = false, priority = false } = {}) {
  const heading = embedded ? 'h3' : 'h2';
  return html`
        <article class="${cx('card popular-model', embedded && 'popular-model--embedded')}" id="${entry.slug}" data-source-number="${entry.sourceNumber}">
          <a class="popular-model__photo" href="${u(entry.url)}" aria-label="${esc('О модели ' + entry.name)}">
            ${img({ src: entry.photo.src, alt: entry.name, priority, sizes: '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw' })}
          </a>
          <div class="popular-model__body">
            <${heading} class="popular-model__title"><a href="${u(entry.url)}">${esc(entry.name)}</a></${heading}>
            ${specList([['Год выпуска', esc(entry.years)], ['Двигатель', esc(entry.engine || 'Уточняется')], ['Комплектация', esc(entry.trim)]])}
            <div class="popular-model__price">
              <span class="popular-model__meta">${typo(esc(profilePriceLabel(entry)))}</span>
              <strong>${profilePrice(entry)}</strong>
            </div>
            <a class="btn btn--primary btn--block popular-model__catalog-link" href="${u(entry.pricesUrl)}" aria-label="${esc('Автомобили и цены — ' + entry.name)}">Автомобили и цены</a>
          </div>
        </article>`;
}

/**
 * Цена «от» для текстов листинга. x — марка, модель, подборка или срез с полями priceStats() (src/data/index.mjs).
 * Цену без утилизационного сбора нельзя называть «под ключ»: если в списке есть авто с полной ценой,
 * «от» считается по ним; если нет — берется минимальная и partial = true («от X без утильсбора»).
 * Возвращает { value, partial } или null.
 */
export function fromPrice(x) {
  if (!x || !x.priceFrom) return null;
  if (!x.priceFromPartial) return { value: x.priceFrom, partial: false };
  return x.priceFromFull ? { value: x.priceFromFull, partial: false } : { value: x.priceFrom, partial: true };
}

/** «от 1,4 млн ₽» / «от 2,3 млн ₽ без утильсбора» — короткая подпись для плиток и чипов */
export const fromShort = (x) => { const f = fromPrice(x); return f ? `от ${priceShort(f.value)}${f.partial ? ' без утильсбора' : ''}` : 'по запросу'; };

/** Ячейка «цена» для таблиц: вилка по авто с полной ценой; если полных цен нет — «от X без утильсбора» */
function priceCell(cars) {
  const full = cars.filter((c) => c.priceRub && !c.priceIsPartial).map((c) => c.priceRub);
  if (full.length) return Math.min(...full) === Math.max(...full) ? price(full[0]) : `от ${price(Math.min(...full))} до ${price(Math.max(...full))}`;
  const part = cars.filter((c) => c.priceRub).map((c) => c.priceRub);
  return part.length ? `от ${price(Math.min(...part))} <span class="muted">без утильсбора</span>` : 'по запросу';
}

/** Таблица цен: как table() из ui.mjs, но с классом table--prices — на телефоне помещается без прокрутки (50-catalog.css) */
function priceTable(head, rows, numCols = []) {
  return html`
        <div class="table-wrap">
          <table class="table table--prices">
            <thead><tr>${head.map((h, i) => `<th${numCols.includes(i) ? ' class="num"' : ''}>${h}</th>`)}</tr></thead>
            <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${numCols.includes(i) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`)}</tbody>
          </table>
        </div>`;
}

/**
 * Сетка автомобилей с фильтрами. Все карточки — в HTML; js/catalog.js только скрывает и сортирует.
 * priority: false — листинг начинается ниже первого экрана, приоритетную загрузку первому фото не ставим.
 */
export function carsBlock(ctx, cars, { scope, heading = 'Все автомобили', quizFilters = false, pageSize = 24, country, subject = 'Подбор автомобиля (каталог)', tag = 'h3', priority = true } = {}) {
  return html`
    <section class="section section--sm section--flush-top catalog-listing" data-catalog-list data-catalog-quiz="podbor">
        <div class="container">
          <h2 class="sr-only">${esc(heading)}</h2>
          ${filtersBar(cars, { scope, quizFilters })}
          ${resultsHead(cars.length)}
          ${filteredEmpty({ visible: !cars.length })}
          <div class="${cx('grid grid--4 cars-grid', cars.length > 1 && 'cars-grid--duo')}" data-cars data-page-size="${pageSize}">
            ${cars.toSorted((a, b) => Number(Boolean(b.modelInTop30)) - Number(Boolean(a.modelInTop30)))
              .map((c, i) => carCard(c, { i: i % 4, tag, priority: priority && i === 0 }))}
          </div>
          <div class="cars-more" hidden><button class="btn btn--ghost" type="button" data-cars-more><span>Показать еще</span></button></div>
        </div>
    </section>
    ${quizSection(ctx, { cars, country, brand: scope?.brand, model: scope?.model, subject })}`;
}

/** Заголовок колонки цены: «под ключ» — только если у всех автомобилей таблицы цена полная */
const priceHead = (cars) => (cars.some((c) => c.priceIsPartial) ? 'Цена во Владивостоке' : 'Цена под ключ');

/** Таблица «цены по моделям»: строки = модели, со ссылками */
export function modelsPriceTable(models) {
  if (!models.length) return '';
  return priceTable(
    ['Модель', 'Годы выпуска', 'Вариантов', priceHead(models.flatMap((m) => m.cars))],
    models.map((m) => [
      `<a href="${u(m.url)}"><strong>${esc(m.brand)} ${esc(m.name)}</strong></a>`,
      m.yearFrom === m.yearTo ? String(m.yearFrom) : `${m.yearFrom}-${m.yearTo}`,
      String(m.count),
      priceCell(m.cars),
    ]),
    [2, 3]
  );
}

/** Таблица «цены по годам» для страницы модели */
export function yearsPriceTable(cars) {
  const byYear = new Map();
  for (const c of cars) {
    if (!c.year || !c.priceRub) continue;
    const g = byYear.get(c.year) || { year: c.year, cars: [], km: [] };
    g.cars.push(c);
    if (c.mileageKm || c.mileageKm === 0) g.km.push(c.mileageKm);
    byYear.set(c.year, g);
  }
  const rows = [...byYear.values()].sort((x, y) => y.year - x.year);
  if (!rows.length) return '';
  return priceTable(
    ['Год выпуска', 'Пробег', 'Вариантов', cars.some((c) => c.priceIsPartial) ? 'Цена во Владивостоке' : 'Цена под ключ во Владивостоке'],
    rows.map((g) => [
      `<strong>${g.year}</strong>`,
      g.km.length ? (Math.min(...g.km) === Math.max(...g.km) ? km(g.km[0]) : `от ${num(Math.min(...g.km))} до ${km(Math.max(...g.km))}`) : 'нет данных',
      String(g.cars.length),
      priceCell(g.cars),
    ]),
    [1, 2, 3]
  );
}

const PARTS = [
  ['Автомобиль', 'Цена на аукционе или у дилера в стране покупки. Каждую ставку согласуем с вами.'],
  ['Расходы в стране', 'Аукционный сбор, доставка до порта, экспортные документы и фрахт до Владивостока.'],
  ['Таможня', 'Пошлина, утилизационный сбор и сбор за оформление. Расчет и оформление берем на себя.'],
  ['Документы', 'СБКТС и электронный ПТС, лаборатория, стоянка: все для постановки на учет.'],
  ['Услуги компании', 'Вознаграждение за подбор, проверку и сопровождение сделки. Размер согласуется до покупки.'],
];

/** Секция «Из чего складывается цена под ключ» */
export function priceParts({ white = false } = {}) {
  return html`
    <section class="${cx('section', white && 'section--white')}">
      <div class="container">
        ${sectionHead({
          label: 'Цена под ключ',
          title: duo('Из чего складывается', 'итоговая стоимость'),
          lead: 'В каталоге указана цена автомобиля во Владивостоке со всеми платежами. Если утилизационный сбор в нее не вошел, это отмечено в карточке. Доставка в ваш город считается отдельно.',
          actions: btn('Рассчитать в калькуляторе', R.calculator, { variant: 'dark' }),
        })}
        <div class="price-parts">
          ${PARTS.map(([t, x], i) => `<div class="price-part"${reveal(i)}><h3>${esc(t)}</h3><p>${typo(x)}</p></div>`)}
        </div>
      </div>
    </section>`;
}

/** Сравнение трех стран; колонка текущей подсвечена */
export function countryCompare(ctx, current) {
  const rows = ctx.content.countryCompare;
  if (!rows?.length) return '';
  const cols = ctx.countries;
  return html`
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th></th>${cols.map((c) => `<th${c.slug === current ? ' class="is-here"' : ''}>${c.slug === current ? esc(c.navTitle) + ' (вы здесь)' : `<a href="${u(R.country(c.slug))}">${esc(c.navTitle)}</a>`}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td>${cols.map((c) => `<td${c.slug === current ? ' class="is-here"' : ''}>${typo(r[c.slug] || 'нет данных')}</td>`).join('')}</tr>`)}
            </tbody>
          </table>
        </div>`;
}

/** Плитки моделей с фото */
export function modelTiles(models) {
  return html`
        <div class="tiles">
          ${models.map(
            (m, i) => html`
          <a class="tile" href="${u(m.url)}"${reveal(Math.min(i % 5, 4))}>
            <span class="tile__name">${esc(m.brand)} ${esc(m.name)}</span>
            <span class="tile__meta"><span>${m.count} ${plural(m.count, ['вариант', 'варианта', 'вариантов'])} · ${fromShort(m)}</span>${icon('arrow')}</span>
          </a>`
          )}
        </div>`;
}

/** Плитки марок */
export function brandTiles(brands, { from = '' } = {}) {
  return html`
        <div class="tiles">
          ${brands.map(
            (b, i) => html`
          <a class="tile" href="${u(b.url)}"${reveal(Math.min(i % 5, 4))}>
            <span class="tile__name">${esc(b.name)}${from ? ` <span class="mute">${esc(from)}</span>` : ''}</span>
            <span class="tile__meta"><span>${b.models.slice(0, 3).map((m) => esc(m.name)).join(', ')}${b.models.length > 3 ? '…' : ''} · ${fromShort(b)}</span>${icon('arrow')}</span>
          </a>`
          )}
        </div>`;
}
