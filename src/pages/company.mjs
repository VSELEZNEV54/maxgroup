// Страницы доверия и служебные: о компании, контакты, отзывы, FAQ, видео, политика, карта сайта, 404.
// Тексты — data/content/company.json. Факты о компании — только из data/source/maxgroup.json,
// отраслевые цифры — только из data/source/calc-rules.json (подставляются в тексты через {{переменные}}).
import { html, esc, u, img, typo, price, num, count, plural, cx, groupBy } from '../lib/core.mjs';
import { faqLd, reviewsLd } from '../lib/seo.mjs';
import { icon, stars, label, duo, btn, more, reveal, sectionHead, companyFigures, pageHead, caseCard, reviewCard, faqList, linkBlock, ticks, note, route, rail, railNav, ctaBand, leadForm } from '../components/ui.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const VL_OFFSET = 10; // Владивосток: UTC+10, без перехода на летнее время
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const DAYS = ['день', 'дня', 'дней'];
const REVIEW_WORD = ['отзыв', 'отзыва', 'отзывов'];
/** «из 13 отзывов», «из 21 отзыва»: родительный падеж после предлога */
const reviewsGen = (n) => `${n} ${plural(n, ['отзыва', 'отзывов', 'отзывов'])}`;
const CAR_WORD = ['автомобиль', 'автомобиля', 'автомобилей'];

const extLink = (href) => `href="${esc(href)}" target="_blank" rel="noopener nofollow"`;
const pad2 = (n) => String(n).padStart(2, '0');
const comma = (n) => String(n).replace('.', ',');
const range = (arr, f = comma) => (arr[0] === arr[1] ? f(arr[0]) : `${f(arr[0])}-${f(arr[1])}`);
const thousands = (arr) => `${range(arr.map((x) => Math.round(x / 1000)))} тыс. ₽`;
const pct = (arr) => `${range(arr.map((x) => Math.round(x * 100)))} %`;
const daysText = (d) => (d[0] === d[1] ? `${d[0]} ${plural(d[0], DAYS)}` : `${d[0]}-${d[1]} ${plural(d[1], DAYS)}`);
const dateDots = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
// Заголовки с data-split: main.js делит текст по любым пробелам, включая неразрывные, — предлог может остаться в конце строки,
// а тире уйти в начало следующей. Поэтому пары «предлог + слово» и «слово + тире» оборачиваем в .nowrap с обычным пробелом.
const glue = (s) => typo(s).replace(/[^\s<>]+(?:\u00a0[^\s<>]+)+/g, (m) => `<span class="nowrap">${m.replace(/\u00a0/g, ' ')}</span>`);
const duoS = (main, muted) => `${glue(main)}${muted ? ` <span class="mute">${glue(muted)}</span>` : ''}`;
const fillBraces = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
/** Статьи блога по списку адресов: [{ name, url }] — только те, что есть в ctx.posts */
const postLinks = (ctx, slugs = []) => slugs.map((slug) => ctx.posts.find((p) => p.slug === slug)).filter(Boolean).map((p) => ({ name: p.short || p.title, url: p.url }));

// --- ссылки и переменные для текстов ---------------------------------------------------------------

/** 'r:calculator' | 'svc:avtokredit' | 'sel:do-160-ls' | 'city:moskva' | 'country:japan' | '#anchor' → адрес из R */
function linkResolver(ctx) {
  return (to) => {
    if (!to) return R.home;
    if (to.startsWith('#') || to.startsWith('/')) return to;
    const [kind, key] = to.split(':');
    if (kind === 'r') return typeof R[key] === 'string' ? R[key] : R.home;
    if (kind === 'svc') return ctx.services.some((s) => s.slug === key) ? R.service(key) : R.services;
    if (kind === 'country') return ctx.countryBySlug[key] ? R.country(key) : R.catalog;
    if (kind === 'city') return ctx.cities.find((c) => c.slug === key)?.url || R.delivery;
    if (kind === 'sel') {
      const s = ctx.selections.find((x) => x.slug === key) || ctx.selections.find((x) => x.slug.startsWith(key));
      return s && s.count > 0 ? s.url : R.selections;
    }
    return R.home;
  };
}

/** Значения {{переменных}} в текстах FAQ: все берется из calc-rules.json и cities.json */
function varResolver(ctx) {
  const c = ctx.calc || {};
  const year = (c.asOf || '2026').slice(0, 4);
  const [y, m] = (c.asOf || '').split('-');
  const pref = c.utilFee?.preferential || {};
  const base = c.utilFee?.baseRateRub || 0;
  const ets = c.ets || {};
  const eur = c.rates?.cbr?.[c.rates?.default]?.EUR;
  const vl = c.costs?.vladivostok || {};
  const minmax = (list, key) => (list?.length ? [Math.min(...list.map((x) => x[key])), Math.max(...list.map((x) => x[key]))] : null);
  const rateFor = (list, cc) => list?.find((x) => x.maxCc === null || cc <= x.maxCc)?.eurPerCc;
  const coef = (table, i) => table?.ice?.['1001_2000']?.[year]?.[i];
  const markups = Object.values(c.rates?.transfer?.markupRange || {}).flat();
  const banks = (ctx.source.credit?.banks || []).map((b) => b.name);
  const safe = (fn) => { try { const v = fn(); return v === undefined || v === null || Number.isNaN(v) ? null : v; } catch { return null; } };

  const stat = {
    asOf: safe(() => `${MONTHS[Number(m) - 1]} ${y} года`),
    ratesDate: safe(() => dateDots(c.rates.default)),
    eurRate: safe(() => `${comma(eur.toFixed(2))} ₽`),
    utilNew: safe(() => price(pref.amountNewRub)),
    utilOld: safe(() => price(pref.amountOldRub)),
    hp: pref.iceMaxHpApprox,
    evHp: pref.evMaxHpApprox,
    maxCc: safe(() => `${comma((pref.iceMaxVolumeCc / 1000).toFixed(1))} л`),
    dutyNewPct: safe(() => pct(minmax(ets.le3, 'pct'))),
    dutyNewMinEur: safe(() => `${range(minmax(ets.le3, 'minEurPerCc'))} €`),
    duty35: safe(() => `${range(minmax(ets['3to5'], 'eurPerCc'))} €`),
    duty5: safe(() => `${range(minmax(ets.gt5, 'eurPerCc'))} €`),
    'ex15.mid': safe(() => price(Math.round((1500 * rateFor(ets['3to5'], 1500) * eur) / 1000) * 1000)),
    'ex15.old': safe(() => price(Math.round((1500 * rateFor(ets.gt5, 1500) * eur) / 1000) * 1000)),
    utilOver160New: safe(() => price(coef(c.utilFee.personal, 4)[0] * base)),
    utilOver160Old: safe(() => price(coef(c.utilFee.personal, 4)[1] * base)),
    utilFull160New: safe(() => price(coef(c.utilFee.full, 3)[0] * base)),
    utilFull160Old: safe(() => price(coef(c.utilFee.full, 3)[1] * base)),
    transferRange: safe(() => pct([Math.min(...markups), Math.max(...markups)])),
    jpWeeks: safe(() => range(c.costs.japan.transit.auctionToVladivostokWeeks)),
    jpSea: safe(() => range(c.costs.japan.transit.seaDays)),
    krWeeks: safe(() => range(c.costs.korea.transit.purchaseToVladivostokWeeks)),
    cnWeeks: safe(() => range(c.costs.china.transit.paymentToUssuriyskWeeks)),
    afterArrival: safe(() => range(vl.timing.totalAfterArrivalDays)),
    releaseDays: safe(() => range(vl.timing.customsReleaseDays)),
    sbktsDays: safe(() => range(vl.timing.sbktsEptsDays)),
    dispatchWait: safe(() => range(c.delivery.surcharges.dispatchWaitDays)),
    winterDelay: safe(() => range(c.delivery.surcharges.winterDelayDays)),
    vlBundle: safe(() => thousands(vl.itemsRub.bundleRange)),
    vlSvh: safe(() => thousands(vl.itemsRub.svhAndBroker.range)),
    vlLab: safe(() => thousands(vl.itemsRub.labDeliveryAndTest.range)),
    vlSbkts: safe(() => thousands(vl.itemsRub.sbktsEpts.range)),
    glonass: safe(() => thousands(vl.optionalRub.eraGlonass.ifRequired)),
    evDuty: safe(() => pct([c.stp.dutyPct, c.stp.dutyPct])),
    vat: safe(() => pct([c.stp.vatPct, c.stp.vatPct])),
    banks: banks.length > 1 ? `${banks.slice(0, -1).join(', ')} и ${banks.at(-1)}` : banks[0] || null,
    // собственный профиль расходов заказчика (статьи расчета из карточек каталога maxgroupvl.ru)
    mgVlad: safe(() => price(c.defaults?.vladivostokRub ?? c.costs.maxGroupSite.vladivostokRub)),
    mgLogistics: safe(() => price(c.defaults?.localLogisticsRub ?? c.costs.maxGroupSite.localLogisticsRub)),
    mgCommMin: safe(() => price(Math.min(...c.defaults.commissionTiers.map((x) => x.commissionRub)))),
  };
  const BREAKDOWN = [
    ['carPriceRub', 'автомобиль'],
    ['abroadExpensesRub', 'расходы в стране покупки'],
    ['dutyRub', 'пошлина'],
    ['exciseRub', 'акциз'],
    ['vatRub', 'НДС'],
    ['customsFeeRub', 'таможенный сбор'],
    ['utilRub', 'утилизационный сбор'],
    ['vladivostokRub', 'оформление во Владивостоке'],
    ['localLogisticsRub', 'местная логистика'],
    ['commissionRub', 'комиссия'],
  ];

  return (key) => {
    if (stat[key] !== undefined && stat[key] !== null) return stat[key];
    const p = key.split('.');
    if (p[0] === 'ex') {
      const ex = c.examples?.items?.find((x) => x.input.id === p[1]);
      if (!ex) return null;
      if (p[2] === 'price') return num(ex.input.price);
      if (p[2] === 'breakdown') {
        const rows = BREAKDOWN.filter(([k]) => ex.result[k] > 0).map(([k, name]) => `${name} ${price(ex.result[k])}`);
        return rows.length >= 4 ? rows.join(', ') : null;
      }
      return typeof ex.result[p[2]] === 'number' ? price(ex.result[p[2]]) : null;
    }
    if (p[0] === 'city') {
      const ct = ctx.cities.find((x) => x.slug === p[1]);
      if (!ct) return null;
      if (p[2] === 'from') return price(ct.priceFrom);
      if (p[2] === 'days') return daysText(ct.days);
    }
    if (p[0] === 'rail') {
      const h = c.delivery?.rail?.hubs?.[p[1]];
      if (!h) return null;
      if (p[2] === 'from') return price(Math.min(h.sedan, h.crossover, h.suv));
      if (p[2] === 'days') return range(h.days);
    }
    return null;
  };
}

const missingVars = new Set();

/** Набор текстовых помощников страницы: подстановка переменных, ссылки, Markdown → HTML */
function textTools(ctx) {
  const to = linkResolver(ctx);
  const val = varResolver(ctx);
  const known = (k) => val(k) !== null && val(k) !== undefined;
  // {? … ?} — необязательный фрагмент: выводится, только если все {{переменные}} внутри него известны
  const optional = (s) => s.replace(/\{\?([\s\S]*?)\?\}/g, (m, inner) => ([...inner.matchAll(/\{\{([\w.-]+)\}\}/g)].every((x) => known(x[1])) ? inner : ''));
  const fill = (s) =>
    optional(String(s ?? '')).replace(/\{\{([\w.-]+)\}\}/g, (m, k) => {
      if (known(k)) return val(k);
      missingVars.add(k);
      return '';
    });
  const links = (s) => s.replace(/\]\(((?:r|svc|sel|city|country):[\w-]+)\)/g, (m, t) => `](${to(t)})`);
  const md = (s) => ctx.md(links(fill(s)).split('\n').map((line) => typo(line)).join('\n'));
  return { to, fill, md, plain: (s) => typo(fill(s)) };
}

// --- общие блоки ---------------------------------------------------------------------------------------

const geoOf = (ctx) => {
  const g = ctx.source.company?.address?.geo;
  return g?.lat ? { lat: g.lat, lon: g.lng ?? g.lon } : null;
};

function ratingBlock(site) {
  return html`<div class="rating">
            <div class="rating__value">${comma(site.rating.value.toFixed(1))}</div>
            <div class="rating__meta">${stars(5)}<span>оценка в каждом из ${reviewsGen(site.rating.count)}:<br>${site.rating.twoGisCount} из 2ГИС, ${site.rating.count - site.rating.twoGisCount} с Яндекс Карт</span></div>
          </div>`;
}

const mapButtons = (site, { variant = 'ghost' } = {}) => html`
            <a class="btn btn--${variant} btn--sm" ${extLink(site.contacts.maps.twoGis)}>Открыть в 2ГИС ${icon('external')}</a>
            <a class="btn btn--${variant} btn--sm" ${extLink(site.contacts.maps.yandex)}>На Яндекс Картах ${icon('external')}</a>`;

/** Типографическая «карточка адреса» вместо карты: координаты, адрес, кнопки карт */
function addressCard(ctx, { alt = '', tag = 'h2' } = {}) {
  const { site } = ctx;
  const c = site.contacts;
  const geo = geoOf(ctx);
  const coords = geo ? `${geo.lat}, ${geo.lon}` : '';
  return html`
          <article class="co-address on-dark"${reveal()}>
            <div class="co-address__bg co-safe">${img({ src: 'assets/img/hero/city-towers.webp', alt, sizes: '(max-width: 1100px) 100vw, 58vw' })}</div>
            <div class="co-address__top">
              ${label('Офис во Владивостоке')}
              ${geo ? `<button class="co-address__coords" type="button" data-copy="${esc(coords)}" data-copy-done="Координаты скопированы" title="Скопировать координаты">${geo.lat}° с. ш. · ${geo.lon}° в. д.</button>` : ''}
            </div>
            <div>
              <${tag} class="sr-only">Адрес офиса Макс Групп</${tag}>
              <address>
                <div class="co-address__street">${esc(c.street)}</div>
                <div class="co-address__meta">${esc(c.office)} · ${esc(c.city)}, ${esc(c.region)}</div>
              </address>
              <div class="co-address__actions">
                ${mapButtons(site)}
                <button class="btn btn--ghost btn--sm" type="button" data-copy="${esc(c.addressFull)}" data-copy-done="Адрес скопирован">Скопировать адрес</button>
              </div>
            </div>
          </article>`;
}

/** Адрес + плитки: телефон, график, мессенджеры и почта */
function contactGrid(ctx, { alt, tag = 'h2', hoursLink } = {}) {
  const { site } = ctx;
  const c = site.contacts;
  const main = c.phones[0];
  const s = site.socials;
  // адреса менеджера в Telegram в источнике нет — ссылка ведет на канал, и подпись называет его каналом
  const tg = s.telegramManager || s.telegram;
  return html`
        <div class="co-contact">
          ${addressCard(ctx, { alt, tag })}
          <div class="co-contact__side">
            <div class="co-info"${reveal(1)}>
              ${label('Телефон')}
              <a class="co-info__big" href="tel:${main.tel}">${esc(main.label)}</a>
              <p class="co-info__sub">${esc(main.department)} · звонки в рабочие часы офиса</p>
              <div class="co-info__foot">
                <a class="btn btn--dark btn--sm" href="tel:${main.tel}">${icon('phone')} Позвонить</a>
                ${btn('Заказать звонок', R.contacts, { variant: 'ghost', size: 'sm', modal: 'request', subject: 'Обратный звонок', attrs: { 'data-modal-title': 'Перезвоним в рабочее время', 'data-modal-text': `Оставьте номер, и менеджер перезвонит в часы работы офиса: ${c.hours} по Владивостоку.`, 'data-modal-label': 'Звонок' } })}
              </div>
            </div>
            <div class="co-info"${reveal(2)}>
              ${label('Режим работы')}
              <div class="co-info__mid">${esc(c.hours)}</div>
              <p class="co-info__sub">Время владивостокское: на 7 часов впереди Москвы.</p>
              <div class="co-info__foot">${hoursLink || more('Все контакты', R.contacts)}</div>
            </div>
            <div class="co-info"${reveal(3)}>
              ${label('Мессенджеры и почта')}
              ${c.email ? `<a class="co-info__mid" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}
              <div class="co-info__foot">
                ${s.whatsapp ? `<a class="btn btn--wa btn--sm" ${extLink(s.whatsapp.url)}>${icon('whatsapp')} WhatsApp</a>` : ''}
                ${tg ? `<a class="btn btn--tg btn--sm" ${extLink(tg.url)}>${icon('telegram')} ${s.telegramManager ? 'Telegram' : 'Telegram-канал'}</a>` : ''}
                ${s.max ? `<a class="btn btn--ghost btn--sm" ${extLink(s.max.url)}>${icon('max')} MAX</a>` : ''}
              </div>
            </div>
          </div>
        </div>`;
}

/** Карточка организации на страницах контактов и компании. */
function requisites(ctx, { tag = 'h2' } = {}) {
  const { legal, contacts } = ctx.site;
  const bank = legal.bank;
  const row = (name, value) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
  return html`
        <div class="co-req" id="rekvizity"${reveal()}>
          <div>${label('Реквизиты')}</div>
          <div>
            <${tag} class="co-req__title">Владелец сайта</${tag}>
            <p class="co-req__text">${esc(legal.fullName)}</p>
            <dl class="co-req__list">
              ${row('ИНН', legal.inn)}
              ${row('КПП', legal.kpp)}
              ${row('ОГРН', legal.ogrn)}
              ${row('Юридический и фактический адрес', legal.address)}
              ${row('Офис для клиентов', contacts.addressFull)}
              <div><dt>Телефон организации</dt><dd><a class="link" href="tel:${esc(legal.phone.tel)}">${esc(legal.phone.label)}</a></dd></div>
              <div><dt>Электронная почта организации</dt><dd><a class="link" href="mailto:${esc(legal.email)}">${esc(legal.email)}</a></dd></div>
            </dl>
            <details class="acc">
              <summary>Банковские реквизиты<i class="acc__icon" aria-hidden="true"></i></summary>
              <div class="acc__body">
                <dl class="co-req__list">
                  ${row('Банк', bank.name)}
                  ${row('БИК', bank.bic)}
                  ${row('Расчетный счет', bank.account)}
                  ${row('Корреспондентский счет', bank.correspondentAccount)}
                </dl>
              </div>
            </details>
          </div>
        </div>`;
}

/** Аккордеон с якорями на каждый вопрос (разметка и классы — как у faqList) */
function accList(items, { open = -1 } = {}) {
  return html`
            <div data-acc-group>
              ${items.map(
                (f, i) => html`
              <details class="acc" id="q-${f.id}"${i === open ? ' open' : ''}${reveal(Math.min(i, 4))}>
                <summary><h3>${typo(f.q)}</h3><i class="acc__icon" aria-hidden="true"></i></summary>
                <div class="acc__body">${f.a}</div>
              </details>`
              )}
            </div>`;
}

const channelTile = ({ href, iconName, name, handle, text, i = 0, tag = 'h3' }) => html`
          <a class="co-channel" ${extLink(href)}${reveal(i)}>
            <span class="co-channel__top">${icon(iconName, 'co-channel__icon')}<span class="co-channel__go" aria-hidden="true">${icon('arrow')}</span></span>
            <${tag} class="co-channel__name">${esc(name)}</${tag}>
            ${handle ? `<span class="co-channel__handle">${esc(handle)}</span>` : ''}
            <span class="co-channel__text">${typo(text)}</span>
          </a>`;

/** Три карточки соцсетей с текстами заказчика (source.social.cards) */
function socialTiles(ctx, { tag = 'h3' } = {}) {
  const { site, source } = ctx;
  const meta = { Instagram: { iconName: 'instagram', handle: site.socials.instagram?.handle, star: true }, Telegram: { iconName: 'telegram', handle: site.socials.telegram?.handle }, YouTube: { iconName: 'youtube', handle: site.socials.youtube?.handle } };
  const cards = (source.social?.cards || []).filter((c) => meta[c.name]);
  return html`
        <div class="co-channels">
          ${cards.map((c, i) => channelTile({ href: c.url, iconName: meta[c.name].iconName, name: c.name + (meta[c.name].star ? '*' : ''), handle: meta[c.name].handle, text: c.text, i, tag }))}
        </div>
        ${cards.some((c) => meta[c.name].star) && source.company?.instagramDisclaimer ? `<p class="co-footnote">${esc(source.company.instagramDisclaimer)}</p>` : ''}`;
}

/** Цитата из отзыва — только если текст дословно есть в отзыве */
function findQuote(ctx, q) {
  if (!q) return null;
  const r = ctx.reviews.find((x) => x.author === q.author && x.text.includes(q.text));
  return r ? { ...q, url: r.url, source: r.source } : null;
}

const quoteText = (t) => `«${/^[а-яёa-z]/.test(t) ? '…' : ''}${esc(t.replace(/[.!\s]+$/, ''))}»`;

const CLOCK_JS = [
  '(function(){',
  'var box=document.querySelector("[data-vl-clock]");if(!box)return;',
  'var t=box.querySelector("[data-vl-time]"),s=box.querySelector("[data-vl-status]"),l=box.querySelector("[data-vl-local]"),n=box.querySelector("[data-vl-label]");',
  'var open=+box.getAttribute("data-open")||10,close=+box.getAttribute("data-close")||19,off=+box.getAttribute("data-offset")||10;',
  'function p(x){return(x<10?"0":"")+x}',
  'function tick(){var now=new Date(),v=new Date(now.getTime()+off*36e5),h=v.getUTCHours(),m=v.getUTCMinutes(),d=v.getUTCDay();',
  't.textContent=p(h)+":"+p(m);if(n)n.textContent="Сейчас во Владивостоке";',
  'var work=d>=1&&d<=5,on=work&&h>=open&&h<close,txt;',
  'if(on)txt="Офис открыт до "+p(close)+":00";',
  'else if(work&&h<open)txt="Офис откроется сегодня в "+p(open)+":00";',
  'else txt="Офис закрыт · откроется "+((d===5||d===6)?"в понедельник":"завтра")+" в "+p(open)+":00";',
  's.textContent=txt;s.className="co-clock__status "+(on?"is-open":"is-closed");',
  'if(l){var diff=-now.getTimezoneOffset()/60-off;',
  'l.textContent=diff===0?"Вы в одном часовом поясе с офисом":"У вас сейчас "+p(now.getHours())+":"+p(now.getMinutes())+" · "+(diff>0?"+":"−")+Math.abs(diff)+" ч к Владивостоку";}}',
  'tick();setInterval(tick,15000);',
  '})();',
].join('');

const TOC_JS = [
  '(function(){',
  'function openHash(){var id=location.hash.slice(1);if(!id)return;var el=document.getElementById(id);if(el&&el.tagName==="DETAILS"){el.open=true;}}',
  'window.addEventListener("hashchange",openHash);openHash();',
  'var links=[].slice.call(document.querySelectorAll("[data-toc] a"));',
  'if(!links.length||!("IntersectionObserver" in window))return;',
  'var map={};links.forEach(function(a){map[a.getAttribute("href").split("#")[1]]=a;});',
  'var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;',
  'links.forEach(function(a){a.classList.remove("is-active")});var a=map[e.target.id];if(a)a.classList.add("is-active");});},{rootMargin:"-18% 0px -72% 0px"});',
  'Object.keys(map).forEach(function(id){var el=document.getElementById(id);if(el)io.observe(el);});',
  '})();',
].join('');

// --- О компании --------------------------------------------------------------------------------------

function aboutPage(ctx) {
  const { site, source } = ctx;
  const t = ctx.content.about;
  const tools = textTools(ctx);
  const crumbs = [HOME, { name: 'О компании', url: R.about }];
  const reviewsCount = count(site.rating.count, REVIEW_WORD);

  const videos = source.videos || [];
  const views = Math.floor(videos.reduce((sum, v) => sum + (parseFloat(String(v.viewsOnCover).replace(',', '.')) || 0), 0));
  const clientCities = [...new Set(ctx.cases.map((c) => c.clientCity).filter((x) => x && x !== site.contacts.city))];
  const board = [...ctx.cases.filter((c) => c.clientCity), ...ctx.cases.filter((c) => !c.clientCity && c.countryName && c.price)].slice(0, 8);
  const picked = t.reviews.authors.map((name) => ctx.reviews.find((r) => r.author === name)).filter(Boolean);

  const ledger = [
    { value: comma(site.rating.value.toFixed(1)), name: fillBraces(t.ledger.rating, { count: reviewsCount, countGen: reviewsGen(site.rating.count) }), url: R.reviews },
    { value: String(ctx.cases.length), name: `${plural(ctx.cases.length, CAR_WORD)} ${t.ledger.cases}`, url: R.cases },
    { value: String(ctx.countries.length), name: `${plural(ctx.countries.length, ['страна', 'страны', 'стран'])}: ${t.ledger.countries}`, url: R.catalog },
    videos.length ? { value: String(views), unit: 'тыс.', name: fillBraces(t.ledger.views, { n: `${videos.length} ${videos.length % 10 === 1 && videos.length % 100 !== 11 ? 'ролика' : 'роликов'}` }), url: R.video } : null,
  ].filter(Boolean);

  return {
    url: R.about,
    type: 'about',
    title: t.title,
    description: fillBraces(t.description, { reviews: reviewsCount }),
    h1: `${t.h1Main} ${t.h1Mute}`,
    breadcrumbs: crumbs,
    headerOver: true,
    priority: 0.6,
    changefreq: 'monthly',
    ogImage: 'img/hero/poster.webp',
    preload: [{ href: 'img/hero/poster.webp', as: 'image', type: 'image/webp' }],
    render: () => html`
    ${pageHead({
      crumbs,
      label: t.headLabel,
      h1: duo(t.h1Main, t.h1Mute),
      lead: source.hero?.subtitle,
      photo: 'assets/img/hero/poster.webp',
      photoAlt: 'Владивосток в сумерках: Золотой мост и бухта Золотой Рог',
      single: true,
      actions:
        btn('Связаться с менеджером', R.contacts, { variant: 'light', modal: 'request', subject: 'Заявка со страницы «О компании»' }) +
        btn('Отзывы клиентов', R.reviews, { variant: 'ghost' }),
    })}

    <section class="section" id="kto-my">
      <div class="container">
        <div class="co-manifest">
          <div class="co-manifest__aside"${reveal()}>${label(t.manifest.label)}</div>
          <div>
            <h2 class="co-manifest__title" data-split>${glue(t.manifest.title)}</h2>
            <p class="co-manifest__statement"${reveal(1)}>${typo(t.manifest.statement)}</p>
            <div class="co-manifest__cols"${reveal(2)}>
              ${t.manifest.paragraphs.map((p) => `<p>${typo(p)}</p>`)}
            </div>
          </div>
        </div>
        ${companyFigures(ledger)}
      </div>
    </section>

    <section class="section section--white" id="put-avtomobilya">
      <div class="container">
        ${sectionHead({ label: t.journey.label, title: duoS(t.journey.titleMain, t.journey.titleMute), lead: t.journey.lead, actions: R.howTo ? more('Как заказать автомобиль', R.howTo) : '' })}
        <div class="co-band"${reveal()}>
          <div class="co-band__bg">${img({ src: 'assets/img/hero/bridge-kei.webp', alt: t.journey.bandAlt, sizes: '100vw' })}</div>
          <div class="u-hide-mobile">${route([ctx.countries.map((c) => c.navTitle).join(' · '), site.contacts.city, 'Ваш город'], 'co-route-xl')}</div>
          <div class="u-only-mobile">${route(['Азия', site.contacts.city, 'Ваш город'], 'co-route-xl')}</div>
          ${label('Одна компания', 'u-hide-mobile')}
        </div>
        <ol class="co-journey">
          ${t.journey.stops.map(
            (s, i) => html`
          <li class="co-stop"${reveal(i % 3)}>
            <span class="co-stop__num">${pad2(i + 1)} / ${pad2(t.journey.stops.length)}</span>
            <h3 class="co-stop__title">${typo(s.title)}</h3>
            <p class="co-stop__text">${typo(s.text)}</p>
            <div class="${cx('co-stop__who', s.own && 'is-own')}">${s.link ? `<a href="${u(tools.to(s.link))}">${esc(s.who)}</a>` : esc(s.who)}</div>
          </li>`
          )}
        </ol>
      </div>
    </section>

    <section class="section section--white" id="principy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(t.principles.label)}
            <h2>${duo(t.principles.titleMain, t.principles.titleMute)}</h2>
            <p class="lead">${typo(t.principles.lead)}</p>
            ${more('Вопросы и ответы', R.faq)}
          </div>
          <div class="split__body co-principles">
            ${t.principles.items.map((p, i) => {
              const q = findQuote(ctx, p.quote);
              return html`
            <article class="co-principle"${reveal(Math.min(i, 3))}>
              <span class="co-principle__num">${pad2(i + 1)}</span>
              <div>
                <h3 class="co-principle__title">${typo(p.title)}</h3>
                <p class="co-principle__text">${typo(p.text)}</p>
                ${p.link ? `<a class="link" href="${u(tools.to(p.link.to))}">${esc(p.link.text)}</a>` : ''}
              </div>
              ${q
                ? html`<figure class="co-quote">
                <blockquote>${quoteText(q.text)}</blockquote>
                <figcaption><span>${esc(q.author)}</span>${q.url ? `<a ${extLink(q.url)}>отзыв в ${esc(q.source)}</a>` : ''}</figcaption>
              </figure>`
                : ''}
            </article>`;
            })}
          </div>
        </div>
      </div>
    </section>

    ${board.length
      ? html`
    <section class="section" id="geografiya">
      <div class="container">
        ${sectionHead({
          label: t.geo.label,
          title: duoS(t.geo.titleMain, t.geo.titleMute),
          lead: fillBraces(t.geo.lead, { cities: clientCities.join(', ') }),
          actions: more('Все привезенные авто', R.cases),
        })}
        <div class="co-board">
          ${board.map(
            (c, i) => html`
          <a class="co-board__row" href="${u(c.url)}"${reveal(Math.min(i, 4))}>
            <span class="status ${c.statusCls}">${esc(c.statusLabel)}</span>
            ${route([c.countryName, site.contacts.city, c.clientCity && c.clientCity !== site.contacts.city ? c.clientCity : null])}
            <span class="co-board__name">${esc(c.name)}</span>
            <span class="co-board__price">${c.price ? price(c.price) : esc(c.statusLabel)}</span>
            ${icon('arrow')}
          </a>`
          )}
        </div>
      </div>
    </section>`
      : ''}

    <section class="section section--white" id="otzyvy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(t.reviews.label)}
            <h2>${duo(t.reviews.titleMain, t.reviews.titleMute)}</h2>
            ${ratingBlock(site)}
            <p class="lead">${typo(t.reviews.lead)}</p>
            ${btn(`Читать ${reviewsCount}`, R.reviews, { variant: 'dark' })}
          </div>
          <div class="split__body">
            <div class="co-masonry2">
              ${picked.map((r, i) => reviewCard(r, { i: i % 2 }))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section co-office" id="ofis">
      <div class="container">
        ${sectionHead({ label: t.office.label, title: duoS(t.office.titleMain, t.office.titleMute), lead: t.office.lead })}
        ${contactGrid(ctx, { alt: ctx.content.contacts.addressAlt, tag: 'h3' })}
        <div class="u-mt-8">${requisites(ctx, { tag: 'h3' })}</div>
        <div class="u-mt-8">
          ${linkBlock('Каталог по странам', ctx.nav.countries.map((c) => ({ name: `Авто ${c.from}`, url: c.url, count: c.count || undefined })))}
          ${linkBlock('Услуги', ctx.services.map((s) => ({ name: s.navName || s.name, url: s.url })))}
          ${linkBlock('Полезное', [
            { name: 'Калькулятор стоимости', url: R.calculator },
            { name: 'Доставка по России', url: R.delivery },
            { name: 'Привезенные авто', url: R.cases },
            { name: 'Вопросы и ответы', url: R.faq },
            { name: 'Как читать аукционный лист', url: R.auctionSheet },
            { name: 'Видео', url: R.video },
            { name: 'Блог', url: R.blog },
          ])}
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { subject: 'Заявка со страницы «О компании»', bg: 'assets/img/hero/gclass-road.webp', title: duo('Расскажите, какой автомобиль нужен,', 'а остальное возьмем на себя') })}`,
  };
}

// --- Контакты ----------------------------------------------------------------------------------------

function contactsPage(ctx) {
  const { site } = ctx;
  const t = ctx.content.contacts;
  const tools = textTools(ctx);
  const c = site.contacts;
  const crumbs = [HOME, { name: 'Контакты', url: R.contacts }];
  const spec = c.hoursSpec?.[0] || { opens: '10:00', closes: '19:00' };
  const open = parseInt(spec.opens, 10);
  const close = parseInt(spec.closes, 10);
  const geo = geoOf(ctx);
  const faq = t.faq.map((f) => ({ q: f.q, a: tools.md(f.a) }));

  const salesPhone = c.phones[0];

  const zone = (z) => {
    const shift = z.offset - VL_OFFSET;
    const h = (x) => `${pad2((x + shift + 24) % 24)}:00`;
    return { ...z, hours: `${h(open)}-${h(close)}`, diff: shift === 0 ? 'местное время' : `${shift > 0 ? '+' : '−'}${Math.abs(shift)} ч к Владивостоку` };
  };

  return {
    url: R.contacts,
    type: 'contacts',
    title: t.title,
    description: t.description,
    h1: `${t.h1Main} ${t.h1Mute}`,
    breadcrumbs: crumbs,
    priority: 0.7,
    changefreq: 'monthly',
    jsonld: [faqLd(faq)].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs,
      label: `Офис: ${c.city} · МСК+7`,
      h1: duo(t.h1Main, t.h1Mute),
      lead: t.lead,
      side: html`<div class="co-clock" data-vl-clock data-open="${open}" data-close="${close}" data-offset="${VL_OFFSET}">
              <span class="label" data-vl-label>Режим работы офиса</span>
              <div class="co-clock__time" data-vl-time>${esc(spec.opens)}-${esc(spec.closes)}</div>
              <div class="co-clock__status" data-vl-status>Пн-Пт · время владивостокское, МСК+7</div>
              <div class="co-clock__local" data-vl-local></div>
            </div>`,
    })}

    <section class="section section--sm section--flush-top" id="adres">
      <div class="container">
        ${contactGrid(ctx, { alt: t.addressAlt, hoursLink: more('Часы работы в вашем городе', '#vremya') })}
      </div>
    </section>

    <section class="section section--white" id="menedzhery">
      <div class="container">
        ${sectionHead({ label: t.managers.label, title: duoS(t.managers.titleMain, t.managers.titleMute), lead: t.managers.lead })}
        <div class="co-people">
          ${ctx.team.map((p, i) => html`
          <article class="co-man"${reveal(Math.min(i, 4))}>
            <div class="co-man__photo" aria-hidden="true">${img({ src: p.photo, alt: '', cls: 'sales-portrait', sizes: '76px' })}</div>
            <div>
              <h3 class="co-man__name">${esc(p.name)}</h3>
              <div class="co-man__role">${esc(p.role)}</div>
            </div>
            <div class="co-man__contact">
              <div class="co-man__role">${esc(salesPhone.department)}</div>
              <a class="co-man__phone" href="tel:${esc(salesPhone.tel)}">${esc(salesPhone.label)}</a>
            </div>
            <div class="co-man__actions">
              ${site.socials.whatsapp ? `<a class="btn btn--wa btn--sm" ${extLink(site.socials.whatsapp.url)} aria-label="Написать в отдел продаж в WhatsApp">${icon('whatsapp')} WhatsApp</a>` : ''}
              <a class="btn btn--ghost btn--sm" href="tel:${esc(salesPhone.tel)}" aria-label="Позвонить в отдел продаж">${icon('phone')} Позвонить</a>
            </div>
          </article>`)}
        </div>
      </div>
    </section>

    <section class="section" id="vremya">
      <div class="container">
        ${sectionHead({ label: t.time.label, title: duoS(t.time.titleMain, t.time.titleMute), lead: t.time.lead })}
        <div class="co-tz">
          ${t.time.zones.map(zone).map(
            (z, i) => html`
          <div class="${cx('co-tz__cell', z.home && 'co-tz__cell--home')}"${reveal(i)}>
            <span class="co-tz__city">${esc(z.cities)}</span>
            <span class="co-tz__diff">${esc(z.diff)}</span>
            <span class="co-tz__hours">${z.hours}</span>
          </div>`
          )}
        </div>
        <div class="u-mt-5">${note(typo(t.time.note))}</div>
      </div>
    </section>

    <section class="section section--flush-top" id="kak-dobratsya">
      <div class="container">
        ${sectionHead({ label: t.way.label, title: duoS(t.way.titleMain, t.way.titleMute), lead: t.way.lead, actions: mapButtons(site) })}
        <div class="grid grid--3">
          ${t.way.steps.map((s, i) => {
            const foot = [
              ['Адрес для навигатора', esc(`${c.city}, ${c.street}`)],
              ['Координаты офиса', geo ? `<button class="link" type="button" data-copy="${geo.lat}, ${geo.lon}" data-copy-done="Координаты скопированы">${geo.lat}, ${geo.lon}</button>` : ''],
              ['Телефон', `<a class="link" href="tel:${c.phones[0].tel}">${esc(c.phones[0].label)}</a>`],
            ][i];
            return html`
          <article class="step step--light"${reveal(i)}>
            <div class="step__head"><span class="step__num">Шаг ${pad2(i + 1)}</span></div>
            <h3 class="step__title">${typo(s.title)}</h3>
            <p class="step__text">${typo(s.text)}</p>
            ${foot && foot[1] ? `<div class="step__pay"><span>${foot[0]}</span>${foot[1]}</div>` : ''}
          </article>`;
          })}
        </div>
        <div class="u-mt-5">${note(`${typo(t.way.remote)} <a class="link" href="${u(R.delivery)}">Доставка по России</a>`)}</div>
      </div>
    </section>

    <section class="section section--white" id="napisat">
      <div class="container">
        <div class="co-ask">
          <div class="co-ask__copy"${reveal()}>
            ${label(t.form.label)}
            <h2>${duo(t.form.titleMain, t.form.titleMute)}</h2>
            <p class="lead">${typo(t.form.lead)}</p>
            ${ticks(t.form.ticks)}
          </div>
          <div class="co-ask__panel"${reveal(1)}>
            <h3>${esc(t.form.panelTitle)}</h3>
            <p>${typo(t.form.panelText)}</p>
            ${leadForm({ subject: 'Сообщение со страницы «Контакты»', fields: ['name', 'phone', 'comment', 'contact'], cta: t.form.cta, btn: 'btn--primary' })}
          </div>
        </div>
      </div>
    </section>

    <section class="section section--white" id="socseti">
      <div class="container">
        ${sectionHead({ label: t.social.label, title: duoS(t.social.titleMain, t.social.titleMute), lead: t.social.lead, actions: more('Все ролики', R.video) })}
        ${socialTiles(ctx)}
      </div>
    </section>

    <section class="section" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(t.faqHead.label)}
            <h2>${duo(t.faqHead.titleMain, t.faqHead.titleMute)}</h2>
            <p class="lead">${typo(t.faqHead.lead)}</p>
            ${more('Все вопросы и ответы', R.faq)}
          </div>
          <div class="split__body">${faqList(faq)}</div>
        </div>
        <div class="u-mt-8">${requisites(ctx)}</div>
      </div>
    </section>

    ${ctaBand(ctx, { subject: 'Заявка со страницы «Контакты»', bg: 'assets/img/hero/street-far.webp', title: duo('Знаете, какой автомобиль нужен?', 'Посчитаем его под ключ') })}
    <script>${CLOCK_JS}</script>`,
  };
}

// --- Отзывы ------------------------------------------------------------------------------------------

function reviewsPage(ctx) {
  const { site } = ctx;
  const t = ctx.content.companyPages.reviews;
  const tools = textTools(ctx);
  const crumbs = [HOME, { name: 'Отзывы', url: R.reviews }];
  const total = site.rating.count;
  const twoGis = site.rating.twoGisCount;
  const vars = { count: count(total, REVIEW_WORD), twoGis: String(twoGis), yandex: String(total - twoGis) };
  const faq = t.faq.map((f) => ({ q: f.q, a: tools.md(fillBraces(f.a, vars)) }));
  const themes = t.themes.items.map((x) => ({ theme: x.theme, ...findQuote(ctx, x) })).filter((x) => x.text);
  // сначала кейсы, о которых прямо говорится в отзывах (Jimny → Иркутск, Yaris Cross → Сургут), затем остальные с ценой
  const mentioned = ctx.cases.filter((c) => c.clientCity && c.clientCity !== site.contacts.city);
  const cases = [...mentioned, ...ctx.cases.filter((c) => !mentioned.includes(c) && c.price)].slice(0, 10);
  const unique = ctx.reviews.filter((r, i, arr) => arr.findIndex((x) => x.text === r.text) === i);

  return {
    url: R.reviews,
    type: 'reviews',
    title: t.title,
    description: fillBraces(t.description, vars),
    h1: `${t.h1Main} ${t.h1Mute}`,
    breadcrumbs: crumbs,
    priority: 0.7,
    changefreq: 'weekly',
    images: ctx.reviews.flatMap((r) => r.photos),
    jsonld: [...reviewsLd(site, unique), faqLd(faq)].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs,
      label: '2ГИС · Яндекс Карты',
      h1: duo(t.h1Main, t.h1Mute),
      lead: fillBraces(t.lead, vars),
      side: ratingBlock(site),
      actions: mapButtons(site),
    })}

    <section class="section section--white section--sm" id="vse-otzyvy">
      <div class="container">
        <h2 class="sr-only">${esc(t.listTitle)}: ${vars.count}</h2>
        <div class="masonry">
          ${ctx.reviews.map((r, i) => reviewCard(r, { i: i % 3, clamp: false }))}
        </div>
      </div>
    </section>

    ${themes.length
      ? html`
    <section class="section section--white" id="temy">
      <div class="container">
        ${sectionHead({ label: t.themes.label, title: duoS(t.themes.titleMain, t.themes.titleMute), lead: t.themes.lead })}
        <div class="co-pulls">
          ${themes.map(
            (q, i) => html`
          <figure class="co-pull"${reveal(i % 2)}>
            ${label(q.theme)}
            <blockquote>${quoteText(q.text)}</blockquote>
            <figcaption><span>${esc(q.author)}</span>${q.url ? `<a class="link" ${extLink(q.url)}>Отзыв в ${esc(q.source)}</a>` : ''}</figcaption>
          </figure>`
          )}
        </div>
      </div>
    </section>`
      : ''}

    ${cases.length
      ? html`
    <section class="section" id="avto-iz-otzyvov">
      <div class="container">
        ${sectionHead({ label: t.cases.label, title: duoS(t.cases.titleMain, t.cases.titleMute), lead: t.cases.lead, aside: railNav(), actions: more(`Все ${count(ctx.cases.length, ['привезенный автомобиль', 'привезенных автомобиля', 'привезенных автомобилей'])}`, R.cases) })}
        ${rail(cases.map((c, i) => caseCard(c, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
      </div>
    </section>`
      : ''}

    <section class="section section--white" id="ostavit-otzyv">
      <div class="container">
        <div class="split split--even">
          <div class="split__sticky"${reveal()}>
            ${label(t.leave.label)}
            <h2>${duo(t.leave.titleMain, t.leave.titleMute)}</h2>
            <p class="lead">${typo(t.leave.lead)}</p>
          </div>
          <div class="co-channels co-channels--2">
            ${channelTile({ href: site.contacts.maps.twoGis, iconName: 'pin', name: '2ГИС', handle: `на этой странице ${twoGis} ${plural(twoGis, REVIEW_WORD)}`, text: t.leave.twoGis, i: 0 })}
            ${channelTile({ href: site.contacts.maps.yandex, iconName: 'star', name: 'Яндекс Карты', handle: `на этой странице ${total - twoGis} ${plural(total - twoGis, REVIEW_WORD)}`, text: t.leave.yandex, i: 1 })}
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(t.faqHead.label)}
            <h2>${duo(t.faqHead.titleMain, t.faqHead.titleMute)}</h2>
            ${more('О компании', R.about)}
          </div>
          <div class="split__body">${faqList(faq)}</div>
        </div>
        <div class="u-mt-8">
          ${linkBlock('Каталог по странам', ctx.nav.countries.map((c) => ({ name: `Авто ${c.from}`, url: c.url })))}
          ${linkBlock('Дальше', [
            { name: 'Привезенные авто', url: R.cases },
            { name: 'Калькулятор стоимости', url: R.calculator },
            { name: 'Доставка по России', url: R.delivery },
            { name: 'Вопросы и ответы', url: R.faq },
            { name: 'Контакты', url: R.contacts },
          ])}
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { subject: 'Заявка со страницы отзывов', bg: 'assets/img/hero/bridge-kei.webp', title: duo('Следующий отзыв', 'будет о вашем автомобиле') })}`,
  };
}

// --- Вопросы и ответы ----------------------------------------------------------------------------------

function faqPage(ctx) {
  const t = ctx.content.faqPage;
  const tools = textTools(ctx);
  const crumbs = [HOME, { name: 'Вопросы и ответы', url: R.faq }];
  const groups = t.groups.map((g) => ({
    ...g,
    links: (g.links || []).map((l) => ({ name: l.name, url: tools.to(l.to) })),
    posts: postLinks(ctx, g.posts),
    items: g.items.map((f) => ({ id: f.id, q: f.q, a: tools.md(f.a) })),
  }));
  const all = groups.flatMap((g) => g.items);
  const total = count(all.length, ['ответ', 'ответа', 'ответов']);
  const asOf = tools.fill('{{asOf}}');

  return {
    url: R.faq,
    type: 'faq',
    title: t.title,
    description: fillBraces(t.description, { count: total }),
    h1: `${t.h1Main} ${t.h1Mute}`,
    breadcrumbs: crumbs,
    priority: 0.7,
    changefreq: 'monthly',
    jsonld: [faqLd(all)].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs,
      label: `Актуально на ${asOf}`,
      h1: duo(t.h1Main, t.h1Mute),
      lead: tools.fill(t.lead),
      kv: [
        { k: 'Вопросов', v: String(all.length) },
        { k: 'Тем', v: String(groups.length) },
        { k: 'Ставки и сроки', v: `на ${asOf}` },
      ],
      actions:
        btn('Задать свой вопрос', R.contacts, { modal: 'request', subject: 'Вопрос менеджеру (FAQ)', attrs: { 'data-modal-title': 'Задайте вопрос менеджеру', 'data-modal-text': 'Оставьте контакты, и мы перезвоним или напишем в мессенджер в рабочее время.', 'data-modal-label': 'Вопрос' } }) +
        btn('Калькулятор', R.calculator, { variant: 'ghost' }),
    })}

    <section class="section section--white">
      <div class="container">
        <div class="co-doc">
          <aside class="co-doc__nav" aria-label="Темы вопросов">
            <ol class="co-toc" data-toc>
              ${groups.map((g) => `<li><a href="#${g.id}">${esc(g.title)}<small>${pad2(g.items.length)}</small></a></li>`)}
            </ol>
            <div class="co-doc__nav-extra">
              <p class="muted small" style="margin-bottom:12px">${typo('Не нашли ответ? Спросите менеджера: он ответит по вашему автомобилю.')}</p>
              ${btn('Спросить', R.contacts, { variant: 'dark', size: 'sm', modal: 'request', subject: 'Вопрос менеджеру (FAQ)', attrs: { 'data-modal-title': 'Задайте вопрос менеджеру', 'data-modal-label': 'Вопрос' } })}
            </div>
          </aside>
          <div>
            ${groups.map(
              (g, gi) => html`
            <div class="co-doc__group" id="${g.id}">
              <div class="co-doc__head"${reveal()}>
                ${label(`${pad2(gi + 1)} / ${pad2(groups.length)}`)}
                <h2>${typo(g.title)}</h2>
                <p>${typo(g.lead)}</p>
              </div>
              ${accList(g.items, { open: gi === 0 ? 0 : -1 })}
              ${g.links.length ? `<div class="co-doc__links"><span class="label label--plain">По теме</span>${g.links.map((l) => `<a class="chip chip--sm" href="${u(l.url)}">${esc(l.name)}</a>`).join('')}</div>` : ''}
              ${g.posts.length ? `<div class="co-doc__links"><span class="label label--plain">В блоге</span>${g.posts.map((l) => `<a class="chip chip--sm" href="${u(l.url)}">${esc(l.name)}</a>`).join('')}</div>` : ''}
            </div>`
            )}
            <div class="u-mt-8">${note(typo(t.note))}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--sm">
      <div class="container">
        ${linkBlock('Каталог по странам', ctx.nav.countries.map((c) => ({ name: `Авто ${c.from}`, url: c.url })), { tag: 'h2' })}
        ${linkBlock('Услуги', ctx.services.map((s) => ({ name: s.navName || s.name, url: s.url })), { tag: 'h2' })}
        ${linkBlock('Доставка по городам', ctx.cities.slice(0, 12).map((c) => ({ name: c.name, url: c.url })), { tag: 'h2' })}
        ${linkBlock('Справочные материалы', [
          { name: 'Информация для клиентов', url: R.clients },
          { name: 'Калькулятор стоимости', url: R.calculator },
          R.howTo ? { name: 'Как заказать автомобиль', url: R.howTo } : null,
          { name: 'Как читать аукционный лист', url: R.auctionSheet },
          { name: 'Блог', url: R.blog },
          { name: 'Привезенные авто', url: R.cases },
          { name: 'Отзывы', url: R.reviews },
        ].filter(Boolean), { tag: 'h2' })}
      </div>
    </section>

    ${ctaBand(ctx, { label: 'Не нашли ответ?', subject: 'Вопрос со страницы FAQ', bg: 'assets/img/hero/city-towers.webp', title: duo('Спросите менеджера:', 'он ответит по вашему автомобилю'), text: 'Напишите марку, модель и бюджет: менеджер подберет варианты, объяснит, какие платежи к ним применяются, и посчитает цену под ключ.' })}
    <script>${TOC_JS}</script>`,
  };
}

// --- Видео -------------------------------------------------------------------------------------------

function videoPage(ctx) {
  const { site, source } = ctx;
  const t = ctx.content.companyPages.video;
  const tools = textTools(ctx);
  const crumbs = [HOME, { name: 'Видео', url: R.video }];
  const videos = source.videos || [];
  const views = Math.floor(videos.reduce((sum, v) => sum + (parseFloat(String(v.viewsOnCover).replace(',', '.')) || 0), 0));
  const reels = count(videos.length, ['ролик', 'ролика', 'роликов']);
  const rows = t.bridge.rows.filter((r) => videos.some((v) => v.title === r.video));

  return {
    url: R.video,
    type: 'video',
    title: t.title,
    description: fillBraces(t.description, { count: reels }),
    h1: `${t.h1Main} ${t.h1Mute}`,
    breadcrumbs: crumbs,
    headerOver: true,
    priority: 0.5,
    changefreq: 'weekly',
    images: videos.map((v) => v.cover),
    jsonld: [
      {
        '@type': 'ItemList',
        name: 'Видео Макс Групп',
        numberOfItems: videos.length,
        itemListElement: videos.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: v.title, url: v.url })),
      },
    ],
    render: () => html`
    ${pageHead({
      crumbs,
      label: 'Instagram · Telegram · YouTube',
      h1: duo(t.h1Main, t.h1Mute),
      lead: t.lead,
      kv: [
        { k: 'На странице', v: reels },
        { k: 'Просмотров', v: `${views} тыс.` },
        { k: 'Счетчики', v: 'с обложек роликов' },
      ],
    })}

    <section class="section section--white section--flush-top" id="roliki">
      <div class="container">
        <h2 class="sr-only">${esc(t.listTitle)}</h2>
        <div class="co-reels">
          ${videos.map(
            (v, i) => html`
          <a class="${cx('reel', i === 0 && 'reel--big')}" ${extLink(v.url)}${reveal(Math.min(i % 5, 4))}>
            <span class="reel__media">
              ${img({ src: v.cover, alt: `Видео «${v.title}», ${v.viewsOnCover} просмотров`, sizes: i === 0 ? '(max-width: 720px) 100vw, 34vw' : '(max-width: 720px) 50vw, 17vw', priority: i === 0 })}
              <span class="reel__play" aria-hidden="true">${icon('play-fill')}</span>
            </span>
            <span class="reel__title">${esc(v.title)}</span>
            <span class="co-reel__meta">${esc(v.viewsOnCover)} просмотров</span>
          </a>`
          )}
        </div>
        <p class="co-footnote">${typo(`${[...new Set(videos.map((v) => v.platform))].join(', ')}*. Ролики открываются на площадке, где они опубликованы; число просмотров указано по счетчикам на обложках.`)}</p>
      </div>
    </section>

    <section class="section section--white" id="kanaly">
      <div class="container">
        ${sectionHead({ label: t.channels.label, title: duoS(t.channels.titleMain, t.channels.titleMute), lead: t.channels.lead })}
        ${socialTiles(ctx)}
      </div>
    </section>

    <section class="section" id="ot-rolika-k-raschetu">
      <div class="container">
        <div class="split split--even">
          <div class="split__sticky"${reveal()}>
            ${label(t.bridge.label)}
            <h2>${duo(t.bridge.titleMain, t.bridge.titleMute)}</h2>
            <p class="lead">${typo(t.bridge.lead)}</p>
            <div class="btn-row">
              ${btn('Рассчитать стоимость', R.calculator, { variant: 'dark' })}
              ${btn('Каталог', R.catalog, { variant: 'ghost' })}
            </div>
          </div>
          <div${reveal(1)}>
            <div class="prose prose--muted">${t.bridge.text.map((p) => `<p>${typo(p)}</p>`)}</div>
            <h3 class="h4 u-mt-7" style="margin-bottom:16px">Что посмотреть на сайте после ролика</h3>
            <div class="co-rows">
              ${rows.map(
                (r) => html`
              <a class="co-row" href="${u(tools.to(r.to))}">
                <span class="co-row__from">«${esc(r.video)}»</span>
                <span class="co-row__to">${esc(r.name)}</span>
                ${icon('arrow')}
              </a>`
              )}
            </div>
          </div>
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { subject: 'Заявка со страницы видео', bg: 'assets/img/hero/street-night.webp', title: duo('Хотите автомобиль,', 'как в ролике?') })}`,
  };
}

// --- Политика конфиденциальности ---------------------------------------------------------------------------

function privacyPage(ctx) {
  const p = ctx.source.privacyPolicy;
  const t = ctx.content.companyPages.privacy;
  if (!p) return null;
  const { legal } = ctx.site;
  const crumbs = [HOME, { name: 'Политика конфиденциальности', url: R.privacy }];
  const sections = p.sections.map((s, i) => ({
    ...s,
    id: `p-${i + 1}`,
    paragraphs: s.paragraphs.map((v) => v.replace('компании «Макс Групп»', legal.name)),
    list: s.title.endsWith('Контактная информация') ? [
      legal.fullName,
      `ИНН ${legal.inn}, КПП ${legal.kpp}, ОГРН ${legal.ogrn}`,
      `Адрес оператора: ${legal.address}`,
      `Телефон: ${legal.phone.label}`,
      `Электронная почта: ${legal.email}`,
    ] : s.list,
  }));
  return {
    url: R.privacy,
    type: 'privacy',
    title: t.title,
    description: t.description,
    h1: p.h1,
    breadcrumbs: crumbs,
    priority: 0.2,
    changefreq: 'yearly',
    render: () => html`
    ${pageHead({ crumbs, label: `Обновлено ${t.updated}`, h1: esc(p.h1), lead: t.lead, single: true, cls: 'co-head--doc' })}
    <section class="section section--white section--sm">
      <div class="container">
        <div class="co-doc">
          <aside class="co-doc__nav" aria-label="Разделы политики">
            <ol class="co-toc co-toc--sm" data-toc>
              ${sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`)}
            </ol>
          </aside>
          <article class="prose">
            ${sections.map(
              (s) => html`
            <h2 id="${s.id}">${esc(s.title)}</h2>
            ${s.paragraphs.map((x) => `<p>${esc(x)}</p>`)}
            ${s.list?.length ? `<ul>${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`
            )}
            <p class="muted small">Обновлено ${esc(t.updated)}</p>
          </article>
        </div>
      </div>
    </section>
    ${ctaBand(ctx, { subject: 'Заявка со страницы политики конфиденциальности', label: 'Связаться', title: duo('Остались вопросы?', 'Напишите или позвоните нам'), text: 'По вопросам обработки персональных данных и по любым вопросам о заказе автомобиля оставьте контакты, и менеджер свяжется с вами в рабочее время.', panelTitle: 'Свяжемся в рабочее время', fields: ['name', 'phone', 'comment'], cta: 'Отправить' })}
    <script>${TOC_JS}</script>`,
  };
}

// --- Карта сайта --------------------------------------------------------------------------------------------

function sitemapPage(ctx) {
  const t = ctx.content.companyPages.sitemap;
  const crumbs = [HOME, { name: 'Карта сайта', url: R.sitemap }];
  const hasCatalog = ctx.cars.length > 0;
  const selections = ctx.selections.filter((s) => s.count > 0);
  const byMacro = groupBy(ctx.cities, (c) => c.macro || 'Россия');
  const li = (name, url, extra = '') => `<li><a href="${u(url)}">${esc(name)}</a>${extra}</li>`;
  const list = (items) => `<ul class="co-map__list">${items.map((x) => li(x.name, x.url)).join('')}</ul>`;
  const group = (id, title, n, body, lead) => html`
        <section class="co-map__group" id="${id}">
          <div class="co-map__head">
            ${n !== null && n !== undefined ? label(String(n)) : ''}
            <h2>${esc(title)}</h2>
            ${lead ? `<p class="muted small">${typo(lead)}</p>` : ''}
          </div>
          <div>${body}</div>
        </section>`;

  const main = [
    { name: 'Главная', url: R.home },
    { name: 'Каталог автомобилей', url: R.catalog },
    { name: 'Подборки', url: R.selections },
    { name: 'Услуги', url: R.services },
    { name: 'Калькулятор стоимости', url: R.calculator },
    { name: 'Информация для клиентов', url: R.clients },
    { name: 'Доставка по России', url: R.delivery },
    { name: 'Привезенные авто', url: R.cases },
    { name: 'Отзывы клиентов', url: R.reviews },
    { name: 'О компании', url: R.about },
    { name: 'Контакты', url: R.contacts },
    { name: 'Вопросы и ответы', url: R.faq },
    { name: 'Видео', url: R.video },
    { name: 'Блог', url: R.blog },
  ].filter(Boolean);

  // подборки: общие (/podborki/…) и срезы внутри стран (/avto-iz-yaponii/do-160-ls/)
  const globalSelections = selections.filter((s) => s.global !== false);
  const countrySelections = [
    ...(ctx.slices || []).filter((x) => x.count > 0),
    ...ctx.countries.map((cn) => ({ country: cn.slug, h1: `Топ-30 автомобилей ${cn.from}`, url: R.topModels(cn.slug) })),
  ];
  const selectionsBody =
    (globalSelections.length ? `<h3 class="co-map__sub">Все страны<small>${globalSelections.length}</small></h3>${list(globalSelections.map((s) => ({ name: s.h1 || s.name, url: s.url })))}` : '') +
    ctx.countries
      .map((cn) => {
        const own = countrySelections.filter((x) => x.country === cn.slug);
        return own.length ? `<h3 class="co-map__sub">Подборки авто ${esc(cn.from)}<small>${own.length}</small></h3>${list(own.map((x) => ({ name: x.h1 || `${x.name} ${cn.from}`, url: x.url })))}` : '';
      })
      .join('');

  const catalogBody = ctx.countries
    .map((cn) => {
      const brands = ctx.brandsOf(cn.slug);
      if (!brands.length) return '';
      return html`
            <h3 class="co-map__sub"><a href="${u(R.country(cn.slug))}">Авто ${esc(cn.from)}</a><small>${ctx.cars.filter((c) => c.country === cn.slug).length}</small></h3>
            <div class="co-map__brands">
              ${brands.map(
                (b) => html`
              <div class="co-map__brand">
                <h4><a href="${u(b.url)}">${esc(b.name)} ${esc(cn.from)}</a><small>${b.count}</small></h4>
                <ul>${b.models.map((m) => li(m.name, m.url)).join('')}</ul>
              </div>`
              )}
            </div>`;
    })
    .join('');

  const carsBody = ctx.countries
    .map((cn) => {
      const cars = ctx.cars.filter((c) => c.country === cn.slug).sort((x, y) => x.titleYear.localeCompare(y.titleYear) || (x.priceRub || 0) - (y.priceRub || 0));
      if (!cars.length) return '';
      return html`
            <h3 class="co-map__sub">Автомобили ${esc(cn.from)}<small>${cars.length}</small></h3>
            <ul class="co-map__cars">
              ${cars.map((c) => `<li><a href="${u(c.url)}">${esc(c.titleYear)}${c.trim && c.trim.length <= 18 ? ` ${esc(c.trim)}` : ''}</a><span>${c.priceRub ? price(c.priceRub) : ''}</span></li>`).join('')}
            </ul>`;
    })
    .join('');

  const servicePages = [
    { name: 'Политика конфиденциальности', url: R.privacy },
    { name: 'Права на фотографии', url: '/assets/photo-credits.txt' },
    { name: 'Карта сайта', url: R.sitemap },
  ];
  const groups = [
    group('razdely', 'Основные разделы', main.length, list(main)),
    hasCatalog ? group('katalog', 'Каталог: страны, марки, модели', ctx.brands.length + ctx.models.length, catalogBody, 'Марки сгруппированы по стране покупки, под каждой указаны модели из каталога.') : '',
    globalSelections.length + countrySelections.length ? group('podborki', 'Подборки', globalSelections.length + countrySelections.length, selectionsBody, 'Популярные модели по заказам и подборки по бюджету, типу кузова и условиям растаможки.') : '',
    group('uslugi', 'Услуги и инструменты', ctx.services.length + 2, list([{ name: 'Все услуги', url: R.services }, ...ctx.services.map((s) => ({ name: s.name, url: s.url })), { name: 'Калькулятор стоимости под ключ', url: R.calculator }])),
    group('klientam', 'Информация для клиентов', 3, list([
      { name: 'Как заказать автомобиль', url: R.howTo },
      { name: 'Как читать аукционный лист', url: R.auctionSheet },
      { name: 'Что происходит после оплаты автомобиля', url: R.afterPayment },
    ])),
    ctx.cities.length
      ? group(
          'dostavka',
          'Доставка по городам',
          ctx.cities.length,
          Object.entries(byMacro)
            .map(([macro, cities]) => `<h3 class="co-map__sub">${esc(macro)}<small>${cities.length}</small></h3>${list(cities.map((c) => ({ name: `Доставка авто в ${c.nameAcc || c.name}`, url: c.url })))}`)
            .join(''),
          'Автовозом из Владивостока, со сроками и ценами.'
        )
      : '',
    ctx.cases.length ? group('privezennye-avto', 'Привезенные авто', ctx.cases.length, list(ctx.cases.map((c) => ({ name: c.name, url: c.url })))) : '',
    ctx.posts.length ? group('blog', 'Блог', ctx.posts.length, list(ctx.posts.map((p) => ({ name: p.title, url: p.url })))) : '',
    hasCatalog ? group('avtomobili', 'Все автомобили каталога', ctx.cars.length, carsBody, 'Каждый автомобиль указан с ценой под ключ во Владивостоке.') : '',
    group('sluzhebnye', 'Служебные страницы', servicePages.length, list(servicePages)),
  ];

  return {
    url: R.sitemap,
    type: 'sitemap',
    title: t.title,
    description: t.description,
    h1: `${t.h1Main} ${t.h1Mute}`,
    breadcrumbs: crumbs,
    priority: 0.3,
    changefreq: 'weekly',
    render: () => html`
    ${pageHead({
      crumbs,
      h1: duo(t.h1Main, t.h1Mute),
      lead: t.lead,
      kv: [
        { k: 'Городов доставки', v: String(ctx.cities.length) },
        { k: 'Привезенных авто', v: String(ctx.cases.length) },
      ].filter(Boolean),
    })}
    <section class="section section--white section--sm">
      <div class="container co-map">
        ${groups}
      </div>
    </section>
    ${ctaBand(ctx, { subject: 'Заявка со страницы «Карта сайта»', title: duo('Не нашли нужный автомобиль?', 'Подберем под запрос') })}`,
  };
}

// --- 404 ----------------------------------------------------------------------------------------------------

function notFoundPage(ctx) {
  const t = ctx.content.companyPages.notFound;
  const selections = ctx.selections.filter((s) => s.count > 0).slice(0, 8);
  return {
    url: R.notFound,
    type: 'notFound',
    title: t.title,
    description: t.description,
    h1: t.h1,
    noindex: true,
    headerOver: true,
    render: () => html`
    <section class="co-404 on-dark">
      <div class="co-404__bg co-safe">${img({ src: 'assets/img/hero/city-towers.webp', alt: '', priority: true, sizes: '100vw' })}</div>
      <div class="container co-404__top">
        ${route(['Страница', 'Не найдена', 'Главная'])}
        ${label('Ошибка 404')}
      </div>
      <div class="container">
        <div class="co-404__code" aria-hidden="true">404</div>
        <div class="co-404__grid">
          <h1>${duo(t.h1 + '.', 'Свернули не туда')}</h1>
          <div class="co-404__side">
            <p class="lead">${typo(t.lead)}</p>
            <div class="btn-row">
              ${btn('На главную', R.home, { variant: 'light' })}
              ${btn('Каталог', R.catalog, { variant: 'ghost' })}
              ${btn('Калькулятор', R.calculator, { variant: 'ghost' })}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Маршруты', title: duoS(t.linksTitleMain, t.linksTitleMute), lead: 'Самые востребованные разделы сайта. Выберите нужный.' })}
        <div class="grid grid--4">
          ${[
            { icon: 'grid', title: 'Каталог автомобилей', text: 'Примеры из Японии, Кореи и Китая с ценой под ключ во Владивостоке.', href: R.catalog },
            { icon: 'calc', title: 'Калькулятор', text: 'Пошлина, утилизационный сбор, доставка и оформление: расчет за минуту.', href: R.calculator },
            { icon: 'truck', title: 'Доставка по России', text: 'Сроки и цены автовоза из Владивостока до вашего города.', href: R.delivery },
            { icon: 'phone', title: 'Контакты', text: 'Телефоны менеджеров, мессенджеры и адрес офиса во Владивостоке.', href: R.contacts },
          ].map((x, i) => html`
          <a class="card card--tall" href="${u(x.href)}"${reveal(i)}>
            ${icon(x.icon, 'card__icon')}
            <h3 class="card__title">${esc(x.title)}</h3>
            <p class="card__text">${typo(x.text)}</p>
            <div class="card__foot"><span class="more">Открыть</span></div>
          </a>`)}
        </div>
        <div class="u-mt-7">
          ${linkBlock('Страны', ctx.nav.countries.map((c) => ({ name: `Авто ${c.from}`, url: c.url })))}
          ${selections.length ? linkBlock('Подборки', selections.map((s) => ({ name: s.name, url: s.url }))) : ''}
          ${linkBlock('Компания', [
            { name: 'О компании', url: R.about },
            { name: 'Привезенные авто', url: R.cases },
            { name: 'Отзывы', url: R.reviews },
            { name: 'Вопросы и ответы', url: R.faq },
            { name: 'Услуги', url: R.services },
            R.howTo ? { name: 'Как заказать автомобиль', url: R.howTo } : null,
            { name: 'Карта сайта', url: R.sitemap },
          ].filter(Boolean))}
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { subject: 'Заявка со страницы 404', title: duo('Искали конкретный автомобиль?', 'Подберем такой же') })}`,
  };
}

export function companyPages(ctx) {
  missingVars.clear();
  const pages = [aboutPage(ctx), contactsPage(ctx), reviewsPage(ctx), faqPage(ctx), videoPage(ctx), privacyPage(ctx), sitemapPage(ctx), notFoundPage(ctx)].filter(Boolean);
  if (missingVars.size) console.warn(`  ! company.mjs: в calc-rules.json нет данных для переменных FAQ: ${[...missingVars].join(', ')}`);
  return pages;
}
