-- ==========================================
-- CSV 다운로드용 데이터 조회 함수
-- Date: 2026-02-10
-- ==========================================

CREATE OR REPLACE FUNCTION get_download_csv_data(
  p_advertiser_id uuid DEFAULT NULL,
  p_advertiser_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_meta_conversion_type text DEFAULT 'purchase'
)
RETURNS TABLE(
  date date,
  source text,
  campaign_name text,
  ad_group_name text,
  ad_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric,
  add_to_cart integer,
  add_to_cart_value numeric,
  complete_registrations integer,
  complete_registrations_value numeric
) AS $$
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
    -- Meta 전환 타입 고려 (기존 함수들과 동일한 로직)
    CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN COALESCE(ap.complete_registrations, 0)::numeric
      ELSE ap.conversions
    END as conversions,
    CASE
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
    -- advertiser 필터 (RLS 정책과 함께 동작)
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NULL OR ap.advertiser_id = ANY(p_advertiser_ids))
    -- 날짜 필터
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  ORDER BY ap.date ASC, ap.source, ap.campaign_name, ap.ad_group_name, ap.ad_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 함수 설명 추가
COMMENT ON FUNCTION get_download_csv_data IS 'CSV 다운로드용 광고 성과 데이터 조회 (Meta 전환 타입 반영)';
