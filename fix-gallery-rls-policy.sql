-- Fix RLS policy for galleries table to allow users to see their own items
-- This addresses the issue where admin queries find 236 items but user queries find 0

-- First, let's check the current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'galleries';

-- Drop existing problematic policies (if any)
DROP POLICY IF EXISTS "Users can view their own gallery items" ON galleries;
DROP POLICY IF EXISTS "Users can insert their own gallery items" ON galleries;
DROP POLICY IF EXISTS "Users can update their own gallery items" ON galleries;
DROP POLICY IF EXISTS "Users can delete their own gallery items" ON galleries;

-- Create proper RLS policies for galleries table
-- Policy 1: Users can view their own gallery items
CREATE POLICY "Users can view their own gallery items" ON galleries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own gallery items
CREATE POLICY "Users can insert their own gallery items" ON galleries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own gallery items
CREATE POLICY "Users can update their own gallery items" ON galleries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own gallery items
CREATE POLICY "Users can delete their own gallery items" ON galleries
    FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure RLS is enabled on the galleries table
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON galleries TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test query to verify the fix works
-- This should now return the user's gallery items
SELECT COUNT(*) as user_gallery_count 
FROM galleries 
WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094';

-- Also verify the user can see their items
SELECT id, user_id, created_at, file_type
FROM galleries 
WHERE user_id = '237e93d3-2156-440e-9c0d-a012f26ba094'
ORDER BY created_at DESC
LIMIT 5;
