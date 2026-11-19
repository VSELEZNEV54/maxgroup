// Одна форма для статических карточек и обновляемых предложений модели.
(() => {
  'use strict';

  const carCount = new Intl.PluralRules('ru');
  const carWords = { one: 'автомобиль', few: 'автомобиля', many: 'автомобилей', other: 'автомобилей' };
  const count = (n) => n + ' ' + carWords[carCount.select(n)];
  const digits = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const sorts = {
    popular: ['popular', -1], 'price-asc': ['price', 1], 'price-desc': ['price', -1],
    'grade-desc': ['grade', -1], 'grade-asc': ['grade', 1], 'year-desc': ['year', -1], 'mileage-asc': ['mileage', 1],
  };
  const dependentFilters = { country: ['brand', 'model', 'generation'], brand: ['model', 'generation'], model: ['generation'] };

  function customOption(field, value) {
    let option = Array.from(field.options).find((o) => o.hasAttribute('data-custom') && o.value === value);
    if (!option) {
      option = new Option(value, value);
      option.dataset.custom = '';
      option.dataset.count = '0';
      option.label = value + ' (0)';
      field.add(option);
    }
    return option;
  }

  function listing(root) {
    const server = root.hasAttribute('data-server-catalog');
    const form = root.querySelector('[data-filters]');
    const fields = Array.from(form.querySelectorAll('[data-filter]'));
    const controls = Object.fromEntries(fields.map((f) => [f.dataset.filter, f]));
    const sort = root.querySelector('[data-sort]');
    const generations = JSON.parse(form.querySelector('[data-generation-options]').textContent);
    const facets = form.hasAttribute('data-facets') ? JSON.parse(form.dataset.facets) : null;
    const reset = form.querySelector('[data-filters-reset]');
    const show = form.querySelector('[data-filter-show]');
    const more = root.querySelector('[data-cars-more]');
    const quiz = document.getElementById(root.dataset.catalogQuiz || '');
    const extra = form.querySelector('details');
    const toggle = form.querySelector('[data-filter-toggle]');
    const badge = form.querySelector('[data-filter-badge]');
    const panel = form.querySelector('.filters__panel');
    const phone = matchMedia('(max-width: 600px)');
    const base = (field) => field.dataset.default || '';
    const value = (field) => field.tagName === 'INPUT' ? field.value.replace(/\s/g, '') : field.value;
    let grid, cards, limit, shown, matched, previousSort;

    function inventory() {
      grid = root.querySelector('[data-cars]');
      cards = grid ? Array.from(grid.querySelectorAll('[data-car], [data-offer-id]')) : [];
      limit = Number(grid?.dataset.pageSize) || Infinity;
      shown = limit;
      previousSort = null;
    }

    function dependentChoices(selectedGeneration = controls.generation.value) {
      const country = controls.country?.value;
      const brand = controls.brand.value;
      const model = controls.model.value;
      const rows = facets || cards.map((c) => c.dataset);
      const inCountry = rows.filter((c) => !country || c.country === country);
      const inBrand = inCountry.filter((c) => !brand || c.brand === brand);
      for (const [field, list] of [[controls.brand, inCountry], [controls.model, inBrand]]) {
        const key = field.dataset.filter;
        const totals = new Map();
        for (const row of list) totals.set(row[key], (totals.get(row[key]) || 0) + Number(row.count ?? 1));
        let unavailableSelection;
        for (const option of field.options) {
          if (!option.value) continue;
          if (option.hasAttribute('data-custom')) {
            option.dataset.count = '0';
            option.label = option.textContent + ' (0)';
            option.hidden = option.disabled = !option.selected;
            continue;
          }
          const markets = option.dataset.markets?.split(' ');
          const profile = markets && (!country || markets.includes(country))
            && (key !== 'model' || !brand || option.dataset.make === brand);
          let n = totals.get(option.value) || 0;
          if (option.dataset.profile) {
            n = Number(option.dataset.count);
            if (!server && option.dataset.profile === root.dataset.modelProfile) n = cards.length;
            else if (option.dataset.until && Number(option.dataset.until) <= Date.now()) n = 0;
          }
          option.dataset.count = n;
          option.label = option.textContent + ' (' + digits.format(n) + ')';
          // На странице марки или модели часть пунктов ведет в соседние разделы.
          const unavailable = !base(field) && !totals.has(option.value) && !profile;
          if (unavailable && option.selected) unavailableSelection = option.value;
          option.hidden = option.disabled = unavailable;
        }
        // Ссылка с собственным названием может совпасть с моделью из другого рынка.
        if (unavailableSelection) {
          const own = customOption(field, unavailableSelection);
          own.disabled = own.hidden = false;
          own.selected = true;
        }
      }
      const field = controls.generation;
      const modelCars = inBrand.filter((c) => c.model === model);
      const modelBrands = [...new Set(modelCars.map((c) => c.brand))];
      const make = brand || (modelBrands.length === 1 ? modelBrands[0] : '');
      const history = generations[make + '/' + model] || [];
      const hint = !model ? 'Сначала выберите модель' : !make ? 'Сначала выберите марку' : 'Нет данных о поколении';
      field.replaceChildren(new Option(history.length ? 'Все поколения' : hint, ''));
      for (const row of history) {
        const years = row.from + ' – ' + (row.to || 'н. в.');
        const option = new Option(years + ' · ' + row.label, row.id);
        Object.assign(option.dataset, { years, edition: row.label, codes: (row.codes || []).join(', '), photo: form.dataset.images + '/' + row.photo });
        field.add(option);
      }
      // Старые закладки содержат код кузова конкретного автомобиля.
      const legacy = selectedGeneration && cards.find((c) => c.dataset.brand === make && c.dataset.model === model && c.dataset.frame === selectedGeneration)?.dataset.generation;
      field.value = history.some((g) => g.id === selectedGeneration) ? selectedGeneration : legacy || '';
      field.disabled = !history.length;
      root.dispatchEvent(new Event('catalog:choices'));
    }

    function matches(card, active) {
      const data = card.dataset;
      return active.every(([key, val]) => {
        if (key === 'hp-max' && val === '160') return data.low === '1';
        if (key === 'body') return val.split('|').includes(data.body);
        if (key.endsWith('-min') || key.endsWith('-max')) {
          const raw = data[key.slice(0, -4)];
          if (raw == null || raw === '') return false;
          return key.endsWith('-min') ? Number(raw) >= Number(val) : Number(raw) <= Number(val);
        }
        return data[key] === val;
      });
    }

    function paramsFor(url) {
      const params = new URLSearchParams(location.search);
      for (const field of fields) {
        const v = value(field);
        const key = field.dataset.filter;
        if (v && v !== base(field)) params.set(key, v);
        else params.delete(key);
      }
      if (sort.value !== base(sort)) params.set('sort', sort.value);
      else params.delete('sort');
      url.search = params.toString();
      return url;
    }

    function render(sync = true) {
      const active = fields.filter((f) => value(f) && value(f) !== base(f)).map((f) => [f.dataset.filter, value(f)]);
      for (const range of form.querySelectorAll('[data-range]')) {
        const lo = controls[range.dataset.range + '-min'], hi = controls[range.dataset.range + '-max'];
        const reversed = Boolean(value(lo) && value(hi) && Number(value(lo)) > Number(value(hi)));
        range.classList.toggle('is-invalid', reversed);
        for (const f of [lo, hi]) {
          f.setAttribute('aria-invalid', String(reversed));
          if (reversed) f.setAttribute('aria-describedby', 'filter-' + range.dataset.range + '-error');
          else f.removeAttribute('aria-describedby');
        }
      }
      reset.hidden = !active.length;
      badge.hidden = !active.length;
      badge.textContent = active.length;
      if (server) return; // Счетчик и пагинация Django относятся ко всей выдаче.
      let ordered = cards;
      if (sort.value) {
        const [key, dir] = sorts[sort.value];
        ordered = cards.slice().sort((a, b) => {
          const x = a.dataset[key], y = b.dataset[key];
          if (!x || !y) return Number(!x) - Number(!y);
          return (Number(x) - Number(y)) * dir;
        });
      }
      matched = 0;
      for (const card of ordered) {
        const ok = matches(card, active);
        if (ok) matched++;
        card.hidden = !ok || matched > shown;
        if (!card.hidden) card.classList.add('is-in');
        if (sort.value !== previousSort) grid.append(card);
      }
      previousSort = sort.value;
      const n = Math.min(matched, shown);
      if (quiz) {
        quiz.hidden = matched > shown;
        grid.classList.toggle('cars-grid--duo', n > 1);
      }
      const countEl = root.querySelector('[data-results-count]');
      if (countEl) countEl.textContent = count(matched) + (active.length ? ' из ' + cards.length : '');
      show.textContent = 'Показать ' + count(matched);
      show.disabled = !grid;
      if (more) {
        more.parentElement.hidden = matched <= shown;
        more.querySelector('span').textContent = 'Показать еще ' + Math.min(matched - n, limit);
      }
      const empty = root.querySelector('[data-cars-empty]');
      if (empty) empty.hidden = matched > 0;
      root.querySelector('[data-results-head]').hidden = !cards.length;
      if (sync) {
        const url = paramsFor(new URL(location.href));
        if (url.href !== location.href) {
          try { history.replaceState(history.state, '', url); } catch { /* автономная сборка file:// */ }
        }
      }
    }

    function readUrl() {
      const params = new URLSearchParams(location.search);
      // Старые ссылки из квиза задавали строгую нижнюю границу строкой в price-max.
      if (params.get('price-max') === 'over-5000000') {
        params.delete('price-max');
        params.set('price-min', '5000001');
      }
      for (const field of fields) {
        const key = field.dataset.filter, v = params.get(key);
        if (!v || base(field) || key === 'generation') continue;
        if (field.tagName === 'INPUT') {
          if (/^\d{1,12}$/.test(v) && (key.split('-')[0] !== 'year' || v.length <= 4)) {
            field.value = key.startsWith('year-') ? v : digits.format(Number(v));
          }
        } else {
          if (key === 'body' && v.includes('|') && v.split('|').every((b) => Array.from(field.options).some((o) => b && o.value === b))) {
            field.add(new Option(v.split('|').join(' / '), v));
          }
          if (!Array.from(field.options).some((o) => o.value === v) && (key === 'brand' || key === 'model') && v.length <= 100) {
            customOption(field, v);
          }
          if (Array.from(field.options).some((o) => o.value === v)) field.value = v;
        }
      }
      if (Object.hasOwn(sorts, params.get('sort'))) sort.value = params.get('sort');
      dependentChoices(params.get('generation') || '');
      if (extra && Array.from(extra.querySelectorAll('select')).some((f) => f.value)) extra.open = true;
    }

    form.addEventListener('input', (e) => {
      const f = e.target;
      if (!f.matches('input[data-filter]')) return;
      f.value = f.value.replace(/[^\d\s]/g, '');
      shown = limit;
      render();
    });
    form.addEventListener('focusout', (e) => {
      const f = e.target;
      if (f.matches('input[data-filter]') && !f.dataset.filter.startsWith('year-')) {
        f.value = value(f) ? digits.format(Number(value(f))) : '';
      }
    });
    form.addEventListener('change', (e) => {
      const f = e.target;
      if (f.tagName !== 'SELECT') return;
      const key = f.dataset.filter;
      const children = dependentFilters[key] || [];
      const selected = f.selectedOptions[0];
      const custom = selected?.hasAttribute('data-custom') && base(f);
      const destination = custom ? controls.brand.options[0].dataset.url : selected?.dataset.url;
      if (destination) {
        const target = new URL(destination, location.href);
        const preset = new URLSearchParams(target.search);
        const url = paramsFor(target);
        for (const name of [key, ...children]) url.searchParams.delete(name);
        for (const [name, val] of preset) url.searchParams.set(name, val);
        if (custom) {
          url.searchParams.set(key, selected.value);
          if (key === 'model') url.searchParams.set('brand', controls.brand.value);
        }
        f.value = base(f);
        location.assign(url);
        return;
      }
      for (const name of children) controls[name].value = base(controls[name]);
      dependentChoices();
      shown = limit;
      render();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (server) { location.assign(paramsFor(new URL(form.action))); return; }
      if (phone.matches) disclosure(false);
      (root.querySelector('[data-results-count]') || grid)?.scrollIntoView({ block: 'start' });
    });
    function disclosure(expanded) {
      toggle.hidden = !phone.matches;
      panel.hidden = phone.matches && !expanded;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    }
    toggle.addEventListener('click', () => disclosure(panel.hidden));
    phone.addEventListener('change', () => disclosure(false));
    disclosure(false);
    sort.addEventListener('change', () => {
      if (server) { location.assign(paramsFor(new URL(form.action))); return; }
      shown = limit;
      render();
    });
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-filters-reset], [data-filters-reset-all]')) return;
      e.preventDefault();
      for (const f of fields) f.value = base(f);
      if (server) { location.assign(paramsFor(new URL(form.action))); return; }
      shown = limit;
      dependentChoices();
      render();
    });
    more?.addEventListener('click', () => { shown += limit; render(); });
    root.addEventListener('catalog:updated', () => {
      inventory();
      dependentChoices();
      render();
    });
    inventory();
    readUrl();
    render();
  }

  document.querySelectorAll('[data-catalog-list], [data-server-catalog]').forEach(listing);
})();
