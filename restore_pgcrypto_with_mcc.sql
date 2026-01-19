-- ============================================================================
-- GCP 설정 시스템 - pgcrypto 방식 (현재 사용 중)
-- 목적: Vault 함수 대신 pgcrypto 사용 (권한 문제 없음)
-- 작성일: 2026-01-19
--
-- ✅✅✅ 이 파일이 현재 실제로 사용되는 GCP 설정 시스템입니다 ✅✅✅
--
-- 배경:
-- - supabase/migrations/018_organization_gcp_settings.sql (Vault 방식) → 권한 에러
-- - supabase/migrations/033_add_mcc_id_support.sql (Vault 방식) → 권한 에러
-- - 위 파일들은 postgres 소유로 생성되어 pgsodium 권한이 없어 작동 안 함
-- - 이 파일로 pgcrypto 방식으로 전환하여 문제 해결
--
-- 시스템 구성:
-- - 방식: PostgreSQL pgcrypto (pgp_sym_encrypt/decrypt)
-- - 컬럼: organizations.google_*_encrypted (TEXT 타입)
-- - 파라미터: 4개 (client_id, client_secret, developer_token, mcc_id)
-- - 함수: save_organization_gcp_credentials (저장/삭제)
--         get_organization_gcp_preview (마스킹된 미리보기)
--
-- Edge Function:
-- - supabase/functions/save-organization-gcp/index.ts
-- - 4개 파라미터를 명시적으로 전달 (EMPTY_STRING 처리 포함)
--
-- 주의사항:
-- - 이 파일이 최신 버전입니다
-- - 018, 033 마이그레이션은 DEPRECATED (사용 안 함)
-- - 프로젝트 루트의 다른 GCP 관련 SQL 파일들은 디버깅용 임시 파일
-- ============================================================================

-- 1. save_organization_gcp_credentials 함수 재생성 (MCC ID 추가)
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
  encryption_key TEXT;
BEGIN
  -- 암호화 키 (기존 시스템과 동일)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- Client ID 저장 또는 삭제
  IF p_client_id IS NOT NULL THEN
    IF p_client_id = '' OR p_client_id = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_client_id_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_client_id_encrypted = pgp_sym_encrypt(p_client_id, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- Client Secret 저장 또는 삭제
  IF p_client_secret IS NOT NULL THEN
    IF p_client_secret = '' OR p_client_secret = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_client_secret_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_client_secret_encrypted = pgp_sym_encrypt(p_client_secret, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- Developer Token 저장 또는 삭제
  IF p_developer_token IS NOT NULL THEN
    IF p_developer_token = '' OR p_developer_token = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_developer_token_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_developer_token_encrypted = pgp_sym_encrypt(p_developer_token, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- MCC ID 저장 또는 삭제 (신규 추가)
  IF p_mcc_id IS NOT NULL THEN
    IF p_mcc_id = '' OR p_mcc_id = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_mcc_id_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_mcc_id_encrypted = pgp_sym_encrypt(p_mcc_id, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- updated_at 갱신
  UPDATE organizations
  SET updated_at = NOW()
  WHERE id = org_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'GCP credentials saved with PGP encryption'
  );
END;
$$;

COMMENT ON FUNCTION save_organization_gcp_credentials IS '조직의 Google API 자격증명 저장/삭제 (PGP 암호화, MCC ID 포함)';

-- 2. get_organization_gcp_preview 함수 재생성 (MCC ID 추가)
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
  encryption_key TEXT;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_developer_token TEXT;
  v_mcc_id TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 복호화
  SELECT
    CASE
      WHEN google_client_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_client_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN google_client_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_client_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN google_developer_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_developer_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN google_mcc_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_mcc_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END
  INTO v_client_id, v_client_secret, v_developer_token, v_mcc_id
  FROM organizations
  WHERE id = org_id;

  -- 마스킹 처리
  RETURN QUERY SELECT
    CASE
      WHEN v_client_id IS NOT NULL AND length(v_client_id) > 8
      THEN substring(v_client_id from 1 for 4) || '••••••••' || substring(v_client_id from length(v_client_id) - 3)
      WHEN v_client_id IS NOT NULL
      THEN '••••••••'
      ELSE ''
    END as client_id_preview,
    CASE
      WHEN v_client_secret IS NOT NULL AND length(v_client_secret) > 12
      THEN substring(v_client_secret from 1 for 6) || '••••••••••••••••'
      WHEN v_client_secret IS NOT NULL
      THEN '••••••••••••••••'
      ELSE ''
    END as client_secret_preview,
    CASE
      WHEN v_developer_token IS NOT NULL AND length(v_developer_token) > 8
      THEN substring(v_developer_token from 1 for 4) || '••••••••'
      WHEN v_developer_token IS NOT NULL
      THEN '••••••••'
      ELSE ''
    END as developer_token_preview,
    CASE
      WHEN v_mcc_id IS NOT NULL AND length(v_mcc_id) > 6
      THEN substring(v_mcc_id from 1 for 3) || '•••' || substring(v_mcc_id from length(v_mcc_id) - 2)
      WHEN v_mcc_id IS NOT NULL
      THEN '•••'
      ELSE ''
    END as mcc_id_preview;
END;
$$;

COMMENT ON FUNCTION get_organization_gcp_preview IS 'GCP 설정 미리보기 (부분 마스킹, MCC ID 포함)';

-- 3. 검증 쿼리
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  pg_catalog.pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
WHERE p.proname IN (
  'save_organization_gcp_credentials',
  'get_organization_gcp_preview'
)
ORDER BY p.proname;
