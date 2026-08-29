import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query from React.
 *
 * Used where a layout is not just *styled* differently at a breakpoint but
 * *behaves* differently — the homepage principles are a static two-column
 * spread on desktop and a set of expandable rows on a phone, and the second
 * form needs real buttons with real `aria-expanded` state. Styling that with
 * CSS alone would leave the desktop spread claiming to be collapsible.
 *
 * Starts `false` during SSR/prerender and corrects on mount, so the prerendered
 * HTML always contains the expanded desktop form — the content is in the markup
 * either way, which is what matters for crawlers and for JS-off readers.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

export default useMediaQuery;
