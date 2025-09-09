-- Fix RLS policies to allow anonymous uploads for testing
-- This is more permissive than production but necessary for our current setup

-- Drop all existing storage policies
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated operations on images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own images" ON storage.objects;

-- Create very permissive policies for testing
-- Allow public read access
CREATE POLICY "Public read access for images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Allow ALL operations for the images bucket (very permissive for testing)
CREATE POLICY "Allow all operations on images" ON storage.objects
  FOR ALL USING (bucket_id = 'images');

-- This policy allows:
-- - Anonymous users to upload
-- - Anonymous users to read
-- - Anonymous users to update
-- - Anonymous users to delete
-- 
-- WARNING: This is very permissive and should only be used for testing!
-- In production, you would want more restrictive policies.
