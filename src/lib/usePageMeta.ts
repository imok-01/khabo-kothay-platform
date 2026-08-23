import { useEffect } from 'react';

import { MARKET } from './market';

const BASE_TITLE = `${MARKET.name} · Discover where to eat in ${MARKET.city}`;

export interface PageMeta {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  jsonLd?: object | null;
}

/**
 * Finds an existing <meta> by a single identifying attribute. Iterates the
 * live node list (rather than building an attribute selector) so matching is
 * robust against quoting/serialization differences in the shell HTML.
 */
function findMeta(attr: 'name' | 'property', value: string): HTMLMetaElement | null {
  const nodes = document.head.getElementsByTagName('meta');
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].getAttribute(attr) === value) return nodes[i];
  }
  return null;
}

function findLink(attr: string, value: string): HTMLLinkElement | null {
  const all = document.head.querySelectorAll('link');
  for (let i = 0; i < all.length; i++) {
    if (all[i].getAttribute(attr) === value) return all[i] as HTMLLinkElement;
  }
  return null;
}

function upsertMeta(match: Record<string, string>, content: string) {
  const [attr, value] = Object.entries(match)[0];
  const el = findMeta(attr as 'name' | 'property', value);
  if (el) {
    el.setAttribute('content', content);
    return;
  }
  const meta = document.createElement('meta');
  for (const [k, v] of Object.entries(match)) meta.setAttribute(k, v);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function upsertLink(match: Record<string, string>, href: string) {
  const [attr, value] = Object.entries(match)[0];
  const el = findLink(attr, value);
  if (el) {
    el.setAttribute('href', href);
    return;
  }
  const link = document.createElement('link');
  for (const [k, v] of Object.entries(match)) link.setAttribute(k, v);
  link.setAttribute('href', href);
  document.head.appendChild(link);
}

/**
 * Injects per-page SEO + social metadata into the document head.
 *
 * Effect-based (mirrors `usePageTitle`) so it works in the SPA prerender
 * step without touching markup or routes. All values are caller-supplied —
 * this hook never fabricates content.
 */
export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    // Callers supply the full title (already including the brand suffix, e.g.
    // via `buildRestaurantMeta`) — use it verbatim so the client <head> matches
    // the prerendered HTML exactly. Only the empty case falls back to the
    // branded base title.
    const title = meta.title ?? BASE_TITLE;
    document.title = title;

    if (meta.description) upsertMeta({ name: 'description' }, meta.description);
    if (meta.canonical) upsertLink({ rel: 'canonical' }, meta.canonical);

    upsertMeta({ property: 'og:title' }, title);
    if (meta.ogType) upsertMeta({ property: 'og:type' }, meta.ogType);
    if (meta.description) upsertMeta({ property: 'og:description' }, meta.description);
    if (meta.canonical) upsertMeta({ property: 'og:url' }, meta.canonical);
    if (meta.ogImage) upsertMeta({ property: 'og:image' }, meta.ogImage);

    upsertMeta({ name: 'twitter:title' }, title);
    if (meta.twitterCard) upsertMeta({ name: 'twitter:card' }, meta.twitterCard);
    if (meta.description) upsertMeta({ name: 'twitter:description' }, meta.description);
    if (meta.ogImage) upsertMeta({ name: 'twitter:image' }, meta.ogImage);

    const id = 'kk-jsonld';
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (meta.jsonLd) {
      const text = JSON.stringify(meta.jsonLd);
      if (existing) {
        existing.textContent = text;
      } else {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        script.textContent = text;
        document.head.appendChild(script);
      }
    } else if (existing) {
      existing.remove();
    }
  }, [meta.title, meta.description, meta.canonical, meta.ogImage, meta.ogType, meta.twitterCard, meta.jsonLd]);
}
