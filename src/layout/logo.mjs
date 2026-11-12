// Логотип инлайном: текст наследует цвет, знак-силуэт красится акцентом (на темном — белым).
import { esc, u, cx, readText } from '../lib/core.mjs';

let cache = null;

export function logoSvg(label = 'Макс Групп') {
  if (!cache) {
    cache = readText('assets/img/brand/logo.svg')
      .replace(/<svg[^>]*>/, '<svg viewBox="0 0 142 38" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="__LABEL__">')
      .replace(/fill="black"/g, 'fill="currentColor"')
      .replace(/fill="#1F467F"/gi, 'class="logo__mark" fill="currentColor"')
      .replace(/\s+/g, ' ');
  }
  return cache.replace('__LABEL__', esc(label));
}

export function logo(site, cls = '') {
  return `<a class="${cx('logo', cls)}" href="${u('/')}" aria-label="${esc(site.name)}, на главную">${logoSvg(site.name)}</a>`;
}
