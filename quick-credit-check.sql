-- 🚀 QUICK DAILY CREDIT CHECK
-- Lightweight script for daily monitoring of user credits
-- Run this daily to quickly see who needs attention

-- 1. QUICK OVERVIEW (Most Important Info)
SELECT 
    '📊 QUICK OVERVIEW' as section,
    COUNT(*) as total_users,
    COUNT(CASE WHEN COALESCE(credit_balance, 0) > 0 THEN 1 END) as users_with_credits,
    COUNT(CASE WHEN COALESCE(credit_balance, 0) <= 25 THEN 1 END) as users_needing_attention,
    SUM(COALESCE(credit_balance, 0)) as total_credits_system,
    ROUND(SUM(COALESCE(credit_balance, 0)) / 100, 2) as total_value_dollars
FROM public.users;

-- 2. USERS NEEDING IMMEDIATE ATTENTION (Priority List)
SELECT 
    '⚠️ NEEDS ATTENTION' as section,
    u.email,
    COALESCE(u.credit_balance, 0) as current_credits,
    ROUND(COALESCE(u.credit_balance, 0) / 100, 2) as credit_value_dollars,
    u.created_at::date as signup_date,
    CASE 
        WHEN COALESCE(u.credit_balance, 0) = 0 THEN '🔴 URGENT - No Credits'
        WHEN COALESCE(u.credit_balance, 0) BETWEEN 1 AND 10 THEN '🟠 HIGH - Very Low'
        WHEN COALESCE(u.credit_balance, 0) BETWEEN 11 AND 25 THEN '🟡 MEDIUM - Low'
        ELSE '🟢 OK'
    END as priority_level
FROM public.users u
WHERE COALESCE(u.credit_balance, 0) <= 25
ORDER BY COALESCE(u.credit_balance, 0) ASC, u.created_at DESC;

-- 3. TODAY'S CREDIT ACTIVITY (What happened today)
SELECT 
    '📈 TODAYS ACTIVITY' as section,
    ct.transaction_type,
    COUNT(*) as transactions_today,
    SUM(ct.amount) as credits_moved,
    ROUND(SUM(ct.amount) / 100, 2) as value_dollars
FROM public.credit_transactions ct
WHERE DATE(ct.created_at) = CURRENT_DATE
GROUP BY ct.transaction_type
ORDER BY SUM(ct.amount) DESC;

-- 4. NEW USERS THIS WEEK (Potential customers)
SELECT 
    '🆕 NEW USERS THIS WEEK' as section,
    COUNT(*) as new_users,
    AVG(COALESCE(credit_balance, 0)) as avg_credits_per_new_user,
    SUM(COALESCE(credit_balance, 0)) as total_credits_for_new_users
FROM public.users
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 5. ONE-LINE SUMMARY (Copy this for reports)
SELECT 
    '🎯 DAILY SUMMARY' as section,
    CONCAT(
        'Users: ', COUNT(*), 
        ' | With Credits: ', COUNT(CASE WHEN COALESCE(credit_balance, 0) > 0 THEN 1 END),
        ' | Need Attention: ', COUNT(CASE WHEN COALESCE(credit_balance, 0) <= 25 THEN 1 END),
        ' | Total Value: $', ROUND(SUM(COALESCE(credit_balance, 0)) / 100, 2)
    ) as summary
FROM public.users;
