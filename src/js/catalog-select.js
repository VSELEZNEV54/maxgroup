// Один интерфейс для списков сайта. Значение, валидация и отправка остаются у select.
(() => {
  'use strict';
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  const numbers = new Intl.NumberFormat('ru-RU');
  const aliases = {
    toyota: 'тойота тайота', honda: 'хонда', nissan: 'ниссан нисан', mazda: 'мазда',
    subaru: 'субару', suzuki: 'сузуки', mitsubishi: 'митсубиси мицубиси', daihatsu: 'дайхатсу дайхацу',
    lexus: 'лексус', kia: 'киа кия', hyundai: 'хендай хёндай хенде', genesis: 'генезис дженезис',
    bmw: 'бмв', 'mercedes-benz': 'мерседес бенц', volkswagen: 'фольксваген', audi: 'ауди',
    geely: 'джили', chery: 'чери', haval: 'хавал хавейл', byd: 'бид бивайди',
  };
  const normalize = (s) => s.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]/gu, '');
  const caption = (o) => o.value && o.hasAttribute('data-count')
    ? o.textContent + ' (' + numbers.format(Number(o.dataset.count)) + ')' : o.label;
  let opened;

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    el.className = cls;
    if (text) el.textContent = text;
    return el;
  }

  function picture(src, cls) {
    const img = make('img', cls);
    img.alt = '';
    img.src = src;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function itemFor(option) {
    const data = option.dataset;
    const item = make('div', 'catalog-select__option');
    item.dataset.value = option.value;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.selected));
    if (data.photo) {
      item.classList.add('catalog-select__generation');
      const description = make('div', 'catalog-select__caption');
      description.append(make('strong', 'catalog-select__years', data.years));
      if (data.codes) {
        const codes = make('span', 'catalog-select__codes', data.codes);
        codes.title = data.codes;
        description.append(codes);
      }
      description.append(make('span', 'catalog-select__edition', data.edition));
      item.append(picture(data.photo, 'catalog-select__photo'), description);
      item.setAttribute('aria-label', option.textContent + (data.codes ? ', ' + data.codes : ''));
    } else {
      if (data.logo) item.append(picture(data.logo, 'catalog-select__logo'));
      item.append(make('span', 'catalog-select__text', caption(option)));
    }
    return item;
  }

  function enhance(field) {
    const select = field.querySelector('select');
    const trigger = field.querySelector('[role="combobox"]');
    const shell = field.querySelector('[data-select-shell]');
    const menu = field.querySelector('[role="listbox"]');
    const status = field.querySelector('[data-select-status]');
    const label = field.querySelector('label');
    const search = field.hasAttribute('data-search');
    const vehicle = field.hasAttribute('data-allow-custom');
    const brand = field.classList.contains('catalog-select--brand');
    const logo = search && shell.querySelector('img');
    const value = trigger.querySelector('.catalog-select__value');
    let items = [], active = -1, query = '', exact;
    let prefix = '', lastKey = 0;

    function sync() {
      const option = select.selectedOptions[0];
      trigger.disabled = select.disabled;
      if (!menu.hidden) { close(); return; }
      if (search) {
        trigger.value = option ? caption(option) : '';
        trigger.placeholder = '';
        if (logo) {
          const src = option?.dataset.logo;
          if (src) logo.setAttribute('src', src);
          logo.hidden = !src;
        }
      } else {
        value.replaceChildren();
        if (option?.dataset.logo) value.append(picture(option.dataset.logo, 'catalog-select__logo'));
        value.append(make('span', 'catalog-select__text', option ? caption(option) : ''));
      }
      if (select.validity.valid) trigger.removeAttribute('aria-invalid');
    }

    function close() {
      if (menu.hidden) return;
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      field.classList.remove('is-open', 'opens-up');
      status.textContent = '';
      opened = null;
      sync();
    }

    function mark(index, scroll = true) {
      items[active]?.classList.remove('is-active');
      active = Math.min(index, items.length - 1);
      const item = items[active];
      if (!item) { trigger.removeAttribute('aria-activedescendant'); return; }
      item.classList.add('is-active');
      trigger.setAttribute('aria-activedescendant', item.id);
      if (!scroll) return;
      const offset = item.getBoundingClientRect().top - menu.getBoundingClientRect().top;
      if (offset < 0) menu.scrollTop += offset;
      else if (offset + item.offsetHeight > menu.clientHeight) menu.scrollTop += offset + item.offsetHeight - menu.clientHeight;
    }

    function place() {
      const bounds = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const bottom = top + (viewport?.height || window.innerHeight);
      const dialog = field.closest('dialog[open]')?.getBoundingClientRect();
      const below = Math.min(bottom, dialog?.bottom ?? bottom) - bounds.bottom - 12;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
      const ceiling = dialog ? Math.max(top, dialog.top) : top + header;
      const above = bounds.top - ceiling - 6;
      const up = below < Math.min(menu.scrollHeight, 250) && above > below;
      field.classList.toggle('opens-up', up);
      menu.style.setProperty('--trigger-height', bounds.height + 'px');
      menu.style.setProperty('--menu-space', Math.max(44, up ? above : below) + 'px');
    }

    function draw() {
      const typed = query.trim();
      const needle = normalize(typed);
      let options = Array.from(select.options).filter((o) => !o.hidden && !o.disabled);
      if (vehicle) options.sort((a, b) => Number(!!a.value) - Number(!!b.value)
        || Number(b.dataset.count || 0) - Number(a.dataset.count || 0) || collator.compare(a.textContent, b.textContent));
      exact = undefined;
      if (typed) {
        options = options.filter((o) => {
          if (!o.value) return false;
          const aliasesForMake = brand && Object.hasOwn(aliases, o.value) ? aliases[o.value].split(' ') : [];
          const names = [o.textContent, o.value, ...aliasesForMake].map(normalize);
          if (names.includes(needle) || caption(o).toLowerCase() === typed.toLowerCase()) exact = o;
          return o === exact || (needle && names.some((n) => n.includes(needle)));
        });
      }
      let popular = 0;
      items = options.map((option) => {
        const item = itemFor(option);
        if (vehicle && !typed && option.value && Number(option.dataset.count) > 0 && popular < 6) {
          item.classList.add('is-popular');
          popular++;
        }
        return item;
      });
      if (vehicle && typed && !exact) {
        const item = make('div', 'catalog-select__option catalog-select__custom', 'Указать «' + typed + '»');
        item.dataset.value = typed;
        item.dataset.custom = '';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        items.push(item);
      }
      items.forEach((item, i) => { item.id = menu.id + '-' + i; });
      menu.replaceChildren(...items);
      if (!items.length) menu.append(make('div', 'catalog-select__empty', 'Ничего не найдено'));
      status.textContent = typed ? 'Найдено вариантов: ' + options.length : '';
      active = -1;
      menu.scrollTop = 0;
      const initial = options.indexOf(typed ? exact : select.selectedOptions[0]);
      mark(Math.max(initial, 0), !search);
      place();
    }

    function open(initial = '') {
      if (trigger.disabled || !menu.hidden) return;
      opened?.close();
      query = initial;
      if (search) {
        trigger.placeholder = brand ? 'Введите марку' : vehicle ? 'Введите модель' : 'Введите для поиска';
        trigger.value = query;
        if (logo) logo.hidden = true;
      }
      field.classList.add('is-open');
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      opened = { field, close, finish, place };
      draw();
    }

    function choose(item) {
      if (!item) return;
      const val = item.dataset.value;
      const changed = select.value !== val;
      if (item.hasAttribute('data-custom')) {
        let own = Array.from(select.options).find((o) => o.hasAttribute('data-custom') && o.value === val);
        if (!own) {
          own = new Option(val, val);
          own.dataset.custom = '';
          own.dataset.count = '0';
          select.add(own);
        }
        own.disabled = own.hidden = false;
        own.selected = true;
      } else {
        const option = Array.from(select.options).find((o) => o.value === val && !o.hidden && !o.disabled);
        if (option) option.selected = true;
      }
      close();
      if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function finish() {
      if (menu.hidden) return;
      if (search && query.trim() && (exact || (items.length === 1 && items[0].hasAttribute('data-custom')))) {
        choose(exact ? items.find((item) => item.dataset.value === exact.value) : items[0]);
      } else close();
    }

    trigger.addEventListener('click', () => { if (menu.hidden) open(); else if (!search) close(); });
    if (search) {
      trigger.addEventListener('focus', () => { if (menu.hidden) trigger.select(); });
      trigger.addEventListener('input', (e) => {
        e.stopPropagation();
        query = trigger.value;
        if (menu.hidden) open(query);
        else draw();
      });
      trigger.addEventListener('change', (e) => e.stopPropagation());
    }
    menu.addEventListener('mousedown', (e) => e.preventDefault());
    menu.addEventListener('click', (e) => choose(e.target.closest('[role="option"]')));
    trigger.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Tab') { finish(); return; }
      if (e.key === 'Escape' && !menu.hidden) {
        e.preventDefault(); e.stopPropagation(); close(); return;
      }
      if (e.key === 'Enter' || (!search && e.key === ' ')) {
        e.preventDefault(); e.stopPropagation();
        if (menu.hidden) open(); else choose(items[active]);
        return;
      }
      const typed = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (typed && search) { if (menu.hidden) open(); return; }
      const nav = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!typed && !nav.includes(e.key)) return;
      if (search && ['Home', 'End'].includes(e.key) && query) return;
      e.preventDefault();
      const wasClosed = menu.hidden;
      open();
      if (typed) {
        const now = Date.now();
        prefix = (now - lastKey > 650 ? '' : prefix) + normalize(e.key);
        lastKey = now;
        const i = items.findIndex((o) => normalize(o.textContent).startsWith(prefix));
        if (i >= 0) mark(i);
      } else if (e.key === 'Home') mark(0);
      else if (e.key === 'End') mark(items.length - 1);
      else if (!wasClosed) mark(Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
    });
    trigger.addEventListener('blur', finish);
    select.addEventListener('change', sync);
    select.addEventListener('invalid', (e) => {
      e.preventDefault();
      trigger.setAttribute('aria-invalid', 'true');
      trigger.focus();
      open();
      status.textContent = select.validationMessage;
    });
    select.closest('form')?.addEventListener('reset', () => setTimeout(sync));
    (select.closest('form') || field).addEventListener('select:sync', sync);
    field.closest('[data-catalog-list], [data-server-catalog]')?.addEventListener('catalog:choices', sync);
    select.hidden = true;
    label.htmlFor = trigger.id;
    if (select.required) trigger.setAttribute('aria-required', 'true');
    shell.hidden = false;
    sync();
  }

  document.addEventListener('pointerdown', (e) => {
    if (opened && !opened.field.contains(e.target)) opened.finish();
  });
  window.addEventListener('resize', () => opened?.place());
  window.visualViewport?.addEventListener('resize', () => opened?.place());
  document.querySelectorAll('[data-catalog-select]').forEach(enhance);
})();
