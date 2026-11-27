import { createElement, Fragment } from 'react';
import type { ContentBlock, Picture } from '../lib/content';
import { CatalogCard, CatalogPagination } from './Catalog';
import { markupElement, reactAttributes } from './markup';

function CmsImage({ image, lazy = false }: { image: Picture; lazy?: boolean }) {
  return <img src={image.url} alt={image.alt} width={image.width} height={image.height}
    loading={lazy ? 'lazy' : undefined} />;
}

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case 'markup':
        return markupElement(block, index);
      case 'literal':
        return block.text;
      case 'group':
        return createElement(block.tag, { ...reactAttributes(block.attrs), key: index }, <ContentBlocks blocks={block.blocks} />);
      case 'listingCard':
        return <CatalogCard key={index} card={block} />;
      case 'pagination':
        return <CatalogPagination key={index} pages={block.pages} />;
      case 'main':
        return <main key={index} {...reactAttributes(block.attrs)}><ContentBlocks blocks={block.blocks} /></main>;
      case 'heading':
        return <section key={index} className="section section--sm"><div className="container">
          <h1>{block.title}</h1>
        </div></section>;
      case 'text':
        return <section key={index} className="section"><div className="container">
          <h2>{block.heading}</h2>
          <div className="prose" dangerouslySetInnerHTML={{ __html: block.richText }} />
          {block.image && <CmsImage image={block.image} lazy />}
        </div></section>;
      case 'link':
        return <div key={index} className="container"><a className="btn btn--dark" href={block.url}>{block.label}</a></div>;
      case 'video':
        return <section key={index} className="section"><figure className="container">
          <video controls playsInline preload="none" aria-label={block.title} poster={block.poster?.url}>
            <source src={block.url} />
          </video>
          <figcaption>{block.title}</figcaption>
        </figure></section>;
      case 'vehicle':
        return <section key={index} className="section"><div className="container carpage">
          <div className="gallery" data-gallery="">
            {block.cover ? <CmsImage image={block.cover} /> : block.photos.map((url, i) =>
              <a key={i} href={url} data-gallery-item=""><img src={url} alt={block.title}
                loading={i === 0 ? undefined : 'lazy'} /></a>)}
          </div>
          <div><h1>{block.title}</h1><p className="h3">{block.price}</p><p>{block.priceLabel}</p>
            <p>{block.year && block.year + ' г.'}{block.mileage != null && ' · ' + block.mileage + ' км'}</p>
            {block.description && <div className="prose">{block.description.split(/\n\s*\n/).map((text, i) =>
              <p key={i}>{text.split('\n').map((line, j) => <Fragment key={j}>{j > 0 && <br />}{line}</Fragment>)}</p>)}</div>}
            <button type="button" className="btn btn--primary" data-modal="request"
              data-modal-subject={'Заявка на ' + block.title} data-modal-car={block.title}>Оставить заявку</button>
          </div>
        </div></section>;
    }
  });
}
