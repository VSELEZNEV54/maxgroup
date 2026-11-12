// Блог: индекс /blog/ и статьи /blog/<slug>/.
// Статьи лежат в content/blog/*.md (front matter + Markdown), читаются в src/data/index.mjs → ctx.posts.
// Правила front matter и разметки — в комментарии внизу файла и в отчете раздела.
import { html, esc, u, img, typo, dateRu, count, cx, slugify, abs } from '../lib/core.mjs';
import { articleLd, itemListLd, faqLd } from '../lib/seo.mjs';
import { icon, label, duo, btn, more, reveal, sectionHead, pageHead, crumbs, carCard, faqList, rail, ctaBand } from '../components/ui.mjs';
import { postCard } from './home.mjs';
import { R } from '../routes.mjs';

const HOME = { name: 'Главная', url: R.home };
const BLOG = { name: 'Блог', url: R.blog };
const ART = ['статья', 'статьи', 'статей'];

/** Рубрики в порядке показа; неизвестная рубрика из front matter добавится в конец сама */
const CATEGORIES = ['Таможня и расчеты', 'Аукционы и проверка', 'Страны и модели', 'Доставка и документы'];

const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const catId = (c) => slugify(c || 'blog') || 'blog';
const catUrl = (c) => `${R.blog}#${catId(c)}`;
const modified = (p) => (p.updated && p.updated > p.date ? p.updated : p.date);

/** Порядок ленты задает поле order во front matter (1…N); статьи без него встают в конец по slug */
const ord = (p) => (p.order !== undefined && p.order !== '' && Number.isFinite(+p.order) ? +p.order : 1e6);
const ordered = (ctx) => [...ctx.posts].sort((x, y) => ord(x) - ord(y) || x.slug.localeCompare(y.slug));

/** Автор статей — редакция (организация): без фото, телефонов и биографий сотрудников; ссылка ведет на «О компании» */
const EDITORIAL = 'Редакция Макс Групп';
const authorName = (p) => p.author || EDITORIAL;

/** Запрет переноса строки после косой черты («ж/д») и после тире в числовом диапазоне («60-95») */
const glue = (t) => String(t).replace(/(\S)\/(?=\S)/g, '$1/\u2060').replace(/(?<![\d-])(\d{1,4})-(?=\d{1,4}(?![\d-]))/g, '$1-\u2060').replace(/(\d)-(?=[а-яё])/gi, '$1-\u2060');

/** Заголовок статьи двухтонный: до двоеточия — черным, после — серым */
function titleDuo(title) {
  const i = title.indexOf(':');
  const part = (t) => glue(esc(t));
  return i > 0 && i < title.length - 1 ? duo(part(title.slice(0, i + 1)), part(title.slice(i + 1).trim())) : typo(part(title));
}

/** Короткое имя статьи для хлебных крошек */
const shortTitle = (p) => p.short || p.title.split(':')[0].trim();

/** object-position обложки из front matter (coverFocus: 50% 60%) */
const focus = (p) => (p.coverFocus && /^[\d.%\s a-z]+$/i.test(p.coverFocus) ? { style: `object-position:${p.coverFocus}` } : {});

const time = (iso) => `<time datetime="${esc(iso)}">${dateRu(iso)}</time>`;

// --- связь статьи с каталогом: теги ↔ подборки и страны ---------------------------------------------

/** Теги статьи, совпавшие с подборками (по названию или slug) и странами (по названию или slug) */
function matchTags(ctx, tags) {
  const out = [];
  for (const tag of arr(tags)) {
    const t = norm(tag);
    const cn = ctx.countries.find((c) => [c.slug, c.name, c.navTitle].some((x) => norm(x) === t));
    if (cn) { out.push({ kind: 'country', country: cn.slug, name: `Авто ${cn.from}`, url: R.country(cn.slug), test: (car) => car.country === cn.slug }); continue; }
    const s = ctx.selections.find((x) => norm(x.slug) === t || norm(x.name) === t);
    if (s && s.count > 0 && s.url) out.push({ kind: 'selection', name: s.name, url: s.url, test: s.test, slices: s.slices || [] });
  }
  return out;
}

/** Ссылки в каталог по тегам: страны, подборки и их пересечения — страновые срезы («Авто из Японии до 160 л.с.») */
function catalogLinksOf(matched) {
  const countries = matched.filter((m) => m.kind === 'country');
  const sels = matched.filter((m) => m.kind === 'selection');
  const slices = countries.length === 1 ? sels.map((m) => m.slices.find((x) => x.country === countries[0].country)).filter(Boolean).map((x) => ({ name: x.h1, url: x.url })) : [];
  const seen = new Set();
  return [...slices, ...sels.map((m) => ({ name: m.name, url: m.url })), ...countries.map((m) => ({ name: m.name, url: m.url })), { name: 'Весь каталог', url: R.catalog }].filter((l) => (seen.has(l.url) ? false : seen.add(l.url)));
}

/** До n автомобилей по теме статьи: страны объединяются, подборки сужают выборку (пока в ней остается хотя бы n машин) */
function pickCars(ctx, matched, n = 4) {
  if (!ctx.cars.length || !matched.length) return [];
  const countries = matched.filter((m) => m.kind === 'country');
  let pool = countries.length ? ctx.cars.filter((c) => countries.some((m) => m.test(c))) : ctx.cars;
  for (const m of matched.filter((x) => x.kind === 'selection')) {
    const narrowed = pool.filter(m.test);
    if (narrowed.length >= n) pool = narrowed;
  }
  // только машины с фото, полной ценой и без пометки «мощность требует подтверждения» (data/car-flags.json);
  // сначала машины с обычным профилем доставки, затем по цене
  const rank = (c) => (c.sanctionBadge ? 1 : 0);
  pool = pool.filter((c) => c.priceRub && c.photos.length && !c.priceIsPartial && !c.powerDoubt).sort((x, y) => rank(x) - rank(y) || x.priceRub - y.priceRub);
  // по одной машине на модель, страны по кругу — чтобы блок не состоял из четырех одинаковых авто
  const seen = new Set();
  const uniq = pool.filter((c) => (seen.has(c.modelUrl) ? false : seen.add(c.modelUrl)));
  const groups = ['japan', 'korea', 'china'].map((cn) => uniq.filter((c) => c.country === cn));
  const out = [];
  for (let i = 0; out.length < n && i < 60; i++) for (const g of groups) if (g[i] && out.length < n) out.push(g[i]);
  return out.length >= 2 ? out : [];
}

// --- разбор HTML статьи --------------------------------------------------------------------------------

/** Типографика в готовом HTML статьи: неразрывные пробелы в текстовых узлах (теги и атрибуты не трогаем) */
const nbsp = (t) =>
  glue(
    typo(t)
      .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0') // разряды: 1 073 627
      .replace(/(\d) (?=[$¥€₽%])/g, '$1\u00a0') // число и знак валюты
      .replace(/(тыс\.|млн|млрд) (?=[$¥€₽])/g, '$1\u00a0') // «83 тыс. ₽»
      .replace(/(\d) (?=(?:см³|кВт|вон|юан|иен|л\.с\.|км|месяц|недел|литр))/g, '$1\u00a0')
  );
const polish = (src) => String(src).replace(/>([^<>]+)</g, (m, text) => `>${nbsp(text)}<`);

/** Текст без тегов и служебных символов типографики — для микроразметки */
const plain = (t) => String(t).replace(/<[^>]+>/g, ' ').replace(/\u2060/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const unesc = (t) => String(t).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Абзац из одной картинки — ![подпись](/assets/img/…) — становится <figure> с размерами, srcset и подписью */
const figures = (src) =>
  src.replace(/<p><img src="([^"]+)" alt="([^"]*)" loading="lazy"><\/p>/g, (m, path, alt) => {
    const rel = path.replace(/^(?:\.\.\/)+/, '').replace(/^\//, '');
    return `<figure class="article-figure">${img({ src: rel, alt: unesc(alt), sizes: '(max-width: 900px) 100vw, 58vw' })}${alt ? `<figcaption>${typo(alt)}</figcaption>` : ''}</figure>`;
  });

/**
 * Таблицы статьи. Область прокрутки названа по заголовкам колонок (роль и фокус с клавиатуры ставит main.js, когда
 * таблица действительно листается). На телефоне таблицы от пяти колонок листаются по горизонтали с закрепленной
 * первой колонкой (класс table-wrap--wide). Таблицы из трех-четырех колонок помещаются в экран, если хватает ширины
 * (data-table-fit): когда не хватает, скрипт статьи переводит их в тот же режим прокрутки.
 */
const tables = (src) =>
  src.replace(/<div class="table-wrap">(<table class="table"><thead><tr>([\s\S]*?)<\/tr><\/thead>)/g, (m, open, head) => {
    const cols = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((x) => plain(x[1]));
    return `<div class="${cx('table-wrap', cols.length > 4 && 'table-wrap--wide')}"${cols.length === 3 || cols.length === 4 ? ' data-table-fit' : ''} aria-label="Таблица: ${esc(cols.join(', '))}">${open}`;
  });

/**
 * Раздел «Частые вопросы» (h2) с вопросами в h3 превращается в аккордеон и микроразметку FAQPage.
 * Возвращает { body, faqTitle, faqId, faq: [{q, a}] }.
 */
function splitFaq(src) {
  const m = src.match(/<h2 id="([^"]*)">((?:Частые вопросы|Вопросы и ответы|FAQ)[^<]*)<\/h2>/i);
  if (!m) return { body: src, faq: [] };
  const start = m.index;
  const rest = src.slice(start + m[0].length);
  const next = rest.search(/<h2[\s>]/);
  const block = next === -1 ? rest : rest.slice(0, next);
  const tail = next === -1 ? '' : rest.slice(next);
  const faq = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[\s>]|$)/g;
  let q;
  while ((q = re.exec(block))) {
    const a = q[2].trim();
    if (a) faq.push({ q: plain(q[1]), a });
  }
  if (!faq.length) return { body: src, faq: [] };
  return { body: src.slice(0, start), tail, faqId: m[1], faqTitle: m[2], faq };
}

/** Делит текст на две части перед средним h2 — между ними встает блок калькулятора */
function splitMiddle(src) {
  const idx = [...src.matchAll(/<h2[\s>]/g)].map((m) => m.index);
  if (idx.length < 4) return [src, ''];
  const at = idx[Math.ceil(idx.length / 2)];
  return [src.slice(0, at), src.slice(at)];
}

// --- блоки ---------------------------------------------------------------------------------------------

function calcBanner() {
  return html`
            <aside class="article-calc on-dark" aria-label="Калькулятор стоимости">
              <div class="article-calc__bg">${img({ src: 'assets/img/services/service-car.webp', alt: '', sizes: '(max-width: 900px) 100vw, 60vw' })}</div>
              <div class="article-calc__copy">
                ${label('Калькулятор')}
                <p class="article-calc__title">Посчитайте <span class="mute">свой автомобиль</span></p>
                <p class="article-calc__text">${typo('Пошлина, утильсбор, расходы во Владивостоке и доставка до вашего города: предварительный расчет под ключ за минуту.')}</p>
              </div>
              <div class="btn-row">
                ${btn('Открыть калькулятор', R.calculator, { variant: 'light' })}
                ${btn('Расчет от менеджера', R.contacts, { variant: 'ghost', arrow: false, modal: 'request', subject: 'Расчет стоимости авто (статья блога)', attrs: { 'data-modal-title': 'Рассчитаем автомобиль под ключ', 'data-modal-text': 'Оставьте контакты и напишите, какой автомобиль нужен, и мы пришлем расчет по текущим ставкам и курсу.' } })}
              </div>
            </aside>`;
}

/** Карточка статьи в сетке индекса (расширение .post из общих стилей) */
function blogCard(ctx, p, { i = 0, size = '' } = {}) {
  return html`
          <article class="${cx('post', 'blog-card', size && `blog-card--${size}`)}" data-post data-cat="${catId(p.category)}"${reveal(Math.min(i, 5))}>
            ${p.cover ? `<div class="post__media">${img({ src: p.cover, alt: p.coverAlt || p.title, sizes: size ? '(max-width: 900px) 100vw, 50vw' : '(max-width: 900px) 100vw, 33vw', attrs: focus(p) })}</div>` : ''}
            <div class="post__body">
              <div class="post__meta"><span>${esc(p.category || 'Блог')}</span><span>${p.readMin} мин чтения</span></div>
              <h3 class="post__title"><a href="${u(p.url)}">${glue(typo(esc(p.title)))}</a></h3>
              <p class="post__text">${nbsp(esc(p.description || ''))}</p>
              <div class="blog-card__foot">
                <span class="blog-card__author">${esc(authorName(p))}</span>
                ${time(p.date)}
              </div>
            </div>
          </article>`;
}

/** Первая статья индекса — крупная темная редакционная карточка */
function leadPost(ctx, p) {
  return html`
        <article class="blog-lead on-dark" data-post data-cat="${catId(p.category)}"${reveal()}>
          <div class="blog-lead__media">${p.cover ? img({ src: p.cover, alt: p.coverAlt || p.title, priority: true, sizes: '(max-width: 900px) 100vw, 58vw', attrs: focus(p) }) : ''}</div>
          <div class="blog-lead__body">
            <div class="blog-lead__top">
              ${label(p.category || 'Блог')}
              <span class="blog-lead__arrow" aria-hidden="true">${icon('arrow')}</span>
            </div>
            <div class="blog-lead__main">
              <span class="label label--plain">С чего начать · ${p.readMin} мин чтения</span>
              <h3 class="blog-lead__title"><a href="${u(p.url)}">${titleDuo(p.title)}</a></h3>
              <p class="blog-lead__text">${nbsp(esc(p.description || ''))}</p>
            </div>
            <div class="blog-lead__foot">
              <span class="blog-card__author">${esc(authorName(p))}</span>
              ${time(p.date)}
            </div>
          </div>
        </article>`;
}

/** Инструменты и справочники для индекса; подборки показываем, только если их страницы есть в сборке */
function toolsOf(ctx) {
  const sel = (slug) => ctx.selections.find((s) => s.slug === slug && s.count > 0 && s.url);
  const s160 = sel('do-160-ls');
  const sAge = ctx.selections.find((s) => /проходн/i.test(s.name) && s.count > 0 && s.url);
  return [
    { title: 'Калькулятор стоимости под ключ', text: 'Пошлина, утильсбор, расходы за рубежом и во Владивостоке, доставка до вашего города.', url: R.calculator },
    R.howTo && { title: 'Как заказать автомобиль', text: 'Порядок работы от заявки до выдачи ключей: этапы, оплата и документы.', url: R.howTo },
    { title: 'Как читать аукционный лист', text: 'Оценки S-R, буквы на схеме кузова, сокращения и пометки инспектора японских аукционов.', url: R.auctionSheet },
    s160 && { title: 'Подборка: авто до 160 л.с.', text: 'Автомобили под льготный утилизационный сбор при ввозе для личного пользования.', url: s160.url },
    sAge && { title: 'Подборка: проходные 3-5 лет', text: 'Возраст с минимальной единой ставкой пошлины за кубический сантиметр.', url: sAge.url },
    { title: 'Доставка из Владивостока по России', text: 'Ориентиры по срокам и стоимости автовоза для городов от Хабаровска до Краснодара.', url: R.delivery },
    { title: 'Вопросы и ответы', text: 'Коротко об оплате, договоре, проверке автомобиля и сроках.', url: R.faq },
  ].filter(Boolean);
}

function telegramBand(ctx) {
  const tg = ctx.site.socials.telegram;
  if (!tg?.url) return '';
  const popup = ctx.source.texts?.telegramPopup || {};
  return html`
    <section class="section section--sm" id="telegram">
      <div class="container">
        <div class="blog-tg"${reveal()}>
          <div class="blog-tg__copy">
            ${label('Telegram-канал')}
            <h2>${duo('Смотрите автомобили до покупки', 'в нашем Telegram')}</h2>
            <p class="lead">${typo(popup.text || 'Свежие предложения, видеообзоры и реальные этапы доставки авто из Японии, Кореи и Китая.')}</p>
            <div class="blog-tg__actions">
              <a class="btn btn--dark" href="${esc(tg.url)}" target="_blank" rel="noopener">${icon('telegram')}Подписаться на канал ${icon('arrow', 'i-arrow')}</a>
              ${tg.handle ? `<span class="label label--plain">${esc(tg.handle)}</span>` : ''}
            </div>
          </div>
          <div class="blog-tg__shot" aria-hidden="true">
            <div class="blog-tg__phone">${img({ src: 'assets/img/misc/telegram-channel-popup.webp', alt: '', sizes: '(max-width: 900px) 70vw, 360px' })}</div>
          </div>
        </div>
      </div>
    </section>`;
}

// --- индекс блога ----------------------------------------------------------------------------------------

function indexPage(ctx) {
  const { site } = ctx;
  const posts = ordered(ctx);
  const cats = [...new Set([...CATEGORIES, ...posts.map((p) => p.category).filter(Boolean)])]
    .map((name) => ({ name, id: catId(name), count: posts.filter((p) => p.category === name).length }))
    .filter((c) => c.count > 0);
  const [first, ...rest] = posts;
  // сетка из 6 колонок: остаток от деления на 3 закрывают первые карточки — одна во всю ширину или две по половине
  const r = rest.length % 3;
  const sizeOf = (i) => (r === 1 && i === 0 ? 'wide' : r === 2 && i < 2 ? 'half' : '');
  const lastUpdate = posts.map(modified).sort().pop();
  const title = 'Блог «Макс Групп»: растаможка, аукционы и доставка авто из Азии';
  const description = 'Статьи об импорте авто из Японии, Кореи и Китая: пошлина и утильсбор 2026, проходной возраст, аукционы, доставка из Владивостока. С таблицами и расчетами.';
  return {
    url: R.blog,
    type: 'blog',
    title,
    description,
    h1: 'Блог об импорте автомобилей из Азии',
    breadcrumbs: [HOME, BLOG],
    priority: 0.7,
    changefreq: 'weekly',
    modified: lastUpdate,
    ogImage: first?.cover ? first.cover.replace(/^assets\//, '') : undefined,
    images: posts.map((p) => p.cover).filter(Boolean).slice(0, 8),
    jsonld: [
      {
        '@type': 'Blog',
        '@id': abs(site, R.blog + '#blog'),
        name: 'Блог «Макс Групп»',
        description,
        url: abs(site, R.blog),
        inLanguage: 'ru-RU',
        publisher: { '@id': abs(site, '/#organization') },
        blogPost: posts.slice(0, 20).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: abs(site, p.url), datePublished: p.date, dateModified: modified(p) })),
      },
      posts.length ? itemListLd(site, 'Статьи блога «Макс Групп»', posts.map((p) => ({ url: p.url, name: p.title }))) : null,
    ].filter(Boolean),
    render: () => html`
    ${pageHead({
      crumbs: [HOME, BLOG],
      label: 'Блог',
      h1: duo('Блог об импорте', 'автомобилей из Азии'),
      lead: 'Разбираем, из чего складывается цена автомобиля из Японии, Кореи и Китая: пошлина и утильсбор, аукционы и проверка, доставка из Владивостока. С таблицами ставок и расчетами на конкретных машинах.',
      kv: posts.length
        ? [
            { k: 'В блоге', v: count(posts.length, ART) },
            { k: 'Рубрики', v: String(cats.length) },
            { k: 'Ставки сверены', v: dateRu(lastUpdate) },
          ]
        : null,
    })}
    <section class="section section--sm section--flush-top" id="stati" data-blog>
      <div class="container">
        <h2 class="sr-only">Все статьи</h2>
        ${posts.length
          ? html`
        <div class="blog-bar"${reveal()}>
          <div class="chips blog-filter" role="group" aria-label="Рубрики блога">
            <button class="chip" type="button" aria-pressed="true" data-cat="">Все статьи<small>${posts.length}</small></button>
            ${cats.map((c) => `<button class="chip" type="button" aria-pressed="false" data-cat="${c.id}">${esc(c.name)}<small>${c.count}</small></button>`)}
          </div>
          <span class="label label--plain blog-bar__count" data-blog-count aria-live="polite">${count(posts.length, ART)}</span>
        </div>
        ${leadPost(ctx, first)}
        <div class="blog-grid">
          ${rest.map((p, i) => blogCard(ctx, p, { i: i % 3, size: sizeOf(i) }))}
        </div>`
          : `<p class="lead">Первые статьи появятся здесь в ближайшее время. А пока <a class="link" href="${u(R.calculator)}">посчитайте автомобиль в калькуляторе</a>.</p>`}
      </div>
    </section>
    <section class="section section--white" id="instrumenty">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Инструменты')}
            <h2>${duo('Посчитать и проверить', 'до покупки')}</h2>
            <p class="lead">${typo('Статьи объясняют правила. Эти разделы помогают применить их к конкретному автомобилю: посчитать платежи, прочитать аукционный лист и прикинуть доставку.')}</p>
            ${btn('Спросить менеджера', R.contacts, { variant: 'dark', modal: 'request', subject: 'Вопрос из блога', attrs: { 'data-modal-title': 'Задайте вопрос менеджеру', 'data-modal-text': 'Оставьте контакты, и мы перезвоним или напишем в мессенджер в рабочее время.' } })}
          </div>
          <div class="split__body blog-tools">
            ${toolsOf(ctx).map(
              (t, i) => html`
            <a class="blog-tool" href="${u(t.url)}"${reveal(Math.min(i, 5))}>
              <span class="blog-tool__num">${String(i + 1).padStart(2, '0')}</span>
              <span class="blog-tool__main"><b>${typo(t.title)}</b><span>${typo(t.text)}</span></span>
              ${icon('arrow')}
            </a>`
            )}
          </div>
        </div>
      </div>
    </section>
    ${telegramBand(ctx)}
    ${ctaBand(ctx, { subject: 'Заявка из блога', title: duo('Остались вопросы', 'по расчету или выбору?'), text: 'Расскажите, какой автомобиль ищете, и мы посчитаем пошлину, утильсбор и доставку под конкретную машину и пришлем варианты с аукционов и площадок.', bg: 'assets/img/hero/city-towers.webp' })}
    ${posts.length ? FILTER_SCRIPT : ''}`,
  };
}

// Клиентская фильтрация по рубрикам. Без JS показаны все статьи, чипы скрыты (.no-js).
// Переход по ссылке /blog/#рубрика (из статьи) включает фильтр и прокручивает к списку.
const FILTER_SCRIPT = `
    <script>
    (function () {
      var root = document.querySelector('[data-blog]');
      if (!root) return;
      var chips = [].slice.call(root.querySelectorAll('.blog-filter [data-cat]'));
      var posts = [].slice.call(root.querySelectorAll('[data-post]'));
      var counter = root.querySelector('[data-blog-count]');
      function forms(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'статья' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'статьи' : 'статей'; }
      function apply(cat, push) {
        if (cat && !chips.some(function (c) { return c.dataset.cat === cat; })) cat = '';
        var n = 0;
        posts.forEach(function (p) { var on = !cat || p.dataset.cat === cat; p.hidden = !on; if (on) { n++; p.classList.add('is-in'); } });
        chips.forEach(function (c) {
          var on = c.dataset.cat === cat;
          c.setAttribute('aria-pressed', String(on));
          // на телефоне лента рубрик листается: включенная рубрика должна быть видна
          if (on) { var f = c.parentNode, d = c.getBoundingClientRect().left - f.getBoundingClientRect().left; if (d < 0 || d + c.offsetWidth > f.clientWidth) f.scrollLeft += d - 16; }
        });
        root.classList.toggle('is-filtered', !!cat);
        if (counter) counter.textContent = n + ' ' + forms(n);
        if (push && history.replaceState) history.replaceState(null, '', cat ? '#' + cat : location.pathname + location.search);
      }
      function isCat(h) { return chips.some(function (c) { return c.dataset.cat === h; }); }
      function show() { root.scrollIntoView({ block: 'start' }); }
      chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.dataset.cat, true); }); });
      var hash = location.hash.slice(1);
      if (hash && isCat(hash)) {
        apply(hash, false);
        show();
        // после загрузки шрифтов текст над списком может переверстаться — поправляем позицию, пока читатель сам не начал листать
        var touched = false;
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, function () { touched = true; }, { once: true, passive: true }); });
        var realign = function () { if (!touched) show(); };
        window.addEventListener('load', realign);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(realign);
      }
      window.addEventListener('hashchange', function () {
        var h = location.hash.slice(1);
        if (!h) apply('', false);
        else if (isCat(h)) { apply(h, false); show(); }
      });
    })();
    </script>`;

// --- статья ---------------------------------------------------------------------------------------------

function tocBlock(p) {
  if (!p.toc?.length) return '';
  return html`
            <details class="article-toc" open data-toc>
              <summary><span class="label">Содержание</span><i class="acc__icon" aria-hidden="true"></i></summary>
              <ol class="article-toc__list">
                ${p.toc.map((t, i) => `<li><a href="#${esc(t.id)}"><span class="article-toc__num">${String(i + 1).padStart(2, '0')}</span><span>${glue(typo(esc(t.text)))}</span></a></li>`)}
              </ol>
            </details>`;
}

/** Блок в конце статьи: автор — редакция, вопросы по статье принимает менеджер (общая форма заявки) */
function authorBox(p) {
  return html`
            <div class="article-author"${reveal()}>
              <div class="article-author__head">
                ${label('Автор статьи')}
                <p class="article-author__name"><a href="${u(R.about)}">${esc(authorName(p))}</a></p>
              </div>
              <div class="article-author__body">
                <p class="article-author__text">${typo('Если в статье не хватило ответа на ваш случай, спросите менеджера: посчитаем платежи под конкретную машину.')}</p>
                ${btn('Задать вопрос менеджеру', R.contacts, { variant: 'dark', size: 'sm', modal: 'request', subject: `Вопрос по статье «${shortTitle(p)}»`, attrs: { 'data-modal-title': 'Вопрос по статье', 'data-modal-text': 'Напишите, что хотите уточнить, и оставьте контакты. Ответим в рабочее время.' } })}
              </div>
            </div>`;
}

function relatedPosts(ctx, p, n = 3) {
  const pool = ordered(ctx).filter((x) => x.slug !== p.slug);
  const bySlug = arr(p.related).map((s) => pool.find((x) => x.slug === s)).filter(Boolean);
  const sameCat = pool.filter((x) => x.category === p.category);
  return [...new Set([...bySlug, ...sameCat, ...pool])].slice(0, n);
}

function postPage(ctx, p) {
  const { site } = ctx;
  const crumbsList = [HOME, BLOG, { name: shortTitle(p), url: p.url }];
  const matched = matchTags(ctx, p.tags);
  const cars = pickCars(ctx, matched);
  const related = relatedPosts(ctx, p);
  const { body, tail = '', faq, faqId, faqTitle } = splitFaq(figures(tables(polish(p.html))));
  const [partA, partB] = splitMiddle(body);
  const mod = modified(p);
  const baseTitle = p.seoTitle || p.title;
  // бренд в title — только если итог не длиннее 65 знаков (иначе хвост в выдаче обрежется)
  const title = `${baseTitle} | Макс Групп`.length <= 65 ? `${baseTitle} | Макс Групп` : baseTitle;
  const catalogLinks = catalogLinksOf(matched);
  const manyCountries = matched.filter((m) => m.kind === 'country').length > 1 && !matched.some((m) => m.kind === 'selection');
  const carsMore = matched.length && !manyCountries ? catalogLinks[0] : null;
  return {
    url: p.url,
    type: 'post',
    title,
    description: p.description,
    h1: p.title,
    breadcrumbs: crumbsList,
    priority: 0.6,
    changefreq: 'monthly',
    ogType: 'article',
    published: p.date,
    modified: mod,
    ogImage: p.cover ? p.cover.replace(/^assets\//, '') : undefined,
    images: p.cover ? [p.cover] : [],
    jsonld: [
      { ...articleLd(site, { title: p.title, description: p.description, url: p.url, image: p.cover, published: p.date, modified: mod, author: null }), articleSection: p.category || undefined, keywords: arr(p.tags).join(', ') || undefined, wordCount: plain(p.html).split(' ').length },
      faqLd(faq.map((f) => ({ q: f.q, a: plain(f.a) }))),
    ].filter(Boolean),
    render: () => html`
    <div class="article-progress" aria-hidden="true" data-article-progress><i></i></div>
    <article class="blog-article" data-article>
      <header class="page-head article-head">
        <div class="container">${crumbs(crumbsList)}</div>
        <div class="container">
          <div class="article-head__top">
            <div class="article-head__labels">
              <a class="label article-head__cat" href="${u(catUrl(p.category))}">${esc(p.category || 'Блог')}</a>
              <span class="label label--plain">${p.readMin} мин чтения</span>
            </div>
            <h1 class="article-head__title">${titleDuo(p.title)}</h1>
          </div>
          <div class="article-head__grid">
            <div class="article-head__meta">
              <dl class="article-dates">
                <div><dt>Автор</dt><dd><a href="${u(R.about)}">${esc(authorName(p))}</a></dd></div>
                <div><dt>Опубликовано</dt><dd>${time(p.date)}</dd></div>
                ${mod !== p.date ? `<div><dt>Обновлено</dt><dd>${time(mod)}</dd></div>` : ''}
              </dl>
            </div>
            <p class="lead article-head__lead">${nbsp(esc(p.description || ''))}</p>
          </div>
          ${p.cover ? `<figure class="article-cover">${img({ src: p.cover, alt: p.coverAlt || p.title, priority: true, sizes: '(max-width: 1760px) 100vw, 1680px', attrs: focus(p) })}</figure>` : ''}
        </div>
      </header>
      <section class="section section--white article-body">
        <div class="container">
          <div class="article-layout">
            <aside class="article-aside">
              ${tocBlock(p)}
              <div class="article-aside__cta">
                <p>${typo('Нужен расчет под конкретный автомобиль?')}</p>
                ${btn('Калькулятор', R.calculator, { variant: 'dark', size: 'sm' })}
              </div>
            </aside>
            <div class="article-main">
              <div class="prose article-prose">
${partA}
              </div>
              ${calcBanner()}
              ${partB ? `<div class="prose article-prose">\n${partB}\n              </div>` : ''}
              ${faq.length
                ? html`
              <div class="article-faq">
                <h2 class="article-faq__title" id="${esc(faqId)}">${esc(faqTitle)}</h2>
                ${faqList(faq, { open: 0 })}
              </div>`
                : ''}
              ${tail ? `<div class="prose article-prose">\n${tail}\n              </div>` : ''}
              <div class="article-links">
                <span class="label label--plain">По теме в каталоге</span>
                <div class="chips">
                  ${catalogLinks.map((l) => `<a class="chip chip--sm" href="${u(l.url)}">${esc(l.name)}</a>`)}
                  <a class="chip chip--sm" href="${u(catUrl(p.category))}">Рубрика: ${esc(p.category || 'Блог')}</a>
                </div>
              </div>
              ${authorBox(p)}
            </div>
          </div>
        </div>
      </section>
    </article>
    ${cars.length
      ? html`
    <section class="section" id="avto-po-teme">
      <div class="container">
        ${sectionHead({
          label: 'Каталог',
          title: duo('Примеры автомобилей', 'из нашего каталога'),
          lead: 'Машины, к которым применимо написанное выше. Цены предварительные: во Владивостоке, с доставкой и таможенными платежами. Точный расчет под конкретный автомобиль пришлет менеджер.',
          actions: carsMore ? more(carsMore.name, carsMore.url) : more('Весь каталог', R.catalog),
        })}
        ${rail(cars.map((c, i) => carCard(c, { i })), { col: 'minmax(260px, calc((100% - 3 * var(--gap)) / 4))', colMobile: 'minmax(250px, 78%)' })}
      </div>
    </section>`
      : ''}
    ${related.length
      ? html`
    <section class="${cx('section', 'section--white', !cars.length && 'section--flush-top')}" id="chitajte-takzhe">
      <div class="container">
        ${sectionHead({ label: 'Читайте также', title: duo('Что еще почитать', 'по теме'), lead: 'Соседние материалы блога: правила, расчеты и логистика, которые пригодятся до заявки.', actions: more('Все статьи блога', R.blog) })}
        <div class="${cx('grid', related.length === 2 ? 'grid--2' : 'grid--3')}">
          ${related.map((x, i) => postCard({ ...x, title: glue(x.title) }, { i }))}
        </div>
      </div>
    </section>`
      : ''}
    ${ctaBand(ctx, {
      subject: `Заявка из статьи «${shortTitle(p)}»`,
      title: duo('Посчитаем ваш автомобиль', 'по текущим ставкам'),
      text: 'Назовите марку, год и бюджет, и мы подберем варианты в Японии, Корее и Китае и пришлем полный расчет: цена в стране, доставка, пошлина, утильсбор, оформление.',
      bg: 'assets/img/hero/bridge-drive.webp',
    })}
    ${ARTICLE_SCRIPT}`,
  };
}

// Полоса прогресса чтения, подсветка текущего раздела в оглавлении, сворачивание оглавления на мобайле,
// режим таблиц из трех-четырех колонок: помещается в экран — остается как есть, не помещается — листается (table-wrap--wide).
const ARTICLE_SCRIPT = `
    <script>
    (function () {
      var art = document.querySelector('[data-article] .article-main');
      var bar = document.querySelector('[data-article-progress] i');
      var toc = document.querySelector('[data-toc]');
      var mobile = window.matchMedia('(max-width: 900px)');
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
    </script>`;

export function blogPages(ctx) {
  return [indexPage(ctx), ...ordered(ctx).map((p) => postPage(ctx, p))];
}

/*
  ПАМЯТКА АВТОРУ СТАТЬИ (content/blog/<slug>.md; имя файла = адрес /blog/<slug>/, латиница и дефисы, без года)

  ---
  title: Заголовок статьи: уточнение после двоеточия            ← H1; часть после первого «:» красится серым
  seoTitle: Короткий <title> до 70 знаков                        ← необязательно; иначе берется title (« | Макс Групп» добавится, если итог не длиннее 65 знаков)
  short: Короткое имя для хлебных крошек                         ← необязательно; иначе часть title до «:»
  description: 150-160 знаков, одно-два предложения              ← meta description, лид под H1 и анонс в карточке
  date: 2026-10-13                                               ← ГГГГ-ММ-ДД, фактическая дата публикации, не в будущем
  updated: 2026-10-13                                            ← необязательно; показывается, если позже date
  order: 1                                                       ← место в ленте блога (1 — первая, крупная карточка); без order статья встает в конец
  category: Таможня и расчеты                                    ← одна из CATEGORIES (см. начало файла), пишется точно так же
  cover: assets/img/hero/city-towers.webp                  ← реальный файл из assets/img, горизонтальный, от 1280 px по ширине
  coverAlt: Что изображено на обложке
  coverFocus: 50% 60%                                            ← необязательно: object-position обложки (что оставить в кадре 21:9)
  author: Редакция Макс Групп                                    ← автор — редакция (организация); имен, фото и телефонов сотрудников не ставим
  tags: [До 160 л.с., Япония, растаможка]                         ← названия или slug подборок и стран дают блок авто и ссылки в каталог
  related: [slug-odnoj-stati, slug-drugoj-stati]                 ← до трех slug для блока «Читайте также»
  ---

  Front matter: одна строка на ключ; в массивах запятая — разделитель (подборку «До 1,5 млн ₽» указывайте по slug: do-1-5-mln).
  Текст: ## и ### заголовки (## попадают в оглавление; # не использовать, уровни не перескакивать, одинаковых заголовков не делать),
  абзац — одной строкой, списки «- » и «1. » (без вложенности и переносов внутри пункта), таблицы «| a | b |» со строкой «|---|---|»
  (символ | внутри ячейки нельзя), цитата «> », **жирный**, *курсив*, [ссылка](/kalkulyator/) — внутренние адреса абсолютным путем
  из src/routes.mjs со слэшем на конце; врезки «:::note Текст» … «:::» и «:::warn Текст» … «:::» (внутри один абзац).
  Строка из одной картинки ![подпись](/assets/img/cases/x.webp) становится иллюстрацией с подписью.
  Жирная первая ячейка строки таблицы (**Итого**) выделяет строку итога.
  Раздел «## Частые вопросы о …» (заголовок начинается с этих слов, дальше — тема статьи: «Частые вопросы об утильсборе»)
  с вопросами в «### » автоматически становится аккордеоном и попадает в микроразметку FAQPage.
  Таблицы на телефоне: три-четыре колонки помещаются в экран, если хватает ширины; от пяти — листаются по горизонтали,
  первая колонка закреплена. Поэтому название строки (автомобиль, статья расхода) ставьте в первую колонку.
  Блок калькулятора встает сам перед средним разделом, если в статье четыре и больше заголовков ##.
*/
