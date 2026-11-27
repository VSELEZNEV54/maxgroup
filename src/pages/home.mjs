// Главная страница.
import { html, esc, u, a, img, imgSize, typo, price, count } from '../lib/core.mjs';
import { faqLd, itemListLd } from '../lib/seo.mjs';
import {
  icon, stars, label, duo, btn, more, reveal, sectionHead, companyFigures, fact, carCard, caseCard, reviewCard, faqList, rail, railNav, ctaBand, seoText,
} from '../components/ui.mjs';
import { whyFacts, homeProcess, homeFaq } from '../data/texts.mjs';
import { quizSection } from '../components/quiz.mjs';
import { miniCalcSection } from '../components/calc.mjs';
import { R } from '../routes.mjs';

const MARQUEE = ['Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Lexus', 'Hyundai', 'Kia', 'Genesis', 'Geely', 'Changan', 'Haval', 'Zeekr', 'BYD', 'Li Auto', 'Chery'];

function hero() {
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
          <h1 class="hero-title hero__title" data-hero-in style="--i:1">Авто из Японии, Кореи и&nbsp;Китая под&nbsp;заказ</h1>
          <div class="hero__side" data-hero-in style="--i:2">
            <p class="lead">${typo('Максимально прозрачный процесс импорта: подбираем, проверяем, покупаем и привозим автомобиль под ваш запрос и бюджет.')}</p>
            <div class="hero__actions">
              ${btn('Рассчитать стоимость', R.calculator, { variant: 'light', modal: 'request', subject: 'Расчет стоимости авто (главная, первый экран)' })}
              ${btn('Смотреть каталог', R.catalog, { variant: 'ghost' })}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function brandsStrip(ctx) {
  const brands = new Map();
  for (const brand of ctx.brands) {
    if (!brands.has(brand.name)) brands.set(brand.name, brand);
  }
  const names = [...new Set([...MARQUEE, ...brands.keys()])].filter((name) => brands.has(name));
  const group = (duplicate) => html`<div class="marquee__group"${duplicate ? ' aria-hidden="true" inert' : ''}>
    ${names.map((name) => {
      const b = brands.get(name);
      const src = `assets/img/makes/${b.slug}.webp`;
      const size = imgSize(src);
      // При ширине S·√(w/h) каждый знак занимает одинаковую площадь S² с родными пропорциями.
      const widthFactor = size ? Math.sqrt(size.w / size.h).toFixed(3) : 1;
      return html`<a class="marquee__item" href="${u(b.url)}" style="--mark-width:${widthFactor}"${duplicate ? ' tabindex="-1"' : ''}>
        ${img({ src, alt: name })}
      </a>`;
    })}
  </div>`;
  return html`<div class="brands-strip" aria-label="Марки автомобилей"><div class="marquee">
    <div class="marquee__track">${group(false)}${group(true)}</div>
  </div></div>`;
}

function countriesSection(ctx) {
  return html`
    <section class="section" id="strany">
      <div class="container">
        ${sectionHead({
          label: 'Направления',
          title: duo('Три рынка,', 'одна команда на всех этапах'),
          lead: 'Сравните цены под ключ во Владивостоке и посмотрите автомобили из каждой страны.',
        })}
        <div class="grid grid--3">
          ${ctx.nav.countries.map((c, i) => {
            const prices = ctx.cars.filter((x) => x.country === c.slug && x.priceRub && !x.priceIsPartial).map((x) => x.priceRub);
            return html`<article class="country country--light"${reveal(i)}>
              <div class="country__bg">${img({ src: 'assets/' + c.image, alt: '', sizes: '(max-width: 900px) 100vw, 33vw' })}</div>
              <div>
                <h3 class="country__title country-label">
                  ${img({ src: 'assets/' + c.flag, cls: 'country-label__flag', alt: '' })}${esc(c.navTitle)}
                </h3>
                <p class="country__text">${esc(c.featuredMakes.join(' · '))}</p>
              </div>
              <div class="country__body">
                <div class="country__stat"><b>${prices.length ? 'от ' + price(Math.min(...prices)) : 'По запросу'}</b>под ключ во Владивостоке</div>
                ${btn(`Перейти к каталогу ${c.gen}`, c.url, { variant: 'dark', size: 'sm' })}
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

function aboutSection(ctx) {
  const figures = [
    { value: ctx.countries.length, name: 'Рынки закупки автомобилей', url: R.catalog },
    { value: ctx.cases.length, name: 'Истории заказов клиентов', url: R.cases },
    { value: ctx.cities.length, name: 'Города в таблице доставки', url: R.delivery },
    { value: ctx.site.rating.value.toFixed(1).replace('.', ','), name: 'Оценка в опубликованных отзывах клиентов', url: R.reviews },
  ];
  return html`<section class="section section--white" id="o-nas">
    <div class="container">
      ${sectionHead({ title: duo('О нас', 'в цифрах'), layout: 'stack',
        lead: 'Мы работаем во Владивостоке. Подбираем автомобиль, организуем покупку и доставку до вашего города.',
        actions: more('О компании', R.about) })}
      ${companyFigures(figures)}
    </div>
  </section>`;
}

function catalogSection(ctx) {
  if (!ctx.cars.length) return '';
  const markets = [{ slug: 'all', navTitle: 'Все', url: R.catalog }, ...ctx.nav.countries];
  const selections = ctx.selections.filter((s) => s.nav !== false && s.count).slice(0, 7);
  const byMarket = ctx.countries.map((c) => ctx.cars.filter((car) => car.country === c.slug));
  const mixed = [];
  const longest = Math.max(...byMarket.map((group) => group.length));
  for (let index = 0; index < longest; index++) {
    for (const group of byMarket) if (group[index]) mixed.push(group[index]);
  }
  return html`
    <section class="section section--white" id="katalog" data-home-catalog>
      <div class="container">
        ${sectionHead({
          label: 'Каталог',
          title: duo('Автомобили, которые можно', 'заказать прямо сейчас'),
          lead: 'Примеры с аукционов и площадок с расчетом цены во Владивостоке. Не нашли нужный? Подберем под запрос.',
          actions: html`<div class="catalog-choices">
            <div class="tabs" role="group" aria-label="Страна">
              ${markets.map((m) => html`<a class="tabs__btn" href="${u(m.url)}" data-home-country="${m.slug}">${esc(m.navTitle)}${m.count ? `<small>${m.count}</small>` : ''}</a>`)}
            </div>
            <div class="chips" role="group" aria-label="Подборка">
              ${selections.map((s) => html`<a class="chip chip--sm" href="${u(s.url)}" data-home-selection="${s.slug}">${esc(s.name)}</a>`)}
            </div>
          </div>`,
        })}
        <p class="sr-only" role="status" data-home-status></p>
        <div class="grid grid--4 m-rail" id="home-cars">
          ${mixed.map((car, i) => carCard(car, { i: i % 4, attributes: {
            hidden: i >= 8, 'data-selections': selections.filter((s) => s.test(car)).map((s) => s.slug).join(' '),
          } }))}
        </div>
        <div class="empty" data-home-empty hidden>
          <p>Сейчас в каталоге нет автомобилей по этим параметрам.</p>
          <button class="btn btn--ghost" type="button" data-home-reset>Сбросить фильтры</button>
        </div>
        <div class="section-foot">
          ${btn('Весь каталог Max Group', R.catalog, { variant: 'dark' })}
        </div>
      </div>
    </section>`;
}

function stepsSection() {
  return html`
    <section class="section section--white" id="kak-my-rabotaem">
      <div class="container">
        ${sectionHead({
          label: 'Как мы работаем',
          title: duo('От заявки до ключей', 'за шесть понятных шагов'),
          lead: 'Что делаете вы и что делает Макс Групп на каждом этапе покупки.',
          actions: more('Подробно о каждом шаге', R.howTo),
        })}
        <table class="process" aria-label="Этапы сделки и обязанности сторон">
          <thead><tr><th scope="col">Этап</th><th scope="col">Что делаете вы</th><th scope="col">Что делает Макс Групп</th></tr></thead>
          <tbody>${homeProcess.map((s, i) => html`<tr>
            <th scope="row"><span class="process__number">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</th>
            <td><b class="process__role" aria-hidden="true">Вы</b>${typo(s.client)}</td>
            <td><b class="process__role" aria-hidden="true">Что делает Макс Групп</b>${typo(s.team)}</td>
          </tr>`)}</tbody>
        </table>
      </div>
    </section>`;
}

function casesSection(ctx) {
  const cases = ctx.cases.slice(0, 12);
  return html`
    <section class="section section--white" id="privezennye-avto">
      <div class="container">
        ${sectionHead({
          label: 'Привезенные авто',
          title: duo('Авто, которые мы', 'привезли и везем'),
          lead: 'Реальные автомобили наших клиентов: доставленные, в пути и на торгах.',
          aside: railNav(),
        })}
        ${rail(cases.map((c, i) => caseCard(c, { i, stack: true, estimate: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
        <div class="section-foot">
          <p class="muted" style="max-width:52ch">${typo('На карточках указана примерная стоимость на дату покупки. Состав расходов и маршрут смотрите в истории сделки.')}</p>
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
  const main = ctx.services.filter((s) => s.slug !== 'avtokredit');
  const credit = ctx.source.credit;
  return html`
    <section class="section section--white" id="uslugi">
      <div class="container">
        ${sectionHead({
          label: 'Услуги',
          title: duo('Не только подбор:', 'вся инфраструктура импорта'),
          lead: 'Таможенное оформление и оплату за рубеж берем на себя: вам не нужно искать брокера и способ оплатить инвойс.',
          actions: more('Все услуги', R.services),
        })}
        <div class="svc-grid">
          ${main.map(
            (s, i) => html`
          <article class="svc svc--light"${reveal(i % 2)}>
            <div class="svc__bg">${img({ src: 'assets/' + s.image.replace('.webp', '-light.webp'), alt: '', sizes: '(max-width: 720px) 100vw, 50vw' })}</div>
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
    <section class="section section--sm section--white" id="avtokredit">
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
              ${btn('Подобрать программу', R.service('avtokredit'), { variant: 'primary', modal: 'request', subject: 'Автокредит', attrs: { 'data-modal-title': 'Кредит на авто', 'data-modal-text': 'Оставьте заявку, и мы поможем с одобрением кредита в одном из банков-партнеров.', 'data-modal-label': 'Автокредит' } })}
              <div class="banks" aria-label="Банки-партнеры">
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
          lead: 'Отзывы клиентов из 2ГИС и Яндекс Карт без правок, с фотографиями полученных автомобилей.',
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

function deliverySection(ctx) {
  if (!ctx.cities.length) return '';
  const cities = ctx.cities.slice(0, 14);
  const half = Math.ceil(cities.length / 2);
  const col = (list, dup = false) => html`
          <div>
            <div class="cities__head${dup ? ' cities__head--dup' : ''}"><span class="label label--plain">Город</span><span class="label label--plain">Срок</span><span class="label label--plain">Автовоз</span><span></span></div>
            ${list.map((c) => `<a class="city-row" href="${u(c.url)}"><span class="city-row__name">${esc(c.name)}</span><span class="city-row__val">${esc(c.daysLabel || 'по запросу')}</span><span class="city-row__val">${c.priceFrom ? 'от ' + price(c.priceFrom) : 'по запросу'}</span>${icon('arrow')}</a>`)}
          </div>`;
  return html`
    <section class="section" id="dostavka">
      <div class="container">
        ${sectionHead({
          label: 'Доставка по России',
          title: duo('Из Владивостока', 'в любой город страны'),
          lead: 'Отправляем автомобили автовозом и по железной дороге. Ориентиры по срокам и стоимости собраны в таблице, точный расчет пришлет менеджер.',
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
          lead: 'Реальные цены, честные обзоры и новости авторынка в Instagram, Telegram и на YouTube.',
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
              ${img({ src: v.cover, alt: `Видео «${v.title}», ${v.viewsOnCover} просмотров`, sizes: '(max-width: 900px) 60vw, 18vw' })}
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
              <div class="post__meta"><span>${esc(p.category || 'Блог')}</span>${p.readMin ? `<span>${p.readMin} мин чтения</span>` : ''}</div>
              <${tag} class="post__title"><a href="${u(p.url)}">${typo(esc(p.title))}</a></${tag}>
              <p class="post__text">${typo(esc(p.description || ''))}</p>
              <span class="post__more">Читать</span>
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
            <p class="lead">${typo('Коротко о цене, сроках, оплате и проверке автомобиля. Не нашли ответ? Спросите менеджера.')}</p>
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
      title: 'Авто из Японии, Кореи и Китая под заказ во Владивостоке | Макс Групп',
      description:
        'Авто из Японии, Кореи и Китая под заказ с доставкой по России. Подбор на аукционах, проверка, таможенное оформление во Владивостоке. Рассчитайте цену под ключ.',
      h1: 'Авто из Японии, Кореи и Китая под заказ',
      headerOver: true,
      scripts: ['quiz', 'home-catalog', 'calc-core', 'calc'],
      priority: 1,
      changefreq: 'daily',
      preload: [{ href: 'img/hero/poster.webp', as: 'image', type: 'image/webp' }],
      jsonld: [
        faqLd(homeFaq),
        itemListLd(site, 'Автомобили под заказ', ctx.cars.slice(0, 12).map((c) => ({ url: c.url, name: c.titleYear }))),
      ].filter(Boolean),
      render: () =>
        [
          hero(),
          brandsStrip(ctx),
          quizSection(ctx, { subject: 'Квиз подбора (главная)', askDeliveryCity: false }),
          aboutSection(ctx),
          countriesSection(ctx),
          whySection(ctx),
          catalogSection(ctx),
          miniCalcSection(ctx, { cls: 'section--white section--flush-top' }),
          stepsSection(ctx),
          casesSection(ctx),
          servicesSection(ctx),
          reviewsSection(ctx),
          deliverySection(ctx),
          videoSection(ctx),
          blogSection(ctx),
          faqSection(ctx),
          seoSection(ctx),
          ctaBand(ctx, { subject: 'Заявка с главной страницы', bg: 'assets/img/hero/bridge-drive.webp' }),
        ].join('\n'),
    },
  ];
}
