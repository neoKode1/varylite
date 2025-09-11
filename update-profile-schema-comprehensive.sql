-- Comprehensive Profile Schema Update
-- This updates the database schema to match the TypeScript interfaces
-- Run this in your Supabase SQL editor

-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'AI enthusiast and creative explorer',
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS background_image TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT;

-- Update existing users with default values
UPDATE public.users 
SET 
  bio = COALESCE(bio, 'AI enthusiast and creative explorer'),
  social_links = COALESCE(social_links, '{}'::jsonb),
  display_name = COALESCE(display_name, name),
  username = COALESCE(username, LOWER(REPLACE(COALESCE(name, 'user'), ' ', '_')))
WHERE bio IS NULL OR social_links IS NULL OR display_name IS NULL OR username IS NULL;

-- Update the preferences column to include the new fields
-- This will merge with existing preferences
UPDATE public.users 
SET preferences = COALESCE(preferences, '{}'::jsonb) || '{
  "defaultModel": "runway-t2i",
  "defaultStyle": "realistic", 
  "notifications": true,
  "publicProfile": false,
  "toastyNotifications": true
}'::jsonb
WHERE preferences IS NULL OR preferences = '{}'::jsonb;

-- Create collections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_items table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  gallery_id UUID REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, gallery_id)
);

-- Enable RLS on new tables
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections table
CREATE POLICY "Users can view own collections" ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections" ON public.collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON public.collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" ON public.collections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for collection_items table
CREATE POLICY "Users can view own collection items" ON public.collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collections 
      WHERE collections.id = collection_items.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own collection items" ON public.collection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections 
      WHERE collections.id = collection_items.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own collection items" ON public.collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.collections 
      WHERE collections.id = collection_items.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_gallery_id ON public.collection_items(gallery_id);

-- Create trigger for updated_at on collections
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions on new tables
GRANT ALL ON public.collections TO anon, authenticated;
GRANT ALL ON public.collection_items TO anon, authenticated;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
