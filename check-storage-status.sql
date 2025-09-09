-- Check current storage status without making changes
-- This script shows the current state of your storage setup

-- 1. Check if images bucket exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'images') 
    THEN '✅ Images bucket exists'
    ELSE '❌ Images bucket missing'
  END as bucket_status;

-- 2. Show bucket details if it exists
SELECT 
  'Bucket Details' as info,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'images';

-- 3. Check if image_uploads table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_uploads' AND table_schema = 'public')
    THEN '✅ image_uploads table exists'
    ELSE '❌ image_uploads table missing'
  END as table_status;

-- 4. Show table structure if it exists
SELECT 
  'Table Structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'image_uploads' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check RLS policies on image_uploads table
SELECT 
  'RLS Policies' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'image_uploads' 
  AND schemaname = 'public';

-- 6. Check storage policies
SELECT 
  'Storage Policies' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%images%';

-- 7. Check current record count
SELECT 
  'Current Records' as info,
  COUNT(*) as total_uploads,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_uploads,
  COUNT(CASE WHEN is_processed = TRUE THEN 1 END) as processed_uploads
FROM public.image_uploads;

-- 8. Check storage usage
SELECT 
  'Storage Usage' as info,
  COUNT(*) as total_objects,
  COALESCE(SUM(metadata->>'size')::bigint, 0) as total_size_bytes,
  COALESCE(ROUND(SUM(metadata->>'size')::bigint / 1024.0 / 1024.0, 2), 0) as total_size_mb
FROM storage.objects 
WHERE bucket_id = 'images';
