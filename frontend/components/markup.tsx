import { createElement } from 'react';
import styleToJS from 'style-to-js';
import type { Attributes, Markup } from '../lib/content';

const propertyNames: Record<string, string> = {
  class: 'className', charset: 'charSet', 'http-equiv': 'httpEquiv', crossorigin: 'crossOrigin',
  fetchpriority: 'fetchPriority', imagesizes: 'imageSizes', imagesrcset: 'imageSrcSet',
  tabindex: 'tabIndex', referrerpolicy: 'referrerPolicy', nomodule: 'noModule',
};
const booleanAttributes = new Set(['defer', 'async', 'hidden', 'nomodule', 'open', 'inert']);
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr']);

export function reactAttributes(attrs: Attributes): Record<string, string | boolean | object> {
  const props: Record<string, string | boolean | object> = {};
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith('on')) {
      if (name === 'onerror' && value === "document.documentElement.className='no-js'") {
        props['data-main-script-fallback'] = '';
      }
      continue;
    }
    if (name === 'style') {
      props.style = styleToJS(value, { reactCompat: true });
    } else {
      props[propertyNames[name] ?? name] = booleanAttributes.has(name) ? true : value;
    }
  }
  return props;
}

// Only the first-party release and Wagtail's already-escaped fragments enter this component.
export function markupElement(node: Markup, key: number) {
  const props = { ...reactAttributes(node.attrs), key };
  if (voidTags.has(node.tag)) return createElement(node.tag, props);
  if (node.tag === 'title') return <title key={key}>{node.html}</title>;
  if (node.tag === 'script' && !node.html) return createElement('script', props);
  return createElement(node.tag, { ...props, dangerouslySetInnerHTML: { __html: node.html } });
}
