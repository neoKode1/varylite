-- Check current system-wide credit balance and user count
SELECT 
    'System Credit Balance' as metric,
    SUM(credit_balance) as total_credits,
    COUNT(*) as user_count,
    ROUND(SUM(credit_balance) / COUNT(*), 2) as credits_per_user
FROM public.users 
WHERE credit_balance > 0;

-- Check users with credits
SELECT 
    'Users with Credits' as metric,
    COUNT(*) as count,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits,
    AVG(credit_balance) as avg_credits
FROM public.users 
WHERE credit_balance > 0;

-- Check all users (including those with 0 credits)
SELECT 
    'All Users' as metric,
    COUNT(*) as total_users,
    COUNT(CASE WHEN credit_balance > 0 THEN 1 END) as users_with_credits,
    COUNT(CASE WHEN credit_balance = 0 THEN 1 END) as users_without_credits
FROM public.users;
