-- 기존 사용자의 이메일 확인 상태 수정
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'hjyoomkt@gmail.com'
  AND email_confirmed_at IS NULL;

-- 결과 확인
SELECT
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'hjyoomkt@gmail.com';
