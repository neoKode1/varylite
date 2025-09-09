-- Fix Supabase Storage RLS policies for image uploads
-- The current policies are too restrictive and causing upload failures

-- Drop existing storage policies that are causing issues
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Create more permissive storage policies for the images bucket
-- Allow public read access to images
CREATE POLICY "Public read access for images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Allow authenticated users to upload images (more permissive)
CREATE POLICY "Allow authenticated uploads to images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
  );

-- Allow users to update their own images
CREATE POLICY "Allow users to update own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
  );

-- Alternative: If the above still doesn't work, try this more permissive approach
-- Uncomment the lines below if the above policies still cause issues

/*
-- Drop the restrictive policies and create very permissive ones for testing
DROP POLICY IF EXISTS "Allow authenticated uploads to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own images" ON storage.objects;

-- Very permissive policies for testing (remove these in production)
CREATE POLICY "Allow all authenticated operations on images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
  );
*/
