-- ============================================================================
-- 통합 스케줄러 배포 스크립트
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 한 번에 실행하세요.
-- ============================================================================

-- ============================================================================
-- STEP 1: 환경 설정
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 1: 환경 설정 시작';
  RAISE NOTICE '========================================';
END $$;

-- Supabase URL 설정
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://qdzdyoqtzkfpcogecyar.supabase.co';

-- Service Role Key 설정
ALTER DATABASE postgres
SET app.settings.supabase_service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

DO $$
BEGIN
  RAISE NOTICE '✅ 환경 설정 완료';
  RAISE NOTICE '   - Supabase URL: %', current_setting('app.settings.supabase_url', true);
  RAISE NOTICE '   - Service Role Key: 설정됨';
END $$;

-- ============================================================================
-- STEP 2: pg_cron 확장 활성화
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 2: pg_cron 확장 활성화';
  RAISE NOTICE '========================================';
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '✅ pg_cron 확장 활성화됨';
  ELSE
    RAISE EXCEPTION '❌ pg_cron 확장 활성화 실패';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: trigger_daily_collection 함수 생성
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 3: trigger_daily_collection 함수 생성';
  RAISE NOTICE '========================================';
END $$;

CREATE OR REPLACE FUNCTION trigger_daily_collection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  integration_record RECORD;
  yesterday_date TEXT;
  function_url TEXT;
  function_key TEXT;
  payload JSONB;
  response TEXT;
BEGIN
  yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/collect-ad-data';
  function_key := current_setting('app.settings.supabase_service_role_key', true);

  FOR integration_record IN
    SELECT id, platform, advertiser_id
    FROM integrations
    WHERE status = 'active'
      AND deleted_at IS NULL
  LOOP
    RAISE NOTICE 'Triggering collection for integration: % (platform: %)',
      integration_record.id, integration_record.platform;

    payload := jsonb_build_object(
      'integration_id', integration_record.id,
      'start_date', yesterday_date,
      'end_date', yesterday_date,
      'mode', 'daily',
      'collection_type', 'ads'
    );

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

    PERFORM pg_sleep(1);
  END LOOP;

  RAISE NOTICE 'Daily collection trigger completed';
END;
$func$;

DO $$
BEGIN
  RAISE NOTICE '✅ trigger_daily_collection 함수 생성 완료';
END $$;

-- ============================================================================
-- STEP 4: 기존 cron 작업 삭제 (재실행 시 중복 방지)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 4: 기존 cron 작업 정리';
  RAISE NOTICE '========================================';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-meta');
    RAISE NOTICE '   - daily-ad-data-collection-meta 삭제됨';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta-demographics') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-meta-demographics');
    RAISE NOTICE '   - daily-ad-data-collection-meta-demographics 삭제됨';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-meta-creatives') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-meta-creatives');
    RAISE NOTICE '   - daily-ad-data-collection-meta-creatives 삭제됨';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-google') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-google');
    RAISE NOTICE '   - daily-ad-data-collection-google 삭제됨';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ad-data-collection-naver') THEN
    PERFORM cron.unschedule('daily-ad-data-collection-naver');
    RAISE NOTICE '   - daily-ad-data-collection-naver 삭제됨';
  END IF;

  RAISE NOTICE '✅ 기존 작업 정리 완료';
END $$;

-- ============================================================================
-- STEP 5: cron 작업 등록
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 5: cron 작업 등록 시작';
  RAISE NOTICE '========================================';
END $$;

-- Meta 광고 데이터 (04:00 KST = 19:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta',
  '0 19 * * *',
  $cron$
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
  END;
  $cron$
);

-- Meta 성별/연령대 (04:30 KST = 19:30 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta-demographics',
  '30 19 * * *',
  $cron$
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
  END;
  $cron$
);

-- Meta 크리에이티브 (05:00 KST = 20:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta-creatives',
  '0 20 * * *',
  $cron$
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
  END;
  $cron$
);

-- Google Ads (05:30 KST = 20:30 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-google',
  '30 20 * * *',
  $cron$
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
  END;
  $cron$
);

-- Naver Ads (06:00 KST = 21:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-naver',
  '0 21 * * *',
  $cron$
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
  END;
  $cron$
);

DO $$
BEGIN
  RAISE NOTICE '✅ cron 작업 등록 완료';
END $$;

-- ============================================================================
-- STEP 6: 최종 확인
-- ============================================================================
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 6: 최종 확인';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname LIKE 'daily-ad-data-collection-%';

  RAISE NOTICE '등록된 cron 작업 수: %', job_count;

  IF job_count = 5 THEN
    RAISE NOTICE '✅ 모든 스케줄러 작업이 정상적으로 등록되었습니다!';
    RAISE NOTICE '';
    RAISE NOTICE '📅 스케줄:';
    RAISE NOTICE '   - 04:00 KST: Meta 광고 데이터';
    RAISE NOTICE '   - 04:30 KST: Meta 성별/연령대';
    RAISE NOTICE '   - 05:00 KST: Meta 크리에이티브';
    RAISE NOTICE '   - 05:30 KST: Google Ads';
    RAISE NOTICE '   - 06:00 KST: Naver Ads';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 확인 쿼리:';
    RAISE NOTICE '   SELECT * FROM cron.job ORDER BY jobname;';
    RAISE NOTICE '   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
  ELSE
    RAISE WARNING '⚠️  예상과 다른 작업 수: % (예상: 5)', job_count;
  END IF;
END $$;

-- 등록된 작업 목록 출력
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE 'daily-ad-data-collection-%'
ORDER BY jobname;
