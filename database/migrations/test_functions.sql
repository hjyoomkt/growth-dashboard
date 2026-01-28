-- SQL 함수가 제대로 생성되었는지 테스트

-- 1. 함수 존재 여부 확인
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_%aggregated'
ORDER BY routine_name;

-- 2. 간단한 테스트 쿼리 (KPI)
SELECT * FROM get_kpi_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-01',
  p_end_date := '2026-01-28',
  p_meta_conversion_type := 'purchase'
);

-- 3. 일별 집계 테스트
SELECT * FROM get_daily_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-20',
  p_end_date := '2026-01-28',
  p_meta_conversion_type := 'purchase'
)
LIMIT 10;

-- 4. 매체별 집계 테스트
SELECT * FROM get_media_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-01',
  p_end_date := '2026-01-28',
  p_meta_conversion_type := 'purchase'
);

-- 5. 요일별 전환수 테스트
SELECT * FROM get_weekday_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-01',
  p_end_date := '2026-01-28',
  p_meta_conversion_type := 'purchase'
)
ORDER BY day_of_week;

-- 6. 크리에이티브별 집계 테스트
SELECT * FROM get_creative_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-01',
  p_end_date := '2026-01-28',
  p_meta_conversion_type := 'purchase'
)
ORDER BY cost DESC
LIMIT 10;
