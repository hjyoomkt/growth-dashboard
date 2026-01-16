-- ============================================================================
-- 스케줄러 설정을 Vault에 저장
-- ============================================================================

-- 1. Vault에 Supabase URL 저장
INSERT INTO vault.secrets (name, secret)
VALUES (
  'scheduler_supabase_url',
  'https://qdzdyoqtzkfpcogecyar.supabase.co'
) ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- 2. Vault에 Service Role Key 저장
INSERT INTO vault.secrets (name, secret)
VALUES (
  'scheduler_service_role_key',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0'
) ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- 3. Vault에서 값 조회하는 헬퍼 함수
CREATE OR REPLACE FUNCTION get_scheduler_config(config_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT decrypted_secret INTO config_value
  FROM vault.decrypted_secrets
  WHERE name = 'scheduler_' || config_key;

  RETURN config_value;
END;
$$;

COMMENT ON FUNCTION get_scheduler_config IS 'Vault에서 스케줄러 설정 조회 (SaaS 확장 대응)';
