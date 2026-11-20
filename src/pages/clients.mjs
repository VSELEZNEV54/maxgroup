import { html, esc, typo, readText, frontMatter, markdown } from '../lib/core.mjs';
import { articleLd, itemListLd } from '../lib/seo.mjs';
import { duo, faqList, more, pageHead, sectionHead } from '../components/ui.mjs';
import { R } from '../routes.mjs';
import { postCard } from './home.mjs';
import { articleSidebar } from './blog.mjs';

const home = { name: 'Главная', url: R.home };
const clients = { name: 'Информация для клиентов', url: R.clients };

export function clientPages(ctx) {
  const { data, body } = frontMatter(readText('content/clients/posle-oplaty.md'));
  const payment = { ...data, url: R.afterPayment };
  const guides = [
    {
      title: 'Как заказать автомобиль', url: R.howTo, category: 'Покупка',
      description: 'Как согласовать бюджет, проверить машину и пройти путь от заявки до получения ключей.',
      cover: 'assets/img/hero/gclass-road.webp', coverAlt: 'Автомобиль на ночной трассе во Владивостоке',
    },
    {
      title: 'Как читать аукционный лист', url: R.auctionSheet, category: 'Проверка автомобиля',
      description: 'Где искать оценку, как расшифровать отметки на схеме кузова и что написано в комментариях инспектора.',
      cover: 'assets/img/cases/toyota-raize-z-2021.webp', coverAlt: 'Toyota Raize на площадке японского аукциона',
    },
    payment,
  ];
  const breadcrumbs = [home, clients];
  const paymentCrumbs = [...breadcrumbs, { name: payment.title, url: payment.url }];
  const lead = 'Как заказать машину, разобраться в аукционном листе и проследить за покупкой после оплаты. Выберите руководство для своего этапа.';
  return [
    {
      url: clients.url, type: 'guide', h1: clients.name, title: 'Информация для клиентов о заказе автомобиля | Макс Групп',
      description: lead, breadcrumbs, priority: 0.8,
      jsonld: [itemListLd(ctx.site, clients.name, guides.map((g) => ({ name: g.title, url: g.url })))],
      render: () => html`
        ${pageHead({ crumbs: breadcrumbs, h1: duo('Информация', 'для клиентов'), lead })}
        <section class="section section--sm section--flush-top" aria-label="Руководства для клиентов">
          <div class="container">
            <div class="grid grid--3">${guides.map((g, i) => postCard(g, { i, tag: 'h2' }))}</div>
          </div>
        </section>
        <section class="section section--white">
          <div class="container">
            ${sectionHead({ title: duo('Что спрашивают', 'покупатели'), actions: more('Все вопросы и ответы', R.faq), layout: 'stack' })}
            ${faqList(ctx.content.howTo.fears.slice(0, 4), { open: -1 })}
          </div>
        </section>`,
    },
    {
      url: payment.url, type: 'guide', h1: payment.title, title: payment.title + ' | Макс Групп',
      description: payment.description, breadcrumbs: paymentCrumbs, scripts: ['article'],
      ogType: 'article', ogImage: payment.cover, priority: 0.7,
      jsonld: [articleLd(ctx.site, { ...payment, image: payment.cover })],
      render: () => {
        const article = markdown(body);
        return html`<article data-article>
          ${pageHead({ crumbs: paymentCrumbs, h1: typo(esc(payment.title)), lead: payment.description })}
          <section class="section section--white article-body">
            <div class="container article-layout">
              ${articleSidebar(ctx.site.salesManager, { ...payment, toc: article.toc })}
              <div class="article-main">
                <div class="prose article-prose">${article.html}</div>
                <div class="u-mt-7">${more('Все руководства для клиентов', clients.url)}</div>
              </div>
            </div>
          </section>
        </article>`;
      },
    },
  ];
}
