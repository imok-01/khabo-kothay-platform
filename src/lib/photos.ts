import type { Restaurant } from '../types';
import { imageService, type PhotoContext, type PhotoSelection } from '../services/imageService';

/**
 * Photo selection for a UI context. Delegates to `imageService` (→
 * `imageRepository`), so components never reach into photo sources directly.
 *
 * Priority: real Google photos → Khabo Kothay community photos → curated demo
 * placeholder imagery (the current Unsplash set, clearly labelled as demo).
 */
export const selectRestaurantPhotos = (restaurant: Restaurant, context: PhotoContext): PhotoSelection =>
  imageService.selectRestaurantPhotos(restaurant, context);

export type { PhotoContext, PhotoSelection };
