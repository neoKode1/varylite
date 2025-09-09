-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Create table for tracking image uploads
CREATE TABLE IF NOT EXISTS public.image_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  public_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
  is_processed BOOLEAN DEFAULT FALSE,
  fal_url TEXT, -- URL after upload to FAL storage
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_uploads_user_id ON public.image_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_created_at ON public.image_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_image_uploads_expires_at ON public.image_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_image_uploads_session_id ON public.image_uploads(session_id);

-- Create RLS policies
ALTER TABLE public.image_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY "Users can view own uploads" ON public.image_uploads
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can insert their own uploads
CREATE POLICY "Users can insert own uploads" ON public.image_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own uploads" ON public.image_uploads
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own uploads" ON public.image_uploads
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Storage policies
CREATE POLICY "Public read access for images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to automatically clean up expired images
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS void AS $$
BEGIN
  -- Delete expired image records
  DELETE FROM public.image_uploads 
  WHERE expires_at < NOW() AND is_processed = TRUE;
  
  -- Log cleanup activity
  INSERT INTO public.usage_tracking (session_id, action_type, service_used, metadata)
  VALUES (
    'system-cleanup',
    'image_generation',
    'nano_banana',
    jsonb_build_object(
      'action', 'cleanup_expired_images',
      'timestamp', NOW(),
      'cleaned_count', (SELECT COUNT(*) FROM public.image_uploads WHERE expires_at < NOW())
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled in Supabase
-- SELECT cron.schedule('cleanup-expired-images', '0 2 * * *', 'SELECT cleanup_expired_images();');

-- Function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE (
  total_files BIGINT,
  total_size BIGINT,
  files_today BIGINT,
  size_today BIGINT,
  avg_file_size NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_files,
    COALESCE(SUM(file_size), 0) as total_size,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as files_today,
    COALESCE(SUM(file_size) FILTER (WHERE created_at >= CURRENT_DATE), 0) as size_today,
    COALESCE(AVG(file_size), 0) as avg_file_size
  FROM public.image_uploads
  WHERE expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.image_uploads TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_images() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_storage_stats() TO anon, authenticated;
