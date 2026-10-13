// Квиз подбора автомобиля: 4 вопроса + контакты. Квалифицирует заявку и в конце показывает,
// сколько подходящих автомобилей уже есть в каталоге (ссылка с фильтрами). Логика — src/js/quiz.js.
// Страница, где стоит квиз, должна подключить scripts: ['quiz'].
import { html, esc, u, img, typo } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { label, duo, reveal } from './ui.mjs';
import { R } from '../routes.mjs';

const opt = (name, value, text, { type = 'radio', checked = false, data = {} } = {}) =>
  `<label class="opt"><input type="${type}" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}><span>${esc(text)}</span></label>`;

/**
 * @param {object} o
 * @param {string} [o.country] — предвыбранная страна (japan | korea | china)
 * @param {string} [o.subject] — тема заявки
 */
export function quizSection(ctx, { country = '', subject = 'Квиз: подбор автомобиля', title, white = false } = {}) {
  const manager = ctx.team[0];
  // лёгкий индекс каталога для подсчёта подходящих автомобилей на последнем шаге
  // возраст — таможенная категория: 0 — до 3 лет, 1 — 3–5 лет, 2 — старше 5
  const AGE = { le3: 0, '3to5': 1, gt5: 2 };
  const index = ctx.cars.map((c) => [c.country, c.body || '', c.priceRub || 0, AGE[c.ageCat] ?? -1]);
  const bodies = [
    ['кроссовер', 'Кроссовер'],
    ['седан', 'Седан'],
    ['минивэн', 'Минивэн'],
    ['хэтчбек', 'Хэтчбек'],
    ['универсал', 'Универсал'],
    ['', 'Пока не решил'],
  ];
  return html`
    <section class="section section--dark quiz-section" id="podbor">
      <div class="container">
        <div class="quiz-head"${reveal()}>
          ${label('Подбор за 1 минуту')}
          <h2 data-split>${title || duo('Расскажите, какой автомобиль ищете, —', 'подберём варианты и посчитаем под ключ')}</h2>
        </div>
        <div class="quiz"${reveal(1)}>
          <aside class="quiz__expert">
            <div class="quiz__avatar">${img({ src: manager.photo, alt: `${manager.name}, ${manager.role}`, sizes: '72px' })}</div>
            <div>
              <div class="quiz__name">${esc(manager.name)}</div>
              <div class="quiz__role">${esc(manager.role)}</div>
            </div>
            <p class="quiz__bubble" data-quiz-bubble>${typo('Здравствуйте! Ответьте на четыре коротких вопроса — подберём варианты на аукционах и площадках и пришлём расчёт под ключ.')}</p>
            <ul class="quiz__perks">
              <li>${icon('check')} Варианты из трёх стран в одном бюджете</li>
              <li>${icon('check')} Расчёт под ключ до Владивостока</li>
              <li>${icon('check')} По таможенным ставкам 2026 года</li>
            </ul>
          </aside>

          <form class="form quiz__panel" method="post" data-lead-form data-quiz novalidate>
            <input type="hidden" name="subject" value="${esc(subject)}">
            <input type="hidden" name="comment" value="">
            <script type="application/json" data-quiz-index>${JSON.stringify(index)}</script>

            <div class="quiz__top">
              <span class="label label--plain" data-quiz-count>Шаг 1 / 5</span>
              <div class="quiz__progress" aria-hidden="true"><i data-quiz-bar style="width:20%"></i></div>
            </div>

            <fieldset class="quiz__step" data-quiz-step="body" data-bubble="Начнём с типа кузова. Если пока выбираете — так и отметьте.">
              <legend class="quiz__q">Какой автомобиль вы рассматриваете?</legend>
              <p class="quiz__hint">Можно выбрать несколько вариантов.</p>
              <div class="opts">${bodies.map(([v, t]) => opt('q-body', v, t, { type: 'checkbox' }))}</div>
              <label class="field quiz__free">
                <span class="field__label">Или напишите марку и модель</span>
                <input class="field__control" type="text" name="car" placeholder="Toyota Yaris Cross, Kia Sportage">
              </label>
            </fieldset>

            <fieldset class="quiz__step" data-quiz-step="country" data-bubble="Япония — правый руль и аукционный лист. Корея — левый руль. Китай — новые модели и электромобили." hidden>
              <legend class="quiz__q">Из какой страны везти?</legend>
              <p class="quiz__hint">Не уверены — сравним варианты из разных стран.</p>
              <div class="opts">
                ${ctx.countries.map((c) => opt('q-country', c.slug, `${c.navTitle} · ${c.steering}`, { checked: c.slug === country }))}
                ${opt('q-country', '', 'Где выгоднее', { checked: !country })}
              </div>
            </fieldset>

            <fieldset class="quiz__step" data-quiz-step="budget" data-bubble="Бюджет — под ключ во Владивостоке: с доставкой, таможней и документами." hidden>
              <legend class="quiz__q">Какой бюджет под ключ?</legend>
              <p class="quiz__hint">С учётом доставки до Владивостока и таможенных платежей.</p>
              <div class="opts">
                ${opt('q-budget', '1000000', 'до 1 млн ₽')}
                ${opt('q-budget', '1500000', 'до 1,5 млн ₽')}
                ${opt('q-budget', '2000000', 'до 2 млн ₽', { checked: true })}
                ${opt('q-budget', '3000000', 'до 3 млн ₽')}
                ${opt('q-budget', '5000000', 'до 5 млн ₽')}
                ${opt('q-budget', '', 'Больше 5 млн ₽')}
              </div>
            </fieldset>

            <fieldset class="quiz__step" data-quiz-step="age" data-bubble="Автомобили 3–5 лет называют «проходными»: пошлина у них обычно самая низкая." hidden>
              <legend class="quiz__q">Какой возраст автомобиля подходит?</legend>
              <p class="quiz__hint">От возраста зависит таможенная пошлина.</p>
              <div class="opts">
                ${opt('q-age', 'new', 'Новый или до 3 лет')}
                ${opt('q-age', 'pass', '3–5 лет · проходной', { checked: true })}
                ${opt('q-age', 'old', 'Старше 5 лет')}
                ${opt('q-age', '', 'Не важно')}
              </div>
              <label class="field quiz__free">
                <span class="field__label">Город, куда доставить</span>
                <input class="field__control" type="text" name="city" placeholder="Например, Новосибирск" autocomplete="address-level2">
              </label>
            </fieldset>

            <fieldset class="quiz__step" data-quiz-step="contact" data-bubble="Последний шаг. Менеджер напишет или позвонит в рабочее время — как вам удобнее." hidden>
              <legend class="quiz__q">Куда прислать подборку и расчёт?</legend>
              <p class="quiz__hint" data-quiz-match></p>
              <div class="form__row">
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
                  ${opt('contact', 'Звонок', 'Звонок')}
                </div>
              </fieldset>
              <label class="check u-mt-4">
                <input type="checkbox" name="agree" required aria-describedby="quiz-agree-error">
                <span>Соглашаюсь на обработку персональных данных согласно <a href="${u(R.privacy)}" target="_blank">политике конфиденциальности</a></span>
              </label>
              <span class="field__error" id="quiz-agree-error" role="alert">Отметьте согласие на обработку данных — без него заявку не отправить</span>
            </fieldset>

            <div class="quiz__nav">
              <button class="btn btn--ghost quiz__back" type="button" data-quiz-back hidden>${icon('arrow')}<span class="sr-only">Назад</span></button>
              <button class="btn btn--dark" type="button" data-quiz-next>Далее ${icon('arrow', 'i-arrow')}</button>
              <button class="btn btn--primary" type="submit" data-quiz-submit hidden>Получить подборку ${icon('arrow', 'i-arrow')}</button>
            </div>

            <div class="form__success" role="status">
              <span class="label">Заявка принята</span>
              <p class="h3" data-success-title>Спасибо! Подготовим подборку и расчёт в рабочее время.</p>
              <p data-quiz-result></p>
              <div class="btn-row">
                <a class="btn btn--dark" href="${u(R.catalog)}" data-quiz-catalog><span data-quiz-catalog-text>Смотреть каталог</span> ${icon('arrow', 'i-arrow')}</a>
                <a class="btn btn--wa" data-wa-link href="#" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
              </div>
              <p class="form__note">Это демонстрационная версия сайта: заявка никуда не отправлена.</p>
            </div>
          </form>
        </div>
      </div>
    </section>`;
}
