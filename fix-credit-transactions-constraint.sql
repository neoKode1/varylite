-- Fix credit_transactions table constraint
-- Run this if you get "violates check constraint" error

-- Drop the existing constraint
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Add the correct constraint with all allowed values
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN ('credit_added', 'credit_used', 'refund', 'bonus', 'purchase', 'migration'));

-- Verify the constraint was updated
SELECT 
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.credit_transactions'::regclass 
AND conname = 'credit_transactions_transaction_type_check';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ credit_transactions constraint updated successfully!';
    RAISE NOTICE '📊 Allowed values: credit_added, credit_used, refund, bonus, purchase, migration';
END $$;
