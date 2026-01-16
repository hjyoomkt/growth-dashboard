-- ============================================================================
-- Vault 헬퍼 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION vault_insert_secret(p_name TEXT, p_secret TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO vault.secrets (name, secret)
  VALUES (p_name, p_secret)
  ON CONFLICT (name) DO UPDATE SET
    secret = EXCLUDED.secret,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION vault_insert_secret IS 'Vault에 secret 저장 (name 기반, UPSERT)';
