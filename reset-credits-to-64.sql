-- 🔧 Credit Reset Script
-- Resets all users to exactly 64 credits (removes excess from multiple runs)

-- First, let's see the current state
SELECT 
    'CURRENT STATE' as status,
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits_system,
    ROUND(SUM(credit_balance) / 100, 2) as total_value_dollars,
    AVG(credit_balance) as average_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users;

-- Show current credit distribution
SELECT 
    'CURRENT DISTRIBUTION' as status,
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;

-- Reset all users to exactly 64 credits
DO $$
DECLARE
    user_record RECORD;
    target_credits DECIMAL := 64.00;
    user_count INTEGER := 0;
    total_reset_cost DECIMAL := 0;
BEGIN
    -- Loop through all users and reset to 64 credits
    FOR user_record IN 
        SELECT id, email, credit_balance
        FROM public.users 
        ORDER BY created_at ASC
    LOOP
        -- Calculate how many credits to add/remove to reach exactly 64
        DECLARE
            current_credits DECIMAL := COALESCE(user_record.credit_balance, 0);
            credits_to_adjust DECIMAL := target_credits - current_credits;
        BEGIN
            -- Only add credits if needed (don't remove credits)
            IF credits_to_adjust > 0 THEN
                -- Add credits to user
                INSERT INTO public.credit_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    created_at
                ) VALUES (
                    user_record.id,
                    credits_to_adjust,
                    'credit_added',
                    'Reset to standard 64 credits per user',
                    NOW()
                );
                
                -- Update user's credit balance
                UPDATE public.users 
                SET 
                    credit_balance = target_credits,
                    total_credits_purchased = COALESCE(total_credits_purchased, 0) + credits_to_adjust,
                    updated_at = NOW()
                WHERE id = user_record.id;
                
                total_reset_cost := total_reset_cost + credits_to_adjust;
            ELSIF credits_to_adjust < 0 THEN
                -- User has too many credits - reset to 64
                INSERT INTO public.credit_transactions (
                    user_id,
                    amount,
                    ABS(credits_to_adjust),
                    transaction_type,
                    description,
                    created_at
                ) VALUES (
                    user_record.id,
                    ABS(credits_to_adjust),
                    'credit_removed',
                    'Reset to standard 64 credits per user (removed excess)',
                    NOW()
                );
                
                -- Update user's credit balance
                UPDATE public.users 
                SET 
                    credit_balance = target_credits,
                    updated_at = NOW()
                WHERE id = user_record.id;
            END IF;
            
            user_count := user_count + 1;
            
            -- Log progress every 10 users
            IF user_count % 10 = 0 THEN
                RAISE NOTICE 'Processed % users, current user: %', user_count, user_record.email;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Credit reset completed!';
    RAISE NOTICE '👥 Users processed: %', user_count;
    RAISE NOTICE '💰 Total credits adjusted: %', total_reset_cost;
    RAISE NOTICE '💵 Total value adjusted: $%', (total_reset_cost / 100);
    RAISE NOTICE '📊 Target credits per user: %', target_credits;
END $$;

-- Verify the reset
SELECT 
    'RESET VERIFICATION' as status,
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits_system,
    ROUND(SUM(credit_balance) / 100, 2) as total_value_dollars,
    AVG(credit_balance) as average_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users;

-- Show final credit distribution (should all be 64)
SELECT 
    'FINAL DISTRIBUTION' as status,
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;

-- Show recent reset transactions
SELECT 
    'RECENT RESET TRANSACTIONS' as status,
    ct.user_id,
    u.email,
    ct.amount as credits_adjusted,
    ct.transaction_type,
    ct.description,
    ct.created_at
FROM public.credit_transactions ct
JOIN public.users u ON ct.user_id = u.id
WHERE ct.description LIKE '%Reset to standard%'
ORDER BY ct.created_at DESC
LIMIT 10;
