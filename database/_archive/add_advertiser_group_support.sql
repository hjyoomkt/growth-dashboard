-- ===================================
-- advertiser_group_id 브랜드 그룹핑 지원
-- Date: 2026-01-27
-- ===================================

-- 1. invitation_codes 테이블: parent_advertiser_id 추가
ALTER TABLE invitation_codes
ADD COLUMN IF NOT EXISTS parent_advertiser_id UUID REFERENCES advertisers(id);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_parent_advertiser
ON invitation_codes(parent_advertiser_id);

COMMENT ON COLUMN invitation_codes.parent_advertiser_id IS
'하위 브랜드 초대 시 부모 브랜드 ID (advertiser_group_id 상속에 사용)';

-- 2. board_posts 테이블: advertiser_group_id 추가
ALTER TABLE board_posts
ADD COLUMN IF NOT EXISTS advertiser_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_board_posts_group_id
ON board_posts(advertiser_group_id);

COMMENT ON COLUMN board_posts.advertiser_group_id IS
'브랜드 그룹 ID - 같은 그룹의 모든 브랜드가 게시글 확인 가능';

-- 3. advertisers 테이블: advertiser_group_id 인덱스 확인 (이미 존재해야 함)
CREATE INDEX IF NOT EXISTS idx_advertisers_group_id
ON advertisers(advertiser_group_id);

-- 완료
SELECT '✅ advertiser_group_id 마이그레이션 완료' AS status;
