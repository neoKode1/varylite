-- Notifications table for email system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'notification',
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Service role can update notifications
CREATE POLICY "Service role can update notifications" ON notifications
  FOR UPDATE USING (true);

-- Function to send notification to user
CREATE OR REPLACE FUNCTION send_user_notification(
  p_user_id UUID,
  p_subject VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'notification'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  result JSON;
BEGIN
  -- Get user email and name
  SELECT email, full_name INTO user_email, user_name
  FROM profiles 
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Insert notification record
  INSERT INTO notifications (user_id, type, subject, message, email_sent)
  VALUES (p_user_id, p_type, p_subject, p_message, true);
  
  -- Return success with user info
  RETURN json_build_object(
    'success', true,
    'user_email', user_email,
    'user_name', user_name,
    'message', 'Notification queued for sending'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_user_notification TO authenticated;
