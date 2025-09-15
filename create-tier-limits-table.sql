-- Create tier_limits table for Pay-As-You-Go System
-- Run this if you get "relation tier_limits does not exist" error

-- =====================================================
-- CREATE TIER_LIMITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tier_limits (
  id SERIAL PRIMARY KEY,
  tier TEXT UNIQUE NOT NULL,
  monthly_generations INTEGER DEFAULT 0,
  daily_generations INTEGER DEFAULT 0,
  allowed_models JSONB DEFAULT '[]'::jsonb,
  overage_rate DECIMAL(10,2) DEFAULT 0.00,
  price DECIMAL(10,2),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly', 'per_generation')),
  credits_included INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICY
-- =====================================================

-- Allow public read access to tier_limits
CREATE POLICY "tier_limits_read" ON public.tier_limits FOR SELECT USING (true);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tier_limits_tier ON public.tier_limits(tier);
CREATE INDEX IF NOT EXISTS idx_tier_limits_billing_cycle ON public.tier_limits(billing_cycle);

-- =====================================================
-- CREATE UPDATED_AT TRIGGER
-- =====================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger
CREATE TRIGGER update_tier_limits_updated_at BEFORE UPDATE ON public.tier_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFY TABLE CREATION
-- =====================================================

-- Check if table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tier_limits' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ tier_limits table created successfully!';
    RAISE NOTICE '🔒 Row Level Security enabled';
    RAISE NOTICE '📈 Indexes created';
    RAISE NOTICE '🚀 Ready to run pay-as-you-go-schema-update.sql';
END $$;
