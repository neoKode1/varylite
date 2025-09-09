-- Create image_uploads table for tracking uploaded images
-- This table stores metadata about images uploaded to Supabase storage

-- Drop table if it exists (for clean recreation)
DROP TABLE IF EXISTS image_uploads CASCADE;

-- Create the image_uploads table
CREATE TABLE image_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  public_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  fal_url TEXT, -- FAL AI URL after transfer
  is_processed BOOLEAN DEFAULT FALSE,
  session_id TEXT, -- For tracking generation sessions
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE image_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for image_uploads
CREATE POLICY "Users can view their own image uploads" ON image_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image uploads" ON image_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image uploads" ON image_uploads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all image uploads" ON image_uploads
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_image_uploads_user_id ON image_uploads(user_id);
CREATE INDEX idx_image_uploads_created_at ON image_uploads(created_at DESC);
CREATE INDEX idx_image_uploads_session_id ON image_uploads(session_id);
CREATE INDEX idx_image_uploads_is_processed ON image_uploads(is_processed);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_image_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_image_uploads_updated_at 
  BEFORE UPDATE ON image_uploads 
  FOR EACH ROW EXECUTE FUNCTION update_image_uploads_updated_at();

-- Add comment to table
COMMENT ON TABLE image_uploads IS 'Stores metadata about images uploaded to Supabase storage and transferred to FAL AI';
