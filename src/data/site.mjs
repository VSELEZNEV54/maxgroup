// Конфигурация сайта. Факты о компании берутся из data/source/maxgroup.json (собрано с maxgroupvl.ru).
import { readJson } from '../lib/core.mjs';

const src = readJson('data/source/maxgroup.json');
const co = src.company;
/** Телефоны на сайте: общий номер (Сергей Усов) и Владислав Ли. Остальные номера сотрудников не публикуем (решение 12.11.2026). */
export const SITE_TELS = ['+79244377700', '+79242577744'];
const primary = co.phones.find((p) => p.primary) || co.phones[0];

export const site = {
  // Домен для canonical / sitemap / schema.org. Меняется в одном месте.
  url: 'https://www.maxgroupvl.ru',
  name: 'Макс Групп',
  altNames: ['Максгрупп', 'Max Group', 'МАКС ГРУПП'],
  tagline: 'Автомобили из Японии, Кореи и Китая под заказ',
  description:
    'Макс Групп: подбор, проверка, покупка и доставка автомобилей из Японии, Южной Кореи и Китая под заказ. Полное сопровождение сделки: таможенное оформление во Владивостоке, платежи за рубеж и доставка по России.',
  footerText: 'Импорт автомобилей из Японии, Кореи и Китая. Полное сопровождение сделки от подбора до получения.',
  ogImage: 'img/og/default.jpg',
  priceRange: '₽₽',
  locale: 'ru_RU',

  // Реквизитов на текущем сайте заказчика нет — заполнить перед запуском (важный коммерческий фактор Яндекса).
  legal: { name: null, inn: null, ogrn: null },

  contacts: {
    city: co.address.city,
    region: co.address.region,
    street: co.address.street,
    office: `офис ${co.address.office}`,
    addressFull: co.address.full,
    postalCode: null,
    geo: co.address.geo?.lat ? { lat: co.address.geo.lat, lon: co.address.geo.lng ?? co.address.geo.lon } : null,
    hours: 'Пн-Пт 10:00-19:00',
    hoursShort: 'Пн-Пт 10-19 по Владивостоку',
    hoursSpec: [{ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: co.schedule.opens, closes: co.schedule.closes }],
    email: co.email,
    phones: [
      { label: primary.display, tel: primary.tel, person: 'Сергей Усов' },
      ...co.phones.filter((p) => p !== primary && SITE_TELS.includes(p.tel)).map((p) => ({ label: p.display, tel: p.tel, person: p.person.replace(/\s*\(.*\)$/, '') })),
    ],
    maps: { twoGis: co.links.twoGis, yandex: co.links.yandexMaps },
  },

  socials: {
    whatsapp: { name: 'WhatsApp', url: co.links.whatsapp },
    telegram: { name: 'Telegram-канал', url: co.links.telegramChannel, handle: '@maxgroup_auto' },
    max: co.links.max ? { name: 'MAX', url: co.links.max } : null,
    instagram: { name: 'Instagram', url: co.links.instagram, handle: '@max.group.auto' },
    youtube: { name: 'YouTube', url: co.links.youtube, handle: '@MaxGroupAuto' },
  },

  // Рейтинг из блока отзывов на сайте заказчика: 13 отзывов, все 5,0 (12 — 2ГИС, 1 — Яндекс Карты).
  rating: { value: 5, count: src.reviews.length, source: '2ГИС и Яндекс Карты', twoGisCount: src.reviews.filter((r) => r.source === '2ГИС').length },
};

// Юридические тексты заказчика показываем как есть, кроме длинного тире: на сайте его нет (решение 12.11.2026)
const LEGAL_DASH = [
  ['*Instagram — продукт', '*Instagram: продукт'],
  [/\(далее — ([^)]+)\)/g, '(далее $1)'],
  ['Cookie-файлы — это', 'Cookie-файлы представляют собой'],
];
const undash = (v) => (typeof v === 'string' ? LEGAL_DASH.reduce((t, [a, b]) => (a instanceof RegExp ? t.replace(a, b) : t.split(a).join(b)), v) : Array.isArray(v) ? v.map(undash) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, undash(x)])) : v);
if (src.company?.instagramDisclaimer) src.company.instagramDisclaimer = undash(src.company.instagramDisclaimer);
if (src.privacyPolicy) src.privacyPolicy = undash(src.privacyPolicy);

export const source = src;
