-- ==========================================
-- 데이터 접근 권한 보안 수정 (v3 - 올바른 로직)
-- 문제: p_advertiser_ids가 NULL일 때 모든 조직의 데이터 조회
-- 해결: 두 번째 조건만 수정 (AND 조건 유지)
-- 날짜: 2026-02-02
-- ==========================================

-- 핵심 변경:
-- 기존: AND (p_advertiser_ids IS NULL OR ap.advertiser_id = ANY(p_advertiser_ids))
-- 수정: AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
--
-- 결과:
-- - 브랜드 선택: 선택한 브랜드만 (첫 번째 조건이 필터링)
-- - 전체 보기: 접근 가능한 모든 브랜드 (두 번째 조건 통과)
-- - 브랜드 없음: 아무것도 반환 안 함 (두 번째 조건 실패)

-- 1. KPI 총합 집계 함수
CREATE OR REPLACE FUNCTION get_kpi_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. 일별 집계 함수
CREATE OR REPLACE FUNCTION get_daily_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  date date,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.date,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.date
  ORDER BY ap.date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. 매체별 집계 함수
CREATE OR REPLACE FUNCTION get_media_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  source text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.source;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. 주별 집계 함수
CREATE OR REPLACE FUNCTION get_weekly_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  week_start date,
  week_end date,
  week_label text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('week', ap.date)::date + 1 as week_start,
    (DATE_TRUNC('week', ap.date)::date + 7) as week_end,
    TO_CHAR(DATE_TRUNC('week', ap.date)::date + 1, 'MM/DD') || ' ~ ' ||
    TO_CHAR(DATE_TRUNC('week', ap.date)::date + 7, 'MM/DD') as week_label,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY DATE_TRUNC('week', ap.date)
  ORDER BY DATE_TRUNC('week', ap.date) ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. 월별 집계 함수
CREATE OR REPLACE FUNCTION get_monthly_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  month_date date,
  month_label text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', ap.date)::date as month_date,
    TO_CHAR(DATE_TRUNC('month', ap.date), 'YYYY년 MM월') as month_label,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY DATE_TRUNC('month', ap.date)
  ORDER BY DATE_TRUNC('month', ap.date) ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. 요일별 집계 함수
CREATE OR REPLACE FUNCTION get_weekday_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  day_of_week integer,
  conversions numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM ap.date)::integer as day_of_week,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY EXTRACT(DOW FROM ap.date)
  ORDER BY EXTRACT(DOW FROM ap.date);
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. 크리에이티브별 집계 함수
CREATE OR REPLACE FUNCTION get_creative_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  ad_id text,
  source text,
  campaign_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.ad_id,
    ap.source,
    MAX(ap.campaign_name) as campaign_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.ad_id, ap.source;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. 성별 집계 함수
CREATE OR REPLACE FUNCTION get_gender_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  gender text,
  conversions numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    apd.gender,
    COALESCE(SUM(CASE
      WHEN apd.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN apd.complete_registrations
      ELSE apd.conversions
    END), 0)::numeric as conversions
  FROM ad_performance_demographics apd
  WHERE (p_advertiser_id IS NULL OR apd.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND apd.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR apd.date >= p_start_date)
    AND (p_end_date IS NULL OR apd.date <= p_end_date)
  GROUP BY apd.gender;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. 연령대별 성별 집계 함수
CREATE OR REPLACE FUNCTION get_age_gender_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  gender text,
  age text,
  conversions numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    apd.gender,
    apd.age,
    COALESCE(SUM(CASE
      WHEN apd.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN apd.complete_registrations
      ELSE apd.conversions
    END), 0)::numeric as conversions
  FROM ad_performance_demographics apd
  WHERE (p_advertiser_id IS NULL OR apd.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND apd.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR apd.date >= p_start_date)
    AND (p_end_date IS NULL OR apd.date <= p_end_date)
  GROUP BY apd.gender, apd.age;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. 캠페인별 집계 함수
CREATE OR REPLACE FUNCTION get_campaign_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  source text,
  campaign_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.campaign_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.source, ap.campaign_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. 광고그룹별 집계 함수
CREATE OR REPLACE FUNCTION get_ad_group_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  source text,
  ad_group_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.ad_group_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.source, ap.ad_group_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 12. 광고별 집계 함수
CREATE OR REPLACE FUNCTION get_ad_aggregated(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  source text,
  ad_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.ad_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.source, ap.ad_name;
END;
$$ LANGUAGE plpgsql STABLE;
