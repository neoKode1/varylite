-- Pay-As-You-Go System Database Schema Updates
-- Run these commands in your Supabase SQL editor
-- NOTE: Run create-missing-tables.sql FIRST if you get table not found errors

-- =====================================================
-- 1. UPDATE EXISTING TABLES FOR PAY-AS-YOU-GO
-- =====================================================

-- Update tier_limits table to include new pricing tiers (if columns don't exist)
ALTER TABLE public.tier_limits 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly', 'per_generation')),
ADD COLUMN IF NOT EXISTS credits_included INTEGER DEFAULT 0;

-- Update users table to include credit balance (if columns don't exist)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS low_balance_threshold INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS last_credit_purchase TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_credits_purchased DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'pay_per_use';

-- =====================================================
-- 2. INSERT NEW PAY-AS-YOU-GO PRICING TIERS
-- =====================================================

-- Insert new pricing tiers
INSERT INTO public.tier_limits (tier, monthly_generations, daily_generations, allowed_models, overage_rate, price, billing_cycle, credits_included) VALUES
-- vARY Weekly: $5.99/week = 150 credits
('weekly_pro', 0, 0, '["nano-banana", "runway-t2i", "minimax-2.0", "kling-2.1-master", "veo3-fast", "runway-video"]', 0.04, 5.99, 'weekly', 150),

-- vARY Monthly: $14.99/month = 375 credits  
('monthly_pro', 0, 0, '["nano-banana", "runway-t2i", "minimax-2.0", "kling-2.1-master", "veo3-fast", "runway-video", "seedance-pro"]', 0.04, 14.99, 'monthly', 375),

-- Pay-Per-Use: No subscription, pay as you go
('pay_per_use', 0, 0, '["nano-banana", "runway-t2i", "minimax-2.0", "kling-2.1-master", "veo3-fast", "runway-video", "seedance-pro"]', 0.04, NULL, 'per_generation', 0)

ON CONFLICT (tier) DO UPDATE SET
  monthly_generations = EXCLUDED.monthly_generations,
  daily_generations = EXCLUDED.daily_generations,
  allowed_models = EXCLUDED.allowed_models,
  overage_rate = EXCLUDED.overage_rate,
  price = EXCLUDED.price,
  billing_cycle = EXCLUDED.billing_cycle,
  credits_included = EXCLUDED.credits_included,
  updated_at = NOW();

-- =====================================================
-- 3. UPDATE MODEL COSTS FOR CREDIT SYSTEM
-- =====================================================

-- Update model costs to reflect credit values (1 credit = $0.04)
INSERT INTO public.model_costs (model_name, cost_per_generation, category, display_name, allowed_tiers) VALUES
-- Basic models: 1 credit each
('nano-banana', 0.04, 'image', 'Nano Banana Edit', '["free", "weekly_pro", "monthly_pro", "pay_per_use"]'),
('runway-t2i', 0.04, 'image', 'Runway T2I', '["free", "weekly_pro", "monthly_pro", "pay_per_use"]'),
('minimax-2.0', 0.04, 'video', 'MiniMax 2.0', '["free", "weekly_pro", "monthly_pro", "pay_per_use"]'),
('kling-2.1-master', 0.04, 'video', 'Kling 2.1 Master', '["free", "weekly_pro", "monthly_pro", "pay_per_use"]'),

-- Premium models: 4 credits each
('veo3-fast', 0.16, 'video', 'VEO3 Fast', '["weekly_pro", "monthly_pro", "pay_per_use"]'),
('runway-video', 0.16, 'video', 'Runway Video', '["weekly_pro", "monthly_pro", "pay_per_use"]'),

-- Ultra-premium models: 63 credits each
('seedance-pro', 2.52, 'video', 'Seedance Pro', '["monthly_pro", "pay_per_use"]')

ON CONFLICT (model_name) DO UPDATE SET
  cost_per_generation = EXCLUDED.cost_per_generation,
  category = EXCLUDED.category,
  display_name = EXCLUDED.display_name,
  allowed_tiers = EXCLUDED.allowed_tiers,
  updated_at = NOW();

-- =====================================================
-- 4. CREATE CREDIT TRANSACTION FUNCTIONS
-- =====================================================

-- Function to add credits to user account
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id UUID,
  p_credits DECIMAL(10,2),
  p_transaction_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add credits to user balance
  UPDATE public.users 
  SET 
    credit_balance = credit_balance + p_credits,
    total_credits_purchased = total_credits_purchased + p_credits,
    last_credit_purchase = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the transaction
  INSERT INTO public.credit_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description
  ) VALUES (
    p_user_id, 
    'credit_added', 
    p_credits, 
    COALESCE(p_description, 'Credits added via ' || p_transaction_type)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use credits for generation
CREATE OR REPLACE FUNCTION use_user_credits_for_generation(
  p_user_id UUID,
  p_model_name TEXT,
  p_generation_type TEXT,
  p_generation_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_model_cost DECIMAL(10,2);
  v_user_balance DECIMAL(10,2);
  v_remaining_balance DECIMAL(10,2);
  v_low_balance_threshold INTEGER;
  result JSONB;
BEGIN
  -- Get model cost
  SELECT cost_per_generation INTO v_model_cost
  FROM public.model_costs
  WHERE model_name = p_model_name AND is_active = true;
  
  IF v_model_cost IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Model not found or inactive',
      'creditsUsed', 0,
      'remainingCredits', 0,
      'isLowBalance', false
    );
  END IF;
  
  -- Get user's current balance and threshold
  SELECT credit_balance, low_balance_threshold 
  INTO v_user_balance, v_low_balance_threshold
  FROM public.users
  WHERE id = p_user_id;
  
  IF v_user_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'creditsUsed', 0,
      'remainingCredits', 0,
      'isLowBalance', false
    );
  END IF;
  
  -- Check if user has sufficient credits
  IF v_user_balance < v_model_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'creditsUsed', 0,
      'remainingCredits', v_user_balance,
      'isLowBalance', v_user_balance <= v_low_balance_threshold
    );
  END IF;
  
  -- Deduct credits
  v_remaining_balance := v_user_balance - v_model_cost;
  
  UPDATE public.users
  SET 
    credit_balance = v_remaining_balance,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the usage
  INSERT INTO public.credit_usage_log (
    user_id,
    model_name,
    generation_type,
    credits_used,
    generation_id
  ) VALUES (
    p_user_id,
    p_model_name,
    p_generation_type,
    v_model_cost,
    p_generation_id
  );
  
  -- Log the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    model_name,
    generation_id,
    description
  ) VALUES (
    p_user_id,
    'credit_used',
    v_model_cost,
    p_model_name,
    p_generation_id,
    'Credits used for ' || p_model_name || ' generation'
  );
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'creditsUsed', v_model_cost,
    'remainingCredits', v_remaining_balance,
    'isLowBalance', v_remaining_balance <= v_low_balance_threshold,
    'error', NULL
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM,
      'creditsUsed', 0,
      'remainingCredits', 0,
      'isLowBalance', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE CREDIT NOTIFICATION FUNCTIONS
-- =====================================================

-- Function to check if user needs low balance notification
CREATE OR REPLACE FUNCTION check_low_balance_notification(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_balance DECIMAL(10,2);
  v_low_balance_threshold INTEGER;
  v_user_email TEXT;
  result JSONB;
BEGIN
  -- Get user's current balance and threshold
  SELECT u.credit_balance, u.low_balance_threshold, au.email
  INTO v_user_balance, v_low_balance_threshold, v_user_email
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  WHERE u.id = p_user_id;
  
  IF v_user_balance IS NULL THEN
    RETURN jsonb_build_object(
      'needsNotification', false,
      'reason', 'User not found',
      'currentBalance', 0,
      'threshold', 0,
      'userEmail', NULL
    );
  END IF;
  
  -- Check if balance is at or below threshold
  IF v_user_balance <= v_low_balance_threshold THEN
    RETURN jsonb_build_object(
      'needsNotification', true,
      'reason', 'Low balance',
      'currentBalance', v_user_balance,
      'threshold', v_low_balance_threshold,
      'userEmail', v_user_email,
      'message', 'You have ' || v_user_balance || ' credits remaining. Consider purchasing more credits to continue generating.'
    );
  ELSE
    RETURN jsonb_build_object(
      'needsNotification', false,
      'reason', 'Sufficient balance',
      'currentBalance', v_user_balance,
      'threshold', v_low_balance_threshold,
      'userEmail', v_user_email
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION use_user_credits_for_generation TO authenticated;
GRANT EXECUTE ON FUNCTION check_low_balance_notification TO authenticated;

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_credit_balance ON public.users(credit_balance);
CREATE INDEX IF NOT EXISTS idx_users_low_balance_threshold ON public.users(low_balance_threshold);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON public.credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_created_at ON public.credit_usage_log(created_at);

-- =====================================================
-- 8. INITIAL CREDIT ASSIGNMENT FOR EXISTING USERS
-- =====================================================

-- Give existing users 20 credits (500 Nano Banana generations) to start
UPDATE public.users 
SET 
  credit_balance = 20.00,
  tier = 'pay_per_use',
  updated_at = NOW()
WHERE credit_balance = 0.00;

-- Log the initial credit assignment
INSERT INTO public.credit_transactions (user_id, transaction_type, amount, description)
SELECT 
  id,
  'credit_added',
  20.00,
  'Initial credit assignment for pay-as-you-go migration'
FROM public.users
WHERE credit_balance = 20.00;
