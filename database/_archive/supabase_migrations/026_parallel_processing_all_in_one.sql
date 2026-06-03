-- ============================================================================
-- 병렬 처리 + 의존성 + 청크 크기 업데이트 (All-in-One)
-- ============================================================================

-- 1. 의존성 필드 추가
ALTER TABLE collection_queue
ADD COLUMN IF NOT EXISTS depends_on_job_id UUID REFERENCES collection_jobs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collection_queue_depends_on_job_id ON collection_queue(depends_on_job_id);

COMMENT ON COLUMN collection_queue.depends_on_job_id IS '이전 job이 완료되어야만 처리 가능 (광고 → 연령대 → 크리에이티브 순서 보장)';

-- 2. 병렬 처리 함수 생성
CREATE OR REPLACE FUNCTION get_next_pending_chunks(p_limit INTEGER DEFAULT 5)
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
  v_chunk_ids UUID[];
BEGIN
  -- 조건을 만족하는 청크 선택 (광고 계정별 1개씩, 최대 p_limit개)
  WITH eligible AS (
    SELECT DISTINCT ON (integrations.legacy_account_id)
      collection_queue.id,
      integrations.legacy_account_id
    FROM collection_queue
    JOIN integrations ON collection_queue.integration_id = integrations.id
    WHERE collection_queue.status = 'pending'
      -- 의존성 확인: depends_on_job_id가 없거나 완료된 경우만
      AND (
        collection_queue.depends_on_job_id IS NULL
        OR EXISTS (
          SELECT 1 FROM collection_jobs
          WHERE collection_jobs.id = collection_queue.depends_on_job_id
          AND collection_jobs.status = 'completed'
        )
      )
      -- 같은 광고 계정의 processing 청크가 없는 경우만
      AND NOT EXISTS (
        SELECT 1 FROM collection_queue cq2
        JOIN integrations i2 ON cq2.integration_id = i2.id
        WHERE cq2.status = 'processing'
        AND i2.legacy_account_id = integrations.legacy_account_id
      )
    ORDER BY
      integrations.legacy_account_id,
      collection_queue.job_id ASC,
      collection_queue.chunk_index ASC
  )
  SELECT ARRAY_AGG(cq.id)
  INTO v_chunk_ids
  FROM collection_queue cq
  WHERE cq.id IN (SELECT id FROM eligible LIMIT p_limit)
  FOR UPDATE SKIP LOCKED;

  -- 선택된 청크가 없으면 종료
  IF v_chunk_ids IS NULL OR array_length(v_chunk_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- 선택된 청크들을 processing으로 업데이트
  UPDATE collection_queue
  SET
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE collection_queue.id = ANY(v_chunk_ids);

  -- 업데이트된 청크들 반환
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
  WHERE collection_queue.id = ANY(v_chunk_ids)
  ORDER BY collection_queue.created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_next_pending_chunks IS '여러 청크 병렬 처리 (광고계정별 1개, 의존성+processing 확인)';

-- 3. 청크 크기 업데이트
UPDATE platform_configs
SET
  chunk_size_days = 180,
  demographics_chunk_size_days = 90,
  updated_at = NOW()
WHERE platform = 'Meta Ads';

-- 확인
SELECT platform, chunk_size_days, demographics_chunk_size_days
FROM platform_configs
WHERE platform = 'Meta Ads';
