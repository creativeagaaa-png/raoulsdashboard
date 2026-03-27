-- Migration: Add display_name column to settings table
-- Run this in the Supabase SQL Editor

ALTER TABLE settings ADD COLUMN IF NOT EXISTS display_name TEXT;
