import { attrs, cx, esc, html } from '../lib/core.mjs';
import { icon } from '../lib/icons.mjs';

/** Нативный select отвечает за данные формы, дополнительный интерфейс включает catalog-select.js. */
export function selectControl({ id, label, name, options, kind, fieldClass, attributes, search = false, custom = false }) {
  const sort = kind === 'sort';
  const combobox = attrs({ id: id + '-trigger', role: 'combobox', 'aria-haspopup': 'listbox',
    'aria-expanded': 'false', 'aria-controls': id + '-list', 'aria-labelledby': id + '-label' });
  return html`<div class="${cx('field catalog-select', fieldClass, kind && 'catalog-select--' + kind)}" data-catalog-select${attrs({ 'data-search': search, 'data-allow-custom': custom })}>
    <label class="${sort ? 'sr-only' : 'field__label'}" id="${id}-label" for="${id}">${esc(label)}</label>
    <select class="field__control" id="${id}"${attrs({ name, ...attributes })}>${options}</select>
    ${search ? html`<div class="catalog-select__input-wrap" data-select-shell hidden>
      ${kind === 'brand' ? '<img class="catalog-select__logo" alt="" width="32" height="22" hidden>' : ''}
      <input type="text" class="field__control catalog-select__input" autocomplete="off" spellcheck="false" maxlength="100" aria-autocomplete="list"${combobox}>
      ${icon('chevron', 'catalog-select__caret')}
    </div>` : html`<button type="button" class="field__control catalog-select__trigger" data-select-shell${combobox} hidden>
      ${sort ? icon('sort', 'catalog-select__symbol') : ''}
      <span class="catalog-select__value"></span>${icon('chevron', 'catalog-select__caret')}
    </button>`}
    <div class="catalog-select__menu" id="${id}-list" role="listbox" aria-labelledby="${id}-label" hidden></div>
    <span class="sr-only" role="status" data-select-status></span>
  </div>`;
}
