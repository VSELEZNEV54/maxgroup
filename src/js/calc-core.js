/* Макс Групп — ядро калькулятора «авто под ключ» (без DOM и без зависимостей).
   Браузер: window.MGCalc. Node: require('./calc-core.js') или globalThis.MGCalc.

   MGCalc.calc(input, rules) → подробный результат со всеми строками расчета.
   input.price задается в валюте страны покупки. Для суммы в рублях передайте input.currency = 'RUB'.
   rules — компактная выжимка (MGCalc.compactRules(raw)) либо исходный data/source/calc-rules.json:
   исходный файл ужимается на лету. Алгоритм — поле algorithm того же файла:
     1. курсы ЦБ на дату ставок; 2. возраст (год → 1 июля, год + месяц → 15-е число);
     3. таможенная стоимость = (цена + фиксированные расходы за рубежом) × курс ЦБ;
     4. пошлина по единым ставкам либо СТП (15 % + акциз + НДС) для электромобилей и последовательных гибридов;
     5. таможенный сбор; 6. утилизационный сбор; 7-10. расходы за рубежом, Владивосток, комиссия, доставка.
   Все суммы округляются до рубля построчно, итог — сумма строк. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.MGCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var NB = ' ';
  var NNB = ' ';
  var DAY = 86400000;
  var MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  var MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  var COUNTRIES = {
    japan: { name: 'Япония', from: 'из Японии', inLoc: 'в Японии', cur: 'JPY' },
    korea: { name: 'Корея', from: 'из Кореи', inLoc: 'в Корее', cur: 'KRW' },
    china: { name: 'Китай', from: 'из Китая', inLoc: 'в Китае', cur: 'CNY' }
  };

  // sign — знак в полях и формулах, per — за сколько единиц ЦБ публикует курс, step — шаг округления при пересчете цены между странами
  var CURRENCIES = {
    JPY: { sign: '¥', name: 'иена', gen: 'иен', per: 100, step: 10000 },
    KRW: { sign: '₩', name: 'вона', gen: 'вон', per: 1000, step: 100000 },
    CNY: { sign: '¥', name: 'юань', gen: 'юаней', per: 1, step: 1000 },
    USD: { sign: '$', name: 'доллар', gen: 'долларов', per: 1, step: 100 },
    EUR: { sign: '€', name: 'евро', gen: 'евро', per: 1, step: 100 }
  };

  var FUELS = {
    ice: { name: 'Бензин или дизель', short: 'ДВС' },
    mild: { name: 'Мягкий гибрид', short: 'мягкий гибрид' },
    parallel: { name: 'Гибрид', short: 'гибрид' },
    series: { name: 'Последовательный гибрид', short: 'последовательный гибрид' },
    ev: { name: 'Электромобиль', short: 'электромобиль' }
  };

  var FUEL_ALIASES = {
    ice: 'ice', petrol: 'ice', gasoline: 'ice', diesel: 'ice', benzin: 'ice', dizel: 'ice', gas: 'ice',
    mild: 'mild', mhev: 'mild',
    parallel: 'parallel', hybrid: 'parallel', hev: 'parallel', phev: 'parallel',
    series: 'series', erev: 'series', reev: 'series', epower: 'series',
    ev: 'ev', bev: 'ev', electric: 'ev', electro: 'ev'
  };

  var BODIES = {
    sedan: { name: 'Седан, хэтчбек', short: 'седан' },
    crossover: { name: 'Кроссовер', short: 'кроссовер' },
    suv: { name: 'Внедорожник, минивэн', short: 'внедорожник или минивэн' }
  };

  var BODY_ALIASES = {
    sedan: 'sedan', hatchback: 'sedan', wagon: 'sedan', liftback: 'sedan', coupe: 'sedan', kei: 'sedan',
    crossover: 'crossover',
    suv: 'suv', minivan: 'suv', van: 'suv', pickup: 'suv', jeep: 'suv'
  };

  var AGE = {
    le3: { name: 'до 3 лет', full: 'не старше 3 лет' },
    '3to5': { name: '3-5 лет', full: 'от 3 до 5 лет, «проходной»' },
    gt5: { name: 'старше 5 лет', full: 'старше 5 лет' }
  };

  // --- форматирование ---------------------------------------------------------------------

  function group(s) {
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, NNB);
  }

  /** 1234567.891 → «1 234 567,89» (dec — максимум знаков после запятой, хвостовые нули убираются) */
  function num(n, dec) {
    if (n === null || n === undefined || isNaN(n)) return '';
    var neg = n < 0;
    var s = Math.abs(n).toFixed(dec || 0);
    if (dec) s = s.replace(/\.?0+$/, '');
    var p = s.split('.');
    return (neg ? '−' : '') + group(p[0]) + (p[1] ? ',' + p[1] : '');
  }

  function rub(n) {
    return num(Math.round(n)) + NB + '₽';
  }

  /** Сумма в валюте: «1 100 000 ¥», «32 000 000 ₩», «230 000 юаней» (юань пишем словом, чтобы не путать с иеной) */
  function money(n, cur) {
    if (cur === 'CNY') return num(n) + NB + plural(Math.round(n), ['юань', 'юаня', 'юаней']);
    return num(n) + NB + (CURRENCIES[cur] ? CURRENCIES[cur].sign : cur);
  }

  function liters(cc) {
    return (cc / 1000).toFixed(1).replace('.', ',') + NB + 'л';
  }

  /** Курс так, как его публикует ЦБ: «100 ¥ = 53,0774 ₽» */
  function rateLabel(cur, rate) {
    var c = CURRENCIES[cur];
    return num(c.per) + NB + c.sign + ' = ' + num(rate * c.per, 4) + NB + '₽';
  }

  function dateRu(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + NB + MONTHS_GEN[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  function dateShort(ms) {
    var d = new Date(ms);
    var dd = d.getUTCDate();
    var mm = d.getUTCMonth() + 1;
    return (dd < 10 ? '0' : '') + dd + '.' + (mm < 10 ? '0' : '') + mm + '.' + d.getUTCFullYear();
  }

  function isoDate(ms) {
    var d = new Date(ms);
    var mm = d.getUTCMonth() + 1;
    var dd = d.getUTCDate();
    return d.getUTCFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
  }

  function parseDate(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return NaN;
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  function plural(n, forms) {
    var a10 = Math.abs(n) % 10;
    var a100 = Math.abs(n) % 100;
    if (a10 === 1 && a100 !== 11) return forms[0];
    if (a10 >= 2 && a10 <= 4 && (a100 < 12 || a100 > 14)) return forms[1];
    return forms[2];
  }

  function toNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    var n = parseFloat(String(v).replace(/[\s  ]/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /** До рубля через копейки: 1 500 000 × 0,062717 в двоичной арифметике дает 94075,49999999999, а не 94075,5 */
  function rnd(n) {
    return Math.round(Math.round(n * 100) / 100);
  }

  // --- выжимка правил ---------------------------------------------------------------------

  function findNum(list, re, def) {
    for (var i = 0; i < (list || []).length; i++) {
      var m = re.exec(String(list[i]).replace(/\s/g, ''));
      if (m) return +m[1];
    }
    return def;
  }

  function hasWord(list, re) {
    for (var i = 0; i < (list || []).length; i++) if (re.test(list[i])) return true;
    return false;
  }

  function pairs(list, a, b) {
    var out = [];
    for (var i = 0; i < list.length; i++) out.push([list[i][a], list[i][b]]);
    return out;
  }

  function pickYears(byYear, years) {
    var out = {};
    for (var i = 0; i < years.length; i++) if (byYear[years[i]]) out[years[i]] = byYear[years[i]];
    return out;
  }

  /**
   * Компактная выжимка правил для браузера (≈ 9 КБ вместо ≈ 100 КБ): только числа, без источников и примечаний.
   * extra.cities — [{name, slug, nameAcc}] с сайта: адрес и винительный падеж города («в Читу»).
   */
  function compactRules(raw, extra) {
    extra = extra || {};
    var date = (raw.defaults && raw.defaults.ratesDate) || raw.rates['default'];
    var cbr = raw.rates.cbr[date];
    var site = raw.costs.maxGroupSite || {};
    var def = raw.defaults || {};
    var ab = def.abroadExpenses || {};
    var years = [];
    var y;
    for (y in raw.utilFee.personal.ev) years.push(y);
    years.sort();
    years = years.slice(0, 2);

    function utilTable(t) {
      var ice = {};
      for (var k = 0; k < raw.utilFee.iceVolumeKeys.length; k++) ice[raw.utilFee.iceVolumeKeys[k]] = pickYears(t.ice[raw.utilFee.iceVolumeKeys[k]], years);
      return { ice: ice, ev: pickYears(t.ev, years) };
    }

    var siteByName = {};
    var i;
    for (i = 0; i < (extra.cities || []).length; i++) siteByName[extra.cities[i].name] = extra.cities[i];
    var cities = [];
    for (i = 0; i < raw.delivery.cities.length; i++) {
      var c = raw.delivery.cities[i];
      var sc = siteByName[c.city];
      var row = { s: sc ? sc.slug : c.slug, n: c.city, t: [c.truckRub.sedan, c.truckRub.crossover, c.truckRub.suv], d: c.days };
      if (sc && sc.slug !== c.slug) row.x = c.slug;
      if (sc && sc.nameAcc && sc.nameAcc !== c.city) row.a = sc.nameAcc;
      if (c.estimated) row.e = 1;
      cities.push(row);
    }

    var jp = raw.restrictions.japan.exportBanToRussia;
    var kr = raw.restrictions.korea.exportBanToRussia;
    var tiers = def.commissionTiers || (site.commission && site.commission.assumedTiers) || [];
    var jpSan = ab.japanSanctioned || (site.japan && site.japan.sanctioned && { amount: site.japan.sanctioned.fixedExpensesJpy, freightUsd: site.japan.sanctioned.freightUsd }) || { amount: 0, freightUsd: 0 };

    return {
      v: 1,
      asOf: raw.asOf,
      date: date,
      rates: { EUR: cbr.EUR, USD: cbr.USD, JPY: cbr.JPY, KRW: cbr.KRW, CNY: cbr.CNY },
      markup: raw.rates.transfer.markupOverCbr,
      ets: {
        le3: raw.ets.le3.map(function (r) { return [r.maxValueEur, r.pct, r.minEurPerCc]; }),
        '3to5': pairs(raw.ets['3to5'], 'maxCc', 'eurPerCc'),
        gt5: pairs(raw.ets.gt5, 'maxCc', 'eurPerCc')
      },
      stp: {
        duty: raw.stp.dutyPct,
        vat: raw.stp.vatPct,
        kwToHp: raw.stp.kwToHp,
        excise: (function () {
          var out = {};
          for (var k in raw.stp.exciseRubPerHp) out[k] = pairs(raw.stp.exciseRubPerHp[k], 'maxHp', 'rate');
          return out;
        })()
      },
      fee: pairs(raw.customsFee.scale, 'maxValueRub', 'feeRub'),
      util: {
        base: raw.utilFee.baseRateRub,
        hpToKw: raw.utilFee.hpToKw,
        peakTo30: raw.utilFee.powerDefinition.fallback30minFromPeak,
        tol: 0.006,
        iceKw: raw.utilFee.icePowerBracketsMaxKw,
        evKw: raw.utilFee.evPowerBracketsMaxKw,
        volCc: raw.utilFee.iceVolumeMaxCc,
        volKeys: raw.utilFee.iceVolumeKeys,
        pref: {
          coefNew: raw.utilFee.preferential.coefNew,
          coefOld: raw.utilFee.preferential.coefOld,
          iceKw: raw.utilFee.preferential.iceMaxKw,
          iceHp: raw.utilFee.preferential.iceMaxHpApprox,
          iceCc: raw.utilFee.preferential.iceMaxVolumeCc,
          evKw: raw.utilFee.preferential.evMaxKw,
          evHp: raw.utilFee.preferential.evMaxHpApprox
        },
        personal: utilTable(raw.utilFee.personal),
        full: utilTable(raw.utilFee.full)
      },
      costs: {
        japan: {
          fixed: (ab.japan && ab.japan.amount) || (site.japan && site.japan.fixedExpensesJpy) || 0,
          sanFixed: jpSan.amount,
          sanFreightUsd: jpSan.freightUsd
        },
        korea: {
          fixed: (ab.korea && ab.korea.amount) || (site.korea && site.korea.fixedExpensesKrw) || 0,
          sanExtra: (ab.koreaSanctionedSurcharge && ab.koreaSanctionedSurcharge.amount) || (raw.costs.korea && raw.costs.korea.sanctionedSurchargeKrw) || 0
        },
        china: { fixed: (ab.china && ab.china.amount) || (site.china && site.china.fixedExpensesCny) || 0 },
        vladivostok: def.vladivostokRub !== undefined ? def.vladivostokRub : site.vladivostokRub,
        logistics: def.localLogisticsRub !== undefined ? def.localLogisticsRub : site.localLogisticsRub,
        commission: pairs(tiers, 'maxCarPriceRub', 'commissionRub')
      },
      limits: {
        japan: {
          maxCc: findNum(jp, /ДВС>(\d+)см/, 1900),
          hybrid: hasWord(jp, /гибрид/i),
          ev: hasWord(jp, /электромобил/i),
          newMaxJpy: findNum(jp, /дороже(\d+)млн¥/, 6) * 1000000
        },
        korea: { maxCc: findNum(kr, /ДВС>(\d+)см/, 2000), maxUsd: findNum(kr, /дороже(\d+)USD/, 50000) },
        eptsYear: 2007
      },
      cities: cities
    };
  }

  function fuelOf(v) {
    return FUEL_ALIASES[String(v || 'ice').toLowerCase()] || 'ice';
  }

  function bodyOf(v) {
    return BODY_ALIASES[String(v || 'sedan').toLowerCase()] || 'sedan';
  }

  var lastRaw = null;
  var lastCompact = null;

  function prepare(rules) {
    if (!rules) throw new Error('MGCalc: не переданы правила расчета');
    if (rules.v) return rules;
    if (rules !== lastRaw) {
      lastCompact = compactRules(rules);
      lastRaw = rules;
    }
    return lastCompact;
  }

  // --- возраст ----------------------------------------------------------------------------

  function ageCat(year, month0, day, D) {
    if (D <= Date.UTC(year + 3, month0, day)) return 'le3';
    if (D <= Date.UTC(year + 5, month0, day)) return '3to5';
    return 'gt5';
  }

  function monthRange(a, b) {
    return a === b ? MONTHS_PREP[a] : MONTHS_PREP[a] + '-' + MONTHS_PREP[b];
  }

  /**
   * Возрастная категория на дату декларации.
   * Известен только год — датой выпуска считается 1 июля; год и месяц — 15-е число месяца.
   */
  function ageInfo(year, month, dateIso) {
    var D = typeof dateIso === 'number' ? dateIso : parseDate(dateIso);
    year = Math.round(toNum(year));
    month = Math.round(toNum(month));
    var known = month >= 1 && month <= 12;
    var m0 = known ? month - 1 : 6;
    var d0 = known ? 15 : 1;
    var mfg = Date.UTC(year, m0, d0);
    var cat = ageCat(year, m0, d0, D);
    var months = (new Date(D).getUTCFullYear() - year) * 12 + (new Date(D).getUTCMonth() - m0) - (new Date(D).getUTCDate() < d0 ? 1 : 0);
    if (months < 0) months = 0;
    var out = {
      cat: cat,
      name: AGE[cat].name,
      full: AGE[cat].full,
      year: year,
      month: known ? month : 0,
      monthKnown: known,
      mfg: isoDate(mfg),
      mfgLabel: known ? '15 ' + MONTHS_GEN[m0] + ' ' + year : '1 июля ' + year,
      years: Math.floor(months / 12),
      months: months % 12,
      isNew: cat === 'le3',
      ambiguous: false,
      next: null
    };
    out.ageLabel = out.years + NB + plural(out.years, ['год', 'года', 'лет']) + (out.months ? ' ' + out.months + NB + 'мес.' : '');
    if (cat !== 'gt5') {
      var edge = Date.UTC(year + (cat === 'le3' ? 3 : 5), m0, d0) + DAY;
      out.next = { cat: cat === 'le3' ? '3to5' : 'gt5', name: AGE[cat === 'le3' ? '3to5' : 'gt5'].name, date: isoDate(edge), dateLabel: dateRu(edge), last: dateRu(edge - DAY), days: Math.round((edge - D) / DAY) };
    }
    if (!known) {
      var cats = [];
      var i;
      for (i = 0; i < 12; i++) cats.push(ageCat(year, i, 15, D));
      if (cats[0] !== cats[11]) {
        // год пограничный: категория зависит от месяца выпуска (с января по декабрь автомобиль «молодеет»)
        var split = 0;
        for (i = 1; i < 12; i++) if (cats[i] !== cats[i - 1]) split = i;
        out.ambiguous = true;
        out.byMonth = cats;
        out.alt = [
          { cat: cats[0], name: AGE[cats[0]].name, months: monthRange(0, split - 1) },
          { cat: cats[11], name: AGE[cats[11]].name, months: monthRange(split, 11) }
        ];
      }
    }
    return out;
  }

  // --- табличные поиски -------------------------------------------------------------------

  /** Первая строка шкалы, верхняя граница которой не меньше значения («не превышает» — включительно); null — без верхней границы */
  function bracket(list, value, tol) {
    for (var i = 0; i < list.length; i++) {
      var max = list[i] !== null && typeof list[i] === 'object' ? list[i][0] : list[i];
      if (max === null || max === undefined || value <= max + (tol || 0)) return i;
    }
    return list.length - 1;
  }

  function yearKey(byYear, year) {
    var best = null;
    for (var k in byYear) {
      if (+k <= year && (best === null || +k > +best)) best = k;
    }
    if (best === null) for (var k2 in byYear) if (best === null || +k2 < +best) best = k2;
    return best;
  }

  function rangeLabel(list, idx, unit, dec) {
    var max = list[idx] !== null && typeof list[idx] === 'object' ? list[idx][0] : list[idx];
    var prev = idx > 0 ? (typeof list[idx - 1] === 'object' && list[idx - 1] !== null ? list[idx - 1][0] : list[idx - 1]) : null;
    if (max === null || max === undefined) return 'свыше ' + num(prev, dec) + NB + unit;
    if (prev === null) return 'до ' + num(max, dec) + NB + unit;
    return num(prev + Math.pow(10, -dec), dec) + '-' + num(max, dec) + NB + unit;
  }

  function utilLookup(R, o) {
    var u = R.util;
    var isEv = o.table === 'ev';
    var idx = bracket(isEv ? u.evKw : u.iceKw, o.kw, u.tol);
    var volIdx = isEv ? -1 : bracket(u.volCc, o.cc, 0);
    var t = o.personal ? u.personal : u.full;
    var byYear = isEv ? t.ev : t.ice[u.volKeys[volIdx]];
    var yk = yearKey(byYear, o.year);
    var coef = byYear[yk][idx][o.isNew ? 0 : 1];
    return { coef: coef, rub: rnd(u.base * coef), idx: idx, volIdx: volIdx, year: +yk };
  }

  // --- расчет -----------------------------------------------------------------------------

  function calc(input, rules) {
    var R = prepare(rules);
    input = input || {};
    var warnings = [];
    var insights = [];
    var missing = [];

    var country = COUNTRIES[input.country] ? input.country : 'japan';
    var cn = COUNTRIES[country];
    var cur = cn.cur;
    var curInfo = CURRENCIES[cur];
    var rate = R.rates[cur];
    var eur = R.rates.EUR;
    var usd = R.rates.USD;

    var fuel = fuelOf(input.fuel || input.powertrain);
    var isStp = fuel === 'ev' || fuel === 'series';
    var hasIce = fuel !== 'ev';
    var needsIce = fuel === 'ice' || fuel === 'mild' || fuel === 'parallel';
    var hasMotor = fuel === 'parallel' || fuel === 'series' || fuel === 'ev';
    var body = bodyOf(input.body);
    var bodyIdx = body === 'sedan' ? 0 : body === 'crossover' ? 1 : 2;
    var personal = !(input.personal === false || input.personal === 0 || input.personal === '0');
    var withMarkup = input.markup === true || input.markup === 1 || input.markup === '1';

    var amount = Math.max(0, toNum(input.price));
    var inRubles = input.currency === 'RUB';
    var price = inRubles ? amount / rate : amount;
    var purchaseRub = inRubles ? amount : amount * rate;
    var cc = needsIce ? Math.max(0, Math.round(toNum(input.cc))) : 0;
    var hp = needsIce ? Math.max(0, toNum(input.hp !== undefined ? input.hp : input.iceHp)) : 0;
    var ehp = hasMotor ? Math.max(0, toNum(input.ehp)) : 0;
    var e30in = hasMotor ? Math.max(0, toNum(input.e30 !== undefined ? input.e30 : input.e30Kw)) : 0;

    var dateMs = parseDate(input.date || R.date);
    if (isNaN(dateMs)) dateMs = parseDate(R.date);
    var declYear = new Date(dateMs).getUTCFullYear();

    if (!price) missing.push('price');
    if (needsIce && !cc) missing.push('cc');
    if (needsIce && !hp) missing.push('hp');
    if ((fuel === 'ev' || fuel === 'series') && !ehp && !e30in) missing.push('ehp');

    // 2. возраст
    var year = Math.round(toNum(input.year));
    var age;
    if (input.age && AGE[input.age]) {
      age = { cat: input.age, name: AGE[input.age].name, full: AGE[input.age].full, isNew: input.age === 'le3', ambiguous: false, next: null, forced: true, year: year, monthKnown: true };
    } else if (year >= 1980 && year <= declYear + 1) {
      age = ageInfo(year, input.month, dateMs);
    } else {
      missing.push('year');
      age = { cat: '3to5', name: AGE['3to5'].name, full: AGE['3to5'].full, isNew: false, ambiguous: false, next: null, year: 0, monthKnown: false };
    }

    // профиль расходов на доставку по правилам клиента
    var lim = R.limits;
    var sanctioned = false;
    var reasons = [];
    if (country === 'japan') {
      if (hasIce && fuel !== 'series' && cc > lim.japan.maxCc) reasons.push('cc');
      if ((fuel === 'parallel' || fuel === 'series') && lim.japan.hybrid) reasons.push('hybrid');
      if (fuel === 'ev' && lim.japan.ev) reasons.push('ev');
    } else if (country === 'korea') {
      if (needsIce && cc > lim.korea.maxCc) reasons.push('cc');
      if (usd && purchaseRub / usd > lim.korea.maxUsd) reasons.push('price');
    }
    sanctioned = reasons.length > 0;
    if (input.sanctioned === true || input.sanctioned === false) sanctioned = input.sanctioned;

    // 7. расходы за рубежом (профиль поставки)
    var cost = R.costs[country];
    var fixedCur = sanctioned && cost.sanFixed ? cost.sanFixed : cost.fixed;
    var extraCur = sanctioned && cost.sanExtra ? cost.sanExtra : 0;
    var freightUsd = sanctioned && cost.sanFreightUsd ? cost.sanFreightUsd : 0;
    if (input.abroadFixed !== undefined) fixedCur = toNum(input.abroadFixed);
    if (input.abroadExtra !== undefined) extraCur = toNum(input.abroadExtra);
    if (input.freightUsd !== undefined) freightUsd = toNum(input.freightUsd);

    // 3. таможенная стоимость: цена + фиксированные расходы за рубежом, по курсу ЦБ
    var carRub = rnd(purchaseRub);
    var cvRub = rnd(inRubles ? purchaseRub + fixedCur * rate : (amount + fixedCur) * rate);
    var fixedRub = cvRub - carRub;
    var extraRub = rnd(extraCur * rate);
    var freightRub = rnd(freightUsd * usd);
    var markupPct = R.markup[cur] || 0;
    var markupFull = rnd(cvRub * markupPct);
    var markupRub = withMarkup ? markupFull : 0;
    var cvEur = cvRub / eur;

    // мощность для утильсбора и акциза
    var u = R.util;
    var iceKw = hp * u.hpToKw;
    var e30 = 0;
    var e30Estimated = false;
    if (hasMotor) {
      if (e30in) e30 = e30in;
      else if (ehp) { e30 = round2(ehp * u.hpToKw * u.peakTo30); e30Estimated = true; }
    }
    var utilTable = isStp ? 'ev' : 'ice';
    var utilKw = isStp ? e30 : fuel === 'parallel' ? iceKw + e30 : iceKw;

    // 4. пошлина
    var mode = isStp ? 'STP' : 'ETS';
    var duty = { rub: 0 };
    var excise = null;
    var vat = null;
    function etsFor(cat) {
      if (cat === 'le3') {
        var row = R.ets.le3[bracket(R.ets.le3, cvEur, 0)];
        var pctRub = row[1] * cvRub;
        var minRub = row[2] * cc * eur;
        return { type: 'le3', pct: row[1], minEurPerCc: row[2], by: pctRub >= minRub ? 'pct' : 'min', rub: rnd(Math.max(pctRub, minRub)) };
      }
      var r = R.ets[cat][bracket(R.ets[cat], cc, 0)];
      return { type: 'perCc', eurPerCc: r[1], rub: rnd(r[1] * cc * eur) };
    }
    if (isStp) {
      duty = { type: 'stp', pct: R.stp.duty, rub: rnd(R.stp.duty * cvRub) };
      var exTable = R.stp.excise[yearKey(R.stp.excise, declYear)];
      var exHp = round2(e30 * R.stp.kwToHp);
      var exRate = exTable[bracket(exTable, exHp, 0)][1];
      excise = { hp: exHp, rate: exRate, rub: rnd(exRate * exHp) };
      vat = { pct: R.stp.vat, base: cvRub + duty.rub + excise.rub, rub: rnd(R.stp.vat * (cvRub + duty.rub + excise.rub)) };
    } else {
      duty = etsFor(age.cat);
    }

    // 5. таможенный сбор
    var feeIdx = bracket(R.fee, cvRub, 0);
    var fee = { rub: R.fee[feeIdx][1], max: R.fee[feeIdx][0] };

    // 6. утилизационный сбор
    var uq = { table: utilTable, kw: utilKw, cc: cc, isNew: age.isNew, year: declYear, personal: personal };
    var ul = utilLookup(R, uq);
    var prefCoef = age.isNew ? u.pref.coefNew : u.pref.coefOld;
    var prefRub = rnd(u.base * prefCoef);
    var util = {
      rub: ul.rub,
      coef: ul.coef,
      year: ul.year,
      table: utilTable,
      powerKw: round2(utilKw),
      powerHp: Math.round((utilKw / u.hpToKw) * 10) / 10,
      isNew: age.isNew,
      pref: personal && ul.coef === prefCoef,
      prefRub: prefRub,
      personal: personal,
      e30: e30,
      e30Estimated: e30Estimated,
      // гибрид без мощности электромотора: сбор посчитан только по ДВС и, скорее всего, занижен — льготу в интерфейсе не обещаем
      noMotor: fuel === 'parallel' && !e30,
      powerRange: rangeLabel(isStp ? u.evKw : u.iceKw, ul.idx, 'кВт', 2),
      volRange: isStp ? '' : rangeLabel(u.volCc, ul.volIdx, 'см³', 0),
      thresholdKw: isStp ? u.pref.evKw : u.pref.iceKw,
      thresholdHp: isStp ? u.pref.evHp : u.pref.iceHp
    };
    util.reason = util.pref ? null : !personal ? 'personal' : !isStp && cc > u.pref.iceCc ? 'volume' : 'power';
    util.reserveKw = util.pref ? round2(util.thresholdKw - utilKw) : 0;

    // 8-9. Владивосток и комиссия
    var vladivostokRub = input.vladivostok !== undefined ? toNum(input.vladivostok) : R.costs.vladivostok;
    var logisticsRub = input.logistics !== undefined ? toNum(input.logistics) : R.costs.logistics;
    var tiers = R.costs.commission;
    var commissionRub = input.commission !== undefined
      ? Math.max(tiers[0][1], toNum(input.commission))
      : tiers[bracket(tiers, carRub, 0)][1];

    // 10. доставка по России
    var delivery = { rub: 0, city: '', name: 'Владивосток', acc: '', days: null, estimated: false, body: body };
    var slug = String(input.city || '').toLowerCase();
    if (slug && slug !== 'vladivostok') {
      for (var ci = 0; ci < R.cities.length; ci++) {
        var c = R.cities[ci];
        if (c.s === slug || c.x === slug) {
          delivery = { rub: c.t[bodyIdx], city: c.s, name: c.n, acc: c.a || c.n, days: c.d, estimated: !!c.e, body: body };
          break;
        }
      }
    }
    if (input.delivery !== undefined) {
      delivery.rub = toNum(input.delivery);
      delivery.custom = true;
    }

    // --- строки расчета -------------------------------------------------------------------
    var rows1 = [];
    rows1.push({ id: 'price', label: 'Цена автомобиля ' + cn.inLoc, rub: carRub,
      note: inRubles ? 'Цена введена в рублях, около ' + money(price, cur) + ' по курсу ЦБ' : money(price, cur) + ' × ' + num(rate, 6) + NB + '₽ по курсу ЦБ' });
    rows1.push({
      id: 'abroad',
      label: country === 'china' ? 'Расходы в Китае и доставка до границы' : 'Расходы ' + cn.inLoc + ' и доставка до Владивостока',
      rub: fixedRub,
      note: money(fixedCur, cur) + (country === 'china' ? ': экспортные документы, осмотр, доставка до границы' : country === 'korea' ? ': экспортные документы, осмотр, доставка в порт, фрахт' : ': фиксированные расходы по профилю поставки')
    });
    if (extraRub) rows1.push({ id: 'abroadExtra', label: 'Дополнительные расходы на доставку', rub: extraRub, note: money(extraCur, cur) + ', рыночный ориентир, считается индивидуально' });
    if (freightRub) rows1.push({ id: 'freight', label: 'Фрахт до Владивостока', rub: freightRub, note: num(freightUsd) + NB + '$ × ' + num(usd, 4) + NB + '₽' });
    if (markupRub) rows1.push({ id: 'markup', label: 'Конвертация и перевод за рубеж', rub: markupRub, note: '+' + num(markupPct * 100, 1) + NB + '% к курсу ЦБ, ориентир по рынку' });

    var rows2 = [];
    var dutyNote;
    if (duty.type === 'perCc') dutyNote = 'единая ставка ' + num(duty.eurPerCc, 2) + NB + '€/см³ × ' + num(cc) + NB + 'см³ × ' + num(eur, 4) + NB + '₽, ' + age.name;
    else if (duty.type === 'le3') dutyNote = duty.by === 'pct' ? 'единая ставка ' + num(duty.pct * 100) + NB + '% от таможенной стоимости ' + rub(cvRub) : 'единая ставка, минимум ' + num(duty.minEurPerCc, 2) + NB + '€/см³ × ' + num(cc) + NB + 'см³ × ' + num(eur, 4) + NB + '₽';
    else dutyNote = num(duty.pct * 100) + NB + '% от таможенной стоимости ' + rub(cvRub);
    rows2.push({ id: 'duty', label: 'Таможенная пошлина', rub: duty.rub, note: dutyNote });
    if (excise) rows2.push({ id: 'excise', label: 'Акциз', rub: excise.rub, note: excise.rate ? num(excise.rate) + NB + '₽ × ' + num(excise.hp, 2) + NB + 'л.с. (30-минутная мощность)' : num(excise.hp, 2) + NB + 'л.с.: до 90 л.с. акциз не начисляется' });
    if (vat) rows2.push({ id: 'vat', label: 'НДС ' + num(vat.pct * 100) + NB + '%', rub: vat.rub, note: 'от суммы стоимости, пошлины и акциза: ' + rub(vat.base) });
    rows2.push({ id: 'fee', label: 'Таможенный сбор', rub: fee.rub, note: 'таможенная стоимость ' + rub(cvRub) });
    rows2.push({
      id: 'util',
      label: 'Утилизационный сбор',
      rub: util.rub,
      note: num(u.base) + NB + '₽ × ' + num(util.coef, 2) + ' (' + (util.pref ? 'льготный' : 'полная ставка') + '): ' + num(util.powerKw, 2) + NB + 'кВт' + (isStp ? ' 30-минутной мощности' : fuel === 'parallel' ? (e30 ? ' (ДВС + электромотор)' : ' (только ДВС: мощность электромотора не указана)') : ' (' + num(hp, 1) + NB + 'л.с.)') + (isStp ? '' : ', ' + util.volRange)
    });

    var rows3 = [
      { id: 'vladivostok', label: country === 'china' ? 'Оформление в России' : 'Оформление во Владивостоке', rub: vladivostokRub, note: 'склад временного хранения, лаборатория, СБКТС и ЭПТС, ориентир' },
      { id: 'logistics', label: 'Логистика на месте', rub: logisticsRub, note: country === 'china' ? 'доставка из Уссурийска во Владивосток' : 'фотоопись, перегон со склада в лабораторию и на стоянку, трекер' },
      { id: 'commission', label: 'Комиссия компании', rub: commissionRub, note: 'по цене автомобиля в стране покупки, минимум ' + rub(tiers[0][1]) }
    ];

    var rows4 = [];
    if (!delivery.city && delivery.custom && delivery.rub) rows4.push({ id: 'delivery', label: 'Доставка по России', rub: delivery.rub, note: 'сумма задана вручную' });
    if (delivery.city) rows4.push({ id: 'delivery', label: 'Автовоз из Владивостока в ' + delivery.acc, rub: delivery.rub, note: BODIES[body].short + (delivery.days ? ', ' + (delivery.days[0] === delivery.days[1] ? delivery.days[0] : delivery.days[0] + '-' + delivery.days[1]) + NB + 'дней в пути' : '') + (delivery.estimated ? ', оценка по соседним направлениям' : ', ориентир по прайсам перевозчиков') });

    function sum(rows) {
      var s = 0;
      for (var i = 0; i < rows.length; i++) s += rows[i].rub;
      return s;
    }

    var groups = [
      { id: 'car', title: 'Автомобиль и расходы в стране покупки', short: 'Автомобиль и расходы за рубежом', rub: sum(rows1), rows: rows1 },
      { id: 'customs', title: 'Таможенные платежи', short: 'Таможня и утильсбор', rub: sum(rows2), rows: rows2 },
      { id: 'vl', title: 'Владивосток: оформление и услуги', short: 'Оформление и комиссия', rub: sum(rows3), rows: rows3 },
      { id: 'delivery', title: 'Доставка по России', short: 'Доставка в город', rub: sum(rows4), rows: rows4 }
    ];
    var totalVladivostok = groups[0].rub + groups[1].rub + groups[2].rub;
    var totalCity = totalVladivostok + groups[3].rub;

    // --- предупреждения -------------------------------------------------------------------
    function warn(code, level, text) {
      warnings.push({ code: code, level: level, text: text });
    }
    var i;
    if (sanctioned && country === 'japan' && (cost.sanFixed || cost.sanFreightUsd)) {
      warn('jp-route', 'info', 'Для этой машины расходы на доставку выше обычных. В расчет включены ' + money(cost.sanFixed, cur) + ' расходов в Японии и фрахт ' + num(cost.sanFreightUsd) + NB + '$. Точную сумму считаем индивидуально.');
    }
    if (sanctioned && country === 'korea' && cost.sanExtra) {
      warn('kr-route', 'info', 'Для этой машины расходы на доставку выше обычных. В расчет добавлено ' + money(cost.sanExtra, cur) + ' по рыночному ориентиру. Точную сумму считаем индивидуально.');
    }
    // пошлина + утильсбор для другой возрастной категории (остальные строки от возраста не зависят)
    function customsFor(cat) {
      var d = isStp ? duty.rub : etsFor(cat).rub;
      return d + utilLookup(R, { table: utilTable, kw: utilKw, cc: cc, isNew: cat === 'le3', year: declYear, personal: personal }).rub;
    }
    var customsNow = duty.rub + util.rub;
    if (age.ambiguous) {
      var other = age.alt[0].cat === age.cat ? age.alt[1] : age.alt[0];
      var gap = Math.abs(customsFor(other.cat) - customsNow);
      age.gapRub = gap;
      warn('age-month', 'warn', 'Нужен месяц выпуска: ' + year + ' год пограничный. Автомобиль, выпущенный в ' + age.alt[0].months + ', относится к категории «' + age.alt[0].name + '», а выпущенный в ' + age.alt[1].months + ' относится к категории «' + age.alt[1].name + '»' + (gap ? '; разница в платежах: ' + rub(gap) : '') + '. Пока месяц не указан, датой выпуска считается 1 июля и расчет сделан для категории «' + age.name + '».');
    } else if (age.next && age.next.days >= 0 && age.next.days <= 120 && !age.forced) {
      var diff = customsFor(age.next.cat) - customsNow;
      age.next.diffRub = diff;
      if (diff) warn('age-soon', diff > 0 ? 'warn' : 'info', 'Через ' + age.next.days + NB + plural(age.next.days, ['день', 'дня', 'дней']) + ' автомобиль перейдет в категорию «' + age.next.name + '», и таможенные платежи ' + (diff > 0 ? 'вырастут на ' : 'снизятся на ') + rub(Math.abs(diff)) + '. Последний день в текущей категории: ' + age.next.last + '. Учитывайте срок доставки и оформления.');
    }
    if (e30Estimated) {
      warn('e30', 'info', '30-минутная мощность электромотора оценена как пиковая × ' + num(u.peakTo30, 2) + ' = ' + num(e30, 2) + NB + 'кВт. По документам конкретной модификации она может отличаться, а от нее ' + (isStp ? 'зависят утильсбор и акциз.' : 'зависит утильсбор.'));
    }
    if (fuel === 'parallel' && !ehp && !e30in) warn('e30-missing', 'warn', 'Укажите мощность электромотора: для гибрида утильсбор считается по сумме мощности ДВС и 30-минутной мощности электромотора.');
    if (util.pref && util.reserveKw >= 0 && util.reserveKw < 11 && (e30Estimated || fuel === 'ice' || fuel === 'mild')) {
      warn('util-edge', 'info', (util.reserveKw < 0.5 ? 'Мощность находится на самой границе льготного утильсбора (' + num(util.thresholdKw, 2) + NB + 'кВт, ' + util.thresholdHp + NB + 'л.с.).' : 'До порога льготного утильсбора ' + num(util.thresholdKw, 2) + NB + 'кВт остается ' + num(util.reserveKw, 2) + NB + 'кВт.') + ' Если по документам мощность окажется выше, сбор вырастет с ' + rub(util.rub) + ' до ' + rub(utilLookup(R, { table: utilTable, kw: util.thresholdKw + 1, cc: cc, isNew: age.isNew, year: declYear, personal: personal }).rub) + '.');
    }
    if (!personal) warn('personal', 'info', 'Расчет без льготы «для личного пользования»: утильсбор по полной шкале. Так считают второй автомобиль за 12 месяцев и ввоз для перепродажи.');
    if (year && year < lim.eptsYear && !age.forced) warn('epts', 'warn', 'Электронный ПТС сейчас получают на бензиновые автомобили ' + lim.eptsYear + ' года и новее, на дизельные ' + (lim.eptsYear + 1) + ' года и новее. Автомобиль ' + year + ' года оформить с ЭПТС, скорее всего, не получится. Такой ввоз в расчет «под ключ» не входит.');

    // --- что изменило бы сумму ------------------------------------------------------------
    if (!isStp && cc) {
      if (age.cat === 'gt5') {
        var p35 = etsFor('3to5');
        if (duty.rub > p35.rub) insights.push({ code: 'passing', save: duty.rub - p35.rub, text: 'Тот же двигатель в «проходном» возрасте 3-5 лет: пошлина ' + rub(p35.rub) + ' вместо ' + rub(duty.rub) + '.' });
      } else if (age.cat === 'le3') {
        var p3 = etsFor('3to5');
        if (duty.rub > p3.rub) insights.push({ code: 'passing', save: duty.rub - p3.rub, text: 'После трех лет пошлина считается только от объема двигателя: ' + rub(p3.rub) + ' вместо ' + rub(duty.rub) + '.' });
      }
    }
    if (!util.pref && personal && util.reason === 'power') {
      insights.push({ code: isStp ? 'ev80' : 'hp160', save: util.rub - prefRub, text: (isStp ? 'До ' + num(u.pref.evKw, 2) + NB + 'кВт (' + u.pref.evHp + NB + 'л.с.) 30-минутной мощности' : 'До ' + u.pref.iceHp + NB + 'л.с.') + ' утильсбор был бы ' + rub(prefRub) + ' вместо ' + rub(util.rub) + '.' });
    }
    if (!util.pref && personal && util.reason === 'volume') {
      insights.push({ code: 'volume', save: 0, text: 'Двигатель больше ' + liters(u.pref.iceCc) + ': льготный утильсбор не применяется при любой мощности.' });
    }
    if (!personal) {
      var own = utilLookup(R, { table: utilTable, kw: utilKw, cc: cc, isNew: age.isNew, year: declYear, personal: true });
      if (own.rub < util.rub) insights.push({ code: 'personal', save: util.rub - own.rub, text: 'При ввозе для личного пользования утильсбор составит ' + rub(own.rub) + ' вместо ' + rub(util.rub) + '.' });
    }
    if (!util.pref && util.year === declYear) {
      var next = utilLookup(R, { table: utilTable, kw: utilKw, cc: cc, isNew: age.isNew, year: declYear + 1, personal: personal });
      if (next.year === declYear + 1 && next.rub > util.rub) insights.push({ code: 'util-next', save: 0, text: 'С 1 января ' + (declYear + 1) + ' года утильсбор по этой строке вырастет до ' + rub(next.rub) + ' (+' + rub(next.rub - util.rub) + ').' });
    }

    return {
      ok: missing.length === 0,
      missing: missing,
      input: { country: country, price: amount, currency: inRubles ? 'RUB' : cur, year: year, month: age.month || 0, fuel: fuel, cc: cc, hp: hp, ehp: ehp, e30: e30in, personal: personal, markup: withMarkup, city: delivery.city, body: body },
      country: { slug: country, name: cn.name, from: cn.from, inLoc: cn.inLoc },
      currency: { code: cur, sign: curInfo.sign, name: curInfo.name, gen: curInfo.gen },
      fuel: { slug: fuel, name: FUELS[fuel].name, short: FUELS[fuel].short },
      date: isoDate(dateMs),
      dateLabel: dateRu(dateMs),
      ratesDate: R.date,
      rates: { cur: rate, eur: eur, usd: usd, curLabel: rateLabel(cur, rate), eurLabel: rateLabel('EUR', eur), usdLabel: rateLabel('USD', usd) },
      age: age,
      mode: mode,
      sanctioned: sanctioned,
      customsValueRub: cvRub,
      customsValueEur: Math.round(cvEur),
      carRub: carRub,
      abroad: { fixedCur: fixedCur, fixedRub: fixedRub, extraCur: extraCur, extraRub: extraRub, freightUsd: freightUsd, freightRub: freightRub, rub: fixedRub + extraRub + freightRub },
      markup: { pct: markupPct, rub: markupRub, rubIfOn: markupFull, on: withMarkup },
      duty: duty,
      excise: excise,
      vat: vat,
      fee: fee,
      util: util,
      customsTotalRub: groups[1].rub,
      vladivostokRub: vladivostokRub,
      logisticsRub: logisticsRub,
      commissionRub: commissionRub,
      delivery: delivery,
      totalVladivostok: totalVladivostok,
      totalCity: totalCity,
      groups: groups,
      warnings: warnings,
      insights: insights
    };
  }

  /** Перевод цены в валюту другой страны с округлением до «круглого» шага — чтобы при смене страны бюджет сохранялся */
  function convertPrice(price, fromCountry, toCountry, rules) {
    var R = prepare(rules);
    var a = COUNTRIES[fromCountry];
    var b = COUNTRIES[toCountry];
    if (!a || !b || !price) return price;
    var step = CURRENCIES[b.cur].step;
    return Math.max(step, Math.round((price * R.rates[a.cur]) / R.rates[b.cur] / step) * step);
  }

  return {
    calc: calc,
    compactRules: compactRules,
    ageInfo: ageInfo,
    convertPrice: convertPrice,
    fuelOf: fuelOf,
    bodyOf: bodyOf,
    COUNTRIES: COUNTRIES,
    CURRENCIES: CURRENCIES,
    FUELS: FUELS,
    BODIES: BODIES,
    AGE: AGE,
    MONTHS: MONTHS,
    fmt: { num: num, rub: rub, money: money, rateLabel: rateLabel, dateRu: dateRu, dateShort: dateShort, plural: plural, toNum: toNum }
  };
});
