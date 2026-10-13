// Шапка с мега-меню, мобильная шторка и плавающая нижняя «пилюля».
import { html, esc, u, cx } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { logo } from './logo.mjs';

const isCurrent = (page, url) => (page.url === url || (url !== '/' && page.url.startsWith(url)) ? ' aria-current="page"' : '');

// Telegram: личного адреса менеджера в данных заказчика нет — ссылка ведёт на канал, и подписана она как канал.
// Появится site.socials.telegramManager — подпись и ссылка сменятся сами.
const telegram = (site) => {
  const manager = site.socials.telegramManager;
  const link = manager || site.socials.telegram;
  return link ? { url: link.url, label: manager ? 'Написать в Telegram' : 'Telegram-канал', short: manager ? 'Telegram' : 'Telegram-канал' } : null;
};

function megaCatalog(ctx) {
  const { nav } = ctx;
  return html`
        <div class="mega" id="mega-catalog">
          <div class="container mega__inner">
            ${nav.countries.map(
              (c) => html`
            <div class="mega__col">
              <div class="mega__title">
                <a href="${u(c.url)}">${esc(c.navTitle)}</a>
                <span class="label label--plain">${c.count}</span>
              </div>
              <ul class="mega__list">
                ${c.brands.map((b) => `<li><a href="${u(b.url)}">${esc(b.name)}<small>${b.count}</small></a></li>`)}
              </ul>
              <a class="more mega__all" href="${u(c.url)}">Все авто ${esc(c.from)} ${icon('arrow')}</a>
            </div>`
            )}
            <div class="mega__col">
              <div class="mega__title"><a href="${u(nav.selectionsUrl)}">Подборки</a></div>
              <ul class="mega__list mega__list--1">
                ${nav.selections.map((s) => `<li><a href="${u(s.url)}">${esc(s.name)}<small>${s.count}</small></a></li>`)}
              </ul>
              <a class="more mega__all" href="${u(nav.catalogUrl)}">Весь каталог ${icon('arrow')}</a>
            </div>
          </div>
        </div>`;
}

function megaList(id, groups, promo) {
  return html`
        <div class="mega mega--simple" id="${id}">
          <div class="container mega__inner">
            ${groups.map(
              (g) => html`
            <div class="mega__col">
              <div class="mega__title">${g.url ? `<a href="${u(g.url)}">${esc(g.title)}</a>` : `<span class="label">${esc(g.title)}</span>`}</div>
              <ul class="mega__list mega__list--1">
                ${g.items.map((it) => `<li><a href="${u(it.url)}">${esc(it.name)}</a></li>`)}
              </ul>
            </div>`
            )}
            ${promo
              ? html`
            <div class="mega__col">
              <div class="mega__promo">
                <div>
                  <span class="label">${esc(promo.label)}</span>
                  <p class="h4 u-mt-4" style="color:#fff">${esc(promo.title)}</p>
                  <p>${esc(promo.text)}</p>
                </div>
                <a class="btn btn--light btn--sm" href="${u(promo.url)}"${promo.modal ? ` data-modal="${promo.modal}"` : ''}>${esc(promo.cta)} ${icon('arrow', 'i-arrow')}</a>
              </div>
            </div>`
              : ''}
          </div>
        </div>`;
}

export function header(ctx, page) {
  const { site, nav } = ctx;
  const phone = site.contacts.phones[0];
  const tg = telegram(site);
  return html`
    <header class="${cx('header', page.headerOver && 'header--over')}" data-header>
      <div class="container header__inner">
        ${logo(site)}
        <nav class="nav" aria-label="Основная навигация">
          <div class="nav__item" data-mega>
            <a class="nav__link" href="${u(nav.catalogUrl)}" aria-haspopup="true" aria-expanded="false" aria-controls="mega-catalog"${['catalog', 'country', 'brand', 'model', 'car', 'selection'].includes(page.type) ? ' aria-current="page"' : ''}>Каталог ${icon('chevron')}</a>
            ${megaCatalog(ctx)}
          </div>
          <div class="nav__item" data-mega>
            <a class="nav__link" href="${u(nav.servicesUrl)}" aria-haspopup="true" aria-expanded="false" aria-controls="mega-services"${isCurrent(page, nav.servicesUrl)}>Услуги ${icon('chevron')}</a>
            ${megaList('mega-services', nav.serviceGroups, nav.servicePromo)}
          </div>
          ${nav.top.map((l) => `<div class="nav__item"><a class="nav__link" href="${u(l.url)}"${isCurrent(page, l.url)}>${esc(l.name)}</a></div>`)}
          <div class="nav__item" data-mega>
            <a class="nav__link" href="${u(nav.aboutUrl)}" aria-haspopup="true" aria-expanded="false" aria-controls="mega-company"${isCurrent(page, nav.aboutUrl)}>Компания ${icon('chevron')}</a>
            ${megaList('mega-company', nav.companyGroups, nav.companyPromo)}
          </div>
        </nav>
        <div class="header__side">
          <div class="header__icons">
            ${site.socials.whatsapp ? `<a class="icon-btn" href="${esc(site.socials.whatsapp.url)}" target="_blank" rel="noopener" aria-label="Написать в WhatsApp" title="Написать в WhatsApp">${icon('whatsapp')}</a>` : ''}
            ${tg ? `<a class="icon-btn" href="${esc(tg.url)}" target="_blank" rel="noopener" aria-label="${tg.label}" title="${tg.label}">${icon('telegram')}</a>` : ''}
          </div>
          <div class="header__phone">
            <a href="tel:${phone.tel}">${esc(phone.label)}</a>
            <span>${esc(site.contacts.hoursShort)}</span>
          </div>
          <a class="btn btn--primary btn--sm header__cta" href="${u('/kalkulyator/')}" data-modal="request" data-modal-subject="Расчёт стоимости авто"><span>Рассчитать<span class="header__cta-rest"> стоимость</span></span></a>
          <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="drawer" data-burger><span></span><span></span></button>
        </div>
      </div>
    </header>`;
}

export function drawer(ctx) {
  const { site, nav } = ctx;
  const phone = site.contacts.phones[0];
  const tg = telegram(site);
  const plus = icon('plus');
  return html`
    <div class="drawer" id="drawer" aria-hidden="true" data-drawer>
      <ul class="drawer__nav" aria-label="Меню сайта">
        ${nav.countries.map(
          (c) => html`
        <li>
          <details>
            <summary>${esc(c.navTitle)} ${plus}</summary>
            <div class="drawer__sub">
              <a class="is-strong" href="${u(c.url)}">Все авто ${esc(c.from)} — ${c.count}</a>
              ${c.brands.map((b) => `<a href="${u(b.url)}">${esc(b.name)}</a>`)}
            </div>
          </details>
        </li>`
        )}
        <li>
          <details>
            <summary>Подборки ${plus}</summary>
            <div class="drawer__sub">
              <a class="is-strong" href="${u(nav.catalogUrl)}">Весь каталог</a>
              ${nav.selections.map((s) => `<a href="${u(s.url)}">${esc(s.name)}</a>`)}
            </div>
          </details>
        </li>
        <li>
          <details>
            <summary>Услуги ${plus}</summary>
            <div class="drawer__sub">
              ${nav.serviceGroups.flatMap((g) => g.items).map((s) => `<a href="${u(s.url)}">${esc(s.name)}</a>`)}
            </div>
          </details>
        </li>
        ${nav.top.map((l) => `<li><a href="${u(l.url)}">${esc(l.name)} ${icon('arrow')}</a></li>`)}
        <li>
          <details>
            <summary>Компания ${plus}</summary>
            <div class="drawer__sub">
              ${nav.companyGroups.flatMap((g) => g.items).map((s) => `<a href="${u(s.url)}">${esc(s.name)}</a>`)}
            </div>
          </details>
        </li>
      </ul>
      <div class="drawer__foot">
        <a class="btn btn--primary btn--block" href="${u('/kalkulyator/')}" data-modal="request" data-modal-subject="Расчёт стоимости авто">Рассчитать стоимость ${icon('arrow', 'i-arrow')}</a>
        <div class="form__row">
          ${site.socials.whatsapp ? `<a class="btn btn--wa btn--block" href="${esc(site.socials.whatsapp.url)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : ''}
          ${tg ? `<a class="btn btn--tg btn--block" href="${esc(tg.url)}" target="_blank" rel="noopener">${icon('telegram')} ${tg.short}</a>` : ''}
        </div>
      </div>
      <div class="drawer__contacts">
        <a href="tel:${phone.tel}">${esc(phone.label)}</a>
        <span>${esc(site.contacts.hours)}</span>
        <span>${esc(site.contacts.addressFull)}</span>
      </div>
    </div>`;
}

export function dock(ctx) {
  const { site } = ctx;
  const tg = telegram(site);
  // на телефоне в «пилюле» четыре элемента по 44px: кнопка, WhatsApp, звонок, меню — Telegram остаётся в меню и футере
  return html`
    <div class="dock" data-dock>
      <a class="dock__cta" href="${u('/kalkulyator/')}" data-modal="request" data-modal-subject="Расчёт стоимости авто"><span>Рассчитать<span class="dock__cta-rest"> стоимость</span></span></a>
      ${site.socials.whatsapp ? `<a class="dock__btn" href="${esc(site.socials.whatsapp.url)}" target="_blank" rel="noopener" aria-label="Написать в WhatsApp">${icon('whatsapp')}</a>` : ''}
      ${tg ? `<a class="dock__btn u-hide-mobile" href="${esc(tg.url)}" target="_blank" rel="noopener" aria-label="${tg.label}">${icon('telegram')}</a>` : ''}
      <a class="dock__btn u-only-mobile" href="tel:${site.contacts.phones[0].tel}" aria-label="Позвонить">${icon('phone')}</a>
      <button class="dock__btn dock__btn--menu" type="button" aria-label="Меню" aria-expanded="false" aria-controls="drawer" data-burger>${icon('menu')}</button>
    </div>`;
}
