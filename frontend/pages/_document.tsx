import Document, { Head, Html, Main, NextScript } from 'next/document';
import type { DocumentContext } from 'next/document';
import type { ContentRequest } from '../lib/cms';
import type { Attributes } from '../lib/content';
import { reactAttributes } from '../components/markup';

interface Shell { html: Attributes; body: Attributes }

export default class SiteDocument extends Document<{ shell: Shell }> {
  static async getInitialProps(context: DocumentContext) {
    const initial = await Document.getInitialProps(context);
    const shell = (context.req as ContentRequest | undefined)?.maxgroupShell ?? { html: { lang: 'ru' }, body: {} };
    return { ...initial, shell };
  }

  render() {
    return <Html {...reactAttributes(this.props.shell.html)}>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('error',function(e){if(e.target.matches?.('script[data-main-script-fallback]'))document.documentElement.className='no-js'},true)" }} />
      </Head>
      <body {...reactAttributes(this.props.shell.body)}><Main /><NextScript /></body>
    </Html>;
  }
}
