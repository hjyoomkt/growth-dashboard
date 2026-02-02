-- 데이터 접근 권한 디버깅 쿼리
-- 문제: agency_admin이 브랜드가 없는 상태에서 타 조직의 데이터 조회

-- 1. 해당 organization에 속한 브랜드(advertisers) 확인
SELECT
  id,
  name,
  organization_id,
  deleted_at
FROM advertisers
WHERE organization_id = '2fcd99c1-bba1-4b53-9e1c-f084261dacba';

-- 2. 전체 브랜드 목록 (organization별)
SELECT
  a.id,
  a.name as advertiser_name,
  a.organization_id,
  o.name as organization_name,
  o.type as organization_type
FROM advertisers a
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE a.deleted_at IS NULL
ORDER BY o.name, a.name;

-- 3. ad_performance 테이블에서 최근 데이터 확인 (날짜 범위: 2026-01-26 ~ 2026-02-01)
SELECT
  ap.advertiser_id,
  a.name as advertiser_name,
  a.organization_id,
  o.name as organization_name,
  COUNT(*) as row_count,
  SUM(ap.cost) as total_cost
FROM ad_performance ap
LEFT JOIN advertisers a ON ap.advertiser_id = a.id
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE ap.date >= '2026-01-26'
  AND ap.date <= '2026-02-01'
  AND ap.deleted_at IS NULL
GROUP BY ap.advertiser_id, a.name, a.organization_id, o.name
ORDER BY o.name, a.name;

-- 4. RPC 함수 테스트: p_advertiser_ids가 NULL일 때
SELECT * FROM get_daily_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := NULL,
  p_start_date := '2026-01-26',
  p_end_date := '2026-02-01',
  p_meta_conversion_type := 'purchase'
);

-- 5. RPC 함수 테스트: p_advertiser_ids가 빈 배열일 때
-- PostgreSQL에서 빈 배열: '{}'::uuid[]
SELECT * FROM get_daily_aggregated(
  p_advertiser_id := NULL,
  p_advertiser_ids := '{}'::uuid[],
  p_start_date := '2026-01-26',
  p_end_date := '2026-02-01',
  p_meta_conversion_type := 'purchase'
);
