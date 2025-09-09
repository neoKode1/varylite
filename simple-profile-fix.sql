-- Simple Profile Schema Fix
-- Add missing columns to users table

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS background_image TEXT;
