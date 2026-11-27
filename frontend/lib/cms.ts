import { get as httpGet, type IncomingMessage } from 'node:http';
import { get as httpsGet } from 'node:https';
import type { GetServerSideProps } from 'next';
import type { Attributes, PageContent, PageProps } from './content';

export type ContentRequest = IncomingMessage & { maxgroupShell?: { html: Attributes; body: Attributes } };
const contentType = 'application/vnd.maxgroup.page.v1+json';
const redirectStatuses = [301, 302, 303, 307, 308] as const;

export const loadPage: GetServerSideProps<PageProps> = async ({ req, res, resolvedUrl }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-MaxGroup-Renderer', 'next');
  function error(status: number) {
    res.statusCode = status;
    res.setHeader('X-Robots-Tag', 'noindex');
    return { props: { errorStatus: status } };
  }
  if (req.method !== 'HEAD' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, HEAD');
    return error(405);
  }
  // Nginx supplies the original path, including trailing slash and all filter/UTM parameters.
  const original = req.headers['x-original-uri'];
  const path = typeof original === 'string' && !original.startsWith('/_next/') ? original : resolvedUrl;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return error(400);
  const base = new URL(process.env.CMS_ORIGIN ?? 'http://web:8000');
  const url = new URL(path, base);
  if (url.origin !== base.origin) return error(400);
  const headers: Record<string, string> = { Accept: contentType };
  if (req.headers.host) headers.Host = req.headers.host;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  if (req.headers['x-forwarded-proto'] === 'https') headers['X-Forwarded-Proto'] = 'https';
  try {
    // Node's HTTP client preserves the public Host used by Wagtail for site routing and previews.
    const get = url.protocol === 'https:' ? httpsGet : httpGet;
    const upstream = await new Promise<IncomingMessage>((resolve, reject) => {
      get(url, { headers, signal: AbortSignal.timeout(25000) }, resolve).on('error', reject);
    });
    const status = upstream.statusCode ?? 502;
    const cookies = upstream.headers['set-cookie'];
    if (cookies?.length) res.setHeader('Set-Cookie', cookies);
    for (const name of ['X-Request-ID', 'X-Robots-Tag', 'X-Frame-Options', 'Referrer-Policy', 'Vary']) {
      const value = upstream.headers[name.toLowerCase()];
      if (value) res.setHeader(name, value);
    }
    const statusCode = redirectStatuses.find((code) => code === status);
    if (statusCode) {
      upstream.resume();
      const destination = upstream.headers.location;
      if (!destination) return error(502);
      return { redirect: { destination, statusCode } };
    }
    if (status >= 500 || !upstream.headers['content-type']?.startsWith(contentType)) {
      upstream.resume();
      return error(status >= 400 ? status : 502);
    }
    upstream.setEncoding('utf8');
    let json = '';
    for await (const chunk of upstream) json += chunk;
    const content: PageContent = JSON.parse(json);
    if (content.version !== 1 || !Array.isArray(content.head) || !Array.isArray(content.body)) return error(502);
    (req as ContentRequest).maxgroupShell = { html: content.htmlAttrs, body: content.bodyAttrs };
    res.statusCode = status;
    return { props: { content } };
  } catch (cause) {
    console.error('CMS request failed', cause instanceof Error ? cause.name : 'Error');
    return error(503);
  }
};
