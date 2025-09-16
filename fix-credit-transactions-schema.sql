-- Fix credit_transactions table to match expected schema
-- This adds the missing model_name column and other required fields

-- Step 1: Add missing columns to credit_transactions table
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS model_name TEXT,
ADD COLUMN IF NOT EXISTS generation_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 2: Update the constraint to include all transaction types
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type IN ('credit_added', 'credit_used', 'credit_refunded', 'credit_expired', 'refund', 'bonus', 'purchase', 'migration', 'grandfathered'));

-- Step 3: Create the use_user_credits function if it doesn't exist
CREATE OR REPLACE FUNCTION public.use_user_credits(
    p_user_id UUID,
    p_model_name TEXT,
    p_generation_type TEXT,
    p_generation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_model_cost DECIMAL(10,4);
    v_current_balance DECIMAL(10,4);
    v_new_balance DECIMAL(10,4);
    v_user_email TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Get user info and check if admin
    SELECT email, is_admin INTO v_user_email, v_is_admin
    FROM public.users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found',
            'creditsUsed', 0,
            'remainingCredits', 0
        );
    END IF;
    
    -- Admin users don't use credits
    IF v_is_admin OR v_user_email = '1deeptechnology@gmail.com' THEN
        RETURN jsonb_build_object(
            'success', true,
            'creditsUsed', 0,
            'remainingCredits', 999999,
            'message', 'Admin user - no credits deducted'
        );
    END IF;
    
    -- Get model cost
    SELECT cost_per_generation INTO v_model_cost
    FROM public.model_costs 
    WHERE model_name = p_model_name AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Model not found or inactive',
            'creditsUsed', 0,
            'remainingCredits', 0
        );
    END IF;
    
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM public.user_credits 
    WHERE user_id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No credits found for user',
            'creditsUsed', 0,
            'remainingCredits', 0
        );
    END IF;
    
    -- Check if user has sufficient credits
    IF v_current_balance < v_model_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'creditsUsed', 0,
            'remainingCredits', v_current_balance
        );
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - v_model_cost;
    
    -- Update user credits
    UPDATE public.user_credits 
    SET 
        used_credits = used_credits + v_model_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Record transaction
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        amount,
        model_name,
        generation_id,
        description
    ) VALUES (
        p_user_id,
        'credit_used',
        v_model_cost,
        p_model_name,
        p_generation_id,
        'Credit used for ' || p_model_name || ' generation'
    );
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'creditsUsed', v_model_cost,
        'remainingCredits', v_new_balance,
        'message', 'Credits deducted successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM,
        'creditsUsed', 0,
        'remainingCredits', 0
    );
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.use_user_credits(UUID, TEXT, TEXT, UUID) TO authenticated;

-- Step 5: Verify the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'use_user_credits';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ credit_transactions table schema fixed!';
    RAISE NOTICE '✅ use_user_credits function created!';
    RAISE NOTICE '📊 Added columns: model_name, generation_id, metadata';
END $$;
