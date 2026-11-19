// Страница конкретного лота. Один макет для выпуска сайта и свежей выдачи предпросмотра.
import { a, esc, html, km, liters, price } from '../lib/core.mjs';
import { R } from '../routes.mjs';
import { offerVehicle } from '../data/model-offers.mjs';
import { btn, crumbs, icon, more, specList } from '../components/ui.mjs';
import { checkedTime, offerPhoto, stockPhoto } from '../components/model-offers.mjs';
import { salesManagerCard } from '../components/catalog.mjs';

export function modelOfferPage(ctx, entry, offer, checkedAt, photoUrl = stockPhoto) {
  const car = offerVehicle(entry, offer);
  const market = ctx.countryBySlug[entry.country];
  const number = 'Объявление № ' + offer.id;
  const breadcrumbs = [{ name: 'Главная', url: R.home }, { name: 'Каталог', url: R.catalog },
    { name: entry.name, url: entry.url }, { name: 'Автомобили и цены', url: entry.pricesUrl }, { name: number, url: car.url }];
  const facts = [car.year && car.year + ' г.', car.mileageKm != null && km(car.mileageKm), car.engine.type].filter(Boolean);
  const specs = [['Марка', car.brand], ['Модель', car.model], ['Комплектация', offer.trim], ['Год выпуска', car.year],
    ['Пробег', car.mileageKm != null ? km(car.mileageKm) : ''], ['Топливо', car.engine.type], ['Объем двигателя', liters(offer.cc)],
    ['Мощность', offer.hp && offer.hp + ' л.с.'], ['Кузов', offer.body], ['Коробка передач', offer.transmission],
    ['Привод', offer.drive], ['Аукционная оценка', offer.grade], ['Страна покупки', market.name]];
  const subject = 'Заявка на ' + car.titleYear + ', ' + number.toLowerCase();
  return {
    url: car.url, type: 'car', h1: car.titleYear, breadcrumbs, noindex: true, ogType: 'product',
    title: car.titleYear + ' ' + market.from + ' · № ' + offer.id + ' | Макс Групп',
    description: [car.titleFull + ' ' + market.from, ...facts, number].join(' · ') + '. Уточнить наличие и получить расчет в Макс Групп.',
    scripts: ['model-offers'],
    render: () => {
      const photo = photoUrl(offer);
      return html`<section class="page-head section--sm"><div class="container">${crumbs(breadcrumbs)}</div></section>
        <section class="section section--flush-top"><div class="container carpage">
          <div class="gallery" data-gallery><a class="gallery__main" data-gallery-item href="${esc(photo || a(entry.photo.src))}" data-alt="${esc(photo ? car.titleYear : 'Фото модели ' + entry.name)}">
            ${offerPhoto(entry, offer, photo, true)}<span class="gallery__zoom">${icon('camera')} Увеличить</span></a></div>
          <aside class="buybox"><div class="buybox__card">
            <p class="small muted">${number} · ${esc(market.name)}</p>
            <h1 class="buybox__title">${esc(car.titleFull)}<small>${esc(facts.join(' · '))}</small></h1>
            <div class="buybox__price"><div class="buybox__price-value">${car.priceIsPartial ? '<small>от</small> ' : ''}${price(car.priceRub)}</div>
              ${offer.priceLabel ? `<p class="buybox__price-note">${esc(offer.priceLabel)}</p>` : ''}
              ${offer.priceNotice ? `<p class="breakdown__note">${esc(offer.priceNotice)}</p>` : ''}
              <p class="small muted">Проверено ${checkedTime(checkedAt)}.</p></div>
            <div class="buybox__actions">${btn('Уточнить наличие и стоимость', R.contacts, { modal: 'request', block: true, subject,
              attrs: { 'data-modal-title': 'Заявка на ' + car.titleFull, 'data-modal-car': car.titleYear + ' · № ' + offer.id,
                'data-modal-text': 'Проверим наличие этого автомобиля и пришлем расчет до вашего города.' } })}</div>
          </div>${salesManagerCard(ctx.site)}</aside>
        </div></section>
        <section class="section section--white"><div class="container"><h2>Характеристики автомобиля</h2>
          ${specList(specs.map(([label, value]) => [label, esc(value)]), { cols: true })}
          <div class="btn-row u-mt-6">${more('Все предложения ' + entry.name, entry.pricesUrl)}${more('Подбор ' + entry.name, entry.pricesUrl + '#podbor')}</div>
        </div></section>`;
    },
  };
}

export function modelOfferPages(ctx) {
  return ctx.popularModels.flatMap((entry) => (entry.offers?.cars || []).map((offer) =>
    modelOfferPage(ctx, entry, offer, entry.offers.checkedAt)));
}
