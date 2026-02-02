-- ==========================================
-- 보안 수정 검증 쿼리
-- fix_data_access_security.sql 적용 후 실행
-- ==========================================

-- 테스트 1: p_advertiser_ids = NULL일 때 → 0개 행 반환해야 함
SELECT '테스트 1: NULL 파라미터 (0개 행 반환 예상)' as test_name;
SELECT * FROM get_daily_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-26',
  p_end_date := '2026-02-01',
  p_meta_conversion_type := 'purchase'
);

-- 테스트 2: p_advertiser_ids = 빈 배열일 때 → 0개 행 반환해야 함
SELECT '테스트 2: 빈 배열 (0개 행 반환 예상)' as test_name;
SELECT * FROM get_daily_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := '{}'::uuid[],
  p_start_date := '2026-01-26',
  p_end_date := '2026-02-01',
  p_meta_conversion_type := 'purchase'
);

-- 테스트 3: 유효한 advertiser_id가 있을 때 → 해당 브랜드 데이터만 반환
-- (실제 advertiser_id를 넣어서 테스트하세요)
-- SELECT '테스트 3: 유효한 advertiser_id' as test_name;
-- SELECT * FROM get_daily_aggregated(
--   p_advertiser_id := NULL,
--   p_advertiser_ids := ARRAY['실제-advertiser-uuid']::uuid[],
--   p_start_date := '2026-01-26',
--   p_end_date := '2026-02-01',
--   p_meta_conversion_type := 'purchase'
-- );

-- ==========================================
-- 예상 결과:
-- - 테스트 1: 0개 행 (수정 전: 7개 행)
-- - 테스트 2: 0개 행
-- - 테스트 3: 해당 브랜드의 데이터만 반환
-- ==========================================
