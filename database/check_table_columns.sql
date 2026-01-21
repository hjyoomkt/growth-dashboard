-- ===================================
-- 테이블 컬럼 구조 확인
-- ===================================

-- oauth_authorization_sessions 테이블 컬럼 확인
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'oauth_authorization_sessions'
ORDER BY ordinal_position;

-- 다른 주요 테이블들도 확인
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN (
  'ad_performance_demographics',
  'ad_creatives',
  'integrations',
  'ad_accounts',
  'collection_jobs',
  'board_posts',
  'invitation_codes'
)
ORDER BY table_name, ordinal_position;
