-- ===================================
-- Growth Dashboard - Improved Schema
-- Date: 2025-12-31
-- ===================================

-- 1. organizations 테이블
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. advertisers 테이블
CREATE TABLE advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  advertiser_id UUID REFERENCES advertisers(id) ON DELETE RESTRICT,
  organization_type TEXT,
  name TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. api_tokens 테이블
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE RESTRICT,
  platform TEXT NOT NULL,

  -- Google Ads
  customer_id TEXT,
  manager_account_id TEXT,
  developer_token TEXT,
  target_conversion_action_id TEXT[],
  refresh_token TEXT,
  client_id TEXT,
  client_secret TEXT,

  -- Meta Ads
  account_id TEXT,
  access_token TEXT,

  -- Naver Ads
  secret_key TEXT,

  -- 확장 필드
  additional_credentials JSONB DEFAULT '{}'::jsonb,

  -- 공통
  status TEXT DEFAULT 'active',
  data_collection_status TEXT DEFAULT 'pending',
  last_checked TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ad_performance 테이블
CREATE TABLE ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE RESTRICT,
  source TEXT NOT NULL,
  campaign_ad_id TEXT NOT NULL,
  date DATE NOT NULL,

  campaign_name TEXT,
  ad_group_name TEXT,
  ad_name TEXT,

  cost NUMERIC(20, 2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions NUMERIC(10, 2) DEFAULT 0,
  conversion_value NUMERIC(20, 2) DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  add_to_cart_value NUMERIC(20, 2) DEFAULT 0,

  -- 확장 필드
  additional_metrics JSONB DEFAULT '{}'::jsonb,

  collected_at TIMESTAMPTZ DEFAULT NOW(),
  issue_status TEXT DEFAULT '정상',
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(advertiser_id, source, campaign_ad_id, date)
);

-- 6. ad_creatives 테이블
CREATE TABLE ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE RESTRICT,
  ad_id TEXT NOT NULL,

  campaign_name TEXT,
  ad_group_name TEXT,
  ad_name TEXT,
  ad_type TEXT,
  creative_type TEXT,
  url TEXT,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  hash TEXT,

  -- 확장 필드
  metadata JSONB DEFAULT '{}'::jsonb,

  collected_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(advertiser_id, ad_id)
);
