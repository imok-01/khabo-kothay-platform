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

/**
 * A photo's identity, independent of the width it is being asked for.
 *
 * Google serves one picture at any size through a trailing `=w1200-h905-k-no`
 * segment, so two records pointing at the same photograph can differ only in
 * that segment. Stripping it makes them one photo.
 */
export function photoIdentity(url: string): string {
  return url.trim().replace(/=w\d+(-h\d+)?(-k-no)?$/i, '');
}

/**
 * First occurrence of each distinct photo, order preserved; entries that
 * identify no photo at all are dropped.
 *
 * Needed because one `image_references` row reaches the restaurant gallery
 * twice — once through the transformer's `google.photos` block and once through
 * the owner-uploads query, which reads the same table. Unfiltered, every
 * restaurant counted three photos as six, showed each of them twice, and asked
 * Google's CDN for double the bytes it needed.
 *
 * A Google photo may carry a `photoRef` and no URL yet — that is the Place
 * Photos API path, where the bytes are resolved at render time — so the
 * reference is the identity when there is no URL to use.
 */
export function dedupePhotos(photos: RestaurantImageSource[]): RestaurantImageSource[] {
  const seen = new Set<string>();
  return photos.filter((p) => {
    const key = photoIdentity(p.imageUrl) || (p.photoRef ?? '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
