-- ===================================
-- 테이블 구조 확인
-- ===================================

-- 1. board_posts 테이블 구조 확인
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'board_posts'
ORDER BY ordinal_position;

-- 2. 모든 외래 키 제약 조건 확인
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'advertisers', 'users', 'api_tokens', 'ad_performance',
    'user_advertisers', 'invitation_codes', 'board_posts'
  )
ORDER BY tc.table_name, tc.constraint_name;
