// На вложенных страницах марка и модель ведут в соответствующий раздел каталога.
import { html, esc, attrs, u, a, count, slugify } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { generationsFor } from '../data/generations.mjs';
import { modelParts, OFFER_LIFETIME } from '../data/model-offers.mjs';
import { selectControl } from './select.mjs';
import { R } from '../routes.mjs';

const countryNames = { japan: 'Япония', korea: 'Корея', china: 'Китай' };
const carsWord = ['автомобиль', 'автомобиля', 'автомобилей'];

function choices(cars, value, label = value) {
  const rows = new Map();
  for (const car of cars) {
    const key = value(car);
    if (key) rows.set(key, { value: key, name: label(car) });
  }
  return [...rows.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru', { numeric: true }));
}

export function inventoryCounts(cars) {
  const groups = new Map();
  for (const { country, brandSlug: brand, modelSlug: model } of cars) {
    const key = [country, brand, model].join('/');
    if (!groups.has(key)) groups.set(key, { country, brand, model, count: 0 });
    groups.get(key).count++;
  }
  return [...groups.values()];
}

export function ranked(options, rows, key) {
  const totals = new Map();
  for (const row of rows) totals.set(row[key], (totals.get(row[key]) || 0) + row.count);
  return options.map((o) => ({ ...o, count: o.profile ? o.stock : totals.get(o.value) || 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru', { numeric: true }));
}

// У некоторых комплектаций есть свой каталог предложений, но нет примера лота
// в основной сетке. Такой пункт открывает существующую страницу этой модели.
export function includeModelProfiles(ctx, cars, country, scope = {}) {
  const brands = new Map((scope.brands || choices(cars, (c) => c.brandSlug, (c) => c.brand)).map((b) => [b.value, { ...b }]));
  const models = new Map((scope.models || choices(cars, (c) => c.modelSlug, (c) => c.model)).map((m) => [m.value, m]));
  if (scope.model) {
    for (const m of ctx.models.filter((m) => m.country === country && m.brandSlug === scope.brand)) {
      if (!models.has(m.slug)) models.set(m.slug, { value: m.slug, name: m.name, url: m.url });
    }
  }
  const extra = new Map();
  for (const p of ctx.popularModels) {
    if (country && p.country !== country) continue;
    const parts = modelParts(p.name);
    const name = parts.brand.replace(' (Samsung)', '');
    const make = slugify(name);
    const value = slugify(parts.model);
    if (!brands.has(make)) brands.set(make, { value: make, name,
      url: scope.brand ? R.country(p.country) + '?brand=' + make : null });
    const b = brands.get(make);
    (b.markets ||= new Set()).add(p.country);
    if ((scope.brand && scope.brand !== make) || models.has(value)) continue;
    const options = extra.get(value) || [];
    options.push({ value, name: parts.model, make, markets: [p.country], url: p.pricesUrl });
    extra.set(value, options);
  }
  for (const group of extra.values()) {
    for (const option of group) {
      if (group.length > 1) {
        option.value += '@' + option.markets[0];
        option.name += ' · ' + countryNames[option.markets[0]];
      }
      models.set(option.value, option);
    }
  }
  const profiles = new Map(ctx.popularModels.flatMap((p) => [[p.url, p], [p.pricesUrl, p]]));
  for (const option of models.values()) {
    const p = profiles.get(option.value === scope.model && scope.profile ? scope.profile : option.url);
    if (!p) continue;
    option.profile = p.url;
    option.until = Date.parse(p.offers?.checkedAt) + OFFER_LIFETIME || 0;
    option.stock = option.until > Date.now() ? p.offers.cars.length : 0;
  }
  return { ...scope, brands: [...brands.values()], models: [...models.values()],
    market: scope.brand ? country : undefined,
    facets: scope.brand ? inventoryCounts(ctx.cars.filter((c) => c.country === country)) : undefined };
}

function selectField(key, title, placeholder, options, current = '', allUrl) {
  const isSort = key === 'sort';
  const vehicle = key === 'brand' || key === 'model';
  return selectControl({ id: 'catalog-' + key, kind: key, label: title, search: vehicle, custom: vehicle,
    attributes: { 'data-sort': isSort, 'data-filter': isSort ? null : key, 'data-default': current },
    options: html`${placeholder ? `<option value=""${attrs({ 'data-url': allUrl && u(allUrl) })}>${esc(placeholder)}</option>` : ''}
      ${options.map(({ value, name, url, make, markets, count, profile, until }) => `<option value="${esc(value)}"${attrs({ selected: value === current,
        label: vehicle ? `${name} (${count})` : null, 'data-count': count, 'data-profile': profile, 'data-until': until,
        'data-make': make, 'data-markets': markets ? [...markets].join(' ') : null,
        'data-logo': key === 'brand' ? a('img/makes/' + value + '.webp') : null,
        'data-url': url && value !== current ? u(url) : null })}>${esc(name)}</option>`)}` });
}

function rangeFields(key, label, unit = '') {
  return html`<fieldset class="field filter-range" data-range="${key}">
    <legend class="field__label">${label}${unit ? ', ' + unit : ''}</legend>
    <div class="filter-range__inputs">${[['min', 'от'], ['max', 'до']].map(([bound, hint]) => html`
      <input class="field__control" type="text" inputmode="numeric" autocomplete="off"
        data-filter="${key}-${bound}" aria-label="${label} ${hint}${unit ? ', ' + unit : ''}" placeholder="${hint}" maxlength="${key === 'year' ? 4 : 16}">`)}</div>
    <span class="field__error" id="filter-${key}-error">Значение «от» больше «до»</span>
  </fieldset>`;
}

function generationOptions(cars, scope) {
  const data = {};
  const pairs = scope.model ? [[scope.brand, scope.model]] : cars.map((c) => [c.brandSlug, c.modelSlug]);
  for (const [brand, model] of pairs) {
    const key = brand + '/' + model;
    if (data[key]) continue;
    data[key] = generationsFor(brand, model).map((g) => ({
      id: g.id, label: g.label, from: g.from, to: g.to, codes: g.codes, photo: g.photo,
    }));
  }
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function filtersBar(cars, { scope = {}, quizFilters = false } = {}) {
  const rows = scope.facets || inventoryCounts(cars);
  const brands = ranked(scope.brands || choices(cars, (c) => c.brandSlug, (c) => c.brand), rows, 'brand');
  const models = ranked(scope.models || choices(cars, (c) => c.modelSlug, (c) => c.model),
    scope.brand ? rows.filter((r) => r.brand === scope.brand) : rows, 'model');
  const optional = (key, label, values) => values.length > 1 ? selectField(key, label, 'Все варианты', values) : '';
  const extra = [
    optional('country', 'Страна', choices(cars, (c) => c.country, (c) => countryNames[c.country])),
    optional('body', 'Кузов', choices(cars, (c) => c.body)),
    optional('fuel', 'Двигатель', choices(cars, (c) => c.engine?.type || c.fuel)),
    optional('drive', 'Привод', choices(cars, (c) => c.drive)),
    quizFilters ? selectField('age', 'Возраст', 'Любой возраст', [
      { value: 'le3', name: 'До 3 лет' }, { value: '3to5', name: 'От 3 до 5 лет' }, { value: 'gt5', name: 'Старше 5 лет' },
    ]) : '',
    cars.some((c) => c.engine?.powerHp > 160) && cars.some((c) => c.engine?.powerHp <= 160) ? selectField('hp-max', 'Мощность', 'Любая мощность',
      [160, 200, 250].map((n) => ({ value: String(n), name: 'до ' + n + ' л.с.' }))) : '',
  ].filter(Boolean);
  return html`<form id="catalog-filters" class="filters" data-filters data-images="${u('/assets/img')}" aria-label="Фильтры автомобилей"${attrs({ 'data-facet-market': scope.market, 'data-facets': scope.facets && JSON.stringify(rows) })}>
    <script type="application/json" data-generation-options>${generationOptions(cars, scope)}</script>
    <button class="filters__toggle" type="button" data-filter-toggle aria-expanded="false" aria-controls="catalog-fields" hidden>
      ${icon('filter')}<span>Фильтры</span><span class="filters__badge" data-filter-badge hidden></span>${icon('chevron', 'filters__caret')}
    </button>
    <div class="filters__panel" id="catalog-fields">
      <div class="filters__grid">
        ${selectField('brand', 'Марка', 'Все марки', brands, scope.brand, scope.countryUrl)}
        ${selectField('model', 'Модель', 'Все модели', models, scope.model, scope.brandUrl)}
        ${selectField('generation', 'Поколение', 'Сначала выберите модель', [])}
        ${rangeFields('price', 'Цена', '₽')}${rangeFields('year', 'Год выпуска')}${rangeFields('mileage', 'Пробег', 'км')}
      </div>
      <div class="filters__footer">
        ${extra.length ? html`<details class="filters__extra">
          <summary>Дополнительные фильтры</summary><div class="filters__grid">${extra}</div>
        </details>` : ''}
        <div class="filters__actions">
          <button class="filters__reset" type="button" data-filters-reset hidden>Сбросить</button>
          <button class="btn btn--primary" type="submit" data-filter-show>Показать ${count(cars.length, carsWord)}</button>
        </div>
      </div>
    </div>
  </form>`;
}

export function resultsHead(total) {
  return html`<div class="results-head" data-results-head${attrs({ hidden: !total })}>
    <p class="results-head__count" data-results-count aria-live="polite">${count(total, carsWord)}</p>
    ${selectField('sort', 'Сортировка', '', [
      { value: 'popular', name: 'По популярности' },
      { value: 'price-asc', name: 'Сначала дешевле' }, { value: 'price-desc', name: 'Сначала дороже' },
      { value: 'grade-desc', name: 'Сначала высокая оценка' }, { value: 'grade-asc', name: 'Сначала низкая оценка' },
      { value: 'year-desc', name: 'Сначала новее' }, { value: 'mileage-asc', name: 'Меньше пробег' },
    ], 'popular')}
  </div>`;
}

export function filteredEmpty({ visible = false } = {}) {
  return html`<div class="empty" data-cars-empty${attrs({ hidden: !visible })}>
    <p class="h3">По этим параметрам автомобилей нет</p>
    <div class="btn-row">
      <button class="btn btn--ghost" type="button" data-filters-reset-all>Сбросить фильтры</button>
    </div>
  </div>`;
}
