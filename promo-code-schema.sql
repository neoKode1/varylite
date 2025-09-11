-- Promo Code System Schema
-- This script creates the necessary tables and policies for the promo code system

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    access_type VARCHAR(50) DEFAULT 'secret_level' CHECK (access_type IN ('secret_level', 'premium', 'beta')),
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Create user_promo_access table to track which users have redeemed which codes
CREATE TABLE IF NOT EXISTS public.user_promo_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, promo_code_id)
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_promo_access_user_id ON public.user_promo_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_access_promo_code_id ON public.user_promo_access(promo_code_id);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promo_codes table
-- Users can read active promo codes (for validation)
CREATE POLICY "Users can read active promo codes" ON public.promo_codes
    FOR SELECT USING (is_active = true);

-- Only authenticated users can read their own promo access
CREATE POLICY "Users can read their own promo access" ON public.user_promo_access
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own promo access (when redeeming codes)
CREATE POLICY "Users can insert their own promo access" ON public.user_promo_access
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check if user has access to secret level
CREATE OR REPLACE FUNCTION public.user_has_secret_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_promo_access upa
        JOIN public.promo_codes pc ON upa.promo_code_id = pc.id
        WHERE upa.user_id = user_uuid 
        AND pc.access_type = 'secret_level'
        AND pc.is_active = true
        AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem a promo code
CREATE OR REPLACE FUNCTION public.redeem_promo_code(code_text TEXT, user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    promo_record RECORD;
    result JSON;
BEGIN
    -- Check if code exists and is valid
    SELECT * INTO promo_record
    FROM public.promo_codes
    WHERE code = code_text
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses);

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired promo code');
    END IF;

    -- Check if user already redeemed this code
    IF EXISTS (
        SELECT 1 FROM public.user_promo_access 
        WHERE user_id = user_uuid AND promo_code_id = promo_record.id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'You have already redeemed this promo code');
    END IF;

    -- Insert user access record
    INSERT INTO public.user_promo_access (user_id, promo_code_id)
    VALUES (user_uuid, promo_record.id);

    -- Update used count
    UPDATE public.promo_codes
    SET used_count = used_count + 1
    WHERE id = promo_record.id;

    RETURN json_build_object(
        'success', true, 
        'access_type', promo_record.access_type,
        'description', promo_record.description
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin column to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Insert some sample promo codes (you can modify these)
INSERT INTO public.promo_codes (code, description, access_type, max_uses, expires_at) VALUES
('SECRET2024', 'Secret Level Access - 2024', 'secret_level', 100, '2024-12-31 23:59:59'),
('BETA_TESTER', 'Beta Tester Access', 'secret_level', 50, '2024-06-30 23:59:59'),
('EARLY_BIRD', 'Early Bird Special', 'secret_level', 25, '2024-03-31 23:59:59')
ON CONFLICT (code) DO NOTHING;

-- Set admin privileges for Chad (1deeptechnology@gmail.com)
-- This will update the user if they exist, or we'll handle it in the application
UPDATE public.users 
SET is_admin = true 
WHERE email = '1deeptechnology@gmail.com';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT SELECT, INSERT ON public.user_promo_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_secret_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(TEXT, UUID) TO authenticated;
