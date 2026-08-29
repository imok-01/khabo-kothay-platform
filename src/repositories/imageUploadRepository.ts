import { getSupabase, isSupabaseConfigured } from '../integrations/supabase/client';
import { selectImagesForRestaurant } from '../integrations/supabase/queries';
import { resolveRestaurantUuid } from './restaurantRepository';
import type { ImageReferencesRow } from '../integrations/supabase/database.types';

/**
 * Owner photo uploads (BUG 2).
 *
 * Uploads land in the `restaurant-images` Supabase Storage bucket and are
 * recorded as `image_references` rows (status ACTIVE so they display
 * immediately in DEV). RLS on `image_references` only permits an
 * authenticated user who owns the restaurant (via `roles`) to insert, so the
 * write itself enforces the owner check — no extra guard needed beyond a
 * clear error when it fails.
 *
 * Both functions here take a ROUTE ID (a slug like `almajlis-arabian-restaurant`)
 * because that is what the console holds, and both used to pass it straight into
 * `image_references.restaurant_id`, which is a uuid column. PostgREST answered
 * every read with `22P02 invalid input syntax for type uuid` — swallowed by the
 * caller's empty catch, so the panel reported "0 photos" for a question it had
 * never successfully asked. The slug is resolved here, once, the same way the
 * menu and offers repositories do it.
 */

const BUCKET = 'restaurant-images';
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];

export class PhotoUploadError extends Error {}

export async function uploadRestaurantImage(
  restaurantId: string,
  file: File,
): Promise<string> {
  const supabase = await getSupabase();
  if (!supabase) throw new PhotoUploadError('Storage backend is not configured.');

  const rawExt = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : 'jpg';
  const safeName = `${restaurantId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(safeName, file, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
      cacheControl: '3600',
    });
  if (upErr) throw new PhotoUploadError(upErr.message);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(safeName);
  const imageUrl = urlData.publicUrl;

  const uuid = await resolveRestaurantUuid(restaurantId);
  if (!uuid) throw new PhotoUploadError('This restaurant could not be found in the catalogue.');

  const { error: insErr } = await supabase
    .from('image_references')
    .insert({ restaurant_id: uuid, image_url: imageUrl, source: 'owner_upload', status: 'ACTIVE' });
  if (insErr) {
    throw new PhotoUploadError(
      insErr.message.includes('policy')
        ? 'You are not permitted to upload photos for this restaurant.'
        : insErr.message,
    );
  }
  return imageUrl;
}

export async function fetchOwnerImages(restaurantId: string): Promise<ImageReferencesRow[]> {
  if (!isSupabaseConfigured()) return [];
  const uuid = await resolveRestaurantUuid(restaurantId);
  if (!uuid) return [];
  return selectImagesForRestaurant(uuid, ['ACTIVE', 'PENDING']);
}
