-- Check total system credits available for distribution
SELECT 
    'System Credit Balance' as metric,
    SUM(credit_balance) as total_credits,
    COUNT(*) as user_count,
    ROUND(SUM(credit_balance) / COUNT(*), 2) as credits_per_user
FROM public.users;

-- Show current credit distribution
SELECT 
    'Current Credit Distribution' as metric,
    COUNT(*) as users_with_credits,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits,
    AVG(credit_balance) as avg_credits,
    SUM(credit_balance) as total_credits
FROM public.users 
WHERE credit_balance > 0;
