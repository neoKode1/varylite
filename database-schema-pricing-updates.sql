-- Database Schema Updates for Three-Tier Pricing System
-- Run these commands in your Supabase SQL editor

-- Add tier and usage tracking columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS monthly_generations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_generations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS overage_charges DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create user_usage_tracking table for detailed usage logs
CREATE TABLE IF NOT EXISTS public.user_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  model TEXT NOT NULL,
  generation_type TEXT CHECK (generation_type IN ('image', 'video')) NOT NULL,
  cost DECIMAL(10,4) NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'premium')),
  is_overage BOOLEAN DEFAULT FALSE,
  overage_charge DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tier_limits table for configurable pricing
CREATE TABLE IF NOT EXISTS public.tier_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT UNIQUE NOT NULL CHECK (tier IN ('free', 'pro', 'premium')),
  monthly_generations INTEGER NOT NULL,
  daily_generations INTEGER NOT NULL,
  allowed_models JSONB NOT NULL,
  overage_rate DECIMAL(10,4) NOT NULL,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_costs table for configurable model pricing
CREATE TABLE IF NOT EXISTS public.model_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT UNIQUE NOT NULL,
  cost_per_generation DECIMAL(10,4) NOT NULL,
  allowed_tiers JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tier limits
INSERT INTO public.tier_limits (tier, monthly_generations, daily_generations, allowed_models, overage_rate, price) VALUES
('free', 0, 0, '["nano-banana", "runway-t2i", "minimax-2.0", "kling-2.1-master", "veo3-fast", "runway-video", "seedance-pro"]', 0.05, NULL),
('light', 50, 20, '["nano-banana", "runway-t2i", "minimax-2.0", "kling-2.1-master", "veo3-fast", "runway-video"]', 0.05, 14.99),
('heavy', 100, 50, '["nano-banana", "runway-t2i", "minimax-2.0", "kling-2.1-master", "veo3-fast", "runway-video", "seedance-pro"]', 0.04, 19.99)
ON CONFLICT (tier) DO UPDATE SET
  monthly_generations = EXCLUDED.monthly_generations,
  daily_generations = EXCLUDED.daily_generations,
  allowed_models = EXCLUDED.allowed_models,
  overage_rate = EXCLUDED.overage_rate,
  price = EXCLUDED.price,
  updated_at = NOW();

-- Insert default model costs
INSERT INTO public.model_costs (model_name, cost_per_generation, allowed_tiers) VALUES
('nano-banana', 0.0398, '["free", "pro", "premium"]'),
('runway-t2i', 0.0398, '["free", "pro", "premium"]'),
('veo3-fast', 0.15, '["free", "pro", "premium"]'),
('minimax-2.0', 0.0398, '["free", "pro", "premium"]'),
('kling-2.1-master', 0.0398, '["free", "pro", "premium"]'),
('runway-video', 0.15, '["free", "pro", "premium"]'),
('seedance-pro', 2.50, '["premium"]')
ON CONFLICT (model_name) DO UPDATE SET
  cost_per_generation = EXCLUDED.cost_per_generation,
  allowed_tiers = EXCLUDED.allowed_tiers,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_user_id ON public.user_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_created_at ON public.user_usage_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_tier ON public.user_usage_tracking(tier);
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);

-- Create function to reset daily usage counters
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET daily_generations = 0, last_reset_date = NOW()
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET monthly_generations = 0, last_reset_date = NOW()
  WHERE DATE_TRUNC('month', last_reset_date) < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Create function to increment user usage counters
CREATE OR REPLACE FUNCTION increment_user_usage(
  user_id UUID,
  overage_charge DECIMAL(10,2) DEFAULT 0.00
)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET 
    monthly_generations = monthly_generations + 1,
    daily_generations = daily_generations + 1,
    overage_charges = overage_charges + overage_charge,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user can generate
CREATE OR REPLACE FUNCTION can_user_generate(
  p_user_id UUID,
  p_model TEXT
)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  tier_limit RECORD;
  model_cost RECORD;
  result JSONB;
BEGIN
  -- Get user information
  SELECT tier, monthly_generations, daily_generations, subscription_status
  INTO user_record
  FROM public.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'reason', 'User not found',
      'tier', 'free',
      'remainingGenerations', 0,
      'isOverage', false,
      'overageRate', 0
    );
  END IF;
  
  -- Get tier limits
  SELECT monthly_generations, daily_generations, allowed_models, overage_rate
  INTO tier_limit
  FROM public.tier_limits
  WHERE tier = user_record.tier AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'reason', 'Tier not found',
      'tier', user_record.tier,
      'remainingGenerations', 0,
      'isOverage', false,
      'overageRate', 0
    );
  END IF;
  
  -- Check if model is allowed for this tier
  IF NOT (tier_limit.allowed_models ? p_model) THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'reason', 'Model not allowed for this tier',
      'tier', user_record.tier,
      'remainingGenerations', 0,
      'isOverage', false,
      'overageRate', 0
    );
  END IF;
  
  -- Check subscription status
  IF user_record.subscription_status != 'active' AND user_record.tier != 'free' THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'reason', 'Subscription inactive',
      'tier', user_record.tier,
      'remainingGenerations', 0,
      'isOverage', false,
      'overageRate', 0
    );
  END IF;
  
  -- Check daily and monthly limits
  IF user_record.daily_generations >= tier_limit.daily_generations THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'reason', 'Daily limit reached',
      'tier', user_record.tier,
      'remainingGenerations', 0,
      'isOverage', false,
      'overageRate', 0
    );
  END IF;
  
  IF user_record.monthly_generations >= tier_limit.monthly_generations THEN
    RETURN jsonb_build_object(
      'canGenerate', true,
      'reason', 'Monthly limit reached, but can use overage',
      'tier', user_record.tier,
      'remainingGenerations', 0,
      'isOverage', true,
      'overageRate', tier_limit.overage_rate
    );
  END IF;
  
  -- User can generate
  RETURN jsonb_build_object(
    'canGenerate', true,
    'reason', 'Within limits',
    'tier', user_record.tier,
    'remainingGenerations', tier_limit.monthly_generations - user_record.monthly_generations,
    'isOverage', false,
    'overageRate', tier_limit.overage_rate
  );
END;
$$ LANGUAGE plpgsql;
