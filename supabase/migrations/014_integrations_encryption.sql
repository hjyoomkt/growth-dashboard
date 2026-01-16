-- ============================================================================
-- Migration 014: integrations 테이블 암호화 지원 추가
-- 목적: integrations 테이블의 legacy 토큰을 pgcrypto로 암호화 저장
-- 작성일: 2026-01-13
-- ============================================================================

-- 1. integrations 테이블에 암호화 컬럼 추가
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS developer_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS client_secret_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS secret_key_encrypted BYTEA;

-- 2. store_encrypted_token 함수 수정 (integrations 테이블 지원)
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
  v_access_token_id UUID;
  v_refresh_token_id UUID;
  v_developer_token_id UUID;
  v_client_secret_id UUID;
  v_secret_key_id UUID;
BEGIN
  -- 암호화 키 (환경변수에서 가져오는 것이 이상적)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- integrations 테이블에 암호화 저장
  UPDATE integrations SET
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

  -- Vault ID 생성 및 업데이트 (기존 Vault 시스템과 호환성 유지)
  IF p_access_token IS NOT NULL THEN
    v_access_token_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_access_token_vault_id = v_access_token_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_refresh_token IS NOT NULL THEN
    v_refresh_token_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_refresh_token_vault_id = v_refresh_token_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_developer_token IS NOT NULL THEN
    v_developer_token_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_developer_token_vault_id = v_developer_token_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_client_secret IS NOT NULL THEN
    v_client_secret_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_client_secret_vault_id = v_client_secret_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_secret_key IS NOT NULL THEN
    v_secret_key_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_secret_key_vault_id = v_secret_key_id
    WHERE id = p_api_token_id;
  END IF;

  -- 하위 호환성: api_tokens 테이블도 업데이트 (존재하는 경우)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_tokens') THEN
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
  END IF;
END;
$$;

-- 3. 복호화 함수 수정 (integrations 테이블 지원)
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

  -- integrations 테이블에서 조회
  EXECUTE format(
    'SELECT %I FROM integrations WHERE id = $1',
    p_token_type || '_encrypted'
  ) INTO encrypted_value USING p_api_token_id;

  -- integrations에 없으면 api_tokens에서 조회 (하위 호환성)
  IF encrypted_value IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_tokens') THEN
    EXECUTE format(
      'SELECT %I FROM api_tokens WHERE id = $1',
      p_token_type || '_encrypted'
    ) INTO encrypted_value USING p_api_token_id;
  END IF;

  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  decrypted_value := pgp_sym_decrypt(encrypted_value, encryption_key);
  RETURN decrypted_value;
END;
$$;

-- 4. 주석 추가
COMMENT ON COLUMN integrations.access_token_encrypted IS '암호화된 액세스 토큰 (pgcrypto)';
COMMENT ON COLUMN integrations.refresh_token_encrypted IS '암호화된 리프레시 토큰 (pgcrypto)';
COMMENT ON COLUMN integrations.developer_token_encrypted IS '암호화된 개발자 토큰 (pgcrypto)';
COMMENT ON COLUMN integrations.client_secret_encrypted IS '암호화된 클라이언트 시크릿 (pgcrypto)';
COMMENT ON COLUMN integrations.secret_key_encrypted IS '암호화된 시크릿 키 (pgcrypto)';

-- ============================================================================
-- 완료
-- ============================================================================
