import { useCallback, useEffect, useState } from 'react';
import type { RestaurantImageSource } from '../domain/images';

export interface GalleryState {
  /** Immutable array of images */
  images: RestaurantImageSource[];
  /** Controls hero image only */
  activeIndex: number;
  /** Controls lightbox viewer only */
  isLightboxOpen: boolean;
  /** Controls lightbox image - separate from hero */
  lightboxIndex: number;
}

export interface GalleryActions {
  /** Set hero image (from thumbnail click) */
  setActiveIndex: (index: number) => void;
  /** Open lightbox - initializes lightboxIndex from activeIndex */
  openLightbox: () => void;
  /** Close lightbox - hero remains unchanged */
  closeLightbox: () => void;
  /** Navigate lightbox only (does NOT affect hero) */
  nextImage: () => void;
  prevImage: () => void;
  /** Set lightbox image directly */
  setLightboxIndex: (index: number) => void;
}

/**
 * Single source of truth for gallery state.
 * 
 * Rules:
 * 1. images array is immutable source
 * 2. activeIndex controls hero image only
 * 3. lightboxIndex controls fullscreen viewer only
 * 4. Never let lightbox navigation mutate activeIndex
 * 5. When opening lightbox: lightboxIndex = activeIndex
 * 6. When closing lightbox: return without changing hero image
 */
export function useGallery(images: RestaurantImageSource[]): [GalleryState, GalleryActions] {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const imageCount = images.length;

  const openLightbox = useCallback(() => {
    // Initialize lightbox to current hero image
    setLightboxIndex(activeIndex);
    setIsLightboxOpen(true);
  }, [activeIndex]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    // Hero image (activeIndex) remains unchanged
  }, []);

  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % imageCount);
  }, [imageCount]);

  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + imageCount) % imageCount);
  }, [imageCount]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      }
    };

    // Prevent body scroll when lightbox is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, closeLightbox, nextImage, prevImage]);

  const state: GalleryState = {
    images,
    activeIndex,
    isLightboxOpen,
    lightboxIndex,
  };

  const actions: GalleryActions = {
    setActiveIndex,
    openLightbox,
    closeLightbox,
    nextImage,
    prevImage,
    setLightboxIndex,
  };

  return [state, actions];
}
