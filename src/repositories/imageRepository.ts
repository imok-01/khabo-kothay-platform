import type { RestaurantImageSource } from '../domain/images';
import type { Restaurant } from '../types';
import { getRestaurantImages } from '../data/images';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapImageReferenceRows } from '../transformers/image';

/**
 * ImageRepository — the seam between image data and the UI.
 *
 *   components → imageService (selectRestaurantPhotos) → imageRepository
 *
 * The frontend is reference-first (`RestaurantImageSource` + `ImageProvider`),
 * matching the spec's media strategy. The mock implementation returns the
 * current three source groups (Google photos on the restaurant, Khabo
 * community photos, curated demo placeholders); a Supabase implementation
 * reads `image_references` (status-filtered) instead.
 */

export interface ImageRepository {
  /** Google photo sources on the restaurant (provider 'google-photos'). */
  googleSources(restaurant: Restaurant): RestaurantImageSource[];
  /** Khabo Kothay community photo sources. */
  khaboSources(restaurant: Restaurant): RestaurantImageSource[];
  /** Curated demo placeholder sources (current Unsplash set). */
  demoSources(restaurantId: string): RestaurantImageSource[];
  /** Future async path: image_references rows for a restaurant. */
  fetchSourcesForRestaurant?(restaurantId: string): Promise<RestaurantImageSource[]>;
}

export const mockImageRepository: ImageRepository = {
  googleSources: (restaurant) =>
    (restaurant.google?.photos ?? []).map((p) => ({
      provider: 'google-photos' as const,
      imageUrl: p.imageUrl ?? '',
      photoRef: p.photoRef,
      placeId: restaurant.google?.placeId,
      alt: p.alt ?? `${restaurant.name} — photo from Google Maps`,
      width: p.width,
      height: p.height,
      attribution: 'Photos from Google Maps',
      license: 'Google Maps Platform',
    })),
  khaboSources: (restaurant) =>
    restaurant.khabo.photos.map((p) => ({
      provider: 'khabo' as const,
      imageUrl: p.url,
      alt: p.alt ?? `${restaurant.name} — Khabo Kothay photo`,
      attribution: p.author ? `Photo: ${p.author}` : 'Khabo Kothay community',
      license: 'Community photo',
    })),
  demoSources: (restaurantId) => getRestaurantImages(restaurantId),
};

class SupabaseImageRepository implements ImageRepository {
  googleSources(restaurant: Restaurant): RestaurantImageSource[] {
    // When the backend is active, google sources arrive via
    // fetchSourcesForRestaurant (image_references); the seed `google.photos`
    // block is only populated by the restaurant transformer in that mode.
    return (restaurant.google?.photos ?? []).map((p) => ({
      provider: 'google-photos' as const,
      imageUrl: p.imageUrl ?? '',
      photoRef: p.photoRef,
      placeId: restaurant.google?.placeId,
      alt: p.alt ?? `${restaurant.name} — photo from Google Maps`,
      attribution: 'Photos from Google Maps',
      license: 'Google Maps Platform',
    }));
  }

  khaboSources(restaurant: Restaurant): RestaurantImageSource[] {
    return restaurant.khabo.photos.map((p) => ({
      provider: 'khabo' as const,
      imageUrl: p.url,
      alt: p.alt ?? `${restaurant.name} — Khabo Kothay photo`,
      attribution: p.author ? `Photo: ${p.author}` : 'Khabo Kothay community',
      license: 'Community photo',
    }));
  }

  demoSources(_restaurantId: string): RestaurantImageSource[] {
    // No demo placeholders once real image_references exist.
    return [];
  }

  async fetchSourcesForRestaurant(restaurantId: string): Promise<RestaurantImageSource[]> {
    const rows = await queries.selectImagesForRestaurant(restaurantId);
    return mapImageReferenceRows(rows);
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const imageRepository: ImageRepository = isSupabaseConfigured()
  ? new SupabaseImageRepository()
  : mockImageRepository;
