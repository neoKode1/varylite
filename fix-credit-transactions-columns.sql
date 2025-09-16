-- Fix credit_transactions table - add missing columns
-- Run this in Supabase SQL Editor

-- Add the missing model_name column
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS model_name TEXT;

-- Add generation_id column
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS generation_id UUID;

-- Add metadata column
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ credit_transactions table columns added successfully!';
END $$;
