-- Test credit purchase system
-- Check if users have sufficient credits to purchase credits

-- Check current user credit balances
SELECT 
    'Current User Credits' as test_type,
    id as user_id,
    email,
    credit_balance,
    CASE 
        WHEN credit_balance >= 10 THEN 'Can purchase credits'
        WHEN credit_balance >= 5 THEN 'Can purchase some credits'
        WHEN credit_balance > 0 THEN 'Limited purchase options'
        ELSE 'Cannot purchase credits'
    END as purchase_ability
FROM public.users 
ORDER BY credit_balance DESC
LIMIT 10;

-- Check credit purchase thresholds
SELECT 
    'Credit Purchase Analysis' as test_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN credit_balance >= 10 THEN 1 END) as can_purchase_10_credits,
    COUNT(CASE WHEN credit_balance >= 5 THEN 1 END) as can_purchase_5_credits,
    COUNT(CASE WHEN credit_balance > 0 THEN 1 END) as can_purchase_any_credits,
    COUNT(CASE WHEN credit_balance = 0 THEN 1 END) as cannot_purchase_credits
FROM public.users;
