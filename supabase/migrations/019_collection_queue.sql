-- ============================================================================
-- Collection Queue 테이블 생성
-- 목적: initial-collection의 청크를 큐에 저장하여 collection-worker가 처리
-- ============================================================================

-- ============================================================================
-- 1. collection_queue 테이블 생성
-- ============================================================================
CREATE TABLE IF NOT EXISTS collection_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES collection_jobs(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- 청크 정보
  chunk_index INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  collection_type TEXT NOT NULL,

  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- 에러 정보
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_collection_type CHECK (collection_type IN ('ads', 'demographics', 'creatives')),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),

  -- 중복 방지 (같은 job에 같은 chunk_index는 1개만)
  UNIQUE(job_id, chunk_index)
);

-- ============================================================================
-- 2. 인덱스 생성
-- ============================================================================

-- 인덱스: status별 조회 최적화 (pending 우선 조회)
CREATE INDEX IF NOT EXISTS idx_collection_queue_status_created
ON collection_queue(status, created_at ASC)
WHERE status IN ('pending', 'processing');

-- 인덱스: job_id별 진행 상황 조회
CREATE INDEX IF NOT EXISTS idx_collection_queue_job_id
ON collection_queue(job_id, status);

-- 인덱스: integration_id별 조회
CREATE INDEX IF NOT EXISTS idx_collection_queue_integration
ON collection_queue(integration_id);

-- ============================================================================
-- 3. RLS 정책
-- ============================================================================
ALTER TABLE collection_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_collection_queue"
ON collection_queue FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. updated_at 자동 업데이트 트리거
-- ============================================================================
DROP TRIGGER IF EXISTS update_collection_queue_updated_at ON collection_queue;
CREATE TRIGGER update_collection_queue_updated_at
BEFORE UPDATE ON collection_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. RPC 함수: chunks_completed 카운터 증가
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_chunks_completed(p_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE collection_jobs
  SET
    chunks_completed = chunks_completed + 1,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION increment_chunks_completed IS 'collection_jobs의 chunks_completed 카운터를 1 증가';

-- ============================================================================
-- 6. RPC 함수: chunks_failed 카운터 증가
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_chunks_failed(p_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE collection_jobs
  SET
    chunks_failed = chunks_failed + 1,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION increment_chunks_failed IS 'collection_jobs의 chunks_failed 카운터를 1 증가';

-- ============================================================================
-- 7. RPC 함수: Job 완료 여부 확인 및 최종 상태 업데이트
-- ============================================================================
CREATE OR REPLACE FUNCTION check_and_finalize_job(p_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_integration_id UUID;
  v_final_status TEXT;
BEGIN
  -- Job 정보 조회
  SELECT
    chunks_total,
    chunks_completed,
    chunks_failed
  INTO v_job
  FROM collection_jobs
  WHERE id = p_job_id;

  -- 모든 청크가 처리되었는지 확인
  IF (v_job.chunks_completed + v_job.chunks_failed) >= v_job.chunks_total THEN
    -- 최종 상태 결정
    IF v_job.chunks_failed = v_job.chunks_total THEN
      v_final_status := 'failed';
    ELSIF v_job.chunks_failed > 0 THEN
      v_final_status := 'partial';
    ELSE
      v_final_status := 'completed';
    END IF;

    -- Job 완료 처리
    UPDATE collection_jobs
    SET
      status = v_final_status,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_job_id
    RETURNING (SELECT integration_id FROM integrations WHERE advertiser_id = collection_jobs.advertiser_id LIMIT 1)
    INTO v_integration_id;

    -- Integration 상태 업데이트
    IF v_integration_id IS NOT NULL THEN
      UPDATE integrations
      SET
        data_collection_status = CASE
          WHEN v_final_status = 'completed' THEN 'success'
          WHEN v_final_status = 'partial' THEN 'partial'
          ELSE 'error'
        END,
        last_collection_at = NOW(),
        updated_at = NOW()
      WHERE id = v_integration_id;
    END IF;

    RAISE NOTICE 'Job % finalized with status: %', p_job_id, v_final_status;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_and_finalize_job IS 'Job의 모든 청크 처리 완료 시 최종 상태 업데이트 및 Integration 상태 업데이트';

-- ============================================================================
-- 8. 테이블 설명
-- ============================================================================
COMMENT ON TABLE collection_queue IS 'initial-collection용 청크 큐 테이블 (pg_cron + collection-worker가 1분마다 처리)';
COMMENT ON COLUMN collection_queue.chunk_index IS '청크 순서 (0부터 시작, job 내에서 unique)';
COMMENT ON COLUMN collection_queue.status IS 'pending: 대기 중, processing: 처리 중, completed: 완료, failed: 최종 실패';
COMMENT ON COLUMN collection_queue.retry_count IS '현재 재시도 횟수 (0~max_retries)';

-- ============================================================================
-- 완료
-- ============================================================================
