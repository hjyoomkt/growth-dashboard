-- ============================================================================
-- 5일 초과 collection_jobs 자동 삭제 시스템
-- 목적: 데이터 보관 기간 제한 (최대 5일), 오래된 히스토리 자동 정리
-- 실행 시간: 매일 UTC 17:00 (한국 시간 02:00)
-- ============================================================================

-- 1. 5일 초과 작업을 자동 삭제하는 함수
CREATE OR REPLACE FUNCTION cleanup_old_collection_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- created_at 기준으로 5일 초과된 레코드 삭제
  -- collection_queue는 CASCADE로 자동 삭제됨
  DELETE FROM collection_jobs
  WHERE created_at < NOW() - INTERVAL '5 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % collection_jobs older than 5 days', v_deleted_count;
  END IF;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_collection_jobs IS 'collection_jobs 테이블에서 5일 초과된 레코드 자동 삭제 (collection_queue도 CASCADE 삭제)';

-- 2. pg_cron 스케줄 등록 (매일 UTC 17:00 = 한국 시간 02:00)
SELECT cron.schedule(
  'cleanup-old-collection-jobs',
  '0 17 * * *',
  $$SELECT cleanup_old_collection_jobs()$$
);

COMMENT ON EXTENSION pg_cron IS 'Scheduled jobs: collection-worker (30s), reset-stuck-chunks (1m), cleanup-old-collection-jobs (daily 17:00 UTC / 02:00 KST)';

-- ============================================================================
-- 완료
-- ============================================================================
