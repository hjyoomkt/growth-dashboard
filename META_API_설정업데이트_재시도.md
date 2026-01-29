# Meta API 설정 저장 - 자동 재시도 기능 추가

## 작업 일시
2026-01-29

## 문제 상황

`/superadmin/default` 페이지에서 Meta API 설정(앱 ID, 앱 시크릿, 액세스 토큰)을 저장할 때 **간헐적으로 401 Unauthorized 오류** 발생

### 증상
- ❌ 액세스 토큰만 변경할 때 가끔 401 에러 발생
- ✅ 페이지 새로고침(F5) 후에는 정상 작동
- ✅ GCP 설정 저장 직후 Meta 저장하면 성공
- ✅ 간헐적 문제 (항상 발생하는 것은 아님)

## 원인 분석

**Supabase 인증 세션 토큰 만료 타이밍 이슈**

- 프론트엔드에서 `supabase.auth.getSession()`으로 access token을 가져올 때, 토큰이 만료 직전이거나 갱신 중인 시점에 요청하면 401 에러 발생
- Supabase 세션 토큰 만료 시간: 보통 1시간
- 페이지를 오래 열어둔 후 저장 시도 시 발생 가능

### 왜 GCP는 작동하고 Meta만 간헐적으로 실패했나?

코드 분석 결과:
- `save-organization-gcp`와 `save-organization-meta` Edge Function이 **완전히 동일한 방식**으로 구현됨
- 프론트엔드 호출 방식도 동일함
- 차이점은 사용자의 액션 순서와 타이밍뿐

**시나리오**:
1. GCP 저장 → 세션 토큰이 자동 갱신됨 → 바로 이어서 Meta 저장 시도 → 성공
2. 페이지 로드 후 시간이 지남 → 토큰 만료 직전 → Meta만 저장 시도 → 401 에러

## 해결 방법

### 1. 자동 재시도 로직 추가
401 에러 발생 시 세션을 강제로 갱신한 후 자동으로 한 번 더 시도하도록 수정

### 2. 디버깅 로그 추가
Supabase 세션 토큰 만료 시간을 확인할 수 있도록 로그 추가

## 변경된 파일

### src/views/superadmin/default/index.jsx

**수정 위치**: 384-460번째 줄 (handleSaveMeta 함수)

#### 주요 변경 사항

1. **API 호출 함수 분리** (418-432번째 줄)
```javascript
// API 호출 함수 (재사용 가능)
const callSaveApi = async (token) => {
  return await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/save-organization-meta`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    }
  );
};
```

2. **자동 재시도 로직** (437-451번째 줄)
```javascript
// 첫 번째 시도
let response = await callSaveApi(accessToken);

// 401 에러 발생 시 세션 갱신 후 재시도
if (response.status === 401) {
  console.log('[Meta Settings] 401 에러 발생, 세션 갱신 후 재시도...');

  // 세션 강제 갱신
  const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshedSession?.session?.access_token) {
    throw new Error('세션 갱신에 실패했습니다. 다시 로그인해주세요.');
  }

  accessToken = refreshedSession.session.access_token;
  console.log('[Meta Settings] 세션 갱신 완료, 재시도 중...');

  // 두 번째 시도
  response = await callSaveApi(accessToken);
}
```

3. **디버깅 로그** (394-407번째 줄)
```javascript
// Supabase 인증 세션 토큰 만료 시간 확인 (디버깅용 - Meta API 토큰 아님!)
if (sessionData?.session) {
  const expiresAt = sessionData.session.expires_at; // Unix timestamp (초)
  const now = Math.floor(Date.now() / 1000); // 현재 시간 (초)
  const remainingSeconds = expiresAt - now;
  const remainingMinutes = Math.floor(remainingSeconds / 60);

  console.log('[Meta Settings] Supabase 세션 토큰 (인증용, Meta API 토큰 아님):', {
    현재시간: new Date().toLocaleString('ko-KR'),
    세션만료시간: new Date(expiresAt * 1000).toLocaleString('ko-KR'),
    남은시간: `${remainingMinutes}분 ${remainingSeconds % 60}초`,
    세션만료됨: remainingSeconds <= 0
  });
}
```

## 효과

- ✅ 간헐적 401 에러 자동 해결
- ✅ 사용자 경험 개선 (새로고침 불필요)
- ✅ 디버깅 용이성 향상
- ✅ 보안 수준 유지 (변경 없음)

## 테스트 방법

### 1. 정상 케이스 테스트

1. Meta API 설정 페이지 접속
2. 브라우저 개발자 도구(F12) 열기 → Console 탭
3. 액세스 토큰 변경 후 저장
4. 콘솔 로그 확인:
   ```
   [Meta Settings] Supabase 세션 토큰 (인증용, Meta API 토큰 아님): {
     현재시간: "2026-01-29 오후 8:50:30",
     세션만료시간: "2026-01-29 오후 9:50:30",
     남은시간: "60분 0초",
     세션만료됨: false
   }
   ```
5. 성공 메시지 "저장 완료" 확인

### 2. 401 재시도 케이스 테스트

1. 페이지를 1시간 정도 열어둠 (토큰 만료 직전)
2. Meta API 설정 변경 후 저장
3. 콘솔 로그 확인:
   ```
   [Meta Settings] 401 에러 발생, 세션 갱신 후 재시도...
   [Meta Settings] 세션 갱신 완료, 재시도 중...
   ```
4. 최종적으로 성공 메시지 확인

## 데이터베이스 확인 방법

### 방법 1: 저장 여부 확인
```sql
-- 마스킹된 미리보기 조회
SELECT * FROM get_organization_meta_preview('33f6018b-ef0e-4b55-bf96-718cff1f1e37');
```

예상 결과:
```
app_id_preview    | app_secret_preview | access_token_preview
------------------|--------------------|----------------------
                  |                    | EAABwzLix••••••••YZD
```

### 방법 2: 마지막 업데이트 시간 확인
```sql
SELECT
  id,
  name,
  updated_at,
  updated_at AT TIME ZONE 'Asia/Seoul' as updated_at_kst,
  meta_access_token_encrypted IS NOT NULL as has_token
FROM organizations
WHERE id = '33f6018b-ef0e-4b55-bf96-718cff1f1e37';
```

예상 결과:
- `updated_at_kst`: 방금 저장한 시간
- `has_token`: true

### 방법 3: 실제 값 확인 (개발 환경 전용)
```sql
-- ⚠️ 주의: 프로덕션에서는 절대 실행하지 마세요!
SELECT * FROM get_organization_meta_credentials('33f6018b-ef0e-4b55-bf96-718cff1f1e37');
```

## 중요 참고사항

### 토큰 구분

시스템에는 **2개의 서로 다른 토큰**이 있습니다:

| 토큰 종류 | 만료 시간 | 용도 |
|----------|----------|------|
| **Supabase 세션 토큰** | 1시간 후 | zestdot.com 로그인 인증 (Edge Function 호출 시 사용) |
| **Meta API Access Token** | 약 2개월 후 (예: 2026년 3월 30일) | Meta 광고 데이터 수집 시 사용 |

**디버깅 로그에 표시되는 것은 Supabase 세션 토큰입니다** (Meta API 토큰 아님!)

## 롤백 방법

문제 발생 시:

```bash
# Git으로 이전 버전으로 되돌리기
git checkout HEAD~1 -- src/views/superadmin/default/index.jsx
```

또는 수정된 부분만 제거하고 원래 코드로 복원

## 데이터베이스 스키마 정보

### organizations 테이블 관련 컬럼

```sql
-- Meta API 관련 컬럼
meta_app_id_encrypted         BYTEA    -- PGP 암호화된 App ID
meta_app_secret_encrypted     BYTEA    -- PGP 암호화된 App Secret
meta_access_token_encrypted   BYTEA    -- PGP 암호화된 Access Token
updated_at                    TIMESTAMP -- 마지막 업데이트 시간
```

### 관련 함수

1. **save_organization_meta_credentials(org_id, p_app_id, p_app_secret, p_access_token)**
   - Meta credential 저장/삭제
   - PGP 암호화하여 저장
   - 빈 문자열 또는 'EMPTY_STRING' 전달 시 해당 필드 삭제

2. **get_organization_meta_preview(org_id)**
   - 부분 마스킹된 credential 조회
   - App ID: 처음 4자 + 마스킹
   - Access Token: 처음 10자 + 마스킹 + 마지막 10자 (20자 이하는 완전 마스킹)

3. **get_organization_meta_credentials(org_id)**
   - 복호화된 실제 credential 조회
   - Edge Function 전용 (SECURITY DEFINER)

## 보안 고려사항

- ✅ 세션 갱신은 Supabase의 공식 메서드 사용 (안전함)
- ✅ 토큰은 여전히 HTTPS로 전송됨
- ✅ Edge Function의 인증 로직은 변경 없음 (동일한 보안 수준 유지)
- ✅ 데이터베이스의 credential은 PGP 암호화되어 저장됨
- ✅ 재시도는 딱 1번만 수행 (무한 루프 방지)
