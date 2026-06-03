-- Naver credentials management functions
-- 작성일: 2026-01-24
-- 목적: 네이버 광고 API 자격증명 저장/조회 DB 함수 생성 (메타 패턴과 동일)

-- ============================================================================
-- 1. save_organization_naver_credentials()
-- 목적: 네이버 광고 API Key와 Secret Key를 암호화하여 저장 또는 삭제
-- ============================================================================
CREATE OR REPLACE FUNCTION save_organization_naver_credentials(
  org_id UUID,
  p_api_key TEXT DEFAULT NULL,
  p_secret_key TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  -- API Key 처리
  IF p_api_key = 'EMPTY_STRING' THEN
    -- 삭제: EMPTY_STRING이 전달되면 NULL로 설정
    UPDATE organizations SET naver_api_key_encrypted = NULL WHERE id = org_id;
  ELSIF p_api_key IS NOT NULL THEN
    -- 저장: API Key 암호화 후 저장
    UPDATE organizations
    SET naver_api_key_encrypted = pgp_sym_encrypt(p_api_key, encryption_key)
    WHERE id = org_id;
  END IF;

  -- Secret Key 처리
  IF p_secret_key = 'EMPTY_STRING' THEN
    -- 삭제: EMPTY_STRING이 전달되면 NULL로 설정
    UPDATE organizations SET naver_secret_key_encrypted = NULL WHERE id = org_id;
  ELSIF p_secret_key IS NOT NULL THEN
    -- 저장: Secret Key 암호화 후 저장
    UPDATE organizations
    SET naver_secret_key_encrypted = pgp_sym_encrypt(p_secret_key, encryption_key)
    WHERE id = org_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION save_organization_naver_credentials IS '네이버 광고 API 자격증명 저장/삭제 함수 (Service Role 전용)';

-- ============================================================================
-- 2. get_organization_naver_preview()
-- 목적: 네이버 자격증명 미리보기 조회 (부분 마스킹)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_organization_naver_preview(org_id UUID)
RETURNS TABLE (
  api_key_preview TEXT,
  secret_key_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
  decrypted_api_key TEXT;
  decrypted_secret_key TEXT;
BEGIN
  -- 암호화된 값 복호화
  SELECT
    CASE
      WHEN naver_api_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_api_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN naver_secret_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_secret_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END
  INTO decrypted_api_key, decrypted_secret_key
  FROM organizations
  WHERE id = org_id;

  -- 마스킹 처리 후 반환
  RETURN QUERY
  SELECT
    -- API Key 마스킹 (앞 4자리 + ••••••••  + 뒤 4자리)
    CASE
      WHEN decrypted_api_key IS NOT NULL AND LENGTH(decrypted_api_key) > 8 THEN
        CONCAT(
          SUBSTRING(decrypted_api_key, 1, 4),
          '••••••••',
          SUBSTRING(decrypted_api_key, LENGTH(decrypted_api_key) - 3)
        )
      WHEN decrypted_api_key IS NOT NULL THEN
        '••••••••'
      ELSE NULL
    END AS api_key_preview,
    -- Secret Key 마스킹 (앞 4자리 + •••••••• + 뒤 4자리)
    CASE
      WHEN decrypted_secret_key IS NOT NULL AND LENGTH(decrypted_secret_key) > 8 THEN
        CONCAT(
          SUBSTRING(decrypted_secret_key, 1, 4),
          '••••••••',
          SUBSTRING(decrypted_secret_key, LENGTH(decrypted_secret_key) - 3)
        )
      WHEN decrypted_secret_key IS NOT NULL THEN
        '••••••••'
      ELSE NULL
    END AS secret_key_preview;
END;
$$;

COMMENT ON FUNCTION get_organization_naver_preview IS '네이버 자격증명 미리보기 조회 함수 (마스킹 처리, 프론트엔드용)';

-- ============================================================================
-- 3. get_organization_naver_credentials()
-- 목적: 네이버 자격증명 복호화 조회 (Edge Function 전용)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_organization_naver_credentials(org_id UUID)
RETURNS TABLE (
  api_key TEXT,
  secret_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN naver_api_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_api_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END AS api_key,
    CASE
      WHEN naver_secret_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_secret_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END AS secret_key
  FROM organizations
  WHERE id = org_id;
END;
$$;

COMMENT ON FUNCTION get_organization_naver_credentials IS '네이버 자격증명 복호화 조회 함수 (Edge Function 전용, 마스킹 없음)';
