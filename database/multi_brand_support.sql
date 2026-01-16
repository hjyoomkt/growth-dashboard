-- Multi-brand support migration
-- Allows users to access multiple brands and groups brands under same company

-- 1. Add advertiser_group_id to advertisers table for grouping brands under same company
ALTER TABLE advertisers
ADD COLUMN advertiser_group_id UUID;

-- Create index for better query performance
CREATE INDEX idx_advertisers_group_id ON advertisers(advertiser_group_id);

-- 2. Create user_advertisers junction table for many-to-many relationship
CREATE TABLE user_advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique user-advertiser pairs
  UNIQUE(user_id, advertiser_id)
);

-- Create indexes for better join performance
CREATE INDEX idx_user_advertisers_user_id ON user_advertisers(user_id);
CREATE INDEX idx_user_advertisers_advertiser_id ON user_advertisers(advertiser_id);

-- 3. Migrate existing user-advertiser relationships from users.advertiser_id
INSERT INTO user_advertisers (user_id, advertiser_id)
SELECT id, advertiser_id
FROM users
WHERE advertiser_id IS NOT NULL
ON CONFLICT (user_id, advertiser_id) DO NOTHING;

-- 4. Add updated_at trigger for user_advertisers
CREATE OR REPLACE FUNCTION update_user_advertisers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_advertisers_updated_at
BEFORE UPDATE ON user_advertisers
FOR EACH ROW
EXECUTE FUNCTION update_user_advertisers_updated_at();

-- Note: Keep users.advertiser_id column for backward compatibility
-- It can be deprecated in future versions after full migration
