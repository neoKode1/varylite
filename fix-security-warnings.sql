-- Fix Security Warnings: Set secure search paths for database functions
-- Run these commands in your Supabase SQL Editor

-- 1. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 2. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Fix track_usage function
CREATE OR REPLACE FUNCTION public.track_usage(
  p_action_type text,
  p_service_used text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session_id text;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  -- Generate or get session ID
  v_session_id := COALESCE(
    current_setting('app.session_id', true),
    gen_random_uuid()::text
  );
  
  -- Insert usage tracking record
  INSERT INTO public.usage_tracking (
    user_id,
    session_id,
    action_type,
    service_used,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    v_session_id,
    p_action_type::usage_tracking_action_type,
    p_service_used::usage_tracking_service_used,
    p_metadata,
    NOW()
  );
END;
$$;

-- 4. Create trigger for users table updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create trigger for galleries table updated_at
DROP TRIGGER IF EXISTS update_galleries_updated_at ON public.galleries;
CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create trigger for usage_tracking table updated_at
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON public.usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.galleries TO authenticated;
GRANT ALL ON public.usage_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_usage TO authenticated;
