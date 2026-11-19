// Калькулятор «под ключ»: полный блок для страницы /kalkulyator/ и мини-блок для главной и страниц стран.
// Расчет — js/calc-core.js, разметка результата — js/calc.js (MGCalc.view): генератор вызывает те же функции,
// что и браузер, поэтому числа и HTML в исходной странице совпадают с тем, что покажет скрипт.
//
// Страница, на которой стоит fullCalc() или miniCalc(), обязана подключить скрипты: scripts: ['calc-core', 'calc'].
import { html, esc, u, typo, cx, attrs } from '../lib/core.mjs';
import { icon, img, label, duo, btn, reveal, note } from './ui.mjs';
import { R } from '../routes.mjs';
import { selectControl } from './select.mjs';
import '../js/calc-core.js';
import '../js/calc.js';

/** Ядро расчета (то же, что window.MGCalc в браузере) */
export const calcCore = globalThis.MGCalc;
const core = calcCore;
const { view, fmt } = core;

/* Типовые начальные параметры. Исходная цена указана в валюте страны. */
const COUNTRY_DEFAULTS = {
  japan: { price: 1100000, year: 2022, cc: 1317, hp: 98, body: 'sedan' },
  korea: { price: 21000000, year: 2022, cc: 1999, hp: 160, body: 'sedan' },
  china: { price: 135000, year: 2025, cc: 1998, hp: 155, body: 'crossover' },
};

const FUEL_HINT = { mild: 'MHEV', parallel: 'Prius, e:HEV', series: 'e-Power, Li, Aito' };
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const cache = new WeakMap();

/** Компактная выжимка правил расчета (≈ 10 КБ) с адресами и падежами городов сайта */
export function calcRules(ctx) {
  if (!ctx.calc) throw new Error('Калькулятор: нет data/source/calc-rules.json');
  if (!cache.has(ctx.calc)) cache.set(ctx.calc, core.compactRules(ctx.calc, { cities: ctx.cities }));
  return cache.get(ctx.calc);
}

/** Та же выжимка строкой JSON — для <script type="application/json" id="calc-rules"> */
export const calcRulesJson = (ctx) => JSON.stringify(calcRules(ctx)).replace(/</g, '\\u003c');

export const calcRulesScript = (ctx) => `<script type="application/json" id="calc-rules">${calcRulesJson(ctx)}</script>`;

/** Ссылка на калькулятор с параметрами (уже экранирована для атрибута href) */
export const calcHref = (params = {}) => {
  const q = view.query(params);
  return esc(u(R.calculator) + (q ? '?' + q : ''));
};

/**
 * Контрольные примеры из calc-rules.json в виде параметров формы калькулятора: год и месяц выпуска, город и тип кузова
 * берутся из заголовка примера («…выпуск 11.2021, Япония → Новосибирск») и суммы доставки. Этими же параметрами
 * tools/test-calc.mjs сверяет ядро с эталоном.
 */
export function exampleInputs(raw) {
  const byName = new Map(raw.delivery.cities.map((c) => [c.city, c]));
  let prev = null;
  return raw.examples.items.map((ex) => {
    const i = ex.input;
    const m = i.title.match(/выпуск\s+(?:(\d{2})\.)?(\d{4})/);
    const cityName = (i.title.match(/→\s*([А-ЯЁ][^(,]*?)(?:\s*\(|$)/) || [])[1];
    let city = cityName ? byName.get(cityName.trim()) : null;
    let body = 'sedan';
    if (!city && i.delivery && prev) ({ city, body } = prev); // «Тот же Prius…» — маршрут предыдущего примера
    else if (city) body = ['sedan', 'crossover', 'suv'].find((b) => city.truckRub[b] === i.delivery) || 'sedan';
    prev = { city, body };
    return {
      id: i.id,
      title: i.title,
      example: ex,
      input: { country: i.country, price: i.price, year: m ? +m[2] : 0, month: m && m[1] ? +m[1] : 0, fuel: i.powertrain, cc: i.cc || 0, hp: i.iceHp || 0, e30: i.e30Kw || 0, city: city && city.distanceKm ? city.slug : '', body },
    };
  });
}

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const json = (o) => esc(JSON.stringify(o));
const years = (rules, from = 2007) => {
  const top = Number(rules.date.slice(0, 4));
  return Array.from({ length: top - from + 1 }, (_, i) => top - i);
};

function numField({ name, labelHtml, value, suffix, group: grouped, hint, max = 4, placeholder, decimal }) {
  return html`
            <label class="field calc-field">
              <span class="field__label">${labelHtml}</span>
              <span class="calc-field__box">
                <input class="field__control" type="text" name="${name}" inputmode="${decimal ? 'decimal' : 'numeric'}" autocomplete="off" maxlength="${grouped ? 14 : max + (decimal ? 3 : 0)}" value="${esc(value ?? '')}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${grouped ? ' data-calc-group' : ''}>
                ${suffix ? `<span class="calc-field__suffix">${suffix}</span>` : ''}
              </span>
              ${hint || ''}
            </label>`;
}

function purchaseField(r, id, unit = 'RUB') {
  const rubles = unit === 'RUB';
  const amount = rubles ? r.carRub : Math.round(r.input.currency === 'RUB' ? r.input.price / r.rates.cur : r.input.price);
  return html`<div class="field calc-field calc-purchase">
    <div class="calc-purchase__head">
      <label class="field__label" for="${id}">Цена покупки</label>
      <div class="opts calc-units" role="radiogroup" aria-label="Валюта цены">
        <label class="opt"><input type="radio" name="currency" value="RUB"${rubles ? ' checked' : ''}><span>Рубли ₽</span></label>
        <label class="opt"><input type="radio" name="currency" value="local"${rubles ? '' : ' checked'}><span data-calc-out="local-unit">${view.localUnit(r)}</span></label>
      </div>
    </div>
    <div class="calc-field__box">
      <input class="field__control" id="${id}" name="price" type="text" inputmode="numeric" maxlength="14" autocomplete="off"
        data-calc-group data-price="${r.input.price}" data-currency="${r.input.currency}" value="${amount ? group(amount) : ''}" aria-describedby="${id}-hint">
      <span class="calc-field__suffix" data-calc-out="cur">${rubles ? '₽' : esc(r.currency.sign)}</span>
    </div>
    <span class="calc-hint" id="${id}-hint" data-calc-out="price-rub">${esc(view.priceHint(r, unit))}</span>
  </div>`;
}

const flag = (ctx, slug) => img({ src: 'assets/' + ctx.countryBySlug[slug].flag, cls: 'country-label__flag', alt: '', lazy: false });

function tip(key, t) {
  if (!t) return '';
  const id = 'calc-tip-' + key;
  return html`<div class="calc-tip">
    <button type="button" class="calc-tip__trigger" id="${id}-button" popovertarget="${id}">${icon('info')}<span>${esc(t.q)}</span></button>
    <div class="calc-tip__panel" id="${id}" popover="auto" role="region" aria-labelledby="${id}-button">
      <p>${typo(t.a)}</p>
      <button type="button" class="calc-tip__close" aria-label="Закрыть подсказку" popovertarget="${id}" popovertargetaction="hide">${icon('close')}</button>
    </div>
  </div>`;
}

const pills = (name, items, current, hint = {}, aria = '') =>
  `<div class="opts calc-opts" role="radiogroup"${aria ? ` aria-label="${esc(aria)}"` : ''}>${items
    .map(([value, text]) => `<label class="opt"><input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}><span>${esc(text)}${hint[value] ? `<small>${esc(hint[value])}</small>` : ''}</span></label>`)
    .join('')}</div>`;

/**
 * Полный калькулятор: форма слева, закрепленный итог справа, расшифровка по строкам под ними.
 * @param {object} o
 * @param {object} [o.state] — стартовые значения (по умолчанию типовой автомобиль из Японии)
 * @param {object} [o.tips] — тексты подсказок {passing, hp160, hybrid, e30, personal, markup} → {q, a}
 * @param {object} [o.links] — ссылки для подсказок «что изменило бы сумму»: {passing: {url, text}, hp160: {…}}; url — адрес из routes.mjs
 * @param {Array} [o.budgets] — [{max, url, text}] — ссылка «автомобили в этот бюджет»
 * @param {string} [o.subject] — тема заявки
 */
export function fullCalc(ctx, { state, tips = {}, links = {}, budgets = [], subject = 'Точный расчет из калькулятора' } = {}) {
  const rules = calcRules(ctx);
  links = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, { ...v, url: u(v.url) }])); // адреса сайта → ссылки с учетом режима сборки
  const country = state?.country || 'japan';
  const s = { country, fuel: 'ice', ...COUNTRY_DEFAULTS[country], month: 0, city: '', personal: true, markup: false, ...state };
  const r = core.calc(s, rules);
  const mode = r.delivery.city ? 'city' : 'vl';
  const dec = (n) => (n ? String(n).replace('.', ',') : '');
  const ratesDate = fmt.dateShort(Date.parse(rules.date));
  const showIce = 'ice mild parallel';
  const showMotor = 'parallel series ev';
  const hidden = (list) => (list.split(' ').includes(r.fuel.slug) ? '' : ' hidden');
  const modalAttrs = {
    'data-modal': 'request',
    'data-modal-subject': subject,
    'data-modal-label': 'Точный расчет',
    'data-modal-title': 'Пришлем точный расчет',
    'data-modal-text': 'Параметры из калькулятора уже в заявке. Менеджер проверит их по конкретному автомобилю и пришлет расчет под него.',
    'data-calc-request': true,
  };

  return html`
        <div class="calc" data-calc data-calc-links="${json(links)}" data-calc-defaults="${json(COUNTRY_DEFAULTS)}">
          <div class="note calc-ref" data-calc-ref role="note" hidden>${icon('info')}<div>${typo(`<b>Параметры перенесены из карточки автомобиля.</b> Калькулятор считает по курсам ЦБ и ставкам на ${ratesDate} и по типовым расходам. Цена в карточке рассчитана на сайте на дату публикации, поэтому суммы могут отличаться. Если мощности в карточке не было, укажите ее: от нее зависит утилизационный сбор.`)}</div></div>

          <div class="calc__grid">
            <form id="calc-inputs" class="calc__form" data-calc-form novalidate autocomplete="off">
              <fieldset class="calc-card" id="calc-country">
                <legend class="sr-only">Страна и цена автомобиля</legend>
                <div class="calc-card__head"><span class="calc-card__num">01</span><h3 class="calc-card__title">Страна и цена</h3></div>
                <div class="calc-card__body">
                  <div class="calc-countries" role="radiogroup" aria-label="Страна покупки">
                    ${Object.entries(core.COUNTRIES).map(
                      ([slug, c]) => `<label class="calc-country"><input type="radio" name="country" value="${slug}"${slug === r.country.slug ? ' checked' : ''}><span>${flag(ctx, slug)}<b>${esc(c.name)}</b></span></label>`
                    )}
                  </div>
                  ${purchaseField(r, 'calc-price', s.unit)}
                  <div class="calc-notes" data-calc-out="warn-price" aria-live="polite">${view.warnings(r, 'price')}</div>
                </div>
              </fieldset>

              <fieldset class="calc-card" id="calc-age">
                <legend class="sr-only">Год и месяц выпуска</legend>
                <div class="calc-card__head"><span class="calc-card__num">02</span><h3 class="calc-card__title">Год и месяц выпуска</h3></div>
                <div class="calc-card__body">
                  <div class="calc-cols">
                    ${selectControl({ id: 'calc-year', name: 'year', label: 'Год выпуска', fieldClass: 'calc-field', search: true,
                      options: years(rules).map((y) => `<option value="${y}"${y === s.year ? ' selected' : ''}>${y}</option>`) })}
                    ${selectControl({ id: 'calc-month', name: 'month', label: 'Месяц выпуска', fieldClass: 'calc-field',
                      options: html`<option value="0"${!s.month ? ' selected' : ''}>Не знаю</option>${MONTHS.map((m, i) => `<option value="${i + 1}"${s.month === i + 1 ? ' selected' : ''}>${m}</option>`)}` })}
                  </div>
                  <p class="calc-line" data-calc-out="age-line">${view.ageLine(r)}</p>
                  <div class="calc-notes" data-calc-out="warn-age" aria-live="polite">${view.warnings(r, 'age')}</div>
                  <div class="calc-tips">${tip('passing', tips.passing)}</div>
                </div>
              </fieldset>

              <fieldset class="calc-card" id="calc-engine">
                <legend class="sr-only">Двигатель</legend>
                <div class="calc-card__head"><span class="calc-card__num">03</span><h3 class="calc-card__title">Двигатель</h3></div>
                <div class="calc-card__body">
                  ${pills('fuel', Object.entries(core.FUELS).map(([k, v]) => [k, v.name]), r.fuel.slug, FUEL_HINT, 'Тип двигателя')}
                  <div class="calc-cols">
                    <div data-calc-show="${showIce}"${hidden(showIce)}>
                      ${numField({ name: 'cc', labelHtml: 'Объем двигателя', value: s.cc || '', suffix: 'см³', max: 4, placeholder: '1 496' })}
                    </div>
                    <div data-calc-show="${showIce}"${hidden(showIce)}>
                      ${numField({ name: 'hp', labelHtml: 'Мощность двигателя', value: dec(s.hp), suffix: 'л.с.', max: 4, decimal: true, placeholder: '110' })}
                    </div>
                    <div data-calc-show="${showMotor}"${hidden(showMotor)}>
                      ${numField({ name: 'ehp', labelHtml: `<span data-calc-out="ehp-label">${r.fuel.slug === 'parallel' ? 'Мощность электромотора, пиковая' : 'Мощность электромоторов, пиковая'}</span>`, value: dec(s.ehp), suffix: 'л.с.', max: 4, decimal: true, placeholder: '150' })}
                    </div>
                    <div data-calc-show="${showMotor}"${hidden(showMotor)}>
                      ${numField({ name: 'e30', labelHtml: '30-минутная мощность', value: dec(s.e30), suffix: 'кВт', max: 4, decimal: true, placeholder: 'если известна' })}
                    </div>
                  </div>
                  <p class="calc-line" data-calc-out="power-line">${view.powerLine(r)}</p>
                  <div class="calc-notes" data-calc-out="warn-engine" aria-live="polite">${view.warnings(r, 'engine')}</div>
                  <div class="calc-tips">${tip('hp160', tips.hp160)}${tip('hybrid', tips.hybrid)}<div data-calc-show="${showMotor}"${hidden(showMotor)}>${tip('e30', tips.e30)}</div></div>
                  <div class="calc-check">
                    <label class="check"><input type="checkbox" name="personal"${s.personal ? ' checked' : ''}><span>Для личного пользования: первый автомобиль за 12 месяцев, без продажи в течение года</span></label>
                    ${tip('personal', tips.personal)}
                  </div>
                </div>
              </fieldset>

              <fieldset class="calc-card" id="calc-delivery">
                <legend class="sr-only">Доставка по России</legend>
                <div class="calc-card__head"><span class="calc-card__num">04</span><h3 class="calc-card__title">Доставка по России</h3></div>
                <div class="calc-card__body">
                  <div class="calc-cols calc-cols--stack">
                    <div class="field calc-field">
                      <span class="field__label">Тип кузова</span>
                      ${pills('body', Object.entries(core.BODIES).map(([k, v]) => [k, v.name]), r.input.body, {}, 'Тип кузова')}
                    </div>
                    ${selectControl({ id: 'calc-city', name: 'city', label: 'Город получения', fieldClass: 'calc-field', search: true,
                      options: rules.cities.map((c) => `<option value="${c.s}"${c.s === (r.delivery.city || 'vladivostok') ? ' selected' : ''}>${esc(c.n)}${c.s === 'vladivostok' ? ' (самовывоз)' : ''}</option>`) })}
                  </div>
                </div>
              </fieldset>
              <p class="calc__nojs">${icon('info')}Для пересчета при изменении параметров включите JavaScript. Таблицы ставок доступны ниже.</p>
            </form>

            <aside class="calc__side" aria-label="Результат расчета">
              <div class="calc-res on-dark" data-calc-result id="calc-result">
                <div class="calc-res__top">
                  <h3 class="label">Итог под ключ</h3>
                  <div class="calc-switch" role="group" aria-label="Что входит в итог">
                    <button type="button" data-calc-view="vl" aria-pressed="${mode === 'vl'}"><span>Во Владивостоке</span></button>
                    <button type="button" data-calc-view="city" aria-pressed="${mode === 'city'}"><span>С доставкой</span></button>
                  </div>
                </div>
                <div class="calc-live" aria-live="polite" aria-atomic="true">
                  <div class="calc-res__total"><span data-calc-out="total">${view.total(r, mode)}</span></div>
                  <p class="calc-res__caption" data-calc-out="caption">${esc(view.caption(r, mode))}</p>
                </div>
                <div class="calc-bank">
                  <label class="check"><input type="checkbox" name="markup" form="calc-inputs"${s.markup ? ' checked' : ''}>
                    <span>Учесть наценку банка <b data-calc-out="bank-rate">+${fmt.num(r.markup.pct * 100, 1)} %</b></span>
                  </label>
                  ${tip('markup', tips.markup)}
                </div>
                <div class="calc-res__status" data-calc-out="status">${view.status(r)}</div>
                <div class="calc-res__legend" data-calc-out="legend">${view.legend(r, mode)}</div>
                <div class="calc-insights calc-insights--panel" data-calc-insights${r.insights.length ? '' : ' hidden'}>
                  <h4 class="label">Что изменило бы сумму</h4>
                  <ul data-calc-out="insights">${view.insights(r, links)}</ul>
                </div>
                <div class="calc-res__actions">
                  <a class="btn btn--primary btn--block" href="${u(R.contacts)}"${attrs(modalAttrs)}>Получить точный расчет</a>
                  <button class="btn btn--ghost btn--sm btn--block" type="button" data-calc-copy data-copy="${esc(ctx.site.url + R.calculator)}" data-copy-done="Ссылка на расчет скопирована">${icon('share')}Скопировать ссылку</button>
                </div>
                <p class="calc-res__foot">Ставки и курсы ЦБ на ${esc(fmt.dateShort(Date.parse(rules.date)))}, возраст автомобиля на <span data-calc-out="date">${esc(r.dateLabel)}</span>. <a class="link" href="#smeta">Расшифровка по строкам</a></p>
              </div>
            </aside>
          </div>

          <div class="calc__detail" id="smeta">
            <div class="calc__detail-head">
              <h3 class="h3">${duo('Расшифровка:', 'из чего складывается сумма')}</h3>
              ${budgets.length ? `<a class="more" href="${esc(u(budgets[budgets.length - 1].url))}" data-calc-budget="${json(budgets.map((b) => ({ ...b, url: u(b.url) })))}"><span>${esc(budgets[budgets.length - 1].text)}</span> ${icon('arrow')}</a>` : ''}
            </div>
            <div class="calc-groups" data-calc-out="breakdown">${view.breakdown(r, mode)}</div>
            <div class="calc-detail-total">
              <div><h4 class="h4">Итого</h4><p data-calc-out="caption">${esc(view.caption(r, mode))}</p></div>
              <strong class="h3" data-calc-out="total">${view.total(r, mode)}</strong>
            </div>
            <div class="calc__after">
              <div class="calc-insights calc-insights--below" data-calc-insights${r.insights.length ? '' : ' hidden'}>
                ${label('Что изменило бы сумму')}
                <ul data-calc-out="insights">${view.insights(r, links)}</ul>
              </div>
              ${note(
                `<b>Расчет предварительный.</b> Пошлина, сборы, акциз, НДС и утилизационный сбор посчитаны по ставкам, действующим на ${esc(fmt.dateRu(Date.parse(rules.date)))}, и курсам ЦБ на эту дату. Расходы за рубежом, оформление, комиссия и доставка указаны ориентировочно, это не оферта. Точную сумму под конкретный автомобиль менеджер считает до покупки; порядок оплаты и сроки фиксируются в договоре.`
              )}
            </div>
          </div>

          <div class="calc-dock" data-calc-dock>
            <a class="calc-dock__sum" href="#calc-result"><span data-calc-out="caption">${esc(view.caption(r, mode))}</span><b data-calc-out="total">${view.total(r, mode)}</b></a>
            <a class="btn btn--primary btn--sm" href="${u(R.contacts)}"${attrs(modalAttrs)}>Точный расчет</a>
          </div>
        </div>`;
}

/**
 * Мини-калькулятор для главной и страниц стран: страна, цена, год, объем, мощность → «≈ N ₽ под ключ во Владивостоке»
 * и кнопка «Подробный расчет» с переносом параметров в адрес калькулятора.
 * Страница должна подключить scripts: ['calc-core', 'calc'].
 * @param {object} o
 * @param {string} [o.country] — japan | korea | china: страна фиксируется (для страниц стран), переключатель скрыт
 * @param {string} [o.title] — HTML заголовка (по умолчанию двухтонный «Сколько стоит авто под ключ»)
 * @param {string} [o.lead], [o.tag='h2']
 * @param {boolean} [o.rules=true] — вставить выжимку правил; false, если на странице уже есть <script id="calc-rules">
 */
export function miniCalc(ctx, { country, title, lead, tag = 'h2', rules: withRules = true } = {}) {
  const rules = calcRules(ctx);
  const locked = Boolean(country && core.COUNTRIES[country]);
  const c = locked ? country : 'japan';
  const d = COUNTRY_DEFAULTS[c];
  const cn = core.COUNTRIES[c];
  const r = core.calc({ country: c, price: d.price, year: d.year, fuel: 'ice', cc: d.cc, hp: d.hp }, rules);
  const params = { country: c, price: d.price, unit: 'RUB', year: d.year, cc: d.cc, hp: d.hp };
  const dateShort = fmt.dateShort(Date.parse(rules.date));
  return html`
        <div class="mcalc" data-calc-mini data-dock-hide data-calc-url="${esc(u(R.calculator))}"${reveal()}>
          <form class="mcalc__form" action="${esc(u(R.calculator))}" method="get" novalidate autocomplete="off">
            <div class="mcalc__head">
              ${label('Калькулятор')}
              <${tag} class="mcalc__title">${title || duo(locked ? `Сколько стоит авто ${cn.from}` : 'Сколько стоит авто', 'под ключ')}</${tag}>
              <p class="mcalc__lead">${typo(lead || 'Пошлина, утилизационный сбор, расходы до Владивостока и оформление по ставкам и курсам ЦБ на ' + dateShort + '.')}</p>
            </div>
            ${locked
              ? `<input type="hidden" name="country" value="${c}">`
              : `<div class="opts mcalc__countries" role="radiogroup" aria-label="Страна покупки">${Object.entries(core.COUNTRIES)
                  .map(([slug, x]) => `<label class="opt"><input type="radio" name="country" value="${slug}"${slug === c ? ' checked' : ''}><span>${flag(ctx, slug)}${esc(x.name)}</span></label>`)
                  .join('')}</div>`}
            <div class="mcalc__fields">
              ${purchaseField(r, 'mini-price')}
              ${selectControl({ id: 'mini-year', name: 'year', label: 'Год выпуска', fieldClass: 'calc-field', search: true,
                options: years(rules).map((y) => `<option value="${y}"${y === d.year ? ' selected' : ''}>${y}</option>`) })}
              ${numField({ name: 'cc', labelHtml: 'Объем двигателя', value: d.cc, suffix: 'см³', max: 4 })}
              ${numField({ name: 'hp', labelHtml: 'Мощность', value: d.hp, suffix: 'л.с.', max: 4, decimal: true })}
            </div>
            <p class="mcalc__assume">Бензин или дизель · для личного пользования · гибриды, электромобили и доставка в город есть в подробном расчете</p>
            <button class="sr-only" type="submit" tabindex="-1">Подробный расчет</button>
          </form>
          <div class="mcalc__result on-dark">
            ${label('Под ключ во Владивостоке')}
            <div class="calc-live" aria-live="polite" aria-atomic="true">
              <div class="mcalc__total"><span data-calc-out="total">≈ ${view.total(r, 'vl')}</span></div>
              <p class="mcalc__note" data-calc-out="note">${esc(r.age.name + (r.age.cat === '3to5' ? ', проходной' : '') + ' · ' + (r.util.pref ? 'льготный утильсбор ' : 'утильсбор ') + fmt.rub(r.util.rub))}</p>
            </div>
            <div class="mcalc__legend" data-calc-out="legend">${view.legend(r, 'vl')}</div>
            <div class="mcalc__actions">
              <a class="btn btn--light btn--block" href="${calcHref(params)}" data-calc-more>Подробный расчет</a>
              ${btn('Точный расчет от менеджера', R.contacts, { variant: 'ghost', block: true, modal: 'request', subject: 'Точный расчет (мини-калькулятор)', attrs: { 'data-modal-title': 'Пришлем точный расчет', 'data-modal-label': 'Расчет' } })}
            </div>
            <p class="mcalc__disc">Расчет предварительный: расходы, комиссия и логистика указаны ориентировочно. Точную сумму под конкретный автомобиль считает менеджер.</p>
          </div>
          ${withRules ? calcRulesScript(ctx) : ''}
        </div>`;
}

/** Мини-калькулятор, обернутый в секцию: miniCalcSection(ctx, { country: 'japan', cls: 'section--white' }) */
export function miniCalcSection(ctx, { cls, id = 'kalkulyator', ...opts } = {}) {
  return html`
    <section class="${cx('section section--sm', cls)}" id="${id}">
      <div class="container">
        ${miniCalc(ctx, opts)}
      </div>
    </section>`;
}
