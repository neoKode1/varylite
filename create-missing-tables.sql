-- Create Missing Tables for Pay-As-You-Go System
-- Run this BEFORE running pay-as-you-go-schema-update.sql

-- =====================================================
-- 1. CREATE TIER_LIMITS TABLE
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
-- 2. CREATE MODEL_COSTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.model_costs (
  id SERIAL PRIMARY KEY,
  model_name TEXT UNIQUE NOT NULL,
  cost_per_generation DECIMAL(10,2) NOT NULL,
  allowed_tiers JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_active column if it doesn't exist (for existing tables)
ALTER TABLE public.model_costs 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- 3. CREATE CREDIT_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('credit_added', 'credit_used', 'refund', 'bonus')) NOT NULL,
  description TEXT,
  reference_id TEXT, -- Stripe payment intent ID or generation ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE CREDIT_USAGE_LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  model_name TEXT NOT NULL,
  generation_type TEXT CHECK (generation_type IN ('image', 'video')) NOT NULL,
  credits_used DECIMAL(10,2) NOT NULL,
  generation_id TEXT, -- Reference to the actual generation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE NOTIFICATIONS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('low_balance', 'critical_balance', 'purchase_confirmation', 'weekly_summary')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 6. ADD CREDIT COLUMNS TO USERS TABLE
-- =====================================================

-- Add credit-related columns to users table if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS low_balance_threshold INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS last_credit_purchase TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_credits_purchased DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'pay_per_use';

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for tier_limits
CREATE INDEX IF NOT EXISTS idx_tier_limits_tier ON public.tier_limits(tier);
CREATE INDEX IF NOT EXISTS idx_tier_limits_billing_cycle ON public.tier_limits(billing_cycle);

-- Indexes for model_costs
CREATE INDEX IF NOT EXISTS idx_model_costs_model_name ON public.model_costs(model_name);
CREATE INDEX IF NOT EXISTS idx_model_costs_is_active ON public.model_costs(is_active);

-- Indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);

-- Indexes for credit_usage_log
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON public.credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_model_name ON public.credit_usage_log(model_name);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_created_at ON public.credit_usage_log(created_at);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Indexes for users credit columns
CREATE INDEX IF NOT EXISTS idx_users_credit_balance ON public.users(credit_balance);
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. CREATE RLS POLICIES
-- =====================================================

-- tier_limits: Public read access
CREATE POLICY "tier_limits_read" ON public.tier_limits FOR SELECT USING (true);

-- model_costs: Public read access
CREATE POLICY "model_costs_read" ON public.model_costs FOR SELECT USING (true);

-- credit_transactions: Users can only see their own transactions
CREATE POLICY "credit_transactions_user_access" ON public.credit_transactions 
  FOR ALL USING (auth.uid() = user_id);

-- credit_usage_log: Users can only see their own usage
CREATE POLICY "credit_usage_log_user_access" ON public.credit_usage_log 
  FOR ALL USING (auth.uid() = user_id);

-- notifications: Users can only see their own notifications
CREATE POLICY "notifications_user_access" ON public.notifications 
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 10. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_tier_limits_updated_at BEFORE UPDATE ON public.tier_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_costs_updated_at BEFORE UPDATE ON public.model_costs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Missing tables created successfully!';
    RAISE NOTICE '📊 Tables created: tier_limits, model_costs, credit_transactions, credit_usage_log, notifications';
    RAISE NOTICE '🔒 Row Level Security enabled on all tables';
    RAISE NOTICE '📈 Performance indexes created';
    RAISE NOTICE '🚀 Ready to run pay-as-you-go-schema-update.sql';
END $$;
