# Руководство разработчика: сайт «Макс Групп»

Статический многостраничный сайт. Генератор — `build.mjs` (Node 22+, без зависимостей). Сборка: `node build.mjs` → `dist/`. Просмотр: `node serve.mjs` → http://localhost:4317.

## 1. Арт-дирекшн (не нарушать)

«Ночной порт»: тёмное кино (видео и ночные кадры Владивостока) чередуется со светлыми «документальными» полосами (цены, расчёты, факты).

- **Монохром + один акцент.** Чернила `--ink`, бумага `--paper`, белые карточки `--card`, синий бренда `--accent` — только для главного действия и статусов. Никаких других цветов, градиентов-заливок, теней у карточек, стекла, эмодзи, иконок из других наборов.
- **Один шрифт** Inter Tight (веса 450 / 500 / 600). Моноширинный JetBrains Mono — только метки `[ в скобках ]`, статусы, мелкие технические подписи.
- **Двухтонные заголовки**: начало чёрным, окончание серым (`duo('Почему выбирают', 'Макс Групп')`). Заменяют подзаголовок.
- **Асимметричная шапка секции**: слева метка, справа с 5-й колонки — заголовок и лид (`sectionHead`).
- **Плоские плитки** с радиусом 4px, стоят почти вплотную (`--gap` 6–8px) и читаются как таблица. Кнопки — пилюли.
- **Воздух**: секции с отступами `--section-y` (до 152px). Внутри карточки содержимое разнесено по верху и низу.
- **Ритм фона**: секции чередуются `бумага → белая → тёмная`. Две одинаковые подряд — только если вторая с `section--flush-top`.
- **Моушн сдержанный**: появление `data-reveal` (один раз), заголовки по словам `data-split`, hover на всём интерактивном. Только `transform`/`opacity`, кривая `--ease-out`.
- Фото — только реальные из `assets/img/` (кейсы, команда, 3D-рендеры услуг, кадры видео `assets/img/hero/*.webp`). Стоковых картинок и плейсхолдеров нет. Нет фото — решаем типографикой.

## 2. Правила контента (жёстко)

- **Никаких выдуманных фактов о компании**: года основания, числа привезённых авто, размера комиссии, гарантий, лицензий, имён клиентов, сроков «как обещание». Всё, что известно о компании, лежит в `data/source/maxgroup.json` (тексты с maxgroupvl.ru, 13 отзывов, 19 кейсов, 4 менеджера, контакты). Сроки и цифры — только из кейсов и отзывов и с оговоркой «по отзывам клиентов».
- Отраслевые факты (ставки пошлин, утильсбор, ограничения, доставка по городам) — только из `data/source/calc-rules.json` (актуально на 13.10.2026), с формулировкой «ориентировочно», «на октябрь 2026».
- Реквизитов юрлица нет — не придумывать.
- Тон: спокойный, экспертный, без восклицаний, канцелярита и «уникальных предложений». Короткие предложения. Обращение на «вы». Конкретика вместо оценок.
- Типографика: «ёлочки», тире —, диапазоны через –, неразрывные пробелы ставит `typo()`.
- SEO: один `<h1>` на страницу; иерархия заголовков без скачков (h1 → h2 → h3); ключевая фраза в H1, title, первом абзаце; уникальные title (до ~70 знаков) и description (120–165 знаков) на каждой странице; на коммерческих страницах — цены «от», телефон, условия, FAQ, перелинковка; текста на странице не меньше ~300 слов.

## 3. Как устроена страница

Модуль в `src/pages/*.mjs` экспортирует функцию `xxxPages(ctx)` и возвращает массив описаний:

```js
{
  url: R.service('avtokredit'),      // адрес из src/routes.mjs (только оттуда!)
  type: 'service',                   // home | catalog | country | brand | model | car | selection | service | calculator | delivery | city | case | cases | reviews | about | contacts | faq | guide | blog | post | video | privacy | sitemap | notFound
  title: '…',                        // <title>, уникальный
  description: '…',                  // meta description, уникальный
  h1: '…',                           // текст H1 (для отчётов и llms.txt)
  breadcrumbs: [{ name, url }, …],   // включая текущую страницу; из них строится BreadcrumbList
  jsonld: [faqLd(items), serviceLd(site, {...})].filter(Boolean),   // src/lib/seo.mjs
  headerOver: true,                  // шапка прозрачная поверх тёмного первого экрана (hero / pageHead c dark|photo)
  scripts: ['calc'],                 // доп. скрипты из src/js (main.js подключается всегда)
  priority: 0.8, changefreq: 'weekly', noindex: false,
  ogImage: 'img/hero/poster.webp',   // путь внутри assets/
  render: (ctx, page) => html`…`,    // HTML содержимого <main>
}
```

Новый модуль подключается в `src/pages/index.mjs` (массив `modules`). **Этот файл правит только главный разработчик** — в отчёте просто назовите экспортируемую функцию.

### Контекст `ctx`

`ctx.site` (название, контакты `site.contacts.phones[0].label|tel`, `site.contacts.addressFull|hours|email|maps`, соцсети `site.socials.whatsapp|telegram|max|instagram|youtube` → `{name,url}`, `site.rating {value,count,twoGisCount}`), `ctx.R` (адреса), `ctx.nav`, `ctx.countries` / `ctx.countryBySlug` (`{slug,name,navTitle,from:'из Японии',inLoc:'в Японии',gen,code,steering,source,sourceShort,text}`), `ctx.cars` (нормализованные авто: `id,country,brand,brandSlug,model,modelSlug,year,mileageKm,engine{type,volumeCc,powerHp},transmission,drive,body,color,steering,trim,priceRub,priceLabel,photos[],title,titleFull,titleYear,url,brandUrl,modelUrl,ageYears,isHybrid,isElectric`), `ctx.brands`, `ctx.brandsOf(country)`, `ctx.models`, `ctx.selections`, `ctx.services`, `ctx.cases` (`name,slug,url,statusLabel,statusCls,countryName,countrySlug,year,specs{},price,priceLabel,clientCity,deliveryTerm,description,image,imageFocus`), `ctx.reviews` (`author,source,rating,text,url,photos[]`), `ctx.team` (`name,role,phone,tel,photo`), `ctx.cities` (`name,slug,url,nameAcc,namePrep,nameGen,region,macro,distanceKm,days[],daysLabel,priceFrom,truck{sedan,crossover,suv},rail?`), `ctx.posts`, `ctx.calc` (правила калькулятора), `ctx.content` (тексты из `data/content/**`), `ctx.source` (сырой maxgroup.json), `ctx.md(markdown) → html`.

### Тексты страниц

Длинные тексты не хардкодим в шаблоне, а кладём в `data/content/` (JSON). Файлы верхнего уровня объединяются по ключам: `data/content/services.json` с `{ "services": { "avtokredit": {...} } }` → `ctx.content.services.avtokredit`. Папки `brands/`, `models/`, `cities/`, `cases/` — по файлу на сущность, ключ в поле `"key"`. Поля с Markdown рендерятся через `ctx.md()` (поддержка: `##`/`###`, списки, таблицы `| a | b |`, `**жирный**`, ссылки `[текст](/avto-iz-yaponii/)`, цитаты `>`, врезки `:::note … :::` и `:::warn … :::`). Внутренние ссылки в текстах — абсолютные пути сайта (`/kalkulyator/`), только на существующие адреса из `src/routes.mjs`.

## 4. Помощники (`src/lib/core.mjs`, реэкспорт из `src/components/ui.mjs`)

`html` (тег-шаблон: склеивает массивы, пропускает null/false; **не экранирует**), `esc(s)`, `u('/path/')` — **любая внутренняя ссылка только через `u()`**, `a('img/x.webp')` — файл из assets, `img({src:'assets/img/…', alt, sizes, priority})` — `<img>` с размерами и lazy (всегда через него, alt обязателен; декоративным `alt: ''`), `typo(text)` — неразрывные пробелы, `price(n)` «1 505 000 ₽», `priceShort(n)` «1,5 млн ₽», `km(n)`, `num(n)`, `count(n, ['вариант','варианта','вариантов'])`, `plural`, `clip(text, n)`, `cx(...)`, `attrs({...})`.

SEO (`src/lib/seo.mjs`): `faqLd(items)`, `serviceLd(site,{name,description,url,areaServed})`, `articleLd`, `itemListLd`, `aggregateOfferLd`, `carLd`, `howToLd`, `reviewsLd`, `videoLd`. Organization/WebSite/BreadcrumbList добавляются автоматически.

## 5. Компоненты (`src/components/ui.mjs`)

| Функция | Что даёт |
|---|---|
| `pageHead({crumbs, label, h1, lead, actions, kv:[{k,v}], side, dark, photo, single})` | шапка внутренней страницы с крошками и H1. `dark: true` или `photo: 'assets/img/hero/…webp'` → тёмная (тогда у страницы `headerOver: true`) |
| `sectionHead({label, title, lead, actions, aside, tag, layout})` | шапка секции; `title` — HTML, обычно `duo(a, b)`; `layout: 'stack'|'center'` |
| `duo(main, muted)` | двухтонный заголовок |
| `label(text)` | моно-метка `[ ТЕКСТ ]` |
| `btn(text, href, {variant: 'primary'|'dark'|'light'|'ghost'|'wa'|'tg', size:'sm'|'lg', arrow, block, modal:'request', subject, attrs})` | кнопка-пилюля; `modal:'request'` открывает форму заявки, `subject` — тема; заголовок/текст модалки: `attrs: {'data-modal-title': …, 'data-modal-text': …, 'data-modal-car': …}` |
| `more(text, href)` | ссылка со стрелкой |
| `fact({value, unit, name, text, link, variant:'accent'|'dark'})` | плитка «крупное значение + подпись + пояснение» |
| `card({icon, label, title, text, href, foot, tall, line, tag})` | простая плитка; с `href` — вся плитка-ссылка |
| `carCard(car)`, `caseCard(c, {stack})`, `reviewCard(r)` | карточки авто, кейса, отзыва |
| `faqList(items)` | аккордеон `[{q, a}]` (a — текст или HTML); не забыть `faqLd(items)` в `jsonld` |
| `chips([{name,url,count}])`, `linkBlock(title, items)` | теги-ссылки, блок перелинковки |
| `step(s, i, {light})` | шаг процесса `{title, text, pay?, time?}`; на светлом фоне `light: true` |
| `specList([[k, v], …])`, `table(head, rows, {numCols})` | характеристики, таблица |
| `ticks([…])`, `note(html, {warn})` | список с галочками, врезка |
| `route(['Япония','Владивосток','Иркутск'])` | фирменная строка маршрута |
| `rail(items, {col})` + `railNav()` | горизонтальная лента с кнопками (кнопки ставятся в `aside` шапки секции) |
| `seoText(html)` | сворачиваемый SEO-текст (остаётся в DOM) |
| `ctaBand(ctx, {label, title, text, subject, bg, fields, cta, car, city})` | финальная тёмная полоса с формой — **ею заканчивается каждая страница** |
| `leadForm({subject, fields:['name','phone','car','budget','city','comment','contact'], cta, btn})` | форма заявки (фронт-демо: состояние «успех» + ссылки в мессенджеры) |
| `icon(name)`, `stars(5)` | иконки: arrow, arrow-up-right, arrow-down, chevron, plus, close, check, phone, mail, pin, clock, calendar, shield, doc, doc-check, calc, ship, truck, gavel, key, wallet, bank, percent, star, play, camera, filter, info, alert, globe, wheel, engine, gauge, fuel, bolt, gearbox, drive, palette, user, users, handshake, route, anchor, container, eye, search, list, grid, box, download, external, share, message, seat, snow, flag, scale, lab, plate, telegram, whatsapp, instagram, youtube, max |

Каталог (`src/components/catalog.mjs`): `carsBlock(cars, {hide, filters, promoOpts})`, `modelsPriceTable`, `yearsPriceTable`, `priceParts()`, `countryCompare`, `modelTiles`, `brandTiles`.

## 6. Разметка и классы

```html
<section class="section section--white">        <!-- фон: (нет) = бумага | section--white | section--dark; section--sm — малые отступы; section--flush-top -->
  <div class="container">
    ${sectionHead({...})}
    <div class="grid grid--3"> … плитки … </div>   <!-- grid--2 / --3 / --4, адаптив встроен -->
  </div>
</section>
```

- `split` + `split__sticky` + `split__body` — закреплённая левая колонка с заголовком и список справа (`split--even` — колонки поровну).
- На тёмном фоне текстовые цвета меняются сами внутри `.section--dark` / `.on-dark`.
- Текстовые блоки — `<div class="prose">…</div>`; таблица — `table()`; медиа с пропорциями — `<div class="media media--16x9">${img(...)}</div>`.
- Появление: `${reveal(i)}` в открывающем теге (`<article class="card"${reveal(1)}>`), i — порядок 0..5.
- Утилиты: `u-mt-4…8`, `muted`, `small`, `mono`, `lead`, `h2`/`h3`/`h4`, `sr-only`, `u-hide-mobile`.

Нужен новый компонент — создайте свой CSS-файл `src/css/6x-<раздел>.css` (подхватится автоматически, порядок по имени) и стройте только из токенов `src/css/00-tokens.css` (`--sp-*`, `--gap`, `--r-sm`, `--fs-*`, цвета). Существующие файлы CSS/JS и `ui.mjs` не редактировать — если чего-то не хватает, опишите в отчёте.

## 7. Проверка перед сдачей

1. `node build.mjs` — без ошибок по вашим страницам в SEO-отчёте (битые ссылки, дубли title, H1 ≠ 1, img без alt).
2. Скриншоты десктоп 1440 и мобайл 390 каждой новой страницы (инструмент указан в задаче) — посмотрите их глазами: нет наложений, пустых блоков, горизонтального скролла, сирот-заголовков; ритм фонов соблюдён.
3. Нет выдуманных фактов о компании.

## 8. Данные автомобиля и цены (после аудита)

- `car.priceIsPartial` — цена без утилизационного сбора («рассчитанная часть стоимости»). Такую цену нельзя называть «под ключ»: используйте `fromPrice(x)` / `fromShort(x)` из `src/components/catalog.mjs` — они сами пишут «от X» или «от X без утильсбора» для марки, модели, подборки, среза.
- `car.ageCat` — таможенная категория (`le3` | `3to5` | `gt5`), берётся из расчёта цены заказчика; `car.isPassing` — «проходной» (3–5 лет). Осенью 2026 года это 2022–2023 годы выпуска; 2021 год — уже «старше 5 лет».
- `car.isLowPower` — попадает под льготный утильсбор по данным каталога (до 160 л.с., не электромобиль, гибриды — только с ДВС до 110 л.с., не помечен в `data/car-flags.json`). Бейдж «до 160 л.с.», подборка и фильтр работают по этому полю.
- `data/car-flags.json` — пометки для автомобилей со спорными данными источника (`powerDoubt`, `note`): цены и исходные данные не правим, но и не утверждаем спорное в текстах.
- `car.priceBreakdown` — расшифровка цены с сайта заказчика (строки `listing`, `*_local`, `japan_freight`, `russia_processing`, `local_logistics`, `service_fee`, `customs_payments`, `recycling_fee`); `car.hasRouteSurcharge` — в расчёте есть отдельная строка за особый маршрут.
- OG-картинки 1200×630 лежат в `assets/img/og/`; для новых авто — `python3 tools/og.py`. Уменьшенные версии фото — `python3 tools/thumbs.py`.
- Компоненты: `table(head, rows, { numCols, cls, mobileHide })`, `caseCard(c, { stack, sizes })`, `step(s)` — подпись оплаты задаётся `s.payLabel`, `seoText(html)` — первый H2 уходит в левую колонку.
- Блог: порядок ленты задаёт поле `order` во front matter; автор — «Редакция Макс Групп».

## 9. Формулировки от имени компании

Источник фактов о компании — только `data/source/maxgroup.json`. Нельзя: рейтинг компании на площадках (известно лишь, что на сайте 13 отзывов, все с оценкой 5,0), условия оплаты и сроки этапов, гарантии и обещания по цене, «свой/наш брокер», должности сотрудников. Можно: описание типового процесса со словами «обычно», «порядок фиксируется в договоре», ссылки на то, что пишут клиенты в отзывах.
