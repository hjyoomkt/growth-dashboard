-- ============================================================================
-- 스케줄러 설정 (Supabase SQL Editor에서 실행)
-- ============================================================================

-- 1. Supabase URL 설정
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://qdzdyoqtzkfpcogecyar.supabase.co';

-- 2. Service Role Key 설정
ALTER DATABASE postgres
SET app.settings.supabase_service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

-- 3. 설정 확인
SELECT current_setting('app.settings.supabase_url', true) as supabase_url;
SELECT current_setting('app.settings.supabase_service_role_key', true) as service_role_key;

-- 4. 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 스케줄러 설정이 완료되었습니다.';
  RAISE NOTICE '다음 단계: 004_scheduler.sql 마이그레이션을 실행하세요.';
END $$;
