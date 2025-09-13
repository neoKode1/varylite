-- User Credit Display System Schema
-- This schema enables users to see exactly how many generations they can make

-- 1. Ensure user_credits table exists (from previous credit system)
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Model cost reference table for calculations
CREATE TABLE IF NOT EXISTS model_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL UNIQUE,
  cost_per_generation DECIMAL(10,4) NOT NULL,
  category TEXT NOT NULL, -- 'basic', 'premium', 'ultra-premium'
  display_name TEXT NOT NULL,
  is_secret_level BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert model costs (if not already exists)
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

-- 4. Function to calculate generations possible for a user
CREATE OR REPLACE FUNCTION calculate_user_generations(
  p_user_id UUID,
  p_include_secret BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  model_name TEXT,
  display_name TEXT,
  cost_per_generation DECIMAL(10,4),
  category TEXT,
  is_secret_level BOOLEAN,
  generations_possible INTEGER,
  total_cost DECIMAL(10,2)
) AS $$
DECLARE
  user_balance DECIMAL(10,2);
BEGIN
  -- Get user's current credit balance
  SELECT COALESCE(balance, 0.00) INTO user_balance
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- If user has no credits, return empty result
  IF user_balance <= 0 THEN
    RETURN;
  END IF;
  
  -- Return calculations for all models (filtered by secret level if needed)
  RETURN QUERY
  SELECT 
    mc.model_name,
    mc.display_name,
    mc.cost_per_generation,
    mc.category,
    mc.is_secret_level,
    CASE 
      WHEN mc.cost_per_generation > 0 THEN FLOOR(user_balance / mc.cost_per_generation)
      ELSE 0
    END as generations_possible,
    CASE 
      WHEN mc.cost_per_generation > 0 THEN FLOOR(user_balance / mc.cost_per_generation) * mc.cost_per_generation
      ELSE 0
    END as total_cost
  FROM model_costs mc
  WHERE (p_include_secret = TRUE OR mc.is_secret_level = FALSE)
  ORDER BY 
    mc.is_secret_level ASC,
    mc.cost_per_generation ASC,
    mc.display_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get user's credit summary
CREATE OR REPLACE FUNCTION get_user_credit_summary(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  current_balance DECIMAL(10,2),
  total_base_generations INTEGER,
  total_premium_generations INTEGER,
  total_ultra_premium_generations INTEGER,
  cheapest_model TEXT,
  cheapest_cost DECIMAL(10,4),
  most_expensive_model TEXT,
  most_expensive_cost DECIMAL(10,4)
) AS $$
DECLARE
  user_balance DECIMAL(10,2);
BEGIN
  -- Get user's current credit balance
  SELECT COALESCE(balance, 0.00) INTO user_balance
  FROM user_credits
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT 
    p_user_id,
    user_balance,
    COALESCE(SUM(CASE WHEN mc.category = 'basic' THEN FLOOR(user_balance / mc.cost_per_generation) ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN mc.category = 'premium' THEN FLOOR(user_balance / mc.cost_per_generation) ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN mc.category = 'ultra-premium' THEN FLOOR(user_balance / mc.cost_per_generation) ELSE 0 END), 0)::INTEGER,
    (SELECT display_name FROM model_costs WHERE cost_per_generation = (SELECT MIN(cost_per_generation) FROM model_costs WHERE is_secret_level = FALSE))::TEXT,
    (SELECT MIN(cost_per_generation) FROM model_costs WHERE is_secret_level = FALSE)::DECIMAL(10,4),
    (SELECT display_name FROM model_costs WHERE cost_per_generation = (SELECT MAX(cost_per_generation) FROM model_costs))::TEXT,
    (SELECT MAX(cost_per_generation) FROM model_costs)::DECIMAL(10,4)
  FROM model_costs mc
  WHERE mc.is_secret_level = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION calculate_user_generations(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credit_summary(UUID) TO authenticated;
GRANT SELECT ON model_costs TO authenticated;
GRANT SELECT ON user_credits TO authenticated;

-- 7. RLS Policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_costs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own credits
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Everyone can view model costs (public information)
CREATE POLICY "Anyone can view model costs" ON model_costs
  FOR SELECT USING (true);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_model_costs_category ON model_costs(category);
CREATE INDEX IF NOT EXISTS idx_model_costs_secret_level ON model_costs(is_secret_level);
CREATE INDEX IF NOT EXISTS idx_model_costs_cost ON model_costs(cost_per_generation);
