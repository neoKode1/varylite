-- COMPLETE Community Database Schema - This will replace everything
-- Run this to completely reset and set up the community database properly

-- First, let's clean up everything that might exist
DROP TABLE IF EXISTS community_interactions CASCADE;
DROP TABLE IF EXISTS community_comments CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view community posts" ON community_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON community_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON community_posts;

DROP POLICY IF EXISTS "Anyone can view comments" ON community_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON community_comments;
DROP POLICY IF EXISTS "Users can create comments" ON community_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON community_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON community_comments;

DROP POLICY IF EXISTS "Anyone can view interactions" ON community_interactions;
DROP POLICY IF EXISTS "Authenticated users can create interactions" ON community_interactions;
DROP POLICY IF EXISTS "Users can create interactions" ON community_interactions;
DROP POLICY IF EXISTS "Users can delete their own interactions" ON community_interactions;

DROP POLICY IF EXISTS "Service role can manage analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Service role can manage analytics" ON analytics_events;

-- Drop storage policies
DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community images" ON storage.objects;

-- Drop storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'community-images';

-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_community_posts_updated_at ON community_posts;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Now create everything fresh

-- 1. Community Posts Table
CREATE TABLE community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Community Comments Table
CREATE TABLE community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Community Interactions Table (likes, reposts, shares)
CREATE TABLE community_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'repost', 'share')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, interaction_type)
);

-- 4. Analytics Events Table
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Community Posts Policies
CREATE POLICY "Anyone can view community posts" ON community_posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Community Comments Policies
CREATE POLICY "Anyone can view comments" ON community_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON community_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON community_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Community Interactions Policies
CREATE POLICY "Anyone can view interactions" ON community_interactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create interactions" ON community_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" ON community_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- Analytics Events Policies
CREATE POLICY "Service role can manage analytics events" ON analytics_events
  FOR ALL USING (true);

-- 7. Create Storage Bucket for Community Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-images', 'community-images', true);

-- 8. Create Storage Policies for Community Images (More Permissive)
CREATE POLICY "Anyone can view community images" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-images');

CREATE POLICY "Authenticated users can upload community images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own community images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'community-images' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own community images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'community-images' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- 9. Create Performance Indexes
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_community_comments_user_id ON community_comments(user_id);
CREATE INDEX idx_community_interactions_post_id ON community_interactions(post_id);
CREATE INDEX idx_community_interactions_user_id ON community_interactions(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- 10. Create Function to Update Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create Trigger for Automatic Timestamp Updates
CREATE TRIGGER update_community_posts_updated_at 
  BEFORE UPDATE ON community_posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant Permissions (Important for service role)
GRANT ALL ON community_posts TO service_role;
GRANT ALL ON community_comments TO service_role;
GRANT ALL ON community_interactions TO service_role;
GRANT ALL ON analytics_events TO service_role;

-- 13. Success Message
SELECT 'COMPLETE Community database schema setup completed successfully!' as status;
