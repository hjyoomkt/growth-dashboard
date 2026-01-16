-- ===================================
-- creatives 테이블 생성
-- 광고 크리에이티브 관리
-- ===================================

CREATE TABLE IF NOT EXISTS creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- 크리에이티브 기본 정보
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'image', 'video', 'carousel', 'text' 등
  platform TEXT NOT NULL, -- 'google', 'meta', 'naver' 등

  -- 미디어 정보
  media_url TEXT,
  thumbnail_url TEXT,

  -- 광고 카피
  headline TEXT,
  description TEXT,
  call_to_action TEXT,

  -- 성과 지표
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions NUMERIC(10, 2) DEFAULT 0,
  cost NUMERIC(20, 2) DEFAULT 0,

  -- 상태
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'

  -- 추가 데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 타임스탬프
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_creatives_advertiser_id ON creatives(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_creatives_platform ON creatives(platform);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON creatives(status);
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON creatives(created_at DESC);

-- 확인
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'creatives'
ORDER BY ordinal_position;
