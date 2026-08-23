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
  /** Enable the DEV-only internal simulation (isolated demo data). Never set in production. */
  readonly VITE_DEV_SIMULATION?: string;
  /** Development OTP mock — shows OTP in the UI instead of sending real SMS. */
  readonly VITE_DEV_AUTH_MOCK?: string;
  /** Explicit app environment: 'production' or 'development'. */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
