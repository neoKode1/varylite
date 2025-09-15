-- Fix model_costs table - Add missing allowed_tiers column
-- Run this if you get "column allowed_tiers does not exist" error

-- Add allowed_tiers column to model_costs table
ALTER TABLE public.model_costs 
ADD COLUMN IF NOT EXISTS allowed_tiers JSONB DEFAULT '[]'::jsonb;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'model_costs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ allowed_tiers column added to model_costs table successfully!';
    RAISE NOTICE '📊 Column type: JSONB with default value []';
END $$;
