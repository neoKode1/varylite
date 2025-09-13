-- Implement Grandfathering System for $120 Balance
-- Payment Date: September 19th (Next Friday)
-- Total Users: 67
-- Credit per User: $1.79 ($120 ÷ 67)

-- Step 1: Ensure model costs are properly populated
INSERT INTO model_costs (model_name, cost_per_generation, category, display_name, is_secret_level) VALUES
-- Base Level Models
('nano-banana', 0.0398, 'basic', 'Nano Banana', FALSE),
('runway-t2i', 0.0398, 'basic', 'Runway T2I', FALSE),
('minimax-2.0', 0.0398, 'basic', 'Minimax 2.0', FALSE),
('kling-2.1-master', 0.0398, 'basic', 'Kling 2.1 Master', FALSE),
('veo3-fast', 0.15, 'premium', 'VEO3 Fast', FALSE),
('runway-video', 0.15, 'premium', 'Runway Video', FALSE),

-- Secret Level Models
('seedance-pro', 2.50, 'ultra-premium', 'Seedance Pro', TRUE),
('seedance-pro-t2v', 2.50, 'ultra-premium', 'Seedance Pro T2V', TRUE),
('veo-3-text-to-video', 0.25, 'premium', 'VEO-3 Text-to-Video', TRUE),
('veo-3-image-to-video', 0.25, 'premium', 'VEO-3 Image-to-Video', TRUE),
('runway-gen-3-text-to-video', 0.20, 'premium', 'Runway Gen 3 Text-to-Video', TRUE),
('runway-gen-3-image-to-video', 0.20, 'premium', 'Runway Gen 3 Image-to-Video', TRUE),
('flux-1.1-pro-text-to-image', 0.05, 'basic', 'Flux 1.1 Pro', TRUE),
('imagen-3-text-to-image', 0.08, 'basic', 'Imagen 3', TRUE),
('dall-e-3-text-to-image', 0.08, 'basic', 'DALL-E 3', TRUE),
('midjourney-v6-text-to-image', 0.10, 'basic', 'Midjourney V6', TRUE),
('stable-diffusion-xl-text-to-image', 0.04, 'basic', 'Stable Diffusion XL', TRUE),
('flux-dev-text-to-image', 0.04, 'basic', 'Flux Dev', TRUE),
('stable-diffusion-v3-text-to-image', 0.05, 'basic', 'Stable Diffusion V3', TRUE),
('flux-schnell-text-to-image', 0.03, 'basic', 'Flux Schnell', TRUE),
('stable-diffusion-v2-text-to-image', 0.03, 'basic', 'Stable Diffusion V2', TRUE),
('flux-1.0-text-to-image', 0.04, 'basic', 'Flux 1.0', TRUE),
('pika-labs-text-to-video', 0.15, 'premium', 'Pika Labs Text-to-Video', TRUE),
('pika-labs-image-to-video', 0.15, 'premium', 'Pika Labs Image-to-Video', TRUE),
('stable-video-diffusion-text-to-video', 0.12, 'premium', 'Stable Video Diffusion T2V', TRUE),
('stable-video-diffusion-image-to-video', 0.12, 'premium', 'Stable Video Diffusion I2V', TRUE),
('zeroscope-text-to-video', 0.10, 'premium', 'Zeroscope Text-to-Video', TRUE),
('modelscope-text-to-video', 0.08, 'premium', 'ModelScope Text-to-Video', TRUE),
('modelscope-image-to-video', 0.08, 'premium', 'ModelScope Image-to-Video', TRUE),
('cogvideo-text-to-video', 0.10, 'premium', 'CogVideo Text-to-Video', TRUE),
('cogvideo-image-to-video', 0.10, 'premium', 'CogVideo Image-to-Video', TRUE),
('text2video-zero-text-to-video', 0.08, 'premium', 'Text2Video Zero T2V', TRUE),
('text2video-zero-image-to-video', 0.08, 'premium', 'Text2Video Zero I2V', TRUE),

-- Legacy Secret Models
('bytedance-dreamina-v3-1-text-to-image', 0.06, 'basic', 'Dreamina V3.1', TRUE),
('bytedance-seedance-v1-pro-image-to-video', 2.50, 'ultra-premium', 'Seedance V1 Pro', TRUE),
('elevenlabs-tts-multilingual-v2', 0.02, 'basic', 'ElevenLabs TTS', TRUE),
('fast-sdxl', 0.04, 'basic', 'Fast SDXL', TRUE),
('flux-krea', 0.05, 'basic', 'Flux Krea', TRUE),
('flux-pro-kontext', 0.06, 'basic', 'Flux Pro Kontext', TRUE),
('imagen4-preview', 0.08, 'basic', 'Imagen 4 Preview', TRUE),
('kling-video-v2-1-master-image-to-video', 0.15, 'premium', 'Kling Video V2.1', TRUE),
('minimax-hailuo-02-pro-image-to-video', 0.15, 'premium', 'Minimax Hailuo 02 Pro', TRUE),
('minimax-video-01', 0.12, 'premium', 'Minimax Video 01', TRUE),
('minimax-video-generation', 0.12, 'premium', 'Minimax Video Generation', TRUE),
('nano-banana-edit', 0.0398, 'basic', 'Nano Banana Edit', TRUE),
('qwen-image-edit', 0.05, 'basic', 'Qwen Image Edit', TRUE),
('stable-diffusion-v35-large', 0.05, 'basic', 'Stable Diffusion V3.5', TRUE),
('veo3-fast-image-to-video', 0.15, 'premium', 'VEO3 Fast Image-to-Video', TRUE),
('veo3-image-to-video', 0.25, 'premium', 'VEO3 Image-to-Video', TRUE),
('veo3-standard', 0.20, 'premium', 'VEO3 Standard', TRUE),
('wan-v2-2-a14b-image-to-video-lora', 0.10, 'premium', 'Wan V2.2 A14b LoRA', TRUE),
('wav2lip', 0.08, 'premium', 'Wav2Lip', TRUE),
('latentsync', 0.10, 'premium', 'LatentSync', TRUE),
('sync-fondo', 0.08, 'premium', '[sync.] Fondo', TRUE),
('musetalk', 0.10, 'premium', 'MuseTalk', TRUE)
ON CONFLICT (model_name) DO NOTHING;

-- Step 2: Distribute $1.79 credits to all 67 existing users
-- This represents the $120 balance distributed equally
INSERT INTO user_credits (user_id, balance)
SELECT 
  id as user_id,
  1.79 as balance
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_credits)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Log the grandfathering transaction for each user
INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
SELECT 
  id as user_id,
  1.79 as amount,
  'credit' as transaction_type,
  'Grandfathered credits - $120 balance distributed among 67 users (Payment due: Sept 19)' as description
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM credit_transactions 
  WHERE description LIKE '%Grandfathered credits%'
);

-- Step 4: Create the grandfathering batch record
INSERT INTO grandfathering_batch (
  batch_name,
  weekly_charge,
  credits_per_user,
  total_users,
  total_revenue,
  profit_margin,
  status,
  created_at
) VALUES (
  'Initial Credit Distribution - 67 Users (Sept 19 Payment)',
  5.99,
  1.79,
  67,
  120.00,
  0.99,
  'completed',
  NOW()
);

-- Step 5: Verify the distribution
SELECT 
  'Distribution Verification' as check_type,
  COUNT(*) as users_with_credits,
  SUM(balance) as total_credits_distributed,
  AVG(balance) as average_credits_per_user,
  MIN(balance) as min_credits,
  MAX(balance) as max_credits
FROM user_credits;

-- Step 6: Show what each user can generate with $1.79
SELECT 
  'Generation Capabilities' as info,
  mc.display_name,
  mc.category,
  mc.cost_per_generation,
  FLOOR(1.79 / mc.cost_per_generation) as generations_possible,
  CASE 
    WHEN mc.is_secret_level THEN 'Secret Level'
    ELSE 'Base Level'
  END as access_level
FROM model_costs mc
WHERE mc.cost_per_generation <= 1.79
ORDER BY mc.cost_per_generation ASC
LIMIT 10;

-- Step 7: Create a function to handle weekly payments (for future use)
CREATE OR REPLACE FUNCTION process_weekly_payment(
  p_batch_name TEXT,
  p_weekly_charge DECIMAL(10,2),
  p_credits_per_user DECIMAL(10,2)
)
RETURNS TABLE (
  batch_id UUID,
  total_users INTEGER,
  total_revenue DECIMAL(10,2),
  profit_margin DECIMAL(10,2)
) AS $$
DECLARE
  user_count INTEGER;
  total_revenue DECIMAL(10,2);
  profit DECIMAL(10,2);
  new_batch_id UUID;
BEGIN
  -- Count active users (users with credits or recent activity)
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE id IN (
    SELECT user_id FROM user_credits WHERE balance > 0
    UNION
    SELECT user_id FROM credit_transactions 
    WHERE created_at >= NOW() - INTERVAL '7 days'
  );
  
  -- Calculate totals
  total_revenue := user_count * p_weekly_charge;
  profit := total_revenue - (user_count * p_credits_per_user);
  
  -- Create new batch record
  INSERT INTO grandfathering_batch (
    batch_name,
    weekly_charge,
    credits_per_user,
    total_users,
    total_revenue,
    profit_margin,
    status
  ) VALUES (
    p_batch_name,
    p_weekly_charge,
    p_credits_per_user,
    user_count,
    total_revenue,
    profit,
    'pending'
  ) RETURNING id INTO new_batch_id;
  
  -- Add credits to all active users
  INSERT INTO user_credits (user_id, balance)
  SELECT 
    id as user_id,
    p_credits_per_user as balance
  FROM auth.users
  WHERE id IN (
    SELECT user_id FROM user_credits WHERE balance > 0
    UNION
    SELECT user_id FROM credit_transactions 
    WHERE created_at >= NOW() - INTERVAL '7 days'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = user_credits.balance + p_credits_per_user,
    updated_at = NOW();
  
  -- Log transactions
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  SELECT 
    id as user_id,
    p_credits_per_user as amount,
    'credit' as transaction_type,
    CONCAT('Weekly payment: ', p_batch_name) as description
  FROM auth.users
  WHERE id IN (
    SELECT user_id FROM user_credits WHERE balance > 0
    UNION
    SELECT user_id FROM credit_transactions 
    WHERE created_at >= NOW() - INTERVAL '7 days'
  );
  
  -- Update batch status
  UPDATE grandfathering_batch
  SET status = 'completed', completed_at = NOW()
  WHERE id = new_batch_id;
  
  -- Return results
  RETURN QUERY
  SELECT 
    new_batch_id,
    user_count,
    total_revenue,
    profit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION process_weekly_payment(TEXT, DECIMAL, DECIMAL) TO authenticated;

-- Step 8: Final verification
SELECT 
  'Final System Status' as status,
  'Credit system is ready for September 19th payment' as message,
  '67 users have $1.79 each ($120 total distributed)' as distribution,
  'Next payment: $5.99 per user weekly' as next_payment;
