-- ===================================
-- 특정 사용자 삭제 (CASCADE 적용 후)
-- hjyoomkt@gmail.com 사용자와 관련 데이터 모두 삭제
-- ===================================

-- 1. 먼저 삭제할 사용자 정보 확인
SELECT
  u.id AS user_id,
  u.email,
  u.name,
  u.advertiser_id,
  a.name AS advertiser_name,
  u.organization_id,
  o.name AS organization_name
FROM users u
LEFT JOIN advertisers a ON u.advertiser_id = a.id
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'hjyoomkt@gmail.com';

-- 2. Auth 사용자 삭제 (auth.users 테이블)
DELETE FROM auth.users
WHERE email = 'hjyoomkt@gmail.com';

-- 3. Users 테이블에서 삭제 (CASCADE로 관련 데이터 자동 삭제)
-- 참고: 이 단계에서 user_advertisers, board_posts 등이 자동 삭제됨
DELETE FROM users
WHERE email = 'hjyoomkt@gmail.com';

-- 4. 고아(orphan) 광고주 삭제 (사용자가 없는 광고주)
-- 신규 브랜드 생성 시 해당 사용자만 연결되어 있는 경우
DELETE FROM advertisers
WHERE id NOT IN (SELECT DISTINCT advertiser_id FROM users WHERE advertiser_id IS NOT NULL)
  AND id IN (
    -- hjyoomkt@gmail.com이 생성한 광고주만 삭제
    SELECT a.id
    FROM advertisers a
    LEFT JOIN users u ON a.id = u.advertiser_id
    WHERE u.id IS NULL
  );

-- 5. 고아 조직 삭제 (광고주가 없는 조직)
DELETE FROM organizations
WHERE id NOT IN (SELECT DISTINCT organization_id FROM advertisers WHERE organization_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT organization_id FROM users WHERE organization_id IS NOT NULL);

-- 6. 확인: 삭제 완료 확인
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
