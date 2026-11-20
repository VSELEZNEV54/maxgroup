// Полоса прогресса чтения, подсветка текущего раздела в оглавлении, сворачивание оглавления на мобайле,
// режим таблиц из трех-четырех колонок: помещается в экран — остается как есть, не помещается — листается (table-wrap--wide).
(function () {
  var art = document.querySelector('[data-article] .article-main');
  var bar = document.querySelector('[data-article-progress] i');
  var toc = document.querySelector('[data-toc]');
  var mobile = window.matchMedia('(max-width: 900px)');
  var contact = document.querySelector('[data-article-contact]');
  if (contact) {
    var syncContact = function () { contact.open = !mobile.matches; };
    syncContact();
    mobile.addEventListener('change', syncContact);
  }
  if (toc) {
    var sum = toc.querySelector('summary');
    // на десктопе оглавление всегда раскрыто: заголовок не кнопка и не получает фокус
    var syncToc = function () { toc.open = !mobile.matches; if (mobile.matches) sum.removeAttribute('tabindex'); else sum.setAttribute('tabindex', '-1'); };
    syncToc();
    sum.addEventListener('click', function (e) { if (!mobile.matches) e.preventDefault(); });
    toc.addEventListener('click', function (e) { if (mobile.matches && e.target.closest('a')) toc.open = false; });
    if (mobile.addEventListener) mobile.addEventListener('change', syncToc);
  }
  var fitTables = [].slice.call(document.querySelectorAll('[data-article] .table-wrap[data-table-fit]'));
  var refit = function () {
    fitTables.forEach(function (w) {
      w.classList.remove('table-wrap--wide');
      if (w.scrollWidth > w.clientWidth) w.classList.add('table-wrap--wide');
    });
  };
  if (fitTables.length) {
    refit();
    window.addEventListener('load', refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  }
  var links = {};
  var heads = [];
  if (toc && art) {
    [].forEach.call(toc.querySelectorAll('a[href^="#"]'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
    heads = [].filter.call(art.querySelectorAll('h2[id]'), function (h) { return links[h.id]; });
  }
  var current = null;
  var tick = false;
  var paint = function () {
    tick = false;
    if (art && bar) {
      var r = art.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var done = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / Math.max(1, total)));
      bar.style.transform = 'scaleX(' + done.toFixed(4) + ')';
    }
    var cur = null;
    for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < window.innerHeight * 0.4) cur = heads[i].id; else break; }
    if (cur !== current) {
      if (current && links[current]) links[current].removeAttribute('aria-current');
      if (cur && links[cur]) links[cur].setAttribute('aria-current', 'true');
      current = cur;
    }
  };
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(paint); } }, { passive: true });
  // режим таблиц пересчитываем только при смене ширины: на телефоне resize приходит и когда прячется адресная строка
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () { paint(); if (window.innerWidth !== lastW) { lastW = window.innerWidth; refit(); } });
  paint();
})();
