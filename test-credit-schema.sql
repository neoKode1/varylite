-- Credit System Schema Test
-- Run this in your Supabase SQL editor to test all schemas

-- Test 1: Check if all tables exist
SELECT 
  'Tables Check' as test_category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits') 
    THEN '✅ user_credits table exists'
    ELSE '❌ user_credits table missing'
  END as user_credits_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') 
    THEN '✅ credit_transactions table exists'
    ELSE '❌ credit_transactions table missing'
  END as credit_transactions_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_usage_log') 
    THEN '✅ credit_usage_log table exists'
    ELSE '❌ credit_usage_log table missing'
  END as credit_usage_log_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grandfathering_batch') 
    THEN '✅ grandfathering_batch table exists'
    ELSE '❌ grandfathering_batch table missing'
  END as grandfathering_batch_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_costs') 
    THEN '✅ model_costs table exists'
    ELSE '❌ model_costs table missing'
  END as model_costs_table;

-- Test 2: Check if all functions exist
SELECT 
  'Functions Check' as test_category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'add_user_credits') 
    THEN '✅ add_user_credits function exists'
    ELSE '❌ add_user_credits function missing'
  END as add_user_credits_function,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'use_user_credits') 
    THEN '✅ use_user_credits function exists'
    ELSE '❌ use_user_credits function missing'
  END as use_user_credits_function,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_user_generations') 
    THEN '✅ calculate_user_generations function exists'
    ELSE '❌ calculate_user_generations function missing'
  END as calculate_user_generations_function,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_credit_summary') 
    THEN '✅ get_user_credit_summary function exists'
    ELSE '❌ get_user_credit_summary function missing'
  END as get_user_credit_summary_function;

-- Test 3: Check model costs data
SELECT 
  'Model Costs Check' as test_category,
  COUNT(*) as total_models,
  COUNT(CASE WHEN is_secret_level = FALSE THEN 1 END) as base_level_models,
  COUNT(CASE WHEN is_secret_level = TRUE THEN 1 END) as secret_level_models,
  COUNT(CASE WHEN category = 'basic' THEN 1 END) as basic_models,
  COUNT(CASE WHEN category = 'premium' THEN 1 END) as premium_models,
  COUNT(CASE WHEN category = 'ultra-premium' THEN 1 END) as ultra_premium_models
FROM model_costs;

-- Test 4: Check key models exist
SELECT 
  'Key Models Check' as test_category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM model_costs WHERE model_name = 'nano-banana') 
    THEN '✅ nano-banana model configured'
    ELSE '❌ nano-banana model missing'
  END as nano_banana_model,
  CASE 
    WHEN EXISTS (SELECT 1 FROM model_costs WHERE model_name = 'veo3-fast') 
    THEN '✅ veo3-fast model configured'
    ELSE '❌ veo3-fast model missing'
  END as veo3_fast_model,
  CASE 
    WHEN EXISTS (SELECT 1 FROM model_costs WHERE model_name = 'seedance-pro') 
    THEN '✅ seedance-pro model configured'
    ELSE '❌ seedance-pro model missing'
  END as seedance_pro_model;

-- Test 5: Check user credits data
SELECT 
  'User Credits Check' as test_category,
  COUNT(*) as users_with_credits,
  COALESCE(SUM(balance), 0) as total_credits_distributed,
  COALESCE(AVG(balance), 0) as average_credits_per_user,
  COALESCE(MIN(balance), 0) as min_credits,
  COALESCE(MAX(balance), 0) as max_credits
FROM user_credits;

-- Test 6: Check credit transactions
SELECT 
  'Credit Transactions Check' as test_category,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN transaction_type = 'credit' THEN 1 END) as credit_transactions,
  COUNT(CASE WHEN transaction_type = 'debit' THEN 1 END) as debit_transactions,
  COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits_given,
  COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as total_credits_used
FROM credit_transactions;

-- Test 7: Check grandfathering batches
SELECT 
  'Grandfathering Batches Check' as test_category,
  COUNT(*) as total_batches,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_batches,
  COALESCE(SUM(total_users), 0) as total_users_grandfathered,
  COALESCE(SUM(total_revenue), 0) as total_revenue_collected
FROM grandfathering_batch;

-- Test 8: Test calculate_user_generations function with a sample user
DO $$
DECLARE
  test_user_id UUID;
  generation_count INTEGER;
BEGIN
  -- Get a user with credits to test
  SELECT user_id INTO test_user_id 
  FROM user_credits 
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function
    SELECT COUNT(*) INTO generation_count
    FROM calculate_user_generations(test_user_id, false);
    
    RAISE NOTICE 'Function Test: calculate_user_generations returned % calculations for user %', 
      generation_count, test_user_id;
  ELSE
    RAISE NOTICE 'Function Test: No users with credits found to test calculate_user_generations';
  END IF;
END $$;

-- Test 9: Test get_user_credit_summary function with a sample user
DO $$
DECLARE
  test_user_id UUID;
  summary_data RECORD;
BEGIN
  -- Get a user with credits to test
  SELECT user_id INTO test_user_id 
  FROM user_credits 
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function
    SELECT * INTO summary_data
    FROM get_user_credit_summary(test_user_id);
    
    RAISE NOTICE 'Function Test: get_user_credit_summary returned balance $% for user %', 
      summary_data.current_balance, test_user_id;
  ELSE
    RAISE NOTICE 'Function Test: No users with credits found to test get_user_credit_summary';
  END IF;
END $$;

-- Test 10: Check RLS policies
SELECT 
  'RLS Policies Check' as test_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'user_credits' 
      AND policyname = 'Users can view own credits'
    ) 
    THEN '✅ user_credits RLS policy exists'
    ELSE '❌ user_credits RLS policy missing'
  END as user_credits_rls,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'model_costs' 
      AND policyname = 'Anyone can view model costs'
    ) 
    THEN '✅ model_costs RLS policy exists'
    ELSE '❌ model_costs RLS policy missing'
  END as model_costs_rls;

-- Test 11: Check indexes
SELECT 
  'Indexes Check' as test_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'user_credits' 
      AND indexname = 'idx_user_credits_user_id'
    ) 
    THEN '✅ user_credits index exists'
    ELSE '❌ user_credits index missing'
  END as user_credits_index,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'model_costs' 
      AND indexname = 'idx_model_costs_category'
    ) 
    THEN '✅ model_costs category index exists'
    ELSE '❌ model_costs category index missing'
  END as model_costs_category_index;

-- Test 12: Overall system health check
SELECT 
  'System Health Check' as test_category,
  CASE 
    WHEN (
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits') AND
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_costs') AND
      EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'add_user_credits') AND
      EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_user_generations')
    )
    THEN '✅ Credit system is properly configured'
    ELSE '❌ Credit system has missing components'
  END as system_status;

-- Final summary
SELECT 
  'Final Summary' as test_category,
  'Run all tests above to verify your credit system setup' as instructions,
  'If any tests show ❌, you need to run the corresponding schema files' as next_steps;
