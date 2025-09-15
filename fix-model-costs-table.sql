-- Fix model_costs table - Add missing is_active column
-- Run this if you get "column is_active does not exist" error

-- Add is_active column to model_costs table
ALTER TABLE public.model_costs 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'model_costs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ is_active column added to model_costs table successfully!';
END $$;
