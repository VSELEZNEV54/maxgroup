// Услуги. Короткие тексты (short) четырех услуг — «Автомобиль под заказ», «Таможенный брокер», «Платежный агент», «Партнерам и дилерам» —
// дословно с maxgroupvl.ru; автокредит — из баннера кредита там же; аукционы — по составу работ из расчета каталога (перевод листов, подбор и покупка).
// Подробное наполнение страниц — data/content/services.json. Новых обещаний от имени компании сюда не добавлять.
import { R } from '../routes.mjs';

const svc = (o) => ({ ...o, url: R.service(o.slug) });

export const services = [
  svc({
    slug: 'avto-pod-zakaz',
    name: 'Автомобиль под заказ',
    navName: 'Авто под заказ',
    short: 'Везем автомобиль под вас с подбором, оформлением и доставкой под ключ.',
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
    short: 'Берем на себя таможенное оформление, расчет пошлин и подготовку документов.',
    image: 'img/services/service-container.webp',
    icon: 'doc-check',
    label: 'Оформление',
  }),
  svc({
    slug: 'platezhnyj-agent',
    listed: false,
    name: 'Платежный агент',
    navName: 'Платежный агент',
    short: 'Проводим платежи за рубеж легально и прозрачно, с полным комплектом документов и без валютных рисков для вас.',
    image: 'img/services/service-card.webp',
    icon: 'wallet',
    label: 'Платежи',
  }),
  svc({
    slug: 'avtokredit',
    name: 'Автокредит',
    navName: 'Автокредит',
    short: 'Подберем удобную программу покупки автомобиля в кредит: сравним предложения банков-партнеров и поможем с оформлением.',
    image: 'img/misc/credit-banner-mercedes-desktop.webp',
    icon: 'percent',
    label: 'Финансы',
  }),
];

export const serviceGroups = [
  { title: 'Покупка', items: ['avto-pod-zakaz', 'aukciony-yaponii', 'avtokredit'] },
  { title: 'Оформление', items: ['tamozhennoe-oformlenie'] },
];
