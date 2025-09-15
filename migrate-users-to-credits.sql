-- User Migration Script: Convert existing users to credit system
-- This script calculates and assigns initial credits based on usage patterns

-- =====================================================
-- 1. ANALYZE CURRENT USER USAGE PATTERNS
-- =====================================================

-- Create a temporary table to analyze user usage
CREATE TEMP TABLE user_usage_analysis AS
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    COUNT(ut.id) as total_generations,
    COUNT(CASE WHEN ut.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_generations_7d,
    COUNT(CASE WHEN ut.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_generations_30d,
    COALESCE(SUM(
        CASE 
            WHEN ut.service_used = 'nano_banana' THEN 0.04
            WHEN ut.service_used = 'runway_t2i' THEN 0.04
            WHEN ut.service_used = 'minimax_2.0' THEN 0.04
            WHEN ut.service_used = 'kling_2.1_master' THEN 0.04
            WHEN ut.service_used = 'veo3_fast' THEN 0.16
            WHEN ut.service_used = 'runway_video' THEN 0.16
            WHEN ut.service_used = 'seedance_pro' THEN 2.52
            ELSE 0.04 -- Default to basic model cost
        END
    ), 0) as estimated_cost_30d,
    MAX(ut.created_at) as last_activity
FROM public.users u
LEFT JOIN public.usage_tracking ut ON u.id = ut.user_id
GROUP BY u.id, u.email, u.created_at;

-- =====================================================
-- 2. CALCULATE INITIAL CREDIT ASSIGNMENTS
-- =====================================================

-- Create a function to calculate initial credits for a user
CREATE OR REPLACE FUNCTION calculate_initial_credits(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    user_analysis RECORD;
    initial_credits DECIMAL(10,2) := 20.00; -- Base credits for all users
    usage_multiplier DECIMAL(10,2) := 1.0;
    activity_bonus DECIMAL(10,2) := 0.0;
BEGIN
    -- Get user usage analysis
    SELECT * INTO user_analysis
    FROM user_usage_analysis
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN initial_credits; -- Default for users with no usage data
    END IF;
    
    -- Calculate usage multiplier based on recent activity
    IF user_analysis.recent_generations_30d > 0 THEN
        -- Active users get more credits
        usage_multiplier := 1.0 + (user_analysis.recent_generations_30d * 0.1);
        
        -- Cap the multiplier at 3.0 (max 60 credits)
        IF usage_multiplier > 3.0 THEN
            usage_multiplier := 3.0;
        END IF;
    END IF;
    
    -- Activity bonus for very active users
    IF user_analysis.recent_generations_30d >= 50 THEN
        activity_bonus := 20.00; -- Heavy users get bonus credits
    ELSIF user_analysis.recent_generations_30d >= 20 THEN
        activity_bonus := 10.00; -- Moderate users get some bonus
    END IF;
    
    -- Calculate final credits
    initial_credits := (initial_credits * usage_multiplier) + activity_bonus;
    
    -- Cap at 100 credits maximum
    IF initial_credits > 100.00 THEN
        initial_credits := 100.00;
    END IF;
    
    RETURN initial_credits;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. ASSIGN CREDITS TO ALL USERS
-- =====================================================

-- Update all users with calculated initial credits
UPDATE public.users 
SET 
    credit_balance = calculate_initial_credits(id),
    tier = 'pay_per_use',
    low_balance_threshold = 4,
    updated_at = NOW()
WHERE credit_balance = 0.00; -- Only update users who haven't been migrated yet

-- =====================================================
-- 4. LOG CREDIT ASSIGNMENTS
-- =====================================================

-- Log all credit assignments in the transaction table
INSERT INTO public.credit_transactions (user_id, transaction_type, amount, description)
SELECT 
    u.id,
    'credit_added',
    u.credit_balance,
    'Initial credit assignment for pay-as-you-go migration - calculated based on usage patterns'
FROM public.users u
WHERE u.credit_balance > 0.00 
AND u.credit_balance = calculate_initial_credits(u.id);

-- =====================================================
-- 5. CREATE MIGRATION SUMMARY REPORT
-- =====================================================

-- Create a view to show migration summary
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
    'Migration Summary' as report_type,
    COUNT(*) as total_users_migrated,
    ROUND(AVG(credit_balance), 2) as average_credits_assigned,
    ROUND(MIN(credit_balance), 2) as minimum_credits_assigned,
    ROUND(MAX(credit_balance), 2) as maximum_credits_assigned,
    ROUND(SUM(credit_balance), 2) as total_credits_assigned,
    COUNT(CASE WHEN credit_balance >= 50 THEN 1 END) as heavy_users,
    COUNT(CASE WHEN credit_balance >= 20 AND credit_balance < 50 THEN 1 END) as moderate_users,
    COUNT(CASE WHEN credit_balance < 20 THEN 1 END) as light_users
FROM public.users
WHERE credit_balance > 0.00;

-- =====================================================
-- 6. CREATE USER TIER RECOMMENDATIONS
-- =====================================================

-- Create a view to recommend tiers for users
CREATE OR REPLACE VIEW user_tier_recommendations AS
SELECT 
    u.id,
    u.email,
    u.credit_balance,
    ua.recent_generations_30d,
    ua.estimated_cost_30d,
    CASE 
        WHEN ua.recent_generations_30d >= 50 AND ua.estimated_cost_30d >= 20.00 THEN 'monthly_pro'
        WHEN ua.recent_generations_30d >= 20 AND ua.estimated_cost_30d >= 10.00 THEN 'weekly_pro'
        WHEN ua.recent_generations_30d >= 10 THEN 'weekly_pro'
        ELSE 'pay_per_use'
    END as recommended_tier,
    CASE 
        WHEN ua.recent_generations_30d >= 50 THEN 'Heavy user - Monthly Pro recommended'
        WHEN ua.recent_generations_30d >= 20 THEN 'Moderate user - Weekly Pro recommended'
        WHEN ua.recent_generations_30d >= 10 THEN 'Light user - Weekly Pro or Pay-per-use'
        ELSE 'New user - Pay-per-use recommended'
    END as recommendation_reason
FROM public.users u
JOIN user_usage_analysis ua ON u.id = ua.user_id
WHERE u.credit_balance > 0.00
ORDER BY ua.recent_generations_30d DESC;

-- =====================================================
-- 7. CLEANUP AND FINALIZATION
-- =====================================================

-- Drop temporary table and dependent views
DROP TABLE IF EXISTS user_usage_analysis CASCADE;

-- Drop the calculation function (no longer needed)
DROP FUNCTION calculate_initial_credits(UUID);

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the migration:

-- 1. Check migration summary
SELECT * FROM migration_summary;

-- 2. Check user tier recommendations (view not available)
-- SELECT * FROM user_tier_recommendations LIMIT 10;

-- 3. Check credit distribution
SELECT 
    CASE 
        WHEN credit_balance >= 50 THEN '50+ credits'
        WHEN credit_balance >= 20 THEN '20-49 credits'
        WHEN credit_balance >= 10 THEN '10-19 credits'
        ELSE 'Under 10 credits'
    END as credit_range,
    COUNT(*) as user_count,
    ROUND(AVG(credit_balance), 2) as avg_credits
FROM public.users
WHERE credit_balance > 0.00
GROUP BY 
    CASE 
        WHEN credit_balance >= 50 THEN '50+ credits'
        WHEN credit_balance >= 20 THEN '20-49 credits'
        WHEN credit_balance >= 10 THEN '10-19 credits'
        ELSE 'Under 10 credits'
    END
ORDER BY avg_credits DESC;

-- 4. Check recent credit transactions
SELECT 
    COUNT(*) as total_transactions,
    SUM(amount) as total_credits_added,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM public.credit_transactions
WHERE transaction_type = 'credit_added'
AND description LIKE '%pay-as-you-go migration%';
