-- ============================================================================
-- Migration 015: ad_creatives 테이블에 Meta 크리에이티브 컬럼 추가
-- 목적: Meta 광고 크리에이티브 수집 시 image_url, video_id 저장
-- 작성일: 2026-01-15
-- ============================================================================

-- ad_creatives 테이블에 컬럼 추가
ALTER TABLE ad_creatives
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS video_id TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN ad_creatives.image_url IS 'Meta 광고 이미지 URL';
COMMENT ON COLUMN ad_creatives.video_id IS 'Meta 광고 비디오 ID';

-- ============================================================================
-- 완료
-- ============================================================================
