// Общие модальные окна (нативный <dialog>): заявка/расчет.
import { html, typo, esc, img } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { leadForm } from '../components/forms.mjs';

export function modals(ctx) {
  const { site } = ctx;
  return html`
    <button type="button" class="chat-launch" data-chat-toggle aria-haspopup="dialog" aria-controls="modal-chat" aria-expanded="false" aria-label="Открыть чат">
      ${icon('message', 'chat-launch__message')}${icon('close', 'chat-launch__close')}
    </button>
    <dialog class="chat" id="modal-chat" aria-labelledby="chat-title">
      <header class="chat__head">
        ${img({ src: site.salesManager.photo, cls: 'chat__avatar', alt: '', sizes: '46px' })}
        <div><h2 id="chat-title" class="h4">${esc(site.salesManager.name)}</h2>
          <p class="chat__role">${esc(site.salesManager.role)}</p>
          <p class="chat__presence">Онлайн</p></div>
        <button class="chat__close" type="button" aria-label="Закрыть чат" data-modal-close>${icon('close')}</button>
      </header>
      <div class="chat__scroll">
        <div class="chat__log" role="log" aria-label="Переписка" data-chat-log>
          <p class="chat__message">Здравствуйте! На связи Валерий, чем могу помочь?</p>
        </div>
        <div data-chat-contact hidden>
          ${leadForm({ fromChat: true, subject: 'Заявка из чата Макс Групп', nameLabel: 'Имя', fields: ['name', 'phone'],
            hidden: { conversation: '' }, cta: 'Отправить Валерию' })}
        </div>
      </div>
      <form data-chat-question class="chat__compose">
        <label class="field"><span class="sr-only">Ваш вопрос</span><input class="field__control" name="question" placeholder="Напишите сообщение" maxlength="500" required autocomplete="off"></label>
        <button class="btn btn--primary" type="submit" aria-label="Отправить вопрос">${icon('send')}</button>
      </form>
    </dialog>
    <dialog class="modal" id="modal-request" aria-labelledby="modal-request-title">
      <div class="modal__box">
        <button class="modal__close" type="button" aria-label="Закрыть" data-modal-close>${icon('close')}</button>
        <span class="label" data-modal-label>Заявка</span>
        <h2 class="modal__title u-mt-4" id="modal-request-title" data-modal-title>Рассчитаем стоимость под ключ</h2>
        <p class="modal__text" data-modal-text>${typo('Оставьте контакты, и менеджер уточнит пожелания, подберет варианты на аукционах и площадках и пришлет расчет до Владивостока и вашего города.')}</p>
        ${leadForm({ subject: 'Заявка с сайта', fields: ['name', 'phone', 'car', 'contact'], cta: 'Получить расчет' })}
      </div>
    </dialog>

    <dialog class="modal modal--wide modal--gallery" id="modal-gallery" aria-label="Просмотр фотографий">
      <button class="modal__close" type="button" aria-label="Закрыть" data-modal-close>${icon('close')}</button>
      <div class="lightbox" data-lightbox>
        <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Предыдущее фото" data-lightbox-prev>${icon('arrow')}</button>
        <img class="lightbox__img" src="data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==" alt="" width="1" height="1" data-lightbox-img>
        <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Следующее фото" data-lightbox-next>${icon('arrow')}</button>
        <div class="lightbox__count mono" data-lightbox-count></div>
      </div>
    </dialog>`;
}
