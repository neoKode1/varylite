-- Ensure galleries table has proper RLS policies for private access only
-- Users can only view and manage their own gallery items

-- Update existing policy to ensure users can only view their own galleries
DROP POLICY IF EXISTS "Users can view own galleries" ON public.galleries;
CREATE POLICY "Users can view own galleries" ON public.galleries
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure users can only insert their own galleries
DROP POLICY IF EXISTS "Users can insert own galleries" ON public.galleries;
CREATE POLICY "Users can insert own galleries" ON public.galleries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure users can only update their own galleries
DROP POLICY IF EXISTS "Users can update own galleries" ON public.galleries;
CREATE POLICY "Users can update own galleries" ON public.galleries
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure users can only delete their own galleries
DROP POLICY IF EXISTS "Users can delete own galleries" ON public.galleries;
CREATE POLICY "Users can delete own galleries" ON public.galleries
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions (only authenticated users can access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galleries TO authenticated;
