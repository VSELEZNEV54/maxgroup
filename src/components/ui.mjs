// Библиотека UI-компонентов. Каждый компонент — функция, возвращающая HTML-строку из классов src/css/30-components.css.
import { html, esc, u, a, cx, img, price, km, num, typo, attrs, plural, priceShort, lcFirst } from '../lib/core.mjs';
import { icon, stars } from '../lib/icons.mjs';
import { leadForm } from './forms.mjs';
import { R } from '../routes.mjs';

export { icon, stars, leadForm };

/** Задержка появления: reveal(2) → ' data-reveal style="--i:2"' */
export const reveal = (i = 0) => ` data-reveal${i ? ` style="--i:${i}"` : ''}`;

/** Моно-метка в квадратных скобках */
export const label = (text, cls = '') => `<span class="${cx('label', cls)}">${esc(text)}</span>`;

/**
 * Двухтонный заголовок: duo('Почему выбирают', 'Макс Групп') → чёрная часть + серая часть.
 * Можно передать готовый HTML в первом аргументе и не передавать второй.
 */
export const duo = (main, muted) => `${typo(main)}${muted ? ` <span class="mute">${typo(muted)}</span>` : ''}`;

/** Кнопка-ссылка. variant: primary | dark | light | ghost | wa | tg */
export function btn(text, href, { variant = 'primary', size, arrow = true, block, modal, subject, attrs: extra = {}, iconName } = {}) {
  const isModal = Boolean(modal);
  // заголовок и текст модалки подставляет скрипт — неразрывные пробелы ставим заранее
  const extraAttrs = { ...extra };
  for (const k of ['data-modal-title', 'data-modal-text']) if (extraAttrs[k]) extraAttrs[k] = typo(extraAttrs[k]);
  return `<a class="${cx('btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block')}" href="${u(href)}"${attrs({
    'data-modal': isModal ? modal : null,
    'data-modal-subject': subject || null,
    ...extraAttrs,
  })}>${iconName ? icon(iconName) : ''}${esc(text)}${arrow ? ' ' + icon('arrow', 'i-arrow') : ''}</a>`;
}

/** Ссылка со стрелкой и подчёркиванием */
export const more = (text, href, cls = '') => `<a class="${cx('more', cls)}" href="${u(href)}">${esc(text)} ${icon('arrow')}</a>`;

/**
 * Шапка секции: метка слева, заголовок и лид справа.
 * @param {object} o {label, title (HTML), lead, actions (HTML), tag='h2', layout: 'split'|'stack'|'center', aside (HTML)}
 */
export function sectionHead({ label: lbl, title, lead, actions, tag = 'h2', layout = 'split', aside, id }) {
  const mod = layout === 'stack' ? ' section-head--stack' : layout === 'center' ? ' section-head--center' : '';
  return html`
      <div class="section-head${mod}">
        <div class="section-head__aside"${reveal()}>
          ${lbl ? label(lbl) : ''}
          ${aside || ''}
        </div>
        <div class="section-head__main">
          <${tag}${id ? ` id="${id}"` : ''} data-split>${title}</${tag}>
          ${lead ? `<p class="lead"${reveal(1)}>${typo(lead)}</p>` : ''}
          ${actions ? `<div class="section-head__actions"${reveal(2)}>${actions}</div>` : ''}
        </div>
      </div>`;
}

/** Хлебные крошки (визуальные; микроразметка BreadcrumbList формируется в <head>) */
export function crumbs(items) {
  return html`
        <nav aria-label="Хлебные крошки">
          <ol class="crumbs">
            ${items.map((c, i) => (i < items.length - 1 ? `<li><a href="${u(c.url)}">${esc(c.name)}</a></li>` : `<li aria-current="page">${esc(c.name)}</li>`))}
          </ol>
        </nav>`;
}

/**
 * Шапка внутренней страницы: крошки + H1 + лид + действия.
 * @param {object} o {crumbs, label, h1 (HTML), lead, actions (HTML), side (HTML), dark, photo (путь), kv: [{k,v}]}
 */
export function pageHead({ crumbs: cr, label: lbl, h1, lead, actions, side, dark, photo, photoAlt = '', kv, single, cls }) {
  const kvHtml = kv?.length
    ? `<dl class="kv">${kv.map((x) => `<div class="kv__item"><dt>${esc(x.k)}</dt><dd>${x.v}</dd></div>`).join('')}</dl>`
    : '';
  const hasSide = Boolean(side || actions || kvHtml) && !single;
  return html`
    <section class="${cx('page-head', (dark || photo) && 'page-head--dark on-dark', photo && 'page-head--photo', cls)}">
      ${photo ? `<div class="page-head__bg">${img({ src: photo, alt: photoAlt, priority: true, sizes: '100vw' })}</div>` : ''}
      <div class="container">
        ${cr ? crumbs(cr) : ''}
      </div>
      <div class="container">
        <div class="${cx('page-head__grid', !hasSide && 'page-head__grid--single')}">
          <div class="page-head__main">
            ${lbl ? `<div style="margin-bottom:16px">${label(lbl)}</div>` : ''}
            <h1>${h1}</h1>
            ${lead ? `<p class="lead">${typo(lead)}</p>` : ''}
            ${single && actions ? `<div class="page-head__actions u-mt-6">${actions}</div>` : ''}
            ${single && kvHtml ? `<div class="u-mt-7">${kvHtml}</div>` : ''}
          </div>
          ${hasSide
            ? html`<div class="page-head__side">
            ${side || ''}
            ${kvHtml}
            ${actions ? `<div class="page-head__actions">${actions}</div>` : ''}
          </div>`
            : ''}
        </div>
      </div>
    </section>`;
}

/** Маршрут: route(['Япония', 'Владивосток', 'Иркутск']) — последний пункт выделяется */
export function route(points, cls = '') {
  const p = points.filter(Boolean);
  return `<div class="${cx('route', cls)}">${p.map((x, i) => `${i ? '<i></i>' : ''}${i === p.length - 1 ? `<b>${esc(x)}</b>` : `<span>${esc(x)}</span>`}`).join('')}</div>`;
}

/** Карточка-факт: крупное значение + подпись + пояснение. variant: '' | 'dark' | 'accent' */
export function fact({ value, unit, name, text, link, variant, i = 0 }) {
  return html`
          <article class="${cx('fact', variant && `fact--${variant}`)}"${reveal(i)}>
            <div class="fact__value">${value}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
            <div class="fact__name">${typo(name)}</div>
            <div class="fact__text">
              <p>${typo(text)}</p>
              ${link ? `<a class="link" href="${u(link.url)}"${link.external ? ' target="_blank" rel="noopener"' : ''}>${esc(link.text)}</a>` : ''}
            </div>
          </article>`;
}

/** Простая карточка с иконкой. Если есть href — вся карточка ссылка. */
export function card({ icon: ic, label: lbl, title, text, href, foot, tall, line, i = 0, tag = 'h3' }) {
  const Tag = href ? 'a' : 'article';
  return html`
          <${Tag} class="${cx('card', tall && 'card--tall', line && 'card--line')}"${href ? ` href="${u(href)}"` : ''}${reveal(i)}>
            ${ic ? icon(ic, 'card__icon') : ''}
            ${lbl ? label(lbl) : ''}
            <${tag} class="card__title">${typo(title)}</${tag}>
            ${text ? `<p class="card__text">${typo(text)}</p>` : ''}
            ${foot ? `<div class="card__foot">${foot}</div>` : ''}
          </${Tag}>`;
}

const FLAG = { japan: 'JP', korea: 'KR', china: 'CN' };

/** Короткие характеристики для карточки авто */
export function carSpecs(car) {
  return [car.engineLabel, car.engine?.powerHp ? `${car.engine.powerHp} л.с.` : null, car.drive, car.transmission].filter(Boolean);
}

/** Карточка автомобиля в листинге. data-* атрибуты используются клиентскими фильтрами (js/catalog.js). */
export function carCard(car, { i = 0, tag = 'h3', priority = false, sizes } = {}) {
  const specs = carSpecs(car).slice(0, 4);
  const badges = [];
  if (car.isPassing) badges.push('<span class="badge badge--accent">Проходной</span>');
  // льготный утильсбор: признак считает слой данных (car.isLowPower — без гибридов, электромобилей и спорных авто);
  // запасное условие — на случай, если поля в данных нет
  const lowPower = car.isLowPower ?? Boolean(car.engine?.powerHp && car.engine.powerHp <= 160 && !car.isHybrid && !car.isElectric);
  if (lowPower) badges.push('<span class="badge">до 160 л.с.</span>');
  if (car.mileageKm === 0) badges.push('<span class="badge">Новый</span>');
  return html`
          <article class="car"${reveal(Math.min(i, 5))}${attrs({
            'data-car': car.id,
            'data-country': car.country,
            'data-brand': car.brandSlug,
            'data-model': car.modelSlug,
            'data-year': car.year,
            'data-price': car.priceRub,
            'data-mileage': car.mileageKm,
            'data-hp': car.engine?.powerHp,
            'data-low': car.isLowPower ? 1 : null,
            'data-fuel': car.engine?.type,
            'data-body': car.body,
            'data-drive': car.drive,
          })}>
            <a class="car__media" href="${u(car.url)}" tabindex="-1" aria-hidden="true">
              ${car.photos[0] ? img({ src: car.photos[0], alt: `${car.titleYear} ${car.countryName ? 'из ' + countryGen(car.country) : ''}`.trim(), priority, sizes: sizes || '(max-width: 600px) 100vw, (max-width: 900px) 50vw, (max-width: 1180px) 33vw, 25vw' }) : ''}
              ${badges.length ? `<span class="car__badges">${badges.slice(0, 2).join('')}</span>` : ''}
              ${car.photos.length > 1 ? `<span class="car__count">${icon('camera')}${car.photos.length}</span>` : ''}
            </a>
            <div class="car__body">
              <div class="car__meta">
                <span>${FLAG[car.country] || ''}</span>
                ${car.year ? `<span>${car.year}</span>` : ''}
                ${car.mileageKm || car.mileageKm === 0 ? `<span>${km(car.mileageKm)}</span>` : ''}
                ${car.auctionGrade ? `<span>оценка ${esc(car.auctionGrade)}</span>` : ''}
              </div>
              <${tag} class="car__title"><a href="${u(car.url)}">${esc(car.titleFull)}</a></${tag}>
              <ul class="car__specs">${specs.map((s) => `<li>${esc(s)}</li>`)}</ul>
              <div class="car__foot">
                <div class="car__price">${car.priceIsPartial ? 'от ' : ''}${price(car.priceRub)}<small>${esc(car.priceLabel)}</small></div>
                <span class="car__go" aria-hidden="true">${icon('arrow')}</span>
              </div>
            </div>
          </article>`;
}

const GEN = { japan: 'Японии', korea: 'Кореи', china: 'Китая' };
export const countryGen = (slug) => GEN[slug] || '';

/** Карточка кейса (привезённый автомобиль). stack=true — фото сверху. */
export function caseCard(c, { i = 0, stack = false, tag = 'h3', sizes } = {}) {
  const rows = Object.entries(c.specs || {}).filter(([k]) => !/цвет/i.test(k)).slice(0, 3);
  return html`
          <article class="${cx('case', stack && 'case--stack')}"${reveal(Math.min(i, 5))}>
            <div class="case__media">
              ${img({ src: c.image, alt: `${c.name} — ${c.statusLabel.toLowerCase()}, Макс Групп`, sizes: sizes || '(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw', attrs: c.imageFocus ? { style: `object-position:${c.imageFocus}` } : {} })}
              <span class="status ${c.statusCls}">${esc(c.statusLabel)}</span>
            </div>
            <div class="case__body">
              ${c.countryName || (c.clientCity && c.clientCity !== 'Владивосток') ? route([c.countryName, 'Владивосток', c.clientCity && c.clientCity !== 'Владивосток' ? c.clientCity : null]) : '<div class="route"><span>Привезён во</span> <b>Владивосток</b></div>'}
              <${tag} class="case__title"><a href="${u(c.url)}">${esc(c.name)}</a></${tag}>
              ${rows.length ? `<dl class="case__list">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
              <div class="case__foot">
                ${c.price ? `<div class="case__price">${price(c.price)}<small>${esc(lcFirst(c.priceLabel || 'Стоимость'))}</small></div>` : `<div class="case__price"><small>${esc(c.statusLabel)}</small></div>`}
                <span class="car__go" aria-hidden="true">${icon('arrow')}</span>
              </div>
            </div>
          </article>`;
}

/** Карточка отзыва */
export function reviewCard(r, { i = 0, clamp = true } = {}) {
  return html`
          <article class="review" data-review${reveal(Math.min(i, 4))}>
            <div class="review__head">
              <span class="review__avatar" aria-hidden="true">${esc((r.author || '?').trim()[0].toUpperCase())}</span>
              <div>
                <div class="review__name">${esc(r.author)}</div>
                <div class="review__src">${esc(r.source)}</div>
              </div>
              ${stars(r.rating || 5)}
            </div>
            <p class="${cx('review__text', clamp && 'is-clamped')}">${esc(r.text)}</p>
            ${r.photos?.length
              ? `<div class="review__photos" data-gallery>${r.photos.map((p, pi) => `<a href="${a(p)}" data-gallery-item data-alt="Фото ${pi + 1} к отзыву — ${esc(r.author)}">${img({ src: p, alt: `Фото автомобиля к отзыву — ${r.author}`, sizes: '84px' })}</a>`).join('')}</div>`
              : ''}
            <div class="review__foot">
              ${clamp ? '<button class="link" type="button" aria-expanded="false" data-review-more>Читать полностью</button>' : '<span></span>'}
              ${r.url ? `<a class="link" href="${esc(r.url)}" target="_blank" rel="noopener nofollow">Отзыв в ${esc(r.source)}</a>` : ''}
            </div>
          </article>`;
}

/** Аккордеон FAQ. items: [{q, a (HTML или текст)}]. Микроразметку FAQPage добавляйте в page.jsonld через faqLd(). */
export function faqList(items, { group = true, open = 0 } = {}) {
  return html`
        <div${group ? ' data-acc-group' : ''}>
          ${items.map(
            (f, i) => html`
          <details class="acc"${i === open ? ' open' : ''}${reveal(Math.min(i, 5))}>
            <summary><span>${typo(f.q)}</span><i class="acc__icon" aria-hidden="true"></i></summary>
            <div class="acc__body">${/<(p|ul|ol|div)\b/.test(f.a) ? f.a : `<p>${typo(f.a)}</p>`}</div>
          </details>`
          )}
        </div>`;
}

/** Чипы-ссылки: [{name, url, count?}] */
export function chips(items, { sm = false, current } = {}) {
  return `<div class="chips">${items
    .map((it) => `<a class="${cx('chip', sm && 'chip--sm')}" href="${u(it.url)}"${it.url === current ? ' aria-current="page"' : ''}>${esc(it.name)}${it.count !== undefined ? `<small>${it.count}</small>` : ''}</a>`)
    .join('')}</div>`;
}

/**
 * Шаг процесса. light=true — светлая карточка для светлых секций.
 * s.pay — что обычно оплачивается на шаге; подпись можно заменить через s.payLabel (условий оплаты в данных заказчика нет,
 * поэтому по умолчанию это описание типового порядка, а не обещание).
 */
export function step(s, i, { light = false } = {}) {
  return html`
            <article class="${cx('step', light && 'step--light')}"${reveal(Math.min(i, 4))}>
              <div class="step__head">
                <span class="step__num">Шаг ${String(i + 1).padStart(2, '0')}</span>
                ${s.time ? `<span class="step__num step__time">${esc(s.time)}</span>` : ''}
              </div>
              <h3 class="step__title">${typo(s.title)}</h3>
              <p class="step__text">${typo(s.text)}</p>
              ${s.pay ? `<div class="step__pay"><span>${esc(s.payLabel || 'Обычно оплачивается')}</span>${typo(s.pay)}</div>` : ''}
            </article>`;
}

/** Таблица характеристик: rows = [[ключ, значение], …] */
export function specList(rows, { cols = false } = {}) {
  const r = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  return `<dl class="${cx('spec', cols && 'spec--cols')}">${r.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

/**
 * Таблица: head = ['A','B'], rows = [[…]], numCols — индексы числовых колонок.
 * cls — доп. класс таблицы; mobileHide — индексы второстепенных колонок, которые скрываются на телефоне (≤720px),
 * чтобы главные (название, цена) помещались в экран без прокрутки.
 */
export function table(head, rows, { numCols = [], cls, mobileHide = [] } = {}) {
  const cellCls = (i) => {
    const c = cx(numCols.includes(i) && 'num', mobileHide.includes(i) && 'u-hide-mobile');
    return c ? ` class="${c}"` : '';
  };
  return html`
        <div class="table-wrap">
          <table class="${cx('table', cls)}">
            <thead><tr>${head.map((h, i) => `<th${cellCls(i)}>${h}</th>`)}</tr></thead>
            <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${cellCls(i)}>${c}</td>`).join('')}</tr>`)}</tbody>
          </table>
        </div>`;
}

/** Список с галочками */
export const ticks = (items) => `<ul class="ticks">${items.map((t) => `<li>${icon('check')}<span>${typo(t)}</span></li>`).join('')}</ul>`;

/** Врезка-примечание */
export const note = (text, { warn = false } = {}) => `<div class="${cx('note', warn && 'note--warn')}">${icon(warn ? 'alert' : 'info')}<div>${text}</div></div>`;

/**
 * SEO-текст со сворачиванием: текст остаётся в DOM и индексируется.
 * Если текст начинается с заголовка H2, он уходит в левую колонку, а текст встаёт справа с 5-й колонки —
 * как у остальных секций (заголовок слева, содержимое справа), а не узкой колонкой у левого края.
 */
export function seoText(htmlBody, { max = 420 } = {}) {
  const src = String(htmlBody ?? '');
  const m = src.match(/^\s*(<h2\b[^>]*>[\s\S]*?<\/h2>)\s*/);
  const body = m ? src.slice(m[0].length) : src;
  return html`
        <div class="${cx('seo-text', m && 'seo-text--split')}" data-seo-text style="--seo-max:${max}px">
          ${m ? `<div class="seo-text__head">${m[1]}</div>` : ''}
          <div class="seo-text__body">
            <div class="seo-text__inner"><div class="prose prose--muted">${body}</div></div>
            <button class="more seo-text__toggle" type="button" data-seo-toggle aria-expanded="false"><span>Читать полностью</span> ${icon('arrow-down')}</button>
          </div>
        </div>`;
}

/**
 * Финальный CTA: тёмная полоса с фоном и формой.
 * @param {object} o {label, title (HTML), text, subject, bg (путь к фото), fields, cta, panelTitle, panelText}
 */
export function ctaBand(ctx, { label: lbl = 'Заявка', title, text, subject = 'Заявка с сайта', bg = 'assets/img/hero/bridge-drive.webp', fields = ['name', 'phone', 'car'], cta = 'Получить расчёт', panelTitle = 'Рассчитаем авто под ключ', panelText = 'Ответим в рабочее время, пришлём варианты и полный расчёт.', car, city } = {}) {
  const { site } = ctx;
  // личного Telegram менеджера в данных нет — ссылка ведёт на канал и так и подписана
  const tg = site.socials.telegramManager || site.socials.telegram;
  const tgName = site.socials.telegramManager ? 'Telegram' : 'Telegram-канал';
  return html`
    <section class="cta on-dark" id="zayavka">
      <div class="cta__bg">${img({ src: bg, alt: '', sizes: '100vw' })}</div>
      <div class="container cta__grid">
        <div class="cta__copy"${reveal()}>
          ${label(lbl)}
          <h2>${title || duo('Ваш следующий автомобиль', 'уже ждёт на аукционе')}</h2>
          <p class="lead">${typo(text || 'Расскажите, что ищете — подберём варианты в Японии, Корее и Китае, проверим перед покупкой и посчитаем полную стоимость с доставкой до вашего города.')}</p>
        </div>
        <div class="cta__panel"${reveal(1)}>
          <h3>${esc(panelTitle)}</h3>
          <p>${esc(panelText)}</p>
          ${leadForm({ subject, fields, cta, btn: 'btn--light', car, city })}
          <div class="cta__alt">
            <span>Или свяжитесь напрямую:</span>
            ${site.socials.whatsapp ? `<a class="chip chip--sm" href="${esc(site.socials.whatsapp.url)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : ''}
            <a class="chip chip--sm" href="tel:${site.contacts.phones[0].tel}">${icon('phone')} ${esc(site.contacts.phones[0].label)}</a>
            ${tg ? `<a class="chip chip--sm" href="${esc(tg.url)}" target="_blank" rel="noopener">${icon('telegram')} ${tgName}</a>` : ''}
          </div>
        </div>
      </div>
    </section>`;
}

/** Лента с горизонтальной прокруткой. items — массив готовых HTML-карточек. */
export function rail(items, { col, colMobile } = {}) {
  const style = [col && `--rail-col:${col}`, colMobile && `--rail-col-m:${colMobile}`].filter(Boolean).join(';');
  return html`
      <div class="rail" data-rail>
        <div class="rail__track" data-rail-track${style ? ` style="${style}"` : ''}>
          ${items}
        </div>
      </div>`;
}

export const railNav = () => html`<div class="rail__nav">
            <button class="rail__btn rail__btn--prev" type="button" aria-label="Назад" data-rail-prev>${icon('arrow')}</button>
            <button class="rail__btn rail__btn--next" type="button" aria-label="Вперёд" data-rail-next>${icon('arrow')}</button>
          </div>`;

/** Блок перелинковки: заголовок + чипы */
export function linkBlock(title, items, { tag = 'h3' } = {}) {
  if (!items?.length) return '';
  return html`
        <div class="linkblock">
          <${tag} class="h4">${esc(title)}</${tag}>
          ${chips(items)}
        </div>`;
}

// реэкспорт базовых помощников, чтобы шаблон страницы мог импортировать всё из одного модуля
export { html, esc, u, a, cx, img, typo, attrs, price, km, num, priceShort, plural, lcFirst, R };
