// Рубрика и поисковый запрос действуют одновременно, включая первую крупную статью.
(function () {
  const root = document.querySelector('[data-blog]');
  const search = root?.querySelector('[data-blog-search]');
  if (!search) return;

  const chips = Array.from(root.querySelectorAll('.blog-filter [data-cat]'));
  const counter = root.querySelector('[data-blog-count]');
  const empty = root.querySelector('[data-blog-empty]');
  const normalize = (text) => text.toLowerCase().replace(/ё/g, 'е').replace(/\u2060/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const articles = Array.from(root.querySelectorAll('[data-post]'), (card) => ({
    card,
    text: normalize([card.dataset.topics, card.querySelector('h3').textContent,
      card.querySelector('.post__text, .blog-lead__text')?.textContent || '',
      card.querySelector('.post__meta, .blog-lead__top')?.textContent || ''].join(' ')),
  }));
  const plural = new Intl.PluralRules('ru');
  const nouns = { one: 'статья', few: 'статьи', many: 'статей', other: 'статьи' };
  let category = '';

  function apply() {
    const words = normalize(search.value).split(' ').filter(Boolean);
    const filtered = Boolean(category || words.length);
    let count = 0;
    for (const { card, text } of articles) {
      const matches = (!category || card.dataset.cat === category) && words.every((word) => text.includes(word));
      card.hidden = !matches;
      if (matches) {
        count++;
        if (filtered) card.classList.add('is-in');
      }
    }
    root.classList.toggle('is-filtered', filtered);
    empty.hidden = count > 0;
    counter.textContent = count + ' ' + nouns[plural.select(count)];
  }

  function selectCategory(id) {
    category = chips.some((chip) => chip.dataset.cat === id) ? id : '';
    for (const chip of chips) {
      const selected = chip.dataset.cat === category;
      chip.setAttribute('aria-pressed', String(selected));
      if (selected) {
        const row = chip.parentElement;
        const offset = chip.getBoundingClientRect().left - row.getBoundingClientRect().left;
        if (offset < 0 || offset + chip.offsetWidth > row.clientWidth) row.scrollLeft += offset - 16;
      }
    }
    apply();
  }

  for (const chip of chips) chip.addEventListener('click', () => {
    selectCategory(chip.dataset.cat);
    history.replaceState(null, '', location.pathname + location.search + (category ? '#' + category : ''));
  });
  search.addEventListener('input', apply);
  root.querySelector('[data-blog-reset]').addEventListener('click', () => {
    search.value = '';
    chips[0].click();
    search.focus();
  });
  function readHash() {
    selectCategory(location.hash.slice(1));
    if (category) root.scrollIntoView({ block: 'start' });
  }
  readHash();
  window.addEventListener('hashchange', readHash);
})();
