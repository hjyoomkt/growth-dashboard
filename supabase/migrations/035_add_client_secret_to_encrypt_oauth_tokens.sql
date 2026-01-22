-- ============================================================================
-- Migration 035: encrypt_oauth_tokens 함수에 client_secret 파라미터 추가
-- 목적: OAuth callback에서 client_secret을 암호화하여 저장할 수 있도록 함
-- 작성일: 2026-01-22
-- ============================================================================

-- 1. integrations 테이블 컬럼 타입 변경 (text → bytea)
ALTER TABLE integrations
  ALTER COLUMN oauth_access_token_encrypted TYPE bytea USING oauth_access_token_encrypted::bytea,
  ALTER COLUMN oauth_refresh_token_encrypted TYPE bytea USING oauth_refresh_token_encrypted::bytea;

-- 2. 기존 encrypt_oauth_tokens 함수 삭제 (시그니처 충돌 방지)
DROP FUNCTION IF EXISTS public.encrypt_oauth_tokens(text, text, text);

-- 3. encrypt_oauth_tokens 함수 재정의 (client_secret 파라미터 추가, BYTEA 반환)
CREATE OR REPLACE FUNCTION public.encrypt_oauth_tokens(
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_client_secret text DEFAULT NULL,
  p_encryption_key text DEFAULT 'your-encryption-key-change-this-in-production'
)
RETURNS TABLE(
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  client_secret_encrypted bytea
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT
    pgp_sym_encrypt(p_access_token, p_encryption_key) as access_token_encrypted,
    CASE
      WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, p_encryption_key)
      ELSE NULL
    END as refresh_token_encrypted,
    CASE
      WHEN p_client_secret IS NOT NULL
      THEN pgp_sym_encrypt(p_client_secret, p_encryption_key)
      ELSE NULL
    END as client_secret_encrypted;
END;
$$;

-- 함수 설명 추가
COMMENT ON FUNCTION public.encrypt_oauth_tokens IS 'OAuth 토큰을 pgcrypto로 암호화 (access_token, refresh_token, client_secret)';

-- ============================================================================
-- 완료
-- ============================================================================
