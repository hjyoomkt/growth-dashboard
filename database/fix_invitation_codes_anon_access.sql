-- ===================================
-- 초대 코드 익명 사용자 접근 허용
-- 다른 기기에서 초대 링크 접속 시 RLS 문제 해결
-- ===================================

-- 문제: invitation_codes 테이블이 authenticated 사용자만 조회 가능
-- 해결: 익명 사용자도 유효한 초대 코드(미사용 & 미만료)를 조회할 수 있도록 허용

-- 1. 기존 anon 정책 삭제 (있다면)
DROP POLICY IF EXISTS "anon_select_valid_invitation_codes" ON invitation_codes;
DROP POLICY IF EXISTS "anon_select_invitation_codes" ON invitation_codes;

-- 2. 익명 사용자를 위한 제한된 SELECT 정책 생성
-- 미사용(used_by IS NULL) 및 미만료(expires_at > now()) 코드만 조회 가능
CREATE POLICY "anon_select_valid_invitation_codes"
ON invitation_codes FOR SELECT
TO anon
USING (
  used_by IS NULL
  AND expires_at > now()
);

-- 3. 확인
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'invitation_codes'
ORDER BY policyname;
