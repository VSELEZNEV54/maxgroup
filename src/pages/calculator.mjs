// Калькулятор стоимости авто «под ключ»: инструмент + методика + таблицы ставок + разборы + FAQ.
// Числа в таблицах и разборах считаются при сборке тем же ядром (js/calc-core.js), что работает в браузере.
import { html, esc, typo, abs } from '../lib/core.mjs';
import { faqLd } from '../lib/seo.mjs';
import { icon, label, duo, more, reveal, sectionHead, pageHead, faqList, ctaBand, seoText, linkBlock, route, img, table, fact } from '../components/ui.mjs';
import { fullCalc, calcRules, calcRulesScript, calcHref, exampleInputs, calcCore as core } from '../components/calc.mjs';
import { R } from '../routes.mjs';

const { fmt, view } = core;
const { num, rub } = fmt;
const NB = ' ';

const HOME = { name: 'Главная', url: R.home };
// Двухтонный заголовок без неразрывных пробелов — для h2 с data-split: скрипт «по словам» (main.js) режет строку и по
// неразрывным пробелам, и тогда пробел может оказаться в начале строки. В заголовках без data-split используем обычный duo().
const duoPlain = (a, b) => `${esc(a)} <span class="mute">${esc(b)}</span>`;
const SHOWN = ['fit-2022-jp', 'carnival-2022-kr', 'zeekr001-2024-cn'];
const PAIR = ['prius-2021-jp', 'prius-2021-jp-over5'];
const EX_NAME = { 'fit-2022-jp': 'Honda Fit 1.3', 'carnival-2022-kr': 'Kia Carnival 2.2 дизель', 'zeekr001-2024-cn': 'Zeekr 001', 'prius-2021-jp': 'Toyota Prius 1.8' };
// типичный двигатель для каждой строки шкалы единых ставок — чтобы показать пошлину в рублях
const SAMPLE_CC = [998, 1496, 1797, 1997, 2488, 3456];
// статьи блога в блоке перелинковки «Полезно знать»
const POSTS = ['rastamozhka-avto-2026', 'utilsbor-2026-160-ls', 'prohodnye-avto-3-5-let', 'kakie-gibridy-mozhno-vvozit-iz-yaponii'];

/** Подстановка чисел из правил в тексты: «{prefOld}» → «5 200 ₽» */
function filler(dict) {
  const fill = (v) => {
    if (typeof v === 'string') {
      return v.replace(/\{(\w+)\}/g, (m, k) => {
        if (!(k in dict)) throw new Error(`calculator.json: неизвестная подстановка {${k}}`);
        return dict[k];
      });
    }
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    return v;
  };
  return fill;
}

function facts(ctx, rules, examples) {
  const raw = ctx.calc;
  const year = Number(rules.date.slice(0, 4));
  const uy = String(year);
  const base = raw.utilFee.baseRateRub;
  const pref = raw.utilFee.preferential;
  const mid = raw.utilFee.personal.ice['1001_2000'][uy];
  const full = raw.utilFee.full.ice['1001_2000'][uy];
  const pct = (x) => num(x * 100, 1);
  const lit = (cc) => (cc / 1000).toFixed(1).replace('.', ',') + NB + 'л';
  const city = (name) => raw.delivery.cities.find((c) => c.city === name);
  const dRange = (name) => (city(name) ? `${num(city(name).truckRub.sedan)}–${rub(city(name).truckRub.suv)}` : 'по запросу');
  const days = (name) => (city(name) ? city(name).days.join('–') : '—');
  const duty = (id) => { const e = examples.find((x) => x.id === id); return e ? rub(e.result.duty.rub) : '—'; };
  const used = raw.ets['3to5'];
  const old = raw.ets.gt5;
  const fresh = raw.ets.le3;
  const feeMid = raw.customsFee.scale.find((x) => x.maxValueRub === 1200000) || raw.customsFee.scale[2];
  const c = rules.costs;
  return {
    year,
    nextYear: year + 1,
    date: fmt.dateRu(Date.parse(rules.date)) + ' года',
    dateShort: fmt.dateShort(Date.parse(rules.date)),
    // годы выпуска, которые на дату ставок попадают в категорию «3–5 лет», если месяц неизвестен (дата выпуска — 1 июля)
    passYears: (() => {
      const ys = [year - 6, year - 5, year - 4, year - 3, year - 2].filter((y) => core.ageInfo(y, 0, rules.date).cat === '3to5');
      return ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : String(ys[0] || year - 4);
    })(),
    eur: num(rules.rates.EUR, 4),
    utilBase: rub(base),
    prefNew: rub(pref.amountNewRub),
    prefOld: rub(pref.amountOldRub),
    hpLimit: pref.iceMaxHpApprox,
    kwLimit: num(pref.iceMaxKw, 2),
    ccLimit: lit(pref.iceMaxVolumeCc),
    evKw: num(pref.evMaxKw, 2),
    evHp: pref.evMaxHpApprox,
    peak30: num(raw.utilFee.powerDefinition.fallback30minFromPeak, 2),
    utilOverNew: rub(base * mid[4][0]),
    utilOverOld: rub(base * mid[4][1]),
    utilFullNew: rub(base * full[3][0]),
    utilFullOld: rub(base * full[3][1]),
    etsMidMin: num(used[0].eurPerCc, 2),
    etsMidMax: num(used[used.length - 1].eurPerCc, 2),
    etsMid1500: num(used[1].eurPerCc, 2),
    etsMid1501: num(used[2].eurPerCc, 2),
    etsOldMin: num(old[0].eurPerCc, 2).replace(/^(\d+)$/, '$1,0'),
    etsOldMax: num(old[old.length - 1].eurPerCc, 2),
    etsNewPctMin: pct(Math.min(...fresh.map((x) => x.pct))),
    etsNewPctMax: pct(Math.max(...fresh.map((x) => x.pct))),
    etsNewMinLo: num(fresh[0].minEurPerCc, 2),
    etsNewMinHi: num(fresh[fresh.length - 1].minEurPerCc, 2),
    stpDuty: pct(raw.stp.dutyPct),
    vat: pct(raw.stp.vatPct),
    feeMin: rub(raw.customsFee.scale[0].feeRub),
    feeMid: rub(feeMid.feeRub),
    feeMax: rub(raw.customsFee.scale[raw.customsFee.scale.length - 1].feeRub),
    vl: rub(c.vladivostok),
    logistics: rub(c.logistics),
    commissionMin: rub(c.commission[0][1]),
    jpCc: lit(rules.limits.japan.maxCc),
    krCc: lit(rules.limits.korea.maxCc),
    krUsd: num(rules.limits.korea.maxUsd) + NB + '$',
    jpFixed: fmt.money(c.japan.fixed, 'JPY'),
    jpSanFixed: fmt.money(c.japan.sanFixed, 'JPY'),
    jpSanFreight: num(c.japan.sanFreightUsd) + NB + '$',
    krSanExtra: fmt.money(c.korea.sanExtra, 'KRW'),
    markupJpy: pct(rules.markup.JPY) + NB + '%',
    markupKrw: pct(rules.markup.KRW) + NB + '%',
    markupCny: pct(rules.markup.CNY) + NB + '%',
    // общий диапазон наценки курса перевода по трём валютам — одна формулировка на всём сайте: «примерно на 2–8 %»
    markupRange: (() => {
      const r = ['JPY', 'KRW', 'CNY'].map((k) => (raw.rates.transfer.markupRange || {})[k]).filter(Boolean);
      return r.length ? `${pct(Math.min(...r.map((x) => x[0])))}–${pct(Math.max(...r.map((x) => x[1])))}${NB}%` : `${pct(rules.markup.CNY)}–${pct(rules.markup.JPY)}${NB}%`;
    })(),
    priusPass: duty(PAIR[0]),
    priusOld: duty(PAIR[1]),
    dKhabarovsk: dRange('Хабаровск'),
    dNovosibirsk: dRange('Новосибирск'),
    dEkaterinburg: dRange('Екатеринбург'),
    dMoscow: dRange('Москва'),
    daysNovosibirsk: days('Новосибирск'),
    daysMoscow: days('Москва'),
  };
}

// --- подписи диапазонов шкал ---------------------------------------------------------------

const rangeOf = (list, i, key, unit, step = 1, dec = 0) => {
  const max = list[i][key];
  const prev = i ? list[i - 1][key] : null;
  if (max === null) return `свыше ${num(prev, dec)}${NB}${unit}`;
  if (prev === null) return `до ${num(max, dec)}${NB}${unit}`;
  return `${num(prev + step, dec)}–${num(max, dec)}${NB}${unit}`;
};

const SWIPE = '<span class="calc-swipe"> · таблица листается вбок →</span>';
const pair = (base, p) => `${num(base * p[0])} / ${num(base * p[1])}`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

// --- секции ---------------------------------------------------------------------------------

function howSection(c) {
  return html`
    <section class="section section--dark" id="kak-my-schitaem">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Методика')}
            <h2>${duo('Как мы считаем', 'цену под ключ')}</h2>
            <p class="lead">${typo(c.howLead)}</p>
            <div class="calc-formula" aria-label="Формула итога">
              <span>Итог</span><i>=</i><span>автомобиль</span><i>+</i><span>расходы за рубежом</span><i>+</i><span>пошлина</span><i>+</i><span>сбор</span><i>+</i><span>утильсбор</span><i>+</i><span>Владивосток</span><i>+</i><span>доставка</span>
            </div>
          </div>
          <ol class="calc-how split__body">
            ${c.how.map(
              (s, i) => html`
            <li class="calc-how__item"${reveal(Math.min(i, 4))}>
              <span class="calc-how__num">${String(i + 1).padStart(2, '0')}</span>
              <div class="calc-how__main">
                <h3 class="calc-how__title">${typo(s.title)}</h3>
                <p>${typo(s.text)}</p>
              </div>
              <span class="calc-how__formula">${esc(s.formula)}</span>
            </li>`
            )}
          </ol>
        </div>
      </div>
    </section>`;
}

function sheet({ id, t, body, wide, i = 0 }) {
  return html`
        <div class="calc-sheet${wide ? ' calc-sheet--wide' : ''}" id="${id}"${reveal(i)}>
          <div class="calc-sheet__copy">
            <h3 class="h3">${typo(t.title)}</h3>
            <p>${typo(t.text)}</p>
            <p class="calc-sheet__src">${esc(t.source)}</p>
          </div>
          <div class="calc-sheet__body">${body}</div>
        </div>`;
}

function tablesSection(ctx, c, rules, f) {
  const raw = ctx.calc;
  const uy = String(f.year);
  const eur = rules.rates.EUR;
  const base = raw.utilFee.baseRateRub;
  const T = c.tables;

  // 1. единая ставка для авто старше 3 лет
  const used = table(
    ['Объём двигателя', '3–5 лет, €/см³', 'Старше 5 лет, €/см³', 'Пример двигателя', 'Пошлина, 3–5 лет', 'Пошлина, старше 5 лет'],
    raw.ets['3to5'].map((row, i) => {
      const cc = SAMPLE_CC[i] || (row.maxCc ? row.maxCc : raw.ets['3to5'][i - 1].maxCc + 500);
      const old = raw.ets.gt5[i];
      return [rangeOf(raw.ets['3to5'], i, 'maxCc', 'см³'), `<strong>${num(row.eurPerCc, 2)}</strong>`, num(old.eurPerCc, 2), `${num(cc)}${NB}см³`, `<strong>${rub(row.eurPerCc * cc * eur)}</strong>`, rub(old.eurPerCc * cc * eur)];
    }),
    { numCols: [1, 2, 3, 4, 5] }
  );

  // 2. единая ставка для авто до 3 лет
  const fresh = table(
    ['Стоимость автомобиля', 'В рублях по курсу ЦБ', 'Ставка', 'Но не меньше'],
    raw.ets.le3.map((row, i) => {
      const prev = i ? raw.ets.le3[i - 1].maxValueEur : null;
      const eurLabel = row.maxValueEur === null ? `свыше ${num(prev)}${NB}€` : prev === null ? `до ${num(row.maxValueEur)}${NB}€` : `${num(prev)}–${num(row.maxValueEur)}${NB}€`;
      const rubLabel = row.maxValueEur === null ? `свыше ${rub(prev * eur)}` : `до ${rub(row.maxValueEur * eur)}`;
      return [eurLabel, rubLabel, `<strong>${num(row.pct * 100)}${NB}%</strong>`, `${num(row.minEurPerCc, 2)}${NB}€/см³`];
    }),
    { numCols: [1, 2, 3] }
  );

  // 3. утильсбор: ДВС и обычные гибриды, суммы «до 3 лет / старше 3 лет»
  const keys = raw.utilFee.iceVolumeKeys;
  const volHead = raw.utilFee.iceVolumeMaxCc.map((max, i) => {
    const prev = i ? raw.utilFee.iceVolumeMaxCc[i - 1] : null;
    return max === null ? `свыше ${num(prev)}${NB}см³` : prev === null ? `до ${num(max)}${NB}см³` : `${num(prev + 1)}–${num(max)}${NB}см³`;
  });
  const hpMax = raw.utilFee.icePowerBracketsMaxHpApprox;
  const kwMax = raw.utilFee.icePowerBracketsMaxKw;
  const limIdx = kwMax.indexOf(raw.utilFee.preferential.iceMaxKw);
  const P = (key, i) => raw.utilFee.personal.ice[key][uy][i];
  const Fl = (key, i) => raw.utilFee.full.ice[key][uy][i];
  const powerLabel = (i) => {
    const kw = i ? `${num(kwMax[i - 1] + 0.01, 2)}${kwMax[i] === null ? ` кВт и выше` : `–${num(kwMax[i], 2)} кВт`}` : `до ${num(kwMax[i], 2)} кВт`;
    const hp = hpMax[i] === null ? `свыше ${hpMax[i - 1]}${NB}л.с.` : i ? `${hpMax[i - 1]}–${hpMax[i]}${NB}л.с.` : `до ${hpMax[i]}${NB}л.с.`;
    return `${hp}<small>${kw}</small>`;
  };
  const mergeLow = keys.every((k) => Array.from({ length: limIdx }, (_, i) => i).every((i) => same(P(k, i), P(k, limIdx)) && same(Fl(k, i), Fl(k, limIdx))));
  const utilRows = [];
  if (mergeLow) {
    utilRows.push([`до ${hpMax[limIdx]}${NB}л.с. — для личного пользования<small>до ${num(kwMax[limIdx], 2)} кВт</small>`, ...keys.map((k) => (P(k, limIdx)[0] < 1 ? `<strong class="calc-accent">${pair(base, P(k, limIdx))}</strong>` : pair(base, P(k, limIdx))))]);
    utilRows.push([`до ${hpMax[limIdx]}${NB}л.с. — без льготы<small>второй автомобиль за год, перепродажа, юрлица</small>`, ...keys.map((k) => pair(base, Fl(k, limIdx)))]);
  }
  for (let i = mergeLow ? limIdx + 1 : 0; i < kwMax.length; i++) utilRows.push([powerLabel(i), ...keys.map((k) => pair(base, P(k, i)))]);
  const util = table(['Мощность', ...volHead], utilRows, { numCols: [1, 2, 3, 4, 5] });

  // 4. таможенный сбор
  const fee = table(
    ['Таможенная стоимость', 'Сбор'],
    raw.customsFee.scale.map((row, i) => [rangeOf(raw.customsFee.scale, i, 'maxValueRub', '₽', 0), `<strong>${rub(row.feeRub)}</strong>`]),
    { numCols: [1] }
  );

  const midIdx = Math.max(1, raw.customsFee.scale.findIndex((x) => x.maxValueRub === 1200000));
  const feeMid = raw.customsFee.scale[midIdx];
  const feeLow = raw.customsFee.scale[midIdx - 1];
  const feeNext = raw.customsFee.scale[Math.min(midIdx + 1, raw.customsFee.scale.length - 1)];

  // 5. электромобили: акциз и утильсбор
  const exYears = Object.keys(raw.stp.exciseRubPerHp).sort();
  const exRows = raw.stp.exciseRubPerHp[exYears[0]].map((row, i) => [
    rangeOf(raw.stp.exciseRubPerHp[exYears[0]], i, 'maxHp', 'л.с.', 0),
    ...exYears.map((y, yi) => {
      const v = raw.stp.exciseRubPerHp[y][i].rate;
      return yi === 0 ? `<strong>${v ? rub(v) : '0' + NB + '₽'}</strong>` : v ? rub(v) : '0' + NB + '₽';
    }),
  ]);
  const excise = table(['30-минутная мощность', ...exYears.map((y) => `${y} год, за 1 л.с.`)], exRows, { numCols: exYears.map((_, i) => i + 1) });
  const evKw = raw.utilFee.evPowerBracketsMaxKw;
  const evHp = raw.utilFee.evPowerBracketsMaxHpApprox;
  const evP = raw.utilFee.personal.ev[uy];
  const evRows = [];
  for (let i = 0; i < evKw.length; i++) {
    const tail = evP.slice(i).every((p) => same(p, evP[i]));
    const lbl = i === 0 ? `до ${num(evKw[0], 2)}${NB}кВт<small>до ${evHp[0]} л.с. — льготный</small>` : tail ? `свыше ${num(evKw[i - 1], 2)}${NB}кВт<small>свыше ${evHp[i - 1]} л.с.</small>` : `${num(evKw[i - 1] + 0.01, 2)}–${num(evKw[i], 2)}${NB}кВт<small>${evHp[i - 1]}–${evHp[i]} л.с.</small>`;
    evRows.push([lbl, i === 0 ? `<strong class="calc-accent">${rub(base * evP[i][0])}</strong>` : rub(base * evP[i][0]), i === 0 ? `<strong class="calc-accent">${rub(base * evP[i][1])}</strong>` : rub(base * evP[i][1])]);
    if (tail) break;
  }
  const evUtil = table(['30-минутная мощность', 'Утильсбор, до 3 лет', 'Утильсбор, старше 3 лет'], evRows, { numCols: [1, 2] });

  return html`
    <section class="section section--white" id="stavki">
      <div class="container">
        ${sectionHead({
          label: `Ставки ${f.year}`,
          title: duoPlain('Таблицы ставок:', 'пошлина, утильсбор, сборы'),
          lead: T.lead,
          aside: html`<nav class="calc-toc" aria-label="Таблицы ставок">
            <a href="#stavki-poshlina">Пошлина 3–5 лет и старше</a>
            <a href="#stavki-do-3-let">Пошлина до 3 лет</a>
            <a href="#stavki-utilsbor">Утильсбор ${f.year}</a>
            <a href="#stavki-sbor">Таможенный сбор</a>
            <a href="#stavki-elektro">Электромобили</a>
          </nav>`,
        })}
        <div class="calc-sheets">
          ${sheet({ id: 'stavki-poshlina', t: T.used, wide: true, body: `<p class="calc-sheet__cap">Единая ставка и пример пошлины по курсу евро ${f.eur} ₽${SWIPE}</p>${used}` })}
          ${sheet({ id: 'stavki-do-3-let', t: T.fresh, body: fresh })}
          ${sheet({ id: 'stavki-utilsbor', t: T.util, wide: true, body: `<p class="calc-sheet__cap">ДВС и обычные гибриды · ${f.year} год · ₽, до 3 лет / старше 3 лет${SWIPE}</p>${util}` })}
          ${sheet({
            id: 'stavki-sbor',
            t: T.fee,
            body: `<div class="calc-sheet__pair">${fee}${fact({ value: num(feeMid.feeRub), unit: '₽', name: `при стоимости до ${String(feeMid.maxValueRub / 1000000).replace('.', ',')} млн ₽`, text: `Ступень от ${num(feeLow.maxValueRub / 1000)} тыс. до ${String(feeMid.maxValueRub / 1000000).replace('.', ',')} млн ₽ таможенной стоимости: в неё попадает Honda Fit из примеров ниже. Следующая ступень — ${rub(feeNext.feeRub)}.`, variant: 'accent' })}</div>`,
          })}
          ${sheet({ id: 'stavki-elektro', t: T.ev, body: `<p class="calc-sheet__cap">Акциз, ₽ за 1 л.с.</p>${excise}<p class="calc-sheet__cap">Утилизационный сбор · ${f.year} год · личное пользование</p>${evUtil}` })}
        </div>
      </div>
    </section>`;
}

function exampleCard(ctx, ex, i) {
  const { result: r, input } = ex;
  const mode = r.delivery.city ? 'city' : 'vl';
  const sh = view.shares(r, mode);
  const eng = r.mode === 'STP' ? `${r.fuel.short}, ${num(r.util.e30, 2)}${NB}кВт за 30 минут` : `${r.fuel.short === 'ДВС' ? '' : r.fuel.short + ', '}${num(r.input.cc)}${NB}см³, ${num(r.input.hp)}${NB}л.с.`;
  return html`
          <article class="calc-ex"${reveal(i)}>
            <header class="calc-ex__head">
              ${route([r.country.name, 'Владивосток', r.delivery.city ? r.delivery.name : null])}
              <h3 class="calc-ex__title">${esc(ex.name)}</h3>
              <p class="calc-ex__meta">${input.month ? String(input.month).padStart(2, '0') + '.' : ''}${input.year} · ${eng} · ${esc(fmt.money(input.price, r.currency.code))}</p>
              <div class="calc-ex__status">${view.status(r).replace(/<a /g, '<span ').replace(/<\/a>/g, '</span>').replace(/ href="[^"]*"/g, '')}</div>
            </header>
            <div class="calc-ex__body">
              ${r.groups
                .filter((g) => g.rows.length)
                .map(
                  (g) => html`
              <div class="calc-ex__group">
                <div class="calc-ex__ghead"><span><i class="calc-dot calc-dot--${g.id}"></i>${esc(g.title)}</span><span>${sh[g.id].pct}${NB}%</span></div>
                <dl class="calc-rows">${g.rows.map((row) => `<div class="calc-row"><dt>${esc(row.label)}<small>${esc(row.note)}</small></dt><dd>${rub(row.rub)}</dd></div>`)}</dl>
              </div>`
                )}
            </div>
            <footer class="calc-ex__foot">
              <div class="calc-ex__total"><span>${r.delivery.city ? 'Под ключ с доставкой в ' + esc(r.delivery.acc) : 'Под ключ во Владивостоке'}</span><b>${rub(mode === 'city' ? r.totalCity : r.totalVladivostok)}</b></div>
              <a class="more" href="${calcHref({ ...r.input, city: r.delivery.city })}">Открыть в калькуляторе ${icon('arrow')}</a>
            </footer>
          </article>`;
}

function examplesSection(ctx, c, examples, f) {
  const shown = SHOWN.map((id) => examples.find((x) => x.id === id)).filter(Boolean);
  const list = shown.length === 3 ? shown : examples.filter((x) => !PAIR.includes(x.id)).slice(0, 3);
  const a = examples.find((x) => x.id === PAIR[0]);
  const b = examples.find((x) => x.id === PAIR[1]);
  const monthName = (m) => core.MONTHS[m - 1];
  return html`
    <section class="section" id="primery">
      <div class="container">
        ${sectionHead({
          label: `Примеры · расчёт на ${f.dateShort}`,
          title: duoPlain('Три расчёта:', 'Япония, Корея, Китай'),
          lead: c.examplesLead,
        })}
        <div class="calc-exs">
          ${list.map((ex, i) => exampleCard(ctx, ex, i))}
        </div>
        ${a && b
          ? html`
        <div class="calc-month on-dark"${reveal()}>
          <div class="calc-month__bg">${img({ src: 'assets/img/hero/bridge-kei.webp', alt: '', sizes: '100vw' })}</div>
          <div class="calc-month__copy">
            ${label('Месяц выпуска')}
            <p class="calc-month__lead">${typo(c.monthNote)}</p>
          </div>
          <div class="calc-month__nums">
            <a class="calc-month__num" href="${calcHref({ ...a.result.input, city: a.result.delivery.city })}">
              <span>${monthName(a.input.month)} ${a.input.year} · ${esc(a.result.age.name)}</span>
              <b>${rub(a.result.duty.rub)}</b>
              <small>пошлина ${icon('arrow')}</small>
            </a>
            <a class="calc-month__num" href="${calcHref({ ...b.result.input, city: b.result.delivery.city })}">
              <span>${monthName(b.input.month)} ${b.input.year} · ${esc(b.result.age.name)}</span>
              <b>${rub(b.result.duty.rub)}</b>
              <small>пошлина ${icon('arrow')}</small>
            </a>
            <div class="calc-month__num calc-month__num--diff">
              <span>Разница</span>
              <b>${rub(b.result.duty.rub - a.result.duty.rub)}</b>
              <small>за пять месяцев возраста</small>
            </div>
          </div>
        </div>`
          : ''}
      </div>
    </section>`;
}

function limitsSection(c, f) {
  return html`
    <section class="section section--dark calc-limits" id="ogranicheniya">
      <div class="calc-limits__bg">${img({ src: 'assets/img/hero/city-towers.webp', alt: '', sizes: '100vw' })}</div>
      <div class="container">
        ${sectionHead({
          label: `Важно знать · ${f.year}`,
          title: duoPlain('Что не входит в расчёт.', `Ограничения ${f.year} года`),
          lead: c.limitsLead,
        })}
        <div class="calc-limits__grid">
          <div class="calc-out"${reveal()}>
            <h3 class="label">В расчёт не входит</h3>
            <ul class="calc-out__list">
              ${c.notIncluded.map((x) => `<li><b>${typo(x.title)}</b><span>${typo(x.text)}</span></li>`)}
            </ul>
          </div>
          <div class="calc-rules-grid">
            ${c.limits.map(
              (x, i) => html`
            <article class="calc-rule"${reveal(i % 2)}>
              ${label(x.country)}
              <h3 class="calc-rule__title">${typo(x.title)}</h3>
              <p>${typo(x.text)}</p>
            </article>`
            )}
          </div>
        </div>
      </div>
    </section>`;
}

function faqSection(faq) {
  return html`
    <section class="section section--white" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${duo('О пошлине, утильсборе', 'и точности расчёта')}</h2>
            <p class="lead">${typo('Коротко о том, как считаются таможенные платежи и что влияет на итог. Не нашли ответ — спросите менеджера.')}</p>
            ${more('Все вопросы', R.faq)}
          </div>
          <div class="split__body">
            ${faqList(faq)}
          </div>
        </div>
      </div>
    </section>`;
}

function linksSection(ctx, c) {
  const sel = (slug) => ctx.selections.find((s) => s.slug === slug);
  const selItems = ['do-160-ls', 'prohodnye-avto', 'do-1-mln', 'do-1-5-mln', 'do-2-mln', 'do-3-mln', 'gibridy', 'elektromobili']
    .map(sel)
    .filter((s) => s && (!ctx.cars.length || (s.count > 0 && s.global !== false)))
    .map((s) => ({ name: s.name, url: s.url }));
  const svc = (slug) => ctx.services.find((s) => s.slug === slug);
  const services = ['tamozhennoe-oformlenie', 'platezhnyj-agent', 'avto-pod-zakaz', 'avtokredit'].map(svc).filter(Boolean).map((s) => ({ name: s.navName || s.name, url: s.url }));
  // статьи блога о том, что считает калькулятор: растаможка, утильсбор, проходной возраст, гибриды; если адрес статьи
  // сменится — добираем из рубрики «Таможня и расчёты»
  const posts = ctx.posts || [];
  const picked = POSTS.map((slug) => posts.find((p) => p.slug === slug)).filter(Boolean);
  const guides = [...picked, ...posts.filter((p) => p.category === 'Таможня и расчёты' && !picked.includes(p))].slice(0, 4).map((p) => ({ name: p.short || p.title, url: p.url }));
  return html`
    <section class="section section--sm" id="dalshe">
      <div class="container">
        ${seoText(ctx.md(c.seo))}
        <div class="u-mt-7">
          ${linkBlock('Полезно знать: статьи о растаможке', guides)}
          ${linkBlock('Подборки под выгодную растаможку', selItems)}
          ${linkBlock('Каталог по странам', [...ctx.nav.countries.map((x) => ({ name: `Авто ${x.from}`, url: x.url })), { name: 'Весь каталог', url: R.catalog }, { name: 'Все подборки', url: R.selections }])}
          ${linkBlock('Доставка из Владивостока', [{ name: 'Все города и тарифы', url: R.delivery }, ...ctx.cities.slice(0, 12).map((x) => ({ name: x.name, url: x.url }))])}
          ${linkBlock('Услуги и справка', [...services, { name: 'Как читать аукционный лист', url: R.auctionSheet }, { name: 'Привезённые авто', url: R.cases }, { name: 'Вопросы и ответы', url: R.faq }])}
        </div>
      </div>
    </section>`;
}

// --- страница -------------------------------------------------------------------------------

export function calculatorPages(ctx) {
  if (!ctx.calc) return [];
  const { site } = ctx;
  const rules = calcRules(ctx);
  // контрольные примеры считаем на дату ставок — так же, как эталон в calc-rules.json
  const examples = exampleInputs(ctx.calc).map((x) => ({ ...x, name: EX_NAME[x.id] || x.title.split(/\s*[(,]/)[0], result: core.calc({ ...x.input, date: rules.date }, rules) }));
  const f = facts(ctx, rules, examples);
  const c = filler(f)(ctx.content.calculator || {});
  const crumbs = [HOME, { name: 'Калькулятор', url: R.calculator }];
  const selUrl = (slug) => {
    const s = ctx.selections.find((x) => x.slug === slug);
    return !ctx.cars.length || (s && s.count > 0 && s.global !== false) ? R.selection(slug) : R.selections;
  };
  const links = {
    passing: { url: selUrl('prohodnye-avto'), text: 'Проходные авто 3–5 лет' },
    hp160: { url: selUrl('do-160-ls'), text: `Авто до ${f.hpLimit} л.с.` },
    personal: { url: '#calc-engine', text: 'Условия льготы' },
  };
  const budgets = [
    { max: 1000000, url: selUrl('do-1-mln'), text: 'Автомобили до 1 млн ₽' },
    { max: 1500000, url: selUrl('do-1-5-mln'), text: 'Автомобили до 1,5 млн ₽' },
    { max: 2000000, url: selUrl('do-2-mln'), text: 'Автомобили до 2 млн ₽' },
    { max: 3000000, url: selUrl('do-3-mln'), text: 'Автомобили до 3 млн ₽' },
    { max: null, url: R.catalog, text: 'Автомобили в каталоге' },
  ];
  const title = c.title;
  const description = c.description;
  return [
    {
      url: R.calculator,
      type: 'calculator',
      title,
      description,
      h1: 'Калькулятор растаможки авто под ключ',
      breadcrumbs: crumbs,
      scripts: ['calc-core', 'calc'],
      bodyClass: 'page-calc',
      priority: 0.9,
      changefreq: 'weekly',
      modified: rules.date,
      jsonld: [
        faqLd(c.faq),
        {
          '@type': 'WebApplication',
          '@id': abs(site, R.calculator + '#app'),
          name: `Калькулятор растаможки авто ${f.year}`,
          url: abs(site, R.calculator),
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          inLanguage: 'ru',
          description,
          dateModified: rules.date,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
          provider: { '@id': abs(site, '/#organization') },
        },
      ].filter(Boolean),
      render: () => html`
    ${pageHead({
      crumbs,
      label: `Калькулятор · ставки на ${f.dateShort}`,
      h1: duo('Калькулятор растаможки авто', 'под ключ'),
      lead: c.lead,
      kv: [
        { k: 'Евро, курс ЦБ', v: `${f.eur}${NB}₽` },
        { k: '100 иен', v: `${num(rules.rates.JPY * 100, 4)}${NB}₽` },
        { k: '1 000 вон', v: `${num(rules.rates.KRW * 1000, 4)}${NB}₽` },
        { k: 'Юань', v: `${num(rules.rates.CNY, 4)}${NB}₽` },
      ],
    })}
    <section class="section section--flush-top calc-section" id="raschet">
      <div class="container">
        <h2 class="sr-only">Расчёт стоимости автомобиля под ключ</h2>
        ${fullCalc(ctx, { tips: c.tips, links, budgets, subject: 'Точный расчёт (калькулятор)' })}
        ${calcRulesScript(ctx)}
      </div>
    </section>
    ${howSection(c)}
    ${tablesSection(ctx, c, rules, f)}
    ${examplesSection(ctx, c, examples, f)}
    ${limitsSection(c, f)}
    ${faqSection(c.faq)}
    ${linksSection(ctx, c)}
    ${ctaBand(ctx, {
      label: 'Точный расчёт',
      title: duo('Посчитаем под конкретный автомобиль', 'до покупки'),
      text: 'Пришлите ссылку на лот или опишите, что ищете. Менеджер проверит автомобиль, уточнит мощность по документам, курс и логистику и пришлёт расчёт до Владивостока и вашего города.',
      subject: 'Точный расчёт (калькулятор, форма внизу)',
      bg: 'assets/img/hero/gclass-road.webp',
      fields: ['name', 'phone', 'car', 'city'],
      cta: 'Получить точный расчёт',
      panelTitle: 'Точный расчёт от менеджера',
      panelText: 'Параметры из калькулятора добавим к заявке автоматически.',
    })}`,
    },
  ];
}
