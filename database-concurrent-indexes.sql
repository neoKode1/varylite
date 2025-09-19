-- Concurrent Index Creation Script for vARY Ai
-- Run these commands individually in Supabase SQL editor for better performance
-- These commands cannot be run inside transaction blocks

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_credit_balance ON users(credit_balance) WHERE credit_balance IS NOT NULL;

-- Galleries table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_galleries_user_id_created_at ON galleries(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_galleries_file_type ON galleries(file_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_galleries_user_id_file_type ON galleries(user_id, file_type);

-- Credit transactions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_transactions_user_id_created_at ON credit_transactions(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_transactions_amount ON credit_transactions(amount);

-- Image uploads table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_uploads_user_id ON image_uploads(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_uploads_session_id ON image_uploads(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_uploads_created_at ON image_uploads(created_at DESC);

-- Usage tracking table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_action_type ON usage_tracking(action_type);

-- Promo codes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);

-- User promo access table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_promo_access_user_id ON user_promo_access(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_promo_access_redeemed_at ON user_promo_access(redeemed_at);

-- Collections table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_public ON collections(is_public);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

-- Collection items table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_gallery_id ON collection_items(gallery_id);
