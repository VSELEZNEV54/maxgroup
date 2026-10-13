// Блоки каталога: панель фильтров, сетка автомобилей, таблица цен, «что входит в цену», сравнение стран.
import { html, esc, u, price, priceShort, km, num, typo, uniq, plural, count, cx } from '../lib/core.mjs';
import { icon, label, carCard, btn, reveal, duo, sectionHead } from './ui.mjs';
import { R } from '../routes.mjs';

const select = (key, title, options, cls = '') =>
  options.length > 1
    ? `<label class="${cx('filter', cls)}"><span class="sr-only">${esc(title)}</span><select data-filter="${key}" aria-label="${esc(title)}"><option value="">${esc(title)}</option>${options.map((o) => `<option value="${esc(o.value)}">${esc(o.name)}</option>`).join('')}</select></label>`
    : '';

const COUNTRY_NAME = { japan: 'Япония', korea: 'Корея', china: 'Китай' };

/**
 * Цена «от» для текстов листинга. x — марка, модель, подборка или срез с полями priceStats() (src/data/index.mjs).
 * Цену без утилизационного сбора нельзя называть «под ключ»: если в списке есть авто с полной ценой,
 * «от» считается по ним; если нет — берётся минимальная и partial = true («от X без утильсбора»).
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
  if (full.length) return Math.min(...full) === Math.max(...full) ? price(full[0]) : `${price(Math.min(...full))} — ${price(Math.max(...full))}`;
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

/** Панель фильтров. Варианты строятся только из автомобилей текущей страницы — пустых фильтров не бывает. */
export function filtersBar(cars, { hide = [] } = {}) {
  const has = (k) => !hide.includes(k);
  const opts = (fn, nameFn = (v) => v) => {
    const m = new Map();
    for (const c of cars) { const v = fn(c); if (v) m.set(v, (m.get(v) || 0) + 1); }
    return [...m.entries()].sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0]))).map(([v, n]) => ({ value: v, name: `${nameFn(v)} · ${n}` }));
  };
  const prices = cars.map((c) => c.priceRub).filter(Boolean);
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const priceSteps = [1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 4_000_000, 5_000_000, 7_000_000].filter((p) => p > minPrice && p < maxPrice);
  const years = uniq(cars.map((c) => c.year).filter(Boolean)).sort((x, y) => y - x);
  const brandNames = new Map(cars.map((c) => [c.brandSlug, c.brand]));
  const modelNames = new Map(cars.map((c) => [c.modelSlug, `${c.brand} ${c.model}`]));
  const parts = [
    has('country') ? select('country', 'Страна', opts((c) => c.country, (v) => COUNTRY_NAME[v] || v)) : '',
    has('brand') ? select('brand', 'Марка', opts((c) => c.brandSlug, (v) => brandNames.get(v))) : '',
    has('model') ? select('model', 'Модель', opts((c) => c.modelSlug, (v) => modelNames.get(v))) : '',
    has('price') && priceSteps.length ? `<label class="filter"><span class="sr-only">Цена до</span><select data-filter="price-max" aria-label="Цена до"><option value="">Цена до</option>${priceSteps.map((p) => `<option value="${p}">до ${priceShort(p)}</option>`).join('')}</select></label>` : '',
    has('year') && years.length > 1 ? `<label class="filter"><span class="sr-only">Год от</span><select data-filter="year-min" aria-label="Год выпуска от"><option value="">Год от</option>${years.slice(1).map((y) => `<option value="${y}">от ${y}</option>`).join('')}</select></label>` : '',
    has('body') ? select('body', 'Кузов', opts((c) => c.body, (v) => v[0].toUpperCase() + v.slice(1))) : '',
    has('fuel') ? select('fuel', 'Двигатель', opts((c) => c.engine?.type, (v) => v[0].toUpperCase() + v.slice(1))) : '',
    has('drive') ? select('drive', 'Привод', opts((c) => c.drive)) : '',
    has('hp') && cars.some((c) => c.engine?.powerHp && c.engine.powerHp <= 160) && cars.some((c) => c.engine?.powerHp > 160)
      ? `<label class="filter"><span class="sr-only">Мощность</span><select data-filter="hp-max" aria-label="Мощность"><option value="">Мощность</option><option value="160">до 160 л.с.</option><option value="200">до 200 л.с.</option><option value="250">до 250 л.с.</option></select></label>`
      : '',
  ].filter(Boolean);
  return html`
        <div class="filters" data-filters>
          <div class="filters__row">
            ${parts}
            <button class="filters__reset" type="button" data-filters-reset hidden>Сбросить ${icon('close')}</button>
            <span class="filters__spacer"></span>
            <label class="filter"><span class="sr-only">Сортировка</span><select data-sort aria-label="Сортировка">
              <option value="">По умолчанию</option>
              <option value="price-asc">Сначала дешевле</option>
              <option value="price-desc">Сначала дороже</option>
              <option value="year-desc">Сначала новее</option>
              <option value="mileage-asc">Меньше пробег</option>
            </select></label>
          </div>
        </div>`;
}

/** Плитка-заявка внутри сетки */
export function promoTile({ title = 'Не нашли нужный автомобиль?', text = 'В каталоге — примеры. Подберём под ваш запрос на аукционах и площадках и пришлём расчёт под ключ.', subject = 'Подбор автомобиля (каталог)', car, accent = false } = {}) {
  return html`
          <div class="${cx('promo-tile', accent && 'promo-tile--accent')}" data-grid-extra>
            <div>
              ${label('Подбор под запрос')}
              <p class="promo-tile__title">${typo(title)}</p>
              <p>${typo(text)}</p>
            </div>
            ${btn('Подобрать автомобиль', R.contacts, { variant: 'light', modal: 'request', subject, attrs: { 'data-modal-title': 'Подберём автомобиль под ваш запрос', 'data-modal-car': car || null } })}
          </div>`;
}

/** Подпись к ценам листинга: «под ключ» — только там, где в цену вошёл утилизационный сбор */
function pricesNote(cars) {
  const partial = cars.filter((c) => c.priceIsPartial).length;
  if (!partial) return 'Цены — под ключ во Владивостоке, с таможенными платежами.';
  if (partial === cars.length) return 'Цены — во Владивостоке, без утилизационного сбора: его считаем по документам автомобиля.';
  return 'Цены — под ключ во Владивостоке, с таможенными платежами. Где утильсбор не вошёл в цену, в карточке указано «без утильсбора».';
}

/**
 * Сетка автомобилей с фильтрами. Все карточки — в HTML; js/catalog.js только скрывает и сортирует.
 * priority: false — листинг начинается ниже первого экрана, приоритетную загрузку первому фото не ставим.
 */
export function carsBlock(cars, { filters = true, hide = [], pageSize = 24, promo = true, promoOpts = {}, tag = 'h3', emptyText, priority = true } = {}) {
  if (!cars.length) {
    return html`
        <div class="empty">
          ${icon('search', 'card__icon')}
          <p class="h3">${typo(emptyText || 'Сейчас в каталоге нет примеров, но мы привезём такой автомобиль под заказ')}</p>
          <p>Оставьте заявку — подберём варианты на аукционах и площадках и пришлём расчёт под ключ.</p>
          ${btn('Оставить заявку', R.contacts, { modal: 'request', subject: 'Подбор автомобиля (пустой раздел каталога)' })}
        </div>`;
  }
  return html`
        ${filters && cars.length > 4 ? filtersBar(cars, { hide }) : ''}
        <div class="results-head">
          <div class="results-head__count" data-results-count aria-live="polite">${count(cars.length, ['автомобиль', 'автомобиля', 'автомобилей'])}</div>
          <p class="muted small">${typo(pricesNote(cars))} <a class="link" href="${u(R.calculator)}">Как считается цена</a></p>
        </div>
        <div class="${cx('grid grid--4 cars-grid', cars.length > 1 && 'cars-grid--duo')}" data-cars data-page-size="${pageSize}">
          ${cars.map((c, i) => carCard(c, { i: i % 4, tag, priority: priority && i === 0 }))}
          ${promo ? promoTile(promoOpts) : ''}
        </div>
        <div class="cars-more" hidden><button class="btn btn--ghost" type="button" data-cars-more><span>Показать ещё</span> ${icon('arrow-down')}</button></div>
        <div class="empty" data-cars-empty hidden>
          ${icon('search', 'card__icon')}
          <p class="h3">По таким параметрам примеров нет</p>
          <p>Это не значит, что автомобиля нет на рынке: подберём его под заказ.</p>
          <div class="btn-row">
            <button class="btn btn--ghost" type="button" data-filters-reset-all>Сбросить фильтры</button>
            ${btn('Подобрать под запрос', R.contacts, { modal: 'request', subject: 'Подбор автомобиля (фильтр без результатов)' })}
          </div>
        </div>`;
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
      m.yearFrom === m.yearTo ? String(m.yearFrom) : `${m.yearFrom}–${m.yearTo}`,
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
      g.km.length ? (Math.min(...g.km) === Math.max(...g.km) ? km(g.km[0]) : `${num(Math.min(...g.km))} — ${km(Math.max(...g.km))}`) : '—',
      String(g.cars.length),
      priceCell(g.cars),
    ]),
    [1, 2, 3]
  );
}

const PARTS = [
  ['Автомобиль', 'Цена на аукционе или у дилера в стране покупки. Каждую ставку согласуем с вами.'],
  ['Расходы в стране', 'Аукционный сбор, доставка до порта, экспортные документы и фрахт до Владивостока.'],
  ['Таможня', 'Пошлина, утилизационный сбор и сбор за оформление. Расчёт и оформление берём на себя.'],
  ['Документы', 'СБКТС и электронный ПТС, лаборатория, стоянка — всё для постановки на учёт.'],
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
          lead: 'В каталоге указана цена автомобиля во Владивостоке со всеми платежами. Если утилизационный сбор в неё не вошёл, это отмечено в карточке. Доставка в ваш город считается отдельно.',
          actions: btn('Рассчитать в калькуляторе', R.calculator, { variant: 'dark' }),
        })}
        <div class="price-parts">
          ${PARTS.map(([t, x], i) => `<div class="price-part"${reveal(i)}><h3>${esc(t)}</h3><p>${typo(x)}</p></div>`)}
        </div>
      </div>
    </section>`;
}

/** Сравнение трёх стран; колонка текущей подсвечена */
export function countryCompare(ctx, current) {
  const rows = ctx.content.countryCompare;
  if (!rows?.length) return '';
  const cols = ctx.countries;
  return html`
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th></th>${cols.map((c) => `<th${c.slug === current ? ' class="is-here"' : ''}>${c.slug === current ? esc(c.navTitle) + ' — вы здесь' : `<a href="${u(R.country(c.slug))}">${esc(c.navTitle)}</a>`}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td>${cols.map((c) => `<td${c.slug === current ? ' class="is-here"' : ''}>${typo(r[c.slug] || '—')}</td>`).join('')}</tr>`)}
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
