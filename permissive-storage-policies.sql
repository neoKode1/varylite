-- Very permissive storage policies for testing
-- WARNING: These are for development/testing only!

-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated operations on images" ON storage.objects;

-- Create very permissive policies for testing
-- Allow public read access
CREATE POLICY "Public read access for images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Allow all operations for authenticated users (very permissive)
CREATE POLICY "Allow all authenticated operations on images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
  );

-- Alternative: Even more permissive for testing (uncomment if needed)
-- WARNING: This allows anyone to upload to your bucket!
/*
DROP POLICY IF EXISTS "Allow all authenticated operations on images" ON storage.objects;

CREATE POLICY "Allow all operations on images" ON storage.objects
  FOR ALL USING (bucket_id = 'images');
*/
