-- ================================================
-- 회원 탈퇴 기능을 위한 제약조건 수정
-- ================================================

-- 1. api_tokens: advertiser 삭제 시 토큰 보호 (SET NULL)
-- 현재 CASCADE → SET NULL로 변경하여 토큰 보호
ALTER TABLE api_tokens
ALTER COLUMN advertiser_id DROP NOT NULL;

-- 삭제된 브랜드 이름을 저장할 컬럼 추가
ALTER TABLE api_tokens
ADD COLUMN IF NOT EXISTS deleted_advertiser_name TEXT;

-- 제약조건 변경: CASCADE → SET NULL
ALTER TABLE api_tokens
DROP CONSTRAINT IF EXISTS api_tokens_advertiser_id_fkey,
ADD CONSTRAINT api_tokens_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE SET NULL;

-- 2. board_posts: 현재 SET NULL 설정 유지 (게시글 보존)
-- 작성자만 NULL로 설정하여 게시글은 유지
-- 현재 설정이 올바르므로 변경 불필요 (fix_board_posts_fkey.sql 이미 적용됨)
-- 이 섹션은 참고용으로만 유지

-- 3. ad_creatives: advertiser 삭제 차단 해제 (CASCADE)
-- 현재 RESTRICT → CASCADE로 변경
ALTER TABLE ad_creatives
DROP CONSTRAINT IF EXISTS ad_creatives_advertiser_id_fkey,
ADD CONSTRAINT ad_creatives_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;

-- 4. 회원 탈퇴 감사 로그 테이블 생성
CREATE TABLE IF NOT EXISTS user_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id UUID NOT NULL,
  deleted_user_email TEXT NOT NULL,
  deleted_user_name TEXT,
  deleted_by_user_id UUID,
  advertiser_id UUID,
  organization_id UUID,
  new_advertiser_admin_id UUID,
  deletion_reason TEXT,
  data_snapshot JSONB,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_deletion_log_deleted_user
  ON user_deletion_log(deleted_user_id);
CREATE INDEX IF NOT EXISTS idx_user_deletion_log_deleted_at
  ON user_deletion_log(deleted_at DESC);

-- 테이블에 코멘트 추가
COMMENT ON TABLE user_deletion_log IS '회원 탈퇴 기록 테이블 - 감사 및 복구를 위한 로그';
COMMENT ON COLUMN user_deletion_log.data_snapshot IS '삭제된 사용자의 전체 데이터 스냅샷 (JSONB)';
COMMENT ON COLUMN user_deletion_log.new_advertiser_admin_id IS '브랜드 소유권이 이전된 경우 새 관리자 ID';

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
  AND conrelid::regclass::text IN ('api_tokens', 'ad_creatives')
ORDER BY table_name, constraint_name;
