/* Каталог: фильтры, сортировка и «показать еще» поверх карточек, уже отрисованных в HTML */
(function () {
  'use strict';

  var grid = document.querySelector('[data-cars]');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.car'));
  var extras = Array.prototype.slice.call(grid.querySelectorAll('[data-grid-extra]'));
  var bar = document.querySelector('[data-filters]');
  var row = bar ? bar.querySelector('.filters__row') : null;
  var selects = bar ? Array.prototype.slice.call(bar.querySelectorAll('[data-filter]')) : [];
  var sortSel = bar ? bar.querySelector('[data-sort]') : null;
  var resetBtn = bar ? bar.querySelector('[data-filters-reset]') : null;
  var countEl = document.querySelector('[data-results-count]');
  var moreBtn = document.querySelector('[data-cars-more]');
  var emptyEl = document.querySelector('[data-cars-empty]');
  var pageSize = parseInt(grid.dataset.pageSize || '24', 10);
  var shown = pageSize;
  var total = cards.length;

  var NUMERIC = {
    'price-max': function (c, v) { return +c.dataset.price <= v; },
    'price-min': function (c, v) { return +c.dataset.price >= v; },
    'year-min': function (c, v) { return +c.dataset.year >= v; },
    'year-max': function (c, v) { return +c.dataset.year <= v; },
    'mileage-max': function (c, v) { return c.dataset.mileage !== undefined && +c.dataset.mileage <= v; },
    // 160 — порог льготного утильсбора: гибриды и авто со спорной мощностью в него не попадают (data-low ставит шаблон)
    'hp-max': function (c, v) { return v === 160 ? c.dataset.low === '1' : c.dataset.hp !== undefined && +c.dataset.hp <= v; },
  };

  function plural(n, f) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return f[0];
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return f[1];
    return f[2];
  }

  /* Проходит ли карточка фильтры. oKey/oVal — «что будет, если в фильтре oKey выбрать oVal»: так считаются доступные варианты. */
  function matches(card, oKey, oVal) {
    for (var i = 0; i < selects.length; i++) {
      var s = selects[i];
      var key = s.dataset.filter;
      var v = key === oKey ? oVal : s.value;
      if (!v) continue;
      if (NUMERIC[key]) { if (!NUMERIC[key](card, +v)) return false; }
      else if ((card.dataset[key] || '') !== v) return false;
    }
    return true;
  }

  /* Фильтры зависят друг от друга: вариант, который с остальными выбранными фильтрами дает пустой список, скрывается,
     а число после « · » показывает, сколько автомобилей останется. */
  function refreshOptions() {
    selects.forEach(function (s) {
      var key = s.dataset.filter;
      Array.prototype.forEach.call(s.options, function (o) {
        if (!o.value) return;
        var n = 0;
        for (var i = 0; i < cards.length; i++) if (matches(cards[i], key, o.value)) n++;
        var off = n === 0 && !o.selected;
        o.disabled = off;
        o.hidden = off;
        if (o.dataset.label === undefined) {
          var m = o.textContent.match(/^(.*) · \d+$/);
          o.dataset.label = m ? m[1] : '';
        }
        if (o.dataset.label) o.textContent = o.dataset.label + ' · ' + n;
      });
    });
  }

  var SORTS = {
    'price-asc': function (a, b) { return (+a.dataset.price || 1e12) - (+b.dataset.price || 1e12); },
    'price-desc': function (a, b) { return (+b.dataset.price || 0) - (+a.dataset.price || 0); },
    'year-desc': function (a, b) { return (+b.dataset.year || 0) - (+a.dataset.year || 0); },
    'mileage-asc': function (a, b) { return (+a.dataset.mileage || 1e9) - (+b.dataset.mileage || 1e9); },
  };

  var original = cards.slice();
  var lastOrder = original;
  var lastActive = 0;
  var lastCols = 0;

  function gridCols() {
    var t = getComputedStyle(grid).gridTemplateColumns;
    return t && t !== 'none' ? t.split(' ').length : 1;
  }

  /* Плитка-заявка — только в нефильтрованном списке. Если в последнем ряду свободна ровно одна ячейка (или колонка одна),
     плитка стоит после 7-й карточки и закрывает ее; иначе встает последней и занимает остаток ряда — пустых ячеек нет.
     На телефоне (две узкие колонки) плитка всегда во всю ширину — после шестой карточки. */
  var phone = window.matchMedia ? window.matchMedia('(max-width: 600px)') : null;

  function placeExtras() {
    var vis = lastOrder.filter(function (c) { return !c.hidden; });
    var cols = gridCols();
    lastCols = cols;
    extras.forEach(function (ex) {
      ex.hidden = lastActive > 0 || !vis.length;
      ex.classList.remove('promo-tile--row', 'promo-tile--wide');
      ex.style.gridColumn = '';
      if (ex.hidden) return;
      var rem = vis.length % cols;
      if (phone && phone.matches && cols > 1) {
        var after = vis[Math.min(5, vis.length - 1)];
        if (after.nextSibling) grid.insertBefore(ex, after.nextSibling);
        else grid.appendChild(ex);
        ex.style.gridColumn = '1 / -1';
      } else if (cols === 1 || rem === cols - 1) {
        var anchor = vis[Math.min(6, vis.length - 1)];
        if (anchor.nextSibling) grid.insertBefore(ex, anchor.nextSibling);
        else grid.appendChild(ex);
      } else {
        grid.appendChild(ex);
        var need = cols - rem;
        ex.style.gridColumn = need === cols ? '1 / -1' : 'span ' + need;
        if (need === cols) ex.classList.add('promo-tile--row');
        else if (need > 1) ex.classList.add('promo-tile--wide');
      }
    });
  }

  function apply(resetShown) {
    if (resetShown) shown = pageSize;
    var order = sortSel && SORTS[sortSel.value] ? cards.slice().sort(SORTS[sortSel.value]) : original.slice();
    var active = 0;
    selects.forEach(function (s) {
      var on = Boolean(s.value);
      if (on) active++;
      s.closest('.filter').classList.toggle('is-active', on);
    });
    var visible = 0;
    var matched = 0;
    order.forEach(function (card) {
      var ok = matches(card);
      if (ok) matched++;
      var show = ok && matched <= shown;
      card.hidden = !show;
      if (show) { visible++; card.classList.add('is-in'); }
      grid.appendChild(card);
    });
    lastOrder = order;
    lastActive = active;
    // на телефоне две колонки нужны, когда карточек хотя бы две: единственная идет во всю ширину
    grid.classList.toggle('cars-grid--duo', visible > 1);
    placeExtras();
    refreshOptions();
    if (countEl) {
      countEl.innerHTML = matched + ' ' + plural(matched, ['автомобиль', 'автомобиля', 'автомобилей']) + (active ? '<small>из ' + total + ' в разделе</small>' : '');
    }
    if (moreBtn) {
      var rest = matched - visible;
      moreBtn.parentNode.hidden = rest <= 0;
      moreBtn.querySelector('span').textContent = 'Показать еще ' + Math.min(rest, pageSize);
    }
    if (emptyEl) emptyEl.hidden = matched > 0;
    if (resetBtn) resetBtn.hidden = active === 0;
    syncUrl();
  }

  /* Адрес: меняем только свои параметры — рекламные метки (utm_*, yclid, gclid) и все чужое остается на месте. */
  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams(location.search);
    selects.forEach(function (s) {
      params.delete(s.dataset.filter);
      if (s.value) params.set(s.dataset.filter, s.value);
    });
    params.delete('sort');
    if (sortSel && sortSel.value) params.set('sort', sortSel.value);
    var q = params.toString();
    var cur = new URLSearchParams(location.search).toString();
    if (q !== cur) history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  function readUrl() {
    var params = new URLSearchParams(location.search);
    selects.forEach(function (s) {
      var v = params.get(s.dataset.filter);
      if (v !== null && Array.prototype.some.call(s.options, function (o) { return o.value === v; })) s.value = v;
    });
    if (sortSel && params.get('sort') && SORTS[params.get('sort')]) sortSel.value = params.get('sort');
  }

  /* Панель фильтров закреплена, поэтому фильтр меняют, уже прокрутив список. После выбора возвращаем к началу результатов,
     иначе человек остается ниже сократившегося списка и не видит ни карточек, ни пустого состояния. */
  function toResults() {
    var head = document.querySelector('.results-head') || grid;
    var top = head.getBoundingClientRect().top;
    var pad = (bar ? bar.offsetHeight : 0) + 88;
    if (top < 0 || top > window.innerHeight * 0.6) {
      var y = window.pageYOffset + top - pad;
      // без плавной прокрутки: путь бывает в несколько экранов
      try { window.scrollTo({ top: y, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
    }
    // на телефоне выбранные фильтры и «Сбросить» встают в начало ленты — показываем ее с начала
    if (row && row.scrollWidth > row.clientWidth) row.scrollLeft = 0;
  }

  function changed() {
    apply(true);
    toResults();
  }

  function resetAll() {
    selects.forEach(function (s) { s.value = ''; });
    changed();
  }

  selects.forEach(function (s) { s.addEventListener('change', changed); });
  if (sortSel) sortSel.addEventListener('change', changed);
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-filters-reset-all]')) resetAll();
  });
  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      shown += pageSize;
      apply(false);
    });
  }

  // при смене числа колонок (поворот экрана, изменение окна) плитка-заявка переставляется
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (gridCols() !== lastCols) placeExtras(); }, 150);
  });

  // тень у закрепленной панели фильтров
  if (bar && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;margin-bottom:-1px';
    bar.parentNode.insertBefore(sentinel, bar);
    new IntersectionObserver(function (en) {
      bar.classList.toggle('is-stuck', !en[0].isIntersecting && en[0].boundingClientRect.top < 100);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(sentinel);
  }

  // с этого момента место и ширину плитки-заявки задает скрипт (см. .cars-grid:not([data-ready]) в 50-catalog.css)
  grid.setAttribute('data-ready', '');
  readUrl();
  apply(true);
})();
