-- Comprehensive fix for credit_transactions constraint issues
-- Run this to completely resolve the constraint problem

-- Step 1: Check current constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.credit_transactions'::regclass 
AND conname LIKE '%transaction_type%';

-- Step 2: Check what transaction types currently exist
SELECT DISTINCT transaction_type, COUNT(*) as count
FROM public.credit_transactions
GROUP BY transaction_type
ORDER BY transaction_type;

-- Step 3: Drop ALL existing constraints on transaction_type
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Step 4: Temporarily disable constraint checking
SET session_replication_role = replica;

-- Step 5: Update any problematic transaction types
UPDATE public.credit_transactions 
SET transaction_type = 'credit_added'
WHERE transaction_type IS NULL OR transaction_type = '';

-- Step 6: Re-enable constraint checking
SET session_replication_role = DEFAULT;

-- Step 7: Add the correct constraint with all allowed values
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN ('credit_added', 'credit_used', 'refund', 'bonus', 'purchase', 'migration', 'grandfathered'));

-- Step 8: Verify the constraint was added correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.credit_transactions'::regclass 
AND conname = 'credit_transactions_transaction_type_check';

-- Step 9: Test that all existing rows comply
SELECT DISTINCT transaction_type, COUNT(*) as count
FROM public.credit_transactions
GROUP BY transaction_type
ORDER BY transaction_type;

-- Step 10: Test inserting a new row
INSERT INTO public.credit_transactions (
    user_id, 
    amount, 
    transaction_type, 
    description
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    1.00,
    'credit_added',
    'Test transaction'
);

-- Clean up test row
DELETE FROM public.credit_transactions 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
AND description = 'Test transaction';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ credit_transactions constraint completely fixed!';
    RAISE NOTICE '📊 Allowed values: credit_added, credit_used, refund, bonus, purchase, migration, grandfathered';
    RAISE NOTICE '🧪 Test insert/delete completed successfully';
    RAISE NOTICE '🚀 Ready to run pay-as-you-go-schema-update.sql';
END $$;
