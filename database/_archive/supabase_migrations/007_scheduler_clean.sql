-- ============================================================================
-- Phase 6: 자동 스케줄러 설정 (SaaS 완전 대응)
-- Edge Function을 통한 간접 호출 방식
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
END $$;

-- ============================================================================
-- 3. 스케줄러 트리거 함수 (플랫폼/타입별)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_scheduled_collection(
  target_platform TEXT,
  target_collection_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  integration_record RECORD;
  yesterday_date TEXT;
BEGIN
  yesterday_date := (CURRENT_DATE - INTERVAL '1 day')::TEXT;

  FOR integration_record IN
    SELECT id FROM integrations
    WHERE status = 'active'
      AND deleted_at IS NULL
      AND platform = target_platform
  LOOP
    -- collection_jobs 테이블에 작업 추가
    INSERT INTO collection_jobs (
      integration_id,
      start_date,
      end_date,
      status,
      mode,
      collection_type,
      created_at
    ) VALUES (
      integration_record.id,
      yesterday_date,
      yesterday_date,
      'pending',
      'daily',
      target_collection_type,
      NOW()
    );

    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE NOTICE 'Scheduled % % collection for %', target_platform, target_collection_type, yesterday_date;
END;
$$;

COMMENT ON FUNCTION trigger_scheduled_collection IS '스케줄러 트리거 함수 (collection_jobs에 작업 추가)';

-- ============================================================================
-- 4. cron 작업 등록 (collection_jobs 테이블에 추가만)
-- ============================================================================

-- Meta 광고 데이터 (04:00 KST = 19:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta',
  '0 19 * * *',
  $$SELECT trigger_scheduled_collection('Meta Ads', 'ads')$$
);

-- Meta 성별/연령대 (04:30 KST = 19:30 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta-demographics',
  '30 19 * * *',
  $$SELECT trigger_scheduled_collection('Meta Ads', 'demographics')$$
);

-- Meta 크리에이티브 (05:00 KST = 20:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-meta-creatives',
  '0 20 * * *',
  $$SELECT trigger_scheduled_collection('Meta Ads', 'creatives')$$
);

-- Google Ads (05:30 KST = 20:30 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-google',
  '30 20 * * *',
  $$SELECT trigger_scheduled_collection('Google Ads', 'ads')$$
);

-- Naver Ads (06:00 KST = 21:00 UTC)
SELECT cron.schedule(
  'daily-ad-data-collection-naver',
  '0 21 * * *',
  $$SELECT trigger_scheduled_collection('Naver Ads', 'ads')$$
);

-- ============================================================================
-- 5. scheduler-worker 주기 실행 (매 분마다 pending 작업 처리)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scheduler-worker') THEN
    PERFORM cron.unschedule('scheduler-worker');
  END IF;
END $$;

-- Edge Function 호출 함수
CREATE OR REPLACE FUNCTION invoke_scheduler_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_get(
    url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/scheduler-worker'
  );
END;
$$;

SELECT cron.schedule(
  'scheduler-worker',
  '* * * * *',
  $$SELECT invoke_scheduler_worker()$$
);

-- ============================================================================
-- 완료
-- ============================================================================
COMMENT ON EXTENSION pg_cron IS '자동 스케줄러 (SaaS 완전 대응)';
