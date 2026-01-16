-- ============================================================================
-- api_tokens 테이블에 암호화 컬럼 추가 (Vault 대신 pgcrypto 사용)
-- ============================================================================

-- pgcrypto 확장 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 암호화 컬럼 추가
ALTER TABLE api_tokens
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS developer_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS client_secret_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS secret_key_encrypted BYTEA;

-- 암호화 저장 함수
CREATE OR REPLACE FUNCTION store_encrypted_token(
  p_api_token_id UUID,
  p_access_token TEXT DEFAULT NULL,
  p_refresh_token TEXT DEFAULT NULL,
  p_developer_token TEXT DEFAULT NULL,
  p_client_secret TEXT DEFAULT NULL,
  p_secret_key TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- 암호화 키 (실제로는 환경변수나 별도 관리)
  encryption_key := 'your-encryption-key-change-this-in-production';

  UPDATE api_tokens SET
    access_token_encrypted = CASE
      WHEN p_access_token IS NOT NULL
      THEN pgp_sym_encrypt(p_access_token, encryption_key)
      ELSE access_token_encrypted
    END,
    refresh_token_encrypted = CASE
      WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
      ELSE refresh_token_encrypted
    END,
    developer_token_encrypted = CASE
      WHEN p_developer_token IS NOT NULL
      THEN pgp_sym_encrypt(p_developer_token, encryption_key)
      ELSE developer_token_encrypted
    END,
    client_secret_encrypted = CASE
      WHEN p_client_secret IS NOT NULL
      THEN pgp_sym_encrypt(p_client_secret, encryption_key)
      ELSE client_secret_encrypted
    END,
    secret_key_encrypted = CASE
      WHEN p_secret_key IS NOT NULL
      THEN pgp_sym_encrypt(p_secret_key, encryption_key)
      ELSE secret_key_encrypted
    END,
    updated_at = NOW()
  WHERE id = p_api_token_id;
END;
$$;

-- 복호화 조회 함수
CREATE OR REPLACE FUNCTION get_decrypted_token(
  p_api_token_id UUID,
  p_token_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
  encrypted_value BYTEA;
  decrypted_value TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  EXECUTE format(
    'SELECT %I FROM api_tokens WHERE id = $1',
    p_token_type || '_encrypted'
  ) INTO encrypted_value USING p_api_token_id;

  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  decrypted_value := pgp_sym_decrypt(encrypted_value, encryption_key);
  RETURN decrypted_value;
END;
$$;

COMMENT ON FUNCTION store_encrypted_token IS 'API 토큰 암호화 저장 (pgcrypto 사용)';
COMMENT ON FUNCTION get_decrypted_token IS 'API 토큰 복호화 조회 (pgcrypto 사용)';
