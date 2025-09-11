-- User Level Progression System Schema
-- This schema tracks user levels, model usage, and unlocks

-- Add level tracking to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS secret_level INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_generations INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unique_models_used INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_level_up TIMESTAMP WITH TIME ZONE;

-- Create model usage tracking table
CREATE TABLE IF NOT EXISTS public.model_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_name TEXT NOT NULL,
  generation_type TEXT NOT NULL, -- 'text-to-image', 'text-to-video', 'image-to-video', 'lip-sync', etc.
  cost_credits DECIMAL(10,4) DEFAULT 0, -- Track cost for balancing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, model_name) -- Track unique model usage per user
);

-- Create model combinations tracking table
CREATE TABLE IF NOT EXISTS public.model_combinations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  combination_hash TEXT NOT NULL, -- Hash of model combination used
  models_used TEXT[] NOT NULL, -- Array of model names used together
  generation_type TEXT NOT NULL,
  cost_credits DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, combination_hash)
);

-- Create level unlock tracking table
CREATE TABLE IF NOT EXISTS public.level_unlocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL,
  models_unlocked TEXT[] NOT NULL, -- Array of models unlocked at this level
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, level)
);

-- Enable RLS for new tables
ALTER TABLE public.model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for model_usage
CREATE POLICY "Users can view their own model usage" ON public.model_usage
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model usage" ON public.model_usage
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for model_combinations
CREATE POLICY "Users can view their own model combinations" ON public.model_combinations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model combinations" ON public.model_combinations
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for level_unlocks
CREATE POLICY "Users can view their own level unlocks" ON public.level_unlocks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level unlocks" ON public.level_unlocks
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to calculate user's secret level based on usage
CREATE OR REPLACE FUNCTION public.calculate_user_level(user_uuid uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unique_models_count INTEGER;
  total_generations_count INTEGER;
  calculated_level INTEGER;
BEGIN
  -- Count unique models used
  SELECT COUNT(DISTINCT model_name) INTO unique_models_count
  FROM public.model_usage
  WHERE user_id = user_uuid;
  
  -- Count total generations
  SELECT COUNT(*) INTO total_generations_count
  FROM public.model_usage
  WHERE user_id = user_uuid;
  
  -- Calculate level based on unique models and total usage
  -- Level 1: 0-4 unique models
  -- Level 2: 5-9 unique models
  -- Level 3: 10-14 unique models
  -- etc.
  calculated_level := GREATEST(1, FLOOR(unique_models_count / 5) + 1);
  
  -- Cap at level 10 for now
  calculated_level := LEAST(calculated_level, 10);
  
  RETURN calculated_level;
END;
$$;

-- Function to get models unlocked at a specific level
CREATE OR REPLACE FUNCTION public.get_level_unlocked_models(user_uuid uuid, target_level INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unlocked_models TEXT[];
BEGIN
  -- Get all models unlocked up to the target level
  SELECT ARRAY_AGG(DISTINCT unnest(models_unlocked)) INTO unlocked_models
  FROM public.level_unlocks
  WHERE user_id = user_uuid AND level <= target_level;
  
  -- If no unlocks found, return empty array
  IF unlocked_models IS NULL THEN
    unlocked_models := ARRAY[]::TEXT[];
  END IF;
  
  RETURN unlocked_models;
END;
$$;

-- Function to unlock new models for a level
CREATE OR REPLACE FUNCTION public.unlock_level_models(user_uuid uuid, new_level INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  available_models TEXT[];
  unlocked_models TEXT[];
  models_to_unlock TEXT[];
  random_model TEXT;
  i INTEGER;
BEGIN
  -- Define all available models (excluding already unlocked ones)
  available_models := ARRAY[
    'nano-banana-text-to-image',
    'gemini-pro-vision-text-to-image',
    'flux-1.1-pro-text-to-image',
    'imagen-3-text-to-image',
    'dall-e-3-text-to-image',
    'midjourney-v6-text-to-image',
    'stable-diffusion-xl-text-to-image',
    'flux-dev-text-to-image',
    'stable-diffusion-v3-text-to-image',
    'flux-schnell-text-to-image',
    'stable-diffusion-v2-text-to-image',
    'flux-1.0-text-to-image',
    'veo-3-text-to-video',
    'runway-gen-3-text-to-video',
    'pika-labs-text-to-video',
    'stable-video-diffusion-text-to-video',
    'zeroscope-text-to-video',
    'modelscope-text-to-video',
    'cogvideo-text-to-video',
    'text2video-zero-text-to-video',
    'veo-3-image-to-video',
    'runway-gen-3-image-to-video',
    'pika-labs-image-to-video',
    'stable-video-diffusion-image-to-video',
    'modelscope-image-to-video',
    'cogvideo-image-to-video',
    'text2video-zero-image-to-video'
  ];
  
  -- Get already unlocked models
  SELECT get_level_unlocked_models(user_uuid, new_level - 1) INTO unlocked_models;
  
  -- Filter out already unlocked models
  models_to_unlock := ARRAY[]::TEXT[];
  FOR i IN 1..array_length(available_models, 1) LOOP
    IF NOT (available_models[i] = ANY(unlocked_models)) THEN
      models_to_unlock := array_append(models_to_unlock, available_models[i]);
    END IF;
  END LOOP;
  
  -- Randomly select 5 models to unlock (or all remaining if less than 5)
  unlocked_models := ARRAY[]::TEXT[];
  FOR i IN 1..LEAST(5, array_length(models_to_unlock, 1)) LOOP
    random_model := models_to_unlock[1 + floor(random() * array_length(models_to_unlock, 1))];
    unlocked_models := array_append(unlocked_models, random_model);
    -- Remove selected model from available pool
    models_to_unlock := array_remove(models_to_unlock, random_model);
  END LOOP;
  
  -- Insert the unlock record
  INSERT INTO public.level_unlocks (user_id, level, models_unlocked)
  VALUES (user_uuid, new_level, unlocked_models)
  ON CONFLICT (user_id, level) DO NOTHING;
  
  -- Update user's level
  UPDATE public.users 
  SET secret_level = new_level, last_level_up = now()
  WHERE id = user_uuid;
  
  RETURN unlocked_models;
END;
$$;

-- Function to track model usage and check for level up
CREATE OR REPLACE FUNCTION public.track_model_usage(
  user_uuid uuid,
  model_name TEXT,
  generation_type TEXT,
  cost_credits DECIMAL DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_level INTEGER;
  new_level INTEGER;
  leveled_up BOOLEAN := FALSE;
  unlocked_models TEXT[];
BEGIN
  -- Insert or update model usage
  INSERT INTO public.model_usage (user_id, model_name, generation_type, cost_credits)
  VALUES (user_uuid, model_name, generation_type, cost_credits)
  ON CONFLICT (user_id, model_name) DO UPDATE SET
    cost_credits = model_usage.cost_credits + EXCLUDED.cost_credits;
  
  -- Update user's total generations count
  UPDATE public.users 
  SET total_generations = total_generations + 1,
      unique_models_used = (
        SELECT COUNT(DISTINCT model_name) 
        FROM public.model_usage 
        WHERE user_id = user_uuid
      )
  WHERE id = user_uuid;
  
  -- Check current level
  SELECT secret_level INTO current_level FROM public.users WHERE id = user_uuid;
  
  -- Calculate new level
  new_level := calculate_user_level(user_uuid);
  
  -- Check if user leveled up
  IF new_level > current_level THEN
    leveled_up := TRUE;
    -- Unlock new models for the new level
    SELECT unlock_level_models(user_uuid, new_level) INTO unlocked_models;
  END IF;
  
  RETURN json_build_object(
    'leveled_up', leveled_up,
    'current_level', new_level,
    'previous_level', current_level,
    'unlocked_models', COALESCE(unlocked_models, ARRAY[]::TEXT[])
  );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.model_usage TO authenticated;
GRANT SELECT, INSERT ON public.model_combinations TO authenticated;
GRANT SELECT, INSERT ON public.level_unlocks TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_level_unlocked_models(uuid, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_level_models(uuid, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_model_usage(uuid, TEXT, TEXT, DECIMAL) TO authenticated;
