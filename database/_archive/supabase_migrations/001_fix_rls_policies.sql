-- ============================================================
-- Phase 1: RLS 정책 보안 강화
-- 목적: USING(true) 정책 제거, 브랜드별 데이터 격리
-- ============================================================

-- 1. 사용자별 접근 가능한 advertiser_id 목록 조회 함수
CREATE OR REPLACE FUNCTION get_user_advertiser_ids(user_email TEXT)
RETURNS TABLE(advertiser_id UUID) AS $$
BEGIN
  -- Master 사용자: 모든 브랜드 접근
  IF EXISTS (
    SELECT 1 FROM users
    WHERE email = user_email AND LOWER(role) = 'master'
  ) THEN
    RETURN QUERY SELECT id FROM advertisers WHERE deleted_at IS NULL;
    RETURN;
  END IF;

  -- Agency Admin(대표): 같은 organization의 모든 브랜드 접근
  IF EXISTS (
    SELECT 1 FROM users
    WHERE email = user_email AND role = 'agency_admin'
  ) THEN
    RETURN QUERY
    SELECT a.id
    FROM advertisers a
    INNER JOIN users u ON a.organization_id = u.organization_id
    WHERE u.email = user_email AND a.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Agency Staff/Manager & Advertiser: user_advertisers 테이블 기반
  RETURN QUERY
  SELECT ua.advertiser_id
  FROM user_advertisers ua
  INNER JOIN users u ON ua.user_id = u.id
  INNER JOIN advertisers a ON ua.advertiser_id = a.id
  WHERE u.email = user_email AND a.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. api_tokens 테이블 RLS 정책 교체
DROP POLICY IF EXISTS "authenticated_users_select_api_tokens" ON api_tokens;
DROP POLICY IF EXISTS "authenticated_users_insert_api_tokens" ON api_tokens;
DROP POLICY IF EXISTS "authenticated_users_update_api_tokens" ON api_tokens;
DROP POLICY IF EXISTS "authenticated_users_delete_api_tokens" ON api_tokens;

-- SELECT: 본인 브랜드만 조회
CREATE POLICY "users_select_own_brand_tokens"
ON api_tokens FOR SELECT
TO authenticated
USING (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- INSERT: 본인 브랜드에만 추가
CREATE POLICY "users_insert_own_brand_tokens"
ON api_tokens FOR INSERT
TO authenticated
WITH CHECK (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- UPDATE: 본인 브랜드만 수정
CREATE POLICY "users_update_own_brand_tokens"
ON api_tokens FOR UPDATE
TO authenticated
USING (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
)
WITH CHECK (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- DELETE: 본인 브랜드만 삭제
CREATE POLICY "users_delete_own_brand_tokens"
ON api_tokens FOR DELETE
TO authenticated
USING (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- service_role은 모든 권한 (Edge Function용)
CREATE POLICY "service_role_all_api_tokens"
ON api_tokens FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. ad_performance 테이블 RLS 정책 교체
DROP POLICY IF EXISTS "authenticated_users_select_ad_performance" ON ad_performance;
DROP POLICY IF EXISTS "authenticated_users_insert_ad_performance" ON ad_performance;

-- SELECT: 본인 브랜드만 조회
CREATE POLICY "users_select_own_brand_performance"
ON ad_performance FOR SELECT
TO authenticated
USING (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- INSERT/UPDATE/DELETE: service_role만 가능 (Edge Function 전용)
CREATE POLICY "service_role_all_ad_performance"
ON ad_performance FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. ad_creatives 테이블 RLS 정책 교체
DROP POLICY IF EXISTS "authenticated_users_select_ad_creatives" ON ad_creatives;
DROP POLICY IF EXISTS "authenticated_users_insert_ad_creatives" ON ad_creatives;

-- SELECT: 본인 브랜드만 조회
CREATE POLICY "users_select_own_brand_creatives"
ON ad_creatives FOR SELECT
TO authenticated
USING (
  advertiser_id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- INSERT/UPDATE/DELETE: service_role만 가능
CREATE POLICY "service_role_all_ad_creatives"
ON ad_creatives FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. advertisers 테이블 RLS 정책 추가 (기존에 없었다면)
DROP POLICY IF EXISTS "users_select_own_advertisers" ON advertisers;

CREATE POLICY "users_select_own_advertisers"
ON advertisers FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT get_user_advertiser_ids(auth.email())
  )
);

-- 6. organizations 테이블 RLS 정책 추가
DROP POLICY IF EXISTS "users_select_own_organization" ON organizations;

CREATE POLICY "users_select_own_organization"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT a.organization_id
    FROM advertisers a
    WHERE a.id IN (SELECT get_user_advertiser_ids(auth.email()))
  )
);

-- 7. user_advertisers 테이블 RLS 정책 추가
DROP POLICY IF EXISTS "users_select_own_user_advertisers" ON user_advertisers;

CREATE POLICY "users_select_own_user_advertisers"
ON user_advertisers FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM users WHERE email = auth.email())
  OR advertiser_id IN (SELECT get_user_advertiser_ids(auth.email()))
);

-- 롤백 쿼리 (주석)
-- DROP POLICY "users_select_own_brand_tokens" ON api_tokens;
-- DROP POLICY "users_insert_own_brand_tokens" ON api_tokens;
-- DROP POLICY "users_update_own_brand_tokens" ON api_tokens;
-- DROP POLICY "users_delete_own_brand_tokens" ON api_tokens;
-- DROP POLICY "service_role_all_api_tokens" ON api_tokens;
-- DROP POLICY "users_select_own_brand_performance" ON ad_performance;
-- DROP POLICY "service_role_all_ad_performance" ON ad_performance;
-- DROP POLICY "users_select_own_brand_creatives" ON ad_creatives;
-- DROP POLICY "service_role_all_ad_creatives" ON ad_creatives;
-- DROP POLICY "users_select_own_advertisers" ON advertisers;
-- DROP POLICY "users_select_own_organization" ON organizations;
-- DROP POLICY "users_select_own_user_advertisers" ON user_advertisers;
-- DROP FUNCTION get_user_advertiser_ids(TEXT);
--
-- -- 원래 정책 복구
-- CREATE POLICY "authenticated_users_select_api_tokens"
-- ON api_tokens FOR SELECT TO authenticated USING (true);
