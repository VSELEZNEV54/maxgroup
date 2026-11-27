// Один и тот же список отдается в статической странице и при обновлении с сервера.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, html, esc, u, a, dateRu } from '../lib/core.mjs';
import { carCard } from './ui.mjs';
import { filteredEmpty } from './catalog-filters.mjs';
import { offerVehicle, OFFER_LIFETIME } from '../data/model-offers.mjs';

export const freshUntil = (checkedAt) => new Date(Date.parse(checkedAt) + OFFER_LIFETIME).toISOString();

export function cachedOfferPhoto(id) {
  const file = join(ROOT, 'offer-photos.nosync', id + '.webp');
  // Время изменения миниатюры хранит срок действия Cache-Control поставщика.
  return existsSync(file) && statSync(file).mtimeMs > Date.now() ? file : null;
}

export const stockPhoto = (car) => cachedOfferPhoto(car.id) ? u('/model-media/' + car.id + '.webp') : '';

export function offerPhoto(entry, car, photo, priority = false) {
  const fallback = entry.photo?.src ? a(entry.photo.src) : '';
  const src = photo || fallback;
  if (!src) return '';
  const alt = [car.title, car.trim, car.year].filter(Boolean).join(' ');
  return html`<img src="${esc(src)}" alt="${esc(photo ? alt : 'Фото модели ' + entry.name)}" width="480" height="320"
    ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-offer-photo data-model-photo="${esc(fallback)}" data-model-name="${esc(entry.name)}">
    <span class="model-photo-caption"${photo ? ' hidden' : ''}>Фото модели</span>`;
}

export function checkedTime(checkedAt) {
  const date = new Date(checkedAt);
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(date);
  const time = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(date);
  return `<time datetime="${esc(checkedAt)}">${dateRu(day)}, ${time} мск</time>`;
}

export function offerList(entry, snapshot, photoUrl = stockPhoto) {
  const checked = Date.parse(snapshot?.checkedAt);
  const fresh = Number.isFinite(checked) && Date.now() - checked <= OFFER_LIFETIME;
  const cars = fresh ? snapshot.cars : [];
  return html`
    <div class="grid grid--4 model-offers" data-cars>
      ${cars.map((offer, i) => carCard(offerVehicle(entry, offer), {
        i, attributes: { 'data-offer-id': offer.id, 'data-popular': 1 }, media: offerPhoto(entry, offer, photoUrl(offer)),
      }))}
    </div>
    ${!fresh ? '<p class="offer-status" data-cars-empty>Сведения о наличии обновляются. Оставьте запрос, чтобы получить предложения по этой модели.</p>'
      : cars.length ? filteredEmpty() : `<div class="offer-empty" data-cars-empty><p class="h4">Сейчас нет предложений по этой модели</p><p>Оставьте запрос на ${esc(entry.name)}. Менеджер проверит площадки и подберет автомобиль под ваш бюджет.</p></div>`}
    ${fresh && html`<p class="offer-status">По данным каталога на ${checkedTime(snapshot.checkedAt)}.</p>`}`;
}
