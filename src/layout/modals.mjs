// Общие модальные окна (нативный <dialog>): заявка/расчет.
import { html, typo } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';
import { leadForm } from '../components/forms.mjs';

export function modals(ctx) {
  const { site } = ctx;
  return html`
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
        <img class="lightbox__img" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" width="1" height="1" data-lightbox-img>
        <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Следующее фото" data-lightbox-next>${icon('arrow')}</button>
        <div class="lightbox__count mono" data-lightbox-count></div>
      </div>
    </dialog>`;
}
