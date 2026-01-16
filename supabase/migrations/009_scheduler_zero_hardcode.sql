-- ============================================================================
-- Phase 6: 자동 스케줄러 설정 (제로 하드코딩)
-- pg_net + Edge Function 내부 호출 방식
-- ============================================================================

-- ============================================================================
-- 1. pg_cron 및 pg_net 확장 활성화
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. 기존 cron 작업 삭제
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE 'daily-scheduler-%') THEN
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname LIKE 'daily-scheduler-%';
  END IF;
END $$;

-- ============================================================================
-- 3. 스케줄러 설정 테이블
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduler_config (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 설정 (배포 시 자동으로 현재 프로젝트 URL로 설정됨)
INSERT INTO scheduler_config (key, value)
VALUES
  ('supabase_url', 'https://qdzdyoqtzkfpcogecyar.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- ============================================================================
-- 4. 스케줄러 트리거 함수 (설정 테이블에서 읽기)
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
  base_url TEXT;
  auth_key TEXT;
BEGIN
  -- 설정 테이블에서 읽기
  SELECT value INTO base_url
  FROM scheduler_config
  WHERE key = 'supabase_url';

  SELECT value INTO auth_key
  FROM scheduler_config
  WHERE key = 'service_role_key';

  -- Edge Function 호출
  PERFORM net.http_post(
    url := base_url || '/functions/v1/daily-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || auth_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', target_platform,
      'collection_type', target_collection_type
    )
  );

  RAISE NOTICE 'Triggered: % %', target_platform, target_collection_type;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Scheduler trigger failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 5. cron 작업 등록
-- ============================================================================

-- Meta Ads (04:00 KST = 19:00 UTC)
SELECT cron.schedule(
  'daily-scheduler-meta-ads',
  '0 19 * * *',
  $$SELECT trigger_daily_scheduler('Meta Ads', 'ads')$$
);

-- Meta Demographics (04:30 KST = 19:30 UTC)
SELECT cron.schedule(
  'daily-scheduler-meta-demographics',
  '30 19 * * *',
  $$SELECT trigger_daily_scheduler('Meta Ads', 'demographics')$$
);

-- Meta Creatives (05:00 KST = 20:00 UTC)
SELECT cron.schedule(
  'daily-scheduler-meta-creatives',
  '0 20 * * *',
  $$SELECT trigger_daily_scheduler('Meta Ads', 'creatives')$$
);

-- Google Ads (05:30 KST = 20:30 UTC)
SELECT cron.schedule(
  'daily-scheduler-google',
  '30 20 * * *',
  $$SELECT trigger_daily_scheduler('Google Ads', 'ads')$$
);

-- Naver Ads (06:00 KST = 21:00 UTC)
SELECT cron.schedule(
  'daily-scheduler-naver',
  '0 21 * * *',
  $$SELECT trigger_daily_scheduler('Naver Ads', 'ads')$$
);

-- ============================================================================
-- 완료
-- ============================================================================
COMMENT ON TABLE scheduler_config IS '스케줄러 설정 (SaaS 판매 시 각 고객별 수정 가능)';
COMMENT ON EXTENSION pg_cron IS '자동 스케줄러 (제로 하드코딩)';
