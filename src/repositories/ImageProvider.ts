import type { RestaurantImageSource } from '../domain/images';

/**
 * ImageProvider abstraction. Swap in a Mapbox/Cloudinary/backend provider
 * later without changing any component — components only ask for a URL at a
 * given width.
 */
export interface ImageProvider {
  /** Full URL for `source` at the requested width (px). */
  urlFor: (source: RestaurantImageSource, width: number) => string;
}

const UNSPLASH_BASE = 'https://images.unsplash.com/photo-';

/**
 * Rewrite an lh3.googleusercontent.com photo URL to the requested width,
 * preserving the source image's aspect ratio. The sizing segment looks like
 * `=w122-h92-k-no`; Google serves any size we ask for.
 */
function googlePhotoAtWidth(url: string, width: number): string {
  const m = url.match(/(=w(\d+))(-h(\d+))?(-k-no)/i);
  if (m) {
    const w = Number(m[2]);
    const h = m[4] ? Number(m[4]) : 0;
    if (w > 0 && h > 0) {
      const newH = Math.max(1, Math.round((h * width) / w));
      return url.replace(m[1], `=w${width}`).replace(m[3] ?? '', `-h${newH}`);
    }
    return url.replace(m[1], `=w${width}`);
  }
  return `${url}=w${width}`;
}

function isGooglePhotoUrl(url: string): boolean {
  return /googleusercontent\.com/i.test(url) && /(^|=w\d)/.test(url);
}

export const unsplashProvider: ImageProvider = {
  urlFor: (source, width) =>
    `${source.imageUrl}?auto=format&fit=crop&w=${width}&q=70`,
};

/** Provider for the current data source (Google photo links + Unsplash demo). */
export const imageProvider: ImageProvider = {
  urlFor: (source, width) => {
    if (!source.imageUrl) return '';
    if (isGooglePhotoUrl(source.imageUrl)) return googlePhotoAtWidth(source.imageUrl, width);
    return unsplashProvider.urlFor(source, width);
  },
};

export const unsplashPhotoUrl = (photoId: string) => `${UNSPLASH_BASE}${photoId}`;
