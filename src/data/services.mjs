// Услуги. Короткие тексты (short) четырёх услуг — «Автомобиль под заказ», «Таможенный брокер», «Платёжный агент», «Партнёрам и дилерам» —
// дословно с maxgroupvl.ru; автокредит — из баннера кредита там же; аукционы — по составу работ из расчёта каталога (перевод листов, подбор и покупка).
// Подробное наполнение страниц — data/content/services.json. Новых обещаний от имени компании сюда не добавлять.
import { R } from '../routes.mjs';

const svc = (o) => ({ ...o, url: R.service(o.slug) });

export const services = [
  svc({
    slug: 'avto-pod-zakaz',
    name: 'Автомобиль под заказ',
    navName: 'Авто под заказ',
    short: 'Везём автомобиль под вас — с подбором, оформлением и доставкой под ключ.',
    image: 'img/services/service-car.webp',
    icon: 'key',
    label: 'Для себя',
  }),
  svc({
    slug: 'aukciony-yaponii',
    name: 'Аукционы Японии онлайн',
    navName: 'Аукционы Японии',
    short: 'Доступ к торгам японских аукционов: подбираем лоты, переводим аукционные листы и делаем ставки за вас.',
    image: 'img/services/service-wheel.webp',
    icon: 'gavel',
    label: 'Торги',
  }),
  svc({
    slug: 'tamozhennoe-oformlenie',
    name: 'Таможенный брокер',
    navName: 'Таможенное оформление',
    short: 'Берём на себя таможенное оформление, расчёт пошлин и подготовку документов.',
    image: 'img/services/service-container.webp',
    icon: 'doc-check',
    label: 'Оформление',
  }),
  svc({
    slug: 'platezhnyj-agent',
    name: 'Платёжный агент',
    navName: 'Платёжный агент',
    short: 'Проводим платежи за рубеж легально и прозрачно — с полным комплектом документов и без валютных рисков для вас.',
    image: 'img/services/service-card.webp',
    icon: 'wallet',
    label: 'Платежи',
  }),
  svc({
    slug: 'dileram',
    name: 'Партнёрам и дилерам',
    navName: 'Дилерам и автосалонам',
    short: 'Работаем с дилерами и автосалонами на индивидуальных условиях.',
    image: 'img/services/service-wheel.webp',
    icon: 'handshake',
    label: 'B2B',
  }),
  svc({
    slug: 'avtokredit',
    name: 'Автокредит',
    navName: 'Автокредит',
    short: 'Подберём удобную программу покупки автомобиля в кредит: сравним предложения банков-партнёров и поможем с оформлением.',
    image: 'img/misc/credit-banner-mercedes-desktop.webp',
    icon: 'percent',
    label: 'Финансы',
  }),
];

export const serviceGroups = [
  { title: 'Покупка', items: ['avto-pod-zakaz', 'aukciony-yaponii', 'avtokredit'] },
  { title: 'Оформление', items: ['tamozhennoe-oformlenie', 'platezhnyj-agent'] },
  { title: 'Бизнесу', items: ['dileram'] },
];
