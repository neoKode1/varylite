-- Fix Profile Schema - Add missing columns to users table
-- Run this in your Supabase SQL editor

-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS background_image TEXT;

-- Update the preferences column to include the new fields
-- This will merge with existing preferences
UPDATE public.users 
SET preferences = COALESCE(preferences, '{}'::jsonb) || '{
  "defaultModel": "runway-t2i",
  "defaultStyle": "realistic", 
  "notifications": true,
  "publicProfile": false,
  "toastyNotifications": true
}'::jsonb
WHERE preferences IS NULL OR preferences = '{}'::jsonb;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
