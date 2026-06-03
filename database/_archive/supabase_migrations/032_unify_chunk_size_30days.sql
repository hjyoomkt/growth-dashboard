-- ============================================================================
-- 청크 크기 30일 통일
-- 배경: Meta API demographics 390일 제한 대응 및 안정성 향상
-- 목적: 광고/demographics 모두 30일 청크로 통일하여 안정적인 수집 보장
-- ============================================================================

UPDATE platform_configs
SET
  chunk_size_days = 30,
  demographics_chunk_size_days = 30,
  updated_at = NOW()
WHERE platform = 'Meta Ads';

-- 확인
SELECT platform, chunk_size_days, demographics_chunk_size_days, updated_at
FROM platform_configs
WHERE platform = 'Meta Ads';
