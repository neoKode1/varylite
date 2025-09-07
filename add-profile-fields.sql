-- Add bio and social_links fields to the users table
-- Run this in your Supabase SQL editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'AI enthusiast and creative explorer';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Update existing users with default values
UPDATE public.users 
SET 
  bio = 'AI enthusiast and creative explorer',
  social_links = '{}'
WHERE bio IS NULL OR social_links IS NULL;
