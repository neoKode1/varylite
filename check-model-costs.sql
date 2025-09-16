-- Check what models exist in the model_costs table
-- Run this in Supabase SQL Editor

SELECT 
    model_name,
    cost_per_generation,
    category,
    display_name,
    is_active,
    created_at
FROM public.model_costs 
ORDER BY model_name;

-- Check if seedream-4-edit exists
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'seedream-4-edit') 
        THEN 'EXISTS'
        ELSE 'NOT FOUND'
    END as seedream_4_edit_status;

-- Check for similar seedream models
SELECT model_name, cost_per_generation, is_active
FROM public.model_costs 
WHERE model_name LIKE '%seedream%'
ORDER BY model_name;
