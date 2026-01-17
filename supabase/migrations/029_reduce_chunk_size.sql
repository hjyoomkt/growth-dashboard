-- ============================================================================
-- 청크 크기 축소 (타임아웃 방지)
-- 문제: 180일 청크는 너무 커서 Supabase 함수 실행 시간 제한(10분)에 걸림
-- 해결: 7일로 축소하여 안정적인 수집 보장
-- ============================================================================

UPDATE platform_configs
SET
  chunk_size_days = 7,
  demographics_chunk_size_days = 7,
  updated_at = NOW()
WHERE platform = 'Meta Ads';

-- 확인
SELECT platform, chunk_size_days, demographics_chunk_size_days
FROM platform_configs
WHERE platform = 'Meta Ads';
