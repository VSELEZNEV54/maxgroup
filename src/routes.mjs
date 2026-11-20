// Единая карта адресов сайта (ЧПУ). Все шаблоны берут ссылки только отсюда.
// Страны живут в корне под ключевой фразой: /avto-iz-yaponii/ → /avto-iz-yaponii/toyota/ → …/alphard/ → …/<лот>/
export const COUNTRY_PATH = { japan: 'avto-iz-yaponii', korea: 'avto-iz-korei', china: 'avto-iz-kitaya' };

export const R = {
  home: '/',

  // Каталог: хаб → страна → марка → модель → автомобиль
  catalog: '/catalog/',
  country: (country) => `/${COUNTRY_PATH[country]}/`,
  topModels: (country) => `/${COUNTRY_PATH[country]}/top-30/`,
  brand: (country, brand) => `/${COUNTRY_PATH[country]}/${brand}/`,
  model: (country, brand, model) => `/${COUNTRY_PATH[country]}/${brand}/${model}/`,
  modelPrices: (modelUrl) => `${modelUrl}ceny-pod-klyuch/`,
  modelOffer: (modelUrl, id) => `${modelUrl}lot-${id}/`,
  car: (car) => `/${COUNTRY_PATH[car.country]}/${car.brandSlug}/${car.modelSlug}/${car.id}/`,

  // Подборки (теговые посадочные)
  selections: '/podborki/',
  selection: (slug) => `/podborki/${slug}/`,
  // срез подборки внутри страны: «авто из Японии до 160 л.с.»
  countrySelection: (country, slug) => `/${COUNTRY_PATH[country]}/${slug}/`,

  // Услуги
  services: '/uslugi/',
  service: (slug) => `/uslugi/${slug}/`,

  // Инструменты
  calculator: '/kalkulyator/',
  howTo: '/kak-zakazat/',
  auctionSheet: '/aukcionnyj-list/',

  // Доставка по городам
  delivery: '/dostavka/',
  city: (slug) => `/dostavka/${slug}/`,

  // Доверие
  cases: '/privezennye-avto/',
  case: (slug) => `/privezennye-avto/${slug}/`,
  reviews: '/otzyvy/',
  about: '/o-kompanii/',
  contacts: '/kontakty/',
  faq: '/faq/',
  video: '/video/',

  // Контент
  clients: '/klientam/',
  afterPayment: '/klientam/posle-oplaty/',
  blog: '/blog/',
  post: (slug) => `/blog/${slug}/`,

  // Служебные
  privacy: '/politika-konfidencialnosti/',
  sitemap: '/karta-sajta/',
  notFound: '/404.html',
};
