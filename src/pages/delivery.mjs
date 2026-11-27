// Доставка по России: хаб /dostavka/ и гео-посадочные по городам /dostavka/<город>/.
// Цифры (тарифы, сроки, надбавки) берутся из data/cities.json и data/source/calc-rules.json,
// тексты — из data/content/delivery.json и data/content/cities/<slug>.json. В текстах работают
// подстановки {km}, {days}, {from}, {range}, {sedan}… и {range:novosibirsk} для другого города.
// Город может заменить любой текст общего шаблона (delivery.city) полем "tpl" в своем файле — см. mergeTpl().
import { html, esc, u, typo, price, num, plural, count } from '../lib/core.mjs';
import { faqLd, serviceLd, itemListLd } from '../lib/seo.mjs';
import { icon, label, duo, btn, more, reveal, sectionHead, pageHead, fact, carFacts, caseCard, faqList, step, rail, railNav, ctaBand, seoText, note, img } from '../components/ui.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const HUB = { name: 'Доставка по России', url: R.delivery };
const NB = '\u00a0';
const DAY = ['день', 'дня', 'дней'];
const CITY_WORD = ['город', 'города', 'городов'];

// кадры для шапок городов — чередуются по порядку городов в данных
const FRAMES = [
  { src: 'assets/img/hero/bridge-drive.webp', alt: 'Автомобиль на вантовом мосту во Владивостоке ночью' },
  { src: 'assets/img/hero/gclass-road.webp', alt: 'Белый внедорожник на ночной дороге во Владивостоке' },
  { src: 'assets/img/hero/bridge-kei.webp', alt: 'Синий кей-кар на вантовом мосту во Владивостоке' },
  { src: 'assets/img/hero/street-night.webp', alt: 'Автомобиль на ночной улице в центре Владивостока' },
];
const HUB_FRAME = { src: 'assets/img/hero/bridge-kei.webp', alt: 'Ночной вантовый мост во Владивостоке, вид сверху' };

// группы таблицы на хабе: макрорегионы из данных, в порядке движения автовоза на запад
const GROUPS = [
  { id: 'dalnij-vostok', title: 'Дальний Восток', macros: ['Дальний Восток'] },
  { id: 'sibir', title: 'Сибирь', macros: ['Сибирь'] },
  { id: 'ural', title: 'Урал', macros: ['Урал'] },
  { id: 'povolzhe', title: 'Поволжье', macros: ['Поволжье'] },
  { id: 'centr', title: 'Центр и Северо-Запад', macros: ['Центр', 'Северо-Запад'] },
  { id: 'yug', title: 'Юг', macros: ['Юг'] },
];

const BODY = {
  sedan: { name: 'Седан, хэтчбек', hint: 'высота до 1,6 м', short: 'кузов до 1,6 м' },
  crossover: { name: 'Кроссовер', hint: 'высота до 1,7 м', short: 'кузов до 1,7 м' },
  suv: { name: 'Внедорожник, минивэн', hint: 'высота до 1,9 м', short: 'кузов до 1,9 м' },
};

const PRICE_CAP = 5_000_000; // примеры «авто + доставка» показываем в массовом бюджете

// что учитывать при подборе примеров авто для региона (не статистика, а логика рекомендаций)
const PREF = {
  'Дальний Восток': { rhd: 2, awd: 2 },
  'Сибирь': { awd: 2, rhd: 1 },
  'Урал': { awd: 2, lhd: 1 },
  'Поволжье': { lhd: 2, awd: 1 },
  'Центр': { lhd: 2 },
  'Северо-Запад': { lhd: 2 },
  'Юг': { lhd: 2, eco: 1 },
};

// --- форматирование ---------------------------------------------------------------------------

const daysText = (d) => (d[0] === d[1] ? `${d[0]}${NB}${plural(d[0], DAY)}` : `${d[0]}-${d[1]}${NB}${plural(d[1], DAY)}`);
const rangeText = (a, b) => (a === b ? price(a) : `${num(a)}-${price(b)}`);
const plain = (s) => String(s).replace(/[\u00a0\u202f]/g, ' ');
/**
 * Числа в видимом тексте не рвутся при переносе: в диапазоне «10-15» после тире ставим соединитель слов,
 * в «20 000», набранном в текстах руками, — узкий неразрывный пробел. В мета-теги и JSON-LD это не попадает.
 */
const wj = (s) =>
  String(s ?? '')
    .replace(/(\d)-(?=\d)/g, '$1-\u2060')
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u202f');
const show = (s) => wj(typo(s));
const monthLabel = (iso) => {
  const m = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const [y, mm] = String(iso || '2026-10-01').split('-');
  return `${m[Number(mm) - 1]} ${y}`;
};

function cityVars(c) {
  const v = {
    name: c.name,
    acc: c.nameAcc,
    prep: c.namePrep,
    gen: c.nameGen,
    region: c.region,
    km: `${num(c.distanceKm)}${NB}км`,
    days: daysText(c.days),
    from: price(c.priceFrom),
    sedan: price(c.truck.sedan),
    crossover: price(c.truck.crossover),
    suv: price(c.truck.suv),
    range: rangeText(c.truck.sedan, c.truck.suv),
  };
  if (c.rail) {
    v.railSedan = price(c.rail.sedan);
    v.railCrossover = price(c.rail.crossover);
    v.railSuv = price(c.rail.suv);
    v.railRange = rangeText(c.rail.sedan, c.rail.suv);
    v.railDays = daysText(c.rail.days);
  }
  return v;
}

function globalVars(ctx) {
  const d = ctx.calc?.delivery || {};
  const s = d.surcharges || {};
  const t = ctx.calc?.costs?.vladivostok?.timing || {};
  const cities = ctx.cities;
  const nearest = [...cities].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const farthest = [...cities].sort((a, b) => b.distanceKm - a.distanceKm)[0];
  const nr = s.notRunningRub || [8000, 15000];
  const door = s.doorToDoorPct || [0.1, 0.2];
  return {
    asOf: monthLabel(ctx.calc?.asOf),
    wait: daysText(s.dispatchWaitDays || [3, 7]),
    winter: daysText(s.winterDelayDays || [2, 5]),
    notRunning: rangeText(nr[0], nr[1]),
    door: `${Math.round(door[0] * 100)}-${Math.round(door[1] * 100)}${NB}%`,
    afterArrival: daysText(t.totalAfterArrivalDays || [7, 14]),
    cities: count(cities.length, CITY_WORD),
    citiesN: String(cities.length),
    minFrom: nearest ? price(nearest.priceFrom) : '',
    minCity: nearest?.nameGen || '',
    minDays: nearest ? daysText(nearest.days) : '',
    fromDays: nearest ? `от${NB}${nearest.days[0]}${NB}${nearest.days[0] === 1 ? 'дня' : 'дней'}` : '',
    maxKm: farthest ? `${num(farthest.distanceKm)}${NB}км` : '',
    maxCity: farthest?.nameGen || '',
    maxRange: farthest ? rangeText(farthest.truck.sedan, farthest.truck.suv) : '',
    maxDays: farthest ? daysText(farthest.days) : '',
    minRange: nearest ? rangeText(nearest.truck.sedan, nearest.truck.suv) : '',
  };
}

/** Подстановка {ключ} и {ключ:slug-города}. Неизвестный ключ — ошибка сборки, чтобы опечатка не ушла на сайт. */
function makeFill(ctx, city) {
  const base = globalVars(ctx);
  const own = city ? cityVars(city) : {};
  const cache = new Map();
  const other = (slug) => {
    if (!cache.has(slug)) {
      const c = ctx.cities.find((x) => x.slug === slug);
      cache.set(slug, c ? cityVars(c) : null);
    }
    return cache.get(slug);
  };
  return (s) =>
    String(s ?? '').replace(/\{([a-zA-Z]+)(?::([a-z-]+))?\}/g, (m, key, slug) => {
      const val = slug ? other(slug)?.[key] : own[key] ?? base[key];
      if (val === undefined || val === null) throw new Error(`доставка: неизвестная подстановка ${m}${city ? ` (город ${city.slug})` : ''}`);
      return val;
    });
}

// --- подбор данных --------------------------------------------------------------------------------

/**
 * Примеры авто для городов: разные страны и бюджеты, с поправкой на регион.
 * Берем только автомобили с полной ценой под ключ: без priceIsPartial (цена без утильсбора) и без пометки
 * о спорной мощности — иначе сумма «авто + доставка» вводила бы в заблуждение.
 * Подбор идет сразу для всех городов: из лучших кандидатов берем тот, которого еще нет у городов с тем же тарифом,
 * затем — самый редкий в разделе. Так у соседних городов (тот же тариф и срок) наборы не повторяются,
 * а в примерах участвует больше автомобилей каталога.
 */
function planExamples(ctx, n) {
  const pool = ctx.cars.filter((c) => c.priceRub && c.photos?.length && !c.priceIsPartial && !c.powerDoubt);
  const order = ['japan', 'korea', 'china'];
  const shown = new Map(); // id авто → в скольких городах уже показан
  const byTariff = new Map(); // тариф → id авто, показанных в городах с этим тарифом
  const plan = new Map();
  ctx.cities.forEach((city, idx) => {
    const pref = PREF[city.macro] || {};
    const score = (c) => {
      let s = 0;
      const rhd = c.steering ? /прав/i.test(c.steering) : c.country === 'japan';
      if (pref.rhd && rhd) s += pref.rhd;
      if (pref.lhd && !rhd) s += pref.lhd;
      if (pref.awd && /4wd|awd|полный/i.test(c.drive || '')) s += pref.awd;
      if (pref.eco && (c.isHybrid || c.isElectric)) s += pref.eco;
      return s;
    };
    const tariffKey = `${city.truck.sedan}/${city.truck.crossover}/${city.truck.suv}`;
    if (!byTariff.has(tariffKey)) byTariff.set(tariffKey, new Set());
    const sameTariff = byTariff.get(tariffKey);
    const used = new Set();
    const out = [];
    for (let round = 0; out.length < n && round < 3; round++) {
      for (let k = 0; k < order.length && out.length < n; k++) {
        const cn = order[(k + idx) % order.length];
        const all = pool.filter((c) => c.country === cn && !used.has(`${c.brandSlug}/${c.modelSlug}`)).sort((a, b) => a.priceRub - b.priceRub);
        if (!all.length) continue;
        const capped = all.filter((c) => c.priceRub <= PRICE_CAP);
        const list = capped.length >= 4 ? capped : all;
        const half = Math.max(1, Math.ceil(list.length / 2));
        const tier = round % 2 === 0 ? list.slice(0, half) : list.slice(half);
        const cand = (tier.length ? tier : list).slice().sort((a, b) => score(b) - score(a) || a.priceRub - b.priceRub);
        const top = cand.slice(0, Math.min(cand.length, 6));
        // обход шестерки начинается со своего места для каждого города; выигрывает наименее «заезженный» автомобиль
        const start = idx * 7 + round * 3 + order.indexOf(cn) * 5;
        const ring = top.map((_, i) => top[(start + i) % top.length]);
        const rank = (c) => (sameTariff.has(c.id) ? 1000 : 0) + (shown.get(c.id) || 0);
        const car = ring.reduce((best, c) => (rank(c) < rank(best) ? c : best), ring[0]);
        used.add(`${car.brandSlug}/${car.modelSlug}`);
        out.push(car);
      }
    }
    for (const car of out) {
      sameTariff.add(car.id);
      shown.set(car.id, (shown.get(car.id) || 0) + 1);
    }
    plan.set(
      city.slug,
      out
        .map((car) => {
          const cls = car.truckClass;
          const ship = city.truck[cls];
          return { car, cls, ship, total: car.priceRub + ship };
        })
        .sort((a, b) => a.total - b.total)
    );
  });
  return plan;
}

/** Кейсы: сначала клиенты из этого города, потом из региона, потом уехавшие в другие города, потом остальные */
function casesFor(ctx, city) {
  const regionNames = ctx.cities.filter((x) => x.macro === city.macro).map((x) => x.name);
  const same = ctx.cases.filter((c) => c.clientCity === city.name);
  const region = ctx.cases.filter((c) => c.clientCity && c.clientCity !== city.name && regionNames.includes(c.clientCity));
  const away = ctx.cases.filter((c) => c.clientCity && c.clientCity !== 'Владивосток' && !same.includes(c) && !region.includes(c));
  const rest = ctx.cases.filter((c) => !same.includes(c) && !region.includes(c) && !away.includes(c));
  return { same, region, list: [...same, ...region, ...away, ...rest].slice(0, 8) };
}

/** Какая «история про свой ход» подходит городу */
function selfGroup(city) {
  if (city.slug === 'irkutsk') return 'irkutsk';
  if (city.slug === 'surgut') return 'surgut';
  if (city.distanceKm < 2000) return 'near';
  if (city.macro === 'Дальний Восток' || city.macro === 'Сибирь') return 'east';
  if (city.macro === 'Урал') return 'ural';
  return 'west';
}

const storyCase = (ctx, group) => {
  const cityName = group === 'irkutsk' || group === 'east' || group === 'near' ? 'Иркутск' : group === 'surgut' || group === 'ural' ? 'Сургут' : null;
  return cityName ? ctx.cases.find((c) => c.clientCity === cityName) : null;
};

/** Адрес для ссылки-рекомендации: 'selection:polnyj-privod' | 'country:japan' | 'calculator' */
function resolveTo(ctx, to) {
  const [kind, slug] = String(to || '').split(':');
  if (kind === 'selection') {
    const s = ctx.selections.find((x) => x.slug === slug && x.count > 0);
    return s ? s.url : R.catalog;
  }
  if (kind === 'country') return ctx.countryBySlug[slug] ? R.country(slug) : R.catalog;
  if (kind === 'calculator') return R.calculator;
  return R.catalog;
}

/**
 * Заголовки секций анимируются по словам (data-split), и скрипт при этом теряет неразрывные пробелы.
 * Оборачиваем группы «предлог + слово», «5 937 км» в nowrap-обертку, чтобы предлоги не повисали в конце строки.
 */
const nw = (markup) =>
  String(markup)
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith('<') ? part : part.replace(/[^\s<>]+(?:[\u00a0\u202f][^\s<>]+)+/g, (m) => `<span class="nw">${m}</span>`)))
    .join('');
const head = (o) => sectionHead({ ...o, title: nw(o.title), lead: o.lead ? wj(o.lead) : o.lead });

/**
 * Тексты города = общий шаблон delivery.city + точечные замены из data/content/cities/<slug>.json → "tpl".
 * Так у городов с одинаковым тарифом и сроком шаблонные абзацы не повторяются слово в слово.
 * Заменять можно только существующие ключи шаблона: опечатка в ключе — ошибка сборки.
 */
const isObj = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
function mergeTpl(base, over, path = 'tpl') {
  if (!isObj(over)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in base)) throw new Error(`доставка: в шаблоне города нет ключа ${path}.${k}`);
    out[k] = isObj(v) && isObj(base[k]) ? mergeTpl(base[k], v, `${path}.${k}`) : v;
  }
  return out;
}

/** Статьи блога по теме доставки и документов: первая — про саму доставку. Если статьи нет, ссылка просто не выводится. */
const BLOG_SLUGS = ['dostavka-avto-iz-vladivostoka', 'sbkts-i-epts-chto-eto', 'pravyj-rul-v-rossii'];
const blogPosts = (ctx) => BLOG_SLUGS.map((slug) => (ctx.posts || []).find((p) => p.slug === slug)).filter(Boolean);
const blogLinks = (ctx) => blogPosts(ctx).map((p) => ({ name: p.short || p.title, url: p.url }));

const calcHref = (city) => `${u(R.calculator)}?city=${city.slug}`;
const chipLinks = (items) => `<div class="chips">${items.map((it) => `<a class="chip" href="${it.href || u(it.url)}">${esc(it.name)}</a>`).join('')}</div>`;
const linksBlock = (title, items) => (items.length ? `<div class="linkblock"><h3 class="h4">${esc(title)}</h3>${chipLinks(items)}</div>` : '');
const requestBtn = (text, opts) => btn(text, '#zayavka', { modal: 'request', ...opts });

// ==================================================================================================
// Страница города
// ==================================================================================================

function routeBoard(ctx, city, t, fill) {
  const stops = (t.via || []).map((v) => {
    const c = ctx.cities.find((x) => x.slug === v);
    return c ? { name: c.name, km: c.distanceKm, url: c.url, meta: wj(c.daysLabel) } : { name: v };
  });
  return html`
          <aside class="droute-card on-dark"${reveal(1)} aria-label="Маршрут автовоза из Владивостока в ${esc(city.nameAcc)}">
            <div class="droute-card__head">
              ${label('Маршрут автовоза')}
              <span class="droute-card__sum">${num(city.distanceKm)}${NB}км</span>
            </div>
            <ol class="droute">
              <li class="droute__stop droute__stop--start">
                <span class="droute__km">0${NB}км</span><i aria-hidden="true"></i>
                <span class="droute__name">Владивосток</span>
                <span class="droute__meta">таможня и стоянка</span>
              </li>
              ${stops.map(
                (s) => html`
              <li class="droute__stop${s.km ? '' : ' droute__stop--minor'}">
                <span class="droute__km">${s.km ? `${num(s.km)}${NB}км` : ''}</span><i aria-hidden="true"></i>
                ${s.url ? `<a class="droute__name" href="${u(s.url)}">${esc(s.name)}</a>` : `<span class="droute__name">${esc(s.name)}</span>`}
                <span class="droute__meta">${s.meta ? esc(s.meta) : ''}</span>
              </li>`
              )}
              <li class="droute__stop droute__stop--end">
                <span class="droute__km">${num(city.distanceKm)}${NB}км</span><i aria-hidden="true"></i>
                <span class="droute__name">${esc(city.name)}</span>
                <span class="droute__meta">${esc(wj(city.daysLabel))}</span>
              </li>
            </ol>
            <div class="droute-card__foot">
              ${t.roads ? `<p class="droute-card__roads">${esc(t.roads)}</p>` : ''}
              ${t.season ? `<p class="droute-card__season">${icon('snow')}<span>${show(fill(t.season))}</span></p>` : ''}
            </div>
          </aside>`;
}

function introSection(ctx, city, t, fill, tpl) {
  return html`
    <section class="section" id="marshrut">
      <div class="container">
        <div class="split split--even dintro">
          <div class="dintro__text">
            <div${reveal()}>${label('Маршрут')}</div>
            <h2 data-split>${nw(duo(`Из Владивостока в ${city.nameAcc}:`, `${num(city.distanceKm)} км и ${wj(daysText(city.days))} в пути`))}</h2>
            <div class="prose"${reveal(1)}>
              ${(t.intro || []).map((p) => ctx.md(show(fill(p))))}
            </div>
            <p class="dintro__note"${reveal(2)}>${show(fill(tpl.routeNote))}</p>
          </div>
          ${routeBoard(ctx, city, t, fill)}
        </div>
      </div>
    </section>`;
}

function tariffTable(city, g) {
  const r = city.rail;
  const row = (k) => html`
              <tr>
                <th scope="row">${esc(BODY[k].name)}<small>${esc(BODY[k].hint)}</small></th>
                <td>${price(city.truck[k])}</td>
                ${r ? `<td class="tariff__alt">${price(r[k])}</td>` : ''}
              </tr>`;
  return html`
          <table class="tariff${r ? ' tariff--rail' : ''}">
            <caption class="sr-only">Стоимость доставки авто из Владивостока в ${esc(city.nameAcc)} по типу кузова, ${esc(g.asOf)}</caption>
            <thead>
              <tr>
                <th scope="col">Тип кузова</th>
                <th scope="col">Автовоз</th>
                ${r ? '<th scope="col">Железная дорога</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${['sedan', 'crossover', 'suv'].map(row)}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Срок в пути</th>
                <td>${daysText(city.days)}</td>
                ${r ? `<td class="tariff__alt">${daysText(r.days)}</td>` : ''}
              </tr>
            </tfoot>
          </table>`;
}

function tariffSection(ctx, city, t, fill, tpl, g) {
  const group = selfGroup(city);
  const sc = storyCase(ctx, group);
  const self = tpl.self?.[group] || tpl.self?.west;
  const factors = [
    ['Автомобиль не на ходу', `+${NB}${g.notRunning}`],
    ['Доставка до адреса', `+${NB}${g.door}`],
    ['Ожидание отправки', g.wait],
    ['Зимой в пути', `+${NB}${g.winter}`],
  ];
  return html`
    <section class="section section--white" id="tarify">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(`Тарифы · ${g.asOf}`)}
            <h2>${duo(`Автовоз из Владивостока в ${city.nameAcc}:`, 'цена и сроки')}</h2>
            <p class="lead">${show(fill(tpl.tariffLead))}</p>
            <a class="btn btn--dark" href="${calcHref(city)}">Посчитать авто с доставкой</a>
          </div>
          <div class="split__body dtariff"${reveal(1)}>
            ${tariffTable(city, g)}
            <div class="dminis">
              <article class="dmini dmini--dark on-dark">
                ${label('Нижняя граница рынка')}
                <p class="dmini__value">от ${price(city.priceFrom)}</p>
                <p class="dmini__text">${show(fill(tpl.fromText))}</p>
              </article>
              <article class="dmini">
                ${label('Своим ходом')}
                <h3 class="dmini__title">${show(fill(self.title))}</h3>
                <p class="dmini__text">${show(fill(self.text))}</p>
                ${sc && self.caseLink ? `<a class="more" href="${u(sc.url)}">${esc(self.caseLink)}</a>` : `<a class="more" href="${u(R.delivery)}#sposoby">Сравнить способы доставки</a>`}
              </article>
            </div>
            <div class="dfactors">
              <h3 class="label label--plain">Что меняет цену и срок</h3>
              <dl class="dfactors__list">
                ${factors.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`)}
              </dl>
            </div>
            ${note(`<p>${show(fill(tpl.tariffNote))}${t.tariffNote ? ` ${show(fill(t.tariffNote))}` : ''}</p>`, { warn: Boolean(city.estimated) })}
          </div>
        </div>
      </div>
    </section>`;
}

function exampleCard(ctx, city, x, i) {
  const { car, cls, ship, total } = x;
  const cn = ctx.countryBySlug[car.country];
  return html`
          <article class="dcar"${reveal(i % 3)}>
            <div class="dcar__media">${car.photos[0] ? img({ src: car.photos[0], alt: `${car.titleYear} ${cn.from} с доставкой в ${city.nameAcc}`, sizes: '(max-width: 720px) 80vw, (max-width: 900px) 50vw, 33vw' }) : ''}</div>
            <div class="dcar__body">
              <h3 class="dcar__title"><a href="${u(car.url)}">${esc(car.titleFull)}</a></h3>
              ${carFacts(car.year, car.mileageKm, car.auctionGrade)}
              <dl class="dcar__sum">
                <div><dt>Под ключ во Владивостоке</dt><dd>${price(car.priceRub)}</dd></div>
                <div><dt>Автовоз, ${esc(BODY[cls].short)}</dt><dd>+${NB}${price(ship)}</dd></div>
                <div class="dcar__total"><dt>В ${esc(city.namePrep)}</dt><dd>≈${NB}${price(total)}</dd></div>
              </dl>
            </div>
          </article>`;
}

function examplesSection(ctx, city, picks, fill, tpl) {
  if (!picks.length) return '';
  const subject = `Расчет авто с доставкой в ${city.nameAcc}`;
  return html`
    <section class="section" id="primery">
      <div class="container">
        ${head({
          label: 'Примеры под ключ',
          title: duo('Сколько стоит авто', `с доставкой в ${city.nameAcc}`),
          lead: fill(tpl.examplesLead),
          actions: more('Весь каталог', R.catalog),
        })}
        <div class="dcars${picks.length < 5 ? ' dcars--few' : ''}">
          ${picks.map((x, i) => exampleCard(ctx, city, x, i))}
          <div class="dpromo dcars__promo on-dark"${reveal(2)}>
            <div class="dpromo__bg">${img({ src: 'assets/img/hero/city-towers.webp', alt: '', sizes: '(max-width: 720px) 80vw, 33vw' })}</div>
            <div>
              ${label('Расчет под запрос')}
              <p class="dpromo__title">${show(fill(tpl.promoTitle))}</p>
              <p class="dpromo__text">${show(fill(tpl.promoText))}</p>
            </div>
            ${requestBtn('Получить расчет', { variant: 'light', subject, attrs: { 'data-modal-title': `Посчитаем авто с доставкой в ${city.nameAcc}`, 'data-modal-text': 'Напишите марку, модель и бюджет, и мы пришлем варианты и цену под ключ с доставкой.', 'data-modal-label': `Доставка в ${city.nameAcc}` } })}
          </div>
        </div>
        <p class="dcars__note muted small">${show(fill(tpl.examplesNote))}</p>
      </div>
    </section>`;
}

function stepsSection(city, fill, tpl) {
  const vars = (s) => ({ ...s, title: fill(s.title), text: wj(fill(s.text)), time: s.time ? plain(fill(s.time)) : null, pay: s.pay ? fill(s.pay) : null });
  return html`
    <section class="section section--white" id="kak-prohodit">
      <div class="container">
        ${head({
          label: 'Как проходит доставка',
          title: duo('От стоянки во Владивостоке', `до номеров в ${city.namePrep}`),
          lead: fill(tpl.stepsLead),
          aside: railNav(),
        })}
        ${rail(tpl.steps.map((s, i) => step(vars(s), i, { light: true })), { col: 'minmax(300px, 27%)', colMobile: 'minmax(270px, 82%)' })}
      </div>
    </section>`;
}

function localSection(ctx, city, t, fill, tpl) {
  const loc = t.local;
  if (!loc) return '';
  const picks = (loc.picks || []).map((p) => ({ ...(tpl.picks?.[p.key] || {}), ...p })).filter((p) => p.title);
  return html`
    <section class="section section--white" id="chto-vybrat">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(city.region)}
            <h2>${duo(loc.title || 'Что выбирают', loc.muted || `для ${city.nameGen}`)}</h2>
            <p class="lead">${show(fill(loc.text))}</p>
            ${more('Подборки по задачам', R.selections)}
          </div>
          <div class="split__body dpicks">
            ${picks.map(
              (p, i) => html`
            <a class="dpick" href="${u(resolveTo(ctx, p.to))}"${reveal(i)}>
              ${icon(p.icon || 'check', 'dpick__icon')}
              <span class="dpick__body">
                <span class="dpick__title">${typo(p.title)}</span>
                <span class="dpick__text">${show(fill(p.text))}</span>
              </span>
              <span class="dpick__go" aria-hidden="true">${icon('arrow')}</span>
            </a>`
            )}
          </div>
        </div>
      </div>
    </section>`;
}

function casesSection(ctx, city, fill, tpl) {
  const { same, region, list } = casesFor(ctx, city);
  if (!list.length) return '';
  const mode = same.length ? 'same' : region.length ? 'region' : 'other';
  const c = tpl.cases[mode];
  return html`
    <section class="section" id="privezennye-avto">
      <div class="container">
        ${head({
          label: 'Привезенные авто',
          title: duo(fill(c.title), fill(c.muted)),
          lead: fill(c.lead),
          aside: list.length > 4 ? railNav() : '',
          actions: more('Все привезенные авто', R.cases),
        })}
        ${rail(list.map((x, i) => caseCard(x, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
      </div>
    </section>`;
}

function cityFaq(ctx, city, t, fill, tpl, picks) {
  const f = tpl.faq;
  const q = (x) => ({ q: fill(x.q), a: fill(x.a) });
  const group = selfGroup(city);
  const out = [q(f.cost)];
  if (picks.length >= 2) {
    const ex = picks.slice(0, 2).map((x) => `${x.car.titleYear}: ${price(x.car.priceRub)} во Владивостоке и ${price(x.ship)} автовоз, около ${price(x.total)} в ${city.namePrep}`);
    out.push({ q: fill(f.total.q), a: `${fill(f.total.intro)} ${ex.join('; ')}. ${fill(f.total.outro)}` });
  } else {
    out.push({ q: fill(f.total.q), a: `${fill(f.total.introNoCars)} ${fill(f.total.outro)}` });
  }
  out.push(q(f.days));
  out.push(...(t.faqExtra || []).map(q));
  if (city.rail) out.push(q(f.rail));
  // город может отключить общий вопрос про ж/д ("tpl": { "faq": { "noRail": null } }), если отвечает на него своим вопросом
  else if (city.distanceKm >= 2000 && f.noRail) out.push(q(f.noRail));
  if (group !== 'irkutsk' && group !== 'surgut') out.push({ q: fill(f.self.q), a: fill(f.self[group] || f.self.west) });
  out.push(q(f.receive));
  // не больше восьми: лишним считаем вопрос про ж/д для городов без ж/д-тарифа
  if (out.length > 8 && f.noRail) {
    const i = out.findIndex((x) => x.q === fill(f.noRail.q));
    if (i >= 0) out.splice(i, 1);
  }
  return out.slice(0, 8);
}

function faqSection(city, faq, fill, tpl) {
  return html`
    <section class="section section--white" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${duo('Доставка', `в ${city.nameAcc}: частые вопросы`)}</h2>
            <p class="lead">${show(fill(tpl.faqLead))}</p>
            ${requestBtn('Задать вопрос', { variant: 'dark', subject: `Вопрос о доставке в ${city.nameAcc}`, attrs: { 'data-modal-title': 'Задайте вопрос менеджеру', 'data-modal-text': 'Оставьте контакты, и мы перезвоним или напишем в мессенджер в рабочее время.' } })}
          </div>
          <div class="split__body">${faqList(faq.map((x) => ({ q: wj(x.q), a: wj(x.a) })))}</div>
        </div>
      </div>
    </section>`;
}

function cityLinks(ctx, city) {
  const sameMacro = ctx.cities.filter((c) => c.macro === city.macro && c.slug !== city.slug);
  const nearest = [...ctx.cities].filter((c) => c.slug !== city.slug && !sameMacro.includes(c)).sort((a, b) => Math.abs(a.distanceKm - city.distanceKm) - Math.abs(b.distanceKm - city.distanceKm));
  const neighbors = [...sameMacro, ...nearest.slice(0, Math.max(2, 6 - sameMacro.length))].sort((a, b) => a.distanceKm - b.distanceKm);
  const selections = ctx.selections.filter((s) => s.count > 0).slice(0, 12);
  const svc = (slug) => ctx.services.find((s) => s.slug === slug);
  const useful = [
    { name: `Калькулятор с доставкой в ${city.nameAcc}`, href: calcHref(city) },
    { name: 'Все города доставки', url: R.delivery },
    svc('avto-pod-zakaz') && { name: 'Авто под заказ', url: svc('avto-pod-zakaz').url },
    svc('tamozhennoe-oformlenie') && { name: 'Таможенное оформление', url: svc('tamozhennoe-oformlenie').url },
    svc('avtokredit') && { name: 'Автокредит', url: svc('avtokredit').url },
    { name: 'Привезенные авто', url: R.cases },
    { name: 'Отзывы клиентов', url: R.reviews },
    { name: 'Вопросы и ответы', url: R.faq },
  ].filter(Boolean);
  return html`
    <section class="section section--sm" id="smotrite-takzhe">
      <div class="container">
        <h2 class="sr-only">Смотрите также</h2>
        ${linksBlock('Доставка в соседние города', neighbors.map((c) => ({ name: `${c.name}: от ${plain(price(c.priceFrom))}`, url: c.url })))}
        ${linksBlock(`Авто под заказ с доставкой в ${city.nameAcc}`, [...ctx.countries.map((cn) => ({ name: `Авто ${cn.from}`, url: R.country(cn.slug) })), { name: 'Весь каталог', url: R.catalog }])}
        ${linksBlock('Подборки', selections.map((s) => ({ name: s.name, url: s.url })))}
        ${linksBlock('Полезно знать', blogLinks(ctx))}
        ${linksBlock('Полезное', useful)}
      </div>
    </section>`;
}

/** Title без срока: с ним 11 городов выходили за 70 знаков и обрывались на «дн.»; срок есть в description. */
function cityTitle(city) {
  return `Доставка авто из Владивостока в ${city.nameAcc}: автовоз от ${plain(price(city.priceFrom))}`;
}

/** Description отвечает на тот же запрос, что title и H1: «доставка авто … в {город}». */
function cityDescription(city, g) {
  const v = cityVars(city);
  const head = `Доставка авто из Японии, Кореи и Китая в ${city.nameAcc}: автовоз из Владивостока от ${v.from}, ${v.days} в пути`;
  const variants = [
    `${head} (${v.km}). Тарифы по типу кузова на ${g.asOf} и примеры расчета.`,
    `${head} (${v.km}). Тарифы на ${g.asOf} и примеры расчета.`,
    `${head}. Тарифы на ${g.asOf} и примеры расчета.`,
  ].map(plain);
  return variants.find((x) => x.length <= 165) || variants[2];
}

function cityPage(ctx, city, idx, baseTpl, g, picks) {
  const t = ctx.content.cities?.[city.slug] || {};
  const tpl = mergeTpl(baseTpl, t.tpl);
  const fill = makeFill(ctx, city);
  const frame = FRAMES[idx % FRAMES.length];
  const ctaFrame = FRAMES[(idx + 2) % FRAMES.length];
  const shown = picks.length >= 5 ? picks.slice(0, 5) : picks.length >= 2 ? picks.slice(0, 2) : [];
  const faq = cityFaq(ctx, city, t, fill, tpl, shown);
  const crumbsList = [HOME, HUB, { name: city.name, url: city.url }];
  const title = cityTitle(city);
  const description = cityDescription(city, g);
  // H1 отвечает на тот же запрос, что title и адрес: «доставка авто … в {город}»; название города не рвется при переносе
  const h1Main = 'Доставка авто из Японии, Кореи и Китая';
  const h1City = `в ${city.nameAcc}`;
  const h1 = `${h1Main} ${h1City}`;
  const service = serviceLd(ctx.site, { name: `Доставка авто из Владивостока в ${city.nameAcc}`, description, url: city.url, serviceType: 'Доставка автомобилей автовозом', areaServed: city.name });
  service.offers = { '@type': 'AggregateOffer', priceCurrency: 'RUB', lowPrice: city.priceFrom, highPrice: Math.max(city.truck.suv, city.rail?.suv || 0), offerCount: city.rail ? 6 : 3 };
  const subject = `Доставка в ${city.nameAcc}`;
  return {
    url: city.url,
    type: 'city',
    bodyClass: 'p-delivery',
    title,
    description,
    h1,
    breadcrumbs: crumbsList,
    headerOver: true,
    priority: 0.7,
    changefreq: 'weekly',
    ogImage: frame.src.replace(/^assets\//, ''),
    images: [frame.src],
    jsonld: [service, faqLd(faq)].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs: crumbsList,
      label: `${city.macro} · ${city.region}`,
      h1: `${typo(h1Main)} <span class="mute nw">${esc(h1City).replace(/ /g, NB)}</span>`,
      lead: wj(fill(t.lead || tpl.lead)),
      photo: frame.src,
      photoAlt: frame.alt,
      single: true,
      actions:
        requestBtn('Рассчитать с доставкой', { variant: 'light', subject, attrs: { 'data-modal-title': `Авто с доставкой в ${city.nameAcc}`, 'data-modal-text': 'Расскажите, какой автомобиль ищете, и мы пришлем варианты и цену под ключ с доставкой.', 'data-modal-label': subject } }) +
        btn('Тарифы автовоза', '#tarify', { variant: 'ghost' }),
    })}
    ${introSection(ctx, city, t, fill, tpl)}
    ${tariffSection(ctx, city, t, fill, tpl, g)}
    ${examplesSection(ctx, city, shown, fill, tpl)}
    ${stepsSection(city, fill, tpl)}
    ${localSection(ctx, city, t, fill, tpl)}
    ${casesSection(ctx, city, fill, tpl)}
    ${faqSection(city, faq, fill, tpl)}
    ${cityLinks(ctx, city)}
    ${ctaBand(ctx, {
      label: subject,
      title: duo('Привезем автомобиль', `в ${city.nameAcc}`),
      text: wj(fill(tpl.ctaText)),
      subject,
      bg: ctaFrame.src,
      fields: ['name', 'phone', 'car', 'city'],
      city: city.name,
      cta: 'Получить расчет с доставкой',
      panelTitle: `Авто под ключ в ${city.namePrep}`,
      panelText: 'Ответим в рабочее время: варианты, цена во Владивостоке и доставка.',
    })}`,
  };
}

// ==================================================================================================
// Хаб /dostavka/
// ==================================================================================================

function hubGroups(ctx) {
  return GROUPS.map((gr) => {
    const cities = ctx.cities.filter((c) => gr.macros.includes(c.macro)).sort((a, b) => a.distanceKm - b.distanceKm);
    if (!cities.length) return null;
    const dMin = Math.min(...cities.map((c) => c.days[0]));
    const dMax = Math.max(...cities.map((c) => c.days[1]));
    const from = Math.min(...cities.flatMap(({ truck }) => [truck.sedan, truck.crossover, truck.suv]));
    return { ...gr, cities, days: daysText([dMin, dMax]), from };
  }).filter(Boolean);
}

function regionTable(region, asOf) {
  return html`
      <details class="acc dhub__region" id="${region.id}" name="delivery-regions">
        <summary>
          <span>${esc(region.title)}</span>
          <small class="dhub__meta">${count(region.cities.length, CITY_WORD)} · ${wj(region.days)} · от${NB}${price(region.from)}</small>
          <i class="acc__icon" aria-hidden="true"></i>
        </summary>
        <div class="acc__body">
          <p class="dhub__hint">Листайте таблицу по горизонтали</p>
          <div class="table-wrap" aria-label="Тарифы автовоза · ${esc(region.title)}">
            <table class="table dtable">
              <caption class="sr-only">Доставка из Владивостока · ${esc(region.title)}, ${esc(asOf)}</caption>
              <thead><tr>
                <th scope="col">Город</th>
                <th scope="col" class="num">Седан</th>
                <th scope="col" class="num">Кроссовер</th>
                <th scope="col" class="num">Внедорожник</th>
                <th scope="col" class="num">В пути</th>
                <th scope="col" class="num">Расстояние</th>
              </tr></thead>
              <tbody>
                ${region.cities.map((c) => html`
                  <tr>
                    <th scope="row"><a class="link" href="${u(c.url)}">${esc(c.name)}</a>${c.rail ? ' <span class="badge badge--line">+ ж/д</span>' : ''}${c.estimated ? ' <span class="badge">оценка</span>' : ''}</th>
                    <td class="num">${price(c.truck.sedan)}</td>
                    <td class="num">${price(c.truck.crossover)}</td>
                    <td class="num">${price(c.truck.suv)}</td>
                    <td class="num">${esc(c.daysLabel)}</td>
                    <td class="num">${num(c.distanceKm)}${NB}км</td>
                  </tr>`)}
              </tbody>
            </table>
          </div>
        </div>
      </details>`;
}

function hubTableSection(ctx, h, fill, g, groups) {
  const local = ctx.cases.find((c) => c.clientCity === 'Большой Камень');
  return html`
    <section class="section" id="goroda">
      <div class="container">
        ${head({ label: `Автовоз · ${g.asOf}`, title: duo('Города', 'и тарифы'), lead: fill(h.tableLead) })}
        <div class="dhub">
          <div data-acc-group>${groups.map((group) => regionTable(group, g.asOf))}</div>
          ${note(`<p>${show(fill(h.tableNote))}</p>`)}
          <div class="dhub__vl">
            ${label('Владивосток')}
            <h3 class="dhub__vl-title">Самовывоз</h3>
            <p>${show(fill(h.vladivostok))}</p>
            ${local ? `<a class="more" href="${u(local.url)}">${esc(local.name)} для клиента из Большого Камня</a>` : ''}
          </div>
        </div>
      </div>
    </section>`;
}

function waysSection(ctx, h, fill) {
  const sc = { irkutsk: ctx.cases.find((c) => c.clientCity === 'Иркутск'), surgut: ctx.cases.find((c) => c.clientCity === 'Сургут') };
  const post = (ctx.posts || []).find((p) => p.slug === BLOG_SLUGS[0]);
  return html`
    <section class="section section--white" id="sposoby">
      <div class="container">
        ${head({ label: 'Способы доставки', title: duo('Автовоз, железная дорога', 'или своим ходом'), lead: fill(h.waysLead), actions: post ? more('Разбор в блоге: автовоз, ж/д или своим ходом', post.url) : '' })}
        <div class="dways">
          ${h.ways.map(
            (w, i) => html`
          <article${w.key === 'truck' ? ' id="avtovoz"' : ''} class="dway${w.variant ? ` dway--${w.variant}${w.variant === 'dark' ? ' on-dark' : ''}` : ''}"${reveal(i)}>
            <div class="dway__top">${label(w.label)}${icon(w.icon, 'dway__icon')}</div>
            <div class="dway__head">
              <h3 class="dway__title">${esc(w.title)}</h3>
              <p class="dway__text">${show(fill(w.text))}</p>
              ${w.key === 'self' && (sc.irkutsk || sc.surgut)
                ? `<div class="dway__links">${sc.irkutsk ? `<a class="more" href="${u(sc.irkutsk.url)}">${esc(sc.irkutsk.name)} для клиента из${NB}Иркутска</a>` : ''}${sc.surgut ? `<a class="more" href="${u(sc.surgut.url)}">${esc(sc.surgut.name)} для клиента из${NB}Сургута</a>` : ''}</div>`
                : ''}
            </div>
            <dl class="dway__list">
              ${w.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${show(fill(v))}</dd></div>`)}
            </dl>
          </article>`
          )}
        </div>
      </div>
    </section>`;
}

function factorsSection(ctx, h, fill) {
  const s = ctx.calc?.delivery?.surcharges || {};
  const nr = s.notRunningRub || [8000, 15000];
  const door = s.doorToDoorPct || [0.1, 0.2];
  const wait = s.dispatchWaitDays || [3, 7];
  const winter = s.winterDelayDays || [2, 5];
  const values = {
    notRunning: { value: `+${nr[0] / 1000}-${nr[1] / 1000}`, unit: 'тыс. ₽' },
    door: { value: `+${Math.round(door[0] * 100)}-${Math.round(door[1] * 100)}`, unit: '%' },
    wait: { value: `${wait[0]}-${wait[1]}`, unit: plural(wait[1], DAY) },
    winter: { value: `+${winter[0]}-${winter[1]}`, unit: plural(winter[1], DAY) },
  };
  return html`
    <section class="section" id="chto-vliyaet">
      <div class="container">
        ${head({ label: 'Что влияет на цену', title: duo('Четыре вещи, которые', 'меняют тариф и срок'), lead: fill(h.factorsLead) })}
        <div class="dfacts">
          ${h.factors.map((f, i) => fact({ ...values[f.key], name: f.name, text: wj(fill(f.text)), variant: f.variant, i }))}
        </div>
      </div>
    </section>`;
}

function handoverSection(h, fill) {
  const ho = h.handover;
  return html`
    <section class="section section--white" id="peredacha">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Передача перевозчику')}
            <h2>${duo('Как автомобиль уходит', 'из Владивостока в ваш город')}</h2>
            <p class="lead">${show(fill(ho.lead))}</p>
            <div class="dhand__media">${img({ src: 'assets/img/services/service-container.webp', alt: '', sizes: '(max-width: 900px) 100vw, 40vw' })}</div>
          </div>
          <div class="split__body dhand">
            <ol class="dsteps">
              ${ho.steps.map(
                (s, i) => html`
              <li class="dsteps__item"${reveal(Math.min(i, 4))}>
                <span class="dsteps__num">${String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 class="dsteps__title">${show(fill(s.title))}</h3>
                  <p class="dsteps__text">${show(fill(s.text))}</p>
                </div>
                ${s.time ? `<span class="dsteps__time">${esc(plain(fill(s.time)))}</span>` : ''}
              </li>`
              )}
            </ol>
            <div class="ddocs"${reveal(1)}>
              <div class="ddocs__head">
                ${label('Документы')}
                <h3 class="ddocs__title">${show(fill(ho.docsTitle))}</h3>
              </div>
              <ul class="ddocs__list">
                ${ho.docs.map((d) => `<li>${icon('doc-check')}<span>${show(fill(d))}</span></li>`)}
              </ul>
              <p class="ddocs__note">${show(fill(ho.docsNote))}</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function hubCasesSection(ctx, h, fill) {
  const away = ctx.cases.filter((c) => c.clientCity && c.clientCity !== 'Владивосток');
  const rest = ctx.cases.filter((c) => !away.includes(c));
  const list = [...away, ...rest].slice(0, 8);
  if (!list.length) return '';
  return html`
    <section class="section" id="privezennye-avto">
      <div class="container">
        ${head({ label: 'Привезенные авто', title: duo('Автомобили, которые', 'уже уехали к владельцам'), lead: fill(h.casesLead), aside: list.length > 4 ? railNav() : '', actions: more('Все привезенные авто', R.cases) })}
        ${rail(list.map((x, i) => caseCard(x, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
      </div>
    </section>`;
}

function hubPage(ctx, d, g) {
  const h = d.hub;
  const fill = makeFill(ctx, null);
  const groups = hubGroups(ctx);
  const faq = h.faq.map((x) => ({ q: fill(x.q), a: fill(x.a) }));
  const crumbsList = [HOME, HUB];
  const year = ctx.build.year;
  const title = `Доставка авто из Владивостока по России | автовоз, цены ${year}`;
  const description = plain(fill(h.description));
  const service = serviceLd(ctx.site, { name: 'Доставка автомобилей из Владивостока по России', description, url: R.delivery, serviceType: 'Доставка автомобилей автовозом и по железной дороге' });
  const selections = ctx.selections.filter((s) => s.count > 0).slice(0, 12);
  const svc = (slug) => ctx.services.find((s) => s.slug === slug);
  const useful = [
    { name: 'Калькулятор стоимости', url: R.calculator },
    svc('avto-pod-zakaz') && { name: 'Авто под заказ', url: svc('avto-pod-zakaz').url },
    svc('tamozhennoe-oformlenie') && { name: 'Таможенное оформление', url: svc('tamozhennoe-oformlenie').url },
    svc('avtokredit') && { name: 'Автокредит', url: svc('avtokredit').url },
    { name: 'Отзывы клиентов', url: R.reviews },
    { name: 'Вопросы и ответы', url: R.faq },
    { name: 'Контакты', url: R.contacts },
  ].filter(Boolean);
  return {
    url: R.delivery,
    type: 'delivery',
    bodyClass: 'p-delivery',
    title,
    description,
    h1: 'Доставка авто из Владивостока по всей России',
    breadcrumbs: crumbsList,
    headerOver: true,
    priority: 0.8,
    changefreq: 'weekly',
    ogImage: HUB_FRAME.src.replace(/^assets\//, ''),
    images: [HUB_FRAME.src],
    jsonld: [service, faqLd(faq), itemListLd(ctx.site, 'Города доставки автомобилей из Владивостока', ctx.cities.map((c) => ({ url: c.url, name: `Доставка авто в ${c.nameAcc}` })))].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs: crumbsList,
      h1: duo('Доставка авто из Владивостока', 'по всей России'),
      lead: wj(fill(h.lead)),
      photo: HUB_FRAME.src,
      photoAlt: HUB_FRAME.alt,
      single: true,
      actions:
        requestBtn('Рассчитать доставку', { variant: 'light', subject: 'Доставка по России', attrs: { 'data-modal-title': 'Рассчитаем доставку в ваш город', 'data-modal-text': 'Назовите город и автомобиль, и мы пришлем цену и ближайшую дату отправки.', 'data-modal-label': 'Доставка по России' } }) +
        btn('Города и тарифы', '#goroda', { variant: 'ghost' }),
    })}
    ${hubTableSection(ctx, h, fill, g, groups)}
    ${waysSection(ctx, h, fill)}
    ${factorsSection(ctx, h, fill)}
    ${handoverSection(h, fill)}
    ${hubCasesSection(ctx, h, fill)}
    <section class="section section--white" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${duo('О доставке', 'коротко и по делу')}</h2>
            <p class="lead">${show(fill(h.faqLead))}</p>
            ${more('Все вопросы', R.faq)}
          </div>
          <div class="split__body">${faqList(faq.map((x) => ({ q: wj(x.q), a: wj(x.a) })))}</div>
        </div>
      </div>
    </section>
    <section class="section section--sm" id="smotrite-takzhe">
      <div class="container">
        ${h.seo ? seoText(ctx.md(wj(fill(h.seo)))) : ''}
        <div class="u-mt-7">
          <h2 class="sr-only">Смотрите также</h2>
          ${linksBlock('Авто под заказ с доставкой', [...ctx.countries.map((cn) => ({ name: `Авто ${cn.from}`, url: R.country(cn.slug) })), { name: 'Весь каталог', url: R.catalog }])}
          ${linksBlock('Подборки', selections.map((s) => ({ name: s.name, url: s.url })))}
          ${linksBlock('Полезно знать', blogLinks(ctx))}
          ${linksBlock('Полезное', useful)}
        </div>
      </div>
    </section>
    ${ctaBand(ctx, {
      label: 'Доставка по России',
      title: duo('Рассчитаем автомобиль', 'с доставкой в ваш город'),
      text: wj(fill(h.ctaText)),
      subject: 'Доставка по России',
      bg: 'assets/img/hero/city-towers.webp',
      fields: ['name', 'phone', 'car', 'city'],
      cta: 'Получить расчет с доставкой',
      panelTitle: 'Авто под ключ в вашем городе',
      panelText: 'Ответим в рабочее время: варианты, цена во Владивостоке и доставка.',
    })}`,
  };
}

export function deliveryPages(ctx) {
  const d = ctx.content.delivery;
  if (!d || !ctx.cities.length) return [];
  const g = globalVars(ctx);
  const examples = ctx.cars.length ? planExamples(ctx, 5) : new Map();
  return [hubPage(ctx, d, g), ...ctx.cities.map((city, idx) => cityPage(ctx, city, idx, d.city, g, examples.get(city.slug) || []))];
}
