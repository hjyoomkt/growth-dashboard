-- ============================================================================
-- Migration 015: platform_config_id 자동 설정 트리거
-- 목적: integrations 레코드 생성 시 platform_config_id 자동 매핑
-- 작성일: 2026-01-13
-- ============================================================================

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION set_platform_config_id()
RETURNS TRIGGER AS $$
BEGIN
  -- platform_config_id가 NULL이면 platform 값으로 자동 매핑
  IF NEW.platform_config_id IS NULL THEN
    NEW.platform_config_id := (
      SELECT id
      FROM platform_configs
      WHERE platform = NEW.platform
      LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. INSERT 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_platform_config_id ON integrations;
CREATE TRIGGER trigger_set_platform_config_id
  BEFORE INSERT ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION set_platform_config_id();

-- 3. 기존 데이터 수동 업데이트 (한 번만 실행)
UPDATE integrations i
SET platform_config_id = pc.id
FROM platform_configs pc
WHERE i.platform = pc.platform
  AND i.platform_config_id IS NULL;

-- 4. 주석 추가
COMMENT ON FUNCTION set_platform_config_id IS 'integrations 레코드 생성 시 platform_config_id 자동 설정';

-- ============================================================================
-- 완료
-- ============================================================================
