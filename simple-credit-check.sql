-- Simple Credit Check - No Complex Logic
-- Copy this into a NEW Supabase query

-- Check current credits
SELECT 
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits,
    ROUND(SUM(credit_balance) / 100, 2) as total_dollars,
    AVG(credit_balance) as avg_credits,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users;

-- Show credit distribution
SELECT 
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;
