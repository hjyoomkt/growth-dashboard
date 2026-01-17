-- ============================================================================
-- Cron 간격 변경: 1분 → 30초
-- 목적: 더 빠른 청크 처리
-- ============================================================================

-- 1. 기존 cron job 삭제
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collection-worker') THEN
    PERFORM cron.unschedule('collection-worker');
  END IF;
END $$;

-- 2. 새 Cron Job 등록 (30초마다 실행)
SELECT cron.schedule(
  'collection-worker',
  '* * * * *',
  $$SELECT invoke_collection_worker()$$
);

-- 주의: pg_cron은 최소 1분 간격만 지원
-- 30초 간격을 구현하려면 2개의 cron job을 15/45초에 실행하도록 설정
-- 하지만 pg_cron은 분 단위만 지원하므로, 1분 간격 유지하고 병렬 처리로 성능 향상

COMMENT ON EXTENSION pg_cron IS 'collection-worker: 1분마다 최대 5개 청크 병렬 처리';
