/* Квиз подбора: шаги, прогресс, подсчет подходящих автомобилей в каталоге */
(function () {
  'use strict';

  var forms = document.querySelectorAll('[data-quiz]');
  Array.prototype.forEach.call(forms, function (form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-quiz-step]'));
    var nextBtn = form.querySelector('[data-quiz-next]');
    var backBtn = form.querySelector('[data-quiz-back]');
    var submitBtn = form.querySelector('[data-quiz-submit]');
    var bar = form.querySelector('[data-quiz-bar]');
    var countEl = form.querySelector('[data-quiz-count]');
    var matchEl = form.querySelector('[data-quiz-match]');
    var resultEl = form.querySelector('[data-quiz-result]');
    var catalogLink = form.querySelector('[data-quiz-catalog]');
    var catalogText = form.querySelector('[data-quiz-catalog-text]');
    var comment = form.querySelector('input[name="comment"]');
    var bubble = (form.closest('.quiz') || document).querySelector('[data-quiz-bubble]');
    var catalogBase = catalogLink ? catalogLink.getAttribute('href') : '';
    var index = [];
    try { index = JSON.parse(form.querySelector('[data-quiz-index]').textContent); } catch (e) { index = []; }
    var current = 0;

    function values(name) {
      return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) { return i.value; });
    }

    function text(name) {
      return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) {
        return i.parentNode.textContent.trim();
      });
    }

    function plural(n, f) {
      var a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return f[0];
      if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return f[1];
      return f[2];
    }

    // Условия, которые понимает каталог и которые уходят в ссылку: страна, кузов (если выбран один) и бюджет.
    // Число «подходящих» считается по ним же — оно совпадает с тем, что каталог покажет по ссылке.
    // Возраст и остальные ответы получает менеджер в тексте заявки.
    function linkFilter() {
      var bodies = values('q-body').filter(Boolean);
      return {
        country: values('q-country')[0] || '',
        body: bodies.length === 1 ? bodies[0] : '',
        budget: +(values('q-budget')[0] || 0),
      };
    }

    function matches() {
      var f = linkFilter();
      return index.filter(function (c) {
        if (f.country && c[0] !== f.country) return false;
        if (f.body && c[1] !== f.body) return false;
        if (f.budget && (!c[2] || c[2] > f.budget)) return false;
        return true;
      }).length;
    }

    function catalogUrl() {
      var f = linkFilter();
      var params = [];
      if (f.country) params.push('country=' + f.country);
      if (f.body) params.push('body=' + encodeURIComponent(f.body));
      if (f.budget) params.push('price-max=' + f.budget);
      return catalogBase + (params.length ? '?' + params.join('&') : '');
    }

    // «3 автомобиля подходят по стране и бюджету»
    function matchText(n) {
      var f = linkFilter();
      var by = [f.country && 'стране', f.body && 'кузову', f.budget && 'бюджету'].filter(Boolean);
      var crit = by.length > 1 ? by.slice(0, -1).join(', ') + ' и ' + by[by.length - 1] : by[0];
      return n + ' ' + plural(n, ['автомобиль', 'автомобиля', 'автомобилей']) + (crit ? ' ' + plural(n, ['подходит', 'подходят', 'подходят']) + ' по ' + crit : '');
    }

    function summary() {
      var parts = [];
      var b = text('q-body');
      if (b.length) parts.push('Кузов: ' + b.join(', '));
      var c = text('q-country');
      if (c.length) parts.push('Страна: ' + c[0]);
      var m = text('q-budget');
      if (m.length) parts.push('Бюджет: ' + m[0]);
      var a = text('q-age');
      if (a.length) parts.push('Возраст: ' + a[0]);
      return parts.join('; ');
    }

    function show(i, focus) {
      current = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, n) { s.hidden = n !== current; });
      var last = current === steps.length - 1;
      nextBtn.hidden = last;
      submitBtn.hidden = !last;
      backBtn.hidden = current === 0;
      if (bar) bar.style.width = ((current + 1) / steps.length) * 100 + '%';
      if (countEl) countEl.textContent = 'Шаг ' + (current + 1) + ' / ' + steps.length;
      if (bubble && steps[current].dataset.bubble) bubble.textContent = steps[current].dataset.bubble;
      if (last) {
        var n = matches();
        if (matchEl) {
          matchEl.textContent = n
            ? 'В каталоге ' + matchText(n) + ': покажем после отправки. Под запрос подберем и другие.'
            : 'Готовых примеров под такой запрос в каталоге нет. Подберем на аукционах и площадках.';
        }
        if (comment) comment.value = summary();
      }
      // при переходе с клавиатуры фокус встает на вопрос нового шага (кнопка «Далее» на последнем шаге исчезает)
      if (focus) {
        var q = steps[current].querySelector('legend');
        if (q) { q.tabIndex = -1; q.focus({ preventScroll: true }); }
      }
    }

    nextBtn.addEventListener('click', function () { show(current + 1, true); });
    backBtn.addEventListener('click', function () { show(current - 1, true); });

    // Одиночный выбор мышью или касанием — сразу переходим дальше (в том числе по уже отмеченному варианту).
    // С клавиатуры стрелки только переключают варианты: дальше ведет кнопка «Далее».
    var byPointer = false;
    form.addEventListener('pointerdown', function (e) { byPointer = Boolean(e.target.closest('.opt')); });
    form.addEventListener('keydown', function () { byPointer = false; });
    form.addEventListener('click', function (e) {
      var t = e.target;
      if (!byPointer || t.type !== 'radio' || !/^q-/.test(t.name)) return;
      if (current >= steps.length - 1 || !steps[current].contains(t) || steps[current].querySelector('.quiz__free')) return;
      byPointer = false;
      var from = current;
      setTimeout(function () { if (current === from) show(from + 1, true); }, 220);
    });

    // «Пока не решил» и конкретные кузова исключают друг друга
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name !== 'q-body' || !t.checked) return;
      Array.prototype.forEach.call(form.querySelectorAll('input[name="q-body"]'), function (o) {
        if (o !== t && Boolean(o.value) !== Boolean(t.value)) o.checked = false;
      });
    });

    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && current < steps.length - 1 && e.target.tagName === 'INPUT' && e.target.type === 'text') {
        e.preventDefault();
        show(current + 1, true);
      }
    });

    form.addEventListener('lead:sent', function () {
      var n = matches();
      if (resultEl) {
        resultEl.textContent = n
          ? 'В каталоге ' + matchText(n) + '. Менеджер дополнит подборку свежими лотами.'
          : 'Готовых примеров под такой запрос в каталоге нет. Менеджер подберет лоты на аукционах и площадках.';
      }
      if (catalogLink) {
        catalogLink.href = n ? catalogUrl() : catalogBase;
        if (catalogText) catalogText.textContent = n ? 'Смотреть подходящие в каталоге' : 'Смотреть весь каталог';
      }
    });

    show(0);
  });
})();
