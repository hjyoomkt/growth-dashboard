-- ============================================================================
-- Phase 6: 자동 스케줄러 설정
-- 목적: 매일 새벽 자동 데이터 수집 (pg_cron 사용)
-- 작성일: 2026-01-12
-- ============================================================================

-- ============================================================================
-- 1. pg_cron 확장 활성화
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. trigger_daily_collection 함수 생성
-- 목적: 모든 active integrations에 대해 전날 데이터 수집
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_daily_collection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  integration_record RECORD;
  yesterday_date TEXT;
  function_url TEXT;
  function_key TEXT;
  payload JSONB;
  response TEXT;
BEGIN
  -- 어제 날짜 계산
  yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

  -- Supabase Edge Function URL 및 Key 설정
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
  function_key := current_setting('app.settings.supabase_service_role_key', true);

  -- 모든 active integrations 조회
  FOR integration_record IN
    SELECT id, platform, advertiser_id
    FROM integrations
    WHERE status = 'active'
      AND deleted_at IS NULL
  LOOP
    RAISE NOTICE 'Triggering collection for integration: % (platform: %)',
      integration_record.id, integration_record.platform;

    -- 플랫폼별 collection_type 결정
    -- Meta는 'daily' 모드에서 ads만 수집 (demographics와 creatives는 초기 수집에만 필요)
    payload := jsonb_build_object(
      'integration_id', integration_record.id,
      'start_date', yesterday_date,
      'end_date', yesterday_date,
      'mode', 'daily',
      'collection_type', 'ads'
    );

    -- Edge Function 호출 (net.http_post 사용)
    BEGIN
      SELECT content INTO response
      FROM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || function_key,
          'Content-Type', 'application/json'
        ),
        body := payload
      );

      RAISE NOTICE 'Collection triggered successfully for integration: %', integration_record.id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger collection for integration %: %',
        integration_record.id, SQLERRM;
    END;

    -- Rate Limit 방지 (매체별 1초 대기)
    PERFORM pg_sleep(1);

  END LOOP;

  RAISE NOTICE 'Daily collection trigger completed';
END;
$$;

COMMENT ON FUNCTION trigger_daily_collection IS '매일 새벽 자동 데이터 수집 트리거 (전날 데이터)';

-- ============================================================================
-- 3. pg_cron 스케줄 등록
-- ============================================================================

-- 기존 스케줄 삭제 (재실행 시 중복 방지)
SELECT cron.unschedule('daily-ad-data-collection-meta')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta'
);

SELECT cron.unschedule('daily-ad-data-collection-meta-demographics')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta-demographics'
);

SELECT cron.unschedule('daily-ad-data-collection-meta-creatives')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta-creatives'
);

SELECT cron.unschedule('daily-ad-data-collection-google')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-google'
);

SELECT cron.unschedule('daily-ad-data-collection-naver')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-naver'
);

-- ============================================================================
-- 매일 새벽 4시 (KST) = 19:00 (UTC) - Meta 광고 데이터
-- ============================================================================
SELECT cron.schedule(
  'daily-ad-data-collection-meta',
  '0 19 * * *', -- 매일 19:00 UTC (04:00 KST)
  $$
  DO $$
  DECLARE
    integration_record RECORD;
    yesterday_date TEXT;
    function_url TEXT;
    function_key TEXT;
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
    function_key := current_setting('app.settings.supabase_service_role_key', true);

    FOR integration_record IN
      SELECT id FROM integrations
      WHERE status = 'active' AND deleted_at IS NULL AND platform = 'Meta Ads'
    LOOP
      payload := jsonb_build_object(
        'integration_id', integration_record.id,
        'start_date', yesterday_date,
        'end_date', yesterday_date,
        'mode', 'daily',
        'collection_type', 'ads'
      );

      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || function_key,
          'Content-Type', 'application/json'
        ),
        body := payload
      );

      PERFORM pg_sleep(1);
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 매일 새벽 4시 30분 (KST) = 19:30 (UTC) - Meta 성별/연령대
-- ============================================================================
SELECT cron.schedule(
  'daily-ad-data-collection-meta-demographics',
  '30 19 * * *', -- 매일 19:30 UTC (04:30 KST)
  $$
  DO $$
  DECLARE
    integration_record RECORD;
    yesterday_date TEXT;
    function_url TEXT;
    function_key TEXT;
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
    function_key := current_setting('app.settings.supabase_service_role_key', true);

    FOR integration_record IN
      SELECT id FROM integrations
      WHERE status = 'active' AND deleted_at IS NULL AND platform = 'Meta Ads'
    LOOP
      payload := jsonb_build_object(
        'integration_id', integration_record.id,
        'start_date', yesterday_date,
        'end_date', yesterday_date,
        'mode', 'daily',
        'collection_type', 'demographics'
      );

      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || function_key,
          'Content-Type', 'application/json'
        ),
        body := payload
      );

      PERFORM pg_sleep(1);
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 매일 새벽 5시 (KST) = 20:00 (UTC) - Meta 크리에이티브
-- ============================================================================
SELECT cron.schedule(
  'daily-ad-data-collection-meta-creatives',
  '0 20 * * *', -- 매일 20:00 UTC (05:00 KST)
  $$
  DO $$
  DECLARE
    integration_record RECORD;
    yesterday_date TEXT;
    function_url TEXT;
    function_key TEXT;
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
    function_key := current_setting('app.settings.supabase_service_role_key', true);

    FOR integration_record IN
      SELECT id FROM integrations
      WHERE status = 'active' AND deleted_at IS NULL AND platform = 'Meta Ads'
    LOOP
      payload := jsonb_build_object(
        'integration_id', integration_record.id,
        'start_date', yesterday_date,
        'end_date', yesterday_date,
        'mode', 'daily',
        'collection_type', 'creatives'
      );

      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || function_key,
          'Content-Type', 'application/json'
        ),
        body := payload
      );

      PERFORM pg_sleep(1);
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 매일 새벽 5시 30분 (KST) = 20:30 (UTC) - Google Ads
-- ============================================================================
SELECT cron.schedule(
  'daily-ad-data-collection-google',
  '30 20 * * *', -- 매일 20:30 UTC (05:30 KST)
  $$
  DO $$
  DECLARE
    integration_record RECORD;
    yesterday_date TEXT;
    function_url TEXT;
    function_key TEXT;
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
    function_key := current_setting('app.settings.supabase_service_role_key', true);

    FOR integration_record IN
      SELECT id FROM integrations
      WHERE status = 'active' AND deleted_at IS NULL AND platform = 'Google Ads'
    LOOP
      payload := jsonb_build_object(
        'integration_id', integration_record.id,
        'start_date', yesterday_date,
        'end_date', yesterday_date,
        'mode', 'daily',
        'collection_type', 'ads'
      );

      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || function_key,
          'Content-Type', 'application/json'
        ),
        body := payload
      );

      PERFORM pg_sleep(1);
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 매일 새벽 6시 (KST) = 21:00 (UTC) - Naver Ads
-- ============================================================================
SELECT cron.schedule(
  'daily-ad-data-collection-naver',
  '0 21 * * *', -- 매일 21:00 UTC (06:00 KST)
  $$
  DO $$
  DECLARE
    integration_record RECORD;
    yesterday_date TEXT;
    function_url TEXT;
    function_key TEXT;
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
    function_key := current_setting('app.settings.supabase_service_role_key', true);

    FOR integration_record IN
      SELECT id FROM integrations
      WHERE status = 'active' AND deleted_at IS NULL AND platform = 'Naver Ads'
    LOOP
      payload := jsonb_build_object(
        'integration_id', integration_record.id,
        'start_date', yesterday_date,
        'end_date', yesterday_date,
        'mode', 'daily',
        'collection_type', 'ads'
      );

      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || function_key,
          'Content-Type', 'application/json'
        ),
        body := payload
      );

      PERFORM pg_sleep(1);
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 완료
-- ============================================================================

COMMENT ON EXTENSION pg_cron IS '자동 스케줄러를 위한 pg_cron 확장';

-- 스케줄러 상태 확인 쿼리
-- SELECT * FROM cron.job ORDER BY jobname;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
