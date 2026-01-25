-- ==========================================
-- Meta 전환 타입 설정 컬럼 추가
-- Date: 2026-01-25
-- ==========================================

-- advertisers 테이블에 meta_conversion_type 컬럼 추가
ALTER TABLE advertisers
ADD COLUMN IF NOT EXISTS meta_conversion_type TEXT DEFAULT 'purchase';

-- 제약조건: 'purchase' 또는 'complete_registration'만 허용
ALTER TABLE advertisers
ADD CONSTRAINT check_meta_conversion_type
CHECK (meta_conversion_type IN ('purchase', 'complete_registration'));

-- 주석 추가
COMMENT ON COLUMN advertisers.meta_conversion_type IS '메타 광고 전환 지표 타입 (purchase: 구매, complete_registration: 회원가입)';

-- 기존 데이터 기본값 설정 (모두 구매로 초기화)
UPDATE advertisers
SET meta_conversion_type = 'purchase'
WHERE meta_conversion_type IS NULL;
