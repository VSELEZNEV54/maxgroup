// Формы заявок. Бэкенда нет: отправка обрабатывается на фронте (js/main.js → состояние «успех» + ссылки в мессенджеры).
// Согласие на обработку данных по умолчанию не отмечено: это должно быть действием посетителя.
// Кнопка Telegram в блоке «Заявка принята» скрыта, пока нет личного адреса менеджера (site.socials.telegramManager):
// канал компании для переписки не подходит. method="post" — чтобы при сбое скрипта телефон не попал в адресную строку.
import { html, esc, u } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { selectControl } from './select.mjs';

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;
export const resetFormIds = () => { uid = 0; };

const FIELD = {
  name: (id) => html`
      <label class="field">
        <span class="field__label">Как к вам обращаться</span>
        <input class="field__control" type="text" name="name" id="${id}-name" autocomplete="given-name" placeholder="Имя">
      </label>`,
  phone: (id) => html`
      <label class="field">
        <span class="field__label">Телефон</span>
        <input class="field__control" type="tel" name="phone" id="${id}-phone" autocomplete="tel" inputmode="tel" placeholder="+7 (___) ___-__-__" required aria-describedby="${id}-phone-error" data-phone>
        <span class="field__error" id="${id}-phone-error" role="alert">Укажите номер полностью: 10 цифр после +7</span>
      </label>`,
  car: (id, o) => html`
      <label class="field">
        <span class="field__label">Какой автомобиль ищете</span>
        <input class="field__control" type="text" name="car" id="${id}-car" placeholder="Toyota Alphard 2022-2023" value="${esc(o.car || '')}">
      </label>`,
  budget: (id) => selectControl({ id: id + '-budget', name: 'budget', label: 'Бюджет под ключ',
    options: '<option value="">Не определился</option><option>до 1 млн ₽</option><option>1-1,5 млн ₽</option><option>1,5-2,5 млн ₽</option><option>2,5-4 млн ₽</option><option>от 4 млн ₽</option>' }),
  city: (id, o) => html`
      <label class="field">
        <span class="field__label">Город доставки</span>
        <input class="field__control" type="text" name="city" id="${id}-city" autocomplete="address-level2" placeholder="Город" value="${esc(o.city || '')}">
      </label>`,
  comment: (id) => html`
      <label class="field">
        <span class="field__label">Комментарий</span>
        <textarea class="field__control" name="comment" id="${id}-comment" rows="3" placeholder="Пожелания по году, пробегу, комплектации"></textarea>
      </label>`,
  contact: (id) => html`
      <fieldset class="field" style="border:0;padding:0;margin:0">
        <legend class="field__label">Как удобнее связаться</legend>
        <div class="opts">
          <label class="opt"><input type="radio" name="contact" value="Звонок" checked><span>Звонок</span></label>
          <label class="opt"><input type="radio" name="contact" value="WhatsApp"><span>WhatsApp</span></label>
          <label class="opt"><input type="radio" name="contact" value="Telegram"><span>Telegram</span></label>
        </div>
      </fieldset>`,
};

/**
 * Форма заявки.
 * @param {object} o
 * @param {string} o.subject  — тема заявки (уходит в текст сообщения)
 * @param {string[]} [o.fields] — порядок полей: name, phone, car, budget, city, comment, contact
 * @param {string} [o.cta] — текст кнопки
 * @param {string} [o.btn] — модификатор кнопки (btn--primary | btn--light | btn--dark)
 */
export function leadForm(o = {}) {
  const id = nextId('f');
  const fields = o.fields || ['name', 'phone'];
  const cta = o.cta || 'Отправить заявку';
  return html`
    <form class="form" id="${id}" method="post" data-lead-form novalidate>
      <input type="hidden" name="subject" value="${esc(o.subject || 'Заявка с сайта')}">
      <input type="hidden" name="calc" value="">
      ${o.hidden ? Object.entries(o.hidden).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`) : ''}
      ${fields.map((f) => FIELD[f](id, o))}
      <label class="check">
        <input type="checkbox" name="agree" required aria-describedby="${id}-agree-error">
        <span>Соглашаюсь на обработку персональных данных согласно <a href="${u('/politika-konfidencialnosti/')}" target="_blank">политике конфиденциальности</a></span>
      </label>
      <span class="field__error" id="${id}-agree-error" role="alert">Отметьте согласие на обработку данных: без него заявку не отправить</span>
      <button class="btn ${o.btn || 'btn--primary'} btn--block" type="submit">${esc(cta)}</button>
      ${o.note ? `<p class="form__note">${esc(o.note)}</p>` : ''}
      <div class="form__success" role="status">
        <span class="label">Заявка принята</span>
        <p class="h4" data-success-title>Спасибо! Менеджер свяжется с вами в рабочее время.</p>
        <p class="form__note">Это демонстрационная версия сайта: заявка никуда не отправлена. Чтобы связаться прямо сейчас, напишите нам в мессенджер.</p>
        <div class="btn-row">
          <a class="btn btn--wa btn--sm" data-wa-link href="#" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
          <a class="btn btn--tg btn--sm" data-tg-link href="#" target="_blank" rel="noopener" hidden>${icon('telegram')} Telegram</a>
        </div>
      </div>
    </form>`;
}
