-- Add target_advertiser_ids column to board_posts table
ALTER TABLE board_posts
ADD COLUMN IF NOT EXISTS target_advertiser_ids text[];

-- Add comment
COMMENT ON COLUMN board_posts.target_advertiser_ids IS 'Array of advertiser IDs that this post targets';
