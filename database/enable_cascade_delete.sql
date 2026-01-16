-- ===================================
-- CASCADE DELETE 설정 마이그레이션
-- 사용자/광고주 삭제 시 관련 데이터 자동 삭제
-- ===================================

-- 1. advertisers 테이블의 organization_id 제약 조건 변경
ALTER TABLE advertisers
DROP CONSTRAINT IF EXISTS advertisers_organization_id_fkey,
ADD CONSTRAINT advertisers_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

-- 2. users 테이블의 제약 조건 변경
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_organization_id_fkey,
ADD CONSTRAINT users_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_advertiser_id_fkey,
ADD CONSTRAINT users_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 3. api_tokens 테이블의 제약 조건 변경
ALTER TABLE api_tokens
DROP CONSTRAINT IF EXISTS api_tokens_advertiser_id_fkey,
ADD CONSTRAINT api_tokens_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 4. ad_performance 테이블의 제약 조건 변경
ALTER TABLE ad_performance
DROP CONSTRAINT IF EXISTS ad_performance_advertiser_id_fkey,
ADD CONSTRAINT ad_performance_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 5. creatives 테이블의 제약 조건 변경 (존재하는 경우)
ALTER TABLE IF EXISTS creatives
DROP CONSTRAINT IF EXISTS creatives_advertiser_id_fkey,
ADD CONSTRAINT creatives_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 6. user_advertisers 테이블의 제약 조건 변경 (존재하는 경우)
ALTER TABLE IF EXISTS user_advertisers
DROP CONSTRAINT IF EXISTS user_advertisers_user_id_fkey,
ADD CONSTRAINT user_advertisers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS user_advertisers
DROP CONSTRAINT IF EXISTS user_advertisers_advertiser_id_fkey,
ADD CONSTRAINT user_advertisers_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 7. invitation_codes 테이블의 제약 조건 변경 (존재하는 경우)
ALTER TABLE IF EXISTS invitation_codes
DROP CONSTRAINT IF EXISTS invitation_codes_organization_id_fkey,
ADD CONSTRAINT invitation_codes_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS invitation_codes
DROP CONSTRAINT IF EXISTS invitation_codes_advertiser_id_fkey,
ADD CONSTRAINT invitation_codes_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 8. board_posts 테이블의 제약 조건 변경 (존재하는 경우)
ALTER TABLE IF EXISTS board_posts
DROP CONSTRAINT IF EXISTS board_posts_advertiser_id_fkey,
ADD CONSTRAINT board_posts_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 확인: 변경된 제약 조건 조회
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confdeltype AS delete_action,
  CASE confdeltype
    WHEN 'c' THEN 'CASCADE'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    WHEN 'a' THEN 'NO ACTION'
  END AS delete_action_name
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN (
    'advertisers', 'users', 'api_tokens', 'ad_performance',
    'creatives', 'user_advertisers', 'invitation_codes', 'board_posts'
  )
ORDER BY table_name, constraint_name;
