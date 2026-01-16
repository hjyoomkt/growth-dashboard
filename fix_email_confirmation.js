const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function fixEmailConfirmation() {
  console.log('Checking user email confirmation status...\n');

  // Service Role Key가 필요합니다 (auth.users 테이블 직접 접근 불가)
  console.log('⚠️  이 스크립트는 ANON_KEY로는 auth.users 테이블에 접근할 수 없습니다.');
  console.log('⚠️  Supabase Dashboard의 SQL Editor에서 다음 쿼리를 실행하세요:\n');

  console.log(`
-- 기존 사용자의 이메일 확인 상태 수정
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
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
  `);

  console.log('\n📍 실행 위치: https://supabase.com/dashboard/project/qdzdyoqtzkfpcogecyar/sql/new');
}

fixEmailConfirmation();
