import { useEffect } from 'react';

import { MARKET } from './market';

const BASE_TITLE = `${MARKET.name} · Discover where to eat in ${MARKET.city}`;

/** Sets the document title for the current page, namespaced with the brand. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${MARKET.name}` : BASE_TITLE;
  }, [title]);
}
