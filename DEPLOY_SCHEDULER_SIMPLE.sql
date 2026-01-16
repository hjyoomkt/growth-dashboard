-- ============================================================================
-- 간소화된 스케줄러 배포 스크립트
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 한 번에 실행하세요.
-- ============================================================================

-- ============================================================================
-- STEP 1: pg_cron 확장 활성화
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 1: pg_cron 확장 활성화';
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
-- STEP 2: 기존 cron 작업 삭제 (재실행 시 중복 방지)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 2: 기존 cron 작업 정리';
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
-- STEP 3: cron 작업 등록 (URL과 KEY 하드코딩)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 3: cron 작업 등록 시작';
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
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

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
        url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collect-ad-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0',
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
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

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
        url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collect-ad-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0',
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
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

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
        url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collect-ad-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0',
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
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

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
        url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collect-ad-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0',
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
    payload JSONB;
  BEGIN
    yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

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
        url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collect-ad-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0',
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
-- STEP 4: 최종 확인
-- ============================================================================
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 4: 최종 확인';
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
  ELSE
    RAISE WARNING '⚠️ 예상과 다른 작업 수: % (예상: 5)', job_count;
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
