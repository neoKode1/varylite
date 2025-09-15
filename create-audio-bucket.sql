-- Create audio bucket for Supabase Storage
-- This script sets up the audio bucket with proper policies for user uploads

-- Create the audio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/webm']
);

-- Create RLS policy for authenticated users to upload audio files
CREATE POLICY "Users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
);

-- Create RLS policy for authenticated users to view audio files
CREATE POLICY "Users can view audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
);

-- Create RLS policy for users to delete their own audio files
CREATE POLICY "Users can delete their own audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add storage_bucket column to image_uploads table if it doesn't exist
ALTER TABLE image_uploads 
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'images';

-- Update existing records to have the correct bucket
UPDATE image_uploads 
SET storage_bucket = 'images' 
WHERE storage_bucket IS NULL;

-- Create index on storage_bucket for better performance
CREATE INDEX IF NOT EXISTS idx_image_uploads_storage_bucket ON image_uploads(storage_bucket);

-- Create index on file_type for better performance
CREATE INDEX IF NOT EXISTS idx_image_uploads_file_type ON image_uploads(file_type);
