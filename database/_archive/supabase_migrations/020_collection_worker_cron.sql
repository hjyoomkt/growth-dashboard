-- ============================================================================
-- Collection Worker Cron Job 등록
-- 목적: 1분마다 collection-worker를 호출하여 collection_queue 처리
-- ============================================================================

-- ============================================================================
-- 1. 기존 cron job 삭제 (있다면)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collection-worker') THEN
    PERFORM cron.unschedule('collection-worker');
  END IF;
END $$;

-- ============================================================================
-- 2. Edge Function 호출 함수 생성
-- ============================================================================
CREATE OR REPLACE FUNCTION invoke_collection_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_get(
    url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collection-worker'
  );
END;
$$;

COMMENT ON FUNCTION invoke_collection_worker IS 'collection-worker Edge Function 호출 (collection_queue 처리)';

-- ============================================================================
-- 3. Cron Job 등록 (매 분마다 실행)
-- ============================================================================
SELECT cron.schedule(
  'collection-worker',
  '* * * * *',
  $$SELECT invoke_collection_worker()$$
);

-- ============================================================================
-- 완료
-- ============================================================================
COMMENT ON EXTENSION pg_cron IS 'collection-worker: 1분마다 collection_queue에서 pending 청크 처리';
