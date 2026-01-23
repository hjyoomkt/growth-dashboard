-- Add Naver-specific metrics columns to ad_performance table
-- 작성일: 2026-01-24
-- 목적: 네이버 고유 지표 (CPC, 평균 순위) 저장을 위한 컬럼 추가

ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS cpc NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS avg_rank NUMERIC(10, 2);

COMMENT ON COLUMN ad_performance.cpc IS '클릭당 비용 (Cost Per Click, 네이버 고유 지표)';
COMMENT ON COLUMN ad_performance.avg_rank IS '평균 순위 (Average Rank, 네이버 고유 지표)';
