-- Add advertiser_ids column to invitation_codes table for multi-brand invitation support
-- This allows inviting users with access to multiple brands at once

-- Add advertiser_ids array column
ALTER TABLE invitation_codes
ADD COLUMN IF NOT EXISTS advertiser_ids UUID[];

-- Add comment explaining the column
COMMENT ON COLUMN invitation_codes.advertiser_ids IS 'Array of advertiser IDs that the invited user will have access to (supports multi-brand invitation)';

-- Note: Keep advertiser_id column for backward compatibility
-- When advertiser_ids is NULL or empty, fall back to advertiser_id
