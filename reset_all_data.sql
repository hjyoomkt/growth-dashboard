-- ================================================
-- 전체 데이터 초기화 및 재설정
-- ================================================

-- 1. 모든 데이터 삭제
DELETE FROM ad_performance;
DELETE FROM ad_creatives;

-- 2. 크리에이티브 삽입 (나이키 코리아용)
INSERT INTO ad_creatives (advertiser_id, ad_id, ad_name, url, creative_type, created_at)
SELECT
  id as advertiser_id,
  'meta_ad_' || ROW_NUMBER() OVER () as ad_id,
  ad_name,
  url,
  creative_type,
  NOW()
FROM advertisers,
  (VALUES
    ('여름 세일 메인 배너', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image'),
    ('신상품 런칭 영상', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'video'),
    ('할인 이벤트 배너', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image'),
    ('브랜드 스토리 영상', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'video'),
    ('특가 프로모션', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image'),
    ('리타게팅 광고', 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png', 'image')
  ) AS t(ad_name, url, creative_type)
WHERE name = '나이키 코리아';

-- 3. 성과 데이터 삽입 (최근 30일, 광고별 하루 1행씩)
INSERT INTO ad_performance (
  advertiser_id, campaign_name, ad_group_name, ad_name, ad_id, source, date,
  cost, impressions, clicks, conversions, conversion_value, created_at
)
SELECT
  adv.id as advertiser_id,
  '캠페인 ' || ((ROW_NUMBER() OVER (PARTITION BY day_offset ORDER BY creative.ad_id) - 1) / 2 + 1)::text as campaign_name,
  '광고세트 ' || ROW_NUMBER() OVER (PARTITION BY day_offset ORDER BY creative.ad_id)::text as ad_group_name,
  creative.ad_name,
  creative.ad_id,
  CASE ROW_NUMBER() OVER (PARTITION BY day_offset ORDER BY creative.ad_id)
    WHEN 1 THEN 'Meta'
    WHEN 2 THEN 'Meta'
    WHEN 3 THEN 'Naver'
    WHEN 4 THEN 'Google'
    WHEN 5 THEN 'Kakao'
    WHEN 6 THEN 'Criteo'
  END as source,
  (CURRENT_DATE - day_offset * INTERVAL '1 day')::date as date,
  ROUND((base_cost * (0.8 + random() * 0.4))::numeric, 0) as cost,
  ROUND((base_cost * (0.8 + random() * 0.4) * (50 + random() * 30))::numeric, 0) as impressions,
  ROUND((base_cost * (0.8 + random() * 0.4) * (50 + random() * 30) * (0.01 + random() * 0.02))::numeric, 0) as clicks,
  ROUND((base_cost * (0.8 + random() * 0.4) * (50 + random() * 30) * (0.01 + random() * 0.02) * (0.02 + random() * 0.05))::numeric, 0) as conversions,
  ROUND((base_cost * (0.8 + random() * 0.4) * (2 + random() * 2))::numeric, 0) as conversion_value,
  NOW() as created_at
FROM
  advertisers adv,
  generate_series(0, 29) as day_offset,
  ad_creatives creative,
  (SELECT UNNEST(ARRAY[50000, 40000, 35000, 30000, 25000, 20000]) as base_cost, generate_series(1, 6) as idx) costs
WHERE
  adv.name = '나이키 코리아'
  AND creative.advertiser_id = adv.id
  AND ROW_NUMBER() OVER (PARTITION BY day_offset, creative.advertiser_id ORDER BY creative.ad_id) = costs.idx;

-- 4. 검증
SELECT '✅ 완료!' as 상태;

SELECT
  '크리에이티브' as 테이블,
  COUNT(*) as 개수
FROM ad_creatives
WHERE advertiser_id IN (SELECT id FROM advertisers WHERE name = '나이키 코리아')
  AND deleted_at IS NULL;

SELECT
  '성과데이터' as 테이블,
  COUNT(*) as 개수
FROM ad_performance
WHERE advertiser_id IN (SELECT id FROM advertisers WHERE name = '나이키 코리아')
  AND deleted_at IS NULL;

SELECT
  date as 날짜,
  COUNT(*) as 행수,
  ROUND(SUM(cost)) as 총비용
FROM ad_performance
WHERE advertiser_id IN (SELECT id FROM advertisers WHERE name = '나이키 코리아')
  AND deleted_at IS NULL
GROUP BY date
ORDER BY date DESC
LIMIT 5;
