-- PROPOSED_1_5_auth_foundation.sql
-- Real SMS Auth Foundation - Database Changes
-- 
-- This migration adds the production authentication foundation:
-- 1. Trigger to auto-create user_profiles on auth.users insert
-- 2. Phone number column and unique constraint for user_profiles
-- 3. Enhanced roles table with restaurant_id for restaurant-scoped admins
-- 4. RLS policies for production user data protection

BEGIN;

-- ============================================================================
-- 1. Add phone_number column to user_profiles (if not exists) + unique constraint
-- ============================================================================
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_phone_number_unique 
    ON user_profiles (phone_number) 
    WHERE phone_number IS NOT NULL;

-- ============================================================================
-- 2. Add restaurant_id to roles table for restaurant-scoped admins
-- ============================================================================
ALTER TABLE roles 
    ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

-- Allow multiple roles per user but only one per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS roles_user_restaurant_unique 
    ON roles (user_id, role_name, restaurant_id) 
    WHERE restaurant_id IS NOT NULL;

-- Allow single global role per user (for user/executive roles)
CREATE UNIQUE INDEX IF NOT EXISTS roles_user_global_unique 
    ON roles (user_id, role_name) 
    WHERE restaurant_id IS NULL;

-- ============================================================================
-- 3. Trigger: Auto-create user_profiles on auth.users insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile with phone number and display name
    INSERT INTO public.user_profiles (user_id, display_name, phone_number)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. RLS Policies for Production User Data Protection
-- ============================================================================

-- user_profiles: Users can read/update their own profile
DROP POLICY IF EXISTS user_profiles_own ON user_profiles;
CREATE POLICY user_profiles_own ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_profiles_update ON user_profiles;
CREATE POLICY user_profiles_update ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- favorites: Users can manage their own favorites
DROP POLICY IF EXISTS favorites_own ON favorites;
CREATE POLICY favorites_own ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- saved_restaurants: Users can manage their own saves
DROP POLICY IF EXISTS saved_restaurants_own ON saved_restaurants;
CREATE POLICY saved_restaurants_own ON saved_restaurants
    FOR ALL USING (auth.uid() = user_id);

-- user_reviews: Users can read all (for display), write own
DROP POLICY IF EXISTS user_reviews_read ON user_reviews;
CREATE POLICY user_reviews_read ON user_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS user_reviews_write ON user_reviews;
CREATE POLICY user_reviews_write ON user_reviews
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- roles: Users can read their own roles
DROP POLICY IF EXISTS roles_own ON roles;
CREATE POLICY roles_own ON roles
    FOR SELECT USING (auth.uid() = user_id);

-- saved_restaurants: Users can manage their own saves
DROP POLICY IF EXISTS saved_restaurants_own ON saved_restaurants;
CREATE POLICY saved_restaurants_own ON saved_restaurants
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_roles_user_id ON roles (user_id);
CREATE INDEX IF NOT EXISTS idx_roles_restaurant_id ON roles (restaurant_id);

COMMIT;