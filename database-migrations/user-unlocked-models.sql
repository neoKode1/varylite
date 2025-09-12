-- Create user_unlocked_models table for tracking which models users have unlocked
CREATE TABLE IF NOT EXISTS public.user_unlocked_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    model_name TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, model_name)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_unlocked_models_user_id ON public.user_unlocked_models(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_models_model_name ON public.user_unlocked_models(model_name);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_models_unlocked_at ON public.user_unlocked_models(unlocked_at);

-- Enable RLS
ALTER TABLE public.user_unlocked_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own unlocked models
CREATE POLICY "Users can read their own unlocked models" ON public.user_unlocked_models
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own unlocked models
CREATE POLICY "Users can insert their own unlocked models" ON public.user_unlocked_models
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own unlocked models
CREATE POLICY "Users can update their own unlocked models" ON public.user_unlocked_models
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_unlocked_models TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;