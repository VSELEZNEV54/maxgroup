// Калькулятор «под ключ»: полный блок для страницы /kalkulyator/ и мини-блок для главной и страниц стран.
// Расчет — js/calc-core.js, разметка результата — js/calc.js (MGCalc.view): генератор вызывает те же функции,
// что и браузер, поэтому числа и HTML в исходной странице совпадают с тем, что покажет скрипт.
//
// Страница, на которой стоит fullCalc() или miniCalc(), обязана подключить скрипты: scripts: ['calc-core', 'calc'].
import { html, esc, u, typo, cx, attrs } from '../lib/core.mjs';
import { icon, label, duo, btn, reveal, note } from './ui.mjs';
import { R } from '../routes.mjs';
import '../js/calc-core.js';
import '../js/calc.js';

/** Ядро расчета (то же, что window.MGCalc в браузере) */
export const calcCore = globalThis.MGCalc;
const core = calcCore;
const { view, fmt } = core;

/** Примеры для кнопок-пресетов: параметры правдоподобные, цены условные. fit, carnival и zeekr — контрольные примеры из calc-rules.json */
export const PRESETS = [
  { id: 'fit', name: 'Honda Fit 1.3', country: 'japan', price: 1100000, year: 2022, fuel: 'ice', cc: 1317, hp: 98, body: 'sedan' },
  { id: 'vezel', name: 'Honda Vezel 1.5', country: 'japan', price: 2000000, year: 2022, fuel: 'ice', cc: 1496, hp: 118, body: 'crossover' },
  { id: 'k5', name: 'Kia K5 2.0', country: 'korea', price: 21000000, year: 2022, fuel: 'ice', cc: 1999, hp: 160, body: 'sedan' },
  { id: 'carnival', name: 'Kia Carnival 2.2 дизель', country: 'korea', price: 32000000, year: 2022, fuel: 'ice', cc: 2151, hp: 202, body: 'suv' },
  { id: 'cx5', name: 'Mazda CX-5 2.0', country: 'china', price: 135000, year: 2025, fuel: 'ice', cc: 1998, hp: 155, body: 'crossover' },
  { id: 'zeekr', name: 'Zeekr 001', country: 'china', price: 230000, year: 2024, fuel: 'ev', ehp: 422, e30: 139.5, body: 'crossover' },
];

/** Типовой автомобиль страны: стартовые значения формы и мини-калькулятора */
export const COUNTRY_DEFAULTS = { japan: PRESETS[0], korea: PRESETS[2], china: PRESETS[4] };

const FUEL_HINT = { mild: 'MHEV', parallel: 'Prius, e:HEV', series: 'e-Power, Li, Aito' };
const CUR_NAME = { japan: 'в иенах', korea: 'в вонах', china: 'в юанях' };
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
 * tools/test-calc.mjs сверяет ядро с эталоном, а страница калькулятора строит разборы и ссылки «открыть в калькуляторе».
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

const tip = (t) => (t ? `<details class="calc-tip"><summary>${icon('info')}<span>${esc(t.q)}</span></summary><p>${typo(t.a)}</p></details>` : '');

const pills = (name, items, current, hint = {}, aria = '') =>
  `<div class="opts calc-opts" role="radiogroup"${aria ? ` aria-label="${esc(aria)}"` : ''}>${items
    .map(([value, text]) => `<label class="opt"><input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}><span>${esc(text)}${hint[value] ? `<small>${esc(hint[value])}</small>` : ''}</span></label>`)
    .join('')}</div>`;

/**
 * Полный калькулятор: форма слева, закрепленный итог справа, расшифровка по строкам под ними.
 * @param {object} o
 * @param {object} [o.state] — стартовые значения (по умолчанию первый пресет)
 * @param {object} [o.tips] — тексты подсказок {passing, hp160, hybrid, e30, personal, markup} → {q, a}
 * @param {object} [o.links] — ссылки для подсказок «что изменило бы сумму»: {passing: {url, text}, hp160: {…}}; url — адрес из routes.mjs
 * @param {Array} [o.budgets] — [{max, url, text}] — ссылка «автомобили в этот бюджет»
 * @param {string} [o.subject] — тема заявки
 */
export function fullCalc(ctx, { state, tips = {}, links = {}, budgets = [], subject = 'Точный расчет из калькулятора' } = {}) {
  const rules = calcRules(ctx);
  links = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, { ...v, url: u(v.url) }])); // адреса сайта → ссылки с учетом режима сборки
  const s = { ...PRESETS[0], month: 0, city: '', personal: true, markup: false, ...state };
  const r = core.calc(s, rules);
  const mode = r.delivery.city ? 'city' : 'vl';
  const activePreset = state ? null : PRESETS[0].id;
  // типовой автомобиль каждой страны: по ссылке вида ?country=korea форма показывает его целиком, а не корейскую цену с двигателем Honda Fit
  const defaults = Object.fromEntries(Object.entries(COUNTRY_DEFAULTS).map(([k, v]) => [k, { price: v.price, year: v.year, cc: v.cc, hp: v.hp, body: v.body }]));
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
        <div class="calc" data-calc data-calc-links="${json(links)}" data-calc-defaults="${json(defaults)}">
          <div class="calc-presets"${reveal()}>
            ${label('Примеры')}
            <div class="calc-presets__list">
              ${PRESETS.map((p) => `<button class="chip chip--sm" type="button" data-calc-preset="${json(p)}" aria-pressed="${p.id === activePreset}">${esc(p.name)}<small>${esc(core.COUNTRIES[p.country].name)}</small></button>`)}
            </div>
            <span class="calc-presets__note">Цены условные, подставьте свои</span>
          </div>

          <div class="note calc-ref" data-calc-ref role="note" hidden>${icon('info')}<div>${typo(`<b>Параметры перенесены из карточки автомобиля.</b> Калькулятор считает по курсам ЦБ и ставкам на ${ratesDate} и по типовым расходам. Цена в карточке рассчитана на сайте на дату публикации, поэтому суммы могут отличаться. Если мощности в карточке не было, укажите ее: от нее зависит утилизационный сбор.`)}</div></div>

          <div class="calc__grid">
            <form class="calc__form" data-calc-form novalidate autocomplete="off">
              <fieldset class="calc-card" id="calc-country">
                <legend class="sr-only">Страна и цена автомобиля</legend>
                <div class="calc-card__head"><span class="calc-card__num">01</span><h3 class="calc-card__title">Страна и цена</h3></div>
                <div class="calc-card__body">
                  <div class="calc-countries" role="radiogroup" aria-label="Страна покупки">
                    ${Object.entries(core.COUNTRIES).map(
                      ([slug, c]) => `<label class="calc-country"><input type="radio" name="country" value="${slug}"${slug === r.country.slug ? ' checked' : ''}><span><b>${esc(c.name)}</b><small>${esc(ctx.countryBySlug[slug]?.sourceShort || '')} · ${esc(core.CURRENCIES[c.cur].name)}</small></span></label>`
                    )}
                  </div>
                  ${numField({
                    name: 'price',
                    labelHtml: `Цена автомобиля <span data-calc-out="cur-name">${CUR_NAME[r.country.slug]}</span>`,
                    value: group(s.price),
                    suffix: `<span data-calc-out="cur">${esc(r.currency.sign)}</span>`,
                    group: true,
                    hint: `<span class="calc-hint" data-calc-out="price-rub">≈ ${fmt.rub(r.carRub)} по курсу ЦБ: ${esc(r.rates.curLabel)}</span>`,
                  })}
                  <div class="calc-notes" data-calc-out="warn-price" aria-live="polite">${view.warnings(r, 'price')}</div>
                </div>
              </fieldset>

              <fieldset class="calc-card" id="calc-age">
                <legend class="sr-only">Год и месяц выпуска</legend>
                <div class="calc-card__head"><span class="calc-card__num">02</span><h3 class="calc-card__title">Год и месяц выпуска</h3></div>
                <div class="calc-card__body">
                  <div class="calc-cols">
                    <label class="field calc-field">
                      <span class="field__label">Год выпуска</span>
                      <select class="field__control" name="year">${years(rules).map((y) => `<option value="${y}"${y === s.year ? ' selected' : ''}>${y}</option>`)}</select>
                    </label>
                    <label class="field calc-field">
                      <span class="field__label">Месяц выпуска</span>
                      <select class="field__control" name="month"><option value="0"${!s.month ? ' selected' : ''}>Не знаю</option>${MONTHS.map((m, i) => `<option value="${i + 1}"${s.month === i + 1 ? ' selected' : ''}>${m}</option>`)}</select>
                    </label>
                  </div>
                  <p class="calc-line" data-calc-out="age-line">${view.ageLine(r)}</p>
                  <div class="calc-notes" data-calc-out="warn-age" aria-live="polite">${view.warnings(r, 'age')}</div>
                  <div class="calc-tips">${tip(tips.passing)}</div>
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
                  <div class="calc-tips">${tip(tips.hp160)}${tip(tips.hybrid)}<div data-calc-show="${showMotor}"${hidden(showMotor)}>${tip(tips.e30)}</div></div>
                  <div class="calc-check">
                    <label class="check"><input type="checkbox" name="personal"${s.personal ? ' checked' : ''}><span>Для личного пользования: первый автомобиль за 12 месяцев, без продажи в течение года</span></label>
                    ${tip(tips.personal)}
                  </div>
                </div>
              </fieldset>

              <fieldset class="calc-card" id="calc-delivery">
                <legend class="sr-only">Доставка по России</legend>
                <div class="calc-card__head"><span class="calc-card__num">04</span><h3 class="calc-card__title">Доставка по России</h3></div>
                <div class="calc-card__body">
                  <div class="calc-cols calc-cols--stack">
                    <label class="field calc-field">
                      <span class="field__label">Город получения</span>
                      <select class="field__control" name="city">
                        ${rules.cities.map((c) => `<option value="${c.s}"${c.s === (r.delivery.city || 'vladivostok') ? ' selected' : ''}>${esc(c.n)}${c.s === 'vladivostok' ? ' (самовывоз)' : ''}</option>`)}
                      </select>
                    </label>
                    <div class="field calc-field">
                      <span class="field__label">Тип кузова для тарифа автовоза</span>
                      ${pills('body', Object.entries(core.BODIES).map(([k, v]) => [k, v.name]), r.input.body, {}, 'Тип кузова')}
                    </div>
                  </div>
                  <div class="calc-check">
                    <label class="check"><input type="checkbox" name="markup"${s.markup ? ' checked' : ''}><span>Учесть наценку банка при оплате за рубеж. Ориентир к курсу ЦБ: +${fmt.num(rules.markup.JPY * 100, 1)} % иена, +${fmt.num(rules.markup.KRW * 100, 1)} % вона, +${fmt.num(rules.markup.CNY * 100, 1)} % юань</span></label>
                    ${tip(tips.markup)}
                  </div>
                </div>
              </fieldset>
              <p class="calc__nojs">${icon('info')}Пересчет работает при включенном JavaScript. Ниже есть пример расчета, таблицы ставок и разбор трех автомобилей.</p>
            </form>

            <aside class="calc__side" aria-label="Результат расчета">
              <div class="calc-res on-dark" data-calc-result id="calc-result">
                <div class="calc-res__top">
                  <h3 class="label">Итог под ключ</h3>
                  <div class="calc-switch" role="group" aria-label="Что входит в итог">
                    <button type="button" data-calc-view="vl" aria-pressed="${mode === 'vl'}"><span>Во Владивостоке</span></button>
                    <button type="button" data-calc-view="city" aria-pressed="${mode === 'city'}"><span>${r.delivery.city ? 'С доставкой в ' + esc(r.delivery.acc) : 'С доставкой в город'}</span></button>
                  </div>
                </div>
                <div class="calc-live" aria-live="polite" aria-atomic="true">
                  <div class="calc-res__total"><span data-calc-out="total">${view.total(r, mode)}</span></div>
                  <p class="calc-res__caption" data-calc-out="caption">${esc(view.caption(r, mode))}</p>
                </div>
                <div class="calc-res__status" data-calc-out="status">${view.status(r)}</div>
                <div class="calc-res__legend" data-calc-out="legend">${view.legend(r, mode)}</div>
                <div class="calc-insights calc-insights--panel" data-calc-insights${r.insights.length ? '' : ' hidden'}>
                  <h4 class="label">Что изменило бы сумму</h4>
                  <ul data-calc-out="insights">${view.insights(r, links)}</ul>
                </div>
                <div class="calc-res__actions">
                  <a class="btn btn--primary btn--block" href="${u(R.contacts)}"${attrs(modalAttrs)}>Получить точный расчет ${icon('arrow', 'i-arrow')}</a>
                  <button class="btn btn--ghost btn--sm btn--block" type="button" data-calc-copy data-copy="${esc(ctx.site.url + R.calculator)}" data-copy-done="Ссылка на расчет скопирована">${icon('share')}Скопировать ссылку на расчет</button>
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
  const params = { country: c, price: d.price, year: d.year, cc: d.cc, hp: d.hp };
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
                  .map(([slug, x]) => `<label class="opt"><input type="radio" name="country" value="${slug}"${slug === c ? ' checked' : ''}><span>${esc(x.name)}</span></label>`)
                  .join('')}</div>`}
            <div class="mcalc__fields">
              ${numField({ name: 'price', labelHtml: `Цена <span data-calc-out="cur-name">${CUR_NAME[c]}</span>`, value: group(d.price), suffix: `<span data-calc-out="cur">${esc(r.currency.sign)}</span>`, group: true, hint: `<span class="calc-hint" data-calc-out="price-rub">≈ ${fmt.rub(r.carRub)} по курсу ЦБ</span>` })}
              <label class="field calc-field">
                <span class="field__label">Год выпуска</span>
                <select class="field__control" name="year">${years(rules).map((y) => `<option value="${y}"${y === d.year ? ' selected' : ''}>${y}</option>`)}</select>
              </label>
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
              <a class="btn btn--light btn--block" href="${calcHref(params)}" data-calc-more>Подробный расчет ${icon('arrow', 'i-arrow')}</a>
              ${btn('Точный расчет от менеджера', R.contacts, { variant: 'ghost', block: true, arrow: false, modal: 'request', subject: 'Точный расчет (мини-калькулятор)', attrs: { 'data-modal-title': 'Пришлем точный расчет', 'data-modal-label': 'Расчет' } })}
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
