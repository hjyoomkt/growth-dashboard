-- ============================================================================
-- Organization GCP Settings Migration
-- 목적: 대행사(조직)별 Google API 설정 저장
-- 작성일: 2026-01-16
--
-- ⚠️⚠️⚠️ DEPRECATED - 이 파일은 사용되지 않습니다 ⚠️⚠️⚠️
--
-- 이유:
-- 1. Vault + pgsodium 방식으로 구현되었으나 권한 문제로 작동하지 않음
-- 2. 실제 시스템은 pgcrypto 방식 사용 (restore_pgcrypto_with_mcc.sql)
-- 3. 이 파일의 함수들은 postgres 소유로 생성되어 pgsodium 권한 없음
--
-- 실제 사용 중인 시스템:
-- - 파일: /restore_pgcrypto_with_mcc.sql (프로젝트 루트)
-- - 방식: PostgreSQL pgcrypto (pgp_sym_encrypt/decrypt)
-- - 컬럼: organizations.google_*_encrypted (TEXT 타입)
-- - 파라미터: 4개 (client_id, client_secret, developer_token, mcc_id)
--
-- 마이그레이션 히스토리 보존용으로만 유지됩니다.
-- 새로운 작업 시 restore_pgcrypto_with_mcc.sql을 참조하세요.
-- ============================================================================

-- 0. Vault 접근용 래퍼 함수 (SECURITY DEFINER로 Vault 접근 권한 부여)

-- Vault 시크릿 생성 함수
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret_value TEXT,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, description)
  VALUES (secret_value, secret_description)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Vault 시크릿 업데이트 함수
CREATE OR REPLACE FUNCTION vault_update_secret(
  secret_id UUID,
  new_secret TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret
  WHERE id = secret_id;
END;
$$;

-- Vault 시크릿 삭제 함수
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

-- 1. organizations 테이블에 GCP 설정 컬럼 추가
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS google_client_id_vault_id UUID,
ADD COLUMN IF NOT EXISTS google_client_secret_vault_id UUID,
ADD COLUMN IF NOT EXISTS google_developer_token_vault_id UUID;

COMMENT ON COLUMN organizations.google_client_id_vault_id IS 'Google OAuth Client ID (Vault 저장)';
COMMENT ON COLUMN organizations.google_client_secret_vault_id IS 'Google OAuth Client Secret (Vault 저장)';
COMMENT ON COLUMN organizations.google_developer_token_vault_id IS 'Google Ads Developer Token (Vault 저장)';

-- 2. Google Ads OAuth 활성화 (platform_configs)
UPDATE platform_configs
SET
  oauth_enabled = true,
  oauth_scopes = ARRAY['https://www.googleapis.com/auth/adwords']
WHERE platform = 'Google Ads';

-- 3. 대행사 GCP 정보 조회 함수
CREATE OR REPLACE FUNCTION get_organization_gcp_credentials(org_id UUID)
RETURNS TABLE(
  client_id TEXT,
  client_secret TEXT,
  developer_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id_vault_id UUID;
  v_client_secret_vault_id UUID;
  v_developer_token_vault_id UUID;
BEGIN
  -- organizations 테이블에서 Vault ID 조회
  SELECT
    google_client_id_vault_id,
    google_client_secret_vault_id,
    google_developer_token_vault_id
  INTO
    v_client_id_vault_id,
    v_client_secret_vault_id,
    v_developer_token_vault_id
  FROM organizations
  WHERE id = org_id;

  -- Vault에서 실제 값 조회
  RETURN QUERY
  SELECT
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_client_id_vault_id) AS client_id,
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_client_secret_vault_id) AS client_secret,
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_developer_token_vault_id) AS developer_token;
END;
$$;

COMMENT ON FUNCTION get_organization_gcp_credentials IS '조직의 Google API 자격증명 조회 (Vault에서 복호화)';

-- 4. 대행사 GCP 정보 저장 함수
CREATE OR REPLACE FUNCTION save_organization_gcp_credentials(
  org_id UUID,
  p_client_id TEXT,
  p_client_secret TEXT,
  p_developer_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id_vault_id UUID;
  v_client_secret_vault_id UUID;
  v_developer_token_vault_id UUID;
  v_existing_client_id_vault_id UUID;
  v_existing_client_secret_vault_id UUID;
  v_existing_developer_token_vault_id UUID;
BEGIN
  -- 기존 Vault ID 조회
  SELECT
    google_client_id_vault_id,
    google_client_secret_vault_id,
    google_developer_token_vault_id
  INTO
    v_existing_client_id_vault_id,
    v_existing_client_secret_vault_id,
    v_existing_developer_token_vault_id
  FROM organizations
  WHERE id = org_id;

  -- Client ID 저장/업데이트
  IF p_client_id IS NOT NULL AND p_client_id != '' THEN
    IF v_existing_client_id_vault_id IS NOT NULL THEN
      -- 기존 Vault 엔트리 업데이트
      PERFORM vault_update_secret(v_existing_client_id_vault_id, p_client_id);
      v_client_id_vault_id := v_existing_client_id_vault_id;
    ELSE
      -- 새 Vault 엔트리 생성
      v_client_id_vault_id := vault_create_secret(p_client_id, 'Google OAuth Client ID for organization ' || org_id);
    END IF;
  END IF;

  -- Client Secret 저장/업데이트
  IF p_client_secret IS NOT NULL AND p_client_secret != '' THEN
    IF v_existing_client_secret_vault_id IS NOT NULL THEN
      PERFORM vault_update_secret(v_existing_client_secret_vault_id, p_client_secret);
      v_client_secret_vault_id := v_existing_client_secret_vault_id;
    ELSE
      v_client_secret_vault_id := vault_create_secret(p_client_secret, 'Google OAuth Client Secret for organization ' || org_id);
    END IF;
  END IF;

  -- Developer Token 저장/업데이트
  IF p_developer_token IS NOT NULL AND p_developer_token != '' THEN
    IF v_existing_developer_token_vault_id IS NOT NULL THEN
      PERFORM vault_update_secret(v_existing_developer_token_vault_id, p_developer_token);
      v_developer_token_vault_id := v_existing_developer_token_vault_id;
    ELSE
      v_developer_token_vault_id := vault_create_secret(p_developer_token, 'Google Ads Developer Token for organization ' || org_id);
    END IF;
  END IF;

  -- organizations 테이블 업데이트
  UPDATE organizations
  SET
    google_client_id_vault_id = COALESCE(v_client_id_vault_id, google_client_id_vault_id),
    google_client_secret_vault_id = COALESCE(v_client_secret_vault_id, google_client_secret_vault_id),
    google_developer_token_vault_id = COALESCE(v_developer_token_vault_id, google_developer_token_vault_id),
    updated_at = NOW()
  WHERE id = org_id;

  RETURN jsonb_build_object(
    'success', true,
    'client_id_vault_id', v_client_id_vault_id,
    'client_secret_vault_id', v_client_secret_vault_id,
    'developer_token_vault_id', v_developer_token_vault_id
  );
END;
$$;

COMMENT ON FUNCTION save_organization_gcp_credentials IS '조직의 Google API 자격증명 저장 (Vault에 암호화)';

-- 5. 조직 GCP 설정 존재 여부 확인 함수
CREATE OR REPLACE FUNCTION has_organization_gcp_credentials(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_credentials BOOLEAN;
BEGIN
  SELECT
    (google_client_id_vault_id IS NOT NULL AND google_client_secret_vault_id IS NOT NULL)
  INTO v_has_credentials
  FROM organizations
  WHERE id = org_id;

  RETURN COALESCE(v_has_credentials, false);
END;
$$;

COMMENT ON FUNCTION has_organization_gcp_credentials IS '조직에 Google API 자격증명이 설정되어 있는지 확인';

-- 6. oauth_authorization_sessions 테이블에 client_id, client_secret_vault_id 컬럼 추가
ALTER TABLE oauth_authorization_sessions
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret_vault_id UUID;

COMMENT ON COLUMN oauth_authorization_sessions.client_id IS 'OAuth 요청 시 사용된 Client ID';
COMMENT ON COLUMN oauth_authorization_sessions.client_secret_vault_id IS 'OAuth 요청 시 사용된 Client Secret (Vault 저장)';
