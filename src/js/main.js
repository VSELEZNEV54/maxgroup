/* Макс Групп — общий фронтенд-скрипт (без зависимостей) */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SITE = window.__SITE__ || {};

  /* ---------------------------------------------------------------------- шапка */

  var header = $('[data-header]');
  var drawer = $('[data-drawer]');
  var dock = $('[data-dock]');
  var lastY = window.scrollY;
  var ticking = false;
  var formsInView = 0;

  // плавающая «пилюля» не должна перекрывать формы, квиз и мини-калькулятор: пока они на экране — прячем.
  // То же для панели покупки на карточке авто (.buybar): она не дублирует кнопки блока покупки и форму заявки.
  var buybar = $('.buybar');
  var HIDE_NEAR = 'main [data-lead-form], main [data-dock-hide], main [data-calc-mini], main .buybox__actions';
  if ((dock || buybar) && 'IntersectionObserver' in window) {
    var hideTargets = $$(HIDE_NEAR);
    var formIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.__inView = en.isIntersecting;
      });
      formsInView = hideTargets.filter(function (f) { return f.__inView; }).length;
      onScroll();
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    hideTargets.forEach(function (f) { formIo.observe(f); });
  }

  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-stuck', y > 24);
      var goingDown = y > lastY && y > 480;
      if (Math.abs(y - lastY) > 6) header.classList.toggle('is-hidden', goingDown && !header.classList.contains('is-open'));
    }
    var nearBottom = window.innerHeight + y > doc.documentElement.scrollHeight - 220;
    if (dock) dock.classList.toggle('is-visible', y > window.innerHeight * 0.55 && !nearBottom && formsInView === 0);
    if (buybar) buybar.classList.toggle('is-hidden', nearBottom || formsInView > 0);
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* мега-меню: наведение с задержкой + клик + клавиатура */
  var megaItems = $$('[data-mega]');
  var megaTimer = null;

  function closeMega(except) {
    megaItems.forEach(function (it) {
      if (it === except) return;
      it.classList.remove('is-open');
      var link = $('.nav__link', it);
      if (link) link.setAttribute('aria-expanded', 'false');
    });
  }

  function openMega(item) {
    closeMega(item);
    item.classList.add('is-open');
    var link = $('.nav__link', item);
    if (link) link.setAttribute('aria-expanded', 'true');
  }

  megaItems.forEach(function (item) {
    var link = $('.nav__link', item);
    item.addEventListener('mouseenter', function () {
      clearTimeout(megaTimer);
      megaTimer = setTimeout(function () { openMega(item); }, 90);
    });
    item.addEventListener('mouseleave', function () {
      clearTimeout(megaTimer);
      megaTimer = setTimeout(function () { closeMega(); }, 180);
    });
    if (link) {
      link.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          openMega(item);
          var first = $('.mega a', item);
          if (first) first.focus();
        }
      });
      // тач-устройства: первый тап открывает меню, второй — переходит по ссылке
      link.addEventListener('touchend', function (e) {
        if (!item.classList.contains('is-open')) { e.preventDefault(); openMega(item); }
      });
    }
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) closeMega();
    });
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    // фокус из закрытого меню возвращается на его пункт, из шторки — на кнопку, которой её открыли
    var openItem = megaItems.filter(function (it) { return it.classList.contains('is-open') && it.contains(doc.activeElement); })[0];
    if (openItem) { var link = $('.nav__link', openItem); if (link) link.focus(); }
    closeMega();
    if (drawer && drawer.classList.contains('is-open')) toggleDrawer(false, true);
  });

  doc.addEventListener('click', function (e) {
    if (!e.target.closest('[data-mega]')) closeMega();
  });

  /* мобильная шторка */
  var drawerOpener = null;
  var behindDrawer = $$('main, .footer');

  function toggleDrawer(open, returnFocus) {
    if (!drawer || !header) return;
    var isOpen = drawer.classList.contains('is-open');
    var willOpen = typeof open === 'boolean' ? open : !isOpen;
    if (willOpen === isOpen) return;
    drawer.classList.toggle('is-open', willOpen);
    drawer.setAttribute('aria-hidden', String(!willOpen));
    header.classList.toggle('is-open', willOpen);
    header.classList.remove('is-hidden');
    body.classList.toggle('is-locked', willOpen);
    // пока меню открыто, содержимое под ним скрыто от скринридера (от клавиатуры — ловушка фокуса ниже)
    behindDrawer.forEach(function (el) {
      if (willOpen) el.setAttribute('aria-hidden', 'true');
      else el.removeAttribute('aria-hidden');
    });
    $$('[data-burger]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(willOpen));
      if (b.classList.contains('burger')) b.setAttribute('aria-label', willOpen ? 'Закрыть меню' : 'Открыть меню');
    });
    if (willOpen) {
      drawer.scrollTop = 0;
      $$('details[open]', drawer).forEach(function (d) { d.open = false; });
      // открыли кнопкой из нижней «пилюли» — она стоит в разметке после меню, поэтому фокус переносим в меню
      if (drawerOpener && !header.contains(drawerOpener)) {
        var first = $('summary, a', drawer);
        if (first) first.focus({ preventScroll: true });
      }
    } else {
      if (returnFocus && drawerOpener && doc.contains(drawerOpener)) drawerOpener.focus({ preventScroll: true });
      drawerOpener = null;
    }
  }

  $$('[data-burger]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!drawer || !drawer.classList.contains('is-open')) drawerOpener = b;
      toggleDrawer();
    });
  });

  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) toggleDrawer(false);
    });

    // Открытое меню: Tab ходит по кругу «шапка → меню → пилюля» и не уходит в контент под шторкой
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      var sel = 'a[href], button:not([disabled]), summary, input, select, textarea';
      var zones = [header, drawer];
      if (dock && dock.classList.contains('is-visible')) zones.push(dock);
      var items = [];
      zones.forEach(function (z) {
        $$(sel, z).forEach(function (el) {
          if (el.tabIndex < 0 || !el.getClientRects().length) return;
          // ссылки внутри свёрнутого раздела недоступны; сам заголовок раздела (summary) — доступен
          var closed = el.closest('details:not([open])');
          if (closed && !(el.tagName === 'SUMMARY' && el.parentNode === closed)) return;
          items.push(el);
        });
      });
      if (!items.length) return;
      var i = items.indexOf(doc.activeElement);
      var next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
    });
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 1100) toggleDrawer(false);
  });

  /* футер: на телефоне колонки ссылок раскрываются по нажатию (кнопки видны только на ≤720px) */
  $$('[data-footer-toggle]').forEach(function (btn) {
    var col = btn.closest('[data-footer-col]');
    if (!col) return;
    btn.addEventListener('click', function () {
      var open = col.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------------------------------------------------------------------- заголовки по словам */

  if (!reduceMotion) {
    $$('[data-split]').forEach(function (el) {
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      var n = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var parts = child.textContent.split(/([ \t\n\r]+)/); // неразрывный пробел не делит слова
            var frag = doc.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
              var span = doc.createElement('span');
              span.className = 'w';
              span.setAttribute('aria-hidden', 'true');
              span.style.setProperty('--w', n++);
              span.textContent = part;
              frag.appendChild(span);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            walk(child);
          }
        });
      })(el);
    });
  }

  /* ---------------------------------------------------------------------- появление при скролле */

  var revealEls = $$('[data-reveal], [data-split]');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      revealEls.forEach(function (el) { io.observe(el); });
      // перед печатью и сохранением в PDF показываем всё, что ещё не «проявилось»
      window.addEventListener('beforeprint', function () {
        revealEls.forEach(function (el) { el.classList.add('is-in'); });
      });
      // страховка: если наблюдатель не сработал (печать, скрытая вкладка) — показать всё
      window.addEventListener('load', function () {
        setTimeout(function () {
          revealEls.forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
          });
        }, 1200);
      });
    }
  }

  /* ---------------------------------------------------------------------- видео первого экрана */

  $$('[data-hero-video]').forEach(function (wrap) {
    var video = $('video', wrap);
    var btn = $('[data-video-toggle]', wrap.closest('section') || doc);
    if (!video) return;
    var userPaused = false;

    function setState(playing) {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(!playing));
      btn.setAttribute('aria-label', playing ? 'Поставить видео на паузу' : 'Включить видео');
      btn.classList.toggle('is-paused', !playing);
    }

    function play() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { setState(false); });
    }

    // состояние кнопки и показ ролика поверх постера — и при автозапуске, и при ручном включении
    video.addEventListener('playing', function () { wrap.classList.add('is-playing'); setState(true); });
    video.addEventListener('pause', function () { setState(false); });

    // экономим трафик: на мобильных — облегчённый файл
    var src = window.innerWidth < 760 && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (src && !reduceMotion && !saveData) {
      video.src = src;
      video.load();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { if (!userPaused) play(); } else video.pause();
          });
        }, { threshold: 0.15 }).observe(wrap);
      } else {
        play();
      }
    } else {
      setState(false);
      if (btn && (reduceMotion || saveData)) {
        btn.addEventListener('click', function once() {
          if (!video.src && src) { video.src = src; video.load(); }
        }, { once: true });
      }
    }

    if (btn) {
      btn.addEventListener('click', function () {
        if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
      });
    }
  });

  /* ---------------------------------------------------------------------- табы */

  var tabUid = 0;
  $$('[data-tabs]').forEach(function (group) {
    var btns = $$('[data-tab]', group);
    var scope = group.closest('[data-tabs-scope]') || group.parentNode;
    var panels = $$('[data-tab-panel]', scope);
    // связи «вкладка ↔ панель» для скринридеров (id выдаём здесь, если их нет в разметке)
    btns.forEach(function (b, i) {
      var panel = panels.filter(function (p) { return p.dataset.tabPanel === b.dataset.tab; })[0];
      if (!panel) return;
      if (!b.id) b.id = 'tab-' + (++tabUid);
      if (!panel.id) panel.id = b.id + '-panel';
      b.setAttribute('aria-controls', panel.id);
      if (!panel.getAttribute('role')) panel.setAttribute('role', 'tabpanel');
      if (!panel.getAttribute('aria-labelledby')) panel.setAttribute('aria-labelledby', b.id);
    });
    function select(name, focus) {
      btns.forEach(function (b) {
        var on = b.dataset.tab === name;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      panels.forEach(function (p) { p.hidden = p.dataset.tabPanel !== name; });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b.dataset.tab); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var next = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
        select(next.dataset.tab, true);
      });
    });
  });

  /* ---------------------------------------------------------------------- горизонтальные ленты */

  $$('[data-rail]').forEach(function (rail) {
    var track = $('[data-rail-track]', rail);
    var scope = rail.closest('section') || rail;
    var prev = $('[data-rail-prev]', scope);
    var next = $('[data-rail-next]', scope);
    if (!track) return;
    function step() {
      var first = track.firstElementChild;
      if (!first) return track.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      return first.getBoundingClientRect().width + gap;
    }
    function update() {
      if (prev) prev.disabled = track.scrollLeft < 8;
      if (next) next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------------------------------------------------------------------- SEO-текст и отзывы: развернуть */

  $$('[data-seo-text]').forEach(function (box) {
    var btn = $('[data-seo-toggle]', box);
    var inner = $('.seo-text__inner', box);
    if (!btn || !inner) return;
    if (inner.scrollHeight <= inner.clientHeight + 40) { box.classList.add('is-open'); btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      var open = box.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      $('span', btn).textContent = open ? 'Свернуть' : 'Читать полностью';
      // после сворачивания длинного текста блок не должен остаться выше экрана
      if (!open && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: 'start' });
    });
  });

  $$('[data-review]').forEach(function (card) {
    var text = $('.review__text', card);
    var btn = $('[data-review-more]', card);
    if (!text || !btn) return;
    if (text.scrollHeight <= text.clientHeight + 4) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      var clamped = text.classList.toggle('is-clamped');
      btn.textContent = clamped ? 'Читать полностью' : 'Свернуть';
      btn.setAttribute('aria-expanded', String(!clamped));
    });
  });

  /* таблицы, которые листаются по горизонтали, доступны с клавиатуры */
  var tableWraps = $$('.table-wrap');
  function markTables() {
    tableWraps.forEach(function (w) {
      var scrollable = w.scrollWidth > w.clientWidth + 1;
      if (scrollable === (w.getAttribute('tabindex') === '0')) return;
      if (scrollable) {
        w.setAttribute('tabindex', '0');
        w.setAttribute('role', 'region');
        if (!w.getAttribute('aria-label')) w.setAttribute('aria-label', 'Таблица: листается по горизонтали');
      } else {
        w.removeAttribute('tabindex');
        w.removeAttribute('role');
      }
    });
  }
  if (tableWraps.length) {
    markTables();
    window.addEventListener('load', markTables);
    window.addEventListener('resize', markTables);
  }

  /* аккордеоны одной группы: открыт только один */
  $$('[data-acc-group]').forEach(function (group) {
    var items = $$('details', group);
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        items.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });

  /* ---------------------------------------------------------------------- модальные окна */

  function openModal(id, trigger) {
    var dlg = doc.getElementById('modal-' + id);
    if (!dlg || typeof dlg.showModal !== 'function') return false;
    if (trigger) {
      var ds = trigger.dataset;
      var subject = ds.modalSubject;
      if (subject) {
        var subj = $('input[name="subject"]', dlg);
        if (subj) subj.value = subject;
      }
      var t = $('[data-modal-title]', dlg);
      var x = $('[data-modal-text]', dlg);
      var l = $('[data-modal-label]', dlg);
      if (t) { if (!t.dataset.def) t.dataset.def = t.textContent; t.textContent = ds.modalTitle || t.dataset.def; }
      if (x) { if (!x.dataset.def) x.dataset.def = x.textContent; x.textContent = ds.modalText || x.dataset.def; }
      if (l) { if (!l.dataset.def) l.dataset.def = l.textContent; l.textContent = ds.modalLabel || l.dataset.def; }
      // поле «Какой автомобиль»: подставляем авто с кнопки, но не стираем то, что посетитель ввёл сам
      var car = $('input[name="car"]', dlg);
      if (car) {
        if (ds.modalCar) car.value = ds.modalCar;
        else if (car.dataset.auto && car.dataset.auto === car.value) car.value = '';
        car.dataset.auto = ds.modalCar || '';
      }
      // сводка калькулятора уходит в заявку, только если её открыли из калькулятора (на его странице — всегда)
      var calc = $('input[name="calc"]', dlg);
      if (calc && !trigger.closest('[data-calc], [data-calc-mini]') && !$('[data-calc]')) calc.value = '';
      var form = $('form', dlg);
      if (form) form.classList.remove('is-sent');
    }
    toggleDrawer(false);
    dlg.showModal();
    return true;
  }

  // подложка: закрываем, только если и нажали, и отпустили на ней (протяжка выделения из поля за край окна не закрывает)
  var downOnBackdrop = false;
  doc.addEventListener('pointerdown', function (e) {
    downOnBackdrop = e.target.tagName === 'DIALOG';
  });

  doc.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-modal]');
    if (trigger) {
      if (openModal(trigger.dataset.modal, trigger)) e.preventDefault();
      return;
    }
    var close = e.target.closest('[data-modal-close]');
    if (close) { var d = close.closest('dialog'); if (d) d.close(); return; }
    // клик по подложке
    if (e.target.tagName === 'DIALOG' && e.target.open && downOnBackdrop) {
      var r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
    }
  });

  /* ---------------------------------------------------------------------- формы заявок */

  /* Маска телефона: +7 (XXX) XXX-XX-XX.
     Скобка закрывается, только когда введена следующая цифра, — иначе Backspace «упирался» в неё и код оператора
     нельзя было стереть. Каретка после правки в середине остаётся на своей цифре, а не прыгает в конец. */

  // Цифры номера с кодом страны. shift — на сколько цифр номер сдвинулся относительно введённого:
  // +1 — код страны подставлен, −1 — убран лишний (нужно, чтобы вернуть каретку на свою цифру).
  function phoneParts(value, bulk) {
    var d = String(value).replace(/\D/g, '');
    var shift = 0;
    if (!d) return { d: '', shift: 0 };
    if (d[0] === '8') d = '7' + d.slice(1);
    else if (d[0] !== '7') { d = '7' + d; shift = 1; }
    // «+7» уже стоит в поле, а номер набран или вставлен по привычке с 8 или 7. Кодов 89х и 79х не существует,
    // значит это мобильный в записи «8 9хх…»; при вставке — любой номер длиннее 11 цифр.
    if (/^7[78]9/.test(d) || (bulk && d.length > 11 && /^7[78]/.test(d))) { d = '7' + d.slice(2); shift -= 1; }
    return { d: d.slice(0, 11), shift: shift };
  }

  function phoneDigits(value) {
    return phoneParts(value, false).d;
  }

  function formatDigits(d) {
    if (!d) return '';
    var r = d.slice(1);
    var out = '+7 (' + r.slice(0, 3);
    if (r.length > 3) out += ') ' + r.slice(3, 6);
    if (r.length > 6) out += '-' + r.slice(6, 8);
    if (r.length > 8) out += '-' + r.slice(8, 10);
    return out;
  }

  // позиция сразу после n-й цифры; левее «+7 (» каретку не ставим
  function caretAfterDigit(str, n) {
    if (n <= 1) return Math.min(4, str.length);
    var c = 0;
    for (var i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) >= 48 && str.charCodeAt(i) <= 57 && ++c === n) return i + 1;
    }
    return str.length;
  }

  $$('[data-phone]').forEach(function (input) {
    var prev = input.value;

    function clearError() {
      var f = input.closest('.field');
      if (f) f.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }

    input.addEventListener('input', function (e) {
      if (e.isComposing) return;
      var raw = input.value;
      var type = e.inputType || '';
      var isDelete = type ? type.indexOf('delete') === 0 : raw.length < prev.length;
      var bulk = !isDelete && raw.length - prev.length > 1; // вставка или автозаполнение
      var pos = typeof input.selectionStart === 'number' ? input.selectionStart : raw.length;
      var atEnd = pos >= raw.length;
      var prevD = phoneDigits(prev);
      var parts = phoneParts(raw, bulk);
      var d = parts.d;
      // сколько цифр номера стоит слева от каретки (с поправкой на подставленный или убранный код страны)
      var left = raw.slice(0, pos).replace(/\D/g, '').length;
      if (parts.shift > 0 || left > 1) left += parts.shift;

      var next;
      if (isDelete && d.length <= 1) {
        // стёрты все цифры номера: сначала остаётся «+7 (», следующее удаление очищает поле
        next = prevD.length > 1 ? '+7 (' : '';
        atEnd = true;
      } else {
        if (isDelete && d === prevD && raw.length < prev.length && (!type || type === 'deleteContentBackward' || type === 'deleteContentForward')) {
          // удалён разделитель (скобка, пробел, дефис) — убираем соседнюю цифру, чтобы удаление не «застревало»
          if (type === 'deleteContentForward') {
            if (left >= 1 && left < d.length) d = d.slice(0, left) + d.slice(left + 1);
          } else if (left > 1) {
            d = d.slice(0, left - 1) + d.slice(left);
            left -= 1;
          }
        }
        next = formatDigits(d);
        if (!next && /^\s*\+\s*$/.test(raw)) next = '+';
      }

      input.value = next;
      var caret = atEnd ? next.length : caretAfterDigit(next, left);
      try { input.setSelectionRange(caret, caret); } catch (err) { /* поле не поддерживает выделение */ }
      prev = next;
      clearError();
    });

    input.addEventListener('focus', function () {
      if (!input.value) { input.value = '+7 ('; prev = input.value; }
    });
    input.addEventListener('blur', function () {
      if (input.value.replace(/\D/g, '').length <= 1) input.value = '';
      prev = input.value;
    });
    input.addEventListener('change', function () { prev = input.value; });
  });

  function buildMessage(form) {
    var data = new FormData(form);
    var lines = [];
    var subject = data.get('subject');
    if (subject) lines.push(subject);
    var map = { name: 'Имя', phone: 'Телефон', car: 'Автомобиль', budget: 'Бюджет', city: 'Город', comment: 'Комментарий', contact: 'Связь', calc: 'Расчёт' };
    Object.keys(map).forEach(function (k) {
      var v = data.get(k);
      if (v) lines.push(map[k] + ': ' + v);
    });
    return lines.join('\n');
  }

  $$('[data-lead-form]').forEach(function (form) {
    // ошибка согласия снимается, как только галочку поставили
    var agreeBox = $('input[name="agree"]', form);
    if (agreeBox) {
      agreeBox.addEventListener('change', function () {
        if (!agreeBox.checked) return;
        agreeBox.closest('.check').classList.remove('is-invalid');
        agreeBox.removeAttribute('aria-invalid');
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var phone = $('[data-phone]', form);
      if (phone) {
        var digits = phone.value.replace(/\D/g, '');
        var valid = digits.length === 11;
        phone.closest('.field').classList.toggle('is-invalid', !valid);
        if (valid) phone.removeAttribute('aria-invalid');
        else { phone.setAttribute('aria-invalid', 'true'); ok = false; phone.focus(); }
      }
      var agree = $('input[name="agree"]', form);
      if (agree) {
        agree.closest('.check').classList.toggle('is-invalid', !agree.checked);
        if (agree.checked) agree.removeAttribute('aria-invalid');
        else {
          agree.setAttribute('aria-invalid', 'true');
          if (ok) agree.focus();
          ok = false;
        }
      }
      if (!ok) return;
      var btn = $('button[type="submit"]', form);
      if (btn) btn.classList.add('is-loading');
      var msg = encodeURIComponent(buildMessage(form));
      var wa = $('[data-wa-link]', form);
      var tg = $('[data-tg-link]', form);
      if (wa && SITE.wa) wa.href = SITE.wa + (SITE.wa.indexOf('?') > -1 ? '&' : '?') + 'text=' + msg;
      // Telegram показываем, только если есть личный адрес менеджера (в канал написать нельзя)
      if (tg) { if (SITE.tg) { tg.href = SITE.tg; tg.hidden = false; } else tg.hidden = true; }
      var name = (new FormData(form).get('name') || '').toString().trim();
      var title = $('[data-success-title]', form);
      if (title && name) title.textContent = name + ', спасибо! Менеджер свяжется с вами в рабочее время.';
      setTimeout(function () {
        if (btn) btn.classList.remove('is-loading');
        form.classList.add('is-sent');
        form.dispatchEvent(new CustomEvent('lead:sent', { bubbles: true }));
      }, 450);
    });
  });

  /* ---------------------------------------------------------------------- лайтбокс галереи */

  var lb = doc.getElementById('modal-gallery');
  if (lb) {
    var lbImg = $('[data-lightbox-img]', lb);
    var lbCount = $('[data-lightbox-count]', lb);
    var lbItems = [];
    var lbIndex = 0;
    var showLb = function (i) {
      lbIndex = (i + lbItems.length) % lbItems.length;
      var it = lbItems[lbIndex];
      lbImg.src = it.href;
      lbImg.alt = it.dataset.alt || '';
      lbCount.textContent = (lbIndex + 1) + ' / ' + lbItems.length;
    };
    doc.addEventListener('click', function (e) {
      var item = e.target.closest('[data-gallery-item]');
      if (!item) return;
      var scope = item.closest('[data-gallery]') || doc;
      lbItems = $$('[data-gallery-item]', scope).filter(function (a, i, arr) {
        return arr.findIndex(function (b) { return b.href === a.href; }) === i;
      });
      var idx = lbItems.findIndex(function (a) { return a.href === item.href; });
      e.preventDefault();
      lb.classList.toggle('is-single', lbItems.length < 2); // одно фото — без стрелок и счётчика
      showLb(Math.max(idx, 0));
      if (typeof lb.showModal === 'function') lb.showModal();
    });
    // клик по тёмному полю вокруг фото закрывает просмотр
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox')) lb.close();
    });
    $('[data-lightbox-prev]', lb).addEventListener('click', function () { showLb(lbIndex - 1); });
    $('[data-lightbox-next]', lb).addEventListener('click', function () { showLb(lbIndex + 1); });
    lb.addEventListener('keydown', function (e) {
      if (lbItems.length < 2) return;
      if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
      if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    });
    var touchX = null;
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 48 && lbItems.length > 1) showLb(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }

  /* ---------------------------------------------------------------------- cookie */

  var cookie = doc.getElementById('cookie');
  if (cookie) {
    var accepted = false;
    try { accepted = localStorage.getItem('mg-cookie') === '1'; } catch (err) { /* приватный режим */ }
    if (!accepted) {
      cookie.hidden = false;
      // плашка не должна закрывать первый экран: показываем её после первой прокрутки или через 12 секунд
      var showCookie = function () {
        window.removeEventListener('scroll', onFirstScroll);
        cookie.classList.add('is-visible');
      };
      var onFirstScroll = function () { if (window.scrollY > 240) showCookie(); };
      window.addEventListener('scroll', onFirstScroll, { passive: true });
      setTimeout(showCookie, 12000);
      $('[data-cookie-accept]', cookie).addEventListener('click', function () {
        try { localStorage.setItem('mg-cookie', '1'); } catch (err) { /* нет доступа */ }
        cookie.classList.remove('is-visible');
        setTimeout(function () { cookie.hidden = true; }, 600);
      });
    }
  }

  /* ---------------------------------------------------------------------- ползунки: заливка трека */

  $$('input[type="range"].range').forEach(function (r) {
    var paint = function () {
      var min = +r.min || 0;
      var max = +r.max || 100;
      r.style.setProperty('--fill', ((r.value - min) / (max - min)) * 100 + '%');
    };
    r.addEventListener('input', paint);
    paint();
  });

  /* ---------------------------------------------------------------------- тост (общий помощник) */

  var toastEl = $('.toast');
  var toastTimer = null;
  window.mgToast = function (text) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = text;
    requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
      setTimeout(function () { toastEl.hidden = true; }, 320);
    }, 2800);
  };

  /* копирование по клику */
  doc.addEventListener('click', function (e) {
    var el = e.target.closest('[data-copy]');
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.dataset.copy).then(function () { window.mgToast(el.dataset.copyDone || 'Скопировано'); });
  });

  root.classList.add('is-ready');
})();
