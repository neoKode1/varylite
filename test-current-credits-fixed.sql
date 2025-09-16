-- Test current credit balance for the test user
-- Run this in Supabase SQL Editor

-- First, check the structure of credit_transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_credits table
SELECT 
    'user_credits table' as source,
    user_id,
    balance,
    created_at,
    updated_at
FROM public.user_credits 
WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094';

-- Check users table credit_balance column
SELECT 
    'users table' as source,
    id as user_id,
    credit_balance as balance,
    created_at,
    updated_at
FROM public.users 
WHERE id = '237e93d3-2156-440e-9c0d-a012f26ba094';

-- Check recent credit transactions (using correct column names)
SELECT 
    'credit_transactions' as source,
    user_id,
    model_name,
    amount,
    balance_after,
    transaction_type,
    created_at
FROM public.credit_transactions 
WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094'
ORDER BY created_at DESC
LIMIT 5;

-- Summary of current credits
WITH user_credits_data AS (
    SELECT balance FROM public.user_credits WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094'
),
users_credit_data AS (
    SELECT credit_balance FROM public.users WHERE id = '237e93d3-2156-440e-9c0d-a012f26ba094'
)
SELECT 
    COALESCE((SELECT balance FROM user_credits_data), 0) as user_credits_balance,
    COALESCE((SELECT credit_balance FROM users_credit_data), 0) as users_table_balance,
    '237e93d3-2156-440e-9c0d-a012f26ba094' as test_user_id;
