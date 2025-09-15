-- 🎯 Equal Credit Distribution Script
-- Distributes $46.35 balance equally among 72 active users
-- Each user gets 64 credits (worth $0.6438)

-- First, let's see how many users we have
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users_30_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7_days
FROM public.users;

-- Check current credit balances
SELECT 
    COUNT(*) as users_with_credits,
    SUM(credit_balance) as total_credits_distributed,
    AVG(credit_balance) as average_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users 
WHERE credit_balance > 0;

-- Distribute 64 credits to all users
DO $$
DECLARE
    user_record RECORD;
    credits_to_add DECIMAL := 64.00;
    total_cost DECIMAL := 0;
    user_count INTEGER := 0;
BEGIN
    -- Loop through all users and add credits
    FOR user_record IN 
        SELECT id, email, created_at 
        FROM public.users 
        ORDER BY created_at ASC
    LOOP
        -- Add credits to user
        INSERT INTO public.credit_transactions (
            user_id,
            amount,
            transaction_type,
            description,
            created_at
        ) VALUES (
            user_record.id,
            credits_to_add,
            'credit_added',
            'Equal distribution of platform balance - 64 credits per user',
            NOW()
        );
        
        -- Update user's credit balance
        UPDATE public.users 
        SET 
            credit_balance = COALESCE(credit_balance, 0) + credits_to_add,
            total_credits_purchased = COALESCE(total_credits_purchased, 0) + credits_to_add,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        total_cost := total_cost + credits_to_add;
        user_count := user_count + 1;
        
        -- Log progress every 10 users
        IF user_count % 10 = 0 THEN
            RAISE NOTICE 'Processed % users, total cost: $%', user_count, (total_cost / 100);
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Credit distribution completed!';
    RAISE NOTICE '👥 Users processed: %', user_count;
    RAISE NOTICE '💰 Total credits distributed: %', total_cost;
    RAISE NOTICE '💵 Total cost: $%', (total_cost / 100);
    RAISE NOTICE '📊 Average per user: % credits ($%)', credits_to_add, (credits_to_add / 100);
END $$;

-- Verify the distribution
SELECT 
    'Distribution Summary' as summary,
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits_distributed,
    AVG(credit_balance) as average_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits,
    ROUND((SUM(credit_balance) / 100), 2) as total_value_dollars
FROM public.users;

-- Show recent credit transactions
SELECT 
    ct.user_id,
    u.email,
    ct.amount as credits_added,
    ct.transaction_type,
    ct.description,
    ct.created_at
FROM public.credit_transactions ct
JOIN public.users u ON ct.user_id = u.id
WHERE ct.description LIKE '%Equal distribution%'
ORDER BY ct.created_at DESC
LIMIT 10;

-- Check if any users have different credit amounts (should all be 64)
SELECT 
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;
