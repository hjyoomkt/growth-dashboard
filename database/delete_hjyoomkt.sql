-- ===================================
-- hjyoomkt@gmail.com 사용자 완전 삭제
-- 해당 사용자, 소속 브랜드, 모든 관련 데이터 삭제
-- ===================================

-- ⚠️ 주의: 되돌릴 수 없습니다!

-- 1. 삭제 전 확인 (어떤 데이터가 삭제될지 미리보기)
SELECT
  '=== 삭제될 데이터 미리보기 ===' AS info;

SELECT
  u.id AS user_id,
  u.email,
  u.name,
  u.role,
  o.name AS organization_name,
  a.name AS advertiser_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN advertisers a ON u.advertiser_id = a.id
WHERE u.email = 'hjyoomkt@gmail.com';

-- 해당 사용자의 광고주 확인
SELECT
  'advertisers' AS table_name,
  a.id,
  a.name
FROM advertisers a
WHERE a.id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);

-- API 토큰 개수 확인
SELECT
  'api_tokens' AS table_name,
  COUNT(*) AS count
FROM api_tokens
WHERE advertiser_id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);

-- 광고 소재 개수 확인
SELECT
  'creatives' AS table_name,
  COUNT(*) AS count
FROM creatives
WHERE advertiser_id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);

-- 광고 성과 데이터 개수 확인
SELECT
  'ad_performance' AS table_name,
  COUNT(*) AS count
FROM ad_performance
WHERE advertiser_id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);


-- ===================================
-- 2. 실제 삭제 시작
-- ===================================

-- 2-1. 광고 성과 인구통계 삭제 (테이블이 있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_performance_demographics') THEN
    DELETE FROM ad_performance_demographics
    WHERE advertiser_id IN (
      SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
      UNION
      SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
    );
  END IF;
END $$;

-- 2-2. 광고 성과 데이터 삭제
DELETE FROM ad_performance
WHERE advertiser_id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);

-- 2-3. 광고 소재 삭제 (creatives)
DELETE FROM creatives
WHERE advertiser_id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);

-- 2-4. 광고 소재 삭제 (ad_creatives - 테이블이 있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_creatives') THEN
    DELETE FROM ad_creatives
    WHERE advertiser_id IN (
      SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
      UNION
      SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
    );
  END IF;
END $$;

-- 2-5. API 토큰 삭제 ⭐
DELETE FROM api_tokens
WHERE advertiser_id IN (
  SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
  UNION
  SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
);

-- 2-6. 광고 계정 삭제 (ad_accounts는 integration_id로 연결됨)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_accounts') THEN
    DELETE FROM ad_accounts
    WHERE integration_id IN (
      SELECT id FROM integrations
      WHERE advertiser_id IN (
        SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
        UNION
        SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
      )
    );
  END IF;
END $$;

-- 2-7. OAuth 연동 정보 삭제 (integrations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
    DELETE FROM integrations
    WHERE advertiser_id IN (
      SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
      UNION
      SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
    );
  END IF;
END $$;

-- 2-8. 데이터 수집 작업 삭제 (테이블이 있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_jobs') THEN
    DELETE FROM collection_jobs
    WHERE advertiser_id IN (
      SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
      UNION
      SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
    );
  END IF;
END $$;

-- 2-9. OAuth 인증 세션 삭제 (테이블과 컬럼이 있는 경우)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_authorization_sessions'
    AND column_name = 'advertiser_id'
  ) THEN
    DELETE FROM oauth_authorization_sessions
    WHERE advertiser_id IN (
      SELECT advertiser_id FROM user_advertisers WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
      UNION
      SELECT advertiser_id FROM users WHERE email = 'hjyoomkt@gmail.com' AND advertiser_id IS NOT NULL
    );
  END IF;
END $$;

-- 2-10. 게시글 삭제 (테이블이 있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'board_posts') THEN
    DELETE FROM board_posts
    WHERE created_by = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com');
  END IF;
END $$;

-- 2-11. 초대 코드 삭제 (테이블이 있는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitation_codes') THEN
    DELETE FROM invitation_codes
    WHERE created_by = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com')
       OR used_by = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com');
  END IF;
END $$;

-- 2-12. user_advertisers 매핑 삭제
DELETE FROM user_advertisers
WHERE user_id = (SELECT id FROM users WHERE email = 'hjyoomkt@gmail.com');

-- 2-13. Auth 사용자 삭제
DELETE FROM auth.users
WHERE email = 'hjyoomkt@gmail.com';

-- 2-14. Users 테이블에서 삭제
DELETE FROM users
WHERE email = 'hjyoomkt@gmail.com';

-- 2-15. 브랜드(광고주) 삭제 (다른 사용자 없으면)
DELETE FROM advertisers
WHERE id NOT IN (
  SELECT DISTINCT advertiser_id FROM user_advertisers WHERE advertiser_id IS NOT NULL
  UNION
  SELECT DISTINCT advertiser_id FROM users WHERE advertiser_id IS NOT NULL
);

-- 2-16. 조직 삭제 (광고주도 없고 사용자도 없으면)
DELETE FROM organizations
WHERE id NOT IN (SELECT DISTINCT organization_id FROM advertisers WHERE organization_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT organization_id FROM users WHERE organization_id IS NOT NULL);


-- ===================================
-- 3. 삭제 완료 확인
-- ===================================
SELECT '=== 삭제 완료 확인 ===' AS info;

-- 사용자가 삭제되었는지 확인 (0이어야 함)
SELECT
  'users' AS table_name,
  COUNT(*) AS remaining_count
FROM users
WHERE email = 'hjyoomkt@gmail.com'
UNION ALL
SELECT
  'auth.users' AS table_name,
  COUNT(*) AS remaining_count
FROM auth.users
WHERE email = 'hjyoomkt@gmail.com';
