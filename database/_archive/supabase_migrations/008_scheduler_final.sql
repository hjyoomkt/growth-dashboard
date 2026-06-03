-- ============================================================================
-- Phase 6: 자동 스케줄러 설정 (완전 SaaS 대응 - 하드코딩 제거)
-- Edge Function만 사용, PostgreSQL에는 최소한의 cron 설정만
-- ============================================================================

-- ============================================================================
-- 1. pg_cron 확장 활성화
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. 기존 cron 작업 삭제
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-meta');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta-demographics') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-meta-demographics');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta-creatives') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-meta-creatives');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-google') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-google');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-naver') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-naver');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scheduler-worker') THEN
    PERFORM cron.unschedule('scheduler-worker');
  END IF;
END $$;

-- ============================================================================
-- 3. HTTP 트리거 함수 (파라미터 전달)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_daily_scheduler(
  target_platform TEXT,
  target_collection_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_data TEXT;
BEGIN
  -- Edge Function 호출 (상대 경로 사용)
  SELECT content::TEXT INTO response_data
  FROM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/daily-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', target_platform,
      'collection_type', target_collection_type
    )
  );

  RAISE NOTICE 'Triggered daily scheduler: % %', target_platform, target_collection_type;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger scheduler: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 4. cron 작업 등록 (Edge Function 호출만)
-- ============================================================================

-- Meta 광고 데이터 (04:00 KST = 19:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta',
  '0 19 * * *',
  $$SELECT trigger_daily_scheduler('Meta Ads', 'ads')$$
);

-- Meta 성별/연령대 (04:30 KST = 19:30 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta-demographics',
  '30 19 * * *',
  $$SELECT trigger_daily_scheduler('Meta Ads', 'demographics')$$
);

-- Meta 크리에이티브 (05:00 KST = 20:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta-creatives',
  '0 20 * * *',
  $$SELECT trigger_daily_scheduler('Meta Ads', 'creatives')$$
);

-- Google Ads (05:30 KST = 20:30 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-google',
  '30 20 * * *',
  $$SELECT trigger_daily_scheduler('Google Ads', 'ads')$$
);

-- Naver Ads (06:00 KST = 21:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-naver',
  '0 21 * * *',
  $$SELECT trigger_daily_scheduler('Naver Ads', 'ads')$$
);

-- ============================================================================
-- 완료
-- ============================================================================
COMMENT ON EXTENSION pg_cron IS '자동 스케줄러 (완전 SaaS 대응)';
