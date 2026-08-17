import { useEffect, useRef, useState } from 'react';
import type { RestaurantImageSource } from '../domain/images';
import { imageProvider } from '../repositories/ImageProvider';
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
 * Photographic image with loading skeleton + graceful fallback. All sizing
 * goes through the ImageProvider so the source can be swapped later.
 *
 * Loads are routed through a shared concurrency-limited queue with retry
 * (see lib/imageLoader) so transient CDN throttling doesn't permanently
 * swap real photos for the fallback. Lazy images only start loading when
 * they approach the viewport.
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
      loadImage(src).then((ok) => {
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
  }, [src, eager]);

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
          src={src}
          alt={alt ?? source?.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
