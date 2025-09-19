-- Database Optimization Scripts for vARY Ai - Supabase Compatible
-- Run these in your Supabase SQL editor to improve performance

-- 1. Create optimized indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_credit_balance ON users(credit_balance) WHERE credit_balance IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_galleries_user_id_created_at ON galleries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_galleries_file_type ON galleries(file_type);
CREATE INDEX IF NOT EXISTS idx_galleries_user_id_file_type ON galleries(user_id, file_type);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_amount ON credit_transactions(amount);

CREATE INDEX IF NOT EXISTS idx_image_uploads_user_id ON image_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_session_id ON image_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_created_at ON image_uploads(created_at DESC);

-- 2. Create optimized functions for atomic credit operations
CREATE OR REPLACE FUNCTION deduct_user_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_model_name TEXT DEFAULT 'unknown'
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
  transaction_id UUID;
BEGIN
  -- Start transaction
  BEGIN
    -- Get current balance with row lock
    SELECT credit_balance INTO current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists
    IF current_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'User not found';
      RETURN;
    END IF;
    
    -- Check if sufficient credits
    IF current_balance < p_amount THEN
      RETURN QUERY SELECT FALSE, current_balance, NULL::UUID, 'Insufficient credits';
      RETURN;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_amount;
    
    -- Update user balance
    UPDATE users
    SET 
      credit_balance = new_balance,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create transaction record
    INSERT INTO credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      metadata
    ) VALUES (
      p_user_id,
      -p_amount,
      'deduction',
      p_description,
      jsonb_build_object('model_name', p_model_name, 'timestamp', NOW())
    ) RETURNING id INTO transaction_id;
    
    -- Return success
    RETURN QUERY SELECT TRUE, new_balance, transaction_id, NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT FALSE, 0, NULL::UUID, SQLERRM;
  END;
END;
$$;

-- 3. Create optimized function for adding credits
CREATE OR REPLACE FUNCTION add_user_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
  transaction_id UUID;
BEGIN
  BEGIN
    -- Get current balance with row lock
    SELECT COALESCE(credit_balance, 0) INTO current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists
    IF current_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'User not found';
      RETURN;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Update user balance
    UPDATE users
    SET 
      credit_balance = new_balance,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create transaction record
    INSERT INTO credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      metadata
    ) VALUES (
      p_user_id,
      p_amount,
      p_transaction_type,
      p_description,
      jsonb_build_object('timestamp', NOW())
    ) RETURNING id INTO transaction_id;
    
    -- Return success
    RETURN QUERY SELECT TRUE, new_balance, transaction_id, NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT FALSE, 0, NULL::UUID, SQLERRM;
  END;
END;
$$;

-- 4. Create optimized function for user generation permission check
CREATE OR REPLACE FUNCTION check_user_generation_permission_optimized(p_user_id UUID)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  message TEXT,
  credit_balance INTEGER,
  grace_period_expires_at TIMESTAMPTZ,
  time_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  grace_period_hours INTEGER := 48;
BEGIN
  -- Get user data with optimized query
  SELECT 
    id,
    email,
    created_at,
    first_generation_at,
    COALESCE(credit_balance, 0) as credit_balance,
    is_admin
  INTO user_record
  FROM users
  WHERE id = p_user_id;
  
  -- Check if user exists
  IF user_record.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'user_not_found', 'User not found', 0, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;
  
  -- Admin users have unlimited access
  IF user_record.is_admin OR user_record.email = '1deeptechnology@gmail.com' THEN
    RETURN QUERY SELECT TRUE, 'admin_access', 'Admin user', 999999, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;
  
  -- Check if user has credits
  IF user_record.credit_balance > 0 THEN
    RETURN QUERY SELECT TRUE, 'sufficient_credits', 'Sufficient credits available', user_record.credit_balance, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;
  
  -- Check grace period for new users
  IF user_record.first_generation_at IS NULL THEN
    -- New user - set first generation time and allow
    UPDATE users 
    SET first_generation_at = NOW()
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT TRUE, 'grace_period', 'New user grace period', 0, NOW() + INTERVAL '48 hours', 48 * 3600;
    RETURN;
  END IF;
  
  -- Check if still in grace period
  IF user_record.first_generation_at > NOW() - INTERVAL '48 hours' THEN
    DECLARE
      time_left INTEGER;
    BEGIN
      time_left := EXTRACT(EPOCH FROM (user_record.first_generation_at + INTERVAL '48 hours' - NOW()));
      RETURN QUERY SELECT TRUE, 'grace_period', 'Still in grace period', 0, user_record.first_generation_at + INTERVAL '48 hours', time_left;
      RETURN;
    END;
  END IF;
  
  -- No credits and grace period expired
  RETURN QUERY SELECT FALSE, 'no_credits', 'No credits available and grace period expired', 0, NULL::TIMESTAMPTZ, 0;
END;
$$;

-- 5. Create materialized view for user statistics (refreshed every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats_materialized AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.credit_balance,
  COUNT(g.id) as gallery_count,
  COUNT(CASE WHEN g.file_type = 'image' THEN 1 END) as image_count,
  COUNT(CASE WHEN g.file_type = 'video' THEN 1 END) as video_count,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'deduction' THEN ABS(ct.amount) ELSE 0 END), 0) as total_credits_used,
  COALESCE(SUM(CASE WHEN ct.transaction_type = 'purchase' THEN ct.amount ELSE 0 END), 0) as total_credits_purchased,
  MAX(g.created_at) as last_generation_at
FROM users u
LEFT JOIN galleries g ON u.id = g.user_id
LEFT JOIN credit_transactions ct ON u.id = ct.user_id
GROUP BY u.id, u.email, u.created_at, u.credit_balance;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_user_stats_id ON user_stats_materialized(id);
CREATE INDEX IF NOT EXISTS idx_user_stats_created_at ON user_stats_materialized(created_at);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_materialized;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to non-concurrent refresh if CONCURRENTLY fails
    REFRESH MATERIALIZED VIEW user_stats_materialized;
END;
$$;

-- 6. Create optimized RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own galleries" ON galleries;
DROP POLICY IF EXISTS "Users can insert own galleries" ON galleries;
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;

-- Create optimized policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own galleries" ON galleries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own galleries" ON galleries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Create cleanup function for old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up old image uploads (older than 30 days)
  DELETE FROM image_uploads 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Clean up old usage tracking (older than 90 days)
  DELETE FROM usage_tracking 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean up old credit transactions (older than 1 year, keep purchase records)
  DELETE FROM credit_transactions 
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND transaction_type != 'purchase';
  
  -- Update statistics
  ANALYZE users;
  ANALYZE galleries;
  ANALYZE credit_transactions;
  ANALYZE image_uploads;
END;
$$;

-- 8. Create function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(
  metric_name TEXT,
  metric_value BIGINT,
  metric_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_users'::TEXT, COUNT(*)::BIGINT, 'Total number of users'::TEXT FROM users
  UNION ALL
  SELECT 'active_users_today'::TEXT, COUNT(DISTINCT user_id)::BIGINT, 'Users who generated content today'::TEXT FROM galleries WHERE created_at >= CURRENT_DATE
  UNION ALL
  SELECT 'total_generations'::TEXT, COUNT(*)::BIGINT, 'Total generations created'::TEXT FROM galleries
  UNION ALL
  SELECT 'total_credits_used'::TEXT, COALESCE(SUM(ABS(amount)), 0)::BIGINT, 'Total credits consumed'::TEXT FROM credit_transactions WHERE transaction_type = 'deduction'
  UNION ALL
  SELECT 'total_credits_purchased'::TEXT, COALESCE(SUM(amount), 0)::BIGINT, 'Total credits purchased'::TEXT FROM credit_transactions WHERE transaction_type = 'purchase'
  UNION ALL
  SELECT 'storage_usage_mb'::TEXT, COALESCE(SUM(file_size) / (1024 * 1024), 0)::BIGINT, 'Total storage used in MB'::TEXT FROM image_uploads;
END;
$$;

-- 9. Create performance monitoring views
CREATE OR REPLACE VIEW api_performance_metrics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_requests,
  COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_requests,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM galleries
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION deduct_user_credits_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_generation_permission_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health TO authenticated;
GRANT SELECT ON user_stats_materialized TO authenticated;
GRANT SELECT ON api_performance_metrics TO authenticated;
