import { useEffect, useRef } from 'react';
import type { RestaurantImageSource } from '../domain/images';
import { imageProvider } from '../hooks/useImages';
import { useGallery } from '../hooks/useGallery';
import RestaurantImage from './RestaurantImage';

interface ImageGalleryProps {
  images: RestaurantImageSource[];
  restaurantName: string;
  photoSourceLabel: string;
}

/**
 * Professional image gallery with single source of truth state management.
 * 
 * Architecture:
 * - Hero image controlled by activeIndex
 * - Lightbox controlled by lightboxIndex (separate from hero)
 * - Thumbnails only affect hero
 * - Lightbox navigation only affects lightboxIndex
 */
export default function ImageGallery({
  images,
  restaurantName,
  photoSourceLabel,
}: ImageGalleryProps) {
  const [state, actions] = useGallery(images);
  const { activeIndex, isLightboxOpen, lightboxIndex } = state;
  const lightboxImageRef = useRef<HTMLImageElement>(null);

  // Focus management for lightbox
  useEffect(() => {
    if (isLightboxOpen && lightboxImageRef.current) {
      lightboxImageRef.current.focus();
    }
  }, [isLightboxOpen, lightboxIndex]);

  if (images.length === 0) return null;

  const currentImage = images[activeIndex];
  const lightboxImage = images[lightboxIndex];

  return (
    <>
      {/* Main Gallery */}
      <div className="detail__gallery">
        {/* Hero Image */}
        <div
          className="detail__gallery-main"
          onClick={actions.openLightbox}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && actions.openLightbox()}
          aria-label={`Open photo gallery for ${restaurantName}`}
        >
          <RestaurantImage
            source={currentImage}
            name={restaurantName}
            width={1200}
            eager
          />
          <span className="detail__gallery-source">{photoSourceLabel}</span>
          {images.length > 1 && (
            <span className="detail__gallery-count">
              {activeIndex + 1} / {images.length}
            </span>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="detail__gallery-thumbs" aria-label="Photo thumbnails">
            {images.map((img, i) => (
              <button
                key={img.imageUrl || i}
                type="button"
                aria-current={i === activeIndex}
                aria-label={`Photo ${i + 1}: ${img.alt}`}
                onClick={() => actions.setActiveIndex(i)}
              >
                <RestaurantImage
                  source={img}
                  name={restaurantName}
                  width={300}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${restaurantName} photo gallery`}
          onClick={actions.closeLightbox}
        >
          <button
            type="button"
            className="lightbox__btn lightbox__close"
            onClick={(e) => {
              e.stopPropagation();
              actions.closeLightbox();
            }}
            aria-label="Close gallery"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox__btn lightbox__prev"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.prevImage();
                }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox__btn lightbox__next"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.nextImage();
                }}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}

          <img
            ref={lightboxImageRef}
            src={imageProvider.urlFor(lightboxImage, 1600)}
            alt={lightboxImage.alt}
            className="lightbox__img"
            onClick={(e) => e.stopPropagation()}
            tabIndex={0}
          />

          <p className="lightbox__caption">
            {lightboxImage.alt}
            {images.length > 1 && (
              <span className="lightbox__counter">
                {' '}{lightboxIndex + 1} / {images.length}
              </span>
            )}
          </p>
        </div>
      )}
    </>
  );
}
