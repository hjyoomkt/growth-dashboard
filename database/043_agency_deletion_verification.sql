-- 에이전시 삭제 확인 코드 테이블 생성
-- 작성일: 2026-02-02
-- 목적: 에이전시 대표(agency_admin)가 에이전시 삭제 시 이메일 확인 코드 검증

-- 1. 에이전시 삭제 확인 코드 테이블 생성
CREATE TABLE IF NOT EXISTS agency_deletion_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_agency_deletion_codes_code ON agency_deletion_codes(code) WHERE used_at IS NULL;
CREATE INDEX idx_agency_deletion_codes_org ON agency_deletion_codes(organization_id);
CREATE INDEX idx_agency_deletion_codes_expires ON agency_deletion_codes(expires_at) WHERE used_at IS NULL;

-- 3. RLS 정책 활성화
ALTER TABLE agency_deletion_codes ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
-- 본인이 생성한 코드만 조회 가능
CREATE POLICY "Users can view own deletion codes"
  ON agency_deletion_codes FOR SELECT
  USING (user_id = auth.uid());

-- 본인이 생성한 코드만 삽입 가능
CREATE POLICY "Users can create own deletion codes"
  ON agency_deletion_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. 테이블 및 컬럼 주석
COMMENT ON TABLE agency_deletion_codes IS '에이전시 삭제 이메일 확인 코드';
COMMENT ON COLUMN agency_deletion_codes.id IS '고유 ID';
COMMENT ON COLUMN agency_deletion_codes.organization_id IS '삭제 대상 조직 ID';
COMMENT ON COLUMN agency_deletion_codes.user_id IS '코드 생성자 (agency_admin)';
COMMENT ON COLUMN agency_deletion_codes.code IS '6자리 확인 코드 (VERIFY-XXXXXX)';
COMMENT ON COLUMN agency_deletion_codes.expires_at IS '만료 시간 (생성 후 10분)';
COMMENT ON COLUMN agency_deletion_codes.used_at IS '사용 시간 (NULL이면 미사용)';
COMMENT ON COLUMN agency_deletion_codes.created_at IS '생성 시간';

-- 6. 검증 쿼리
-- 테이블 생성 확인
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = 'agency_deletion_codes'
) AS table_created;

-- 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'agency_deletion_codes'
ORDER BY indexname;

-- RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'agency_deletion_codes'
ORDER BY policyname;
