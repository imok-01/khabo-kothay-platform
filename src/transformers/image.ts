import type { RestaurantImageSource } from '../domain/images';
import type { ImageReferencesRow } from '../integrations/supabase/database.types';

/**
 * Transformation layer: approved `image_references` rows → the frontend's
 * reference-first `RestaurantImageSource` model.
 *
 * The database stores image REFERENCES (URL + source + lifecycle status), not
 * owned assets — matching the spec's "Reference First" media strategy. The
 * frontend provider (`ImageProvider`) is still responsible for turning the
 * reference into a renderable URL at a given width.
 *
 * Source → provider mapping (frontend provider union is deliberately small):
 *  - google sources → `google-photos`
 *  - everything else (website, facebook, instagram, restaurant uploads) → `khabo`
 *    with the raw source string kept as attribution so the label stays honest.
 */
export function mapImageReferenceRows(
  rows: ImageReferencesRow[],
  restaurantName?: string,
): RestaurantImageSource[] {
  return rows.map((r) => {
    const source = r.source?.trim() || 'unknown';
    const isGoogle = source.toLowerCase().includes('google');
    return {
      provider: isGoogle ? 'google-photos' : 'khabo',
      imageUrl: r.image_url,
      alt: restaurantName ? `${restaurantName} — photo (${source})` : `Restaurant photo (${source})`,
      attribution: source,
      license: '',
    };
  });
}
