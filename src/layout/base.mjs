// Каркас документа: <head>, шапка, футер, модальные окна, скрипты.
import { html, u, a, cx, imgSize, fileExists } from '../lib/core.mjs';
import { headTags } from '../lib/seo.mjs';
import { icon } from '../lib/icons.mjs';
import { header, drawer, dock } from './header.mjs';
import { footer } from './footer.mjs';
import { modals } from './modals.mjs';

export function base(ctx, page, body) {
  const { site, build } = ctx;
  const v = build.version;
  const scripts = ['main', ...(page.scripts || []), 'catalog-select'];
  return html`<!doctype html>
<html lang="ru" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <script>document.documentElement.className='js';setTimeout(function(){var d=document.documentElement;if(d.className.indexOf('is-ready')<0)d.className+=' reveal-off'},4000);</script>
    ${headTags(site, page)}
    <meta name="theme-color" content="#0a0c0f">
    <meta name="format-detection" content="telephone=no">
    <link rel="icon" href="${a('img/brand/favicon.ico')}" sizes="any">
    <link rel="icon" href="${a('img/brand/icon-192.png')}" type="image/png" sizes="192x192">
    <link rel="apple-touch-icon" href="${a('img/brand/apple-touch-icon.png')}">
    <link rel="manifest" href="${u('/site.webmanifest')}">
    ${build.local ? '' : `<link rel="preload" href="${a('fonts/inter-tight-cyrillic.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="${a('fonts/inter-tight-latin.woff2')}" as="font" type="font/woff2" crossorigin>`}
    ${(page.preload || []).map((p) => {
      // у изображений с уменьшенными версиями (-480, -800) браузер должен предзагрузить ту же, что выберет <img srcset>
      const m = p.as === 'image' && String(p.href).match(/^(.*)\.(webp|jpg|png)$/);
      const size = m ? imgSize('assets/' + p.href) : null;
      const set = m && size ? [480, 800].filter((w) => w < size.w && fileExists(`assets/${m[1]}-${w}.${m[2]}`)).map((w) => `${a(`${m[1]}-${w}.${m[2]}`)} ${w}w`) : [];
      const srcset = set.length ? ` imagesrcset="${[...set, `${a(p.href)} ${size.w}w`].join(', ')}" imagesizes="${p.sizes || '100vw'}"` : '';
      return `<link rel="preload" href="${a(p.href)}" as="${p.as}"${p.type ? ` type="${p.type}"` : ''}${p.media ? ` media="${p.media}"` : ''}${srcset} fetchpriority="high">`;
    })}
    <link rel="stylesheet" href="${a('css/main.css')}?v=${v}">
    ${(page.styles || []).map((s) => `<link rel="stylesheet" href="${a(`css/${s}.css`)}?v=${v}">`)}
  </head>
  <body class="${cx(page.bodyClass, page.headerOver && 'has-hero')}">
    <a class="skip-link" href="#main">Перейти к содержанию</a>
    ${header(ctx, page)}
    ${drawer(ctx, page)}
    <main id="main">
${body}
    </main>
    ${footer(ctx, page)}
    ${dock(ctx, page)}
    ${modals(ctx, page)}
    <div class="toast" role="status" aria-live="polite" hidden></div>
    <div class="cookie" id="cookie" role="dialog" aria-label="Использование cookie" hidden>
      <p>Сайт использует cookie. Продолжая пользоваться им, вы соглашаетесь с <a href="${u('/politika-konfidencialnosti/')}">политикой конфиденциальности</a>.</p>
      <button class="btn btn--sm" type="button" data-cookie-accept>Понятно</button>
    </div>
    <script>window.__SITE__ = ${JSON.stringify({ wa: site.socials.whatsapp?.url || '', tg: site.socials.telegramManager?.url || '', phone: site.contacts.phones[0].tel })};</script>
    ${scripts.map((s) => `<script src="${a(`js/${s}.js`)}?v=${v}" defer${s === 'main' ? ` onerror="document.documentElement.className='no-js'"` : ''}></script>`)}
  </body>
</html>
`;
}

export { icon };
