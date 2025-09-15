-- Fix existing credit_transactions rows that violate the constraint
-- Run this if you get "constraint is violated by some row" error

-- First, let's see what transaction types exist in the table
SELECT DISTINCT transaction_type, COUNT(*) as count
FROM public.credit_transactions
GROUP BY transaction_type;

-- Update any invalid transaction types to valid ones
UPDATE public.credit_transactions 
SET transaction_type = 'credit_added'
WHERE transaction_type NOT IN ('credit_added', 'credit_used', 'refund', 'bonus', 'purchase', 'migration');

-- Now drop the existing constraint
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Add the correct constraint with all allowed values
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN ('credit_added', 'credit_used', 'refund', 'bonus', 'purchase', 'migration'));

-- Verify the constraint was updated and no violations exist
SELECT 
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.credit_transactions'::regclass 
AND conname = 'credit_transactions_transaction_type_check';

-- Check that all rows now comply with the constraint
SELECT DISTINCT transaction_type, COUNT(*) as count
FROM public.credit_transactions
GROUP BY transaction_type;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Existing credit_transactions rows fixed successfully!';
    RAISE NOTICE '📊 Constraint updated with all allowed values';
    RAISE NOTICE '🚀 Ready to run pay-as-you-go-schema-update.sql';
END $$;
