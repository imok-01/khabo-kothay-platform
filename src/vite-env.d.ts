/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Google Maps Platform JS API key (kept out of the repo). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Optional Places API (New) key — falls back to the Maps key when unset. */
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  /** Optional Supabase project URL — enables the Supabase repository layer. */
  readonly VITE_SUPABASE_URL?: string;
  /** Optional Supabase public anon key (client-safe; RLS must protect tables). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
