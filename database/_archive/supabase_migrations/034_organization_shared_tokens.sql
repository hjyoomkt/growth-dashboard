-- ====================================
-- 조직 단위 Google Ads Refresh Token 공유 마이그레이션
-- ====================================

-- 1. integrations 테이블에 컬럼 추가
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS google_account_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_organization_shared BOOLEAN DEFAULT false;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_integrations_google_account_email
ON integrations(google_account_email) WHERE google_account_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integrations_created_by_user
ON integrations(created_by_user_id) WHERE created_by_user_id IS NOT NULL;

-- ====================================
-- 2. RPC 함수: 조직의 Google Ads 토큰 목록 조회
-- ====================================
CREATE OR REPLACE FUNCTION get_organization_google_tokens(
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  integration_id UUID,
  google_account_email TEXT,
  created_by_user_email TEXT,
  created_at TIMESTAMPTZ,
  advertiser_name TEXT,
  advertiser_id UUID,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_id UUID;
  v_role TEXT;
  v_current_org_id UUID;
BEGIN
  -- 현재 사용자 이메일 결정
  v_user_email := COALESCE(p_user_email, auth.email());

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  -- 사용자 정보 조회
  SELECT id, role, organization_id INTO v_user_id, v_role, v_current_org_id
  FROM users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_user_email;
  END IF;

  -- Master 사용자: 모든 조직의 Google Ads 토큰 조회 (보안상 제한)
  IF LOWER(v_role) = 'master' THEN
    RETURN QUERY
    SELECT
      i.id AS integration_id,
      i.google_account_email,
      u.email AS created_by_user_email,
      i.created_at,
      a.name AS advertiser_name,
      a.id AS advertiser_id,
      a.organization_id AS organization_id
    FROM integrations i
    JOIN advertisers a ON i.advertiser_id = a.id
    LEFT JOIN users u ON i.created_by_user_id = u.id
    WHERE i.platform = 'Google Ads'
      AND i.refresh_token_encrypted IS NOT NULL
      AND i.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY i.created_at DESC;
    RETURN;
  END IF;

  -- Agency Admin: 같은 organization의 Google Ads 토큰만 조회
  IF v_role = 'agency_admin' THEN
    IF v_current_org_id IS NULL THEN
      RAISE EXCEPTION 'Agency admin must have organization_id';
    END IF;

    RETURN QUERY
    SELECT
      i.id AS integration_id,
      i.google_account_email,
      u.email AS created_by_user_email,
      i.created_at,
      a.name AS advertiser_name,
      a.id AS advertiser_id,
      a.organization_id AS organization_id
    FROM integrations i
    JOIN advertisers a ON i.advertiser_id = a.id
    LEFT JOIN users u ON i.created_by_user_id = u.id
    WHERE i.platform = 'Google Ads'
      AND i.refresh_token_encrypted IS NOT NULL
      AND a.organization_id = v_current_org_id
      AND i.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY i.created_at DESC;
    RETURN;
  END IF;

  -- Advertiser/Staff: user_advertisers를 통한 개별 브랜드의 토큰만 조회
  RETURN QUERY
  SELECT
    i.id AS integration_id,
    i.google_account_email,
    u.email AS created_by_user_email,
    i.created_at,
    a.name AS advertiser_name,
    a.id AS advertiser_id,
    a.organization_id AS organization_id
  FROM integrations i
  JOIN advertisers a ON i.advertiser_id = a.id
  LEFT JOIN users u ON i.created_by_user_id = u.id
  WHERE i.platform = 'Google Ads'
    AND i.refresh_token_encrypted IS NOT NULL
    AND a.id IN (
      SELECT ua.advertiser_id
      FROM user_advertisers ua
      WHERE ua.user_id = v_user_id
    )
    AND i.deleted_at IS NULL
    AND a.deleted_at IS NULL
  ORDER BY i.created_at DESC;
END;
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION get_organization_google_tokens TO authenticated;

-- ====================================
-- 3. 주석 추가
-- ====================================
COMMENT ON COLUMN integrations.google_account_email IS 'OAuth 인증에 사용된 Google 계정 이메일';
COMMENT ON COLUMN integrations.created_by_user_id IS '토큰을 생성한 사용자 ID';
COMMENT ON COLUMN integrations.is_organization_shared IS '조직 단위 공유 토큰 여부 (true: 조직 내 재사용 가능)';

COMMENT ON FUNCTION get_organization_google_tokens IS '현재 사용자가 접근 가능한 조직의 Google Ads Refresh Token 목록 조회 (RLS 적용)';
