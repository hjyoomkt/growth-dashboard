-- RPC 함수: 다음 pending 청크를 가져오고 processing으로 변경 (동시성 제어)
CREATE OR REPLACE FUNCTION get_next_pending_chunk()
RETURNS TABLE (
  id UUID,
  job_id UUID,
  integration_id UUID,
  chunk_index INTEGER,
  start_date DATE,
  end_date DATE,
  collection_type TEXT,
  status TEXT,
  retry_count INTEGER,
  max_retries INTEGER,
  error_message TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_chunk_id UUID;
BEGIN
  -- pending 청크 1개 조회 및 잠금 (job_id로 라운드로빈, 같은 job 내에서는 chunk_index 순서)
  SELECT collection_queue.id INTO v_chunk_id
  FROM collection_queue
  WHERE collection_queue.status = 'pending'
  ORDER BY
    collection_queue.job_id ASC,  -- job 단위로 정렬 (여러 브랜드 인터리빙)
    collection_queue.chunk_index ASC  -- 같은 job 내에서는 순서대로
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- 청크가 없으면 종료
  IF v_chunk_id IS NULL THEN
    RETURN;
  END IF;

  -- status를 processing으로 업데이트
  UPDATE collection_queue
  SET
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE collection_queue.id = v_chunk_id;

  -- 업데이트된 청크 반환
  RETURN QUERY
  SELECT
    collection_queue.id,
    collection_queue.job_id,
    collection_queue.integration_id,
    collection_queue.chunk_index,
    collection_queue.start_date,
    collection_queue.end_date,
    collection_queue.collection_type,
    collection_queue.status,
    collection_queue.retry_count,
    collection_queue.max_retries,
    collection_queue.error_message,
    collection_queue.last_error_at,
    collection_queue.created_at,
    collection_queue.started_at,
    collection_queue.completed_at,
    collection_queue.updated_at
  FROM collection_queue
  WHERE collection_queue.id = v_chunk_id;
END;
$$;
