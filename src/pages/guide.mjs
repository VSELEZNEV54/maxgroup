// Гид «Как читать аукционный лист» (/aukcionnyj-list/): справочник оценок и обозначений японских аукционов.
// Тексты и словарь — data/content/guide.json (собран из source.auctionSheetGuide с maxgroupvl.ru).
import { html, esc, u, img, typo } from '../lib/core.mjs';
import { faqLd, articleLd, howToLd } from '../lib/seo.mjs';
import { icon, label, duo, btn, more, reveal, sectionHead, pageHead, faqList, linkBlock, ctaBand, note, card } from '../components/ui.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const pad = (n) => String(n).padStart(2, '0');
const isJa = (s) => /[぀-ヿ一-鿿]/.test(s);
/** Код обозначения: японский текст помечаем lang="ja", чтобы браузер взял правильные начертания иероглифов */
const code = (s, cls = '') => `<span class="${cls}"${isJa(s) ? ' lang="ja"' : ''} data-gl-c>${esc(s)}</span>`;

/** Плитка «код крупно + расшифровка» */
const codeTile = (x, { big = false } = {}) => html`
            <div class="code-tile${big ? ' code-tile--big' : ''}" data-gl>
              ${code(x.code, 'code-tile__c')}
              <span class="code-tile__m" data-gl-m>${typo(x.meaning)}</span>
            </div>`;

/** Таблица «обозначение → что означает» */
const codeTable = (head, items) => html`
          <div class="table-wrap gtable">
            <table class="table">
              <thead><tr><th>${esc(head[0])}</th><th>${esc(head[1])}</th></tr></thead>
              <tbody>${items.map((x) => `<tr data-gl><td>${code(x.code, 'gtable__c')}</td><td data-gl-m>${typo(x.meaning)}</td></tr>`)}</tbody>
            </table>
          </div>`;

/** Словарь в две колонки: код слева, перевод справа */
const gloss = (items) => html`
          <dl class="gloss">
            ${items.map((x) => `<div data-gl><dt>${code(x.code)}</dt><dd data-gl-m>${typo(x.meaning)}</dd></div>`)}
          </dl>`;

/** Шапка раздела справочника */
const secHead = (n, s) => html`
          <header class="gsec__head">
            <span class="gsec__num">${pad(n)}${s.label ? ` · ${esc(s.label)}` : ''}</span>
            <h2>${duo(s.title[0], s.title[1])}</h2>
            ${s.intro ? `<p class="gsec__intro">${typo(s.intro)}</p>` : ''}
          </header>`;

/** Условная схема листа с четырьмя зонами (иллюстрация к «карте чтения») */
function sheetSvg() {
  const badge = (n, x, y) => `<g class="sheet__badge"><circle cx="${x}" cy="${y}" r="11"/><text x="${x}" y="${y + 4}" text-anchor="middle">${n}</text></g>`;
  const specRows = [['КПП', 'FAT'], ['ПРИВОД', '4WD'], ['ПРОБЕГ', '37 000 km'], ['САЛОН', 'B'], ['ОПЦИИ', 'AAC · AW · NAVI']];
  return html`
            <svg class="sheet" viewBox="0 0 400 520" role="img" aria-label="Условная схема аукционного листа: общая оценка (1), схема кузова (2), салон и техника (3), комментарий инспектора (4)">
              <rect class="sheet__paper" x="0.5" y="0.5" width="399" height="519" rx="4"/>
              <g class="sheet__box">
                <rect x="14" y="14" width="92" height="52"/><text class="sheet__k" x="22" y="31">ЛОТ</text><text class="sheet__v" x="22" y="54">30417</text>
                <rect x="112" y="14" width="76" height="52"/><text class="sheet__k" x="120" y="31">ГОД</text><text class="sheet__v" x="120" y="54">2021</text>
                <rect x="194" y="14" width="82" height="52"/><text class="sheet__k" x="202" y="31">ОБЪЕМ</text><text class="sheet__v" x="202" y="54">1500</text>
              </g>
              <g class="sheet__zone" data-zone="1">
                <rect x="282" y="14" width="104" height="52"/>
                <text class="sheet__k" x="290" y="31">ОЦЕНКА</text><text class="sheet__grade" x="290" y="59">4.5</text>
              </g>
              <g class="sheet__zone" data-zone="3">
                <rect x="14" y="78" width="176" height="250"/>
                ${specRows.map(([k, v], i) => `${i ? `<line x1="14" x2="190" y1="${78 + i * 50}" y2="${78 + i * 50}"/>` : ''}<text class="sheet__k" x="22" y="${78 + i * 50 + 19}">${k}</text><text class="sheet__v" x="22" y="${78 + i * 50 + 39}">${v}</text>`)}
              </g>
              <g class="sheet__zone" data-zone="2">
                <rect x="202" y="78" width="184" height="250"/>
                <g class="sheet__car">
                  <rect x="256" y="98" width="76" height="210" rx="28"/>
                  <rect x="247" y="128" width="9" height="30" rx="3"/><rect x="332" y="128" width="9" height="30" rx="3"/>
                  <rect x="247" y="250" width="9" height="30" rx="3"/><rect x="332" y="250" width="9" height="30" rx="3"/>
                  <path d="M262 146q32-10 64 0M262 272q32 8 64 0"/>
                  <path d="M266 154h56l-6 22h-44zM272 242h44l6 20h-56z"/>
                  <rect x="272" y="176" width="44" height="66"/>
                  <path d="M256 176h16m44 0h16M256 209h16m44 0h16M256 242h16m44 0h16"/>
                </g>
                <g class="sheet__mark">
                  <text x="276" y="124">A1</text>
                  <text x="214" y="213">U2</text><path d="M234 209h22"/>
                  <text x="352" y="270">W1</text><path d="M332 266h16"/>
                  <text x="289" y="170">G</text>
                </g>
              </g>
              <g class="sheet__zone" data-zone="4">
                <rect x="14" y="340" width="372" height="166"/>
                <text class="sheet__k" x="22" y="359">КОММЕНТАРИЙ ИНСПЕКТОРА</text>
                <text class="sheet__jp" x="22" y="388" lang="ja">内装汚れ · 下廻りサビ</text>
                <rect class="sheet__bar" x="22" y="400" width="230" height="5"/><rect class="sheet__bar" x="22" y="414" width="310" height="5"/>
                <text class="sheet__jp" x="22" y="448" lang="ja">補修あと · ワンオーナー</text>
                <rect class="sheet__bar" x="22" y="460" width="190" height="5"/><rect class="sheet__bar" x="22" y="474" width="270" height="5"/><rect class="sheet__bar" x="22" y="488" width="150" height="5"/>
              </g>
              ${badge(1, 386, 14)}${badge(2, 386, 78)}${badge(3, 190, 78)}${badge(4, 386, 340)}
            </svg>`;
}

function guidePage(ctx) {
  const g = ctx.content.guide;
  const { site } = ctx;
  const crumbsList = [HOME, { name: 'Информация для клиентов', url: R.clients }, { name: g.h1, url: R.auctionSheet }];
  const japan = ctx.countryBySlug.japan;
  const auction = ctx.services.find((s) => s.slug === 'aukciony-yaponii');
  const helpBtn = (variant = 'dark', opts = {}) =>
    btn('Поможем разобрать лист', R.contacts, {
      variant,
      modal: 'request',
      subject: 'Разбор аукционного листа',
      ...opts,
      attrs: { 'data-modal-title': 'Поможем разобрать аукционный лист', 'data-modal-text': 'Оставьте контакты: менеджер свяжется с вами и подскажет, как передать фото листа или ссылку на лот.', 'data-modal-label': 'Аукционный лист' },
    });

  // реальные автомобили клиентов с аукционными оценками — примеры к справочнику
  const gradeDict = [...g.grades.numeric, ...g.grades.special];
  const real = ctx.cases
    .map((c) => ({ c, grade: c.specs?.['Аукционная оценка'] || c.specs?.['Общая оценка'] }))
    .filter((x) => x.grade)
    .map((x) => ({ ...x, meaning: gradeDict.find((d) => d.code === String(x.grade))?.meaning }));

  const toc = [
    ...[g.main, g.map, g.grades, g.interior, g.damage, g.gear, g.options, g.comments, g.remember].map((x, i) => ({ id: x.id, nav: x.nav, n: pad(i + 1) })),
    real.length ? { id: 'primery', nav: 'Оценки на реальных авто', n: '↓' } : null,
    { id: 'voprosy', nav: 'Вопросы и ответы', n: '↓' },
  ].filter(Boolean);

  // подборки именно японских автомобилей (срезы /avto-iz-yaponii/…): справочник — про лоты японских аукционов
  const selections = (ctx.slices || [])
    .filter((x) => x.country === 'japan' && x.count > 0 && ['do-160-ls', 'prohodnye-avto', 'krossovery', 'miniveny', 'polnyj-privod'].includes(x.slug))
    .map((x) => ({ name: `${x.name} ${japan.from}`, url: x.url }));
  const nextUrl = { catalog: R.country('japan'), auction: auction ? auction.url : R.services, calc: R.calculator };
  const zoneOf = (codeValue) => g.grades.zones.findIndex((z) => z.codes.includes(codeValue));
  // статьи блога по теме справочника (только те, что есть в ctx.posts)
  const posts = (g.posts?.items || []).map((slug) => ctx.posts.find((p) => p.slug === slug)).filter(Boolean).map((p) => ({ name: p.short || p.title, url: p.url }));
  // иллюстрация для разметки Article: фото автомобиля из блока «Оценки на реальных авто» либо картинка услуги аукционов
  const ldImage = real[0]?.c.image || `assets/${auction?.image || 'img/services/service-wheel.webp'}`;

  return {
    url: R.auctionSheet,
    type: 'guide',
    title: g.title,
    description: g.description,
    h1: g.h1,
    breadcrumbs: crumbsList,
    headerOver: true,
    ogType: 'article',
    published: g.published,
    modified: g.published,
    priority: 0.8,
    changefreq: 'monthly',
    jsonld: [
      articleLd(site, { title: g.h1, description: g.description, url: R.auctionSheet, image: ldImage, published: g.published, modified: g.published }),
      howToLd(site, { name: g.map.howToName, description: g.map.intro, steps: g.map.steps }),
      faqLd(g.faq),
    ].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs: crumbsList,
      label: g.label,
      h1: duo('Как читать', 'аукционный лист'),
      lead: g.lead,
      single: true,
      actions: btn('Найти обозначение', '#poisk', { variant: 'dark', iconName: 'search' }) + helpBtn('ghost'),
    })}

    <section class="section section--white guide-sec">
      <div class="container">
        <div class="guide">
          <aside class="guide__aside">
            <nav class="toc" aria-label="Содержание справочника" data-toc>
              ${label('Содержание')}
              <ol>
                ${toc.map((s) => `<li><a href="#${s.id}"><i aria-hidden="true">${s.n}</i><span>${esc(s.nav)}</span></a></li>`)}
              </ol>
              <div class="toc__cta">
                <p>Не нашли отметку или не уверены в лоте?</p>
                ${helpBtn('dark', { size: 'sm' })}
              </div>
            </nav>
          </aside>

          <article class="guide__body">
            <section class="gsearch" id="poisk" data-gsearch>
              <label class="gsearch__label" for="gsearch-input">${esc(g.search.title)}</label>
              <div class="gsearch__field">
                ${icon('search')}
                <input id="gsearch-input" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(g.search.placeholder)}" data-gsearch-input>
              </div>
              <p class="gsearch__hint" data-gsearch-hint>${typo(g.search.hint)}</p>
              <div class="gsearch__results" data-gsearch-results hidden aria-live="polite"></div>
              <p class="gsearch__empty" data-gsearch-empty hidden>${typo(g.search.empty)}</p>
            </section>

            <section class="gsec" id="${g.main.id}" data-gsec="${esc(g.main.nav)}">
              ${secHead(1, g.main)}
              <div class="codes codes--4">
                ${g.main.items.map((x) => codeTile(x))}
              </div>
              <div class="u-mt-5">${note(typo(g.main.note), { warn: true })}</div>
            </section>

            <section class="gsec" id="${g.map.id}" data-gsec="${esc(g.map.nav)}">
              ${secHead(2, g.map)}
              <div class="readmap">
                <figure class="readmap__sheet"${reveal()}>
                  ${sheetSvg()}
                  <figcaption>${typo(g.map.caption)}</figcaption>
                </figure>
                <ol class="readmap__steps">
                  ${g.map.steps.map(
                    (s, i) => html`
                  <li class="step step--light" data-zone-step="${i + 1}"${reveal(Math.min(i + 1, 4))}>
                    <div class="step__head"><span class="step__num">Шаг ${pad(i + 1)}</span><span class="step__num step__time">Зона ${i + 1}</span></div>
                    <h3 class="step__title">${typo(s.title)}</h3>
                    <p class="step__text">${typo(s.text)}</p>
                    <a class="link small" href="#${g.map.stepLinks[i]}">${esc(g.map.stepLinkText[i])}</a>
                  </li>`
                  )}
                </ol>
              </div>
            </section>

            <section class="gsec" id="${g.grades.id}" data-gsec="${esc(g.grades.nav)}">
              ${secHead(3, g.grades)}
              <div class="gscale"${reveal()}>
                ${g.grades.zones.map(
                  (z, zi) => html`
                <div class="gscale__zone gscale__zone--${zi + 1}" style="--n:${z.codes.length}">
                  <div class="gscale__cells">${z.codes.map((cv) => `<span>${esc(cv)}</span>`)}</div>
                  <p><b>${esc(z.name)}</b> ${typo(z.text)}</p>
                </div>`
                )}
              </div>
              <h3 class="gsec__sub">${esc(g.grades.numericTitle)}</h3>
              <div class="table-wrap gtable">
                <table class="table">
                  <thead><tr><th>Оценка</th><th>Что означает</th></tr></thead>
                  <tbody>${g.grades.numeric.map((x) => `<tr data-gl class="gtable__z${zoneOf(x.code) + 1}"><td>${code(x.code, 'gtable__c')}</td><td data-gl-m>${typo(x.meaning)}</td></tr>`)}</tbody>
                </table>
              </div>
              <h3 class="gsec__sub">${esc(g.grades.specialTitle)}</h3>
              <p class="gsec__text">${typo(g.grades.specialIntro)}</p>
              <div class="codes codes--3">
                ${g.grades.special.map((x) => codeTile(x))}
              </div>
            </section>

            <section class="gsec" id="${g.interior.id}" data-gsec="${esc(g.interior.nav)}">
              ${secHead(4, g.interior)}
              <div class="codes codes--5">
                ${g.interior.items.map((x) => codeTile(x, { big: true }))}
              </div>
            </section>

            <section class="gsec" id="${g.damage.id}" data-gsec="${esc(g.damage.nav)}">
              ${secHead(5, g.damage)}
              <h3 class="gsec__sub">${esc(g.damage.sizeTitle)}</h3>
              <p class="gsec__text">${typo(g.damage.sizeIntro)}</p>
              <div class="codes codes--3">
                ${g.damage.sizes.map((x) => codeTile(x, { big: true }))}
              </div>
              <div class="dgroups">
                ${g.damage.groups.map(
                  (grp) => html`
                <div class="dgroup">
                  <h3 class="dgroup__name">${esc(grp.name)}</h3>
                  <div class="codes">
                    ${grp.items.map((x) => codeTile(x))}
                  </div>
                </div>`
                )}
              </div>
            </section>

            <section class="gsec" id="${g.gear.id}" data-gsec="${esc(g.gear.nav)}">
              ${secHead(6, g.gear)}
              ${codeTable(['Сокращение', 'Что означает'], g.gear.items)}
            </section>

            <section class="gsec" id="${g.options.id}" data-gsec="${esc(g.options.nav)}">
              ${secHead(7, g.options)}
              ${gloss(g.options.items)}
            </section>

            <section class="gsec" id="${g.comments.id}" data-gsec="${esc(g.comments.nav)}">
              ${secHead(8, g.comments)}
              <div class="gaccs">
                ${g.comments.groups.map(
                  (grp, i) => html`
                <details class="acc gacc"${i === 0 ? ' open' : ''}>
                  <summary><h3>${esc(grp.title)}</h3><small>${grp.items.length}</small><i class="acc__icon" aria-hidden="true"></i></summary>
                  <div class="gacc__body">
                    ${grp.description ? `<p class="gsec__text">${typo(grp.description)}</p>` : ''}
                    ${gloss(grp.items)}
                  </div>
                </details>`
                )}
              </div>
            </section>

            <section class="gsec gsec--last" id="${g.remember.id}" data-gsec="${esc(g.remember.nav)}">
              ${secHead(9, g.remember)}
              <p class="gsec__statement">${typo(g.remember.text)}</p>
              <div class="gsec__help">
                <p>${typo(g.remember.help)}</p>
                ${helpBtn('primary')}
              </div>
            </section>
          </article>
        </div>
      </div>
      <script>
(function () {
  var doc = document;
  var box = doc.querySelector('[data-gsearch]');
  if (box) {
    var input = box.querySelector('[data-gsearch-input]');
    var out = box.querySelector('[data-gsearch-results]');
    var none = box.querySelector('[data-gsearch-empty]');
    var hint = box.querySelector('[data-gsearch-hint]');
    var index = [].map.call(doc.querySelectorAll('[data-gl]'), function (el) {
      var c = el.querySelector('[data-gl-c]');
      var m = el.querySelector('[data-gl-m]');
      var sec = el.closest('[data-gsec]');
      return c && m && sec ? { c: c.textContent.trim(), m: m.textContent.trim(), s: sec.getAttribute('data-gsec'), id: sec.id, el: el } : null;
    }).filter(Boolean);
    var norm = function (s) { return s.toLowerCase().replace(/ё/g, 'е').replace(/[\\u2013\\u2014]/g, '-').replace(/\\s+/g, ' ').trim(); };
    index.forEach(function (it) { it.nc = norm(it.c); it.nm = norm(it.m); });
    var esc = function (s) { return s.replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
    var run = function () {
      var q = norm(input.value);
      if (!q) { out.hidden = true; none.hidden = true; hint.hidden = false; out.innerHTML = ''; return; }
      var hits = index.map(function (it) {
        var parts = it.nc.split(/[\\s\\/]+/);
        var score = it.nc === q || parts.indexOf(q) > -1 ? 0 : it.nc.indexOf(q) === 0 ? 1 : it.nc.indexOf(q) > -1 ? 2 : q.length > 1 && it.nm.indexOf(q) > -1 ? 3 : -1;
        return { it: it, score: score };
      }).filter(function (h) { return h.score > -1; }).sort(function (x, y) { return x.score - y.score; }).slice(0, 24);
      hint.hidden = true;
      none.hidden = hits.length > 0;
      out.hidden = hits.length === 0;
      out.innerHTML = hits.map(function (h, i) {
        return '<a class="gsearch__hit" href="#' + h.it.id + '" data-hit="' + index.indexOf(h.it) + '"><b>' + esc(h.it.c) + '</b><span>' + esc(h.it.m) + '</span><small>' + esc(h.it.s) + '</small></a>';
      }).join('');
    };
    input.addEventListener('input', run);
    out.addEventListener('click', function (e) {
      var link = e.target.closest('[data-hit]');
      if (!link) return;
      var it = index[+link.getAttribute('data-hit')];
      if (!it) return;
      var d = it.el.closest('details');
      if (d) d.open = true;
      e.preventDefault();
      it.el.scrollIntoView({ block: 'center' });
      it.el.classList.remove('is-found');
      void it.el.offsetWidth;
      it.el.classList.add('is-found');
    });
  }
  var toc = doc.querySelector('[data-toc]');
  if (toc && 'IntersectionObserver' in window) {
    var links = [].slice.call(toc.querySelectorAll('a[href^="#"]'));
    var map = {};
    links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.removeAttribute('aria-current'); });
        var l = map[en.target.id];
        if (l) l.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var el = doc.getElementById(id); if (el) io.observe(el); });
  }
})();
      </script>
    </section>

    ${real.length
      ? html`
    <section class="section section--white" id="primery">
      <div class="container">
        ${sectionHead({ label: g.real.label, title: duo(g.real.title[0], g.real.title[1]), lead: g.real.lead, actions: more('Все привезенные авто', R.cases) })}
        <div class="real-grid">
          ${real.map(
            ({ c, grade, meaning }, i) => html`
          <a class="real-tile" href="${u(c.url)}"${reveal(Math.min(i, 4))}>
            <span class="real-tile__top">
              <span class="real-tile__grade">${esc(grade)}</span>
              <span class="real-tile__thumb">${img({ src: c.image, alt: `${c.name}, автомобиль с аукционной оценкой ${grade}`, sizes: '72px', attrs: c.imageFocus ? { style: `object-position:${c.imageFocus}` } : {} })}</span>
            </span>
            <span class="real-tile__meaning">${meaning ? typo(meaning) : 'аукционная оценка'}</span>
            <span class="real-tile__foot">
              <span class="real-tile__car">${esc(c.name)}</span>
              <span class="real-tile__meta"><span>${[c.specs?.['Пробег'] ? `Пробег ${c.specs['Пробег']}` : null, c.specs?.['Салон'] ? `салон ${c.specs['Салон']}` : null, c.statusLabel].filter(Boolean).map(esc).join(' · ')}</span>${icon('arrow')}</span>
            </span>
          </a>`
          )}
        </div>
      </div>
    </section>`
      : ''}

    <section class="section" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label(g.faqHead.label)}
            <h2>${duo(g.faqHead.title[0], g.faqHead.title[1])}</h2>
            <p class="lead">${typo(g.faqHead.lead)}</p>
            ${more('Все вопросы об импорте', R.faq)}
          </div>
          <div class="split__body">${faqList(g.faq)}</div>
        </div>
      </div>
    </section>

    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: g.next.label, title: duo(g.next.title[0], g.next.title[1]), lead: g.next.lead })}
        <div class="next-grid">
          <article class="svc on-dark next-grid__main"${reveal()}>
            <div class="svc__bg">${img({ src: 'assets/' + (auction?.image || 'img/services/service-wheel.webp'), alt: '', sizes: '(max-width: 900px) 100vw, 58vw' })}</div>
            <div class="svc__top">
              ${label(g.next.cards[1].label)}
              <span class="svc__arrow" aria-hidden="true">${icon('arrow')}</span>
            </div>
            <div>
              <h3 class="svc__title"><a href="${u(nextUrl.auction)}">${esc(g.next.cards[1].title)}</a></h3>
              <p class="svc__text">${typo(g.next.cards[1].text)}</p>
            </div>
          </article>
          <div class="next-grid__side">
            ${[g.next.cards[0], g.next.cards[2]].map((x, i) => card({ icon: x.icon, label: x.label, title: x.title, text: x.text, href: nextUrl[x.key], tall: true, i: i + 1, foot: `<span class="more">Перейти</span>` }))}
          </div>
        </div>
        <div class="u-mt-7">
          ${linkBlock('Автомобили с японских аукционов', [{ name: `Авто ${japan.from}`, url: R.country('japan') }, ...ctx.brandsOf('japan').slice(0, 10).map((b) => ({ name: `${b.name} ${japan.from}`, url: b.url })), ...selections.map((s) => ({ name: s.name, url: s.url }))])}
          ${linkBlock(g.posts?.title || 'Статьи по теме', posts)}
          ${linkBlock('Полезное', [{ name: 'Как заказать автомобиль', url: R.howTo }, { name: 'Привезенные авто', url: R.cases }, { name: 'Калькулятор стоимости', url: R.calculator }, { name: 'Доставка по России', url: R.delivery }, { name: 'Вопросы и ответы', url: R.faq }, { name: 'Отзывы клиентов', url: R.reviews }, { name: 'Блог', url: R.blog }])}
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { label: g.cta.label, title: duo(g.cta.title[0], g.cta.title[1]), text: g.cta.text, subject: 'Разбор аукционного листа', bg: 'assets/img/hero/gclass-close.webp', fields: ['name', 'phone', 'car'], cta: g.cta.cta, panelTitle: g.cta.panelTitle, panelText: g.cta.panelText })}`,
  };
}

export function guidePages(ctx) {
  if (!ctx.content.guide) return [];
  return [guidePage(ctx)];
}
