// Страны-направления. Падежи вынесены в данные, чтобы шаблоны собирали грамотные заголовки и мета-теги.
export const countries = [
  {
    slug: 'japan',
    code: 'JP',
    name: 'Япония',
    navTitle: 'Япония',
    from: 'из Японии',          // откуда
    inLoc: 'в Японии',          // где
    gen: 'Японии',              // чего
    adj: 'японские',
    adjSg: 'японский',
    flag: 'img/brand/flag-jp.svg',
    image: 'img/countries/japan.webp',
    imageAccent: 'img/countries/japan-blue-v1.webp',
    // текст заказчика с maxgroupvl.ru
    text: 'Надёжность, качество сборки и проверенные временем модели — Toyota, Honda, Mazda, Lexus.',
    // площадки, с которых взяты лоты каталога (data/source/cars.json → auction.house)
    source: 'Аукционы JU, CAA, LAA, MIRIVE и другие',
    sourceShort: 'Аукционы',
    steering: 'правый руль',
    currency: 'JPY',
    port: 'Тояма, Ниигата, Фусики',
  },
  {
    slug: 'korea',
    code: 'KR',
    name: 'Южная Корея',
    navTitle: 'Корея',
    from: 'из Кореи',
    inLoc: 'в Корее',
    gen: 'Кореи',
    adj: 'корейские',
    adjSg: 'корейский',
    flag: 'img/brand/flag-kr.svg',
    image: 'img/countries/korea.webp',
    imageAccent: 'img/countries/korea-blue-v1.webp',
    text: 'Стильный дизайн, передовые технологии и отличное соотношение цены и качества — Hyundai, Kia, Genesis.',
    source: 'Площадка Encar и дилерские стоянки',
    sourceShort: 'Encar',
    steering: 'левый руль',
    currency: 'KRW',
    port: 'Пусан, Тонхэ',
  },
  {
    slug: 'china',
    code: 'CN',
    name: 'Китай',
    navTitle: 'Китай',
    from: 'из Китая',
    inLoc: 'в Китае',
    gen: 'Китая',
    adj: 'китайские',
    adjSg: 'китайский',
    flag: 'img/brand/flag-cn.svg',
    image: 'img/countries/china.webp',
    imageAccent: 'img/countries/china-blue-v1.webp',
    text: 'Современные технологии, богатые комплектации и выгодные цены — Changan, Haval, Geely, Chery.',
    source: 'Дилеры и площадки подержанных авто',
    sourceShort: 'Дилеры',
    steering: 'левый руль',
    currency: 'CNY',
    port: 'Суйфэньхэ — Уссурийск',
  },
];

export const countryBySlug = Object.fromEntries(countries.map((c) => [c.slug, c]));
