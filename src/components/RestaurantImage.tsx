import { useEffect, useMemo, useRef, useState } from 'react';
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
  /** Measured container width (px) once the element is laid out. */
  const measuredRef = useRef<number | undefined>(undefined);

  // Exact URL rendered — device-matched once measured, else the requested
  // width. Computed in render so it always tracks the active source and the
  // preload in the effect uses the identical formula (one download).
  const deviceUrl = useMemo(() => {
    if (!src || !measuredRef.current) return undefined;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const needed = Math.ceil(measuredRef.current * dpr);
    return imageProvider.urlFor(source!, Math.min(stepWidth(needed), width));
  }, [src, source, width]);

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
      if (wrapRef.current) {
        measuredRef.current = wrapRef.current.clientWidth || width;
      }
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const url =
        src && measuredRef.current
          ? imageProvider.urlFor(source!, Math.min(stepWidth(Math.ceil(measuredRef.current * dpr)), width))
          : src;
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
  }, [src, eager, source, width]);

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
          src={deviceUrl ?? src}
          alt={alt ?? source?.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
