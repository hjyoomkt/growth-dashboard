-- ============================================================================
-- Migration 013: integrations 테이블에 platform_configs 외래키 추가
-- 목적: integrations와 platform_configs 간 관계 설정으로 PostgREST 자동 조인 활성화
-- 작성일: 2026-01-13
-- ============================================================================

-- 1. integrations 테이블에 platform_config_id 컬럼 추가
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS platform_config_id UUID REFERENCES platform_configs(id);

-- 2. 기존 데이터 마이그레이션: platform 값으로 platform_configs 매핑
UPDATE integrations i
SET platform_config_id = pc.id
FROM platform_configs pc
WHERE i.platform = pc.platform
  AND i.platform_config_id IS NULL;

-- 3. 인덱스 생성 (조인 성능 향상)
CREATE INDEX IF NOT EXISTS idx_integrations_platform_config
ON integrations(platform_config_id) WHERE deleted_at IS NULL;

-- 4. 주석 추가
COMMENT ON COLUMN integrations.platform_config_id IS 'platform_configs 테이블 참조 (PostgREST 자동 조인용)';

-- ============================================================================
-- 완료
-- ============================================================================
