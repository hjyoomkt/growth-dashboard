-- ===================================
-- 중복된 RLS 정책 정리
-- ===================================

-- board_posts의 기존 정책 삭제 (중복)
DROP POLICY IF EXISTS "Admins can insert posts" ON board_posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON board_posts;
DROP POLICY IF EXISTS "Authors can delete their posts" ON board_posts;
DROP POLICY IF EXISTS "Authors can update their posts" ON board_posts;
DROP POLICY IF EXISTS "Users can update their own posts or based on role hierarchy" ON board_posts;

-- 확인
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'board_posts'
ORDER BY policyname;
