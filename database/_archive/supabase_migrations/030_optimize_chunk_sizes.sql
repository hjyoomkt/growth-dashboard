-- ============================================================================
-- 청크 크기 최적화 (타임아웃 방지)
-- 문제: 180일 청크는 너무 커서 5분 타임아웃에 걸림
-- 해결: 90일로 조정하여 안정적인 수집 보장
-- ============================================================================

UPDATE platform_configs
SET
  chunk_size_days = 90,
  demographics_chunk_size_days = 90,
  updated_at = NOW()
WHERE platform = 'Meta Ads';

-- 확인
SELECT platform, chunk_size_days, demographics_chunk_size_days
FROM platform_configs
WHERE platform = 'Meta Ads';
