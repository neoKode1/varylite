-- Sync users from auth.users to public.users for analytics
-- This script properly handles the auth schema access

-- Create a function to sync users from auth to public schema
CREATE OR REPLACE FUNCTION sync_auth_users_to_public()
RETURNS TABLE (
  synced_count INTEGER,
  total_public_users INTEGER
) AS $$
DECLARE
  synced INTEGER := 0;
  total_public INTEGER;
BEGIN
  -- Insert users from auth.users into public.users if they don't exist
  INSERT INTO public.users (id, email, created_at, updated_at, preferences, usage_stats)
  SELECT 
    au.id,
    au.email,
    au.created_at,
    NOW() as updated_at,
    '{}'::jsonb as preferences,
    '{
      "total_generations": 0,
      "image_generations": 0,
      "video_generations": 0,
      "character_variations": 0,
      "background_changes": 0,
      "last_activity": null
    }'::jsonb as usage_stats
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  ON CONFLICT (id) DO NOTHING;
  
  -- Get count of synced users
  GET DIAGNOSTICS synced = ROW_COUNT;
  
  -- Get total count of public users
  SELECT COUNT(*) INTO total_public FROM public.users;
  
  RETURN QUERY SELECT synced, total_public;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_auth_users_to_public() TO authenticated;

-- Test the function
SELECT * FROM sync_auth_users_to_public();

-- Check current user counts
SELECT 
  'Current Status' as info,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.users) as missing_users;
