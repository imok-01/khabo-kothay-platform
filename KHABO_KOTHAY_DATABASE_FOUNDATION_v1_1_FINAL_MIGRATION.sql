-- KHABO KOTHAY DATABASE FOUNDATION v1.1
-- FINAL SUPABASE POSTGRESQL MIGRATION
-- STATUS: FINAL DRAFT AFTER ARCHITECTURE REVIEW
-- DO NOT EXECUTE WITHOUT FINAL HUMAN APPROVAL

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS

CREATE TYPE restaurant_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED',
    'UNKNOWN'
);

CREATE TYPE verification_status AS ENUM (
    'UNKNOWN',
    'SOURCE_VERIFIED',
    'RESTAURANT_CONFIRMED',
    'KK_VERIFIED',
    'STALE',
    'CONFLICTING'
);

CREATE TYPE lifecycle_status AS ENUM (
    'ACTIVE',
    'ARCHIVED',
    'REMOVED'
);

CREATE TYPE menu_status AS ENUM (
    'ACTIVE',
    'ARCHIVED',
    'UNKNOWN'
);

CREATE TYPE image_status AS ENUM (
    'ACTIVE',
    'PENDING',
    'REJECTED',
    'ARCHIVED'
);

CREATE TYPE change_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REMOVED'
);

-- RESTAURANT CORE

CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    city TEXT,
    area TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    phone TEXT,
    website TEXT,
    status restaurant_status DEFAULT 'UNKNOWN',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE restaurant_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    source_type TEXT NOT NULL,
    source_identifier TEXT,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE restaurant_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    alias_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(restaurant_id, alias_name)
);

CREATE TABLE restaurant_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    attribute_key TEXT NOT NULL,
    attribute_value JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(restaurant_id, attribute_key)
);

CREATE TABLE restaurant_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(restaurant_id, tag_name)
);

CREATE TABLE verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE RESTRICT,
    field_name TEXT,
    field_value JSONB,
    status verification_status DEFAULT 'UNKNOWN',
    verification_source TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MENU SYSTEM

CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    title TEXT,
    status menu_status DEFAULT 'UNKNOWN',
    source_id UUID REFERENCES restaurant_sources(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
    item_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE price_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    price DECIMAL,
    currency TEXT DEFAULT 'BDT',
    source_id UUID REFERENCES restaurant_sources(id) ON DELETE RESTRICT,
    observed_at TIMESTAMP DEFAULT NOW()
);

-- MEDIA

CREATE TABLE image_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    image_url TEXT NOT NULL,
    source TEXT,
    status image_status DEFAULT 'PENDING',
    change_request_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- REVIEWS

CREATE TABLE review_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    source TEXT,
    source_url TEXT,
    review_text TEXT,
    attribution TEXT,
    observed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE review_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    source TEXT,
    rating DECIMAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    review_count INTEGER,
    observed_at TIMESTAMP DEFAULT NOW()
);

-- USER FOUNDATION
-- Authentication handled by Supabase auth.users

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);

CREATE TABLE user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    rating DECIMAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    role_name TEXT NOT NULL
);


-- SAVED RESTAURANTS
-- User private save/bookmark system
-- Unlimited saves supported through application logic

CREATE TABLE saved_restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);

-- TRUST OPERATIONS

CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE RESTRICT,
    requested_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    request_type TEXT,
    request_data JSONB,
    status change_request_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT,
    entity_id UUID,
    action TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);


ALTER TABLE image_references
ADD CONSTRAINT fk_image_change_request
FOREIGN KEY (change_request_id)
REFERENCES change_requests(id)
ON DELETE RESTRICT;

-- INDEXES

CREATE INDEX idx_restaurants_name ON restaurants(name);
CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_sources_identifier ON restaurant_sources(source_identifier);
CREATE INDEX idx_menu_items_name ON menu_items(item_name);
CREATE INDEX idx_price_history ON price_observations(menu_item_id);
CREATE INDEX idx_review_signals_restaurant ON review_signals(restaurant_id);
CREATE INDEX idx_image_reference_restaurant ON image_references(restaurant_id);
CREATE INDEX idx_saved_restaurants_user ON saved_restaurants(user_id);

COMMIT;
