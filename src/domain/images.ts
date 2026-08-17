/**
 * Image source abstraction. UI components depend only on this shape, so the
 * mock data can be swapped for a real image API or backend without touching
 * components. Every source carries attribution + license metadata so imagery
 * can be traced back to a legitimate provider.
 *
 * - `google-photos`: a Google Place Photos reference — resolve the actual
 *   bytes through the official Place Photos API at render time and never
 *   store them as our own assets (respects Google's caching terms).
 * - `khabo`: community/user-uploaded photos (separate from Google photos).
 * - `unsplash`: current demo placeholder imagery, credited to Unsplash.
 */
export type PhotoProvider = 'google-photos' | 'khabo' | 'unsplash';

export interface RestaurantImageSource {
  provider: PhotoProvider;
  /** base URL without sizing params — sizing is applied by the provider */
  imageUrl: string;
  alt: string;
  attribution: string;
  license: string;
  /** Google Place Photos reference — future API fetches the actual bytes */
  photoRef?: string;
  /** Place ID the photo belongs to (for Google photos) */
  placeId?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}
