-- Complete User Analysis Schema for vARY Ai
-- This script creates comprehensive views and functions to analyze all user types
-- Run this once in your Supabase SQL Editor

-- =====================================================
-- 1. CREATE USER ANALYSIS VIEWS
-- =====================================================

-- View: Complete user information with authentication details
CREATE OR REPLACE VIEW user_analysis_complete AS
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.phone_confirmed_at,
    au.confirmed_at,
    au.recovery_sent_at,
    au.email_change_sent_at,
    au.new_email,
    au.invited_at,
    au.action_link,
    au.email_change,
    au.email_change_token_current,
    au.email_change_confirm_status,
    au.banned_until,
    au.reauthentication_token,
    au.reauthentication_sent_at,
    au.is_sso_user,
    au.deleted_at,
    au.is_anonymous,
    au.app_metadata,
    au.user_metadata,
    au.identities,
    au.aud,
    au.role,
    au.updated_at as auth_updated_at,
    -- Custom user table data
    pu.name,
    pu.profile_picture,
    pu.bio,
    pu.social_links,
    pu.preferences,
    pu.usage_stats,
    pu.tier,
    pu.monthly_generations,
    pu.daily_generations,
    pu.last_reset_date,
    pu.overage_charges,
    pu.subscription_status,
    pu.subscription_id,
    pu.tier_updated_at,
    pu.created_at as profile_created_at,
    pu.updated_at as profile_updated_at,
    -- Calculated fields
    CASE 
        WHEN au.email IS NOT NULL THEN 'authenticated'
        WHEN au.is_anonymous = true THEN 'anonymous'
        ELSE 'unknown'
    END as user_type,
    CASE 
        WHEN au.user_metadata->>'provider' = 'google' THEN 'google_oauth'
        WHEN au.user_metadata->>'provider' = 'github' THEN 'github_oauth'
        WHEN au.user_metadata->>'provider' = 'discord' THEN 'discord_oauth'
        WHEN au.app_metadata->>'provider' = 'email' THEN 'email_signup'
        ELSE 'other'
    END as auth_provider,
    -- Usage statistics
    COALESCE((pu.usage_stats->>'total_generations')::int, 0) as total_generations,
    COALESCE((pu.usage_stats->>'image_generations')::int, 0) as image_generations,
    COALESCE((pu.usage_stats->>'video_generations')::int, 0) as video_generations,
    COALESCE((pu.usage_stats->>'character_variations')::int, 0) as character_variations,
    COALESCE((pu.usage_stats->>'background_changes')::int, 0) as background_changes,
    pu.usage_stats->>'last_activity' as last_activity
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- View: User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    uac.auth_user_id,
    uac.email,
    uac.name,
    uac.user_type,
    uac.auth_provider,
    uac.tier,
    uac.total_generations,
    uac.image_generations,
    uac.video_generations,
    uac.auth_created_at,
    uac.last_sign_in_at,
    uac.last_activity,
    -- Gallery count
    COALESCE(g.gallery_count, 0) as gallery_items,
    -- Recent activity (last 30 days)
    CASE 
        WHEN uac.last_activity IS NOT NULL 
        AND uac.last_activity::timestamp > NOW() - INTERVAL '30 days' 
        THEN 'active'
        ELSE 'inactive'
    END as activity_status
FROM user_analysis_complete uac
LEFT JOIN (
    SELECT user_id, COUNT(*) as gallery_count
    FROM public.galleries
    GROUP BY user_id
) g ON uac.auth_user_id = g.user_id;

-- View: September 2025 users (matching your CSV period)
CREATE OR REPLACE VIEW september_2025_users AS
SELECT 
    uac.*,
    CASE 
        WHEN uac.auth_created_at >= '2025-09-01' AND uac.auth_created_at <= '2025-09-30' THEN 'created_in_september'
        WHEN uac.last_sign_in_at >= '2025-09-01' AND uac.last_sign_in_at <= '2025-09-30' THEN 'active_in_september'
        WHEN uac.last_activity IS NOT NULL 
        AND uac.last_activity::timestamp >= '2025-09-01' 
        AND uac.last_activity::timestamp <= '2025-09-30' THEN 'used_app_in_september'
        ELSE 'other'
    END as september_status
FROM user_analysis_complete uac
WHERE 
    (uac.auth_created_at >= '2025-09-01' AND uac.auth_created_at <= '2025-09-30')
    OR (uac.last_sign_in_at >= '2025-09-01' AND uac.last_sign_in_at <= '2025-09-30')
    OR (uac.last_activity IS NOT NULL 
        AND uac.last_activity::timestamp >= '2025-09-01' 
        AND uac.last_activity::timestamp <= '2025-09-30');

-- =====================================================
-- 2. CREATE ANALYSIS FUNCTIONS
-- =====================================================

-- Function: Find users by partial ID (for CSV matching)
CREATE OR REPLACE FUNCTION find_users_by_partial_id(partial_id TEXT)
RETURNS TABLE (
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    auth_provider TEXT,
    auth_created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    total_generations INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uac.auth_user_id,
        uac.email,
        uac.name,
        uac.auth_provider,
        uac.auth_created_at,
        uac.last_sign_in_at,
        uac.total_generations
    FROM user_analysis_complete uac
    WHERE uac.auth_user_id::TEXT LIKE '%' || partial_id || '%'
    ORDER BY uac.auth_created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS TABLE (
    metric TEXT,
    value BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_users'::TEXT, COUNT(*)::BIGINT FROM auth.users
    UNION ALL
    SELECT 'authenticated_users'::TEXT, COUNT(*)::BIGINT FROM auth.users WHERE email IS NOT NULL
    UNION ALL
    SELECT 'anonymous_users'::TEXT, COUNT(*)::BIGINT FROM auth.users WHERE is_anonymous = true
    UNION ALL
    SELECT 'google_oauth_users'::TEXT, COUNT(*)::BIGINT FROM auth.users WHERE user_metadata->>'provider' = 'google'
    UNION ALL
    SELECT 'september_2025_users'::TEXT, COUNT(*)::BIGINT FROM september_2025_users
    UNION ALL
    SELECT 'active_users_30_days'::TEXT, COUNT(*)::BIGINT FROM user_activity_summary WHERE activity_status = 'active'
    UNION ALL
    SELECT 'users_with_gallery'::TEXT, COUNT(*)::BIGINT FROM user_activity_summary WHERE gallery_items > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes on auth.users
CREATE INDEX IF NOT EXISTS idx_auth_users_created_at ON auth.users(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_last_sign_in ON auth.users(last_sign_in_at);
CREATE INDEX IF NOT EXISTS idx_auth_users_metadata_provider ON auth.users USING GIN ((user_metadata->>'provider'));

-- Indexes on public.users
CREATE INDEX IF NOT EXISTS idx_public_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_public_users_tier ON public.users(tier);
CREATE INDEX IF NOT EXISTS idx_public_users_usage_stats ON public.users USING GIN (usage_stats);

-- Indexes on galleries
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON public.galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON public.galleries(created_at);

-- =====================================================
-- 4. CREATE HELPFUL QUERIES FOR CSV MATCHING
-- =====================================================

-- Query 1: Find users that match your CSV data patterns
CREATE OR REPLACE VIEW csv_user_matches AS
SELECT 
    uac.auth_user_id,
    uac.email,
    uac.name,
    uac.auth_provider,
    uac.auth_created_at,
    uac.last_sign_in_at,
    uac.total_generations,
    uac.image_generations,
    uac.video_generations,
    -- Match patterns from your CSV
    CASE 
        WHEN uac.auth_provider = 'google_oauth' THEN 'matches: Playground google-oauth2|112566905261221994720'
        WHEN uac.auth_user_id::TEXT LIKE '66658723%' THEN 'matches: vary 66658723-******'
        WHEN uac.auth_created_at >= '2025-09-01' AND uac.auth_created_at <= '2025-09-30' THEN 'potential september user'
        ELSE 'other'
    END as csv_match_status
FROM user_analysis_complete uac
WHERE 
    uac.auth_provider = 'google_oauth'
    OR uac.auth_user_id::TEXT LIKE '66658723%'
    OR (uac.auth_created_at >= '2025-09-01' AND uac.auth_created_at <= '2025-09-30');

-- Query 2: User activity in September 2025
CREATE OR REPLACE VIEW september_user_activity AS
SELECT 
    uac.auth_user_id,
    uac.email,
    uac.name,
    uac.auth_provider,
    uac.total_generations,
    uac.image_generations,
    uac.video_generations,
    uac.auth_created_at,
    uac.last_sign_in_at,
    uac.last_activity,
    -- Gallery activity in September
    COALESCE(sept_gallery.gallery_count, 0) as september_gallery_items,
    -- Usage tracking in September
    COALESCE(sept_usage.usage_count, 0) as september_usage_events
FROM user_analysis_complete uac
LEFT JOIN (
    SELECT user_id, COUNT(*) as gallery_count
    FROM public.galleries
    WHERE created_at >= '2025-09-01' AND created_at <= '2025-09-30'
    GROUP BY user_id
) sept_gallery ON uac.auth_user_id = sept_gallery.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as usage_count
    FROM public.usage_tracking
    WHERE created_at >= '2025-09-01' AND created_at <= '2025-09-30'
    GROUP BY user_id
) sept_usage ON uac.auth_user_id = sept_usage.user_id
WHERE 
    uac.auth_created_at >= '2025-09-01' AND uac.auth_created_at <= '2025-09-30'
    OR uac.last_sign_in_at >= '2025-09-01' AND uac.last_sign_in_at <= '2025-09-30'
    OR uac.last_activity IS NOT NULL 
    AND uac.last_activity::timestamp >= '2025-09-01' 
    AND uac.last_activity::timestamp <= '2025-09-30';

-- =====================================================
-- 5. USAGE EXAMPLES
-- =====================================================

-- Example 1: Get all user statistics
-- SELECT * FROM get_user_statistics();

-- Example 2: Find users by partial ID (for CSV matching)
-- SELECT * FROM find_users_by_partial_id('66658723');

-- Example 3: View all September 2025 users
-- SELECT * FROM september_2025_users;

-- Example 4: View CSV matches
-- SELECT * FROM csv_user_matches;

-- Example 5: Complete user analysis
-- SELECT * FROM user_analysis_complete LIMIT 10;

-- Example 6: User activity summary
-- SELECT * FROM user_activity_summary ORDER BY total_generations DESC;

-- =====================================================
-- 6. CLEANUP FUNCTION (optional)
-- =====================================================

-- Function to drop all analysis views (if you need to recreate them)
CREATE OR REPLACE FUNCTION cleanup_user_analysis()
RETURNS VOID AS $$
BEGIN
    DROP VIEW IF EXISTS user_analysis_complete CASCADE;
    DROP VIEW IF EXISTS user_activity_summary CASCADE;
    DROP VIEW IF EXISTS september_2025_users CASCADE;
    DROP VIEW IF EXISTS csv_user_matches CASCADE;
    DROP VIEW IF EXISTS september_user_activity CASCADE;
    DROP FUNCTION IF EXISTS find_users_by_partial_id(TEXT);
    DROP FUNCTION IF EXISTS get_user_statistics();
    DROP FUNCTION IF EXISTS cleanup_user_analysis();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This script creates:
-- ✅ 5 comprehensive views for user analysis
-- ✅ 3 helpful functions for data querying
-- ✅ Multiple indexes for performance
-- ✅ Ready-to-use queries for CSV matching
-- ✅ Cleanup function for maintenance

-- To use this schema:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Use the example queries at the bottom
-- 3. Query the views directly for analysis
-- 4. Use functions for specific lookups

-- Key views to start with:
-- - user_analysis_complete: Complete user data
-- - csv_user_matches: Users matching your CSV patterns
-- - september_2025_users: Users active in September 2025
-- - user_activity_summary: Activity overview
