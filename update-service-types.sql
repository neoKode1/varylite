-- Update service_used constraint to include new video models
-- Run this in your Supabase SQL editor

-- First, drop the existing constraint
ALTER TABLE public.usage_tracking DROP CONSTRAINT IF EXISTS usage_tracking_service_used_check;

-- Add the new constraint with additional service types
ALTER TABLE public.usage_tracking ADD CONSTRAINT usage_tracking_service_used_check 
CHECK (service_used IN ('nano_banana', 'runway_aleph', 'minimax_endframe', 'gemini', 'veo3_fast', 'minimax_2.0'));

-- Update the database types in the code as well
-- The TypeScript types have already been updated in useUsageTracking.ts
