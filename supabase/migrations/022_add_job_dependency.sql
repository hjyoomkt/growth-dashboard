-- ============================================================================
-- Job 의존성 추가
-- 목적: 순차 처리 보장 (광고 완료 → 연령대 시작 → 크리에이티브 시작)
-- ============================================================================

-- collection_queue 테이블에 depends_on_job_id 필드 추가
ALTER TABLE collection_queue
ADD COLUMN IF NOT EXISTS depends_on_job_id UUID REFERENCES collection_jobs(id) ON DELETE CASCADE;

-- 인덱스 추가 (의존성 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_collection_queue_depends_on_job
ON collection_queue(depends_on_job_id)
WHERE depends_on_job_id IS NOT NULL;

COMMENT ON COLUMN collection_queue.depends_on_job_id IS '의존하는 job ID (해당 job 완료 후에만 처리)';
