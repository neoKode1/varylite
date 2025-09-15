-- Implement 48-Hour Credit Purchase Rule for New Users
-- This adds tracking and enforcement for new users

-- =====================================================
-- 1. ADD NEW USER TRACKING COLUMNS
-- =====================================================

-- Add columns to track new user behavior
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_generation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_new_user BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS grace_period_expires_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 2. CREATE FUNCTION TO CHECK USER GENERATION PERMISSION
-- =====================================================

CREATE OR REPLACE FUNCTION check_user_generation_permission(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  result JSONB;
BEGIN
  -- Get user information
  SELECT 
    id,
    credit_balance,
    first_generation_at,
    is_new_user,
    grace_period_expires_at,
    created_at
  INTO user_record
  FROM public.users 
  WHERE id = p_user_id;
  
  -- If user doesn't exist
  IF user_record IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'user_not_found',
      'message', 'User not found'
    );
  END IF;
  
  -- Check if user has sufficient credits
  IF user_record.credit_balance <= 0 THEN
    -- Check if user is in grace period
    IF user_record.is_new_user AND user_record.grace_period_expires_at IS NULL THEN
      -- Set grace period for new user (48 hours from first generation)
      UPDATE public.users 
      SET grace_period_expires_at = NOW() + INTERVAL '48 hours'
      WHERE id = p_user_id;
      
      RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'grace_period_started',
        'message', 'Grace period started - 48 hours to purchase credits',
        'grace_period_expires_at', NOW() + INTERVAL '48 hours'
      );
    END IF;
    
    -- Check if grace period has expired
    IF user_record.grace_period_expires_at IS NOT NULL AND NOW() > user_record.grace_period_expires_at THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'grace_period_expired',
        'message', 'Grace period expired - please purchase credits to continue',
        'grace_period_expires_at', user_record.grace_period_expires_at
      );
    END IF;
    
    -- User is in grace period
    IF user_record.grace_period_expires_at IS NOT NULL AND NOW() <= user_record.grace_period_expires_at THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'grace_period_active',
        'message', 'Grace period active - please purchase credits soon',
        'grace_period_expires_at', user_record.grace_period_expires_at,
        'time_remaining', EXTRACT(EPOCH FROM (user_record.grace_period_expires_at - NOW()))::INTEGER
      );
    END IF;
    
    -- No credits and no grace period
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'insufficient_credits',
      'message', 'Insufficient credits - please purchase credits to continue'
    );
  END IF;
  
  -- User has credits
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'sufficient_credits',
    'message', 'Generation allowed',
    'credit_balance', user_record.credit_balance
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE FUNCTION TO TRACK FIRST GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION track_user_first_generation(
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update first generation timestamp if not set
  UPDATE public.users 
  SET 
    first_generation_at = COALESCE(first_generation_at, NOW()),
    is_new_user = false
  WHERE id = p_user_id AND first_generation_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. UPDATE EXISTING USERS
-- =====================================================

-- Mark existing users as not new (they already have credits)
UPDATE public.users 
SET 
  is_new_user = false,
  first_generation_at = COALESCE(first_generation_at, created_at)
WHERE credit_balance > 0;

-- =====================================================
-- 5. CREATE NOTIFICATION FUNCTION FOR GRACE PERIOD
-- =====================================================

CREATE OR REPLACE FUNCTION notify_grace_period_warning(
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  time_remaining INTEGER;
BEGIN
  -- Get user information
  SELECT 
    id,
    email,
    grace_period_expires_at
  INTO user_record
  FROM public.users 
  WHERE id = p_user_id;
  
  IF user_record.grace_period_expires_at IS NOT NULL THEN
    time_remaining := EXTRACT(EPOCH FROM (user_record.grace_period_expires_at - NOW()))::INTEGER;
    
    -- Send notification if less than 24 hours remaining
    IF time_remaining <= 86400 AND time_remaining > 0 THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        p_user_id,
        'grace_period_warning',
        'Grace Period Ending Soon',
        'Your free trial expires in ' || ROUND(time_remaining / 3600, 1) || ' hours. Purchase credits to continue generating.',
        jsonb_build_object(
          'time_remaining', time_remaining,
          'grace_period_expires_at', user_record.grace_period_expires_at
        )
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_first_generation_at ON public.users(first_generation_at);
CREATE INDEX IF NOT EXISTS idx_users_grace_period_expires_at ON public.users(grace_period_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_is_new_user ON public.users(is_new_user);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 48-hour grace period system implemented!';
    RAISE NOTICE '📊 New users get 48 hours of free generation';
    RAISE NOTICE '⏰ Grace period starts on first generation';
    RAISE NOTICE '🔔 Notifications sent when grace period expires';
    RAISE NOTICE '🚀 Ready to enforce credit requirements';
END $$;
