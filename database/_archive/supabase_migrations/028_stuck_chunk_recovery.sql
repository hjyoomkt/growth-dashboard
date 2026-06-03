-- ============================================================================
-- 멈춘 청크 자동 복구 시스템
-- 목적: processing 상태로 5분 이상 멈춘 청크를 자동으로 pending으로 복구
-- 배경: worker 크래시, 네트워크 실패, 타임아웃 등으로 청크가 영구 멈춤 방지
-- ============================================================================

-- 1. 멈춘 청크를 자동으로 복구하는 함수
CREATE OR REPLACE FUNCTION reset_stuck_processing_chunks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  -- 5분 이상 processing 상태인 청크를 pending으로 복구
  UPDATE collection_queue
  SET
    status = 'pending',
    started_at = NULL,
    error_message = 'Auto-recovered: stuck in processing',
    last_error_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  IF v_reset_count > 0 THEN
    RAISE NOTICE 'Auto-recovered % stuck processing chunks', v_reset_count;
  END IF;

  RETURN v_reset_count;
END;
$$;

COMMENT ON FUNCTION reset_stuck_processing_chunks IS 'processing 상태로 5분 이상 멈춘 청크를 자동 복구 (worker 크래시/타임아웃 대비)';

-- 2. pg_cron 스케줄 등록 (1분마다 실행)
SELECT cron.schedule(
  'reset-stuck-chunks',
  '* * * * *',
  $$SELECT reset_stuck_processing_chunks()$$
);

COMMENT ON EXTENSION pg_cron IS 'Scheduled jobs: collection-worker (30s), reset-stuck-chunks (1m)';
