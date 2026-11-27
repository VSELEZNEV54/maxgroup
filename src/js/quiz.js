/* Квиз подбора: шаги, прогресс, подсчет подходящих автомобилей в каталоге */
(function () {
  'use strict';

  function startGallery(section, desktop) {
    const panel = section.querySelector('.quiz-cover__photo');
    const slides = Array.from(panel.querySelectorAll('[data-quiz-photo]'));
    const control = panel.querySelector('[data-quiz-rotate]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = motion.matches;
    let visible = false;
    let active = null;
    let next = 0;
    let pending = false;
    let timer;

    function onScreen() {
      return visible && !document.hidden && (desktop.matches || !section.classList.contains('is-started'));
    }

    function schedule() {
      clearTimeout(timer);
      if (!onScreen() || !slides.length) return;
      if (!active && !pending) advance();
      else if (!paused && !pending && slides.length > 1) timer = setTimeout(advance, 6000);
    }

    function advance() {
      const template = slides[next];
      let figure = template.nextElementSibling;
      if (!figure?.matches('figure')) {
        figure = template.content.firstElementChild.cloneNode(true);
        template.after(figure);
      }
      const image = figure.querySelector('img');
      pending = true;
      function ready() {
        pending = false;
        if (image.naturalWidth) {
          if (figure.dataset.quoteUntil && Date.now() >= Number(figure.dataset.quoteUntil)) {
            figure.querySelector('[data-quiz-price]').textContent = 'Стоимость под ключ по запросу';
          }
          if (active) active.classList.remove('is-current');
          figure.classList.add('is-current');
          active = figure;
          panel.firstElementChild.setAttribute('aria-hidden', 'true');
          next = (next + 1) % slides.length;
        } else {
          slides.splice(next, 1);
          figure.remove();
          if (next >= slides.length) next = 0;
        }
        control.hidden = slides.length < 2;
        schedule();
      }
      if (image.complete) ready();
      else {
        image.onload = image.onerror = () => {
          image.onload = image.onerror = null;
          ready();
        };
      }
    }

    function setPaused(value) {
      paused = value;
      control.classList.toggle('is-paused', value);
      control.setAttribute('aria-label', value ? 'Включить смену фото' : 'Приостановить смену фото');
      schedule();
    }
    control.addEventListener('click', () => setPaused(!paused));
    motion.addEventListener('change', () => setPaused(motion.matches));
    desktop.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    setPaused(paused);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      }).observe(panel);
    } else {
      visible = true;
      schedule();
    }
    return schedule;
  }

  var forms = document.querySelectorAll('[data-quiz]');
  Array.prototype.forEach.call(forms, function (form) {
    const allSteps = Array.from(form.querySelectorAll('[data-quiz-step]'));
    let steps = allSteps;
    var nextBtn = form.querySelector('[data-quiz-next]');
    var backBtn = form.querySelector('[data-quiz-back]');
    var submitBtn = form.querySelector('[data-quiz-submit]');
    var bar = form.querySelector('[data-quiz-bar]');
    var countEl = form.querySelector('[data-quiz-count]');
    var answerList = form.querySelector('[data-quiz-answers]');
    var resultEl = form.querySelector('[data-quiz-result]');
    var catalogLink = form.querySelector('[data-quiz-catalog]');
    var catalogText = form.querySelector('[data-quiz-catalog-text]');
    var comment = form.querySelector('input[name="comment"]');
    var catalogBase = catalogLink ? catalogLink.getAttribute('href') : '';
    var profile = form.dataset.quizProfile;
    var index = [];
    try { index = JSON.parse(form.querySelector('[data-quiz-index]').textContent); } catch (e) { index = []; }
    var current = 0;
    var section = form.closest('.quiz-section');
    var start = section.querySelector('[data-quiz-start]');
    var questions = form.closest('.quiz');
    var desktop = window.matchMedia('(min-width: 1001px)');
    var syncGallery = startGallery(section, desktop);
    questions.inert = true;
    start.addEventListener('click', function (event) {
      if (section.classList.contains('is-started')) return;
      section.classList.toggle('quiz-motion', event.detail > 0);
      section.classList.add('is-started');
      syncGallery();
      start.closest('.quiz-cover').inert = true;
      questions.inert = false;
      show(0, true);
    });

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
    const countryStep = form.querySelector('[data-quiz-step="country"]');
    const countryOptions = Array.from(form.querySelectorAll('input[type="radio"][name="q-country"]'));
    let preferredMarket = form.elements['q-country'].value;

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

    function vehicleMarkets() {
      const brand = brandSelect.value;
      const model = modelSelect.value;
      const makeMarkets = new Set(brandSelect.selectedOptions[0]?.dataset.markets?.split(' '));
      const entry = models.get(brand)?.find(([slug]) => slug === model);
      const modelMarkets = new Set(entry?.[2]);
      for (const car of index) {
        if (car.brand !== brand || !car.country) continue;
        makeMarkets.add(car.country);
        if (model && car.model === model) modelMarkets.add(car.country);
      }
      const known = modelMarkets.size ? modelMarkets : makeMarkets;
      return countryOptions.map(option => option.value).filter(value => value && known.has(value));
    }

    function updateVehicle() {
      const make = byMake();
      makePanel.hidden = makePanel.disabled = !make;
      bodyPanel.hidden = bodyPanel.disabled = make;
      const markets = make && brandSelect.value ? vehicleMarkets() : [];
      const singleMarket = markets.length === 1;
      let market = preferredMarket;
      if (singleMarket) market = markets[0];
      else if (markets.length && !markets.includes(market)) market = '';
      for (const option of countryOptions) {
        const excluded = option.value ? markets.length > 0 && !markets.includes(option.value) : singleMarket;
        option.parentElement.hidden = option.disabled = excluded;
        option.checked = option.value === market;
      }
      updateCounts(market === preferredMarket ? market : '');

      const active = steps[current];
      steps = singleMarket ? allSteps.filter(step => step !== countryStep) : allSteps;
      const position = steps.indexOf(active);
      show(position < 0 ? current : position);
    }

    function selectValue(field, value, label) {
      if (value && !Array.from(field.options).some(function (o) { return o.value === value; })) {
        var option = new Option(label || value, value);
        option.dataset.custom = '';
        field.add(option);
      }
      field.value = value || '';
    }

    function updateCounts(country) {
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
    }

    function selectedLabel(select) {
      return select.value ? select.selectedOptions[0].textContent : '';
    }

    function linkFilter() {
      var mileage = form.querySelector('[name="q-mileage"]:checked');
      return {
        country: values('q-country')[0],
        brand: byMake() ? brandSelect.value : '',
        model: byMake() ? modelSelect.value : '',
        body: byMake() ? '' : values('q-body').filter(Boolean).join('|'),
        'price-max': values('q-budget')[0],
        age: values('q-age')[0],
        'mileage-min': mileage?.dataset.min,
        'mileage-max': mileage?.dataset.max || (mileage?.dataset.min ? '' : mileage?.value),
      };
    }

    function matches() {
      var f = linkFilter();
      return index.filter(function (car) {
        if (f.body && !f.body.split('|').includes(car.body)) return false;
        if (f['mileage-min'] && (car.mileage == null || car.mileage < Number(f['mileage-min']))) return false;
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

    var answerLabels = { country: 'Рынок', budget: 'Бюджет', age: 'Возраст', mileage: 'Пробег' };

    function stepAnswers(step) {
      var kind = step.dataset.quizStep;
      if (kind === 'model') return ['Модель: ' + profile, 'Страна: ' + form.dataset.marketName];
      if (kind === 'body') {
        carInput.value = byMake() ? [selectedLabel(brandSelect), selectedLabel(modelSelect)].filter(Boolean).join(' ') : '';
        if (byMake()) return carInput.value ? ['Автомобиль: ' + carInput.value] : [];
        var bodies = text('q-body').join(', ');
        return bodies ? ['Кузов: ' + bodies] : [];
      }
      if (kind === 'year') {
        var from = form.elements['q-year-min'].value;
        var to = form.elements['q-year-max'].value;
        var years = from && from === to ? from : [from && 'от ' + from, to && 'до ' + to].filter(Boolean).join(' ');
        return ['Год выпуска: ' + (years || 'любой')];
      }
      var selected = text('q-' + kind).join(', ');
      var answers = selected ? [answerLabels[kind] + ': ' + selected] : [];
      var city = step.elements.namedItem('city')?.value.trim();
      if (city) answers.push('Город: ' + city);
      return answers;
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
      const active = steps[current];
      allSteps.forEach(function (step) { step.hidden = step !== active; });
      var last = current === steps.length - 1;
      nextBtn.hidden = last;
      submitBtn.hidden = !last;
      backBtn.hidden = current === 0;
      if (bar) bar.style.transform = 'scaleX(' + (current + 1) / steps.length + ')';
      if (countEl) countEl.textContent = 'Шаг ' + (current + 1) + ' / ' + steps.length;

      // Автоматически выбранный рынок тоже входит в ответы и в заявку.
      var answers = allSteps.slice(0, allSteps.indexOf(active)).flatMap(stepAnswers);
      answerList.replaceChildren(...answers.map(function (answer) {
        var item = document.createElement('li');
        item.textContent = answer;
        return item;
      }));
      answerList.hidden = last || !answers.length;
      if (last && comment) comment.value = answers.join('\n');
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
    form.addEventListener('pointerdown', function (e) {
      section.classList.add('quiz-motion');
      byPointer = Boolean(e.target.closest('.opt'));
    });
    form.addEventListener('keydown', function () {
      section.classList.remove('quiz-motion');
      byPointer = false;
    });
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
      if (!profile && (t.name === 'q-mode' || t === brandSelect || t === modelSelect)) {
        if (t === brandSelect) updateModels();
        updateVehicle();
      }
      if (t.name === 'q-country' && !profile) {
        preferredMarket = t.value;
        updateCounts(t.value);
      }
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
        if (resultEl) resultEl.textContent = comment.value.split('\n').join(' · ');
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
    var listing = section && document.querySelector('[data-catalog-quiz="' + section.id + '"]');
    if (listing) {
      var defaultMarket = form.elements['q-country'].value;
      function useCatalogFilters() {
        var makeFilter = listing.querySelector('[data-filter="brand"]');
        var modelFilter = listing.querySelector('[data-filter="model"]');
        const selected = modelFilter.selectedOptions[0];
        var brand = makeFilter.value || selected?.dataset.make;
        const [model, taggedMarket] = selected?.dataset.profile ? modelFilter.value.split('@') : [modelFilter.value];
        var country = listing.querySelector('[data-filter="country"]');
        if (model && !brand) {
          var makes = Array.from(models.keys()).filter(function (make) {
            return models.get(make).some(function (option) { return option[0] === model; });
          });
          if (makes.length === 1) brand = makes[0];
        }
        selectValue(brandSelect, brand, makeFilter.value && selectedLabel(makeFilter));
        form.elements['q-mode'].value = brandSelect.value ? 'make' : 'body';
        preferredMarket = country?.value || taggedMarket || defaultMarket;
        updateModels(model, selectedLabel(modelFilter));
        updateVehicle();
      }
      useCatalogFilters();
      if (listing.hasAttribute('data-catalog-list')) {
        listing.addEventListener('catalog:choices', useCatalogFilters);
        form.addEventListener('focusin', function () {
          listing.removeEventListener('catalog:choices', useCatalogFilters);
        }, { once: true });
      }
      return;
    }
    var query = new URLSearchParams(location.search);
    var requestedMarket = Array.from(form.querySelectorAll('[name="q-country"]')).find(function (o) { return o.value === query.get('market'); });
    var requestedMake = query.get('make');
    if (requestedMarket && requestedMake && Array.from(brandSelect.options).some(function (o) { return o.value === requestedMake; })) {
      form.querySelector('[name="q-mode"][value="make"]').checked = true;
      brandSelect.value = requestedMake;
      preferredMarket = requestedMarket.value;
    }
    updateModels(modelSelect.value);
    updateVehicle();
  });
})();
