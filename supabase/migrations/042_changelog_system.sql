-- ============================================================================
-- 변경 이력 관리 시스템
-- 목적: 관리자 작업 이력 추적 및 감사
-- 보관 기간: 최대 5일
-- ============================================================================

-- 1. changelog 테이블 생성
CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대상 엔티티 정보
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'token', 'brand', 'access', 'role')),
  target_id UUID, -- 대상 엔티티 ID (삭제된 경우 NULL 가능)
  target_name TEXT, -- 대상 이름 (삭제 시에도 기록 유지)

  -- 변경 작업 정보
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'delete', 'update', 'invite')),
  action_detail TEXT NOT NULL, -- 구체적인 변경 내용

  -- 브랜드 및 조직 정보
  advertiser_id UUID, -- 변경이 발생한 브랜드
  advertiser_name TEXT, -- 브랜드 이름 (조회 성능 향상)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- 조직 ID
  organization_name TEXT, -- 조직 이름

  -- 작업 수행자 정보
  changed_by_id UUID NOT NULL, -- 작업 수행자 ID
  changed_by_name TEXT NOT NULL, -- 작업 수행자 이름
  changed_by_email TEXT NOT NULL, -- 작업 수행자 이메일
  changed_by_role TEXT NOT NULL, -- 작업 수행자 권한

  -- 변경 전후 데이터 (선택적)
  old_value JSONB, -- 변경 전 값
  new_value JSONB, -- 변경 후 값

  -- 시간 정보
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성
-- 권한별 조회 최적화
CREATE INDEX idx_changelog_organization ON changelog(organization_id, created_at DESC);
CREATE INDEX idx_changelog_advertiser ON changelog(advertiser_id, created_at DESC);

-- 날짜 기반 조회 및 삭제 최적화
CREATE INDEX idx_changelog_created_at ON changelog(created_at DESC);

-- 작업 수행자별 조회
CREATE INDEX idx_changelog_changed_by ON changelog(changed_by_id, created_at DESC);

-- 대상 타입별 조회
CREATE INDEX idx_changelog_target_type ON changelog(target_type, created_at DESC);

-- 3. RLS 정책 설정
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

-- Master: 모든 로그 조회
CREATE POLICY "Master can view all changelogs"
  ON changelog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master'
      AND users.deleted_at IS NULL
    )
  );

-- Agency 관리자: 자신의 organization 로그만 조회
CREATE POLICY "Agency can view organization changelogs"
  ON changelog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agency_admin', 'agency_manager', 'agency_staff')
      AND users.organization_id = changelog.organization_id
      AND users.deleted_at IS NULL
    )
  );

-- Brand 관리자: 자신의 advertiser 로그만 조회
CREATE POLICY "Advertiser can view brand changelogs"
  ON changelog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN user_advertisers ON user_advertisers.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.role IN ('advertiser_admin', 'advertiser_staff')
      AND user_advertisers.advertiser_id = changelog.advertiser_id
      AND users.deleted_at IS NULL
    )
  );

-- 4. 5일 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_old_changelogs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- created_at 기준으로 5일 초과된 레코드 삭제
  DELETE FROM changelog
  WHERE created_at < NOW() - INTERVAL '5 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % changelog records older than 5 days', v_deleted_count;
  END IF;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_changelogs IS 'changelog 테이블에서 5일 초과된 레코드 자동 삭제';

-- 5. pg_cron 스케줄 등록 (매일 UTC 17:00 = 한국 시간 02:00)
SELECT cron.schedule(
  'cleanup-old-changelogs',
  '0 17 * * *',
  $$SELECT cleanup_old_changelogs()$$
);

-- 6. 변경 로그 기록 헬퍼 함수
CREATE OR REPLACE FUNCTION log_changelog(
  p_target_type TEXT,
  p_target_id UUID,
  p_target_name TEXT,
  p_action_type TEXT,
  p_action_detail TEXT,
  p_advertiser_id UUID DEFAULT NULL,
  p_advertiser_name TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_organization_name TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_role TEXT;
  v_changelog_id UUID;
BEGIN
  -- 현재 사용자 정보 조회
  SELECT id, name, email, role
  INTO v_user_id, v_user_name, v_user_email, v_user_role
  FROM users
  WHERE id = auth.uid()
  AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for auth.uid()';
  END IF;

  -- changelog 레코드 삽입
  INSERT INTO changelog (
    target_type,
    target_id,
    target_name,
    action_type,
    action_detail,
    advertiser_id,
    advertiser_name,
    organization_id,
    organization_name,
    changed_by_id,
    changed_by_name,
    changed_by_email,
    changed_by_role,
    old_value,
    new_value
  ) VALUES (
    p_target_type,
    p_target_id,
    p_target_name,
    p_action_type,
    p_action_detail,
    p_advertiser_id,
    p_advertiser_name,
    p_organization_id,
    p_organization_name,
    v_user_id,
    COALESCE(v_user_name, 'Unknown'),
    v_user_email,
    v_user_role,
    p_old_value,
    p_new_value
  )
  RETURNING id INTO v_changelog_id;

  RETURN v_changelog_id;
END;
$$;

COMMENT ON FUNCTION log_changelog IS '변경 이력을 changelog 테이블에 기록하는 헬퍼 함수';

-- ============================================================================
-- 완료
-- ============================================================================
