-- Drop existing credit functions to avoid conflicts
-- Run this if you get "function name is not unique" error

-- Drop existing credit functions
DROP FUNCTION IF EXISTS add_user_credits(UUID, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_user_credits(UUID, DECIMAL);
DROP FUNCTION IF EXISTS add_user_credits(UUID, DECIMAL, TEXT);

DROP FUNCTION IF EXISTS use_user_credits_for_generation(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS use_user_credits_for_generation(UUID, TEXT, TEXT);

DROP FUNCTION IF EXISTS check_low_balance_notification(UUID);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Existing credit functions dropped successfully!';
    RAISE NOTICE '🚀 Ready to run pay-as-you-go-schema-update.sql';
END $$;
