-- ===================================
-- RLS (Row Level Security) 정책 설정
-- 인증된 사용자만 데이터 접근 가능
-- ===================================

-- 1. RLS 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "authenticated_users_select_organizations" ON organizations;
DROP POLICY IF EXISTS "authenticated_users_select_advertisers" ON advertisers;
DROP POLICY IF EXISTS "authenticated_users_select_users" ON users;
DROP POLICY IF EXISTS "authenticated_users_select_api_tokens" ON api_tokens;
DROP POLICY IF EXISTS "authenticated_users_select_ad_performance" ON ad_performance;
DROP POLICY IF EXISTS "authenticated_users_select_creatives" ON creatives;
DROP POLICY IF EXISTS "authenticated_users_select_user_advertisers" ON user_advertisers;
DROP POLICY IF EXISTS "authenticated_users_select_invitation_codes" ON invitation_codes;
DROP POLICY IF EXISTS "authenticated_users_select_board_posts" ON board_posts;

-- 3. 인증된 사용자만 SELECT 가능 정책 생성
CREATE POLICY "authenticated_users_select_organizations"
ON organizations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_advertisers"
ON advertisers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_api_tokens"
ON api_tokens FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_ad_performance"
ON ad_performance FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_creatives"
ON creatives FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_user_advertisers"
ON user_advertisers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_invitation_codes"
ON invitation_codes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_select_board_posts"
ON board_posts FOR SELECT
TO authenticated
USING (true);

-- 4. INSERT/UPDATE/DELETE 정책도 추가 (인증된 사용자만)
CREATE POLICY "authenticated_users_insert_organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_organizations"
ON organizations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_organizations"
ON organizations FOR DELETE
TO authenticated
USING (true);

-- advertisers
CREATE POLICY "authenticated_users_insert_advertisers"
ON advertisers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_advertisers"
ON advertisers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_advertisers"
ON advertisers FOR DELETE
TO authenticated
USING (true);

-- users
CREATE POLICY "authenticated_users_insert_users"
ON users FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_users"
ON users FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_users"
ON users FOR DELETE
TO authenticated
USING (true);

-- api_tokens
CREATE POLICY "authenticated_users_insert_api_tokens"
ON api_tokens FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_api_tokens"
ON api_tokens FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_api_tokens"
ON api_tokens FOR DELETE
TO authenticated
USING (true);

-- ad_performance
CREATE POLICY "authenticated_users_insert_ad_performance"
ON ad_performance FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_ad_performance"
ON ad_performance FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_ad_performance"
ON ad_performance FOR DELETE
TO authenticated
USING (true);

-- creatives
CREATE POLICY "authenticated_users_insert_creatives"
ON creatives FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_creatives"
ON creatives FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_creatives"
ON creatives FOR DELETE
TO authenticated
USING (true);

-- user_advertisers
CREATE POLICY "authenticated_users_insert_user_advertisers"
ON user_advertisers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_user_advertisers"
ON user_advertisers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_user_advertisers"
ON user_advertisers FOR DELETE
TO authenticated
USING (true);

-- invitation_codes
CREATE POLICY "authenticated_users_insert_invitation_codes"
ON invitation_codes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_invitation_codes"
ON invitation_codes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_invitation_codes"
ON invitation_codes FOR DELETE
TO authenticated
USING (true);

-- board_posts
CREATE POLICY "authenticated_users_insert_board_posts"
ON board_posts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_update_board_posts"
ON board_posts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_delete_board_posts"
ON board_posts FOR DELETE
TO authenticated
USING (true);

-- 5. 확인
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
