-- Fix Row Level Security policy for users table
-- This allows authenticated users to insert their own profile

-- First, let's check if the users table exists and has RLS enabled
-- If not, we'll create it with proper policies

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    profile_picture TEXT,
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    usage_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create galleries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.galleries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    prompt TEXT,
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on galleries table
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own gallery" ON public.galleries;
DROP POLICY IF EXISTS "Users can insert own gallery" ON public.galleries;
DROP POLICY IF EXISTS "Users can update own gallery" ON public.galleries;
DROP POLICY IF EXISTS "Users can delete own gallery" ON public.galleries;

-- Create new policies for galleries
CREATE POLICY "Users can view own gallery" ON public.galleries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gallery" ON public.galleries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery" ON public.galleries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gallery" ON public.galleries
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.users;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
