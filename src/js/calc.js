/* Макс Групп — интерфейс калькулятора «авто под ключ» (без зависимостей, поверх js/calc-core.js).
   1. MGCalc.view — строители HTML для результата. Те же функции вызывает генератор сайта (src/components/calc.mjs),
      поэтому разметка в исходном HTML и после пересчёта в браузере совпадает.
   2. Полный калькулятор [data-calc]: живой пересчёт, состояние в адресе (?country=japan&price=…&year=…&cc=…&hp=…&city=…),
      пресеты, подсказки, переключатель «во Владивостоке / с доставкой», сводка расчёта в заявке (поле name="calc").
   3. Мини-калькулятор [data-calc-mini]: страна, цена, год, объём, мощность → итог и ссылка на подробный расчёт. */
(function (root) {
  'use strict';

  var core = root.MGCalc;
  if (!core) return;
  var F = core.fmt;
  var NB = ' ';

  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON = {
    info: SVG + '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/></svg>',
    alert: SVG + '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17v.01"/></svg>',
    arrow: SVG + '<path d="M4 12h15m-6-6 6 6-6 6"/></svg>'
  };

  var ORDER = ['country', 'price', 'year', 'month', 'fuel', 'cc', 'hp', 'ehp', 'e30', 'city', 'body', 'personal', 'markup', 'view'];
  var ENGINE = ['cc', 'hp', 'ehp', 'e30'];
  var SCOPE = { 'age-month': 'age', 'age-soon': 'age', epts: 'age', 'kr-price': 'price', 'jp-price': 'price' };

  /** Мощность из адреса или поля: «150,5» → «150.5», не больше 9999; мусор и ноль → пустая строка */
  function decStr(v, frac) {
    var n = F.toNum(v);
    if (!(n > 0)) return '';
    var k = Math.pow(10, frac || 0);
    return String(Math.round(Math.min(n, 9999) * k) / k);
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function withCity(r, mode) {
    return mode === 'city' && !!r.delivery.city;
  }

  function total(r, mode) {
    return withCity(r, mode) ? r.totalCity : r.totalVladivostok;
  }

  /** Доли групп в процентах, в сумме ровно 100 (метод наибольших остатков) */
  function shares(r, mode) {
    var sum = total(r, mode);
    var out = {};
    var parts = [];
    var used = 0;
    var i;
    for (i = 0; i < r.groups.length; i++) {
      var g = r.groups[i];
      var on = g.id !== 'delivery' || withCity(r, mode);
      var raw = on && sum ? (g.rub / sum) * 100 : 0;
      out[g.id] = { raw: raw, pct: Math.floor(raw), on: on };
      used += Math.floor(raw);
      parts.push({ id: g.id, frac: raw - Math.floor(raw) });
    }
    parts.sort(function (a, b) { return b.frac - a.frac; });
    for (i = 0; sum && used < 100 && i < parts.length; i++, used++) out[parts[i].id].pct++;
    return out;
  }

  var view = {
    total: function (r, mode) {
      return r.ok ? F.rub(total(r, mode)) : '—';
    },

    /** Подпись под итогом */
    caption: function (r, mode) {
      if (!r.ok) return view.need(r);
      return (withCity(r, mode) ? 'с доставкой в ' + r.delivery.acc : 'под ключ во Владивостоке') + ' · предварительный расчёт';
    },

    /** Чего не хватает для расчёта — одной фразой, по первому незаполненному полю */
    need: function (r) {
      var m = r.missing || [];
      var no = function (k) { return m.indexOf(k) >= 0; };
      if (no('price')) return 'Укажите цену автомобиля ' + r.country.inLoc;
      if (no('year')) return 'Выберите год выпуска';
      if (no('cc') && no('hp')) return 'Укажите объём и мощность двигателя';
      if (no('cc')) return 'Укажите объём двигателя — от него зависит пошлина';
      if (no('hp')) return 'Укажите мощность двигателя — от неё зависит утильсбор';
      if (no('ehp')) return 'Укажите мощность электромоторов — от неё зависят акциз и утильсбор';
      return 'Заполните поля формы — посчитаем сразу';
    },

    /** Полоса-диаграмма долей + легенда по четырём группам */
    legend: function (r, mode) {
      var sh = shares(r, mode);
      var bar = '';
      var aria = [];
      var list = '';
      for (var i = 0; i < r.groups.length; i++) {
        var g = r.groups[i];
        var s = sh[g.id];
        if (s.on && g.rub > 0 && r.ok) {
          bar += '<i class="calc-bar__seg calc-bar__seg--' + g.id + '" style="flex-grow:' + s.raw.toFixed(2) + '"></i>';
          aria.push(g.short.toLowerCase() + ' — ' + s.pct + '%');
        }
        var off = g.id === 'delivery' && !s.on;
        list +=
          '<li class="calc-legend__item' + (off ? ' is-off' : '') + '">' +
          '<i class="calc-dot calc-dot--' + g.id + '"></i>' +
          '<span class="calc-legend__name">' + esc(g.short) + '</span>' +
          '<span class="calc-legend__pct">' + (r.ok && s.on ? s.pct + NB + '%' : '') + '</span>' +
          '<b class="calc-legend__sum">' + (!r.ok ? '—' : off ? (r.delivery.city ? '+' + NB + F.rub(g.rub) : 'не выбрана') : F.rub(g.rub)) + '</b>' +
          '</li>';
      }
      return (
        '<div class="calc-bar" role="img" aria-label="Структура цены: ' + esc(aria.join(', ')) + '">' + (bar || '<i class="calc-bar__seg calc-bar__seg--empty" style="flex-grow:1"></i>') + '</div>' +
        '<ul class="calc-legend">' + list + '</ul>'
      );
    },

    /** Расшифровка: четыре группы со строками и пояснением, как посчитана каждая сумма */
    breakdown: function (r, mode) {
      var sh = shares(r, mode);
      var html = '';
      for (var i = 0; i < r.groups.length; i++) {
        var g = r.groups[i];
        var s = sh[g.id];
        var rows = '';
        for (var j = 0; j < g.rows.length; j++) {
          var row = g.rows[j];
          rows += '<div class="calc-row"><dt>' + esc(row.label) + '<small>' + esc(row.note) + '</small></dt><dd>' + (r.ok ? F.rub(row.rub) : '—') + '</dd></div>';
        }
        var foot = '';
        if (g.id === 'delivery') {
          if (!g.rows.length) rows = '<div class="calc-row"><dt>Самовывоз во Владивостоке<small>выберите город в форме — добавим автовоз по типу кузова</small></dt><dd>' + F.rub(0) + '</dd></div>';
          else if (!s.on) foot = '<p class="calc-group__foot">В итог «во Владивостоке» не входит</p>';
        }
        html +=
          '<article class="calc-group calc-group--' + g.id + (g.id === 'delivery' && !s.on ? ' is-off' : '') + '">' +
          '<header class="calc-group__head"><span class="calc-group__name"><i class="calc-dot calc-dot--' + g.id + '"></i>' + esc(g.title) + '</span>' +
          '<span class="calc-group__pct">' + (r.ok && s.on ? s.pct + NB + '%' : '') + '</span></header>' +
          '<div class="calc-group__sum">' + (r.ok ? F.rub(g.rub) : '—') + '</div>' +
          '<dl class="calc-rows">' + rows + '</dl>' + foot +
          '</article>';
      }
      return html;
    },

    /** Короткие статусы под итогом: возраст, утильсбор, режим пошлины, ограничения */
    status: function (r) {
      var items = [];
      if (!r.ok) return '';
      if (r.age.ambiguous) items.push(['warn', 'Нужен месяц выпуска', '#calc-age']);
      else items.push([r.age.cat === '3to5' ? 'ok' : '', r.age.name + (r.age.cat === '3to5' ? ' · проходной' : ''), '#calc-age']);
      // гибрид без мощности электромотора: льготу не обещаем, пока сбор посчитан только по ДВС
      if (r.util.noMotor && r.util.pref) items.push(['warn', 'Нужна мощность электромотора', '#calc-engine']);
      else items.push([r.util.pref ? 'ok' : 'warn', r.util.pref ? 'Льготный утильсбор' : 'Утильсбор по полной шкале', '#calc-engine']);
      if (r.mode === 'STP') items.push(['', 'Пошлина 15' + NB + '% + акциз + НДС', '#calc-engine']);
      if (r.sanctioned) items.push(['warn', 'Экспортное ограничение', '#calc-engine']);
      var html = '';
      for (var i = 0; i < items.length; i++) html += '<a class="calc-chip' + (items[i][0] ? ' calc-chip--' + items[i][0] : '') + '" href="' + items[i][2] + '">' + esc(items[i][1]) + '</a>';
      return html;
    },

    /** Предупреждения для блока формы: scope = 'age' | 'engine' | 'price' */
    warnings: function (r, scope) {
      var html = '';
      for (var i = 0; i < r.warnings.length; i++) {
        var w = r.warnings[i];
        if ((SCOPE[w.code] || 'engine') !== scope) continue;
        html += '<div class="note' + (w.level === 'warn' ? ' note--warn' : '') + '">' + (w.level === 'warn' ? ICON.alert : ICON.info) + '<div>' + esc(w.text) + '</div></div>';
      }
      return html;
    },

    /** Что изменило бы сумму; links — адреса подборок по коду подсказки */
    insights: function (r, links) {
      links = links || {};
      var html = '';
      if (!r.ok) return '';
      for (var i = 0; i < r.insights.length; i++) {
        var it = r.insights[i];
        var link = links[it.code];
        html += '<li class="calc-insight"><span>' + esc(it.text) + '</span>' + (link ? '<a class="link" href="' + esc(link.url) + '">' + esc(link.text) + '</a>' : '') + '</li>';
      }
      return html;
    },

    ageLine: function (r) {
      var a = r.age;
      if (!a.year) return 'Выберите год выпуска.';
      if (a.forced) return a.full;
      return (
        '<b>' + (a.cat === '3to5' ? '3–5 лет — проходной возраст' : a.cat === 'le3' ? 'До 3 лет' : 'Старше 5 лет') + '.</b> ' +
        'Дата выпуска для расчёта — ' + a.mfgLabel + ', возраст на ' + F.dateShort(Date.parse(r.date)) + ' — ' + a.ageLabel.replace(/\.$/, '') + '.' +
        (a.next ? ' В категорию «' + a.next.name + '» автомобиль перейдёт ' + a.next.dateLabel + '.' : '')
      );
    },

    powerLine: function (r) {
      var u = r.util;
      var f = r.fuel.slug;
      var head;
      if (f === 'ev' || f === 'series') {
        if (!u.e30) return 'Укажите мощность электромоторов: по ней считаются акциз и утилизационный сбор.';
        head = '30-минутная мощность — ' + F.num(u.e30, 2) + NB + 'кВт (' + F.num(u.powerHp, 1) + NB + 'л.с.)' + (u.e30Estimated ? ', оценка: пиковая × 0,45' : '') + '. ';
      } else if (!r.input.hp) {
        return 'Укажите мощность двигателя: от неё зависит утилизационный сбор.';
      } else if (u.noMotor) {
        return 'ДВС ' + F.num(u.powerKw, 2) + NB + 'кВт. <b>Укажите мощность электромотора: в утильсборе она прибавляется к мощности ДВС.</b> Пока сбор посчитан только по ДВС — ' + F.rub(u.rub) + '.';
      } else if (f === 'parallel') {
        head = 'ДВС ' + F.num(u.powerKw - u.e30, 2) + NB + 'кВт + электромотор ' + F.num(u.e30, 2) + NB + 'кВт за 30 минут = ' + F.num(u.powerKw, 2) + NB + 'кВт. ';
      } else {
        head = F.num(r.input.hp, 1) + NB + 'л.с. = ' + F.num(u.powerKw, 2) + NB + 'кВт. ';
      }
      var lim = F.num(u.thresholdKw, 2) + NB + 'кВт (' + u.thresholdHp + NB + 'л.с.)';
      if (u.pref) return head + '<b>Ниже порога ' + lim + ' — льготный утильсбор ' + F.rub(u.rub) + '.</b>';
      if (u.reason === 'volume') return head + '<b>Объём больше 3,0' + NB + 'л — льготы нет, утильсбор ' + F.rub(u.rub) + '.</b>';
      if (u.reason === 'personal') return head + '<b>Без льготы для личного пользования утильсбор — ' + F.rub(u.rub) + '.</b>';
      return head + '<b>Выше порога ' + lim + ' — утильсбор по полной шкале: ' + F.rub(u.rub) + '.</b>';
    },

    /** Короткая сводка расчёта для заявки (поле name="calc") */
    summary: function (r, mode, name) {
      var i = r.input;
      var eng = r.fuel.slug === 'ev' || r.fuel.slug === 'series'
        ? r.fuel.short + ', ' + (i.e30 ? F.num(i.e30, 2) + ' кВт за 30 минут' : F.num(i.ehp) + ' л.с.')
        : r.fuel.short + ' ' + F.num(i.cc) + ' см³, ' + F.num(i.hp, 1) + ' л.с.' + (r.fuel.slug === 'parallel' && (i.ehp || i.e30) ? ' + электромотор ' + (i.e30 ? F.num(i.e30, 2) + ' кВт за 30 минут' : F.num(i.ehp) + ' л.с.') : '');
      var s = (name ? name + '; ' : '') + r.country.name + ', ' + F.money(i.price, r.currency.code) + ', ' + (i.month ? (i.month < 10 ? '0' : '') + i.month + '.' : '') + i.year + ' г., ' + eng +
        '; под ключ во Владивостоке ≈ ' + F.rub(r.totalVladivostok) +
        (r.delivery.city ? '; с доставкой в ' + r.delivery.acc + ' ≈ ' + F.rub(r.totalCity) : '') +
        '; пошлина ' + F.rub(r.duty.rub) + ', утильсбор ' + F.rub(r.util.rub) +
        ' (расчёт на ' + F.dateShort(Date.parse(r.date)) + ', курсы ЦБ на ' + F.dateShort(Date.parse(r.ratesDate)) + ')';
      return s.replace(/[  ]/g, ' ');
    },

    /** Строка параметров для адреса: только заполненные и отличные от умолчаний */
    query: function (s) {
      var q = [];
      for (var i = 0; i < ORDER.length; i++) {
        var k = ORDER[i];
        var v = s[k];
        if (v === undefined || v === null || v === '' || v === 0 || v === '0') { if (k !== 'personal') continue; }
        if (k === 'personal') { if (v === false || v === 0 || v === '0') q.push('personal=0'); continue; }
        if (k === 'markup') { if (v === true || v === 1 || v === '1') q.push('markup=1'); continue; }
        if (k === 'view') { if (v === 'vl' && s.city) q.push('view=vl'); continue; }
        if (k === 'body' && !s.city) continue;
        if (k === 'fuel' && v === 'ice') continue;
        q.push(k + '=' + encodeURIComponent(v));
      }
      return q.join('&');
    },

    /**
     * Стартовое состояние формы из параметров адреса: ссылки с карточек авто, мини-калькулятора, страниц доставки,
     * «скопировать ссылку». q — разобранные параметры, country — страна в форме сейчас, defaults — типовой автомобиль
     * каждой страны ({japan: {price, year, cc, hp, body}, …}). Возвращает null, если параметров калькулятора нет.
     *
     * Главное правило: если адрес описывает конкретный автомобиль (есть цена, тип двигателя, объём или мощность),
     * всё, чего в адресе нет, очищается. Мощность стартового примера (98 л.с.) чужому автомобилю не приписываем:
     * поле остаётся пустым, а калькулятор просит его заполнить и до этого не показывает ни итог, ни «льготный утильсбор».
     */
    start: function (q, country, defaults) {
      var s = {};
      var i;
      var any = false;
      for (i = 0; i < ORDER.length; i++) if (q[ORDER[i]] !== undefined) { s[ORDER[i]] = q[ORDER[i]]; any = true; }
      if (!any) return null;
      defaults = defaults || {};
      if (s.country !== undefined && !core.COUNTRIES[s.country]) delete s.country;
      var specific = s.price !== undefined || s.fuel !== undefined;
      for (i = 0; i < ENGINE.length; i++) if (s[ENGINE[i]] !== undefined) specific = true;

      // старые ссылки с карточек электромобилей: мощность без объёма и типа двигателя
      if (s.fuel === undefined && s.cc === undefined && s.ehp === undefined && s.e30 === undefined && F.toNum(s.hp) > 0) { s.fuel = 'ev'; s.ehp = s.hp; s.hp = 0; }

      if (specific) {
        s.fuel = core.fuelOf(s.fuel);
        if (s.fuel === 'ev' || s.fuel === 'series') {
          // мощность электромоторов могла прийти в параметре hp; объём и мощность ДВС в расчёте не участвуют
          if (s.ehp === undefined && s.e30 === undefined && F.toNum(s.hp) > 0) s.ehp = s.hp;
          s.hp = 0;
          s.cc = 0;
        } else if (s.fuel !== 'parallel') {
          s.ehp = 0;
          s.e30 = 0;
        }
        for (i = 0; i < ENGINE.length; i++) if (s[ENGINE[i]] === undefined) s[ENGINE[i]] = 0;
        if (s.month === undefined) s.month = 0;
      }

      var priceHint = s.price === undefined;
      if (priceHint && s.country && s.country !== country && defaults[s.country]) {
        // пришли без цены: подставляем типовую цену страны и просим уточнить; без параметров двигателя — типовой автомобиль целиком
        var d = defaults[s.country];
        s.price = d.price;
        if (!specific) {
          if (s.year === undefined && d.year) s.year = d.year;
          s.fuel = 'ice';
          s.cc = d.cc || 0;
          s.hp = d.hp || 0;
          s.ehp = 0;
          s.e30 = 0;
          if (s.body === undefined && d.body) s.body = d.body;
        }
      }
      return { state: s, priceHint: priceHint, specific: specific, city: !!s.city && s.city !== 'vladivostok' && s.view !== 'vl', ref: q.ref === 'car' ? 'car' : '' };
    },

    shares: shares
  };

  core.view = view;

  if (typeof document === 'undefined') return;

  // =========================================================================== браузер

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  var rulesEl = doc.getElementById('calc-rules');
  if (!rulesEl) return;
  var RULES;
  try { RULES = JSON.parse(rulesEl.textContent); } catch (err) { return; }

  // возраст считаем на сегодня (но не раньше даты ставок): со временем автомобиль переходит в следующую категорию
  var now = new Date();
  var today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  var DATE = today > RULES.date ? today : RULES.date;

  function digits(v) {
    return String(v === null || v === undefined ? '' : v).replace(/\D/g, '');
  }

  function groupDigits(d) {
    return d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * Целая часть введённого числа: «1496.0» → «1496», «98,6» → «98» — дробь отбрасываем, а не приклеиваем к целому
   * (иначе 150,5 превращается в 1505). «1.100.000» и «1,100,000» — разделители разрядов, а не дробь.
   */
  function intPart(v) {
    var s = String(v === null || v === undefined ? '' : v).replace(/[\s  ]/g, '');
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return s;
    return s.split(/[.,]/)[0];
  }

  /** Разряды в поле при вводе с сохранением положения курсора */
  function formatInt(el, max) {
    var raw = el.value;
    var pos = el.selectionStart;
    var d = digits(intPart(raw)).replace(/^0+(?=\d)/, '').slice(0, max || 12);
    var before = pos === null || pos === undefined ? -1 : Math.min(digits(raw.slice(0, pos)).length, d.length);
    var out = el.hasAttribute('data-calc-group') ? groupDigits(d) : d;
    if (out === raw) return;
    el.value = out;
    if (before < 0 || doc.activeElement !== el) return;
    var i = 0;
    var n = 0;
    while (i < out.length && n < before) { if (/\d/.test(out.charAt(i))) n++; i++; }
    try { el.setSelectionRange(i, i); } catch (err) { /* тип поля не поддерживает выделение */ }
  }

  /** Объём, введённый в литрах («1,5», «2.0»), а не в кубических сантиметрах */
  var LITERS = /^\d[.,]\d{0,2}$/;

  /** Объём двигателя в см³ из поля: литры переводим, а не склеиваем цифры (1,5 → 1500, а не 15) */
  function ccOf(value) {
    var v = String(value || '').replace(/\s/g, '');
    if (LITERS.test(v)) return Math.round(F.toNum(v) * 1000);
    return +digits(intPart(v)) || 0;
  }

  /** Поле объёма при вводе: литры не трогаем до выхода из поля, остальное приводим к целому */
  function formatCc(el, done) {
    var v = el.value.replace(/\s/g, '');
    if (LITERS.test(v)) { if (done) el.value = String(ccOf(v) || ''); return; }
    formatInt(el, 4);
  }

  /** Число с дробной частью через запятую: до четырёх знаков целой части и frac знаков дробной (по умолчанию два) */
  function formatDec(el, frac) {
    var v = el.value.replace(/[^\d.,]/g, '').replace(/\./g, ',');
    var p = v.split(',');
    v = p[0].replace(/^0+(?=\d)/, '').slice(0, 4) + (p.length > 1 ? ',' + p.slice(1).join('').slice(0, frac || 2) : '');
    if (v !== el.value) el.value = v;
  }

  /** Чужие параметры адреса (utm_*, yclid, gclid…) — их калькулятор не трогает и возвращает в адрес как были */
  function foreignQuery(search) {
    return String(search || '').replace(/^\?/, '').split('&').filter(function (pair) {
      if (!pair) return false;
      var k = pair.split('=')[0];
      try { k = decodeURIComponent(k); } catch (err) { return false; }
      return ORDER.indexOf(k) < 0 && k !== 'ref';
    }).join('&');
  }

  function radio(scope, name) {
    var el = $('input[name="' + name + '"]:checked', scope);
    return el ? el.value : '';
  }

  function setRadio(scope, name, value) {
    $$('input[name="' + name + '"]', scope).forEach(function (el) { el.checked = el.value === value; });
  }

  function setVal(scope, name, value, grouped) {
    var el = $('[name="' + name + '"]', scope);
    if (!el) return;
    var v = value === undefined || value === null || value === 0 || value === '0' ? '' : String(value);
    if (el.tagName === 'SELECT') { el.value = v || (name === 'month' ? '0' : ''); return; }
    el.value = grouped ? groupDigits(digits(v)) : v.replace('.', ',');
  }

  function parseQuery(search) {
    var out = {};
    String(search || '').replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = i < 0 ? pair : pair.slice(0, i);
      var v = i < 0 ? '' : pair.slice(i + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (err) { /* битый параметр пропускаем */ }
    });
    return out;
  }

  function setHtml(el, html) {
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  /** Сводка расчёта уходит в каждую форму заявки на странице: main.js добавит её в сообщение строкой «Расчёт: …» */
  function pushSummary(text) {
    $$('form[data-lead-form]').forEach(function (form) {
      var input = $('input[name="calc"]', form);
      if (!input) {
        input = doc.createElement('input');
        input.type = 'hidden';
        input.name = 'calc';
        form.appendChild(input);
      }
      input.value = text;
    });
  }

  // --------------------------------------------------------------------------- полный калькулятор

  $$('[data-calc]').forEach(function (rootEl) {
    var form = $('[data-calc-form]', rootEl);
    if (!form) return;
    var out = {};
    $$('[data-calc-out]', rootEl).forEach(function (el) { (out[el.dataset.calcOut] = out[el.dataset.calcOut] || []).push(el); });
    var each = function (key, fn) { (out[key] || []).forEach(fn); };
    var viewBtns = $$('[data-calc-view]', rootEl);
    var presets = $$('[data-calc-preset]', rootEl);
    var copyBtn = $('[data-calc-copy]', rootEl);
    var reqBtns = $$('[data-calc-request]', rootEl);
    var budget = $('[data-calc-budget]', rootEl);
    var dockEl = $('[data-calc-dock]', rootEl);
    var links = {};
    try { links = JSON.parse(rootEl.dataset.calcLinks || '{}'); } catch (err) { links = {}; }
    var budgets = [];
    try { budgets = JSON.parse((budget && budget.dataset.calcBudget) || '[]'); } catch (err2) { budgets = []; }
    var baseUrl = location.pathname;
    var foreign = foreignQuery(location.search);
    var refEl = $('[data-calc-ref]', rootEl);
    var ref = '';
    var mode = 'vl';
    var presetName = '';
    var country = radio(form, 'country') || 'japan';
    var priceHint = false;
    var timer = null;

    function read() {
      return {
        country: radio(form, 'country') || 'japan',
        price: +digits(form.elements.price.value) || 0,
        year: +form.elements.year.value || 0,
        month: +form.elements.month.value || 0,
        fuel: radio(form, 'fuel') || 'ice',
        cc: ccOf(form.elements.cc.value),
        hp: F.toNum(form.elements.hp.value),
        ehp: F.toNum(form.elements.ehp.value),
        e30: F.toNum(form.elements.e30.value),
        personal: form.elements.personal.checked,
        markup: form.elements.markup.checked,
        city: form.elements.city.value === 'vladivostok' ? '' : form.elements.city.value,
        body: radio(form, 'body') || 'sedan'
      };
    }

    function apply(s) {
      if (s.country && core.COUNTRIES[s.country]) { setRadio(form, 'country', s.country); country = s.country; }
      if (s.price !== undefined) setVal(form, 'price', digits(intPart(s.price)).slice(0, 11), true);
      var sel = form.elements.year;
      if (s.year !== undefined && /^(19[89]|20[0-4])\d$/.test(String(s.year)) && +s.year <= +sel.options[0].value) {
        // год вне списка (старше 2007-го) добавляем в конец — расчёт покажет предупреждение про ЭПТС; будущие годы не принимаем
        var y = String(s.year);
        if (!$('option[value="' + y + '"]', sel)) {
          var o = doc.createElement('option');
          o.value = y;
          o.textContent = y;
          sel.appendChild(o);
        }
        sel.value = y;
      }
      if (s.month !== undefined) form.elements.month.value = String(+s.month >= 1 && +s.month <= 12 ? +s.month : 0);
      if (s.fuel !== undefined) setRadio(form, 'fuel', core.fuelOf(s.fuel));
      if (s.cc !== undefined) setVal(form, 'cc', String(Math.min(ccOf(s.cc), 9999) || ''));
      if (s.hp !== undefined) setVal(form, 'hp', decStr(s.hp, 1));
      if (s.ehp !== undefined) setVal(form, 'ehp', decStr(s.ehp, 1));
      if (s.e30 !== undefined) setVal(form, 'e30', decStr(s.e30, 2));
      if (s.personal !== undefined) form.elements.personal.checked = !(s.personal === false || s.personal === '0' || s.personal === 0);
      if (s.markup !== undefined) form.elements.markup.checked = s.markup === true || s.markup === '1' || s.markup === 1;
      if (s.body !== undefined) setRadio(form, 'body', core.bodyOf(s.body));
      if (s.city !== undefined) {
        var slug = String(s.city || '').toLowerCase();
        var found = 'vladivostok';
        RULES.cities.forEach(function (c) { if (c.s === slug || c.x === slug) found = c.s; });
        form.elements.city.value = found;
      }
    }

    function render(pushUrl) {
      var s = read();
      s.date = DATE;
      var r = core.calc(s, RULES);
      if (!r.delivery.city && mode === 'city') mode = 'vl';

      // поля, зависящие от типа двигателя и страны
      $$('[data-calc-show]', rootEl).forEach(function (el) { el.hidden = (' ' + el.dataset.calcShow + ' ').indexOf(' ' + r.fuel.slug + ' ') < 0; });
      each('cur', function (el) { setText(el, r.currency.sign); });
      each('cur-name', function (el) { setText(el, r.country.slug === 'japan' ? 'в иенах' : r.country.slug === 'korea' ? 'в вонах' : 'в юанях'); });
      each('price-rub', function (el) {
        setText(el, s.price ? '≈ ' + F.rub(r.carRub) + ' по курсу ЦБ: ' + r.rates.curLabel + (priceHint ? '. Цена подставлена для примера — укажите свою.' : '') : 'Введите цену автомобиля ' + r.country.inLoc + ' — в валюте страны.');
        el.classList.toggle('is-accent', priceHint || !s.price);
      });
      each('ehp-label', function (el) { setText(el, r.fuel.slug === 'parallel' ? 'Мощность электромотора, пиковая' : 'Мощность электромоторов, пиковая'); });
      var e30El = form.elements.e30;
      if (e30El) e30El.placeholder = s.ehp ? '≈ ' + F.num(s.ehp * RULES.util.hpToKw * RULES.util.peakTo30, 2) + ' — оценка' : 'если известна';

      // результат
      each('total', function (el) { setText(el, view.total(r, mode)); });
      each('caption', function (el) { setText(el, view.caption(r, mode)); });
      each('legend', function (el) { setHtml(el, view.legend(r, mode)); });
      each('breakdown', function (el) { setHtml(el, view.breakdown(r, mode)); });
      each('status', function (el) { setHtml(el, view.status(r)); });
      each('warn-age', function (el) { setHtml(el, view.warnings(r, 'age')); });
      each('warn-engine', function (el) { setHtml(el, view.warnings(r, 'engine')); });
      each('warn-price', function (el) { setHtml(el, view.warnings(r, 'price')); });
      each('insights', function (el) {
        var html = view.insights(r, links);
        setHtml(el, html);
        var box = el.closest('[data-calc-insights]');
        if (box) box.hidden = !html;
      });
      each('age-line', function (el) { setHtml(el, view.ageLine(r)); });
      each('power-line', function (el) {
        setHtml(el, view.powerLine(r));
        el.classList.toggle('is-need', r.missing.indexOf('hp') >= 0 || r.missing.indexOf('ehp') >= 0 || r.util.noMotor);
      });
      each('date', function (el) { setText(el, r.dateLabel); });
      rootEl.classList.toggle('is-empty', !r.ok);
      // незаполненные поля, без которых расчёта нет (например, мощность не пришла с карточки авто)
      ['price', 'cc', 'hp', 'ehp'].forEach(function (name) {
        var box = form.elements[name] && form.elements[name].closest('.calc-field');
        if (box) box.classList.toggle('is-need', r.missing.indexOf(name) >= 0 || (name === 'ehp' && r.util.noMotor));
      });
      if (refEl) refEl.hidden = !ref;

      // переключатель «во Владивостоке / с доставкой»
      viewBtns.forEach(function (b) {
        var on = b.dataset.calcView === mode;
        b.setAttribute('aria-pressed', String(on));
        if (b.dataset.calcView === 'city') setText($('span', b) || b, r.delivery.city ? 'С доставкой в ' + r.delivery.acc : 'С доставкой в город');
      });

      // ссылки и заявка
      var q = view.query({ country: s.country, price: s.price, year: s.year, month: s.month, fuel: s.fuel, cc: r.input.cc, hp: r.input.hp, ehp: r.input.ehp, e30: r.input.e30, city: r.delivery.city, body: s.body, personal: s.personal, markup: s.markup, view: mode });
      var url = baseUrl + (q ? '?' + q : '');
      if (pushUrl) {
        // в адресе остаются чужие параметры (рекламные метки) и якорь; в ссылку «скопировать» они не попадают
        var all = [q, ref ? 'ref=' + ref : '', foreign].filter(Boolean).join('&');
        var next = baseUrl + (all ? '?' + all : '') + location.hash;
        if (next !== location.pathname + location.search + location.hash) {
          try { history.replaceState(history.state, '', next); } catch (err) { /* file:// и встроенные браузеры */ }
        }
      }
      if (copyBtn) copyBtn.dataset.copy = location.origin && location.origin !== 'null' ? location.origin + url : location.href.split(/[?#]/)[0] + (q ? '?' + q : '');
      var summary = r.ok ? view.summary(r, mode, presetName) : '';
      pushSummary(summary);
      reqBtns.forEach(function (b) { b.dataset.modalCar = presetName ? presetName + ' ' + s.year : ''; });
      if (budget && budgets.length && r.ok) {
        var t = total(r, mode);
        var pick = budgets[budgets.length - 1];
        for (var i = 0; i < budgets.length; i++) if (budgets[i].max === null || t <= budgets[i].max) { pick = budgets[i]; break; }
        budget.href = pick.url;
        setText($('span', budget) || budget, pick.text);
      }
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function () { render(true); }, 220);
    }

    function unpreset() {
      presetName = '';
      presets.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    }

    // --- события ---

    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.name === 'price') { formatInt(el, 11); priceHint = false; }
      if (el.name === 'cc') formatCc(el, false);
      if (el.name === 'hp' || el.name === 'ehp') formatDec(el, 1);
      if (el.name === 'e30') formatDec(el, 2);
      if (/^(price|cc|hp|ehp|e30)$/.test(el.name)) { unpreset(); render(false); schedule(); }
    });

    form.addEventListener('change', function (e) {
      var el = e.target;
      if (el.name === 'cc') formatCc(el, true);
      if (el.name === 'country') {
        // тот же бюджет в валюте новой страны
        var p = +digits(form.elements.price.value) || 0;
        if (p) setVal(form, 'price', core.convertPrice(p, country, el.value, RULES), true);
        country = el.value;
        unpreset();
        ref = ''; // другая страна — уже не автомобиль из карточки
      }
      if (el.name === 'city') mode = el.value && el.value !== 'vladivostok' ? 'city' : 'vl';
      if (el.name === 'fuel' && (el.value === 'ev' || el.value === 'series') && !form.elements.ehp.value && form.elements.hp.value) {
        // переключили на электромобиль: чтобы расчёт не обнулялся, берём введённую мощность как пиковую мощность моторов
        form.elements.ehp.value = form.elements.hp.value;
      }
      if (/^(year|month|fuel)$/.test(el.name)) unpreset();
      render(true);
    });

    form.addEventListener('submit', function (e) { e.preventDefault(); });

    viewBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.calcView === 'city' && (!form.elements.city.value || form.elements.city.value === 'vladivostok')) {
          form.elements.city.focus();
          var card = form.elements.city.closest('.calc-card');
          if (card && card.scrollIntoView) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
          if (window.mgToast) window.mgToast('Выберите город доставки');
          return;
        }
        mode = b.dataset.calcView;
        render(true);
      });
    });

    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var p;
        try { p = JSON.parse(b.dataset.calcPreset); } catch (err) { return; }
        apply({ country: p.country, price: p.price, year: p.year, month: p.month || 0, fuel: p.fuel || 'ice', cc: p.cc || 0, hp: p.hp || 0, ehp: p.ehp || 0, e30: p.e30 || 0, body: p.body || 'sedan' });
        priceHint = false;
        ref = '';
        unpreset();
        presetName = p.name || '';
        b.setAttribute('aria-pressed', 'true');
        render(true);
      });
    });

    // закреплённая плашка с итогом на мобильных: видна, пока калькулятор на экране, а блок результата — нет
    if (dockEl && 'IntersectionObserver' in window) {
      var inCalc = false;
      var inResult = false;
      var sync = function () { dockEl.classList.toggle('is-visible', inCalc && !inResult); };
      new IntersectionObserver(function (en) { inCalc = en[en.length - 1].isIntersecting; sync(); }, { rootMargin: '-80px 0px -25% 0px' }).observe(form);
      var resEl = $('[data-calc-result]', rootEl);
      if (resEl) new IntersectionObserver(function (en) { inResult = en[en.length - 1].isIntersecting; sync(); }, { rootMargin: '0px 0px -120px 0px' }).observe(resEl);
    }

    // пока калькулятор на экране, общая нижняя пилюля сайта не перекрывает панель итога
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { doc.body.classList.toggle('calc-in-view', en[en.length - 1].isIntersecting); }, { rootMargin: '0px 0px -96px 0px' }).observe($('.calc__grid', rootEl) || rootEl);
    }

    // --- старт: параметры из адреса (в том числе с карточек авто: country, cc, hp, year) ---

    var def = {};
    try { def = JSON.parse(rootEl.dataset.calcDefaults || '{}'); } catch (err3) { def = {}; }
    var st = view.start(parseQuery(location.search), country, def);
    if (st) {
      apply(st.state);
      priceHint = st.priceHint;
      if (st.city) mode = 'city';
      ref = st.ref;
      unpreset();
    }
    render(false);
    rootEl.classList.add('is-live');
  });

  // --------------------------------------------------------------------------- мини-калькулятор

  $$('[data-calc-mini]').forEach(function (rootEl) {
    var form = $('form', rootEl);
    if (!form) return;
    var more = $$('[data-calc-more]', rootEl);
    var baseUrl = rootEl.dataset.calcUrl || '';
    var country = (form.elements.country && form.elements.country.value) || 'japan';

    function render() {
      var c = (form.elements.country && form.elements.country.value) || 'japan';
      var s = { country: c, price: +digits(form.elements.price.value) || 0, year: +form.elements.year.value || 0, fuel: 'ice', cc: ccOf(form.elements.cc.value), hp: F.toNum(form.elements.hp.value), date: DATE };
      var r = core.calc(s, RULES);
      // сводка расчёта для заявки «Точный расчёт от менеджера» (см. обработчик клика ниже)
      rootEl.__calcSummary = r.ok ? view.summary(r, 'vl', '') : '';
      $$('[data-calc-out]', rootEl).forEach(function (el) {
        var k = el.dataset.calcOut;
        if (k === 'total') setText(el, r.ok ? '≈ ' + view.total(r, 'vl') : '—');
        if (k === 'legend') setHtml(el, view.legend(r, 'vl'));
        if (k === 'cur') setText(el, r.currency.sign);
        if (k === 'cur-name') setText(el, r.country.slug === 'japan' ? 'в иенах' : r.country.slug === 'korea' ? 'в вонах' : 'в юанях');
        if (k === 'price-rub') setText(el, s.price ? '≈ ' + F.rub(r.carRub) + ' по курсу ЦБ' : 'в валюте страны');
        if (k === 'note') {
          var w = '';
          for (var i = 0; i < r.warnings.length; i++) if (r.warnings[i].level === 'warn') { w = r.warnings[i].code === 'age-month' ? 'Год пограничный: в подробном расчёте укажите месяц выпуска.' : /^(jp|kr)-/.test(r.warnings[i].code) ? 'На такой двигатель действует экспортное ограничение — расчёт с надбавкой.' : ''; if (w) break; }
          if (!r.ok) w = '';
          setText(el, w || (r.ok ? r.age.name + (r.age.cat === '3to5' ? ', проходной' : '') + ' · ' + (r.util.pref ? 'льготный утильсбор ' + F.rub(r.util.rub) : 'утильсбор ' + F.rub(r.util.rub)) : view.need(r)));
          el.classList.toggle('is-warn', !!w);
        }
      });
      var q = view.query({ country: c, price: s.price, year: s.year, cc: s.cc, hp: s.hp });
      more.forEach(function (a) { a.href = baseUrl + (q ? '?' + q : ''); });
    }

    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.name === 'price') formatInt(el, 11);
      if (el.name === 'cc') formatCc(el, false);
      if (el.name === 'hp') formatDec(el, 1);
      render();
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'cc') formatCc(e.target, true);
      if (e.target.name === 'country') {
        var p = +digits(form.elements.price.value) || 0;
        if (p) form.elements.price.value = groupDigits(String(core.convertPrice(p, country, e.target.value, RULES)));
        country = e.target.value;
      }
      render();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (more[0]) location.href = more[0].href;
    });
    render();
  });

  // Заявка из мини-калькулятора уходит со сводкой расчёта (как в полном калькуляторе). Слушаем в фазе перехвата, чтобы
  // успеть до открытия модального окна; заявка, открытая любой другой кнопкой страницы, сводку не получает.
  if ($('[data-calc-mini]') && !$('[data-calc]')) {
    doc.addEventListener('click', function (e) {
      var trigger = e.target && e.target.closest ? e.target.closest('[data-modal]') : null;
      if (!trigger) return;
      var mini = trigger.closest('[data-calc-mini]');
      var text = (mini && mini.__calcSummary) || '';
      $$('dialog form[data-lead-form]').forEach(function (f) {
        var input = $('input[name="calc"]', f);
        if (!input && text) {
          input = doc.createElement('input');
          input.type = 'hidden';
          input.name = 'calc';
          f.appendChild(input);
        }
        if (input) input.value = text;
      });
    }, true);
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
