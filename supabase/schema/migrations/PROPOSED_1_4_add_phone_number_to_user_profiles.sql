-- PROPOSED_1_4_add_phone_number_to_user_profiles.sql
-- Add phone_number column to user_profiles table for storing the user's phone number
-- This is required for the phone-first authentication system.

ALTER TABLE user_profiles ADD COLUMN phone_number TEXT;
