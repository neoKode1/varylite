-- 📊 Comprehensive Credit Monitoring Dashboard
-- Shows detailed credit information for all users

-- 1. OVERVIEW SUMMARY
SELECT 
    '📊 CREDIT SYSTEM OVERVIEW' as section,
    COUNT(*) as total_users,
    COUNT(CASE WHEN credit_balance > 0 THEN 1 END) as users_with_credits,
    COUNT(CASE WHEN credit_balance = 0 THEN 1 END) as users_with_zero_credits,
    COUNT(CASE WHEN credit_balance IS NULL THEN 1 END) as users_with_null_credits,
    SUM(COALESCE(credit_balance, 0)) as total_credits_in_system,
    ROUND(SUM(COALESCE(credit_balance, 0)) / 100, 2) as total_value_dollars,
    AVG(COALESCE(credit_balance, 0)) as average_credits_per_user,
    MIN(COALESCE(credit_balance, 0)) as min_credits,
    MAX(COALESCE(credit_balance, 0)) as max_credits
FROM public.users;

-- 2. CREDIT BALANCE DISTRIBUTION
WITH credit_ranges AS (
    SELECT 
        CASE 
            WHEN COALESCE(credit_balance, 0) = 0 THEN '0 credits'
            WHEN COALESCE(credit_balance, 0) BETWEEN 1 AND 10 THEN '1-10 credits'
            WHEN COALESCE(credit_balance, 0) BETWEEN 11 AND 25 THEN '11-25 credits'
            WHEN COALESCE(credit_balance, 0) BETWEEN 26 AND 50 THEN '26-50 credits'
            WHEN COALESCE(credit_balance, 0) BETWEEN 51 AND 100 THEN '51-100 credits'
            WHEN COALESCE(credit_balance, 0) BETWEEN 101 AND 200 THEN '101-200 credits'
            WHEN COALESCE(credit_balance, 0) BETWEEN 201 AND 500 THEN '201-500 credits'
            ELSE '500+ credits'
        END as credit_range,
        COALESCE(credit_balance, 0) as credits
    FROM public.users
)
SELECT 
    '💰 CREDIT BALANCE DISTRIBUTION' as section,
    credit_range,
    COUNT(*) as user_count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.users)), 1) as percentage_of_users,
    SUM(credits) as total_credits_in_range,
    ROUND(SUM(credits) / 100, 2) as value_in_range_dollars
FROM credit_ranges
GROUP BY credit_range
ORDER BY 
    CASE credit_range
        WHEN '0 credits' THEN 1
        WHEN '1-10 credits' THEN 2
        WHEN '11-25 credits' THEN 3
        WHEN '26-50 credits' THEN 4
        WHEN '51-100 credits' THEN 5
        WHEN '101-200 credits' THEN 6
        WHEN '201-500 credits' THEN 7
        ELSE 8
    END;

-- 3. DETAILED USER CREDIT LIST (Top 20 users with most credits)
SELECT 
    '👑 TOP 20 USERS BY CREDITS' as section,
    u.email,
    u.created_at::date as signup_date,
    COALESCE(u.credit_balance, 0) as current_credits,
    ROUND(COALESCE(u.credit_balance, 0) / 100, 2) as credit_value_dollars,
    COALESCE(u.total_credits_purchased, 0) as total_credits_ever_purchased,
    u.tier,
    CASE 
        WHEN COALESCE(u.credit_balance, 0) >= 100 THEN '🟢 High Balance'
        WHEN COALESCE(u.credit_balance, 0) >= 25 THEN '🟡 Medium Balance'
        WHEN COALESCE(u.credit_balance, 0) >= 1 THEN '🟠 Low Balance'
        ELSE '🔴 No Credits'
    END as balance_status,
    CASE 
        WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN '🆕 New User'
        WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN '📅 Recent User'
        ELSE '👤 Established User'
    END as user_age
FROM public.users u
ORDER BY COALESCE(u.credit_balance, 0) DESC, u.created_at DESC
LIMIT 20;

-- 4. USERS WITH LOW BALANCES (Need attention)
SELECT 
    '⚠️ USERS WITH LOW BALANCES' as section,
    u.email,
    u.created_at::date as signup_date,
    COALESCE(u.credit_balance, 0) as current_credits,
    ROUND(COALESCE(u.credit_balance, 0) / 100, 2) as credit_value_dollars,
    u.tier,
    CASE 
        WHEN COALESCE(u.credit_balance, 0) = 0 THEN '🔴 No Credits'
        WHEN COALESCE(u.credit_balance, 0) BETWEEN 1 AND 10 THEN '🟠 Very Low'
        WHEN COALESCE(u.credit_balance, 0) BETWEEN 11 AND 25 THEN '🟡 Low'
        ELSE '🟢 OK'
    END as urgency_level,
    CASE 
        WHEN COALESCE(u.credit_balance, 0) = 0 THEN 'Send purchase prompt immediately'
        WHEN COALESCE(u.credit_balance, 0) BETWEEN 1 AND 10 THEN 'Send low balance warning'
        WHEN COALESCE(u.credit_balance, 0) BETWEEN 11 AND 25 THEN 'Monitor closely'
        ELSE 'No action needed'
    END as recommended_action
FROM public.users u
WHERE COALESCE(u.credit_balance, 0) <= 25
ORDER BY COALESCE(u.credit_balance, 0) ASC, u.created_at DESC;

-- 5. RECENT CREDIT ACTIVITY
SELECT 
    '📈 RECENT CREDIT ACTIVITY' as section,
    ct.transaction_type,
    COUNT(*) as transaction_count,
    SUM(ct.amount) as total_credits_moved,
    ROUND(SUM(ct.amount) / 100, 2) as total_value_dollars,
    DATE(ct.created_at) as transaction_date
FROM public.credit_transactions ct
WHERE ct.created_at >= NOW() - INTERVAL '7 days'
GROUP BY ct.transaction_type, DATE(ct.created_at)
ORDER BY transaction_date DESC, ct.transaction_type;

-- 6. USER ACTIVITY VS CREDITS
WITH user_periods AS (
    SELECT 
        CASE 
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'Last 7 days'
            WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'Last 30 days'
            WHEN created_at >= NOW() - INTERVAL '90 days' THEN 'Last 90 days'
            ELSE 'Older than 90 days'
        END as signup_period,
        COALESCE(credit_balance, 0) as credits
    FROM public.users
)
SELECT 
    '📊 USER ACTIVITY ANALYSIS' as section,
    signup_period,
    COUNT(*) as user_count,
    AVG(credits) as avg_credits,
    SUM(credits) as total_credits,
    ROUND(SUM(credits) / 100, 2) as total_value_dollars
FROM user_periods
GROUP BY signup_period
ORDER BY 
    CASE signup_period
        WHEN 'Last 7 days' THEN 1
        WHEN 'Last 30 days' THEN 2
        WHEN 'Last 90 days' THEN 3
        ELSE 4
    END;

-- 7. QUICK CREDIT SUMMARY FOR ADMIN
SELECT 
    '🎯 ADMIN QUICK SUMMARY' as section,
    'Total Users' as metric,
    COUNT(*)::text as value
FROM public.users
UNION ALL
SELECT 
    '🎯 ADMIN QUICK SUMMARY' as section,
    'Users with Credits' as metric,
    COUNT(CASE WHEN COALESCE(credit_balance, 0) > 0 THEN 1 END)::text as value
FROM public.users
UNION ALL
SELECT 
    '🎯 ADMIN QUICK SUMMARY' as section,
    'Total Credits in System' as metric,
    SUM(COALESCE(credit_balance, 0))::text as value
FROM public.users
UNION ALL
SELECT 
    '🎯 ADMIN QUICK SUMMARY' as section,
    'Total Value ($)' as metric,
    ROUND(SUM(COALESCE(credit_balance, 0)) / 100, 2)::text as value
FROM public.users
UNION ALL
SELECT 
    '🎯 ADMIN QUICK SUMMARY' as section,
    'Users Needing Credits' as metric,
    COUNT(CASE WHEN COALESCE(credit_balance, 0) <= 25 THEN 1 END)::text as value
FROM public.users;
