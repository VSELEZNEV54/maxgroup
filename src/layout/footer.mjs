// Футер: контакты, полная перелинковка по разделам, реквизиты.
import { html, esc, u } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { logo } from './logo.mjs';

const SOCIAL_ICON = { whatsapp: 'whatsapp', telegram: 'telegram', telegramManager: 'telegram', instagram: 'instagram', youtube: 'youtube', vk: 'vk', max: 'max' };

export function socialButtons(site, keys = ['telegram', 'whatsapp', 'max', 'instagram', 'youtube', 'vk']) {
  return keys
    .filter((k) => site.socials[k]?.url)
    .map((k) => {
      const s = site.socials[k];
      return `<a class="icon-btn" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}" title="${esc(s.name)}">${icon(SOCIAL_ICON[k])}</a>`;
    })
    .join('');
}

export function footer(ctx) {
  const { site, nav, build } = ctx;
  const c = site.contacts;
  const legal = site.legal;
  const year = build.year;
  // На телефоне колонки сворачиваются в аккордеон (js/main.js, [data-footer-toggle]); без JS и на десктопе списки раскрыты.
  let colN = 0;
  const col = (title, items, more, listCls = '') => {
    const id = `footer-col-${++colN}`;
    return html`
          <div class="footer__col" data-footer-col>
            <h3>${esc(title)}<button class="footer__toggle" type="button" aria-expanded="false" aria-controls="${id}" aria-label="${esc(title)}: показать ссылки" data-footer-toggle>${icon('plus')}</button></h3>
            <ul id="${id}"${listCls ? ` class="${listCls}"` : ''}>
              ${items.map((it) => `<li><a href="${u(it.url)}"${it.strong ? ' class="is-strong"' : ''}>${esc(it.name)}</a></li>`)}
              ${more ? `<li><a class="is-strong" href="${u(more.url)}">${esc(more.name)} →</a></li>` : ''}
            </ul>
          </div>`;
  };
  return html`
    <footer class="footer">
      <div class="container">
        <div class="footer__top">
          <div class="footer__brand">
            ${logo(site)}
            <p>${esc(site.footerText)}</p>
            <div class="footer__socials">${socialButtons(site)}</div>
          </div>
          <dl class="footer__contacts">
            <div class="footer__contact">
              <dt class="label">Телефон</dt>
              <dd>
                ${c.phones.slice(0, 2).map((p) => `<a href="tel:${p.tel}">${esc(p.label)}</a>${p.department ? `<small>${esc(p.department)}</small>` : ''}`).join('<br>')}
              </dd>
            </div>
            <div class="footer__contact">
              <dt class="label">Офис</dt>
              <dd>
                <address>${esc(c.city)}, ${esc(c.street)}</address>
                <small>${esc(c.office)} · ${esc(c.hours)}</small>
              </dd>
            </div>
            <div class="footer__contact">
              <dt class="label">Связь</dt>
              <dd>
                ${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : `<a href="${u('/kontakty/')}">Все контакты</a>`}
                <small><a href="${u('/kontakty/#kak-dobratsya')}">Как добраться</a></small>
              </dd>
            </div>
          </dl>
        </div>

        <nav class="footer__cols" aria-label="Разделы сайта">
          ${nav.countries.map((cn) =>
            col(
              cn.navTitle,
              cn.brands.filter((b) => b.count).slice(0, 8).map((b) => ({ name: `${b.name} ${cn.from}`, url: b.url })),
              { name: `Все авто ${cn.from}`, url: cn.url }
            )
          )}
          ${col('Подборки', nav.selections.slice(0, 9), { name: 'Все подборки', url: nav.selectionsUrl })}
          ${col('Услуги', nav.serviceGroups.flatMap((g) => g.items).slice(0, 9), { name: 'Все услуги', url: nav.servicesUrl })}
          ${col('Компания', nav.footerCompany)}
        </nav>

        <nav class="footer__cols footer__cols--cities" aria-label="Доставка по городам">
          ${col('Доставка авто из Владивостока по России', nav.cities.slice(0, 12), { name: 'Все города', url: nav.deliveryUrl }, 'footer__cities')}
        </nav>

        <div class="footer__legal">
          <div class="footer__owner">
            <div>© ${year} ${esc(legal.name)}, владелец сайта</div>
            <div>ИНН ${esc(legal.inn)} · КПП ${esc(legal.kpp)} · ОГРН ${esc(legal.ogrn)}</div>
            <div>Юридический адрес · ${esc(legal.address)}</div>
          </div>
          <div class="footer__legal-links">
            <a href="${u('/kontakty/#rekvizity')}">Реквизиты компании</a>
            <a href="${u('/politika-konfidencialnosti/')}">Политика конфиденциальности</a>
            <a href="${u('/karta-sajta/')}">Карта сайта</a>
          </div>
          <div class="footer__bottom">
            <p class="footer__note">Информация на сайте носит справочный характер и не является публичной офертой (ст. 437 ГК РФ). Итоговая стоимость автомобиля зависит от курса валют, результатов торгов и действующих таможенных ставок и уточняется у менеджера перед оформлением сделки.${site.socials.instagram ? ' Instagram принадлежит компании Meta, признанной экстремистской организацией и запрещенной в РФ.' : ''}</p>
            <a id="site-credit" class="footer__credit" href="https://t.me/moon_dsgn_sales" target="_blank" rel="noopener">Создание и продвижение сайта</a>
          </div>
        </div>
      </div>
    </footer>`;
}
