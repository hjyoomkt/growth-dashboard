-- Add advertiser_names column to invitation_codes table
-- This stores brand names with invitation codes to avoid RLS issues during signup
-- (Unauthenticated users cannot query advertisers table directly)

-- Add advertiser_names JSONB column to store array of brand names
ALTER TABLE invitation_codes
ADD COLUMN IF NOT EXISTS advertiser_names JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN invitation_codes.advertiser_names IS 'Array of advertiser names corresponding to advertiser_ids (avoids RLS issues for unauthenticated signup page)';

-- Example data structure:
-- advertiser_ids: ["uuid1", "uuid2"]
-- advertiser_names: ["브랜드A", "브랜드B"]
