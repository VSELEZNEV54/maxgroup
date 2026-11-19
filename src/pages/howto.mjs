// «Как заказать автомобиль» — подробный гид по процессу сделки.
import { html, esc, u, typo, img } from '../lib/core.mjs';
import { faqLd, articleLd } from '../lib/seo.mjs';
import { icon, label, duo, btn, more, reveal, sectionHead, pageHead, faqList, ctaBand, table, chips, linkBlock, route, caseCard, rail, railNav } from '../components/ui.mjs';
import { quizSection } from '../components/quiz.mjs';
import { R } from '../routes.mjs';

export function howToPages(ctx) {
  const c = ctx.content.howTo;
  if (!c) return [];
  const crumbsList = [{ name: 'Главная', url: R.home }, { name: 'Как заказать автомобиль', url: R.howTo }];
  const faq = [...c.fears, ...c.faq];
  // доставленные автомобили: сначала те, у которых известен город клиента; лента из 8 карточек (трех не хватало на ряд)
  const deliveredAll = ctx.cases.filter((x) => x.statusCode === 'delivered');
  const delivered = [...deliveredAll.filter((x) => x.clientCity), ...deliveredAll.filter((x) => !x.clientCity && x.price)].slice(0, 8);
  // статьи блога по теме: связываем гид с информационными материалами
  const reads = ['kak-kupit-avto-na-aukcione-yaponii', 'kak-kupit-avto-iz-korei', 'kak-privezti-avto-iz-kitaya', 'rastamozhka-avto-2026', 'sbkts-i-epts-chto-eto', 'dostavka-avto-iz-vladivostoka']
    .map((slug) => ctx.posts.find((x) => x.slug === slug))
    .filter(Boolean)
    .map((x) => ({ name: x.short || x.title.split(':')[0].trim(), url: x.url }));
  // дата изменения в разметке не может быть раньше даты публикации
  const published = '2026-10-13';
  const modified = ctx.build.date > published ? ctx.build.date : published;
  return [
    {
      url: R.howTo,
      type: 'guide',
      title: 'Как заказать авто из Японии, Кореи или Китая: 6 шагов | Макс Групп',
      description: 'Как заказать автомобиль из Японии, Кореи или Китая: подбор, договор, проверка, оплата, доставка, таможня и документы. Что вы получаете на каждом шаге.',
      h1: 'Как заказать автомобиль из Японии, Кореи или Китая',
      breadcrumbs: crumbsList,
      headerOver: true,
      scripts: ['quiz'],
      priority: 0.8,
      ogImage: 'img/hero/gclass-road.webp',
      jsonld: [faqLd(faq), articleLd(ctx.site, { title: 'Как заказать автомобиль из Японии, Кореи или Китая', description: c.lead, url: R.howTo, image: 'assets/img/hero/gclass-road.webp', published, modified })],
      render: () => html`
    ${pageHead({
      crumbs: crumbsList,
      label: 'Гид покупателя',
      h1: duo('Как заказать автомобиль', 'из Японии, Кореи или Китая'),
      lead: c.lead,
      photo: 'assets/img/hero/gclass-road.webp',
      photoAlt: 'Автомобиль на ночной трассе во Владивостоке',
      kv: [
        { k: 'Этапов', v: '6' },
        { k: 'До Владивостока', v: 'обычно 3-6 недель' },
        { k: 'Оплата', v: 'по договору' },
      ],
      actions: btn('Начать с расчета', R.calculator, { variant: 'light' }) + btn('Задать вопрос', R.contacts, { variant: 'ghost', modal: 'request', subject: 'Вопрос: как заказать автомобиль' }),
    })}

    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Процесс', title: duo('Шесть шагов', 'от заявки до ключей'), lead: `Что происходит с автомобилем и что вы получаете на каждом шаге. ${c.stepsNote || 'Схема типовая: порядок, размер и сроки платежей закрепляются в договоре.'}` })}
        <ol class="flow">
          ${c.steps.map(
            (s, i) => html`
          <li class="flow__item"${reveal(Math.min(i, 3))}>
            <div class="flow__num"><span class="mono">Шаг</span><b>${String(i + 1).padStart(2, '0')}</b></div>
            <div class="flow__main">
              <h3 class="flow__title">${typo(s.title)}</h3>
              <p>${typo(s.text)}</p>
            </div>
            <ul class="flow__result">
              ${s.result.map((r) => `<li>${icon('check')}<span>${typo(r)}</span></li>`)}
            </ul>
            ${s.meta?.length ? `<dl class="flow__meta">${s.meta.map((m) => `<div><dt>${esc(m.k)}</dt><dd>${typo(esc(m.v))}</dd></div>`).join('')}</dl>` : ''}
          </li>`
          )}
        </ol>
      </div>
    </section>

    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Сроки', title: duo('Сколько идет автомобиль', 'из каждой страны'), lead: 'Ориентиры на октябрь 2026 года: срок до Владивостока и время на таможню и документы. Точный срок зависит от расписания судов, загрузки портов и таможни.' })}
        ${table(
          ['Страна', 'До Владивостока', 'Оформление'],
          [
            [`<a href="${u(R.country('japan'))}"><strong>Япония</strong></a><br><span class="muted small">Аукционы</span>`, 'По отзывам клиентов 2-3 недели после покупки на аукционе; рыночный ориентир: 4-6 недель', '7-14 дней'],
            [`<a href="${u(R.country('korea'))}"><strong>Корея</strong></a><br><span class="muted small">Площадки объявлений и дилеры</span>`, 'Обычно 3-4 недели', '7-14 дней'],
            [`<a href="${u(R.country('china'))}"><strong>Китай</strong></a><br><span class="muted small">Дилеры и площадки авто с пробегом</span>`, '3-4 недели до Уссурийска', 'Около недели'],
          ]
        )}
        <div class="u-mt-7">${more('Сроки и стоимость доставки по городам России', R.delivery)}</div>
      </div>
    </section>

    <section class="section section--dark">
      <div class="container">
        ${sectionHead({ label: 'Документы', title: duo('Что вы получаете', 'на руки'), lead: 'Комплект, с которым автомобиль ставится на учет в любом регионе России.' })}
        <div class="grid grid--3">
          ${c.docs.map((d, i) => html`
          <article class="card card--tall"${reveal(i % 3)}>
            <span class="label label--plain">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="card__title" style="margin-top:auto">${typo(d.title)}</h3>
            <p class="card__text">${typo(d.text)}</p>
          </article>`)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Сомнения')}
            <h2>${duo('О чем переживают', 'перед первой покупкой')}</h2>
            <p class="lead">${typo('Заказывать автомобиль дистанционно непривычно. Отвечаем на частые вопросы тех, кто делает это впервые.')}</p>
            ${more('Отзывы клиентов', R.reviews)}
          </div>
          <div class="split__body">${faqList(c.fears)}</div>
        </div>
      </div>
    </section>

    ${delivered.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Как это было', title: duo('Автомобили, которые', 'уже уехали к владельцам'), lead: 'Реальные сделки: страна покупки, цена и город клиента, если он известен.', aside: railNav(), actions: more('Все привезенные авто', R.cases) })}
        ${rail(delivered.map((x, i) => caseCard(x, { i, stack: true })), { col: 'minmax(300px, 23.6%)', colMobile: 'minmax(260px, 78%)' })}
      </div>
    </section>`
      : ''}

    ${quizSection(ctx, { subject: 'Квиз подбора (как заказать)' })}

    <section class="section section--white">
      <div class="container">
        <div class="split">
          <div class="split__sticky"${reveal()}>
            ${label('Вопросы и ответы')}
            <h2>${duo('Коротко', 'о главном')}</h2>
            ${more('Все вопросы', R.faq)}
          </div>
          <div class="split__body">${faqList(c.faq)}</div>
        </div>
        <div class="u-mt-8">
          ${linkBlock('Полезно знать', reads)}
          ${linkBlock('С чего начать', [
            { name: 'Калькулятор стоимости', url: R.calculator },
            { name: 'Авто из Японии', url: R.country('japan') },
            { name: 'Авто из Кореи', url: R.country('korea') },
            { name: 'Авто из Китая', url: R.country('china') },
            { name: 'Подборки', url: R.selections },
            { name: 'Как читать аукционный лист', url: R.auctionSheet },
            { name: 'Услуги', url: R.services },
          ])}
        </div>
      </div>
    </section>

    ${ctaBand(ctx, { subject: 'Заявка: как заказать автомобиль', title: duo('Начнем с расчета', 'под ваш бюджет') })}`,
    },
  ];
}
