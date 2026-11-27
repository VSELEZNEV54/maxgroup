import Head from 'next/head';
import type { GetServerSideProps, PageConfig } from 'next';
import { ContentBlocks } from '../components/ContentBlocks';
import { markupElement } from '../components/markup';
import { loadPage } from '../lib/cms';
import type { PageProps } from '../lib/content';

export const getServerSideProps: GetServerSideProps<PageProps> = loadPage;

// Existing galleries, quizzes and forms run their own small scripts. Keep these SSR pages HTML-only.
export const config: PageConfig = { runtime: 'nodejs', unstable_runtimeJS: false };

export default function SitePage(props: PageProps) {
  if ('errorStatus' in props) {
    const message = props.errorStatus >= 500 ? 'Сайт временно недоступен' : 'Запрос не выполнен';
    return <><Head><title>{message + ' | Макс Групп'}</title><meta name="robots" content="noindex" /></Head>
      <main className="container"><h1>{message}</h1><a href="/">На главную</a></main></>;
  }
  return <><Head>{props.content.head.map(markupElement)}</Head><ContentBlocks blocks={props.content.body} /></>;
}
