import { html, esc, u, img, typo, slugify } from '../lib/core.mjs';
import { serviceLd, faqLd } from '../lib/seo.mjs';
import { R } from '../routes.mjs';
import { duo, faqList, linkBlock, more, specList } from '../components/ui.mjs';
import { catalogLandingHead, profilePrice, profilePriceLabel } from '../components/catalog.mjs';
import { freshUntil, offerList } from '../components/model-offers.mjs';
import { quizSection } from '../components/quiz.mjs';
import { filtersBar, resultsHead, includeModelProfiles } from '../components/catalog-filters.mjs';
import { modelParts } from '../data/model-offers.mjs';

const howToBuy = {
  japan: 'По японскому автомобилю запросим аукционный лист или отчет продавца. Сверим обозначение кузова, оценку, пробег и замечания по салону и кузову. По этим данным можно решить, какие недостатки допустимы и какую максимальную ставку согласовать.',
  china: 'Уточним у китайского продавца дату выпуска и местное название комплектации. Сверим двигатель, коробку передач, заявленный пробег и фотографии кузова. Если для вас важны конкретные опции, внесем их в условия подбора и проверим перед покупкой.',
  korea: 'По корейскому автомобилю запросим фотографии и доступные сведения об эксплуатации и ремонтах. Уточним дату регистрации, вид топлива и комплектацию. Если модель представлена под несколькими названиями, сверим данные объявления и документы выбранной машины.',
};

function stockSection(ctx, entry, country, inCatalog = false) {
  const snapshot = entry.offers;
  const expires = snapshot ? freshUntil(snapshot.checkedAt) : '';
  const cars = Date.parse(expires) > Date.now() ? snapshot.cars : [];
  const { brand, model } = modelParts(entry.name);
  const brandSlug = slugify(brand.replace(' (Samsung)', ''));
  const brands = ctx.brandsOf(entry.country).map((b) => ({ value: b.slug, name: b.name, url: b.url }));
  const brandPage = brands.find((b) => b.value === brandSlug);
  if (!brandPage) brands.push({ value: brandSlug, name: brand });
  const scope = {
    brand: brandSlug, model: slugify(model), profile: entry.url,
    brands, countryUrl: R.country(entry.country), brandUrl: brandPage?.url || R.topModels(entry.country),
    models: ctx.popularModels.filter((p) => p.country === entry.country && p.brand === entry.brand).map((p) => {
      const name = modelParts(p.name).model;
      return { value: slugify(name), name, url: inCatalog ? p.pricesUrl : p.url };
    }),
  };
  return html`<section id="avtomobili" class="section section--sm catalog-listing ${inCatalog ? 'section--flush-top' : 'section--white'}"><div class="container">
    <h2 class="sr-only">Автомобили для заказа</h2>
    <div data-catalog-list data-model-profile="${esc(entry.url)}">
      ${filtersBar(cars, { scope: includeModelProfiles(ctx, cars, entry.country, scope) })}
      ${resultsHead(cars.length)}
      <div data-model-offers="${u('/model-inventory/' + entry.key + '.json')}" data-model-photo="${u('/' + entry.photo.src)}" data-model-name="${esc(entry.name)}" data-checked="${esc(snapshot?.checkedAt)}" data-expires="${expires}">${offerList(entry, snapshot)}</div>
    </div>
  </div></section>
    ${quizSection(ctx, { profile: entry, subject: 'Подбор ' + entry.name + ' ' + country.from })}`;
}

function detailPage(ctx, entry, country, breadcrumbs, related) {
  const { name, url, photo } = entry;
  const intro = entry.intro.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || entry.intro;
  const detail = entry.intro.slice(intro.length).trim();
  const h1 = name + ' под заказ ' + country.from;
  const description = `${h1}. Модель входит в топ-30 по заказам Макс Групп. Комплектация, ориентир цены под ключ и предложения для заказа.`;
  const family = ctx.models.find((m) => m.url === entry.modelUrl);
  const existing = family?.url === url ? ctx.content.models?.[`${family.country}/${family.brandSlug}/${family.slug}`] : null;
  return {
    url, h1, type: 'model', title: h1 + ' | Макс Групп', description, breadcrumbs,
    priority: 0.7, headerOver: true, images: [photo.src], ogImage: photo.src, scripts: ['catalog', 'model-offers', 'quiz'],
    jsonld: [serviceLd(ctx.site, { name: h1, description, url }), faqLd(existing?.faq || [])].filter(Boolean),
    render: () => html`
      ${catalogLandingHead({ crumbs: breadcrumbs, country, photo: photo.src,
        h1: duo(esc(name), 'под заказ ' + country.from), lead: esc(intro),
        requestTitle: `Подберём ${name}`,
        actions: more('О комплектации', '#o-modeli') + more('Топ-30 по заказам', R.topModels(entry.country)),
      })}
      ${stockSection(ctx, entry, country)}
      <section class="section" id="o-modeli"><div class="container profile-info">
        <div><h2>${duo('О модели', esc(name))}</h2>
          <p class="lead">${typo(esc(name + ' входит в топ-30 автомобилей ' + country.from + ' по числу заказов Макс Групп.'))}</p>
          ${detail ? `<p>${typo(esc(detail))}</p>` : ''}
          <p>Ориентир под ключ относится к комплектации в таблице. В объявлениях можно сравнить реальные автомобили по году выпуска, оснащению и пробегу. Для окончательного расчета выберите машину и укажите город получения.</p>
          <figure class="profile-figure">${img({ src: photo.src, alt: name + ' ' + country.from, sizes: '(max-width: 540px) 100vw, (min-width: 841px) and (max-width: 1120px) 45vw, 512px' })}</figure>
        </div>
        <div class="profile-spec">${specList([['Страна заказа', esc(country.name)], ['Год выпуска', esc(entry.years)], ['Двигатель', esc(entry.engine || 'Уточняется по автомобилю')], ['Типовая комплектация', esc(entry.trim)], [profilePriceLabel(entry), profilePrice(entry)]])}</div>
      </div></section>
      <section class="section section--white"><div class="container profile-info">
        <div><h2>${duo('Как заказать', esc(name))}</h2>
          <p>${typo(howToBuy[entry.country])}</p>
          <p>Пришлите ссылку на объявление или укажите бюджет, допустимый пробег и нужное оснащение. До покупки менеджер уточнит наличие у продавца, согласует с вами состояние автомобиля и пришлет расчет в рублях.</p>
          ${more('Как проходит заказ', R.howTo)}
        </div>
        <div><h2 class="h3">Что входит в расчет под ключ</h2>
          <p>В расчете указываем стоимость машины, расходы в стране покупки, перевозку во Владивосток, таможенные платежи, утилизационный сбор, оформление документов и услуги компании. Доставку из Владивостока в ваш город считаем отдельно.</p>
          <p>Если в объявлении рассчитана только часть стоимости, это указано рядом с суммой. Для полного расчета потребуются дата выпуска, двигатель и мощность по документам автомобиля.</p>
          ${more('Калькулятор стоимости', R.calculator)}
        </div>
      </div></section>
      ${existing?.about || existing?.points?.length ? html`<section class="section"><div class="container profile-editorial"><h2>Обзор ${esc(name)}</h2>
        <div class="prose">${ctx.md(existing.about || '')}${existing.points?.map((p) => `<h3>${esc(p.title)}</h3><p>${typo(esc(p.text))}</p>`)}</div>
        ${existing.specs?.length ? specList(existing.specs.map(([k, v]) => [k, esc(v)])) : ''}
        ${existing.seo ? `<div class="prose">${ctx.md(existing.seo)}</div>` : ''}
      </div></section>` : ''}
      ${existing?.faq?.length ? `<section class="section section--white"><div class="container"><h2>Вопросы о ${esc(name)}</h2>${faqList(existing.faq)}</div></section>` : ''}
      <section class="section section--sm"><div class="container">
        ${family?.url === url && family.cars.length ? linkBlock('Разборы автомобилей этой модели', family.cars.map((c) => ({ name: c.titleYear, url: c.url })), { tag: 'h2' }) : ''}
        ${family && family.url !== url ? more('Другие комплектации ' + family.brand + ' ' + family.name, family.url) : ''}
        ${linkBlock('Другие модели ' + country.from, related, { tag: 'h2' })}
        ${more('Все 30 моделей ' + country.from, R.topModels(entry.country))}
      </div></section>`,
  };
}

function pricesPage(ctx, entry, country, parentCrumbs) {
  const h1 = entry.name + ' ' + country.from + ' — автомобили и цены';
  const breadcrumbs = [...parentCrumbs, { name: 'Автомобили и цены', url: entry.pricesUrl }];
  return {
    url: entry.pricesUrl, type: 'catalog', h1, breadcrumbs, noindex: true, canonical: entry.url,
    title: h1 + ' | Макс Групп', description: 'Предложения ' + entry.name + ' ' + country.from + ' с фотографиями, пробегом и расчетом стоимости.',
    headerOver: true, ogImage: entry.photo.src, scripts: ['catalog', 'model-offers', 'quiz'],
    render: () => html`${catalogLandingHead({ crumbs: breadcrumbs, country, photo: entry.photo.src,
      h1: duo(esc(entry.name) + ' ' + country.from, 'автомобили и цены'), requestTitle: `Подберём ${entry.name}`,
      lead: 'Сравните объявления по году выпуска, пробегу и стоимости.',
    })}${stockSection(ctx, entry, country, true)}`,
  };
}

export function popularModelPages(ctx) {
  return ctx.popularModels.flatMap((entry) => {
    const country = ctx.countryBySlug[entry.country];
    const breadcrumbs = [{ name: 'Главная', url: R.home }, { name: 'Авто ' + country.from, url: R.country(entry.country) },
      { name: 'Топ-30 по заказам', url: R.topModels(entry.country) }, { name: entry.name, url: entry.url }];
    const peers = ctx.popularModels.filter((p) => p.country === entry.country);
    const i = peers.indexOf(entry);
    const neighbors = [1, 2, 3].map((offset) => peers[(i + offset) % peers.length]);
    return [detailPage(ctx, entry, country, breadcrumbs, neighbors), pricesPage(ctx, entry, country, breadcrumbs)];
  });
}
