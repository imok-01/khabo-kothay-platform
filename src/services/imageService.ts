import type { Restaurant } from '../types';
import type { RestaurantImageSource } from '../domain/images';
import { imageRepository } from '../repositories/imageRepository';

export type PhotoContext = 'card' | 'hero' | 'gallery';

export interface PhotoSelection {
  /** Photos to show, in order. */
  photos: RestaurantImageSource[];
  /** Where the lead photo comes from — shown as a small source label. */
  leadSource: 'google-photos' | 'khabo' | 'demo';
}

/**
 * ImageService — photo selection for a UI context.
 *
 *   components → imageService.selectRestaurantPhotos → imageRepository
 *
 * Priority: real Google photos → Khabo Kothay community photos → curated demo
 * placeholder imagery (the current Unsplash set, clearly labelled as demo).
 * Components never reach into photo sources directly.
 */
export const imageService = {
  selectRestaurantPhotos(restaurant: Restaurant, context: PhotoContext): PhotoSelection {
    const google = imageRepository.googleSources(restaurant);
    const khabo = imageRepository.khaboSources(restaurant);
    const demo = imageRepository.demoSources(restaurant.id);

    // Card: exactly one lead photo. Gallery: everything (hero falls back to
    // the first gallery photo, so we reuse the same selection).
    if (context === 'card') {
      const lead = google[0] ?? khabo[0] ?? demo[0];
      return {
        photos: lead ? [lead] : [],
        leadSource: google[0] ? 'google-photos' : khabo[0] ? 'khabo' : 'demo',
      };
    }

    const all = [...google, ...khabo, ...(demo.length > 0 && (google.length > 0 || khabo.length > 0) ? [] : demo)];
    // If real photos exist, prefer them over demo placeholders entirely.
    const photos = google.length > 0 || khabo.length > 0 ? all : demo;
    return {
      photos,
      leadSource: google.length > 0 ? 'google-photos' : khabo.length > 0 ? 'khabo' : 'demo',
    };
  },
};
