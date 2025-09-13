-- Credit System Database Schema
-- This schema implements a credit-based system for grandfathering users

-- Add admin column to users table (if not exists)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create user_credits table for tracking user credit balances
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_credits DECIMAL(10,4) DEFAULT 0.00 NOT NULL,
  used_credits DECIMAL(10,4) DEFAULT 0.00 NOT NULL,
  available_credits DECIMAL(10,4) GENERATED ALWAYS AS (total_credits - used_credits) STORED,
  credit_type TEXT DEFAULT 'grandfathered' CHECK (credit_type IN ('grandfathered', 'purchased', 'bonus', 'refund')),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, credit_type)
);

-- Create credit_transactions table for tracking all credit movements
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_added', 'credit_used', 'credit_refunded', 'credit_expired')),
  amount DECIMAL(10,4) NOT NULL,
  model_name TEXT,
  generation_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_usage_log table for tracking model usage against credits
CREATE TABLE IF NOT EXISTS public.credit_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_name TEXT NOT NULL,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('image', 'video', 'character_variation')),
  credits_used DECIMAL(10,4) NOT NULL,
  generation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grandfathering_batch table for tracking the grandfathering process
CREATE TABLE IF NOT EXISTS public.grandfathering_batch (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_name TEXT NOT NULL,
  total_users INTEGER NOT NULL,
  total_budget DECIMAL(10,2) NOT NULL,
  credits_per_user DECIMAL(10,4) NOT NULL,
  processed_users INTEGER DEFAULT 0,
  successful_charges INTEGER DEFAULT 0,
  failed_charges INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_active ON public.user_credits(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON public.credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_model ON public.credit_usage_log(model_name);

-- Enable RLS for security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grandfathering_batch ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage log" ON public.credit_usage_log
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (for grandfathering process)
CREATE POLICY "Admins can manage all credits" ON public.user_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all transactions" ON public.credit_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage grandfathering batches" ON public.grandfathering_batch
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to add credits to a user
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id UUID,
  p_amount DECIMAL(10,4),
  p_credit_type TEXT DEFAULT 'grandfathered',
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_existing_credits DECIMAL(10,4);
BEGIN
  -- Check if user already has credits of this type
  SELECT total_credits INTO v_existing_credits
  FROM public.user_credits
  WHERE user_id = p_user_id AND credit_type = p_credit_type;
  
  IF v_existing_credits IS NOT NULL THEN
    -- Update existing credits
    UPDATE public.user_credits
    SET total_credits = total_credits + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND credit_type = p_credit_type;
  ELSE
    -- Insert new credits
    INSERT INTO public.user_credits (user_id, total_credits, credit_type)
    VALUES (p_user_id, p_amount, p_credit_type);
  END IF;
  
  -- Log the transaction
  INSERT INTO public.credit_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description
  ) VALUES (
    p_user_id, 
    'credit_added', 
    p_amount, 
    COALESCE(p_description, 'Credits added via ' || p_credit_type)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use credits for a generation
CREATE OR REPLACE FUNCTION use_user_credits(
  p_user_id UUID,
  p_model_name TEXT,
  p_generation_type TEXT,
  p_generation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_model_cost DECIMAL(10,4);
  v_available_credits DECIMAL(10,4);
BEGIN
  -- Get model cost from model_costs table
  SELECT cost_per_generation INTO v_model_cost
  FROM public.model_costs
  WHERE model_name = p_model_name AND is_active = true;
  
  IF v_model_cost IS NULL THEN
    RAISE EXCEPTION 'Model % not found or inactive', p_model_name;
  END IF;
  
  -- Check available credits
  SELECT available_credits INTO v_available_credits
  FROM public.user_credits
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_available_credits IS NULL OR v_available_credits < v_model_cost THEN
    RETURN FALSE; -- Insufficient credits
  END IF;
  
  -- Deduct credits
  UPDATE public.user_credits
  SET used_credits = used_credits + v_model_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
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
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION use_user_credits TO authenticated;
