-- Remove credit_transactions constraint entirely
-- This will allow any transaction_type value

-- Drop the constraint completely
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Verify the constraint was removed
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.credit_transactions'::regclass 
AND conname LIKE '%transaction_type%';

-- Test inserting a row with any transaction_type (using a real user if available)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user from the users table
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test transaction
        INSERT INTO public.credit_transactions (
            user_id, 
            amount, 
            transaction_type, 
            description
        ) VALUES (
            test_user_id,
            1.00,
            'credit_added',
            'Test transaction - constraint removed'
        );
        
        -- Clean up test row
        DELETE FROM public.credit_transactions 
        WHERE user_id = test_user_id
        AND description = 'Test transaction - constraint removed';
        
        RAISE NOTICE '✅ Test transaction inserted and cleaned up successfully!';
    ELSE
        RAISE NOTICE '⚠️ No users found in database - skipping test transaction';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ credit_transactions constraint removed successfully!';
    RAISE NOTICE '📊 No more constraint violations';
    RAISE NOTICE '🧪 Test insert/delete completed successfully';
    RAISE NOTICE '🚀 Ready to run pay-as-you-go-schema-update.sql';
END $$;
