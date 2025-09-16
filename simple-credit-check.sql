-- Simple credit check for the test user
-- Run this in Supabase SQL Editor

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

-- Check what columns exist in credit_transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_transactions' AND table_schema = 'public'
ORDER BY ordinal_position;