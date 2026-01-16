-- ============================================================
-- Phase 1: Vault 마이그레이션
-- 목적: API 토큰 암호화 저장 (Supabase Vault 사용)
-- ============================================================

-- 1. api_tokens 테이블에 vault_id 컬럼 추가
ALTER TABLE api_tokens
ADD COLUMN IF NOT EXISTS access_token_vault_id UUID,
ADD COLUMN IF NOT EXISTS refresh_token_vault_id UUID,
ADD COLUMN IF NOT EXISTS developer_token_vault_id UUID,
ADD COLUMN IF NOT EXISTS client_secret_vault_id UUID,
ADD COLUMN IF NOT EXISTS secret_key_vault_id UUID;

-- 2. vault_migration_log 테이블 생성 (감사 추적)
CREATE TABLE IF NOT EXISTS vault_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  migration_status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  migrated_fields TEXT[], -- ['access_token', 'refresh_token', ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_migration_log_token
ON vault_migration_log(api_token_id);

-- 3. RLS 정책: vault_migration_log는 service_role만 접근
ALTER TABLE vault_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_vault_migration_log"
ON vault_migration_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 롤백 쿼리 (주석)
-- ALTER TABLE api_tokens
-- DROP COLUMN access_token_vault_id,
-- DROP COLUMN refresh_token_vault_id,
-- DROP COLUMN developer_token_vault_id,
-- DROP COLUMN client_secret_vault_id,
-- DROP COLUMN secret_key_vault_id;
--
-- DROP TABLE vault_migration_log CASCADE;
