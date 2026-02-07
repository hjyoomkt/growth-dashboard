-- ============================================================================
-- 액세스 로그 시스템
-- 목적: 사용자 로그인/로그아웃 이력 추적
-- 보관 기간: 30일 (changelog 5일보다 길게 설정)
-- ============================================================================

-- 1. access_logs 테이블 생성
CREATE TABLE IF NOT EXISTS access_logs (
  id BIGSERIAL PRIMARY KEY,

  -- 사용자 정보
  user_id UUID NOT NULL,  -- FK 제약 없음 (삭제된 사용자도 로그 유지)
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT NOT NULL,

  -- 조직 정보
  organization_id UUID,  -- FK 제약 없음
  organization_name TEXT,
  advertiser_id UUID,  -- FK 제약 없음
  advertiser_name TEXT,

  -- 액션 정보
  action TEXT NOT NULL CHECK (action IN ('login', 'logout')),

  -- 접속 정보
  ip_address INET,  -- PostgreSQL INET 타입 사용
  user_agent TEXT,

  -- 시간 정보 (KST)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성
-- 사용자별 조회 최적화
CREATE INDEX idx_access_logs_user ON access_logs(user_id, created_at DESC);

-- 날짜 기반 조회 및 삭제 최적화
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at DESC);

-- 조직별 조회 최적화
CREATE INDEX idx_access_logs_organization ON access_logs(organization_id, created_at DESC);

-- 브랜드별 조회 최적화
CREATE INDEX idx_access_logs_advertiser ON access_logs(advertiser_id, created_at DESC);

-- 액션 타입별 조회
CREATE INDEX idx_access_logs_action ON access_logs(action, created_at DESC);

-- 3. RLS 정책 설정
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Master: 모든 로그 조회
CREATE POLICY "Master can view all access logs"
  ON access_logs FOR SELECT
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
CREATE POLICY "Agency can view organization access logs"
  ON access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agency_admin', 'agency_manager')
      AND users.organization_id = access_logs.organization_id
      AND users.deleted_at IS NULL
    )
  );

-- Brand 관리자: 자신의 advertiser 로그만 조회
CREATE POLICY "Advertiser can view brand access logs"
  ON access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN user_advertisers ON user_advertisers.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.role IN ('advertiser_admin')
      AND user_advertisers.advertiser_id = access_logs.advertiser_id
      AND users.deleted_at IS NULL
    )
  );

-- 시스템만 로그 삽입 가능 (RPC 함수 통해서만)
CREATE POLICY "Only system can insert access logs"
  ON access_logs FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- 직접 INSERT 금지

-- 4. 30일 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- created_at 기준으로 30일 초과된 레코드 삭제
  DELETE FROM access_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % access log records older than 30 days', v_deleted_count;
  END IF;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_access_logs IS 'access_logs 테이블에서 30일 초과된 레코드 자동 삭제';

-- 5. pg_cron 스케줄 등록 (매일 UTC 18:00 = 한국 시간 03:00)
SELECT cron.schedule(
  'cleanup-old-access-logs',
  '0 18 * * *',
  $$SELECT cleanup_old_access_logs()$$
);

-- 6. 액세스 로그 기록 헬퍼 함수
CREATE OR REPLACE FUNCTION log_access(
  p_user_id UUID,
  p_action TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_user_role TEXT;
  v_organization_id UUID;
  v_organization_name TEXT;
  v_advertiser_id UUID;
  v_advertiser_name TEXT;
  v_log_id BIGINT;
BEGIN
  -- 사용자 정보 조회 (deleted_at 무시)
  SELECT
    u.email,
    u.name,
    u.role,
    u.organization_id,
    o.name as org_name,
    u.advertiser_id
  INTO
    v_user_email,
    v_user_name,
    v_user_role,
    v_organization_id,
    v_organization_name,
    v_advertiser_id
  FROM users u
  LEFT JOIN organizations o ON o.id = u.organization_id
  WHERE u.id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- advertiser 이름 조회
  IF v_advertiser_id IS NOT NULL THEN
    SELECT name INTO v_advertiser_name
    FROM advertisers
    WHERE id = v_advertiser_id;
  END IF;

  -- access_logs 레코드 삽입
  INSERT INTO access_logs (
    user_id,
    user_email,
    user_name,
    user_role,
    organization_id,
    organization_name,
    advertiser_id,
    advertiser_name,
    action,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id,
    v_user_email,
    COALESCE(v_user_name, 'Unknown'),
    v_user_role,
    v_organization_id,
    v_organization_name,
    v_advertiser_id,
    v_advertiser_name,
    p_action,
    p_ip_address::INET,
    p_user_agent,
    NOW()  -- TIMESTAMPTZ는 자동으로 UTC 저장, 조회 시 KST 변환
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_access IS '사용자 액세스 로그를 기록하는 헬퍼 함수';

-- ============================================================================
-- 완료
-- ============================================================================
