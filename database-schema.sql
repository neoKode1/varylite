-- vARI Ai Database Schema for Supabase/PostgreSQL
-- This file contains the SQL commands to create the necessary tables

-- Enable Row Level Security
-- Note: app.jwt_secret is managed by Supabase automatically

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  profile_picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  usage_stats JSONB DEFAULT '{
    "total_generations": 0,
    "image_generations": 0,
    "video_generations": 0,
    "character_variations": 0,
    "background_changes": 0,
    "last_activity": null
  }'::jsonb
);

-- Create galleries table
CREATE TABLE IF NOT EXISTS public.galleries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  variation_id TEXT NOT NULL,
  description TEXT NOT NULL,
  angle TEXT NOT NULL,
  pose TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  file_type TEXT CHECK (file_type IN ('image', 'video')) NOT NULL,
  original_prompt TEXT NOT NULL,
  original_image_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  action_type TEXT CHECK (action_type IN ('image_generation', 'video_generation', 'character_variation', 'background_change')) NOT NULL,
  service_used TEXT CHECK (service_used IN ('nano_banana', 'runway_aleph', 'minimax_endframe', 'gemini')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON public.galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON public.galleries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_session_id ON public.usage_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON public.usage_tracking(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for galleries table
CREATE POLICY "Users can view own galleries" ON public.galleries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own galleries" ON public.galleries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own galleries" ON public.galleries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own galleries" ON public.galleries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking table
CREATE POLICY "Users can view own usage tracking" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert usage tracking" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at timestamp
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track usage
CREATE OR REPLACE FUNCTION public.track_usage(
  p_action_type TEXT,
  p_service_used TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  usage_id UUID;
BEGIN
  INSERT INTO public.usage_tracking (
    user_id,
    session_id,
    action_type,
    service_used,
    metadata
  ) VALUES (
    p_user_id,
    COALESCE(p_session_id, gen_random_uuid()::text),
    p_action_type,
    p_service_used,
    p_metadata
  ) RETURNING id INTO usage_id;
  
  -- Update user stats if user is authenticated
  IF p_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET usage_stats = jsonb_set(
      jsonb_set(
        usage_stats,
        '{total_generations}',
        to_jsonb((usage_stats->>'total_generations')::int + 1)
      ),
      '{last_activity}',
      to_jsonb(NOW())
    )
    WHERE id = p_user_id;
  END IF;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.galleries TO anon, authenticated;
GRANT ALL ON public.usage_tracking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_usage TO anon, authenticated;
