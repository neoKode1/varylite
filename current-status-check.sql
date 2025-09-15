-- CURRENT STATUS CHECK
-- Simple script to see where we are right now

SELECT 
    'CURRENT STATUS' as info,
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits,
    ROUND(SUM(credit_balance) / 100, 2) as total_dollars,
    AVG(credit_balance) as avg_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users;

SELECT 
    'CREDIT DISTRIBUTION' as info,
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;
