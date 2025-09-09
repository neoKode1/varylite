-- Update User Analytics Script
-- This script checks and updates user statistics in the database

-- 1. Check current user count in users table
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
FROM public.users;

-- 2. Check auth.users table (Supabase's built-in auth table)
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_auth_users_24h
FROM auth.users;

-- 3. Check usage tracking statistics
SELECT 
    COUNT(*) as total_generations,
    COUNT(DISTINCT user_id) as unique_users_with_activity,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_activity
FROM public.usage_tracking;

-- 4. Check if there are users in auth.users but not in public.users
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    pu.id as public_user_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- 5. If needed, sync users from auth.users to public.users
-- This will create entries in public.users for any auth users that don't have them
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Final count check after sync
SELECT 
    'After sync' as status,
    COUNT(*) as total_users_in_public_users,
    (SELECT COUNT(*) FROM auth.users) as total_users_in_auth_users
FROM public.users;
