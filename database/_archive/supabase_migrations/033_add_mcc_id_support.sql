-- ============================================================================
-- MCC ID 지원 추가 및 Preview 함수 생성
-- 목적: MCC ID 저장/조회 기능 추가, get_organization_gcp_preview 함수 생성
-- 작성일: 2026-01-19
--
-- ⚠️⚠️⚠️ DEPRECATED - 이 파일은 사용되지 않습니다 ⚠️⚠️⚠️
--
-- 이유:
-- 1. SQL Editor로 실행되어 함수들이 postgres 소유로 생성됨
-- 2. postgres role은 pgsodium 내부 함수 호출 권한이 없어 작동하지 않음
-- 3. 실제 시스템은 pgcrypto 방식으로 전환됨
--
-- 실제 사용 중인 시스템:
-- - 파일: /restore_pgcrypto_with_mcc.sql (프로젝트 루트)
-- - 방식: PostgreSQL pgcrypto (pgp_sym_encrypt/decrypt)
-- - 컬럼: organizations.google_*_encrypted (TEXT 타입)
-- - 파라미터: 4개 (client_id, client_secret, developer_token, mcc_id)
-- - 함수: save_organization_gcp_credentials, get_organization_gcp_preview
--
-- 주의사항:
-- - 이 파일을 SQL Editor로 다시 실행하지 마세요
-- - Vault 방식은 권한 문제로 작동하지 않습니다
-- - 새로운 작업 시 restore_pgcrypto_with_mcc.sql을 참조하세요
--
-- 마이그레이션 히스토리 보존용으로만 유지됩니다.
-- ============================================================================

-- 0. Vault 함수 권한 설정 (이미 018_organization_gcp_settings.sql에 정의되어 있지만 재확인)
-- vault_create_secret, vault_update_secret, vault_delete_secret는 SECURITY DEFINER로 이미 정의됨

-- 1. organizations 테이블에 MCC ID 컬럼 추가
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS google_mcc_id_vault_id UUID;

COMMENT ON COLUMN organizations.google_mcc_id_vault_id IS 'Google Ads MCC ID (Vault 저장)';

-- 2. 기존 함수 삭제 (파라미터 변경을 위해)
DROP FUNCTION IF EXISTS save_organization_gcp_credentials(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_organization_gcp_credentials(UUID);
DROP FUNCTION IF EXISTS get_organization_gcp_preview(UUID);

-- 3. save_organization_gcp_credentials 함수 재정의 (MCC ID 파라미터 추가)
CREATE OR REPLACE FUNCTION save_organization_gcp_credentials(
  org_id UUID,
  p_client_id TEXT DEFAULT NULL,
  p_client_secret TEXT DEFAULT NULL,
  p_developer_token TEXT DEFAULT NULL,
  p_mcc_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id_vault_id UUID;
  v_client_secret_vault_id UUID;
  v_developer_token_vault_id UUID;
  v_mcc_id_vault_id UUID;
  v_existing_client_id_vault_id UUID;
  v_existing_client_secret_vault_id UUID;
  v_existing_developer_token_vault_id UUID;
  v_existing_mcc_id_vault_id UUID;
BEGIN
  -- 기존 Vault ID 조회
  SELECT
    google_client_id_vault_id,
    google_client_secret_vault_id,
    google_developer_token_vault_id,
    google_mcc_id_vault_id
  INTO
    v_existing_client_id_vault_id,
    v_existing_client_secret_vault_id,
    v_existing_developer_token_vault_id,
    v_existing_mcc_id_vault_id
  FROM organizations
  WHERE id = org_id;

  -- Client ID 저장/업데이트
  IF p_client_id IS NOT NULL AND p_client_id != '' THEN
    IF v_existing_client_id_vault_id IS NOT NULL THEN
      PERFORM vault_update_secret(v_existing_client_id_vault_id, p_client_id);
      v_client_id_vault_id := v_existing_client_id_vault_id;
    ELSE
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

  -- MCC ID 저장/업데이트/삭제
  IF p_mcc_id IS NOT NULL THEN
    IF p_mcc_id = '' THEN
      -- 빈 문자열: 삭제
      IF v_existing_mcc_id_vault_id IS NOT NULL THEN
        PERFORM vault_delete_secret(v_existing_mcc_id_vault_id);
        v_mcc_id_vault_id := NULL;
      END IF;
    ELSE
      -- 값 있음: 저장/업데이트
      IF v_existing_mcc_id_vault_id IS NOT NULL THEN
        PERFORM vault_update_secret(v_existing_mcc_id_vault_id, p_mcc_id);
        v_mcc_id_vault_id := v_existing_mcc_id_vault_id;
      ELSE
        v_mcc_id_vault_id := vault_create_secret(p_mcc_id, 'Google Ads MCC ID for organization ' || org_id);
      END IF;
    END IF;
  END IF;

  -- organizations 테이블 업데이트
  UPDATE organizations
  SET
    google_client_id_vault_id = COALESCE(v_client_id_vault_id, google_client_id_vault_id),
    google_client_secret_vault_id = COALESCE(v_client_secret_vault_id, google_client_secret_vault_id),
    google_developer_token_vault_id = COALESCE(v_developer_token_vault_id, google_developer_token_vault_id),
    google_mcc_id_vault_id = CASE
      WHEN p_mcc_id = '' THEN NULL  -- 빈 문자열이면 NULL로 설정
      ELSE COALESCE(v_mcc_id_vault_id, google_mcc_id_vault_id)
    END,
    updated_at = NOW()
  WHERE id = org_id;

  RETURN jsonb_build_object(
    'success', true,
    'client_id_vault_id', v_client_id_vault_id,
    'client_secret_vault_id', v_client_secret_vault_id,
    'developer_token_vault_id', v_developer_token_vault_id,
    'mcc_id_vault_id', v_mcc_id_vault_id
  );
END;
$$;

COMMENT ON FUNCTION save_organization_gcp_credentials IS '조직의 Google API 자격증명 저장 (Vault에 암호화, MCC ID 포함)';

-- 4. get_organization_gcp_credentials 함수 재정의 (MCC ID 반환 추가)
CREATE OR REPLACE FUNCTION get_organization_gcp_credentials(org_id UUID)
RETURNS TABLE(
  client_id TEXT,
  client_secret TEXT,
  developer_token TEXT,
  mcc_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id_vault_id UUID;
  v_client_secret_vault_id UUID;
  v_developer_token_vault_id UUID;
  v_mcc_id_vault_id UUID;
BEGIN
  -- organizations 테이블에서 Vault ID 조회
  SELECT
    google_client_id_vault_id,
    google_client_secret_vault_id,
    google_developer_token_vault_id,
    google_mcc_id_vault_id
  INTO
    v_client_id_vault_id,
    v_client_secret_vault_id,
    v_developer_token_vault_id,
    v_mcc_id_vault_id
  FROM organizations
  WHERE id = org_id;

  -- Vault에서 실제 값 조회
  RETURN QUERY
  SELECT
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_client_id_vault_id) AS client_id,
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_client_secret_vault_id) AS client_secret,
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_developer_token_vault_id) AS developer_token,
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = v_mcc_id_vault_id) AS mcc_id;
END;
$$;

COMMENT ON FUNCTION get_organization_gcp_credentials IS '조직의 Google API 자격증명 조회 (Vault에서 복호화, MCC ID 포함)';

-- 5. get_organization_gcp_preview 함수 생성 (부분 마스킹된 미리보기)
CREATE OR REPLACE FUNCTION get_organization_gcp_preview(org_id UUID)
RETURNS TABLE(
  client_id_preview TEXT,
  client_secret_preview TEXT,
  developer_token_preview TEXT,
  mcc_id_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id TEXT;
  v_client_secret TEXT;
  v_developer_token TEXT;
  v_mcc_id TEXT;
  v_masked_length INT := 8; -- 중간에 표시할 마스킹 문자 개수
BEGIN
  -- 전체 값 조회
  SELECT * INTO v_client_id, v_client_secret, v_developer_token, v_mcc_id
  FROM get_organization_gcp_credentials(org_id);

  -- 마스킹 함수: 처음 4자 + ••••••••(8개) + 마지막 4자
  RETURN QUERY
  SELECT
    CASE
      WHEN v_client_id IS NULL OR LENGTH(v_client_id) = 0 THEN ''
      WHEN LENGTH(v_client_id) <= 8 THEN REPEAT('•', LENGTH(v_client_id))
      ELSE SUBSTRING(v_client_id FROM 1 FOR 4) || REPEAT('•', v_masked_length) || SUBSTRING(v_client_id FROM LENGTH(v_client_id) - 3 FOR 4)
    END AS client_id_preview,
    CASE
      WHEN v_client_secret IS NULL OR LENGTH(v_client_secret) = 0 THEN ''
      WHEN LENGTH(v_client_secret) <= 8 THEN REPEAT('•', LENGTH(v_client_secret))
      ELSE SUBSTRING(v_client_secret FROM 1 FOR 4) || REPEAT('•', v_masked_length) || SUBSTRING(v_client_secret FROM LENGTH(v_client_secret) - 3 FOR 4)
    END AS client_secret_preview,
    CASE
      WHEN v_developer_token IS NULL OR LENGTH(v_developer_token) = 0 THEN ''
      WHEN LENGTH(v_developer_token) <= 8 THEN REPEAT('•', LENGTH(v_developer_token))
      ELSE SUBSTRING(v_developer_token FROM 1 FOR 4) || REPEAT('•', v_masked_length) || SUBSTRING(v_developer_token FROM LENGTH(v_developer_token) - 3 FOR 4)
    END AS developer_token_preview,
    CASE
      WHEN v_mcc_id IS NULL OR LENGTH(v_mcc_id) = 0 THEN ''
      WHEN LENGTH(v_mcc_id) <= 6 THEN REPEAT('•', LENGTH(v_mcc_id))
      ELSE SUBSTRING(v_mcc_id FROM 1 FOR 3) || REPEAT('•', 3) || SUBSTRING(v_mcc_id FROM LENGTH(v_mcc_id) - 2 FOR 3)
    END AS mcc_id_preview;
END;
$$;

COMMENT ON FUNCTION get_organization_gcp_preview IS '조직의 Google API 자격증명 미리보기 (부분 마스킹, MCC ID 포함)';
