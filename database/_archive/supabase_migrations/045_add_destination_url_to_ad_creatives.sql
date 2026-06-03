-- Add destination_url column to ad_creatives table
-- This stores the landing URL where users are redirected when clicking on Meta ads

-- Add column
ALTER TABLE ad_creatives
ADD COLUMN IF NOT EXISTS destination_url TEXT;

-- Add index for performance optimization (optional)
CREATE INDEX IF NOT EXISTS idx_ad_creatives_destination_url
ON ad_creatives(destination_url)
WHERE destination_url IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN ad_creatives.destination_url IS
  '광고 클릭 시 이동하는 최종 Destination URL (Meta object_story_spec.link_data.link)';
