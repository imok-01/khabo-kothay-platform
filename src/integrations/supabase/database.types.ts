/**
 * Khabo Kothay — Supabase database typing layer.
 *
 * This file is a TYPE-LEVEL mirror of the approved schema in
 * KHABO_KOTHAY_DATABASE_FOUNDATION_v1.1_FINAL_MIGRATION.sql. It exists so the
 * Supabase client (`@supabase/supabase-js`) can type-check every query
 * against the approved tables/columns/enums.
 *
 * RULES:
 *  - The SQL migration is the source of truth. If the schema changes, this
 *    file must be regenerated to match — do NOT edit the SQL to match this.
 *  - No product decisions live here; this is pure structure.
 *  - `Insert`/`Update` are deliberately Partial — server defaults
 *    (gen_random_uuid(), NOW(), enums) fill the rest.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ------------------------------------------------------------------ */
/* Enums (approved migration)                                          */
/* ------------------------------------------------------------------ */

export type RestaurantStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'UNKNOWN';

export type VerificationStatus =
  | 'UNKNOWN'
  | 'SOURCE_VERIFIED'
  | 'RESTAURANT_CONFIRMED'
  | 'KK_VERIFIED'
  | 'STALE'
  | 'CONFLICTING'
  // Added by migration v1.2 (PROPOSED_1_2_price_verification_contract.sql):
  // machine-extracted price awaiting review, and ambiguous price flagged for
  // review. Live enum verified as 8 values.
  | 'UNVERIFIED'
  | 'NEEDS_REVIEW';

export type LifecycleStatus = 'ACTIVE' | 'ARCHIVED' | 'REMOVED';

export type MenuStatus = 'ACTIVE' | 'ARCHIVED' | 'UNKNOWN';

export type ImageStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'ARCHIVED';

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';

/* ------------------------------------------------------------------ */
/* Row shapes (approved migration)                                     */
/* ------------------------------------------------------------------ */

export type RestaurantsRow = {
  id: string; // UUID
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  area: string | null;
  latitude: number | null; // DECIMAL
  longitude: number | null; // DECIMAL
  phone: string | null;
  website: string | null;
  status: RestaurantStatus;
  created_at: string | null;
  updated_at: string | null;
}

export type RestaurantSourcesRow = {
  id: string;
  restaurant_id: string;
  source_type: string; // e.g. 'google', 'website', 'facebook', 'delivery-platform'
  source_identifier: string | null; // e.g. Google Place ID
  source_url: string | null;
  created_at: string | null;
}

export type RestaurantAliasesRow = {
  id: string;
  restaurant_id: string;
  alias_name: string;
  created_at: string | null;
}

export type RestaurantAttributesRow = {
  id: string;
  restaurant_id: string;
  attribute_key: string;
  attribute_value: Json | null;
  created_at: string | null;
}

export type RestaurantTagsRow = {
  id: string;
  restaurant_id: string;
  tag_name: string;
  created_at: string | null;
}

export type VerificationRecordsRow = {
  id: string;
  restaurant_id: string | null;
  field_name: string | null;
  field_value: Json | null;
  status: VerificationStatus;
  verification_source: string | null;
  verified_at: string | null;
  created_at: string | null;
}

export type MenusRow = {
  id: string;
  restaurant_id: string;
  title: string | null;
  status: MenuStatus;
  source_id: string | null;
  created_at: string | null;
}

export type MenuItemsRow = {
  id: string;
  menu_id: string;
  item_name: string;
  description: string | null;
  category: string | null;
  created_at: string | null;
}

export type PriceObservationsRow = {
  id: string;
  menu_item_id: string;
  price: number | null; // DECIMAL — NULL means genuinely unknown
  currency: string | null;
  source_id: string | null;
  observed_at: string | null;
  // Migration v1.2 — provenance fields: the raw source string is preserved
  // verbatim (e.g. "Tk 494 / Tk 549") and the machine-extraction is marked
  // UNVERIFIED until reviewed; ambiguous extracts are NEEDS_REVIEW.
  raw_price: string | null;
  verification_status: VerificationStatus;
}

export type ImageReferencesRow = {
  id: string;
  restaurant_id: string;
  image_url: string;
  source: string | null;
  status: ImageStatus;
  change_request_id: string | null;
  created_at: string | null;
}

export type ReviewSamplesRow = {
  id: string;
  restaurant_id: string;
  source: string | null;
  source_url: string | null;
  review_text: string | null;
  attribution: string | null;
  observed_at: string | null;
  created_at: string | null;
}

export type ReviewSignalsRow = {
  id: string;
  restaurant_id: string;
  source: string | null;
  rating: number | null; // 0–5
  review_count: number | null;
  observed_at: string | null;
}

export type UserProfilesRow = {
  id: string;
  user_id: string; // references auth.users
  display_name: string | null;
  created_at: string | null;
}

export type FavoritesRow = {
  id: string;
  user_id: string; // references auth.users
  restaurant_id: string;
  created_at: string | null;
}

export type UserReviewsRow = {
  id: string;
  restaurant_id: string;
  user_id: string; // references auth.users
  rating: number | null;
  review_text: string | null;
  created_at: string | null;
}

export type RolesRow = {
  id: string;
  user_id: string;
  role_name: string;
}

export type SavedRestaurantsRow = {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string | null;
}

export type ChangeRequestsRow = {
  id: string;
  restaurant_id: string | null;
  requested_by: string | null;
  request_type: string | null;
  request_data: Json | null;
  status: ChangeRequestStatus;
  created_at: string | null;
}

export type AuditLogsRow = {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  performed_by: string | null;
  metadata: Json | null;
  created_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Database shape for supabase-js `createClient<Database>`             */
/* ------------------------------------------------------------------ */

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: RestaurantsRow;
        Insert: Partial<RestaurantsRow>;
        Update: Partial<RestaurantsRow>;
        Relationships: [];
      };
      restaurant_sources: {
        Row: RestaurantSourcesRow;
        Insert: Partial<RestaurantSourcesRow>;
        Update: Partial<RestaurantSourcesRow>;
        Relationships: [];
      };
      restaurant_aliases: {
        Row: RestaurantAliasesRow;
        Insert: Partial<RestaurantAliasesRow>;
        Update: Partial<RestaurantAliasesRow>;
        Relationships: [];
      };
      restaurant_attributes: {
        Row: RestaurantAttributesRow;
        Insert: Partial<RestaurantAttributesRow>;
        Update: Partial<RestaurantAttributesRow>;
        Relationships: [];
      };
      restaurant_tags: {
        Row: RestaurantTagsRow;
        Insert: Partial<RestaurantTagsRow>;
        Update: Partial<RestaurantTagsRow>;
        Relationships: [];
      };
      verification_records: {
        Row: VerificationRecordsRow;
        Insert: Partial<VerificationRecordsRow>;
        Update: Partial<VerificationRecordsRow>;
        Relationships: [];
      };
      menus: {
        Row: MenusRow;
        Insert: Partial<MenusRow>;
        Update: Partial<MenusRow>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItemsRow;
        Insert: Partial<MenuItemsRow>;
        Update: Partial<MenuItemsRow>;
        Relationships: [];
      };
      price_observations: {
        Row: PriceObservationsRow;
        Insert: Partial<PriceObservationsRow>;
        Update: Partial<PriceObservationsRow>;
        Relationships: [];
      };
      image_references: {
        Row: ImageReferencesRow;
        Insert: Partial<ImageReferencesRow>;
        Update: Partial<ImageReferencesRow>;
        Relationships: [];
      };
      review_samples: {
        Row: ReviewSamplesRow;
        Insert: Partial<ReviewSamplesRow>;
        Update: Partial<ReviewSamplesRow>;
        Relationships: [];
      };
      review_signals: {
        Row: ReviewSignalsRow;
        Insert: Partial<ReviewSignalsRow>;
        Update: Partial<ReviewSignalsRow>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfilesRow;
        Insert: Partial<UserProfilesRow>;
        Update: Partial<UserProfilesRow>;
        Relationships: [];
      };
      favorites: {
        Row: FavoritesRow;
        Insert: Partial<FavoritesRow>;
        Update: Partial<FavoritesRow>;
        Relationships: [];
      };
      user_reviews: {
        Row: UserReviewsRow;
        Insert: Partial<UserReviewsRow>;
        Update: Partial<UserReviewsRow>;
        Relationships: [];
      };
      roles: {
        Row: RolesRow;
        Insert: Partial<RolesRow>;
        Update: Partial<RolesRow>;
        Relationships: [];
      };
      saved_restaurants: {
        Row: SavedRestaurantsRow;
        Insert: Partial<SavedRestaurantsRow>;
        Update: Partial<SavedRestaurantsRow>;
        Relationships: [];
      };
      change_requests: {
        Row: ChangeRequestsRow;
        Insert: Partial<ChangeRequestsRow>;
        Update: Partial<ChangeRequestsRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogsRow;
        Insert: Partial<AuditLogsRow>;
        Update: Partial<AuditLogsRow>;
        Relationships: [];
      };
    };
    // NOTE: must be empty key sets, not Record<string, never> — a string
    // key space would make the Views/Functions overloads ambiguously match
    // table names and break insert typing.
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      restaurant_status: RestaurantStatus;
      verification_status: VerificationStatus;
      lifecycle_status: LifecycleStatus;
      menu_status: MenuStatus;
      image_status: ImageStatus;
      change_request_status: ChangeRequestStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
