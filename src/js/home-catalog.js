// На главной страна и подборка фильтруют одну сетку. Без JS ссылки ведут в каталоги.
(() => {
  const section = document.querySelector('[data-home-catalog]');
  if (!section) return;

  const grid = section.querySelector('#home-cars');
  const controls = section.querySelectorAll('[data-home-country], [data-home-selection]');
  const cards = Array.from(grid.children);
  const compact = window.matchMedia('(min-width: 901px) and (max-width: 1180px)');
  const status = section.querySelector('[data-home-status]');
  const empty = section.querySelector('[data-home-empty]');
  let country = 'all';
  let selection = '';

  function render() {
    const limit = compact.matches ? 6 : 8;
    let total = 0;
    for (const card of cards) {
      const matches = (country === 'all' || card.dataset.country === country) &&
        (!selection || card.dataset.selections.split(' ').includes(selection));
      if (matches) total++;
      card.hidden = !matches || total > limit;
    }
    for (const control of controls) {
      const pressed = control.dataset.homeCountry === country || control.dataset.homeSelection === selection;
      control.setAttribute('aria-pressed', String(pressed));
    }
    grid.hidden = total === 0;
    empty.hidden = total > 0;
    status.textContent = total ? 'Показано ' + Math.min(limit, total) + ' из ' + total : empty.querySelector('p').textContent;
  }

  for (const control of controls) {
    control.setAttribute('role', 'button');
    control.setAttribute('aria-controls', grid.id);
    control.addEventListener('click', (event) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (control.hasAttribute('data-home-country')) country = control.dataset.homeCountry;
      else selection = selection === control.dataset.homeSelection ? '' : control.dataset.homeSelection;
      render();
      grid.scrollLeft = 0;
    });
    control.addEventListener('keydown', (event) => {
      if (event.key !== ' ') return;
      event.preventDefault();
      if (!event.repeat) control.click();
    });
  }

  section.querySelector('[data-home-reset]').addEventListener('click', () => {
    country = 'all';
    selection = '';
    render();
    section.querySelector('[data-home-country="all"]').focus({ preventScroll: true });
  });
  compact.addEventListener('change', render);
  render();
})();
