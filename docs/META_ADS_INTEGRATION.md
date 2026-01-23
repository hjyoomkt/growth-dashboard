# Meta Ads 통합 구현 가이드

## 📌 개요

이 문서는 growth-dashboard에 Meta Ads 통합을 구축한 과정을 정리한 참고 자료입니다.
네이버 등 다른 매체 통합 시 동일한 패턴을 따를 수 있습니다.

**구현 기간**: 2026-01-23
**플랜 파일**: `C:\Users\REON\.claude\plans\quizzical-stargazing-jellyfish.md`

---

## 🎯 구현 목표

1. `/superadmin/default`에서 조직 레벨 Meta API 자격증명 설정
2. `/superadmin/api-management`에서 Meta Ads 광고주 조회 및 토큰 추가
3. 조직 토큰 자동 입력 (수동 입력도 가능)
4. 데이터 수집 시작 (기존 collector 활용)

---

## 📂 파일 구조

### 1. 데이터베이스 마이그레이션

#### `supabase/migrations/036_add_meta_credentials.sql`
- **목적**: organizations 테이블에 Meta 자격증명 컬럼 추가
- **내용**:
  ```sql
  ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS meta_app_id_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS meta_app_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS meta_access_token_encrypted TEXT;
  ```

#### `supabase/migrations/037_meta_credentials_functions.sql`
- **목적**: Meta 자격증명 저장/조회 DB 함수 생성
- **함수 3개**:
  1. `save_organization_meta_credentials()` - 저장/삭제
  2. `get_organization_meta_preview()` - 부분 마스킹 미리보기
  3. `get_organization_meta_credentials()` - 복호화된 실제 값 (Edge Function 전용)

**암호화 방식**: pgcrypto의 `pgp_sym_encrypt/decrypt` 사용
**암호화 키**: `'your-encryption-key-change-this-in-production'` (모든 함수 동일)

---

### 2. Edge Functions

#### `supabase/functions/save-organization-meta/index.ts`
- **목적**: 조직 Meta 자격증명 저장
- **권한**: master/agency_admin만 접근 가능
- **플로우**:
  1. 사용자 인증 확인
  2. 권한 검증 (master/agency_admin)
  3. Service Role로 DB 함수 호출
  4. `save_organization_meta_credentials` RPC 실행

**파라미터**:
```typescript
{
  organization_id: string,
  app_id?: string,        // 선택
  app_secret?: string,    // 선택
  access_token?: string   // 필수
}
```

**배포 명령**:
```bash
export SUPABASE_ACCESS_TOKEN=your_token
npx supabase functions deploy save-organization-meta --project-ref qdzdyoqtzkfpcogecyar
```

---

#### `supabase/functions/list-meta-adaccounts/index.ts`
- **목적**: Meta Graph API 호출하여 광고 계정 목록 조회
- **플로우**:
  1. 조직 토큰 또는 수동 입력 토큰 사용
  2. Meta Graph API 호출: `GET /v21.0/me/adaccounts`
  3. 응답 형식 변환 및 상태 매핑

**API 엔드포인트**:
```
https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id,account_status&access_token={token}
```

**응답 형식**:
```typescript
{
  accounts: [
    {
      id: "act_123456789",
      account_id: "123456789",
      name: "광고 계정명",
      status: "활성",
      displayName: "광고 계정명 (act_123456789)"
    }
  ]
}
```

**상태 매핑**:
```typescript
{
  1: '활성',
  2: '비활성',
  3: '심사중',
  7: '지불기한 경과',
  9: '삭제됨'
}
```

---

### 3. 프론트엔드 컴포넌트

#### `src/views/superadmin/default/index.jsx`
- **위치**: 라인 ~510 (Google API 설정 섹션 바로 아래)
- **추가된 State**:
  ```javascript
  const [metaSettings, setMetaSettings] = useState({
    appId: '',
    appSecret: '',
    accessToken: '',
  });
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [hasExistingMeta, setHasExistingMeta] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  ```

- **추가된 함수**:
  - `fetchMetaSettings()` - RPC: `get_organization_meta_preview`
  - `handleSaveMetaSettings()` - Edge Function: `save-organization-meta`
  - `handleMetaInputFocus(field)` - 마스킹 해제

- **UI 특징**:
  - App ID, App Secret은 선택 사항
  - Access Token은 필수
  - 비밀번호 토글 버튼으로 표시/숨김
  - 마스킹된 값 클릭 시 초기화 가능

---

#### `src/views/superadmin/api-management/components/PlatformLoginModal.jsx`
- **변경 사항**: 라인 43-47
  ```javascript
  {
    name: 'Meta Ads',
    icon: SiMeta,
    color: 'blue.600',
    enabled: true,  // false → true로 변경
  }
  ```

---

#### `src/views/superadmin/api-management/components/MetaAccountModal.jsx` (신규)
- **목적**: Meta 광고 계정 선택 모달
- **기능**:
  1. 조직 토큰 자동 입력 (마스킹됨)
  2. 수동 토큰 입력 가능
  3. "광고주 조회" 버튼 → Edge Function 호출
  4. 광고 계정 목록 표시 (라디오 버튼)

- **핵심 로직**:
  ```javascript
  // 조직 토큰 자동 입력
  useEffect(() => {
    if (isOpen && useOrgToken && organizationId) {
      fetchOrganizationToken();
    }
  }, [isOpen, useOrgToken, organizationId]);

  // 광고주 조회
  const handleFetchAccounts = async () => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/list-meta-adaccounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        organization_id: organizationId,
        access_token: useOrgToken ? undefined : accessToken,
      }),
    });
  };
  ```

---

#### `src/views/superadmin/api-management/components/PlatformLoginFlow.jsx`
- **변경 사항**:
  1. MetaAccountModal import 추가
  2. useAuth에서 organizationId 가져오기
  3. metaAccountInfo state 추가
  4. `handleBrandSelect()` 수정:
     ```javascript
     if (selectedPlatform === 'Meta Ads') {
       setCurrentStep('metaAccount');
     }
     ```
  5. `handleMetaAccountSelect()` 추가
  6. MetaAccountModal 컴포넌트 렌더링

---

#### `src/views/superadmin/api-management/components/APITokenTable.js`
- **변경 사항**: `handlePlatformLoginComplete()` 함수 수정

**Meta Ads 처리 플로우**:
```javascript
if (data.platform === 'Meta Ads') {
  // 1. Integration 생성
  const { data: newIntegration } = await supabase
    .from('integrations')
    .insert({
      advertiser_id: data.brandId,
      platform: 'Meta Ads',
      integration_type: 'token',
      legacy_account_id: data.metaAccountId,
      account_description: data.metaAccountName,
    })
    .select()
    .single();

  // 2. Access Token 저장
  let tokenToSave = data.metaAccessToken;

  // 조직 토큰 사용 시 조직에서 가져오기
  if (!tokenToSave) {
    const { data: metaCredentials } = await supabase
      .rpc('get_organization_meta_credentials', { org_id: organizationId });
    tokenToSave = metaCredentials[0].access_token;
  }

  // 3. 토큰 암호화 저장
  await supabase.rpc('store_encrypted_token', {
    p_api_token_id: newIntegration.id,
    p_access_token: tokenToSave,
  });

  // 4. 초기 데이터 수집 모달 열기
  setSavedIntegrationId(newIntegration.id);
  onInitialCollectionModalOpen();
}
```

---

### 4. 데이터 수집 (기존 활용)

#### `supabase/functions/_shared/collectors/meta.ts`
- **이미 구현 완료**
- **수집 방식**:
  - Meta Graph API v24.0 사용
  - 광고 레벨 데이터 수집
  - Demographics 별도 수집
  - 크리에이티브 수집

#### `supabase/functions/collect-ad-data/index.ts`
- **토큰 조회 로직**:
  ```typescript
  async function resolveAccessToken(supabase, integration) {
    if (integration.platform === 'Meta Ads') {
      const { data: accessToken } = await supabase.rpc(
        'get_decrypted_token',
        {
          p_api_token_id: integration.id,
          p_token_type: 'access_token'
        }
      );
      return accessToken;
    }
  }
  ```

---

## 🔄 전체 플로우

### 매체 로그인 플로우
```
1. [PlatformLoginModal] "Meta Ads" 클릭
   ↓
2. [BrandSelectModal] 브랜드 선택
   ↓
3. [MetaAccountModal]
   - 조직 Meta 토큰 자동 입력 (있으면)
   - 없으면 수동 입력
   - "광고주 조회" 클릭
   - Edge Function: list-meta-adaccounts 호출
   - 광고 계정 목록 표시 (라디오 버튼)
   - 계정 선택 후 "다음"
   ↓
4. [APITokenTable] Integration 생성
   - integrations 테이블 INSERT
   - Access Token 암호화 저장 (store_encrypted_token)
   ↓
5. [초기 데이터 수집 모달]
   - 시작일/종료일 입력
   - 프리셋: 최근 90일, 최근 30일
   - "수집 시작" 클릭
   ↓
6. Edge Function: initial-collection 호출
   - meta.ts collector 실행
   - ad_performance 테이블에 데이터 저장
   ↓
7. [APITokenTable] 토큰 목록에 표시
   - 수집 진행 상태 모니터링
```

---

## 🔐 보안 및 암호화

### 암호화 방식
- **라이브러리**: pgcrypto extension
- **함수**: `pgp_sym_encrypt()` / `pgp_sym_decrypt()`
- **암호화 키**: `'your-encryption-key-change-this-in-production'`

### 권한 관리
- **조직 설정**: master, agency_admin만 접근
- **토큰 저장**: Service Role 권한으로 DB 함수 호출
- **토큰 조회**: Edge Function에서만 복호화 가능
- **프론트엔드**: 마스킹된 값만 표시

### 마스킹 형식
```
App ID: "1243••••••••1250"
Access Token: "EAAxxxxxxx••••••••••••••••••xxxxxxxxx"
```

---

## 📊 DB 함수 상세

### `save_organization_meta_credentials()`
```sql
CREATE OR REPLACE FUNCTION save_organization_meta_credentials(
  org_id UUID,
  p_app_id TEXT DEFAULT NULL,
  p_app_secret TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  -- 삭제 로직 (EMPTY_STRING 전달 시)
  IF p_app_id = 'EMPTY_STRING' THEN
    UPDATE organizations SET meta_app_id_encrypted = NULL WHERE id = org_id;
  ELSIF p_app_id IS NOT NULL THEN
    UPDATE organizations
    SET meta_app_id_encrypted = pgp_sym_encrypt(p_app_id, encryption_key)
    WHERE id = org_id;
  END IF;

  -- app_secret, access_token도 동일한 로직
END;
$$;
```

### `get_organization_meta_preview()`
```sql
CREATE OR REPLACE FUNCTION get_organization_meta_preview(org_id UUID)
RETURNS TABLE (
  app_id_preview TEXT,
  app_secret_preview TEXT,
  access_token_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  RETURN QUERY
  SELECT
    -- App ID 마스킹 (앞 4자리 + •••• + 뒤 4자리)
    CASE
      WHEN meta_app_id_encrypted IS NOT NULL THEN
        CONCAT(
          SUBSTRING(decrypted_app_id, 1, 4),
          '••••••••',
          SUBSTRING(decrypted_app_id, LENGTH(decrypted_app_id) - 3)
        )
      ELSE NULL
    END,
    -- Access Token 마스킹 (앞 10자리 + •••• + 뒤 10자리)
    ...
  FROM organizations
  WHERE id = org_id;
END;
$$;
```

### `store_encrypted_token()`
```sql
CREATE OR REPLACE FUNCTION store_encrypted_token(
  p_api_token_id UUID,
  p_access_token TEXT DEFAULT NULL,
  p_refresh_token TEXT DEFAULT NULL,
  ...
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  -- integrations 테이블 업데이트
  UPDATE integrations SET
    access_token_encrypted = CASE
      WHEN p_access_token IS NOT NULL
      THEN pgp_sym_encrypt(p_access_token, encryption_key)
      ELSE access_token_encrypted
    END,
    ...
  WHERE id = p_api_token_id;
END;
$$;
```

### `get_decrypted_token()`
```sql
CREATE OR REPLACE FUNCTION get_decrypted_token(
  p_api_token_id UUID,
  p_token_type TEXT  -- 'access_token', 'refresh_token', etc.
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
  encrypted_value BYTEA;
BEGIN
  -- integrations 테이블에서 조회
  EXECUTE format(
    'SELECT %I FROM integrations WHERE id = $1',
    p_token_type || '_encrypted'
  ) INTO encrypted_value USING p_api_token_id;

  RETURN pgp_sym_decrypt(encrypted_value, encryption_key);
END;
$$;
```

---

## ✅ 검증 체크리스트

### 데이터베이스
- [x] organizations 테이블에 meta_*_encrypted 컬럼 3개 추가
- [x] save_organization_meta_credentials 함수 존재
- [x] get_organization_meta_preview 함수 존재
- [x] get_organization_meta_credentials 함수 존재

### Edge Functions
- [x] save-organization-meta 배포 완료
- [x] list-meta-adaccounts 배포 완료

### 프론트엔드
- [x] /superadmin/default - Meta API 설정 섹션 표시
- [x] 3개 입력 필드 정상 작동
- [x] 비밀번호 토글 동작 확인
- [x] 저장 → DB 저장 → 미리보기 조회 → 마스킹 확인
- [x] /superadmin/api-management - Meta Ads 활성화
- [x] MetaAccountModal - 조직 토큰 자동 입력
- [x] 광고주 조회 → 계정 목록 표시 → 선택 가능
- [x] Integration 생성 → 데이터 수집 시작

---

## 🚨 트러블슈팅

### 문제 1: 토큰 저장 함수 파라미터 오류
**증상**: `Could not find the function store_encrypted_token(p_token_type, p_token_value)`

**원인**: 함수 시그니처와 호출 방식 불일치

**해결**:
```javascript
// ❌ 잘못된 호출
await supabase.rpc('store_encrypted_token', {
  p_api_token_id: id,
  p_token_type: 'access_token',
  p_token_value: token,
});

// ✅ 올바른 호출
await supabase.rpc('store_encrypted_token', {
  p_api_token_id: id,
  p_access_token: token,
});
```

### 문제 2: 조직 토큰 사용 시 토큰 미저장
**증상**: 조직 토큰 사용 시 데이터 수집 중 "access token is null" 에러

**원인**: 조직 토큰 사용 시 토큰 저장 로직 누락

**해결**:
```javascript
// 조직 토큰 사용 시 조직에서 토큰 가져와서 저장
if (!data.metaAccessToken) {
  const { data: metaCredentials } = await supabase
    .rpc('get_organization_meta_credentials', { org_id: organizationId });
  tokenToSave = metaCredentials[0].access_token;
}
```

### 문제 3: 광고주 조회 시 "토큰 필요" 경고
**증상**: 조직 토큰 자동 입력됐는데도 "Access Token을 입력해주세요" 토스트 표시

**원인**: 마스킹된 토큰을 빈 토큰으로 판단

**해결**:
```javascript
// 조직 토큰 사용 시 검증 스킵
if (!useOrgToken && (!accessToken || accessToken.includes('••••'))) {
  // 경고 표시
}
```

---

## 🔄 네이버/카카오 적용 시 참고사항

### 1. 동일한 구조 따르기
```
DB 마이그레이션:
- 03X_add_naver_credentials.sql
- 03X_naver_credentials_functions.sql

Edge Functions:
- save-organization-naver/
- list-naver-adaccounts/

프론트엔드:
- NaverAccountModal.jsx
- PlatformLoginFlow.jsx 수정
- APITokenTable.js 수정
```

### 2. 함수명 규칙
```
save_organization_naver_credentials()
get_organization_naver_preview()
get_organization_naver_credentials()
```

### 3. 컬럼명 규칙
```
naver_client_id_encrypted
naver_client_secret_encrypted
naver_access_token_encrypted (또는 필요한 토큰)
```

### 4. Edge Function 엔드포인트
```
/functions/v1/save-organization-naver
/functions/v1/list-naver-adaccounts
```

### 5. 플랫폼 특화 사항
- **네이버**: Client ID, Client Secret, Customer ID
- **카카오**: Admin Key, 광고 계정 ID
- **API 버전**: 각 플랫폼 최신 버전 사용
- **인증 방식**: 플랫폼별 OAuth/API Key 방식 확인

---

## 📝 핵심 교훈

1. **DB 함수 시그니처 정확히 확인**: RPC 호출 시 파라미터명 정확히 일치시키기
2. **조직 토큰 vs 수동 토큰**: 두 경로 모두 테스트 필요
3. **마스킹 로직**: 프론트엔드 검증 시 마스킹 값 고려
4. **Edge Function 배포**: `export` 명령어로 환경변수 설정 (Windows에서 `set` 안 됨)
5. **암호화 키 통일**: 모든 함수에서 동일한 암호화 키 사용

---

## 📚 참고 자료

- **플랜 파일**: `C:\Users\REON\.claude\plans\quizzical-stargazing-jellyfish.md`
- **Meta Graph API Docs**: https://developers.facebook.com/docs/graph-api
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **pgcrypto 문서**: https://www.postgresql.org/docs/current/pgcrypto.html

---

**작성일**: 2026-01-23
**작성자**: Claude Code
**버전**: 1.0
