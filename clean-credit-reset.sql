-- 🔧 CLEAN CREDIT RESET SCRIPT
-- Resets all users to exactly 64 credits
-- Copy this entire script into a NEW Supabase query (don't save as snippet)

-- Step 1: Check current state
SELECT 
    'CURRENT STATE' as status,
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits_system,
    ROUND(SUM(credit_balance) / 100, 2) as total_value_dollars,
    AVG(credit_balance) as average_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users;

-- Step 2: Show current distribution
SELECT 
    'CURRENT DISTRIBUTION' as status,
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;

-- Step 3: Reset all users to exactly 64 credits
DO $$
DECLARE
    user_record RECORD;
    target_credits DECIMAL := 64.00;
    user_count INTEGER := 0;
    total_adjusted DECIMAL := 0;
BEGIN
    FOR user_record IN 
        SELECT id, email, COALESCE(credit_balance, 0) as current_credits
        FROM public.users 
        ORDER BY created_at ASC
    LOOP
        DECLARE
            credits_to_adjust DECIMAL := target_credits - user_record.current_credits;
        BEGIN
            IF credits_to_adjust != 0 THEN
                -- Create transaction record
                INSERT INTO public.credit_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    created_at
                ) VALUES (
                    user_record.id,
                    ABS(credits_to_adjust),
                    CASE WHEN credits_to_adjust > 0 THEN 'credit_added' ELSE 'credit_removed' END,
                    'Reset to standard 64 credits per user',
                    NOW()
                );
                
                -- Update user balance
                UPDATE public.users 
                SET 
                    credit_balance = target_credits,
                    updated_at = NOW()
                WHERE id = user_record.id;
                
                total_adjusted := total_adjusted + ABS(credits_to_adjust);
            END IF;
            
            user_count := user_count + 1;
            
            IF user_count % 10 = 0 THEN
                RAISE NOTICE 'Processed % users', user_count;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Reset completed! Users: %, Credits adjusted: %', user_count, total_adjusted;
END $$;

-- Step 4: Verify the reset
SELECT 
    'RESET VERIFICATION' as status,
    COUNT(*) as total_users,
    SUM(credit_balance) as total_credits_system,
    ROUND(SUM(credit_balance) / 100, 2) as total_value_dollars,
    AVG(credit_balance) as average_credits_per_user,
    MIN(credit_balance) as min_credits,
    MAX(credit_balance) as max_credits
FROM public.users;

-- Step 5: Final distribution check
SELECT 
    'FINAL DISTRIBUTION' as status,
    credit_balance,
    COUNT(*) as user_count
FROM public.users 
WHERE credit_balance > 0
GROUP BY credit_balance
ORDER BY credit_balance;
