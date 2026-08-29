import { useEffect, useRef, useState } from 'react';
import { Expand, MoveHorizontal } from 'lucide-react';
import type { RestaurantImageSource } from '../domain/images';
import { imageProvider } from '../hooks/useImages';
import { useGallery } from '../hooks/useGallery';
import { useMediaQuery } from '../hooks/useMediaQuery';
import MorphSlider from './MorphSlider';
import type { MorphItem, MorphSliderHandle } from './MorphSlider';
import { Dialog } from './ui';

interface ImageGalleryProps {
  images: RestaurantImageSource[];
  restaurantName: string;
  photoSourceLabel: string;
}

/**
 * Width requested for every slide, the poster, the thumbnails and the lightbox.
 *
 * 1200px is what the old hero asked for, and every Google link in the catalogue
 * answers `=w1200-h905-k-no` with a CORS-permissive 200 — which is the only
 * reason a texture can be uploaded from one at all. It is also a memory
 * decision: at 1200×900 a slide costs ~4.3MB of GPU texture, so the deck stays
 * cheap for a reader who looks at two photos out of nineteen.
 *
 * One width for all four surfaces is deliberate, and it is the fix for the
 * broken thumbnails and the lightbox that appeared not to open. Google's photo
 * CDN answers a burst with 429; asking it for the same photo at 1200 (slide),
 * 240 (thumbnail) and 1600 (lightbox) tripled the requests this page makes and
 * put each surface on its own dice roll. At one width the thumbnail and the
 * lightbox are served from the texture's own download — no second request, and
 * nothing can be missing in one place while it is fine in another.
 */
const SLIDE_WIDTH = 1200;

/** The one URL this page ever asks for a given photo. */
const photoUrl = (img: RestaurantImageSource) => imageProvider.urlFor(img, SLIDE_WIDTH);

/**
 * The restaurant photo deck.
 *
 * Architecture, unchanged from the two-up gallery this replaces:
 * - the stage is controlled by `activeIndex`
 * - the lightbox is controlled by `lightboxIndex`, seeded from it and then
 *   independent, so paging the lightbox does not move the stage
 * - thumbnails only affect the stage
 *
 * What changed is the stage itself: one `<img>` swapped by state became a WebGL
 * deck that morphs between photos (`MorphSlider`). Three consequences worth
 * knowing about:
 *
 * 1. `items` is memoised on the joined URL list rather than on `images`.
 *    RestaurantPage rebuilds that array on every render, and a new `items`
 *    identity tears down and rebuilds the live WebGL context.
 * 2. Captions are off. Every photo in the catalogue shares one alt string
 *    ("{name} — photo from Google Maps"), so a caption would restate the same
 *    sentence nineteen times; the source and counter chips carry the same
 *    information once, in the same glass they always did.
 * 3. Every `<img>` on this surface — poster, thumbnail, lightbox — is a plain
 *    tag on `photoUrl`, not a `RestaurantImage`. That component measures its
 *    container and picks its own width, which would request a differently-sized
 *    file per surface, and it fetches without CORS, so a texture could not be
 *    uploaded from what it downloaded. One URL per photo instead: the deck's
 *    texture load is the only request, and the other three read the cache.
 */
export default function ImageGallery({
  images,
  restaurantName,
  photoSourceLabel,
}: ImageGalleryProps) {
  const [state, actions] = useGallery(images);
  const { activeIndex, isLightboxOpen, lightboxIndex } = state;
  const sliderRef = useRef<MorphSliderHandle>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState<ReadonlySet<number>>(new Set());
  const [hinted, setHinted] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // `items` has to keep its identity across a parent re-render or the engine
  // tears down a live WebGL context and rebuilds it, and `images` cannot supply
  // that: RestaurantPage spreads a fresh array every render. So the array is
  // cached against the one thing that fully describes it — the joined URL list.
  // A ref rather than `useMemo`, because the honest dependency here is the key
  // and not the array, which is also the remedy the linter names for the same
  // shape of problem at RestaurantPage.tsx:161.
  const urlKey = images.map((img) => img.imageUrl).join('|');
  const itemsCache = useRef<{ key: string; items: MorphItem[] }>({ key: '', items: [] });
  if (itemsCache.current.key !== urlKey) {
    itemsCache.current = {
      key: urlKey,
      items: images.map((img) => ({ image: photoUrl(img) })),
    };
  }
  const items = itemsCache.current.items;

  // Keep the selected thumbnail in the rail. `scrollIntoView` would also scroll
  // the page vertically to reach it, so the offset is computed and applied to
  // the rail alone; `.photo-morph__rail` is `position: relative` so that
  // `offsetLeft` is measured against the scroll container itself.
  useEffect(() => {
    const rail = railRef.current;
    const thumb = rail?.querySelector<HTMLElement>(`[data-photo-index='${activeIndex}']`);
    if (!rail || !thumb) return;
    rail.scrollTo({
      left: thumb.offsetLeft - (rail.clientWidth - thumb.offsetWidth) / 2,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, reducedMotion]);

  if (images.length === 0) return null;

  const lightboxImage = images[lightboxIndex];
  const posterImage = images[0];
  const showHint = !hinted && images.length > 1;

  const dismissHint = () => setHinted(true);

  return (
    <>
      <section className="photo-morph" aria-label={`${restaurantName} photos`}>
        <div className="photo-morph__stage">
          <MorphSlider
            ref={sliderRef}
            items={items}
            transition="melt"
            duration={1.15}
            intensity={0.5}
            aberration={0.28}
            drift={0.25}
            radius={0}
            overlayColor="#1c1710"
            showCaptions={false}
            showIndicators={false}
            ariaLabel={`${restaurantName} photos — drag or use the arrow keys`}
            onIndexChange={(i) => {
              actions.setActiveIndex(i);
              dismissHint();
            }}
            onActivate={() => {
              actions.openLightbox();
              dismissHint();
            }}
            onItemUnavailable={(i) =>
              setUnavailable((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
            }
            poster={
              <img
                src={photoUrl(posterImage)}
                alt={posterImage.alt}
                crossOrigin="anonymous"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            }
          />

          <span className="detail__gallery-source">{photoSourceLabel}</span>
          {images.length > 1 && (
            <span className="detail__gallery-count">
              {activeIndex + 1} / {images.length}
            </span>
          )}

          <button
            type="button"
            className="photo-morph__expand"
            onClick={() => {
              actions.openLightbox();
              dismissHint();
            }}
            aria-label={`Open full-size photo gallery for ${restaurantName}`}
          >
            <Expand aria-hidden="true" />
            View
          </button>

          {showHint && (
            <p className="photo-morph__hint">
              <MoveHorizontal aria-hidden="true" size={13} />
              Drag
            </p>
          )}
        </div>

        {images.length > 1 && (
          <div className="photo-morph__rail" ref={railRef} aria-label="Photo thumbnails">
            {images.map((img, i) =>
              /* A photo the browser refused to serve is dropped from the rail
                 rather than shown as an empty tile. The slide itself stays in
                 `items`, so every index below still means what it did — and
                 because the thumbnail requests the identical URL the deck
                 uploaded, the rail now shows exactly the photos the stage can
                 actually reach, instead of disagreeing with it. */
              unavailable.has(i) ? null : (
                <button
                  key={img.imageUrl}
                  type="button"
                  className="photo-morph__thumb"
                  data-photo-index={i}
                  aria-current={i === activeIndex}
                  aria-label={`Photo ${i + 1}: ${img.alt}`}
                  onClick={() => {
                    sliderRef.current?.jumpTo(i);
                    dismissHint();
                  }}
                >
                  <img
                    src={photoUrl(img)}
                    alt=""
                    crossOrigin="anonymous"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ),
            )}
          </div>
        )}

        {/* The stage is a canvas, so nothing in it changes for a screen reader
            when the photo does. This is the announcement. */}
        <p className="sr-only" aria-live="polite">
          Photo {activeIndex + 1} of {images.length}
          {images[activeIndex] ? `: ${images[activeIndex].alt}` : ''}
        </p>
      </section>
      {isLightboxOpen && (
        <Dialog
          open
          onClose={actions.closeLightbox}
          variant="media"
          title={`${restaurantName} photo gallery`}
        >
          <button
            type="button"
            className="lightbox__btn lightbox__close"
            onClick={actions.closeLightbox}
            aria-label="Close gallery"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox__btn lightbox__prev"
                onClick={actions.prevImage}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox__btn lightbox__next"
                onClick={actions.nextImage}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}

          <img
            src={photoUrl(lightboxImage)}
            alt={lightboxImage.alt}
            className="lightbox__img"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />

          <p className="lightbox__caption">
            {lightboxImage.alt}
            {images.length > 1 && (
              <span className="lightbox__counter">
                {' '}{lightboxIndex + 1} / {images.length}
              </span>
            )}
          </p>
        </Dialog>
      )}
    </>
  );
}
