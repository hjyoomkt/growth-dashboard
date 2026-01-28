-- ================================================
-- Orphaned auth.users 정리 스크립트
-- ================================================
-- 목적: users 테이블에는 없지만 auth.users에만 남아있는 계정 찾기
-- 실행 시기: 브랜드 삭제 후 auth.users 정리가 필요할 때
-- ================================================

-- 1. Orphaned auth.users 확인 (users 테이블에 없는 계정)
SELECT
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  'ORPHANED - users 테이블 없음' AS 상태
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- ================================================
-- 주의: auth.users 직접 삭제는 Supabase가 관리하므로
-- SQL로 직접 삭제하지 않는 것을 권장합니다.
--
-- 대신:
-- 1. Supabase Dashboard > Authentication > Users에서 수동 삭제
-- 2. 또는 Supabase Management API 사용
-- ================================================

-- 2. 특정 이메일의 auth.users 존재 확인
-- SELECT id, email FROM auth.users WHERE email = '이메일@example.com';
