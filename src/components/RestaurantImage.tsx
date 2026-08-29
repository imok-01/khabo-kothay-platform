import { useEffect, useRef, useState } from 'react';
import type { RestaurantImageSource } from '../domain/images';
import { imageProvider } from '../hooks/useImages';
import { loadImage } from '../lib/imageLoader';

interface RestaurantImageProps {
  source: RestaurantImageSource | undefined;
  name: string;
  alt?: string;
  /** image width in px — passed to the provider for responsive sizing */
  width?: number;
  className?: string;
  eager?: boolean;
  /** show a monogram fallback tile instead of the image on error */
  fallback?: 'monogram' | 'none';
}

/**
 * Width steps used to round the requested size. Rounding keeps the same
 * photo URL stable across breakpoints (browser-cache friendly) while never
 * exceeding the caller's `width` cap.
 */
const WIDTH_STEPS = [240, 320, 480, 640, 800, 1200, 1600];

/** Smallest step ≥ `needed` px, or `needed` itself when it exceeds the ladder. */
function stepWidth(needed: number): number {
  return WIDTH_STEPS.find((w) => w >= needed) ?? needed;
}

/**
 * Photographic image with loading skeleton + graceful fallback. All sizing
 * goes through the ImageProvider so the source can be swapped later.
 *
 * Loads are routed through a shared concurrency-limited queue with retry
 * (see lib/imageLoader) so transient CDN throttling doesn't permanently
 * swap real photos for the fallback. Lazy images only start loading when
 * they approach the viewport.
 *
 * Egress: the requested width is measured against the actual rendered
 * container (× devicePixelRatio) and rounded up to a stable step, capped at
 * the caller's `width`. A phone showing a 700px hero therefore downloads an
 * 800px photo instead of the old fixed 1200px, and a 2× display gets exactly
 * what it needs — with a single URL per image, so the queued preload and the
 * rendered `<img>` always share one download (no double fetch).
 */
export default function RestaurantImage({
  source,
  name,
  alt,
  width = 800,
  className = '',
  eager = false,
  fallback = 'monogram',
}: RestaurantImageProps) {
  const src = source ? imageProvider.urlFor(source, width) : undefined;
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'failed'>(() =>
    src ? (eager ? 'loading' : 'idle') : 'failed',
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  /**
   * The exact URL that was preloaded, set by `begin()` once the container has
   * been measured. Held in state rather than derived in render because the
   * measurement only exists after layout: a `useMemo` reading it computes
   * `undefined` on the render that matters and then, having stable deps, never
   * recomputes — which silently served the un-device-matched `src` to the
   * `<img>` while the preload had fetched the small one, i.e. two downloads.
   */
  const [loadedUrl, setLoadedUrl] = useState<string | undefined>(undefined);

  /**
   * The effect reads the source through a ref so the object itself is not a
   * dependency. `src` is derived from it and is the honest signal (see below);
   * a ref also keeps `exhaustive-deps` satisfied without a suppression.
   */
  const sourceRef = useRef(source);
  sourceRef.current = source;

  /**
   * Keyed on the resolved URL string, NOT on the `source` object. Callers build
   * that object in render (`selectRestaurantPhotos(...).photos[0]`, whose every
   * field comes from a `.map(p => ({…}))`), so its identity changes on every
   * re-render of the parent — and with `source` in the deps, any unrelated
   * re-render tore down a finished load and re-entered `begin()`, whose
   * `setState('loading')` swaps the `<img>` back for the skeleton. On Explore
   * that read as the whole grid flashing whenever a favourite / save / compare
   * toggle re-rendered every card. A different photo always yields a different
   * `src`, so the string carries every change that matters.
   */
  useEffect(() => {
    if (!src) {
      setState('failed');
      return;
    }
    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const begin = () => {
      if (cancelled) return;
      setState('loading');
      // Measure the container so the preload matches the rendered URL.
      const measured = wrapRef.current?.clientWidth || width;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const url = imageProvider.urlFor(sourceRef.current!, Math.min(stepWidth(Math.ceil(measured * dpr)), width));
      setLoadedUrl(url);
      loadImage(url).then((ok) => {
        if (cancelled) return;
        setState(ok ? 'loaded' : 'failed');
      });
    };

    if (eager) {
      begin();
    } else if (typeof IntersectionObserver !== 'undefined' && wrapRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer?.disconnect();
            begin();
          }
        },
        // Start loading a little before the image scrolls into view.
        { rootMargin: '600px 0px' },
      );
      observer.observe(wrapRef.current);
    } else {
      begin();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [src, eager, width]);

  if (!src || state === 'failed') {
    if (fallback === 'none') return null;
    return (
      <div className={`img-fallback ${className}`} role="img" aria-label={alt ?? `${name} photo unavailable`}>
        <span className="img-fallback__monogram" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="img-fallback__label">No verified photo yet</span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`img-wrap ${state === 'loaded' ? 'img-wrap--loaded' : ''} ${className}`}>
      {state !== 'loaded' && <span className="skeleton skeleton--image" aria-hidden="true" />}
      {state === 'loaded' && (
        <img
          src={loadedUrl ?? src}
          alt={alt ?? source?.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
