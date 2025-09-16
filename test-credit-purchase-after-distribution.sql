-- Test credit purchase system after distribution
-- Check if users can now purchase credits

-- Check current user credit balances after distribution
SELECT 
    'User Credit Balances After Distribution' as test_type,
    id as user_id,
    email,
    credit_balance,
    CASE 
        WHEN credit_balance >= 50 THEN 'Can purchase high-value credits'
        WHEN credit_balance >= 20 THEN 'Can purchase medium-value credits'
        WHEN credit_balance >= 10 THEN 'Can purchase low-value credits'
        WHEN credit_balance >= 5 THEN 'Can purchase minimal credits'
        ELSE 'Cannot purchase credits'
    END as purchase_ability
FROM public.users 
ORDER BY credit_balance DESC
LIMIT 10;

-- Check credit purchase thresholds across all users
SELECT 
    'Credit Purchase Analysis After Distribution' as test_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN credit_balance >= 50 THEN 1 END) as can_purchase_50_credits,
    COUNT(CASE WHEN credit_balance >= 20 THEN 1 END) as can_purchase_20_credits,
    COUNT(CASE WHEN credit_balance >= 10 THEN 1 END) as can_purchase_10_credits,
    COUNT(CASE WHEN credit_balance >= 5 THEN 1 END) as can_purchase_5_credits,
    COUNT(CASE WHEN credit_balance > 0 THEN 1 END) as can_purchase_any_credits,
    COUNT(CASE WHEN credit_balance = 0 THEN 1 END) as cannot_purchase_credits
FROM public.users;

-- Check specific test user
SELECT 
    'Test User Credit Status' as test_type,
    id as user_id,
    email,
    credit_balance,
    CASE 
        WHEN credit_balance >= 10 THEN '✅ Can purchase credits'
        WHEN credit_balance >= 5 THEN '⚠️ Limited purchase options'
        WHEN credit_balance > 0 THEN '❌ Very limited options'
        ELSE '❌ Cannot purchase credits'
    END as purchase_status
FROM public.users 
WHERE email = 'trunkent@gmail.com';
