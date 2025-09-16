-- Distribute ALL system credits evenly across ALL 76 users
-- This will give each user exactly 61.41 credits

-- Step 1: Calculate the distribution
WITH credit_calculation AS (
    SELECT 
        SUM(credit_balance) as total_system_credits,
        COUNT(*) as total_users,
        ROUND(SUM(credit_balance) / COUNT(*), 2) as credits_per_user
    FROM public.users
),
-- Step 2: Update ALL users with equal credit distribution
credit_distribution AS (
    UPDATE public.users 
    SET 
        credit_balance = (
            SELECT credits_per_user 
            FROM credit_calculation
        ),
        updated_at = NOW()
    WHERE id IN (SELECT id FROM public.users)
    RETURNING id, email, credit_balance
)
-- Step 3: Show the results
SELECT 
    'Credit Distribution Complete' as status,
    (SELECT total_system_credits FROM credit_calculation) as original_total_credits,
    (SELECT total_users FROM credit_calculation) as total_users,
    (SELECT credits_per_user FROM credit_calculation) as credits_per_user,
    COUNT(*) as users_updated,
    SUM(credit_balance) as new_total_credits,
    MIN(credit_balance) as min_credits_after,
    MAX(credit_balance) as max_credits_after
FROM credit_distribution;

-- Step 4: Verify the distribution
SELECT 
    'Verification' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN credit_balance = 61.41 THEN 1 END) as users_with_exact_amount,
    COUNT(CASE WHEN credit_balance != 61.41 THEN 1 END) as users_with_different_amount,
    SUM(credit_balance) as total_credits_after_distribution
FROM public.users;
