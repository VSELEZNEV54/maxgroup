// SEO: мета-теги, Open Graph, JSON-LD (schema.org).
import { esc, abs, a, clip, getMode, fileExists, imgSize } from './core.mjs';

const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/** Блок <head>: title, description, canonical, robots, OG, Twitter, JSON-LD */
export function headTags(site, page) {
  const title = page.title;
  const desc = clip(page.description || site.description, 200);
  const canonical = abs(site, page.canonical || page.url);
  // для превью в мессенджерах надёжнее JPG 1200×630: если для кадра есть копия в assets/img/og/<имя>.jpg — берём её
  let og = String(page.ogImage || site.ogImage).replace(/^\/?(assets\/)?/, '');
  const jpg = `img/og/${og.replace(/^img\//, '').replace(/[/]/g, '-').replace(/\.(webp|png)$/, '.jpg')}`;
  if (/\.(webp|png)$/.test(og) && fileExists('assets/' + jpg)) og = jpg;
  const ogImage = abs(site, '/assets/' + og);
  // размеры превью: мессенджеры и соцсети показывают картинку сразу, не дожидаясь её загрузки
  const ogSize = /\.(jpe?g|png)$/i.test(og) ? imgSize('assets/' + og) : null;
  const robots = page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const graph = [organizationLd(site), websiteLd(site), ...(page.breadcrumbs?.length ? [breadcrumbLd(site, page.breadcrumbs)] : []), ...(page.jsonld || [])].filter(Boolean);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    page.prev ? `<link rel="prev" href="${esc(abs(site, page.prev))}">` : '',
    page.next ? `<link rel="next" href="${esc(abs(site, page.next))}">` : '',
    `<meta property="og:type" content="${page.ogType || 'website'}">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:title" content="${esc(page.ogTitle || title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${esc(ogImage)}">`,
    ogSize ? `<meta property="og:image:width" content="${ogSize.w}">` : '',
    ogSize ? `<meta property="og:image:height" content="${ogSize.h}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(page.ogTitle || title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(ogImage)}">`,
    page.published ? `<meta property="article:published_time" content="${page.published}">` : '',
    page.modified ? `<meta property="article:modified_time" content="${page.modified}">` : '',
    ld({ '@context': 'https://schema.org', '@graph': graph }),
  ]
    .filter(Boolean)
    .join('\n    ');
}

const orgId = (site) => abs(site, '/#organization');

export function organizationLd(site) {
  const c = site.contacts;
  return {
    '@type': ['AutoDealer', 'Organization'],
    '@id': orgId(site),
    name: site.name,
    alternateName: site.altNames,
    legalName: site.legal?.name || undefined,
    url: abs(site, '/'),
    logo: abs(site, '/assets/img/brand/logo.svg'),
    image: abs(site, '/assets/' + site.ogImage),
    description: site.description,
    telephone: c.phones.map((p) => p.tel),
    email: c.email || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
      addressRegion: 'Приморский край',
      addressLocality: c.city,
      streetAddress: `${c.street}, ${c.office}`,
      postalCode: c.postalCode || undefined,
    },
    geo: c.geo ? { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lon } : undefined,
    openingHoursSpecification: c.hoursSpec?.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    areaServed: { '@type': 'Country', name: 'Россия' },
    priceRange: site.priceRange,
    // рейтинг в разметку Organization не ставим: «самооценочный» AggregateRating поисковики не учитывают и могут счесть спамом
    sameAs: [site.contacts.maps?.yandex, site.contacts.maps?.twoGis, ...Object.values(site.socials || {}).filter(Boolean).map((s) => s.url)].filter(Boolean),
    taxID: site.legal?.inn || undefined,
  };
}

export function websiteLd(site) {
  return {
    '@type': 'WebSite',
    '@id': abs(site, '/#website'),
    url: abs(site, '/'),
    name: site.name,
    inLanguage: 'ru-RU',
    publisher: { '@id': orgId(site) },
  };
}

export function breadcrumbLd(site, crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(site, c.url),
    })),
  };
}

export function faqLd(items) {
  if (!items?.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: String(f.a).replace(/<\/(p|li|div|h\d)>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() },
    })),
  };
}

export function itemListLd(site, name, items) {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(site, it.url),
      name: it.name,
    })),
  };
}

/** Карточка автомобиля: Car + Offer. Если цена неполная (без утильсбора), Offer не выводим — это не цена предложения. */
export function carLd(site, car) {
  return {
    '@type': ['Car', 'Product'],
    '@id': abs(site, car.url + '#car'),
    name: car.title,
    description: car.metaDescription,
    url: abs(site, car.url),
    image: (car.photos || []).slice(0, 6).map((p) => abs(site, '/' + p)),
    brand: { '@type': 'Brand', name: car.brand },
    manufacturer: { '@type': 'Organization', name: car.brand },
    model: car.model,
    vehicleModelDate: car.year ? String(car.year) : undefined,
    productionDate: car.year ? String(car.year) : undefined,
    bodyType: car.body || undefined,
    color: car.color || undefined,
    vehicleConfiguration: car.trim || undefined,
    vehicleTransmission: car.transmission || undefined,
    driveWheelConfiguration: car.drive || undefined,
    steeringPosition: car.steering === 'правый' ? 'https://schema.org/RightHandDriving' : car.steering === 'левый' ? 'https://schema.org/LeftHandDriving' : undefined,
    fuelType: car.engine?.type || undefined,
    mileageFromOdometer: car.mileageKm || car.mileageKm === 0 ? { '@type': 'QuantitativeValue', value: car.mileageKm, unitCode: 'KMT' } : undefined,
    vehicleEngine: car.engine
      ? {
          '@type': 'EngineSpecification',
          engineDisplacement: car.engine.volumeCc ? { '@type': 'QuantitativeValue', value: car.engine.volumeCc, unitCode: 'CMQ' } : undefined,
          enginePower: car.engine.powerHp ? { '@type': 'QuantitativeValue', value: car.engine.powerHp, unitText: 'л.с.' } : undefined,
          fuelType: car.engine.type || undefined,
        }
      : undefined,
    itemCondition: car.mileageKm === 0 ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    offers: car.priceRub && !car.priceIsPartial
      ? {
          '@type': 'Offer',
          url: abs(site, car.url),
          price: car.priceRub,
          priceCurrency: 'RUB',
          availability: 'https://schema.org/PreOrder',
          itemCondition: car.mileageKm === 0 ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
          seller: { '@id': orgId(site) },
          areaServed: { '@type': 'Country', name: 'Россия' },
        }
      : undefined,
  };
}

/**
 * Листинг модели: Product + AggregateOffer с вилкой цен.
 * В вилку идут только автомобили с полной ценой «под ключ»; если таких нет — разметку не выводим (вернётся null).
 */
export function aggregateOfferLd(site, { name, description, url, image, cars, brand }) {
  const prices = cars.filter((c) => !c.priceIsPartial).map((c) => c.priceRub).filter(Boolean);
  if (!prices.length) return null;
  return {
    '@type': 'Product',
    '@id': abs(site, url + '#offer'),
    name,
    description,
    url: abs(site, url),
    image: image ? abs(site, '/' + String(image).replace(/^\//, '')) : undefined,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'RUB',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability: 'https://schema.org/PreOrder',
      seller: { '@id': orgId(site) },
    },
  };
}

export function serviceLd(site, { name, description, url, serviceType, areaServed }) {
  return {
    '@type': 'Service',
    '@id': abs(site, url + '#service'),
    name,
    description,
    url: abs(site, url),
    serviceType: serviceType || name,
    provider: { '@id': orgId(site) },
    areaServed: areaServed ? { '@type': 'City', name: areaServed } : { '@type': 'Country', name: 'Россия' },
  };
}

export function articleLd(site, { title, description, url, image, published, modified, author }) {
  return {
    '@type': 'Article',
    '@id': abs(site, url + '#article'),
    headline: title,
    description,
    image: image ? [abs(site, '/' + String(image).replace(/^\//, ''))] : undefined,
    datePublished: published,
    dateModified: modified || published,
    inLanguage: 'ru-RU',
    mainEntityOfPage: abs(site, url),
    // автор-организация («Редакция Макс Групп») — ссылка на Organization; Person — только для реального человека
    author: author && author.type !== 'Organization' && !/редакци/i.test(author.name || '') ? { '@type': 'Person', name: author.name, jobTitle: author.role, worksFor: { '@id': orgId(site) } } : { '@id': orgId(site) },
    publisher: { '@id': orgId(site) },
  };
}

export function reviewsLd(site, reviews) {
  return reviews.map((r) => ({
    '@type': 'Review',
    itemReviewed: { '@id': orgId(site) },
    author: { '@type': 'Person', name: r.author },
    reviewRating: { '@type': 'Rating', ratingValue: r.rating || 5, bestRating: 5, worstRating: 1 },
    reviewBody: r.text,
    publisher: r.source ? { '@type': 'Organization', name: r.source } : undefined,
  }));
}

export function videoLd(site, { name, description, thumbnail, contentUrl, uploadDate, duration }) {
  return {
    '@type': 'VideoObject',
    name,
    description,
    thumbnailUrl: abs(site, '/' + String(thumbnail).replace(/^\//, '')),
    contentUrl: contentUrl ? abs(site, contentUrl) : undefined,
    uploadDate,
    duration,
    publisher: { '@id': orgId(site) },
  };
}

/** HowTo снят и в Google (2023), и не поддерживается Яндексом — разметку не выводим; шаги оформляются обычным списком. */
export function howToLd() {
  return null;
}

export { ld };
export const isLocal = () => getMode() === 'local';
export const assetUrl = a;
