// Главная страница.
import { html, esc, u, a, img, typo, price, priceShort, num, count, clip } from '../lib/core.mjs';
import { faqLd, itemListLd } from '../lib/seo.mjs';
import {
  icon, stars, label, duo, btn, more, reveal, sectionHead, fact, carCard, caseCard, reviewCard, faqList, chips, step, rail, railNav, ctaBand, seoText, leadForm,
} from '../components/ui.mjs';
import { whyFacts, steps, homeFaq } from '../data/texts.mjs';
import { quizSection } from '../components/quiz.mjs';
import { miniCalcSection } from '../components/calc.mjs';
import { R } from '../routes.mjs';

const MARQUEE = ['Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Lexus', 'Hyundai', 'Kia', 'Genesis', 'Geely', 'Changan', 'Haval', 'Zeekr', 'BYD', 'Li Auto', 'Chery'];

function hero(ctx) {
  const { site } = ctx;
  return html`
    <section class="hero on-dark" aria-label="Автомобили из Азии под заказ">
      <div class="hero__media" data-hero-video>
        ${img({ src: 'assets/img/hero/poster.webp', alt: 'Ночной Владивосток: вид на Золотой мост и бухту', priority: true, sizes: '100vw' })}
        <video muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" data-src="${a('video/hero-main-video.mp4')}" data-src-mobile="${a('video/hero-main-video-mobile.mp4')}"></video>
      </div>
      <div class="container hero__inner">
        <div class="hero__meta" data-hero-in>
          ${label('Владивосток · доставка по всей России')}
          ${label('Полное сопровождение сделки')}
        </div>
        <div class="hero__main">
          <h1 class="hero-title hero__title" data-hero-in style="--i:1">Авто из Японии, Кореи и&nbsp;Китая <span class="mute">под заказ</span></h1>
          <div class="hero__side" data-hero-in style="--i:2">
            <p class="lead">${typo('Максимально прозрачный процесс импорта. Подбираем, проверяем, покупаем и привозим автомобили под ваш запрос и бюджет.')}</p>
            <div class="hero__actions">
              ${btn('Рассчитать стоимость', R.calculator, { variant: 'light', modal: 'request', subject: 'Расчёт стоимости авто (главная, первый экран)' })}
              ${btn('Смотреть каталог', R.catalog, { variant: 'ghost', arrow: false })}
            </div>
          </div>
        </div>
        <div class="hero__strip" data-hero-in style="--i:3">
          <div class="hero__fact"><b>5,0 в ${site.rating.count} отзывах</b><span>Из 2ГИС и Яндекс Карт — у всех высшая оценка</span></div>
          <div class="hero__fact"><b>Таможня</b><span>Оформление и расчёт пошлин берём на себя</span></div>
          <div class="hero__fact"><b>Платёжный агент</b><span>Легальная оплата за рубеж с документами</span></div>
          <div class="hero__fact"><b>Под ключ</b><span>От торгов до выдачи ключей в вашем городе</span></div>
          <button class="hero__toggle" type="button" aria-label="Поставить видео на паузу" aria-pressed="false" data-video-toggle>${icon('pause', 'i-pause')}${icon('play-fill', 'i-play')}</button>
        </div>
      </div>
    </section>`;
}

function brandsStrip(ctx) {
  const known = new Map();
  for (const b of ctx.brands) if (!known.has(b.name)) known.set(b.name, b.url);
  const names = [...new Set([...MARQUEE.filter((n) => known.has(n)), ...[...known.keys()]])].slice(0, 18);
  const list = (names.length >= 8 ? names : MARQUEE).map((n) => (known.has(n) ? `<a class="marquee__item" href="${u(known.get(n))}">${esc(n)}</a>` : `<span class="marquee__item">${esc(n)}</span>`));
  const group = `<div class="marquee__group">${list.join('')}</div>`;
  return html`
    <div class="brands-strip" aria-label="Марки автомобилей">
      <div class="marquee">
        <div class="marquee__track">${group}${group.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ').replace(/<span /g, '<span aria-hidden="true" ')}</div>
      </div>
    </div>`;
}

function countriesSection(ctx) {
  return html`
    <section class="section" id="strany">
      <div class="container">
        ${sectionHead({
          label: 'Направления',
          title: duo('Три рынка —', 'одна команда на всех этапах'),
          lead: 'Выбираем страну под задачу: японские аукционы для праворульных автомобилей с честным пробегом, Корея для свежих левых рулей, Китай для новых моделей и электромобилей.',
        })}
        <div class="grid grid--3">
          ${ctx.nav.countries.map((c, i) => {
            const full = ctx.cars.filter((x) => x.country === c.slug && x.priceRub && !x.priceIsPartial);
            const from = full.length ? Math.min(...full.map((x) => x.priceRub)) : null;
            return html`
          <article class="country country--light"${reveal(i)}>
            <div class="country__bg">${img({ src: 'assets/' + c.image, alt: `Автомобили ${c.from} под заказ`, sizes: '(max-width: 900px) 100vw, 33vw' })}</div>
            <div>
              <div class="country__top">
                <h3 class="country__title"><a href="${u(c.url)}">${esc(c.navTitle)}</a></h3>
                <span class="country__arrow" aria-hidden="true">${icon('arrow')}</span>
              </div>
              <p class="country__text">${typo(c.text)}</p>
            </div>
            <div>
              <div class="country__stat">
                <div><b>${esc(c.sourceShort)}</b>источник</div>
                <div><b>${esc(c.steering[0].toUpperCase() + c.steering.slice(1))}</b>компоновка</div>
                ${from ? `<div><b>от ${priceShort(from)}</b>под ключ</div>` : ''}
              </div>
              <div class="country__links">
                ${c.brands.slice(0, 5).map((b) => `<a class="chip chip--sm" href="${u(b.url)}">${esc(b.name)}</a>`).join('')}
                <a class="chip chip--sm" href="${u(c.url)}">Все авто ${esc(c.from)}</a>
              </div>
            </div>
          </article>`;
          })}
        </div>
      </div>
    </section>`;
}

function whySection(ctx) {
  const facts = whyFacts(ctx.site);
  return html`
    <section class="section section--flush-top" id="pochemu-my">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Почему мы')}
            <h2>${duo('Почему клиенты выбирают', 'Макс Групп')}</h2>
            <p class="lead">${typo('Привозим автомобили под заказ и закрываем весь путь: подбор и торги, оплата за рубеж, доставка, таможня, документы и выдача.')}</p>
            ${more('О компании', R.about)}
          </div>
          <div class="split__body grid grid--2">
            ${facts.map((f, i) => fact({ ...f, i: i % 2 }))}
          </div>
        </div>
      </div>
    </section>`;
}

function catalogSection(ctx) {
  const tabs = [{ key: 'all', name: 'Все', cars: pickMixed(ctx.cars, 8) }, ...ctx.nav.countries.map((c) => ({ key: c.slug, name: c.navTitle, cars: ctx.cars.filter((x) => x.country === c.slug).slice(0, 8), url: c.url, total: c.count }))];
  if (!ctx.cars.length) return '';
  return html`
    <section class="section section--white" id="katalog" data-tabs-scope>
      <div class="container">
        ${sectionHead({
          label: 'Каталог',
          title: duo('Автомобили, которые можно', 'заказать прямо сейчас'),
          lead: 'Примеры с аукционов и площадок с расчётом цены во Владивостоке. Не нашли нужный — подберём под запрос.',
          aside: html`<div class="tabs" role="tablist" aria-label="Страна" data-tabs>
            ${tabs.map((t, i) => `<button class="tabs__btn" type="button" role="tab" id="katalog-tab-${t.key}" aria-controls="katalog-panel-${t.key}" aria-selected="${i === 0}" data-tab="${t.key}"${i ? ' tabindex="-1"' : ''}>${esc(t.name)}${t.total ? `<small>${t.total}</small>` : ''}</button>`)}
          </div>`,
        })}
        ${tabs.map(
          (t, i) => html`
        <div class="grid grid--4 m-rail" role="tabpanel" id="katalog-panel-${t.key}" aria-labelledby="katalog-tab-${t.key}" data-tab-panel="${t.key}"${i ? ' hidden' : ''}>
          ${t.cars.map((c, ci) => carCard(c, { i: ci % 4 }))}
        </div>`
        )}
        <div class="section-foot">
          ${chips(ctx.nav.selections.slice(0, 7), { sm: false })}
          ${btn(`Весь каталог — ${ctx.carWord(ctx.cars.length)}`, R.catalog, { variant: 'dark' })}
        </div>
      </div>
    </section>`;
}

/** Смешанная выборка: по кругу из каждой страны, чтобы на вкладке «Все» были все три рынка */
function pickMixed(cars, n) {
  const groups = ['japan', 'korea', 'china'].map((c) => cars.filter((x) => x.country === c));
  const out = [];
  for (let i = 0; out.length < n && i < 40; i++) for (const g of groups) if (g[i] && out.length < n) out.push(g[i]);
  return out;
}

function stepsSection() {
  return html`
    <section class="section section--dark" id="kak-my-rabotaem">
      <div class="container">
        ${sectionHead({
          label: 'Как мы работаем',
          title: duo('От заявки до ключей —', 'шесть понятных шагов'),
          lead: 'Типовой порядок сделки. На каждом шаге менеджер сообщает, где автомобиль и что с ним происходит; порядок оплаты закрепляется в договоре.',
          aside: railNav(),
          actions: more('Подробно о каждом шаге', R.howTo),
        })}
        ${rail(steps.map((s, i) => step(s, i)), { col: 'minmax(300px, 27%)', colMobile: 'minmax(270px, 82%)' })}
      </div>
    </section>`;
}

function casesSection(ctx) {
  const cases = ctx.cases.slice(0, 12);
  return html`
    <section class="section" id="privezennye-avto">
      <div class="container">
        ${sectionHead({
          label: 'Привезённые авто',
          title: duo('Авто, которые мы', 'привезли и везём'),
          lead: 'Реальные автомобили наших клиентов: доставленные, в пути и на торгах.',
          aside: railNav(),
        })}
        ${rail(cases.map((c, i) => caseCard(c, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
        <div class="section-foot">
          <p class="muted" style="max-width:52ch">${typo('Фотографии и цены — из описаний сделок. Цена указана на дату покупки; что в неё входит, подписано в карточке.')}</p>
          ${btn(`Все ${count(ctx.cases.length, ['автомобиль', 'автомобиля', 'автомобилей'])}`, R.cases, { variant: 'dark' })}
        </div>
      </div>
    </section>`;
}

/**
 * Фото баннера автокредита. На десктопе — широкий кадр фоном под текстом; на планшете и телефоне текст стоит
 * на светлой плашке, а автомобиль — отдельным блоком ниже, поэтому там берутся свои кадры (см. 41-home.css).
 */
function creditPicture(banner) {
  const dir = 'img/misc/credit-banner-mercedes';
  const alt = banner.imageAlt || 'Синий Mercedes-Benz в светлой студии';
  return html`<picture>
              <source media="(max-width: 600px)" srcset="${a(`${dir}-mobile-480.webp`)} 480w, ${a(`${dir}-mobile.webp`)} 590w" sizes="100vw" width="590" height="1600">
              <source media="(max-width: 900px)" srcset="${a(`${dir}-tablet-800.webp`)} 800w, ${a(`${dir}-tablet.webp`)} 1600w" sizes="100vw" width="1600" height="1473">
              ${img({ src: `assets/${dir}-desktop.webp`, alt, sizes: '100vw' })}
            </picture>`;
}

function servicesSection(ctx) {
  const main = ctx.services.filter((s) => ['avto-pod-zakaz', 'dileram', 'tamozhennoe-oformlenie', 'platezhnyj-agent'].includes(s.slug));
  const order = ['avto-pod-zakaz', 'tamozhennoe-oformlenie', 'platezhnyj-agent', 'dileram'];
  main.sort((x, y) => order.indexOf(x.slug) - order.indexOf(y.slug));
  const credit = ctx.source.credit;
  return html`
    <section class="section section--dark" id="uslugi">
      <div class="container">
        ${sectionHead({
          label: 'Услуги',
          title: duo('Не только подбор:', 'вся инфраструктура импорта'),
          lead: 'Таможенное оформление и оплату за рубеж берём на себя — вам не нужно искать брокера и способ оплатить инвойс.',
          actions: more('Все услуги', R.services),
        })}
        <div class="svc-grid">
          ${main.map(
            (s, i) => html`
          <article class="svc"${reveal(i % 2)}>
            <div class="svc__bg">${img({ src: 'assets/' + s.image, alt: '', sizes: '(max-width: 720px) 100vw, 50vw' })}</div>
            <div class="svc__top">
              ${label(s.label)}
              <span class="svc__arrow" aria-hidden="true">${icon('arrow')}</span>
            </div>
            <div>
              <h3 class="svc__title"><a href="${u(s.url)}">${esc(s.name)}</a></h3>
              <p class="svc__text">${typo(s.short)}</p>
            </div>
          </article>`
          )}
        </div>
      </div>
    </section>
    <section class="section section--sm" id="avtokredit">
      <div class="container">
        <div class="credit credit--home"${reveal()}>
          <div class="credit__bg">${creditPicture(credit.banner)}</div>
          <div class="credit__copy">
            ${label('Автокредитование')}
            <h2>${duo('Автомобиль из Азии', 'в кредит')}</h2>
            <p>${typo(credit.banner.text)}</p>
            <div class="chips credit__badges">
              ${credit.banner.benefits.map((b) => `<span class="badge">${esc(b)}</span>`)}
            </div>
            <div class="credit__foot">
              ${btn('Подобрать программу', R.service('avtokredit'), { variant: 'primary', modal: 'request', subject: 'Автокредит', attrs: { 'data-modal-title': 'Кредит на авто', 'data-modal-text': 'Оставьте заявку — поможем с одобрением кредита в одном из банков-партнёров.', 'data-modal-label': 'Автокредит' } })}
              <div class="banks" aria-label="Банки-партнёры">
                ${credit.banks.map((b) => `<span>${img({ src: b.logo, alt: b.name, sizes: '120px' })}</span>`)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function reviewsSection(ctx) {
  const { site } = ctx;
  const sorted = [...ctx.reviews].sort((x, y) => (y.photos.length ? 1 : 0) - (x.photos.length ? 1 : 0) || y.text.length - x.text.length);
  const list = sorted.slice(0, 6);
  return html`
    <section class="section section--white" id="otzyvy">
      <div class="container">
        ${sectionHead({
          label: 'Отзывы',
          title: duo('Нас рекомендуют', 'друзьям и коллегам'),
          lead: 'Отзывы клиентов из 2ГИС и Яндекс Карт — без правок, с фотографиями полученных автомобилей.',
          aside: html`<div class="rating">
            <div class="rating__value">5,0</div>
            <div class="rating__meta">${stars(5)}<span>оценка в каждом из ${site.rating.count} отзывов:<br>${site.rating.twoGisCount} из 2ГИС, ${site.rating.count - site.rating.twoGisCount} с Яндекс Карт</span></div>
          </div>`,
        })}
        <div class="masonry m-rail">
          ${list.map((r, i) => reviewCard(r, { i: i % 3 }))}
        </div>
        <div class="section-foot">
          <div class="btn-row">
            <a class="btn btn--ghost btn--sm" href="${esc(site.contacts.maps.twoGis)}" target="_blank" rel="noopener nofollow">Мы в 2ГИС ${icon('external')}</a>
            <a class="btn btn--ghost btn--sm" href="${esc(site.contacts.maps.yandex)}" target="_blank" rel="noopener nofollow">Мы на Яндекс Картах ${icon('external')}</a>
          </div>
          ${btn(`Все отзывы`, R.reviews, { variant: 'dark' })}
        </div>
      </div>
    </section>`;
}

function teamSection(ctx) {
  return html`
    <section class="section section--dark" id="komanda">
      <div class="container">
        ${sectionHead({
          label: 'Команда',
          title: duo('Команда,', 'которая ведёт вашу сделку'),
          lead: 'Менеджеры помогут подобрать и доставить автомобиль. В отзывах клиенты пишут, что они были на связи и подробно объясняли все этапы.',
        })}
        <div class="grid grid--4 grid--keep-2">
          ${ctx.team.map(
            (p, i) => html`
          <article class="person"${reveal(i)}>
            <div class="person__photo">${img({ src: p.photo, alt: `${p.name} — ${p.role}, Макс Групп`, sizes: '(max-width: 900px) 50vw, 25vw' })}</div>
            <div class="person__body">
              <h3 class="person__name">${esc(p.name)}</h3>
              <span class="person__role">${esc(p.role)}</span>
              <a class="person__phone" href="tel:${p.tel}">${esc(p.phone)}</a>
            </div>
          </article>`
          )}
        </div>
      </div>
    </section>`;
}

function deliverySection(ctx) {
  if (!ctx.cities.length) return '';
  const cities = ctx.cities.slice(0, 14);
  const half = Math.ceil(cities.length / 2);
  const col = (list, dup = false) => html`
          <div>
            <div class="cities__head${dup ? ' cities__head--dup' : ''}"><span class="label label--plain">Город</span><span class="label label--plain">Срок</span><span class="label label--plain">Автовоз</span><span></span></div>
            ${list.map((c) => `<a class="city-row" href="${u(c.url)}"><span class="city-row__name">${esc(c.name)}</span><span class="city-row__val">${esc(c.daysLabel || '—')}</span><span class="city-row__val">${c.priceFrom ? 'от ' + price(c.priceFrom) : 'по запросу'}</span>${icon('arrow')}</a>`)}
          </div>`;
  return html`
    <section class="section" id="dostavka">
      <div class="container">
        ${sectionHead({
          label: 'Доставка по России',
          title: duo('Из Владивостока —', 'в любой город страны'),
          lead: 'Отправляем автомобили автовозом и по железной дороге. Ориентиры по срокам и стоимости — в таблице, точный расчёт пришлёт менеджер.',
          actions: more('Все города и условия', R.delivery),
        })}
        <div class="cities"${reveal()}>
          ${col(cities.slice(0, half))}
          ${col(cities.slice(half), true)}
        </div>
      </div>
    </section>`;
}

function videoSection(ctx) {
  const { site, source } = ctx;
  const videos = source.videos || [];
  if (!videos.length) return '';
  return html`
    <section class="section section--white" id="video">
      <div class="container">
        ${sectionHead({
          label: 'Видео и соцсети',
          title: duo('Смотрите наши обзоры', 'и подборки авто'),
          lead: 'Реальные цены, честные обзоры и новости авторынка — в Instagram, Telegram и на YouTube.',
          aside: railNav(),
          actions: html`
            <a class="btn btn--ghost btn--sm" href="${esc(site.socials.telegram.url)}" target="_blank" rel="noopener">${icon('telegram')} Telegram-канал</a>
            <a class="btn btn--ghost btn--sm" href="${esc(site.socials.youtube.url)}" target="_blank" rel="noopener">${icon('youtube')} YouTube</a>
            <a class="btn btn--ghost btn--sm" href="${esc(site.socials.instagram.url)}" target="_blank" rel="noopener">${icon('instagram')} Instagram</a>`,
        })}
        ${rail(
          videos.map(
            (v, i) => html`
          <a class="reel" href="${esc(v.url)}" target="_blank" rel="noopener nofollow"${reveal(Math.min(i, 4))}>
            <span class="reel__media">
              ${img({ src: v.cover, alt: `Видео «${v.title}» — ${v.viewsOnCover} просмотров`, sizes: '(max-width: 900px) 60vw, 18vw' })}
              <span class="reel__play" aria-hidden="true">${icon('play-fill')}</span>
            </span>
            <span class="reel__title">${esc(v.title)}</span>
          </a>`
          ),
          { col: 'minmax(220px, 17.6%)', colMobile: 'minmax(200px, 58%)' }
        )}
      </div>
    </section>`;
}

export function postCard(p, { i = 0, tag = 'h3' } = {}) {
  return html`
          <article class="post"${reveal(i)}>
            ${p.cover ? `<div class="post__media">${img({ src: p.cover, alt: p.coverAlt || p.title, sizes: '(max-width: 900px) 100vw, 33vw' })}</div>` : ''}
            <div class="post__body">
              <div class="post__meta"><span>${esc(p.category || 'Блог')}</span><span>${p.readMin} мин чтения</span></div>
              <${tag} class="post__title"><a href="${u(p.url)}">${typo(esc(p.title))}</a></${tag}>
              <p class="post__text">${typo(esc(p.description || ''))}</p>
              <span class="post__more">Читать ${icon('arrow')}</span>
            </div>
          </article>`;
}

function blogSection(ctx) {
  if (!ctx.posts.length) return '';
  return html`
    <section class="section" id="blog">
      <div class="container">
        ${sectionHead({
          label: 'Блог',
          title: duo('Разбираем импорт', 'без сложных слов'),
          lead: 'Таможенные ставки, аукционные листы, обзоры моделей и ответы на частые вопросы об импорте.',
          actions: more('Все статьи', R.blog),
        })}
        <div class="grid grid--3 m-rail">
          ${ctx.posts.slice(0, 3).map((p, i) => postCard(p, { i }))}
        </div>
      </div>
    </section>`;
}

function faqSection() {
  return html`
    <section class="section section--white" id="voprosy">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${duo('До того, как', 'вы решитесь')}</h2>
            <p class="lead">${typo('Коротко о цене, сроках, оплате и проверке автомобиля. Не нашли ответ — спросите менеджера.')}</p>
            ${more('Все вопросы', R.faq)}
          </div>
          <div class="split__body">
            ${faqList(homeFaq)}
          </div>
        </div>
      </div>
    </section>`;
}

function seoSection(ctx) {
  const body = ctx.content.homeSeo;
  if (!body) return '';
  return html`
    <section class="section section--sm">
      <div class="container">
        ${seoText(ctx.md(body))}
      </div>
    </section>`;
}

export function homePages(ctx) {
  const { site } = ctx;
  return [
    {
      url: R.home,
      type: 'home',
      title: 'Авто из Японии, Кореи и Китая под заказ во Владивостоке — Макс Групп',
      description:
        'Авто из Японии, Кореи и Китая под заказ с доставкой по России. Подбор на аукционах, проверка, таможенное оформление во Владивостоке. Рассчитайте цену под ключ.',
      h1: 'Авто из Японии, Кореи и Китая под заказ',
      headerOver: true,
      scripts: ['quiz', 'calc-core', 'calc'],
      priority: 1,
      changefreq: 'daily',
      preload: [{ href: 'img/hero/poster.webp', as: 'image', type: 'image/webp' }],
      jsonld: [
        faqLd(homeFaq),
        itemListLd(site, 'Автомобили под заказ', ctx.cars.slice(0, 12).map((c) => ({ url: c.url, name: c.titleYear }))),
      ].filter(Boolean),
      render: () =>
        [
          hero(ctx),
          brandsStrip(ctx),
          countriesSection(ctx),
          whySection(ctx),
          catalogSection(ctx),
          miniCalcSection(ctx, { cls: 'section--white section--flush-top' }),
          stepsSection(ctx),
          casesSection(ctx),
          servicesSection(ctx),
          reviewsSection(ctx),
          quizSection(ctx, { subject: 'Квиз подбора (главная)' }),
          deliverySection(ctx),
          teamSection(ctx),
          videoSection(ctx),
          blogSection(ctx),
          faqSection(ctx),
          seoSection(ctx),
          ctaBand(ctx, { subject: 'Заявка с главной страницы', bg: 'assets/img/hero/bridge-drive.webp' }),
        ].join('\n'),
    },
  ];
}
