import type { ListingCard, Pagination } from '../lib/content';

export function CatalogCard({ card }: { card: ListingCard }) {
  return <article className="car is-in" data-car={card.id} data-price={card.filterPrice ?? undefined}>
    <a className="car__media" href={card.url} aria-label={card.title}>
      {card.image && <img src={card.image.url} alt={card.image.alt} width={card.image.width}
        height={card.image.height} loading="lazy" />}
    </a>
    <div className="car__body">
      <h3 className="car__title"><a href={card.url}>{card.title}</a></h3>
      <ul className="car__specs car__facts">
        <li>{card.year ? card.year + ' г.' : 'Год не указан'}</li>
        <li>{card.mileage != null ? card.mileage + ' км' : 'Пробег не указан'}</li>
        <li>{card.grade ? 'Оценка ' + card.grade : 'Оценка не указана'}</li>
      </ul>
      <div className="car__foot">
        <div className="car__price"><span className="car__amount">{card.price}</span><small>{card.priceLabel}</small></div>
        <a className="car__go" href={card.url} aria-label={'Открыть объявление ' + card.title}>
          <svg data-icon="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
        </a>
      </div>
    </div>
  </article>;
}

export function CatalogPagination({ pages }: { pages: Pagination['pages'] }) {
  return <nav className="btn-row" aria-label="Страницы каталога">
    {pages.map((page, i) => page.url
      ? <a key={page.url} className="btn btn--ghost" href={page.url}
          aria-current={page.current ? 'page' : undefined}>{page.label}</a>
      : <span key={i}>{page.label}</span>)}
  </nav>;
}
