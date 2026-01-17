-- ============================================================================
-- 청크 크기 업데이트
-- 광고: 90일 → 180일
-- 연령대: 60일 → 90일
-- ============================================================================

UPDATE platform_configs
SET
  chunk_size_days = 180,
  demographics_chunk_size_days = 90,
  updated_at = NOW()
WHERE platform = 'Meta Ads';

-- 확인
SELECT platform, chunk_size_days, demographics_chunk_size_days
FROM platform_configs
WHERE platform = 'Meta Ads';
