-- ================================================
-- 브랜드 삭제 시 에이전시 직원 보호를 위한 제약조건 수정
-- ================================================
-- 작성일: 2026-01-27
-- 목적: 브랜드 삭제 시 에이전시 직원(master, agency_admin, agency_staff, agency_manager) 계정 보호
--
-- 변경사항:
-- - users.advertiser_id: CASCADE → SET NULL
--   브랜드 삭제 시 에이전시 직원의 advertiser_id만 NULL로 변경 (계정 유지)
--   브랜드 전용 사용자는 애플리케이션 레벨에서 직접 삭제
-- ================================================

-- users.advertiser_id를 SET NULL로 변경 (에이전시 직원 보호)
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_advertiser_id_fkey,
ADD CONSTRAINT users_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE SET NULL;

-- 검증: 변경된 제약조건 확인
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  CASE confdeltype
    WHEN 'c' THEN 'CASCADE'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    WHEN 'a' THEN 'NO ACTION'
  END AS on_delete_action
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid = 'users'::regclass
  AND confrelid = 'advertisers'::regclass;
