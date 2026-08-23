-- KHABO KOTHAY -- ADD address_display COLUMN TO restaurants
-- Migration to add address_display for premium address display

ALTER TABLE restaurants
  ADD COLUMN address_display TEXT NULL;
