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
    var profile = form.dataset.quizProfile;
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

    var makePanel = form.querySelector('[data-quiz-make]');
    var bodyPanel = form.querySelector('[data-quiz-bodies]');
    var brandSelect = form.elements['q-brand'];
    var modelSelect = form.elements['q-model'];
    var models = new Map(Object.entries(JSON.parse(form.querySelector('[data-quiz-models]').textContent)));
    var anyModel = profile ? null : modelSelect.options[0];
    var carInput = form.elements.car;

    if (!profile) {
      var makes = new Set(Array.from(brandSelect.options, function (o) { return o.value; }));
      index.forEach(function (car) {
        if (!makes.has(car.brand)) {
          makes.add(car.brand);
          brandSelect.add(new Option(car.brandName || car.brand, car.brand));
        }
        if (!models.has(car.brand)) models.set(car.brand, []);
        var list = models.get(car.brand);
        if (!list.some(function (m) { return m[0] === car.model; })) list.push([car.model, car.modelName || car.model]);
      });
    }

    function byMake() {
      return values('q-mode')[0] === 'make';
    }

    function updateMode() {
      var make = byMake();
      makePanel.hidden = makePanel.disabled = !make;
      bodyPanel.hidden = bodyPanel.disabled = make;
    }

    function selectValue(field, value, label) {
      if (value && !Array.from(field.options).some(function (o) { return o.value === value; })) {
        var option = new Option(label || value, value);
        option.dataset.custom = '';
        field.add(option);
      }
      field.value = value || '';
    }

    function updateCounts() {
      var country = values('q-country')[0];
      var brands = new Map(), modelCounts = new Map();
      index.forEach(function (car) {
        if (country && car.country !== country) return;
        brands.set(car.brand, (brands.get(car.brand) || 0) + 1);
        if (car.brand === brandSelect.value) modelCounts.set(car.model, (modelCounts.get(car.model) || 0) + 1);
      });
      for (var [field, counts] of [[brandSelect, brands], [modelSelect, modelCounts]]) {
        for (var option of field.options) {
          if (!option.value) continue;
          var n = counts.get(option.value) || 0;
          option.dataset.count = n;
          option.label = option.textContent + ' (' + n + ')';
        }
      }
      form.dispatchEvent(new Event('select:sync'));
    }

    function updateModels(selected, label) {
      var options = models.get(brandSelect.value) || [];
      modelSelect.replaceChildren(anyModel);
      options.forEach(function (model) { modelSelect.add(new Option(model[1], model[0])); });
      selectValue(modelSelect, selected, label);
      modelSelect.disabled = !brandSelect.value;
      updateCounts();
    }

    function selectedLabel(select) {
      return select.value ? select.selectedOptions[0].textContent : '';
    }

    function linkFilter() {
      return {
        country: values('q-country')[0],
        brand: byMake() ? brandSelect.value : '',
        model: byMake() ? modelSelect.value : '',
        body: byMake() ? '' : values('q-body').filter(Boolean).join('|'),
        'price-max': values('q-budget')[0],
        age: values('q-age')[0],
        'mileage-max': values('q-mileage')[0],
      };
    }

    function matches() {
      var f = linkFilter();
      return index.filter(function (car) {
        if (f.body && !f.body.split('|').includes(car.body)) return false;
        if (f['mileage-max'] && (car.mileage == null || car.mileage > Number(f['mileage-max']))) return false;
        var budget = f['price-max'];
        if (budget && !(car.price > 0)) return false;
        if (budget === 'over-5000000' && car.price <= 5000000) return false;
        if (budget && budget !== 'over-5000000' && car.price > Number(budget)) return false;
        return ['country', 'brand', 'model', 'age'].every(function (key) { return !f[key] || car[key] === f[key]; });
      }).length;
    }

    function catalogUrl() {
      var params = new URLSearchParams();
      var f = linkFilter();
      Object.keys(f).forEach(function (key) { if (f[key]) params.set(key, f[key]); });
      return catalogBase + (params.size ? '?' + params.toString() : '');
    }

    function matchText(n) {
      return n + ' ' + plural(n, ['автомобиль подходит', 'автомобиля подходят', 'автомобилей подходят']) + ' по вашим параметрам';
    }

    function summary() {
      if (profile) {
        var from = form.elements['q-year-min'].value;
        var to = form.elements['q-year-max'].value;
        var years = from && from === to ? from : [from && 'от ' + from, to && 'до ' + to].filter(Boolean).join(' ');
        return ['Модель: ' + profile, 'Страна: ' + form.dataset.marketName, 'Бюджет: ' + text('q-budget')[0],
          'Год выпуска: ' + (years || 'любой'), 'Пробег: ' + text('q-mileage')[0]].join('\n');
      }
      carInput.value = byMake() ? [selectedLabel(brandSelect), selectedLabel(modelSelect)].filter(Boolean).join(' ') : '';
      var parts = [];
      if (!byMake() && text('q-body').length) parts.push('Кузов: ' + text('q-body').join(', '));
      [['q-country', 'Рынок'], ['q-budget', 'Бюджет'], ['q-age', 'Возраст'], ['q-mileage', 'Пробег']].forEach(function (field) {
        parts.push(field[1] + ': ' + text(field[0]).join(', '));
      });
      return parts.join('\n');
    }

    function next() {
      if (current === 0 && byMake() && !brandSelect.reportValidity()) return;
      if (steps[current].dataset.quizStep === 'year') {
        var from = form.elements['q-year-min'], to = form.elements['q-year-max'];
        to.setCustomValidity(from.value && to.value && from.valueAsNumber > to.valueAsNumber ? 'Год «до» должен быть не меньше года «от».' : '');
        if (!from.reportValidity() || !to.reportValidity()) return;
      }
      show(current + 1, true);
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
        if (comment) comment.value = summary();
        if (profile && matchEl) matchEl.textContent = comment.value.split('\n').slice(2).join(' · ');
        else if (matchEl) {
          var n = matches();
          matchEl.textContent = n
            ? 'В каталоге ' + matchText(n) + ': покажем после отправки. Под запрос подберем и другие.'
            : 'Готовых примеров под такой запрос в каталоге нет. Подберем на аукционах и площадках.';
        }
      }
      // при переходе с клавиатуры фокус встает на вопрос нового шага (кнопка «Далее» на последнем шаге исчезает)
      if (focus) {
        var q = steps[current].querySelector('legend');
        if (q) { q.tabIndex = -1; q.focus({ preventScroll: true }); }
      }
    }

    nextBtn.addEventListener('click', next);
    backBtn.addEventListener('click', function () { show(current - 1, true); });

    // Одиночный выбор мышью или касанием — сразу переходим дальше (в том числе по уже отмеченному варианту).
    // С клавиатуры стрелки только переключают варианты: дальше ведет кнопка «Далее».
    var byPointer = false;
    form.addEventListener('pointerdown', function (e) { byPointer = Boolean(e.target.closest('.opt')); });
    form.addEventListener('keydown', function () { byPointer = false; });
    form.addEventListener('click', function (e) {
      var t = e.target;
      if (!byPointer || t.type !== 'radio' || !['q-country', 'q-budget', 'q-mileage'].includes(t.name)) return;
      if (current >= steps.length - 1 || !steps[current].contains(t) || steps[current].querySelector('.quiz__free')) return;
      byPointer = false;
      var from = current;
      setTimeout(function () { if (current === from) show(from + 1, true); }, 220);
    });

    // «Пока не решил» и конкретные кузова исключают друг друга
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'q-mode') updateMode();
      if (t === brandSelect) updateModels();
      if (t.name === 'q-country' && !profile) updateCounts();
      if (t.name !== 'q-body' || !t.checked) return;
      Array.prototype.forEach.call(form.querySelectorAll('input[name="q-body"]'), function (o) {
        if (o !== t && Boolean(o.value) !== Boolean(t.value)) o.checked = false;
      });
    });

    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && current < steps.length - 1 && e.target.matches('input:not([role="combobox"])')) {
        e.preventDefault();
        next();
      }
    });

    form.addEventListener('lead:sent', function () {
      if (profile) {
        if (resultEl) resultEl.textContent = 'Вы выбрали ' + profile + '. ' + matchEl.textContent;
        return;
      }
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

    if (profile) {
      show(0);
      return;
    }
    var section = form.closest('.quiz-section');
    var listing = section && document.querySelector('[data-catalog-quiz="' + section.id + '"]');
    if (listing) {
      var defaultMarket = form.elements['q-country'].value;
      function useCatalogFilters() {
        var makeFilter = listing.querySelector('[data-filter="brand"]');
        var modelFilter = listing.querySelector('[data-filter="model"]');
        var brand = makeFilter.value, model = modelFilter.value;
        var country = listing.querySelector('[data-filter="country"]');
        if (model && !brand) {
          var makes = Array.from(models.keys()).filter(function (make) {
            return models.get(make).some(function (option) { return option[0] === model; });
          });
          if (makes.length === 1) brand = makes[0];
        }
        selectValue(brandSelect, brand, makeFilter.value && selectedLabel(makeFilter));
        form.elements['q-mode'].value = brandSelect.value ? 'make' : 'body';
        form.elements['q-country'].value = country?.value || defaultMarket;
        updateModels(model, selectedLabel(modelFilter));
        updateMode();
      }
      useCatalogFilters();
      if (listing.hasAttribute('data-catalog-list')) {
        listing.addEventListener('catalog:choices', useCatalogFilters);
        form.addEventListener('focusin', function () {
          listing.removeEventListener('catalog:choices', useCatalogFilters);
        }, { once: true });
      }
      show(0);
      return;
    }
    var query = new URLSearchParams(location.search);
    var requestedMarket = Array.from(form.querySelectorAll('[name="q-country"]')).find(function (o) { return o.value === query.get('market'); });
    var requestedMake = query.get('make');
    if (requestedMarket && requestedMake && Array.from(brandSelect.options).some(function (o) { return o.value === requestedMake; })) {
      form.querySelector('[name="q-mode"][value="make"]').checked = true;
      brandSelect.value = requestedMake;
      requestedMarket.checked = true;
    }
    updateModels(modelSelect.value);
    updateMode();
    show(0);
  });
})();
