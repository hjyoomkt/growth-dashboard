# 테스트 계정 생성 가이드

## 생성되는 계정

### 1. 에이전시 관리자 계정
- **이메일**: `agency.admin@test.com`
- **비밀번호**: `qwas123`
- **역할**: agency_admin (에이전시 관리자)
- **소속**: 테스트 에이전시

### 2. 브랜드 대표운영자 계정
- **이메일**: `brand.admin@test.com`
- **비밀번호**: `qwas123`
- **역할**: advertiser_admin (브랜드 대표운영자)
- **소속**: 테스트 브랜드 (테스트 에이전시 산하)

### 3. 조직/브랜드 정보
- **에이전시 조직**: 테스트 에이전시
- **클라이언트 브랜드**: 테스트 브랜드

---

## 실행 방법

### 방법 1: Supabase Dashboard에서 실행 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New query** 버튼 클릭
5. [create_test_accounts.sql](create_test_accounts.sql) 파일 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭 (또는 Ctrl+Enter)

### 방법 2: psql CLI 사용

```bash
# Supabase 연결 정보 설정
export PGPASSWORD='your-database-password'
export DATABASE_URL='postgresql://postgres:[password]@[host]:[port]/postgres'

# SQL 파일 실행
psql "$DATABASE_URL" -f database/create_test_accounts.sql
```

### 방법 3: Node.js 스크립트 사용

```javascript
// create_test_accounts.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key 필요!

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = fs.readFileSync('database/create_test_accounts.sql', 'utf8');

async function createTestAccounts() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

createTestAccounts();
```

---

## 실행 결과 확인

스크립트 실행 후 다음과 같은 메시지가 표시됩니다:

```
========================================
✓ 테스트 계정 생성 완료!
========================================

1. 에이전시 조직
   - 조직명: 테스트 에이전시
   - 조직 ID: [UUID]

2. 에이전시 관리자 계정
   - 이메일: agency.admin@test.com
   - 비밀번호: qwas123
   - 역할: agency_admin
   - User ID: [UUID]

3. 클라이언트 브랜드
   - 브랜드명: 테스트 브랜드
   - 브랜드 ID: [UUID]

4. 브랜드 대표운영자 계정
   - 이메일: brand.admin@test.com
   - 비밀번호: qwas123
   - 역할: advertiser_admin
   - 소속 브랜드: 테스트 브랜드
   - User ID: [UUID]

✓ 모든 계정의 이메일 인증이 완료되었습니다.
  로그인하여 사용할 수 있습니다.
========================================
```

---

## 로그인 테스트

### 에이전시 관리자로 로그인
1. 애플리케이션 로그인 페이지 접속
2. 이메일: `agency.admin@test.com`
3. 비밀번호: `qwas123`
4. 로그인 후 에이전시 관리자 권한 확인

### 브랜드 대표운영자로 로그인
1. 애플리케이션 로그인 페이지 접속
2. 이메일: `brand.admin@test.com`
3. 비밀번호: `qwas123`
4. 로그인 후 브랜드 대표운영자 권한 확인

---

## 주요 특징

✅ **이메일 인증 완료**: 모든 계정이 즉시 로그인 가능
✅ **완전한 계정 구조**: auth.users + auth.identities + public.users 모두 생성
✅ **조직 연결**: 에이전시 조직과 브랜드가 올바르게 연결됨
✅ **역할 설정**: 각 계정의 역할(role)이 정확히 설정됨

---

## 계정 삭제 방법

테스트 후 계정을 삭제하려면:

```sql
-- 1. 브랜드 대표운영자 삭제
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'brand.admin@test.com'
);
DELETE FROM auth.users WHERE email = 'brand.admin@test.com';
DELETE FROM public.users WHERE email = 'brand.admin@test.com';

-- 2. 에이전시 관리자 삭제
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'agency.admin@test.com'
);
DELETE FROM auth.users WHERE email = 'agency.admin@test.com';
DELETE FROM public.users WHERE email = 'agency.admin@test.com';

-- 3. 브랜드 삭제
DELETE FROM public.advertisers WHERE name = '테스트 브랜드';

-- 4. 에이전시 조직 삭제
DELETE FROM public.organizations WHERE name = '테스트 에이전시';
```

---

## 문제 해결

### 이미 존재하는 계정 오류
```
ERROR: duplicate key value violates unique constraint "users_email_key"
```

**해결 방법**: 위의 "계정 삭제 방법"을 사용하여 기존 테스트 계정을 먼저 삭제하세요.

### 권한 오류
```
ERROR: permission denied for table auth.users
```

**해결 방법**: Supabase Dashboard의 SQL Editor를 사용하거나, Service Role Key를 사용하세요.

### 비밀번호 해싱 오류
```
ERROR: function crypt(text, text) does not exist
```

**해결 방법**: pgcrypto 확장이 활성화되어 있는지 확인하세요.
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

**작성일**: 2026-02-02
**버전**: 1.0
