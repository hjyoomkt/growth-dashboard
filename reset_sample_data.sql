-- ================================================
-- 샘플 데이터 초기화 및 재삽입 스크립트
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- 1. 기존 샘플 데이터 삭제
DELETE FROM ad_performance WHERE advertiser_id IN (SELECT id FROM advertisers LIMIT 1);
DELETE FROM ad_creatives WHERE advertiser_id IN (SELECT id FROM advertisers LIMIT 1);

-- 2. ad_creatives 샘플 데이터 삽입
INSERT INTO ad_creatives (advertiser_id, ad_id, ad_name, url, creative_type, created_at)
SELECT
  (SELECT id FROM advertisers LIMIT 1),
  ad_id,
  ad_name,
  url,
  creative_type,
  NOW()
FROM (VALUES
  ('meta_ad_001', '여름 세일 메인 배너', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image'),
  ('meta_ad_002', '신상품 런칭 영상', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'video'),
  ('meta_ad_003', '할인 이벤트 배너', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image'),
  ('meta_ad_004', '브랜드 스토리 영상', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'video'),
  ('meta_ad_005', '특가 프로모션', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image'),
  ('meta_ad_006', '리타게팅 광고', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image')
) AS t(ad_id, ad_name, url, creative_type)
ON CONFLICT (advertiser_id, ad_id) DO UPDATE SET
  ad_name = EXCLUDED.ad_name,
  url = EXCLUDED.url,
  creative_type = EXCLUDED.creative_type;

-- 3. ad_performance 샘플 데이터 삽입 (최근 30일)
-- 각 광고별 × 30일 = 180개 레코드
INSERT INTO ad_performance (
  advertiser_id, campaign_name, ad_group_name, ad_name, ad_id, source, date,
  cost, impressions, clicks, conversions, conversion_value, created_at
)
SELECT
  (SELECT id FROM advertisers LIMIT 1) as advertiser_id,
  '캠페인 ' || ((ad_index - 1) / 2 + 1)::text as campaign_name,
  '광고세트 ' || ad_index::text as ad_group_name,
  ad_names[ad_index] as ad_name,
  ad_ids[ad_index] as ad_id,
  sources[ad_index] as source,
  (CURRENT_DATE - day_offset * INTERVAL '1 day')::date as date,
  ROUND((base_costs[ad_index] * (0.8 + random() * 0.4))::numeric, 0) as cost,
  ROUND((base_costs[ad_index] * (0.8 + random() * 0.4) * (50 + random() * 30))::numeric, 0) as impressions,
  ROUND((base_costs[ad_index] * (0.8 + random() * 0.4) * (50 + random() * 30) * (0.01 + random() * 0.02))::numeric, 0) as clicks,
  ROUND((base_costs[ad_index] * (0.8 + random() * 0.4) * (50 + random() * 30) * (0.01 + random() * 0.02) * (0.02 + random() * 0.05))::numeric, 0) as conversions,
  ROUND((base_costs[ad_index] * (0.8 + random() * 0.4) * (2 + random() * 2))::numeric, 0) as conversion_value,
  NOW() as created_at
FROM
  generate_series(0, 29) as day_offset,
  generate_series(1, 6) as ad_index,
  (SELECT ARRAY['meta_ad_001', 'meta_ad_002', 'meta_ad_003', 'meta_ad_004', 'meta_ad_005', 'meta_ad_006']) as ad_ids(ad_ids),
  (SELECT ARRAY['Meta', 'Meta', 'Naver', 'Google', 'Kakao', 'Criteo']) as sources(sources),
  (SELECT ARRAY['여름 세일 메인 배너', '신상품 런칭 영상', '할인 이벤트 배너', '브랜드 스토리 영상', '특가 프로모션', '리타게팅 광고']) as ad_names(ad_names),
  (SELECT ARRAY[50000, 40000, 35000, 30000, 25000, 20000]) as base_costs(base_costs)
ON CONFLICT (advertiser_id, source, ad_id, date) DO UPDATE SET
  cost = EXCLUDED.cost,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  conversions = EXCLUDED.conversions,
  conversion_value = EXCLUDED.conversion_value;

-- 4. 삽입 결과 확인
SELECT
  '크리에이티브' as 테이블,
  COUNT(*) as 레코드수
FROM ad_creatives
WHERE advertiser_id IN (SELECT id FROM advertisers LIMIT 1)
  AND deleted_at IS NULL

UNION ALL

SELECT
  '성과데이터' as 테이블,
  COUNT(*) as 레코드수
FROM ad_performance
WHERE advertiser_id IN (SELECT id FROM advertisers LIMIT 1)
  AND deleted_at IS NULL;

-- 5. 매체별 집계 확인
SELECT
  source as 매체,
  COUNT(DISTINCT ad_id) as 광고수,
  COUNT(*) as 일수,
  ROUND(SUM(cost)::numeric, 0) as 총비용,
  ROUND(SUM(impressions)::numeric, 0) as 총노출,
  SUM(clicks) as 총클릭,
  SUM(conversions) as 총전환,
  ROUND(SUM(conversion_value)::numeric, 0) as 총매출
FROM ad_performance
WHERE advertiser_id IN (SELECT id FROM advertisers LIMIT 1)
  AND deleted_at IS NULL
GROUP BY source
ORDER BY 총비용 DESC;
