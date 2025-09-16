-- Distribute system-wide credits evenly across all users
-- This script calculates the total credits and distributes them equally

-- Step 1: Calculate total credits and user count
WITH credit_summary AS (
    SELECT 
        SUM(credit_balance) as total_credits,
        COUNT(*) as total_users,
        ROUND(SUM(credit_balance) / COUNT(*), 2) as credits_per_user
    FROM public.users
),
-- Step 2: Update all users with equal credit distribution
credit_distribution AS (
    UPDATE public.users 
    SET 
        credit_balance = (
            SELECT credits_per_user 
            FROM credit_summary
        ),
        updated_at = NOW()
    WHERE id IN (SELECT id FROM public.users)
    RETURNING id, credit_balance
)
-- Step 3: Show the results
SELECT 
    'Credit Distribution Complete' as status,
    (SELECT total_credits FROM credit_summary) as original_total_credits,
    (SELECT total_users FROM credit_summary) as total_users,
    (SELECT credits_per_user FROM credit_summary) as credits_per_user,
    COUNT(*) as users_updated,
    SUM(credit_balance) as new_total_credits
FROM credit_distribution;
