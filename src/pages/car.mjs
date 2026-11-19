// Карточка автомобиля.
import { html, esc, u, a, img, price, priceShort, km, num, liters, typo, count, clip, dateRu, fit } from '../lib/core.mjs';
import { carLd } from '../lib/seo.mjs';
import { icon, label, duo, btn, more, reveal, sectionHead, crumbs, carCard, ctaBand, specList, ticks, step, note, countryGen } from '../components/ui.mjs';
import { steps } from '../data/texts.mjs';
import { popularModelCard, salesManagerCard } from '../components/catalog.mjs';
import { R } from '../routes.mjs';
import { selectControl } from '../components/select.mjs';

const HOME = { name: 'Главная', url: R.home };
const CATALOG = { name: 'Каталог', url: R.catalog };
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** Строчной делаем только первую букву: «Цена в Корее» → «цена в Корее» */
const lcFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const BRAND = ' | Макс Групп';
/** <title>: суффикс бренда — только если с ним заголовок не длиннее 65 знаков; без суффикса — до 70 */
function fitTitle(...variants) {
  for (const v of variants) {
    if ((v + BRAND).length <= 65) return v + BRAND;
    if (v.length <= 70) return v;
  }
  return variants[variants.length - 1];
}
const CUR = { JPY: '¥', KRW: '₩', CNY: 'юаней', USD: '$' };

function similar(ctx, car) {
  const score = (c) => {
    if (c.id === car.id) return -1;
    let s = 0;
    if (c.modelSlug === car.modelSlug && c.brandSlug === car.brandSlug) s += 8;
    else if (c.brandSlug === car.brandSlug) s += 3;
    if (c.body && c.body === car.body) s += 3;
    if (c.country === car.country) s += 1;
    if (car.priceRub && c.priceRub) s += Math.max(0, 3 - Math.abs(c.priceRub - car.priceRub) / (car.priceRub * 0.15));
    return s;
  };
  return ctx.cars.map((c) => ({ c, s: score(c) })).filter((x) => x.s > 2).sort((x, y) => y.s - x.s).slice(0, 4).map((x) => x.c);
}

function carPage(ctx, car) {
  const { site } = ctx;
  const cn = ctx.countryBySlug[car.country];
  const brand = ctx.brands.find((b) => b.slug === car.brandSlug && b.country === car.country);
  const model = ctx.models.find((m) => m.slug === car.modelSlug && m.brandSlug === car.brandSlug && m.country === car.country);
  const eng = car.engine || {};
  const crumbsList = [HOME, CATALOG, { name: `Авто ${cn.from}`, url: R.country(cn.slug) }, { name: car.brand, url: brand.url }, { name: car.model, url: model.url }, { name: `${car.model} ${car.year || ''}`.trim(), url: car.url }];
  const specsShort = [liters(eng.volumeCc), eng.type, eng.powerHp ? `${eng.powerHp} л.с.` : null, car.drive ? `${car.drive} привод` : null].filter(Boolean).join(', ');
  const h1 = `${car.titleFull}${car.year ? `, ${car.year}` : ''}`;
  const plain = (x) => String(x).replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ');
  const from = car.priceIsPartial ? 'от ' : '';
  const engShort = [liters(eng.volumeCc), eng.type].filter(Boolean).join(' ');
  // цена без утилизационного сбора — не «под ключ»: в title она идет с пометкой «без утильсбора»
  const titles = car.priceIsPartial
    ? [`${car.titleFull} ${car.year || ''} ${cn.from} от ${price(car.priceRub)} без утильсбора`, `${car.titleYear} ${cn.from} от ${price(car.priceRub)} без утильсбора`, `${car.titleYear} от ${price(car.priceRub)} без утильсбора`]
    : [`${car.titleFull} ${car.year || ''}, ${engShort} за ${price(car.priceRub)} ${cn.from}`, `${car.titleYear}, ${engShort} за ${price(car.priceRub)} ${cn.from}`, `${car.titleYear} за ${price(car.priceRub)} ${cn.from}`];
  const title = fitTitle(...titles.map((t) => plain(t).replace(/ ,/g, ',')));
  const descParts = [car.mileageKm || car.mileageKm === 0 ? `пробег ${num(car.mileageKm)} км` : null, specsShort, car.color ? `цвет ${car.color}` : null, car.auctionGrade ? `оценка ${car.auctionGrade}` : null].filter(Boolean);
  // описание — до 165 знаков: если не помещается, убираем с конца оценку и цвет
  const desc = fit(165, ...[descParts.length, descParts.length - 1, descParts.length - 2].filter((n) => n > 0).map((n) => plain(`${car.titleYear} ${cn.from} под заказ: ${descParts.slice(0, n).join(', ')}. Цена ${from}${price(car.priceRub)} ${car.priceLabel}.`)));
  car.metaDescription = desc;
  const waText = encodeURIComponent(`Здравствуйте! Интересует ${car.titleYear} за ${num(car.priceRub).replace(/ /g, ' ')} ₽ (${site.url}${car.url})`);
  const wa = site.socials.whatsapp ? `${site.socials.whatsapp.url}?text=${waText}` : null;
  const passing = car.isPassing;
  const fee = car.priceBreakdown.find((r) => r.key === 'recycling_fee');
  // «Льготный утильсбор» — только если льгота не вызывает сомнений; иначе — нейтральная врезка под расчетом (data/car-flags.json)
  const lowFee = fee ? fee.rub <= 5200 && !car.powerDoubt : false;
  const feeDoubt = car.powerDoubt && fee ? `В расчете каталога утильсбор ${price(fee.rub)}. Мощность подтверждаем по документам до покупки: от нее зависит итог.` : '';
  // параметры для калькулятора: страна, цена в валюте страны, год, двигатель, тип кузова для тарифа автовоза.
  // Тип силовой установки: электромобиль; последовательный гибрид (в расчете заказчика — тариф электромобиля) — series
  // с мощностью электромоторов в ehp; остальные гибриды — parallel с мощностью ДВС в hp.
  const FUEL = car.isElectric ? 'ev' : car.isSeriesHybrid || (car.isHybrid && car.isEvTariff) ? 'series' : car.isHybrid ? 'parallel' : /мягкий гибрид/i.test(eng.subtype || '') ? 'mild' : 'ice';
  const calcQuery = [
    ['country', car.country],
    ['price', car.priceInCountry?.amount],
    ['year', car.year],
    ['month', car.month],
    ['fuel', FUEL !== 'ice' ? FUEL : null],
    ['cc', FUEL === 'ev' ? null : eng.volumeCc],
    // мощность неизвестна — передаем 0: калькулятор попросит ее указать и не подставит мощность своего примера
    [FUEL === 'ev' || FUEL === 'series' ? 'ehp' : 'hp', eng.powerHp || 0],
    ['body', car.truckClass !== 'sedan' ? car.truckClass : null],
    ['ref', 'car'],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&amp;');
  const calculatorUrl = R.calculator + '?' + calcQuery;
  const tags = [
    passing ? '<span class="badge badge--accent">Проходной: 3-5 лет</span>' : '',
    lowFee ? '<span class="badge badge--ok">Льготный утильсбор</span>' : '',
    car.mileageKm === 0 ? '<span class="badge">Новый</span>' : '',
    car.auctionGrade ? `<span class="badge badge--line">Аукционная оценка ${esc(car.auctionGrade)}</span>` : '',
    `<span class="badge badge--line">${esc(cap(cn.steering))}</span>`,
  ].filter(Boolean);
  const rows = [
    ['Марка и модель', `<a class="link" href="${u(model.url)}">${esc(car.brand)} ${esc(car.model)}</a>`],
    ['Год выпуска', car.year ? `${car.year}${car.month ? `, ${String(car.month).padStart(2, '0')} мес.` : ''}` : null],
    ['Пробег', car.mileageKm || car.mileageKm === 0 ? km(car.mileageKm) : null],
    ['Двигатель', [liters(eng.volumeCc), eng.type].filter(Boolean).join(', ') || null],
    ['Объем', eng.volumeCc ? `${num(eng.volumeCc)} см³` : null],
    ['Мощность', eng.powerHp ? `${eng.powerHp} л.с.` : eng.powerHpSource ? `${eng.powerHpSource} л.с. (по данным источника, уточняем по документам)` : null],
    ['Коробка передач', cap(car.transmission)],
    ['Привод', cap(car.drive)],
    ['Кузов', cap(car.body)],
    ['Цвет', cap(car.color)],
    ['Руль', cap(car.steering || cn.steering.split(' ')[0])],
    ['Комплектация', car.trim],
    ['Поколение / кузов', car.generation],
    ['Мест', car.seats],
    ['Аукционная оценка', car.auctionGrade],
    ['Дата торгов', car.auction?.date ? dateRu(car.auction.date) : null],
    ['Страна покупки', `<a class="link" href="${u(R.country(cn.slug))}">${esc(cn.name)}</a>${car.city ? `, ${esc(car.city)}` : ''}`],
  ];
  const photos = car.photos;
  const sim = similar(ctx, car);
  const destinations = ctx.cities.filter((city) => Number.isFinite(city.truck?.[car.truckClass]));
  const cities = destinations.slice(0, 8);
  const telegram = site.socials.telegramManager || site.socials.telegram;
  const subject = `Заявка на ${car.titleYear} (${car.id})`;
  const cta = (text, size) => btn(text, R.contacts, {
    modal: 'request', subject, size, block: !size,
    attrs: {
      'data-modal-title': 'Заявка на ' + car.titleYear,
      'data-modal-text': 'Оставьте контакты. Менеджер проверит автомобиль и пришлет расчет до вашего города.',
      'data-modal-car': [car.titleFull, car.year].filter(Boolean).join(', '),
      'data-modal-label': 'Автомобиль из каталога',
    },
  });
  return {
    url: car.url,
    type: 'car',
    title,
    description: desc,
    h1,
    breadcrumbs: crumbsList,
    bodyClass: 'has-buybar',
    scripts: ['car-delivery'],
    ogType: 'product',
    ogImage: photos[0] ? photos[0].replace(/^assets\//, '') : undefined,
    priority: 0.6,
    images: photos.slice(0, 6),
    jsonld: [carLd(site, car)],
    render: () => html`
    <section class="page-head" style="padding-bottom:0">
      <div class="container">${crumbs(crumbsList)}</div>
    </section>
    <section class="section section--sm" style="padding-top:clamp(16px,2vw,28px)">
      <div class="container">
        <div class="carpage">
          <div class="gallery" data-gallery>
            ${photos[0]
              ? html`<a class="gallery__main" href="${a(photos[0])}" data-gallery-item data-alt="${esc(car.titleYear)}, фото 1">
              ${img({ src: photos[0], alt: `${car.titleYear} ${cn.from}, фото 1`, priority: true, sizes: '(max-width: 1000px) 100vw, 58vw' })}
              <span class="gallery__zoom">${icon('camera')} ${count(photos.length, ['фото', 'фото', 'фото'])}</span>
            </a>`
              : ''}
            ${photos.length > 1
              ? html`<div class="gallery__thumbs" style="--thumbs:${Math.max(3, Math.min(5, photos.length - 1))}">
              ${photos.slice(1, 6).map((p, i) => `<a class="gallery__thumb" href="${a(p)}" data-gallery-item data-alt="${esc(car.titleYear)}, фото ${i + 2}">${img({ src: p, alt: `${car.titleYear}, фото ${i + 2}`, sizes: '(max-width: 1000px) 25vw, 12vw' })}${i === 4 && photos.length > 6 ? `<span>+${photos.length - 6}</span>` : ''}</a>`)}
              ${photos.slice(6).map((p, i) => `<a href="${a(p)}" data-gallery-item data-alt="${esc(car.titleYear)}, фото ${i + 7}" hidden></a>`)}
            </div>`
              : ''}
          </div>

          <aside class="buybox">
            <div class="buybox__card">
              <h1 class="buybox__title">${esc(car.titleFull)}<span class="sr-only">, </span><small>${[car.year, car.mileageKm || car.mileageKm === 0 ? km(car.mileageKm) : null, specsShort].filter(Boolean).join(' · ')}</small></h1>
              <div class="buybox__tags">${tags}</div>
              <div class="buybox__price">
                <div class="buybox__price-value">${car.priceIsPartial ? '<small>от</small> ' : ''}${price(car.priceRub)}</div>
                <p class="buybox__price-note">${esc(car.priceLabelFull)}${car.priceInCountry?.amount ? ` · ${esc(lcFirst(car.priceInCountry.label))}: ${num(car.priceInCountry.amount)} ${esc(CUR[car.priceInCountry.currency] || car.priceInCountry.currency)}` : ''}</p>
                ${car.priceBreakdown?.length
                  ? html`<details class="breakdown-box" open>
                  <summary>Из чего складывается цена ${icon('chevron')}</summary>
                  <dl class="breakdown">
                    ${car.priceBreakdown.map((r) => `<div><dt>${esc(r.name)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</dt><dd>${price(r.rub)}</dd></div>`)}
                    ${car.priceIsPartial ? '<div><dt>Утилизационный сбор<small>зависит от мощности, рассчитаем по документам автомобиля</small></dt><dd>уточняется</dd></div>' : ''}
                    <div class="is-total"><dt>${car.priceIsPartial ? 'Итого без утильсбора' : 'Итого во Владивостоке'}</dt><dd>${price(car.priceRub)}</dd></div>
                  </dl>
                </details>`
                  : ''}
                ${feeDoubt ? `<div class="buybox__flag">${note(typo(feeDoubt))}</div>` : ''}
                ${car.priceNotice ? `<p class="breakdown__note">${typo(esc(car.priceNotice))}</p>` : ''}
                <p class="breakdown__note">${car.priceIsPartial ? 'Утилизационный сбор для этого автомобиля считается по мощности из документов. Менеджер пришлет точную сумму. ' : ''}Расчет предварительный: итог зависит от курса валют на день оплаты и результата торгов. Доставка в ваш город считается отдельно.</p>
              </div>
              <div class="buybox__actions">
                ${cta('Заказать такой автомобиль')}
                ${btn('Рассчитать стоимость', calculatorUrl, { variant: 'ghost', block: true, modal: 'car-delivery' })}
                <div class="buybox__socials">
                  ${wa ? btn('WhatsApp', wa, { variant: 'wa', iconName: 'whatsapp', attrs: { target: '_blank', rel: 'noopener' } }) : ''}
                  ${telegram ? btn('Telegram', telegram.url, { variant: 'tg', iconName: 'telegram', attrs: { target: '_blank', rel: 'noopener', 'aria-label': telegram.name } }) : ''}
                  ${site.socials.max ? btn('MAX', site.socials.max.url, { variant: 'ghost', iconName: 'max', attrs: { target: '_blank', rel: 'noopener' } }) : ''}
                </div>
              </div>
            </div>
            ${salesManagerCard(site)}
          </aside>
        </div>
      </div>
    </section>

    <section class="section section--white">
      <div class="container">
        <div class="split split--even">
          <div${reveal()} data-gallery>
            ${label('Характеристики')}
            <h2 class="u-mt-5">${duo(`${car.brand} ${car.model} ${car.year || ''}`.trim(), 'в деталях')}</h2>
            <p class="lead u-mt-5">${typo(`${car.titleYear} ${cn.from}${car.mileageKm ? ` с пробегом ${num(car.mileageKm)} км` : ''}. Перед покупкой проверяем состояние и документы и согласуем ${car.country === 'japan' ? 'ставку' : 'цену покупки'} с вами.`)}</p>
            ${car.options?.length ? `<h3 class="h4" style="margin:32px 0 14px">Комплектация и опции</h3><ul class="options">${car.options.slice(0, 28).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
            ${car.auctionSheet
              ? html`<h3 class="h4" style="margin:32px 0 14px">Аукционный лист</h3>
            <a class="sheet" href="${a(car.auctionSheet)}" data-gallery-item data-alt="Аукционный лист: ${esc(car.titleYear)}">
              ${img({ src: car.auctionSheet, alt: `Аукционный лист ${car.titleYear}${car.auctionGrade ? `, оценка ${car.auctionGrade}` : ''}`, sizes: '(max-width: 900px) 100vw, 40vw' })}
              <span class="sheet__cap">${icon('search')} Открыть лист${car.auctionGrade ? ` · оценка ${esc(car.auctionGrade)}` : ''}</span>
            </a>
            <p class="small muted u-mt-4">Не знаете, что означают отметки? <a class="link" href="${u(R.auctionSheet)}">Как читать аукционный лист</a></p>`
              : ''}
            <div class="u-mt-6">${ticks([
              car.country === 'japan' ? 'Переведем аукционный лист и объясним каждую отметку' : 'Проверим историю, страховые случаи и состояние по отчету площадки',
              car.country === 'japan' ? 'Согласуем предельную ставку до торгов' : 'Согласуем цену покупки до сделки',
              'Оформим таможню, СБКТС и ЭПТС, чтобы автомобиль был готов к постановке на учет',
            ])}</div>
          </div>
          <div${reveal(1)}>
            ${specList(rows)}
            ${car.modelInTop30 ? model.popularProfiles?.map((entry) => popularModelCard(entry, { embedded: true })) : ''}
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Как купить', title: duo('Как заказать этот автомобиль', 'или похожий'), lead: 'Лоты на аукционах и площадках уходят быстро. Если этот автомобиль уже продан, подберем такой же по году, пробегу и комплектации.' })}
        <div class="grid grid--3">${steps.slice(0, 6).map((s, i) => step(s, i, { light: true }))}</div>
      </div>
    </section>

    ${cities.length
      ? html`
    <section class="section section--white">
      <div class="container">
        ${sectionHead({ label: 'Доставка', title: duo(`${car.brand} ${car.model}`, 'с доставкой в ваш город'), lead: `Ориентировочная стоимость и срок перевозки автовозом из Владивостока. Итог: цена автомобиля плюс доставка.${car.priceIsPartial ? ' Утилизационный сбор в итог не входит.' : ''}`, actions: more('Все города', R.delivery) })}
        <div class="table-wrap">
          <table class="table table--delivery">
            <thead><tr><th>Город</th><th class="num u-hide-mobile">Срок</th><th class="num">Доставка</th><th class="num">${car.priceIsPartial ? 'Итого без утильсбора' : 'Итого'}</th></tr></thead>
            <tbody>${cities.map((c) => `<tr><td><a href="${u(c.url)}"><strong>${esc(c.name)}</strong></a></td><td class="num u-hide-mobile">${esc(c.daysLabel || 'по запросу')}</td><td class="num">от ${price(c.truck[car.truckClass])}</td><td class="num">от ${price(car.priceRub + c.truck[car.truckClass])}</td></tr>`)}</tbody>
          </table>
        </div>
      </div>
    </section>`
      : ''}

    ${sim.length
      ? html`
    <section class="section">
      <div class="container">
        ${sectionHead({ label: 'Похожие автомобили', title: duo('Посмотрите', 'еще варианты'), actions: more(`Все ${car.brand} ${car.model} ${cn.from}`, model.url) + more(`Все ${car.brand}`, brand.url, 'u-hide-mobile') })}
        <div class="grid grid--4${sim.length > 1 ? ' cars-grid--duo' : ''}">${sim.map((c, i) => carCard(c, { i }))}</div>
      </div>
    </section>`
      : ''}

    ${ctaBand(ctx, { subject, title: duo(`Нужен ${car.brand} ${car.model}?`, 'Подберем и привезем'), car: car.titleYear, text: `Проверим актуальность этого лота, пришлем аукционный лист или отчет о состоянии и точный расчет под ключ. Если автомобиль уже продан, найдем такой же.` })}

    <dialog class="modal" id="modal-car-delivery" aria-labelledby="car-delivery-title">
      <div class="modal__box car-delivery">
        <button class="modal__close" type="button" aria-label="Закрыть" data-modal-close>${icon('close')}</button>
        <h2 class="modal__title" id="car-delivery-title">Стоимость с доставкой</h2>
        <p class="lead">${esc(car.titleFull)}${car.year ? ', ' + car.year : ''}</p>
        ${selectControl({ id: 'car-delivery-city', label: 'Город доставки', search: true, attributes: { 'data-delivery-city': true },
          options: html`<option value="vladivostok" data-fee="${price(0)}" data-total="${price(car.priceRub)}">Владивосток (самовывоз)</option>
            ${destinations.map((city) => `<option value="${esc(city.slug)}" data-fee="${price(city.truck[car.truckClass])}" data-total="${price(car.priceRub + city.truck[car.truckClass])}">${esc(city.name)}</option>`)}` })}
        <dl class="breakdown" aria-live="polite" aria-atomic="true">
          <div><dt>Цена во Владивостоке</dt><dd>${price(car.priceRub)}</dd></div>
          <div><dt>Доставка автовозом</dt><dd data-delivery-fee>${price(0)}</dd></div>
          <div class="is-total"><dt>${car.priceIsPartial ? 'Итого без утильсбора' : 'Итого'}</dt><dd data-delivery-total>${price(car.priceRub)}</dd></div>
        </dl>
        <p class="small muted">Расчет предварительный.${car.priceIsPartial ? ' Утилизационный сбор рассчитаем по документам автомобиля.' : ''}</p>
        <a class="more" data-delivery-details href="${u(calculatorUrl)}">Подробный калькулятор</a>
      </div>
    </dialog>

    <div class="buybar">
      <div class="buybar__price">${from}${price(car.priceRub)}<small>${esc(car.priceLabel)}</small></div>
      ${cta('Оставить заявку', 'sm')}
    </div>`,
  };
}

export function carPages(ctx) {
  return ctx.cars.map((car) => carPage(ctx, car));
}
