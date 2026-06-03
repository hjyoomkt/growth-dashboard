-- ============================================================================
-- Meta 맞춤이벤트(custom conversion) 전환 지원
-- ============================================================================
-- 변경 내용:
--   1) advertisers.check_meta_conversion_type 제약 제거 (custom:{action_type} 허용)
--   2) 집계 함수 13개에 custom: 분기 추가
--      - p_meta_conversion_type LIKE 'custom:%' 이면
--        ad_performance.additional_metrics->'actions'/'action_values' 에서
--        substring(p_meta_conversion_type FROM 8) (= action_type) 값을 추출
--      - 값 없으면 0 (있으면 잡고 없으면 0)
--   3) 기존 purchase / complete_registration 동작은 100% 그대로 유지
--
-- 롤백: database/ROLLBACK_meta_custom_event_20260603_012244.sql 실행
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) CHECK 제약 제거 (custom:{action_type} 저장 허용)
-- ----------------------------------------------------------------------------
ALTER TABLE advertisers DROP CONSTRAINT IF EXISTS check_meta_conversion_type;

-- ----------------------------------------------------------------------------
-- 2) get_kpi_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_kpi_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 3) get_media_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_media_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(source text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 4) get_campaign_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_campaign_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(source text, campaign_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.campaign_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 5) get_ad_group_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ad_group_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(source text, campaign_name text, ad_group_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    MAX(ap.campaign_name) as campaign_name,
    ap.ad_group_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 6) get_ad_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ad_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(source text, campaign_name text, ad_group_name text, ad_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.campaign_name,
    ap.ad_group_name,
    COALESCE(ap.ad_name, 'N/A') as ad_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY ap.source, ap.campaign_name, ap.ad_group_name, COALESCE(ap.ad_name, 'N/A');
END;
$function$;

-- ----------------------------------------------------------------------------
-- 7) get_creative_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_creative_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(ad_id text, source text, campaign_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
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
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 8) get_daily_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_daily_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(date date, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.date,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 9) get_weekly_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(week_start date, week_end date, week_label text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
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
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 10) get_monthly_aggregated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(month_date date, month_label text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', ap.date)::date as month_date,
    TO_CHAR(DATE_TRUNC('month', ap.date), 'YYYY년 MM월') as month_label,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 11) get_weekday_aggregated (conversions only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekday_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(day_of_week integer, conversions numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM ap.date)::integer as day_of_week,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 12) get_age_gender_aggregated (demographics, conversions only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_age_gender_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(gender text, age text, conversions numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    apd.gender,
    apd.age,
    COALESCE(SUM(CASE
      WHEN apd.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((apd.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 13) get_gender_aggregated (demographics, conversions only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_gender_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(gender text, conversions numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    apd.gender,
    COALESCE(SUM(CASE
      WHEN apd.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((apd.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$function$;

-- ----------------------------------------------------------------------------
-- 14) get_download_csv_data (per-row, NOTE: p_advertiser_ids uses IS NULL OR)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_download_csv_data(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text)
RETURNS TABLE(date date, source text, campaign_name text, ad_group_name text, ad_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric, add_to_cart integer, add_to_cart_value numeric, complete_registrations integer, complete_registrations_value numeric)
LANGUAGE plpgsql STABLE AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.date,
    ap.source,
    ap.campaign_name,
    ap.ad_group_name,
    ap.ad_name,
    ap.cost,
    ap.impressions,
    ap.clicks,
    CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN COALESCE(ap.complete_registrations, 0)::numeric
      ELSE ap.conversions
    END as conversions,
    CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN COALESCE(ap.complete_registrations_value, 0)::numeric
      ELSE ap.conversion_value
    END as conversion_value,
    ap.add_to_cart,
    ap.add_to_cart_value,
    ap.complete_registrations,
    ap.complete_registrations_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NULL OR ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  ORDER BY ap.date ASC, ap.source, ap.campaign_name, ap.ad_group_name, ap.ad_name;
END;
$function$;

COMMIT;
