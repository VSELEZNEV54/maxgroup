export type Attributes = Record<string, string>;

export interface Markup {
  type: 'markup';
  tag: string;
  attrs: Attributes;
  html: string;
}

export interface Picture {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface ListingCard {
  type: 'listingCard';
  id: string;
  url: string;
  title: string;
  image: Picture | null;
  year: number | null;
  mileage: number | null;
  grade: string | number | null;
  price: string;
  priceLabel: string;
  filterPrice: string | null;
}

export interface Pagination {
  type: 'pagination';
  pages: { label: string; url: string | null; current: boolean }[];
}

export type ContentBlock =
  | Markup | ListingCard | Pagination
  | { type: 'literal'; text: string }
  | { type: 'group'; tag: string; attrs: Attributes; blocks: ContentBlock[] }
  | { type: 'main'; attrs: Attributes; blocks: ContentBlock[] }
  | { type: 'heading'; title: string }
  | { type: 'text'; heading: string; richText: string; image: Picture | null }
  | { type: 'link'; label: string; url: string }
  | { type: 'video'; title: string; url: string; poster: Picture | null }
  | { type: 'vehicle'; title: string; price: string; priceLabel: string; description: string;
      year: number | null; mileage: number | null; photos: string[]; cover: Picture | null };

export interface PageContent {
  version: 1;
  htmlAttrs: Attributes;
  bodyAttrs: Attributes;
  head: Markup[];
  body: ContentBlock[];
}

export type PageProps = { content: PageContent } | { errorStatus: number };
