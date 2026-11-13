// Квизы подбора под рекламу (аналог Marquiz) для Макс Групп.
// Здесь все тексты, вопросы и цены. Сборка: node квизы/build.mjs → квизы/<slug>/index.html
//
// Источники фактов:
// - плашки «Льготный утильсбор», «Доставка 25 дней», «Оплата официально через банк», «Весь путь авто в Telegram»
//   и телефон +7 924 427-77-11 взяты из действующего квиза клиента mrqz.me/StepWGN-MaxGroup (13.11.2026);
//   с 13.11 срок 25 дней стоит в заголовке, а на его месте в пунктах «Доставим в ваш город» (просьба заказчика);
// - цены «от» = медиана цен под ключ во Владивостоке из каталога клиента, лист «Спрос и чек» таблицы аналитики,
//   округлено вниз до 0,1 млн ₽ (строки по моделям и странам, авто 2019+ или все годы, как в таблице);
// - модели = топ по спросу Яндекса из той же таблицы (Mazda CX-5, Toyota Corolla, Honda Vezel, Toyota RAV4,
//   Suzuki Jimny) и Honda Stepwgn, для которого у клиента уже есть квиз.
// Правила текста как на сайте: без буквы ё, без тире и двоеточий в прозе, диапазоны через дефис.

export const COMMON = {
  brand: 'Макс Групп',
  phone: { display: '+7 (924) 427-77-11', tel: '+79244277711' },
  hours: 'Пн-Пт 10-19 по Владивостоку',
  telegramChannel: 'https://t.me/maxgroup_auto',
  // Мессенджеры в шапке: WhatsApp менеджера с тем же номером, что в квизе клиента, и MAX с сайта maxgroupvl.ru
  whatsapp: 'https://wa.me/79244277711',
  max: 'https://max.ru/u/f9LHodD0cOKaF3qAZszCmLQe6h4RRsWhxeRrMpGvJijhMN3oQj4u3FpD9fg',
  site: 'https://www.maxgroupvl.ru',
  privacy: 'https://www.maxgroupvl.ru/privacy',
  // Куда отправлять заявку (POST JSON). Пока null: заявка пишется в консоль и localStorage браузера.
  endpoint: null,
  // Номер счетчика Яндекс Метрики для целей quiz_start / quiz_step_N / quiz_lead. Пока null.
  metrika: null,
};

// Хвост заголовка первого экрана, один для всех моделей (правки 13.11): «в ваш бюджет» серым, «с доставкой за 25 дней» синим
const TITLE_TAIL = ['в ваш бюджет', 'с доставкой за 25 дней'];

// Плашки преимуществ на первом экране
export const PERKS = {
  util: { icon: 'percent', t: 'Льготный утильсбор' },
  city: { icon: 'truck', t: 'Доставим в ваш город' },
  bank: { icon: 'bank', t: 'Оплата официально через банк' },
  telegram: { icon: 'route', t: 'Весь путь авто в Telegram' },
  check: { icon: 'shield', t: 'Проверка перед покупкой' },
};

export const COUNTRY = {
  jp: { name: 'Япония', from: 'из Японии', wheel: 'Правый руль', flag: 'flag-jp.svg' },
  cn: { name: 'Китай', from: 'из Китая', wheel: 'Левый руль', flag: 'flag-cn.svg' },
};

// --- Общие шаги ---------------------------------------------------------------------------------------

const mln = (rub) => (Math.floor(rub / 100000) / 10).toLocaleString('ru-RU', { minimumFractionDigits: 1 });

// Вопросы одинаковые для всех моделей (правки 13.11): цвет, возраст, пробег, бюджет, затем контакты.
// Версию, двигатель, привод и страну не спрашиваем: это уточняет менеджер.
const ageStep = () => ({
  id: 'age',
  q: 'Сколько лет должно быть машине?',
  hint: 'От возраста зависит таможенная пошлина',
  tip: 'Автомобили от 3 до 5 лет называют проходными. Пошлина у них обычно самая низкая.',
  groups: [{
    name: 'age',
    options: [
      { v: 'le3', t: 'До 3 лет', s: 'Почти новый автомобиль' },
      { v: '3to5', t: 'От 3 до 5 лет', s: 'Проходной возраст', badge: 'Выгоднее' },
      { v: 'gt5', t: 'Старше 5 лет', s: 'Ниже цена покупки' },
      { v: 'any', t: 'Не важно', s: 'Подберем по бюджету' },
    ],
  }],
});

const mileageStep = () => ({
  id: 'mileage',
  q: 'Какой пробег вам подходит?',
  hint: 'Выберите один вариант',
  tip: 'Чем меньше пробег, тем дороже машина того же года. Если пробег не важен, вариантов будет больше.',
  groups: [{
    name: 'mileage',
    options: [
      { v: '0', t: 'Без пробега' },
      { v: '50', t: 'До 50 000 км' },
      { v: '100', t: '50 000-100 000 км' },
      { v: '100+', t: 'Больше 100 000 км' },
      { v: 'any', t: 'Не важно' },
    ],
  }],
});

const COLORS = {
  white: { t: 'Белый', c: '#f7f7f5' },
  pearl: { t: 'Белый перламутр', c: 'linear-gradient(135deg,#ffffff,#ece9e2 60%,#f8f6f1)' },
  black: { t: 'Черный', c: '#121315' },
  gray: { t: 'Серый', c: '#6b7077' },
  silver: { t: 'Серебристый', c: 'linear-gradient(135deg,#d9dce0,#b7bcc3 55%,#e6e8eb)' },
  blue: { t: 'Синий', c: '#1f3f78' },
  red: { t: 'Красный', c: '#a3111c' },
  green: { t: 'Зеленый', c: '#4d5a3c' },
  beige: { t: 'Бежевый', c: '#d8cdb4' },
  yellow: { t: 'Желтый', c: '#e8c22a' },
};

const colorStep = (keys) => ({
  id: 'color',
  q: 'Какой цвет машины хотите?',
  hint: 'Можно выбрать несколько',
  optional: true,
  tip: 'С цветом подборка точнее. Без него вариантов больше и проще уложиться в бюджет.',
  groups: [{
    name: 'color',
    multi: true,
    options: [...keys.map((k) => ({ v: k, t: COLORS[k].t, color: COLORS[k].c })), { v: 'any', t: 'Не важно', color: null }],
  }],
});

// buckets: ['до 1,5', '1,5-2', ...], pop: индекс ходового бюджета (корзина с медианой каталога)
const budgetStep = (m, buckets, pop) => ({
  id: 'budget',
  q: 'В какой бюджет под ключ хотите уложиться?',
  hint: 'С покупкой, доставкой до Владивостока, таможней и оформлением',
  // цену «от» не показываем (правки 13.11), только объясняем, что входит в бюджет
  tip: `Подберем ${m.short} в пределах этой суммы и пришлем расчет под ключ по каждому варианту.`,
  groups: [{
    name: 'budget',
    options: [
      ...buckets.map((b, i) => ({ v: b, t: `${b} млн ₽`, badge: i === pop ? 'Популярный выбор' : '' })),
      { v: 'unknown', t: 'Пока не знаю', s: 'Посчитаем несколько вариантов' },
    ],
  }],
});


// --- Модели ---------------------------------------------------------------------------------------------

const RAW = [
  {
    slug: 'honda-stepwgn',
    name: 'Honda Stepwgn',
    short: 'Stepwgn',
    photo: { from: 'honda-stepwgn-2023-1/01.webp', alt: 'Honda Stepwgn 2023 из Японии' },
    prices: { jp: 1741160 },
    title: ['Подберем Honda Stepwgn', ...TITLE_TAIL],
    perks: ['util', 'city', 'bank', 'telegram'],
    steps: (m) => [
      colorStep(['pearl', 'black', 'gray', 'silver', 'blue']),
      ageStep(),
      mileageStep(),
      budgetStep(m, ['до 1,5', '1,5-2', '2-2,5', '2,5-3', 'от 3'], 1),
    ],
  },
  {
    slug: 'mazda-cx-5',
    name: 'Mazda CX-5',
    short: 'CX-5',
    photo: { from: 'mazda-cx-5-2020-1/01.webp', alt: 'Mazda CX-5 2020 из Японии' },
    prices: { cn: 2177215, jp: 2414472 },
    title: ['Подберем Mazda CX-5', ...TITLE_TAIL],
    perks: ['util', 'city', 'bank', 'telegram'],
    steps: (m) => [
      colorStep(['red', 'white', 'black', 'gray', 'blue']),
      ageStep(),
      mileageStep(),
      budgetStep(m, ['до 2', '2-2,5', '2,5-3', '3-3,5', 'от 3,5'], 1),
    ],
  },
  {
    slug: 'toyota-corolla',
    name: 'Toyota Corolla',
    short: 'Corolla',
    photo: { from: 'toyota-corolla-touring-2023-1/01.webp', alt: 'Toyota Corolla Touring 2023 из Японии' },
    prices: { cn: 1222267, jp: 1583117 },
    title: ['Подберем Toyota Corolla', ...TITLE_TAIL],
    perks: ['util', 'city', 'bank', 'telegram'],
    steps: (m) => [
      colorStep(['pearl', 'black', 'gray', 'silver', 'blue']),
      ageStep(),
      mileageStep(),
      budgetStep(m, ['до 1,2', '1,2-1,5', '1,5-2', 'от 2'], 1),
    ],
  },
  {
    slug: 'honda-vezel',
    name: 'Honda Vezel',
    short: 'Vezel',
    photo: { from: 'honda-vezel-2021-1/01.webp', alt: 'Honda Vezel 2021 из Японии' },
    prices: { cn: 1395179, jp: 2418702 },
    title: ['Подберем Honda Vezel', ...TITLE_TAIL],
    perks: ['util', 'city', 'bank', 'telegram'],
    steps: (m) => [
      colorStep(['pearl', 'black', 'gray', 'red', 'blue']),
      ageStep(),
      mileageStep(),
      budgetStep(m, ['до 1,5', '1,5-2', '2-2,5', 'от 2,5'], 0),
    ],
  },
  {
    slug: 'toyota-rav4',
    name: 'Toyota RAV4',
    short: 'RAV4',
    photo: { from: 'toyota-rav4-2020-1/01.webp', alt: 'Toyota RAV4 2020 из Японии' },
    prices: { cn: 1762083, jp: 3483567 },
    title: ['Подберем Toyota RAV4', ...TITLE_TAIL],
    // у RAV4 моторы мощнее 160 л.с., плашку про льготный утильсбор не ставим
    perks: ['check', 'city', 'bank', 'telegram'],
    steps: (m) => [
      colorStep(['white', 'black', 'gray', 'green', 'blue']),
      ageStep(),
      mileageStep(),
      budgetStep(m, ['до 2', '2-3', '3-4', 'от 4'], 0),
    ],
  },
  {
    slug: 'suzuki-jimny',
    name: 'Suzuki Jimny',
    short: 'Jimny',
    photo: { from: 'suzuki-jimny-2024-1/01.webp', alt: 'Suzuki Jimny 2024 из Японии' },
    prices: { jp: 1305370 },
    title: ['Подберем Suzuki Jimny', ...TITLE_TAIL],
    perks: ['util', 'city', 'bank', 'telegram'],
    steps: (m) => [
      colorStep(['beige', 'green', 'black', 'white', 'gray', 'yellow']),
      ageStep(),
      mileageStep(),
      budgetStep(m, ['до 1,5', '1,5-2', '2-2,5', 'от 2,5'], 0),
    ],
  },
];

export const MODELS = RAW.map((m) => {
  const from = Math.min(...Object.values(m.prices));
  const countries = Object.keys(m.prices).sort((a, b) => m.prices[a] - m.prices[b]);
  const priceNote = countries.length > 1
    ? countries.map((c) => `${COUNTRY[c].from} от ${mln(m.prices[c])} млн ₽`).join(', ') + ' под ключ'
    : `стоит от ${mln(m.prices[countries[0]])} млн ₽ под ключ во Владивостоке`;
  const full = { ...m, countries, priceFrom: mln(from), priceFromByCountry: Object.fromEntries(countries.map((c) => [c, mln(m.prices[c])])), priceNote };
  full.steps = m.steps(full);
  return full;
});

export { mln };
