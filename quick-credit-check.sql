-- Quick check of current credit balance
-- Run this in Supabase SQL Editor

SELECT 
    'users table' as source,
    id as user_id,
    credit_balance as balance,
    updated_at
FROM public.users 
WHERE id = '237e93d3-2156-440e-9c0d-a012f26ba094';

-- Check recent credit transactions
SELECT 
    'credit_transactions' as source,
    user_id,
    model_name,
    amount,
    transaction_type,
    created_at
FROM public.credit_transactions 
WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094'
ORDER BY created_at DESC
LIMIT 3;