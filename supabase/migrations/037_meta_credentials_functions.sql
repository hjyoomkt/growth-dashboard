-- ============================================================================
-- Migration 037: Meta 자격증명 관련 함수 생성
-- 목적: Meta API 자격증명 저장/조회/미리보기 함수
-- 작성일: 2026-01-23
-- 참고: restore_pgcrypto_with_mcc.sql의 Google 함수 패턴 사용
-- ============================================================================

-- ============================================================================
-- 1. save_organization_meta_credentials
--    Meta 자격증명 저장/삭제 (PGP 암호화)
-- ============================================================================
CREATE OR REPLACE FUNCTION save_organization_meta_credentials(
  org_id UUID,
  p_app_id TEXT DEFAULT NULL,
  p_app_secret TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- 암호화 키 (기존 GCP 함수와 동일한 키 사용)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- App ID 저장 또는 삭제
  IF p_app_id IS NOT NULL THEN
    IF p_app_id = '' OR p_app_id = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET meta_app_id_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET meta_app_id_encrypted = pgp_sym_encrypt(p_app_id, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- App Secret 저장 또는 삭제
  IF p_app_secret IS NOT NULL THEN
    IF p_app_secret = '' OR p_app_secret = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET meta_app_secret_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET meta_app_secret_encrypted = pgp_sym_encrypt(p_app_secret, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- Access Token 저장 또는 삭제
  IF p_access_token IS NOT NULL THEN
    IF p_access_token = '' OR p_access_token = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET meta_access_token_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET meta_access_token_encrypted = pgp_sym_encrypt(p_access_token, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- updated_at 갱신
  UPDATE organizations
  SET updated_at = NOW()
  WHERE id = org_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Meta credentials saved with PGP encryption'
  );
END;
$$;

COMMENT ON FUNCTION save_organization_meta_credentials IS '조직의 Meta API 자격증명 저장/삭제 (PGP 암호화)';

-- ============================================================================
-- 2. get_organization_meta_preview
--    Meta 설정 미리보기 (부분 마스킹)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_organization_meta_preview(org_id UUID)
RETURNS TABLE(
  app_id_preview TEXT,
  app_secret_preview TEXT,
  access_token_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
  v_app_id TEXT;
  v_app_secret TEXT;
  v_access_token TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 복호화
  SELECT
    CASE
      WHEN meta_app_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN meta_app_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN meta_access_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_access_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END
  INTO v_app_id, v_app_secret, v_access_token
  FROM organizations
  WHERE id = org_id;

  -- 마스킹 처리
  RETURN QUERY SELECT
    -- App ID: 처음 4자 + 마스킹 + 마지막 4자
    CASE
      WHEN v_app_id IS NOT NULL AND length(v_app_id) > 8
      THEN substring(v_app_id from 1 for 4) || '••••••••' || substring(v_app_id from length(v_app_id) - 3)
      WHEN v_app_id IS NOT NULL
      THEN '••••••••'
      ELSE ''
    END as app_id_preview,

    -- App Secret: 처음 6자 + 마스킹
    CASE
      WHEN v_app_secret IS NOT NULL AND length(v_app_secret) > 12
      THEN substring(v_app_secret from 1 for 6) || '••••••••••••••••'
      WHEN v_app_secret IS NOT NULL
      THEN '••••••••••••••••'
      ELSE ''
    END as app_secret_preview,

    -- Access Token: 처음 10자 + 마스킹 + 마지막 10자
    CASE
      WHEN v_access_token IS NOT NULL AND length(v_access_token) > 20
      THEN substring(v_access_token from 1 for 10) || '••••••••••••••••••••' || substring(v_access_token from length(v_access_token) - 9)
      WHEN v_access_token IS NOT NULL
      THEN '••••••••••••••••••••'
      ELSE ''
    END as access_token_preview;
END;
$$;

COMMENT ON FUNCTION get_organization_meta_preview IS 'Meta 설정 미리보기 (부분 마스킹)';

-- ============================================================================
-- 3. get_organization_meta_credentials
--    Meta 설정 조회 (복호화된 실제 값, Edge Function 전용)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_organization_meta_credentials(org_id UUID)
RETURNS TABLE(
  app_id TEXT,
  app_secret TEXT,
  access_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  RETURN QUERY
  SELECT
    CASE
      WHEN meta_app_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END as app_id,
    CASE
      WHEN meta_app_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END as app_secret,
    CASE
      WHEN meta_access_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_access_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END as access_token
  FROM organizations
  WHERE id = org_id;
END;
$$;

COMMENT ON FUNCTION get_organization_meta_credentials IS 'Meta 설정 조회 (복호화된 실제 값 반환, API 호출용)';

-- ============================================================================
-- 완료
-- ============================================================================
