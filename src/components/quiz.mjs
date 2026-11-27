// Квиз подбора автомобиля: 5 вопросов + контакты. Квалифицирует заявку и в конце показывает,
// сколько подходящих автомобилей уже есть в каталоге (ссылка с фильтрами). Логика — src/js/quiz.js.
// Страница, где стоит квиз, должна подключить scripts: ['quiz'].
import { html, esc, typo, u, a, attrs, fileExists, img, imgSize, cardPrice, readJson } from '../lib/core.mjs';
import { selectControl } from './select.mjs';
import { inventoryCounts, ranked } from './catalog-filters.mjs';
import { icon } from '../lib/icons.mjs';
import { R } from '../routes.mjs';
import { modelParts } from '../data/model-offers.mjs';

const opt = (name, value, text, { type = 'radio', checked = false, data = {} } = {}) =>
  `<label class="opt"><input type="${type}" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}><span>${esc(text)}</span></label>`;

const featured = readJson('data/quiz-gallery.json');
const photoSizes = '(max-width: 1000px) 100vw, 52vw';

function featuredPhotos() {
  return featured.map(({ key, scene, name, year, price, expires }) => {
    let image;
    if (scene.startsWith('scene-')) {
      const path = `assets/img/renders/${scene}`;
      const { w, h } = imgSize(`квизы/${path}.webp`);
      const src = u(`/kvizy/${path}.webp`);
      image = `<img${attrs({ src, srcset: `${u('/kvizy/' + path + '-800.webp')} 800w, ${src} ${w}w`,
        sizes: photoSizes, width: w, height: h, alt: '', decoding: 'async' })}>`;
    } else {
      image = img({ src: `img/quiz/${scene}.webp`, alt: '', sizes: photoSizes, lazy: false });
    }
    return { key, image, name, year, price, expires };
  });
}

function catalogPhotos(cars, profile, limit) {
  const listings = cars.filter((car) => car.photos.length && (!profile || car.modelUrl === profile.modelUrl));
  const photos = new Map();
  function addView(car, src) {
    if (photos.has(src) || photos.size >= limit) return;
    photos.set(src, { lot: car.id, name: car.title, year: car.year,
      price: car.priceIsPartial ? null : car.priceRub, image: img({ src, alt: '', sizes: photoSizes, lazy: false }) });
  }
  for (const car of listings) addView(car, car.photos[0]);
  for (const car of listings) {
    if (photos.size >= limit) break;
    for (const src of car.photos.slice(1)) addView(car, src);
  }
  if (!photos.size && profile) {
    return [{ name: profile.name, year: profile.years, image: img({ src: profile.photo.src, alt: '', sizes: photoSizes, lazy: false }) }];
  }
  return [...photos.values()];
}

/**
 * @param {object} o
 * @param {string} [o.country] — предвыбранная страна (japan | korea | china)
 * @param {string} [o.subject] — тема заявки
 */
export function quizSection(ctx, { country = '', brand = '', model = '', subject = 'Квиз: подбор автомобиля', title, profile, cars, askDeliveryCity = true } = {}) {
  const manager = ctx.site.salesManager;
  const selected = profile && modelParts(profile.name);
  const market = profile && ctx.countryBySlug[profile.country];
  const stepCount = profile ? 5 : 6;
  const photos = profile || cars ? catalogPhotos(cars || ctx.cars, profile, stepCount) : featuredPhotos();
  const person = html`<span class="quiz__person">
    <span class="quiz__avatar">${img({ src: manager.photo, alt: '', cls: 'sales-portrait', sizes: '(max-width: 560px) 68px, 96px' })}</span>
    <span><span class="quiz__name">${esc(manager.name)}</span><span class="quiz__role">${typo(esc(manager.role))}. <span>${typo(esc(manager.experience))}</span></span></span>
  </span>`;
  const index = profile ? [] : ctx.cars.map((c) => ({
    country: c.country, body: c.body, brand: c.brandSlug, model: c.modelSlug,
    price: c.priceRub, age: c.ageCat, mileage: c.mileageKm,
  }));
  const makes = new Map();
  for (const market of (profile ? [] : ctx.nav.countries)) {
    for (const brand of market.brands) {
      if (!makes.has(brand.slug)) makes.set(brand.slug, { name: brand.name, slug: brand.slug, markets: [], models: new Map() });
      const make = makes.get(brand.slug);
      make.markets.push(market.slug);
      for (const model of brand.models) {
        if (!make.models.has(model.slug)) make.models.set(model.slug, { name: model.name, markets: [] });
        make.models.get(model.slug).markets.push(market.slug);
      }
    }
  }
  const modelOptions = Object.fromEntries([...makes.values()].filter((b) => b.models.size).map((b) => [
    b.slug, [...b.models].map(([slug, model]) => [slug, model.name, model.markets]).sort((a, z) => a[1].localeCompare(z[1], 'ru')),
  ]));
  const stock = inventoryCounts(profile ? [] : ctx.cars.filter((c) => !country || c.country === country));
  const makeChoices = ranked([...makes.values()].map((b) => ({ value: b.slug, name: b.name, markets: b.markets })), stock, 'brand');
  const modelChoices = ranked((modelOptions[brand] || []).map(([value, name]) => ({ value, name })),
    stock.filter((r) => r.brand === brand), 'model');
  const vehicleOptions = (choices, current, logos = false) => choices.map(({ value, name, count, markets }) =>
    `<option${attrs({ value, selected: value === current, label: `${name} (${count})`, 'data-count': count, 'data-markets': markets?.join(' '),
      'data-logo': logos && fileExists('assets/img/makes/' + value + '.webp') ? a('img/makes/' + value + '.webp') : null })}>${esc(name)}</option>`);
  const scriptJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
  const bodies = [
    ['кроссовер', 'Кроссовер'],
    ['седан', 'Седан'],
    ['минивэн', 'Минивэн'],
    ['хэтчбек', 'Хэтчбек'],
    ['универсал', 'Универсал'],
    ['', 'Пока не решил'],
  ];
  return html`
  <section class="section quiz-section" id="podbor">
    <div class="container">
      <div class="quiz-stage">
        <div class="quiz-cover">
          <h2>${profile ? 'Подберём ' + esc(profile.name) : title || 'Подберём автомобиль под ваш бюджет'} за одну минуту</h2>
          <p>Ответьте на несколько вопросов. Валерий свяжется с вами и пришлёт варианты с расчётом под ключ.</p>
          <button type="button" class="btn btn--light" data-quiz-start aria-controls="quiz-questions">Начать подбор</button>
        </div>
        <div class="quiz__expert">${person}</div>
        <div class="quiz" id="quiz-questions">
          <h2 class="sr-only">Подбор автомобиля</h2>
          <form class="form quiz__panel" method="post" data-lead-form data-quiz${profile ? ` data-quiz-profile="${esc(profile.name)}" data-market-name="${esc(market.name)}"` : ''} novalidate>
            <input type="hidden" name="subject" value="${esc(subject)}">
            <input type="hidden" name="car" value="${esc(profile?.name)}">
            <input type="hidden" name="comment" value="">
            <script type="application/json" data-quiz-index>${scriptJson(index)}</script>
            <script type="application/json" data-quiz-models>${scriptJson(modelOptions)}</script>

            <div class="quiz__top">
              <span class="label label--plain" data-quiz-count>Шаг 1 / ${stepCount}</span>
              <div class="quiz__progress" aria-hidden="true"><i data-quiz-bar style="transform:scaleX(${1 / stepCount})"></i></div>
            </div>
            <ul class="quiz__answers" data-quiz-answers aria-label="Ваши ответы" hidden></ul>

            ${profile ? html`<fieldset class="quiz__step" data-quiz-step="model">
              <legend class="quiz__q">Какой автомобиль подобрать?</legend>
              <div class="quiz__fields">
                <label class="field"><span class="field__label">Марка</span><input class="field__control" name="q-brand" value="${esc(selected.brand)}" readonly></label>
                <label class="field"><span class="field__label">Модель</span><input class="field__control" name="q-model" value="${esc(selected.model)}" readonly></label>
              </div>
              <p class="quiz__hint">Страна заказа — ${esc(market.name)}.</p>
              <input type="hidden" name="q-country" value="${esc(profile.country)}">
            </fieldset>` : html`<fieldset class="quiz__step" data-quiz-step="body">
              <legend class="quiz__q">Какой автомобиль вы рассматриваете?</legend>
              <div class="opts quiz__mode" aria-label="Способ подбора">
                ${opt('q-mode', 'body', 'По кузову', { checked: !brand })}
                ${opt('q-mode', 'make', 'По марке и модели', { checked: Boolean(brand) })}
              </div>
              <fieldset class="quiz__choice" data-quiz-bodies${brand ? ' hidden' : ''}>
                <legend class="sr-only">Кузов</legend>
                <p class="quiz__hint">Можно выбрать несколько вариантов.</p>
                <div class="opts">${bodies.map(([v, t]) => opt('q-body', v, t, { type: 'checkbox' }))}</div>
              </fieldset>
              <fieldset class="quiz__choice quiz__fields" data-quiz-make${brand ? '' : ' hidden'}>
                <legend class="sr-only">Марка и модель</legend>
                ${selectControl({ id: 'quiz-brand', kind: 'brand', label: 'Марка', name: 'q-brand', search: true, custom: true, attributes: { required: true },
                  options: html`<option value="">Выберите марку</option>
                    ${vehicleOptions(makeChoices, brand, true)}` })}
                ${selectControl({ id: 'quiz-model', kind: 'model', label: 'Модель', name: 'q-model', search: true, custom: true,
                  options: html`<option value="">Любая модель</option>
                    ${vehicleOptions(modelChoices, model)}` })}
              </fieldset>
            </fieldset>

            <fieldset class="quiz__step" data-quiz-step="country" hidden>
              <legend class="quiz__q">Из какой страны везти?</legend>
              <p class="quiz__hint">Не уверены? Сравним варианты из разных стран.</p>
              <div class="opts">
                ${ctx.countries.map((c) => opt('q-country', c.slug, `${c.navTitle} · ${c.steering}`, { checked: c.slug === country }))}
                ${opt('q-country', '', 'Где выгоднее', { checked: !country })}
              </div>
            </fieldset>`}

            <fieldset class="quiz__step" data-quiz-step="budget" hidden>
              <legend class="quiz__q">Какой бюджет под ключ?</legend>
              <p class="quiz__hint">С учетом доставки до Владивостока и таможенных платежей.</p>
              <div class="opts">
                ${opt('q-budget', '1000000', 'до 1 млн ₽')}
                ${opt('q-budget', '1500000', 'до 1,5 млн ₽')}
                ${opt('q-budget', '2000000', 'до 2 млн ₽', { checked: true })}
                ${opt('q-budget', '3000000', 'до 3 млн ₽')}
                ${opt('q-budget', '5000000', 'до 5 млн ₽')}
                ${opt('q-budget', 'over-5000000', 'Больше 5 млн ₽')}
              </div>
            </fieldset>

            ${profile ? html`<fieldset class="quiz__step" data-quiz-step="year" hidden>
              <legend class="quiz__q">Какой год выпуска вам подойдет?</legend>
              <div class="quiz__fields">
                ${[['min', 'От года'], ['max', 'До года']].map(([key, text]) => html`<label class="field"><span class="field__label">${text}</span>
                  <input class="field__control" name="q-year-${key}" type="number" inputmode="numeric" min="1886" max="${ctx.build.year}" placeholder="Любой"></label>`)}
              </div>
            </fieldset>` : html`<fieldset class="quiz__step" data-quiz-step="age" hidden>
              <legend class="quiz__q">Какой возраст автомобиля подходит?</legend>
              <p class="quiz__hint">От возраста зависит таможенная пошлина.</p>
              <div class="opts">
                ${opt('q-age', 'le3', 'Новый или до 3 лет')}
                ${opt('q-age', '3to5', '3-5 лет · проходной', { checked: true })}
                ${opt('q-age', 'gt5', 'Старше 5 лет')}
                ${opt('q-age', '', 'Не важно')}
              </div>
              ${askDeliveryCity && html`<label class="field quiz__free">
                <span class="field__label">Город, куда доставить</span>
                <input class="field__control" type="text" name="city" placeholder="Например, Новосибирск" autocomplete="address-level2">
              </label>`}
            </fieldset>`}

            <fieldset class="quiz__step" data-quiz-step="mileage" hidden>
              <legend class="quiz__q">Какой пробег вам подойдет?</legend>
              <p class="quiz__hint">Учитываем пробег вместе с возрастом и состоянием автомобиля.</p>
              <div class="opts">
                ${opt('q-mileage', '30000', 'До 30 000 км')}
                ${opt('q-mileage', '60000', 'До 60 000 км')}
                ${opt('q-mileage', '100000', 'До 100 000 км')}
                ${opt('q-mileage', '150000', 'До 150 000 км')}
                ${opt('q-mileage', '150000-200000', '150 000–200 000 км', { data: { min: 150000, max: 200000 } })}
                ${opt('q-mileage', 'over-200000', 'Более 200 000 км', { data: { min: 200001 } })}
                ${opt('q-mileage', '', 'Не важно', { checked: true })}
              </div>
            </fieldset>

            <fieldset class="quiz__step" data-quiz-step="contact" hidden>
              <legend class="quiz__q">Оставьте контакты для отправки подборки и расчета</legend>
              <p class="quiz__hint">Пришлем вам подборку из актуальных предложений и расчет до вашего города</p>
              <div class="quiz__fields">
                <label class="field">
                  <span class="field__label">Как к вам обращаться</span>
                  <input class="field__control" type="text" name="name" autocomplete="given-name" placeholder="Имя">
                </label>
                <label class="field">
                  <span class="field__label">Телефон</span>
                  <input class="field__control" type="tel" name="phone" autocomplete="tel" inputmode="tel" placeholder="+7 (___) ___-__-__" required aria-describedby="quiz-phone-error" data-phone>
                  <span class="field__error" id="quiz-phone-error" role="alert">Укажите номер полностью: 10 цифр после +7</span>
                </label>
              </div>
              <fieldset class="quiz__contact">
                <legend class="field__label">Как удобнее связаться</legend>
                <div class="opts">
                  ${opt('contact', 'WhatsApp', 'WhatsApp', { checked: true })}
                  ${opt('contact', 'Telegram', 'Telegram')}
                  ${opt('contact', 'МАКС', 'МАКС')}
                  ${opt('contact', 'Звонок', 'Звонок')}
                </div>
              </fieldset>
              <label class="check u-mt-4">
                <input type="checkbox" name="agree" required aria-describedby="quiz-agree-error">
                <span>Соглашаюсь на обработку персональных данных согласно <a href="${u(R.privacy)}" target="_blank">политике конфиденциальности</a></span>
              </label>
              <span class="field__error" id="quiz-agree-error" role="alert">Отметьте согласие на обработку данных: без него заявку не отправить</span>
            </fieldset>

            <div class="quiz__nav">
              <button class="btn btn--ghost" type="button" data-quiz-back hidden>Назад</button>
              <button class="btn btn--primary" type="button" data-quiz-next>Далее</button>
              <button class="btn btn--primary" type="submit" data-quiz-submit hidden>Получить подборку</button>
            </div>

            <div class="form__success" role="status">
              <span class="label">Заявка принята</span>
              <p class="h3" data-success-title>Спасибо! Подготовим подборку и расчет в рабочее время.</p>
              <p data-quiz-result></p>
              <div class="btn-row">
                <a class="btn btn--dark" href="${u(profile ? profile.pricesUrl : R.catalog)}" data-quiz-catalog><span data-quiz-catalog-text>${profile ? esc('Автомобили ' + profile.name) : 'Смотреть каталог'}</span></a>
                <a class="btn btn--wa" data-wa-link href="#" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
              </div>
              <p class="form__note">Это демонстрационная версия сайта: заявка никуда не отправлена.</p>
            </div>
          </form>
        </div>
        <div class="quiz-cover__photo">
          ${img({ src: 'assets/img/misc/quiz-port-lineup.webp', alt: 'Mazda CX-5, Toyota Corolla Touring и Honda Stepwgn на причале в порту', sizes: '(max-width: 1000px) 100vw, 52vw' })}
          ${photos.map(({ image, name, year, price, expires, key, lot }) => html`<template data-quiz-photo${attrs({ 'data-quote-key': key, 'data-quote-lot': lot })}>
            <figure class="quiz-photo"${attrs({ 'data-quote-until': expires })}>
              ${image}
              <figcaption><strong>${esc([name, year].filter(Boolean).join(' · '))}</strong>
                <span data-quiz-price>${price ? 'от ' + cardPrice(price) + ' под ключ во Владивостоке' : 'Стоимость под ключ по запросу'}</span>
              </figcaption>
            </figure>
          </template>`)}
          <button type="button" class="quiz-photo-toggle" data-quiz-rotate aria-label="Приостановить смену фото" hidden>
            ${icon('pause', 'quiz-photo-pause')}${icon('play', 'quiz-photo-play')}
          </button>
        </div>
      </div>
    </div>
  </section>`;
}
