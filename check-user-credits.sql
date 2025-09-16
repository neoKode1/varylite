-- Check where user credits are actually stored
-- Run this in Supabase SQL Editor to see the current credit data

-- First, check the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_credits' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_credits table
SELECT 
    'user_credits table' as source,
    user_id,
    balance,
    created_at,
    updated_at
FROM public.user_credits 
WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094'
ORDER BY created_at DESC;

-- Check users table credit_balance column
SELECT 
    'users table' as source,
    id as user_id,
    email,
    credit_balance,
    tier,
    created_at
FROM public.users 
WHERE id = '237e93d3-2156-440e-9c0d-a012f26ba094';

-- Check all users with credits in either table
SELECT 
    'Summary' as source,
    COUNT(DISTINCT uc.user_id) as users_in_user_credits,
    COUNT(DISTINCT u.id) as users_in_users_table,
    SUM(uc.balance) as total_user_credits_balance,
    SUM(u.credit_balance) as total_users_credit_balance
FROM public.user_credits uc
FULL OUTER JOIN public.users u ON uc.user_id = u.id;

-- Check if the test user exists in either table
SELECT 
    'Test User Check' as source,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.user_credits WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094') 
        THEN 'EXISTS in user_credits'
        ELSE 'NOT in user_credits'
    END as user_credits_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.users WHERE id = '237e93d3-2156-440e-9c0d-a012f26ba094') 
        THEN 'EXISTS in users'
        ELSE 'NOT in users'
    END as users_table_status;
