// Сборка квизов: node квизы/build.mjs
// Пишет квизы/<slug>/index.html для каждой модели из models.mjs, общую страницу квизы/index.html
// и копирует нужные картинки, шрифты и логотипы из проекта в квизы/assets/.
// Логика шагов в assets/quiz.js, стили в assets/quiz.css (токены дизайн-системы Max Group).
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { icon } from '../src/lib/icons.mjs';
import { site } from '../src/data/site.mjs';
import { COMMON, PERKS, COUNTRY, MODELS } from './models.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const A = join(HERE, 'assets');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// неразрывный пробел после коротких слов и перед ₽, как на сайте
const typo = (s = '') => esc(s).replace(/(?<=^|\s)([а-яА-Яa-zA-Z0-9]{1,2})\s/g, '$1 ').replace(/\s₽/g, ' ₽').replace(/(\d)\s(млн|тыс|дней|лет|км)/g, '$1 $2').replace(/под\sключ/g, 'под ключ');

// --- ассеты -------------------------------------------------------------------------------------------
function copy(from, to) {
  // design-system/ не в git: на GitHub исходника нет, берем уже лежащую в квизы/assets копию
  if (!existsSync(from)) {
    if (existsSync(to)) return;
    throw new Error(`Нет файла ${from}`);
  }
  mkdirSync(dirname(to), { recursive: true });
  if (!existsSync(to) || !readFileSync(from).equals(readFileSync(to))) copyFileSync(from, to);
}
for (const f of ['inter-tight-cyrillic.woff2', 'inter-tight-cyrillic-ext.woff2', 'inter-tight-latin.woff2', 'inter-tight-latin-ext.woff2']) {
  copy(join(ROOT, 'assets/fonts', f), join(A, 'fonts', f));
}
copy(join(ROOT, 'design-system/assets/logo-light.svg'), join(A, 'logo-light.svg'));
for (const f of ['flag-jp.svg', 'flag-cn.svg', 'favicon-48.png', 'apple-touch-icon.png']) {
  copy(join(ROOT, 'assets/img/brand', f), join(A, f));
}
copy(join(ROOT, site.salesManager.photo), join(A, 'img', 'sales-manager.webp'));
for (const m of MODELS) copy(join(ROOT, 'assets/img/cars', m.photo.from), join(A, 'img', `${m.slug}.webp`));

// фото первого экрана (renders.json + renders.py): берем сцену, если она уже лежит в assets/img/renders
const SCENES = JSON.parse(readFileSync(join(HERE, 'renders.json'), 'utf8')).items
  .filter((r) => !r.alt && existsSync(join(A, 'img/renders', `${r.file}.webp`)));
const sceneFor = (slug) => SCENES.find((r) => r.model === slug);
const SIZES = existsSync(join(A, 'img/renders/sizes.json')) ? JSON.parse(readFileSync(join(A, 'img/renders/sizes.json'), 'utf8')) : {};

// логотип инлайном (темный текст для светлого фона)
// оригинальные знаки мессенджеров (assets/brand): Telegram с telegram.org, MAX растр 192 px из официального svg max.ru (сам svg из 150 клиньев с масками на маленьком размере рассыпается), WhatsApp с Wikimedia Commons без белой обводки, кадр по зеленому пузырю
const BRAND_EXT = { telegram: 'svg', whatsapp: 'svg', max: 'webp' };
const brand = (k, size) => `<img class="q-brand" src="../assets/brand/${k}.${BRAND_EXT[k]}" alt="" width="${size}" height="${size}" decoding="async">`;
const logoSvg = () => readFileSync(join(A, 'logo-light.svg'), 'utf8').replace('<svg ', '<svg aria-hidden="true" ');

// --- части страницы ------------------------------------------------------------------------------------
const LABELS = { color: 'Цвет', age: 'Возраст', mileage: 'Пробег', budget: 'Бюджет' };

// телефон, мессенджеры и ссылка на сайт: в шапке первого экрана и в полосе квиза
const contacts = (where) => `<div class="q-contacts q-contacts--${where}">
      <a class="q-phone" href="tel:${COMMON.phone.tel}">${icon('phone')}<span><b>${esc(COMMON.phone.display)}</b><small>${esc(COMMON.hours)}</small></span></a>
      <span class="q-socials">
        <a class="q-soc q-soc--tg" href="${COMMON.telegramChannel}" target="_blank" rel="noopener" aria-label="Telegram-канал Макс Групп">${brand('telegram', 36)}</a>
        <a class="q-soc q-soc--wa" href="${COMMON.whatsapp}" target="_blank" rel="noopener" aria-label="Написать в WhatsApp">${brand('whatsapp', 36)}</a>
        <a class="q-soc q-soc--max" href="${COMMON.max}" target="_blank" rel="noopener" aria-label="Написать в MAX">${brand('max', 36)}</a>
      </span>
      <a class="btn btn--ghost btn--sm q-site" href="${COMMON.site}">На сайт</a>
    </div>`;

// вариант ответа строкой: отметка слева, текст, плашка справа
function option(g, o) {
  const type = g.multi ? 'checkbox' : 'radio';
  const swatch = g.name === 'color' ? `<span class="q-opt__swatch${o.color ? '' : ' q-opt__swatch--any'}"${o.color ? ` style="background:${o.color}"` : ''}></span>` : '';
  return `<label class="q-opt">
        <input type="${type}" name="${g.name}" value="${esc(o.v)}" data-sum="${esc(o.sum || o.t)}"${o.v === 'any' ? ' data-any' : ''}>
        <span class="q-opt__mark q-opt__mark--${type}">${icon('check')}</span>
        ${swatch}<span class="q-opt__text"><span class="q-opt__t">${typo(o.t)}</span>${o.s ? `<span class="q-opt__s">${typo(o.s)}</span>` : ''}</span>
        ${o.badge ? `<span class="q-badge">${esc(o.badge)}</span>` : ''}
      </label>`;
}

const group = (g, step) => `<div class="q-list" role="${g.multi ? 'group' : 'radiogroup'}" aria-label="${esc(step.q)}" data-group="${g.name}" data-main${g.multi ? ' data-multi' : ''}>
      ${g.options.map((o) => option(g, o)).join('\n      ')}
    </div>`;

function stepHtml(step, i, total) {
  return `<div class="q-step" role="group" aria-labelledby="q-t-${step.id}" data-step="${step.id}" data-index="${i}"${step.optional ? ' data-optional' : ''} data-tip="${esc(step.tip)}"${i ? ' hidden' : ''}>
    <p class="q-count">Вопрос ${i + 1} из ${total}</p>
    <h2 class="q-q" id="q-t-${step.id}" tabindex="-1">${typo(step.q)}</h2>
    <p class="q-hint">${typo(step.hint)}</p>
    ${step.groups.map((g) => group(g, step)).join('\n')}
  </div>`;
}

// последний шаг: сначала выбор мессенджера, после выбора появляются поля (по одному в строке)
function contactStep(m, i) {
  const msgs = [
    ['Telegram', 'telegram', 'tg'],
    ['WhatsApp', 'whatsapp', 'wa'],
    ['MAX', 'max', 'max'],
    ['Звонок', 'phone', 'call'],
  ];
  return `<div class="q-step q-step--contact" role="group" aria-labelledby="q-t-contact" data-step="contact" data-index="${i}" data-tip="${esc(`Пришлем варианты ${m.short} и расчет под ключ. Менеджер ответит в рабочее время, ${COMMON.hours}.`)}" hidden>
    <p class="q-count">Последний шаг</p>
    <h2 class="q-q" id="q-t-contact" tabindex="-1">Куда прислать подборку и расчет?</h2>
    <p class="q-hint">Выберите, как вам удобнее связаться</p>
    <div class="q-msg" role="radiogroup" aria-label="Как удобнее связаться" data-group="contact">
      ${msgs.map(([t, ic, k]) => `<label class="q-msg__item q-msg__item--${k}"><input type="radio" name="contact" value="${t}" data-sum="${t}"><span class="q-msg__icon">${k === 'call' ? icon(ic) : brand(ic, 48)}</span><span class="q-msg__t">${t}${k === 'wa' ? '<sup>*</sup>' : ''}</span></label>`).join('\n      ')}
    </div>
    <span class="q-field__err q-field__err--contact" role="alert">Выберите, куда прислать подборку</span>

    <div class="q-contact-form" data-contact-fields hidden>
      <label class="q-field">
        <span class="q-field__label">Телефон</span>
        <input class="q-field__control" type="tel" name="phone" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" aria-describedby="q-phone-err">
        <span class="q-field__err" id="q-phone-err" role="alert">Укажите номер полностью, 10 цифр после +7</span>
      </label>
      <label class="q-field" data-tg-field hidden>
        <span class="q-field__label">Ник в Telegram <span class="q-field__opt">необязательно</span></span>
        <input class="q-field__control" type="text" name="tg" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@username">
        <span class="q-field__help">Если не укажете, найдем вас по номеру телефона</span>
      </label>
      <label class="q-field">
        <span class="q-field__label">Имя</span>
        <input class="q-field__control" type="text" name="name" autocomplete="given-name" placeholder="Как к вам обращаться">
      </label>
      <label class="q-check">
        <input type="checkbox" name="agree" aria-describedby="q-agree-err">
        <span class="q-check__box">${icon('check')}</span>
        <span>Соглашаюсь на обработку персональных данных согласно <a href="${COMMON.privacy}" target="_blank" rel="noopener">политике конфиденциальности</a></span>
      </label>
      <span class="q-field__err q-field__err--agree" id="q-agree-err" role="alert">Отметьте согласие, без него заявку не отправить</span>
      <p class="q-note" data-wa-note hidden>* WhatsApp принадлежит компании Meta, признанной экстремистской организацией в России</p>
    </div>
  </div>`;
}

function summaryRows(m) {
  const rows = m.steps.flatMap((s) => s.groups.map((g) => [g.name, LABELS[g.name] || g.name]));
  return rows.map(([k, l]) => `<div class="q-sum__row" data-sum-row="${k}"><dt>${esc(l)}</dt><dd data-sum-val="${k}">не выбрано</dd></div>`).join('');
}

const kicker = (m) => {
  const flags = m.countries.map((c) => `<img src="../assets/${COUNTRY[c].flag}" alt="" width="24" height="16">`).join('');
  const where = m.countries.length > 1 ? `из ${m.countries.map((c) => (c === 'jp' ? 'Японии' : 'Китая')).join(' и ')}` : COUNTRY[m.countries[0]].from;
  return `<p class="q-kicker"><span class="q-kicker__flags">${flags}</span>Под заказ ${where}</p>`;
};

function page(m) {
  const qs = m.steps;
  const total = qs.length;
  const cfg = { slug: m.slug, model: m.name, short: m.short, total: total + 1, endpoint: COMMON.endpoint, metrika: COMMON.metrika, hours: COMMON.hours };
  const title = m.title.join(' ');
  const desc = `${m.name} под заказ под ключ. Ответьте на ${total} вопроса и получите подборку с расчетом.`;
  const scene = sceneFor(m.slug);
  const img = scene
    ? { src: `../assets/img/renders/${scene.file}.webp`, srcset: `../assets/img/renders/${scene.file}-800.webp 800w, ../assets/img/renders/${scene.file}.webp ${SIZES[scene.file]?.[0] || 1024}w`, w: SIZES[scene.file]?.[0] || 1024, h: SIZES[scene.file]?.[1] || 1024, alt: m.name }
    : { src: `../assets/img/${m.slug}.webp`, srcset: '', w: 640, h: 480, alt: m.photo.alt };
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} | Макс Групп</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#ffffff">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${img.src}">
<link rel="icon" href="../assets/favicon-48.png" sizes="48x48">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
<link rel="preload" href="../assets/fonts/inter-tight-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/quiz.css">
</head>
<body data-state="start">
<script type="application/json" id="q-config">${JSON.stringify(cfg)}</script>

<section class="q-start" data-screen="start" aria-labelledby="q-title">
  <header class="q-top">
    <a class="q-logo" href="./" data-home aria-label="Макс Групп, к началу подбора">${logoSvg()}</a>
    ${contacts('start')}
  </header>

  <figure class="q-start__media">
    <img src="${img.src}"${img.srcset ? ` srcset="${img.srcset}" sizes="(min-width: 1024px) 50vw, 100vw"` : ''} alt="${esc(img.alt)}" width="${img.w}" height="${img.h}" fetchpriority="high">
  </figure>

  <div class="q-start__body">
    ${kicker(m)}
    <h1 class="q-hero" id="q-title"><span class="q-hero__model">${typo(m.title[0])}</span> <span class="q-hero__offer"><span class="q-mute">${typo(m.title[1])}</span> <span class="q-hero__accent">${typo(m.title[2])}</span></span></h1>
    <p class="q-lead">${typo(`Ответьте на ${total} вопроса, и мы пришлем подборку ${m.short} с расчетом под ключ`)}</p>
    <ul class="q-perks">
      ${m.perks.map((k) => `<li>${icon(PERKS[k].icon)}<span>${typo(PERKS[k].t)}</span></li>`).join('\n      ')}
    </ul>
    <div class="q-cta">
      <button class="btn btn--primary btn--lg" type="button" data-go>Подобрать ${esc(m.short)}</button>
      <span class="q-cta__note">${icon('clock')} Около минуты</span>
    </div>
    <p class="q-bonus">${icon('doc-check')}<span><b>Бонус после ответов</b>${typo(`Подборка ${m.short} с расчетом под ключ`)}</span></p>
  </div>
</section>

<section class="q-run" data-screen="quiz" hidden aria-label="Подбор ${esc(m.name)}">
  <header class="q-bar">
    <div class="q-bar__in q-wrap">
      <a class="q-logo" href="./" data-home aria-label="Макс Групп, к началу подбора">${logoSvg()}</a>
      <div class="q-progress" aria-hidden="true"><span class="q-progress__text" data-progress-text>Вопрос 1 из ${total}</span><span class="q-progress__track"><i data-progress-bar></i></span></div>
      ${contacts('bar')}
    </div>
  </header>

  <div class="q-run__grid q-wrap">
    <form class="q-form" novalidate data-form>
      ${qs.map((s, i) => stepHtml(s, i, total)).join('\n')}
      ${contactStep(m, total)}

      <div class="q-nav" data-nav>
        <button class="btn btn--ghost btn--lg q-nav__back" type="button" data-back>Назад</button>
        <button class="btn btn--dark btn--lg q-nav__next" type="button" data-next><span data-next-label>Далее</span></button>
        <button class="btn btn--primary btn--lg q-nav__submit" type="submit" data-submit hidden>Получить подборку</button>
        <span class="q-nav__enter">или нажмите Enter</span>
      </div>

      <div class="q-done" data-done hidden tabindex="-1">
        <span class="q-done__mark">${icon('check')}</span>
        <h2 class="q-done__title">Заявка принята. <span class="q-mute">Готовим подборку ${esc(m.short)}</span></h2>
        <p class="q-done__text" data-done-text>Менеджер свяжется с вами в рабочее время, ${esc(COMMON.hours)}.</p>
        <p class="q-done__err" data-done-err hidden>Заявку не удалось отправить. Позвоните нам по номеру <a href="tel:${COMMON.phone.tel}">${esc(COMMON.phone.display)}</a>, и мы все посчитаем.</p>
        <div class="q-done__actions">
          <a class="btn btn--primary btn--lg" href="${COMMON.telegramChannel}" target="_blank" rel="noopener">${icon('telegram')} Telegram-канал Макс Групп</a>
          <a class="btn btn--ghost btn--lg" href="${COMMON.site}">Перейти на сайт</a>
        </div>
      </div>
    </form>

    <aside class="q-side" aria-label="Ваша подборка">
      <div class="q-side__card">
        <p class="q-side__title">Подборка ${esc(m.name)}</p>
        <dl class="q-sum">${summaryRows(m)}</dl>
        <div class="q-tipbox" aria-live="polite">
          <span class="q-tipbox__ava"><img src="../assets/img/sales-manager.webp" alt="" width="40" height="40"></span>
          <div><span class="q-tipbox__who">${esc(site.salesManager.name)}</span><p class="q-tipbox__text" data-tip-text>${typo(qs[0].tip)}</p></div>
        </div>
      </div>
      <p class="q-side__bonus">${icon('doc-check')}<span>${typo(`После ответов пришлем подборку ${m.short} и расчет под ключ`)}</span></p>
    </aside>
  </div>
</section>

<script src="../assets/quiz.js" defer></script>
</body>
</html>
`;
}

function hub() {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Квизы подбора | Макс Групп</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="assets/favicon-48.png" sizes="48x48">
<link rel="stylesheet" href="assets/quiz.css">
</head>
<body class="q-hub">
  <header class="q-top q-wrap">${readFileSync(join(A, 'logo-light.svg'), 'utf8').replace('<svg ', '<svg class="q-hub__logo" aria-hidden="true" ')}</header>
  <main class="q-wrap">
    <h1 class="q-hub__title">Квизы подбора <span class="q-mute">под рекламу</span></h1>
    <ul class="q-hub__grid">
      ${MODELS.map((m) => {
        const s = sceneFor(m.slug);
        return `<li><a class="q-hub__card" href="${m.slug}/">
        <img src="${s ? `assets/img/renders/${s.file}-800.webp` : `assets/img/${m.slug}.webp`}" alt="" width="640" height="480" loading="lazy">
        <span class="q-hub__name">${esc(m.name)}</span>
        <span class="q-hub__meta">${m.steps.length} вопроса · ${m.countries.map((c) => COUNTRY[c].name).join(' и ')}</span>
      </a></li>`;
      }).join('')}
    </ul>
  </main>
</body>
</html>
`;
}

for (const m of MODELS) {
  mkdirSync(join(HERE, m.slug), { recursive: true });
  writeFileSync(join(HERE, m.slug, 'index.html'), page(m));
}
writeFileSync(join(HERE, 'index.html'), hub());
console.log(`Квизов: ${MODELS.length} → ${MODELS.map((m) => m.slug).join(', ')}. Фото из генерации: ${SCENES.length}`);
