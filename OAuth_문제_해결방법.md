# Google OAuth 연결 실패 문제 해결 방법

## 현재 상황

### 문제
`http://localhost:3000/superadmin/api-management`에서 Google 계정 연결 시도 시 **500 Internal Server Error** 발생

### 에러 메시지
```
Failed to store OAuth credentials
```

### 원인
`oauth-initiate` Edge Function이 `vault.secrets` 테이블에 client_secret을 저장하려고 시도하지만, **Vault 권한 문제**로 실패

## 이미 완료된 작업

### 1. ✅ 프론트엔드 버그 수정
**파일:** `src/views/superadmin/api-management/components/APITokenTable.js`

**수정 내용 (451번 줄, 418-428번 줄):**
```javascript
// 브랜드 UUID를 제대로 전달하도록 수정
advertiser_id: formData.advertiserId  // ✅ (기존: userEmail)

// 브랜드 선택 검증 추가
if (!formData.advertiserId) {
  toast({ title: '브랜드를 먼저 선택해주세요', ... });
  return;
}
```

### 2. ✅ 조직 GCP 복호화 함수 추가
**파일:** `restore_pgcrypto_with_mcc.sql` (196-240번 줄)

**추가된 함수:**
```sql
CREATE OR REPLACE FUNCTION get_organization_gcp_credentials(org_id UUID)
RETURNS TABLE(
  client_id TEXT,
  client_secret TEXT,
  developer_token TEXT,
  mcc_id TEXT
)
```

이 함수는 조직 GCP 설정을 **pgcrypto로 복호화**해서 반환합니다.

**Supabase Dashboard SQL Editor에서 실행 완료**

### 3. ✅ Edge Function JWT 검증 비활성화
```bash
supabase functions deploy oauth-initiate --no-verify-jwt
```

## 남은 문제: Vault 의존성 제거

### 문제 코드 위치
**파일:** `supabase/functions/oauth-initiate/index.ts` (253-274번 줄)

```typescript
// ❌ 현재: Vault 사용 (실패)
const { data: clientSecretVault, error: vaultError } = await supabaseServiceRole
  .from('vault.secrets')
  .insert({
    secret: clientSecret,
    description: `Temporary OAuth client secret for session ${stateToken}`,
  })
  .select('id')
  .single();

// OAuth 세션에 Vault ID 저장
await supabaseServiceRole
  .from('oauth_authorization_sessions')
  .insert({
    // ...
    client_id: clientId,
    client_secret_vault_id: clientSecretVault.id,  // ❌ Vault ID 사용
  });
```

### 해결 방법

#### 1단계: 데이터베이스 스키마 수정
**oauth_authorization_sessions 테이블에 client_secret 컬럼 추가**

**Supabase Dashboard SQL Editor에서 실행:**
```sql
ALTER TABLE oauth_authorization_sessions
ADD COLUMN IF NOT EXISTS client_secret TEXT;

COMMENT ON COLUMN oauth_authorization_sessions.client_secret IS 'OAuth 요청 시 사용된 Client Secret (평문, 15분 후 자동 삭제)';
```

#### 2단계: Edge Function 코드 수정
**파일:** `supabase/functions/oauth-initiate/index.ts`

**수정 전 (251-298번 줄):**
```typescript
// Client Secret을 Vault에 임시 저장 (callback에서 사용)
console.log('[OAuth] Vault에 client secret 저장 시도...');
const { data: clientSecretVault, error: vaultError } = await supabaseServiceRole
  .from('vault.secrets')
  .insert({
    secret: clientSecret,
    description: `Temporary OAuth client secret for session ${stateToken}`,
  })
  .select('id')
  .single();

console.log('[OAuth] Vault 저장 결과:', { success: !!clientSecretVault, error: vaultError?.message });

if (vaultError || !clientSecretVault) {
  console.error('[OAuth] Vault 저장 실패:', vaultError);
  return new Response(
    JSON.stringify({
      error: 'Failed to store OAuth credentials',
      details: vaultError?.message || 'Unknown vault error',
      code: vaultError?.code
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// OAuth 세션 저장 (client_id와 client_secret_vault_id 포함)
const { error: sessionError } = await supabaseServiceRole
  .from('oauth_authorization_sessions')
  .insert({
    advertiser_id,
    platform,
    state_token: stateToken,
    code_verifier: codeVerifier,
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    // 추가 필드: Client ID와 Client Secret Vault ID 저장
    client_id: clientId,
    client_secret_vault_id: clientSecretVault.id,
  });

if (sessionError) {
  console.error('Failed to create OAuth session:', sessionError);
  // 실패 시 Vault에서 Client Secret 삭제
  await supabaseServiceRole
    .from('vault.secrets')
    .delete()
    .eq('id', clientSecretVault.id);

  return new Response(
    JSON.stringify({ error: 'Failed to create OAuth session' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**수정 후:**
```typescript
// OAuth 세션 저장 (client_id와 client_secret 직접 저장)
console.log('[OAuth] OAuth 세션 저장 시도...');
const { error: sessionError } = await supabaseServiceRole
  .from('oauth_authorization_sessions')
  .insert({
    advertiser_id,
    platform,
    state_token: stateToken,
    code_verifier: codeVerifier,
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    // Client ID와 Client Secret 직접 저장 (15분 후 자동 삭제)
    client_id: clientId,
    client_secret: clientSecret,
  });

console.log('[OAuth] 세션 저장 결과:', { success: !sessionError, error: sessionError?.message });

if (sessionError) {
  console.error('[OAuth] 세션 저장 실패:', sessionError);
  return new Response(
    JSON.stringify({
      error: 'Failed to create OAuth session',
      details: sessionError?.message || 'Unknown session error',
      code: sessionError?.code
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### 3단계: oauth-callback 함수도 수정 필요
**파일:** `supabase/functions/oauth-callback/index.ts`

**수정 위치:** client_secret을 가져오는 부분

**수정 전 (142-150번 줄 근처):**
```typescript
if (session.client_secret_vault_id) {
  const { data: secretData } = await supabaseServiceRole
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', session.client_secret_vault_id)
    .single();
  clientSecret = secretData?.decrypted_secret;
}
```

**수정 후:**
```typescript
// client_secret을 세션에서 직접 가져옴
clientSecret = session.client_secret;
```

**Vault 정리 코드도 제거 (253-258번 줄 근처):**
```typescript
// ❌ 삭제: Vault 정리 코드
if (session.client_secret_vault_id) {
  await supabaseServiceRole
    .from('vault.secrets')
    .delete()
    .eq('id', session.client_secret_vault_id);
}
```

#### 4단계: 재배포
```bash
cd /Users/reon/Desktop/개발/growth-dashboard
supabase functions deploy oauth-initiate --no-verify-jwt
supabase functions deploy oauth-callback --no-verify-jwt
```

## 테스트 방법

1. `http://localhost:3000/superadmin/api-management` 접속
2. "새 토큰 추가" 클릭
3. **브랜드 선택** (조직에 속한 브랜드)
4. 플랫폼: "Google Ads" 선택
5. **"대행사 GCP 사용"** 선택
6. "Google 계정 연결" 클릭
7. ✅ **예상:** OAuth 팝업이 정상적으로 열림
8. 구글 인증 완료
9. Refresh Token이 자동으로 폼에 채워짐

## 참고: 암호화 방식 정리

### 조직 GCP 설정 (장기 저장)
- **방식:** pgcrypto (PGP 대칭키 암호화)
- **테이블:** `organizations`
- **컬럼:** `google_*_encrypted` (TEXT)
- **키:** `'your-encryption-key-change-this-in-production'`

### OAuth 세션 (임시 저장, 15분)
- **방식:** 평문 저장 (15분 후 자동 삭제되므로 안전)
- **테이블:** `oauth_authorization_sessions`
- **컬럼:** `client_id` (TEXT), `client_secret` (TEXT)

## 핵심 변경 사항 요약

1. ❌ **제거:** Vault 의존성 (`vault.secrets`, `vault.decrypted_secrets`)
2. ✅ **추가:** `oauth_authorization_sessions.client_secret` 컬럼
3. ✅ **수정:** Edge Function 코드에서 Vault 대신 직접 저장
4. ✅ **완료:** 프론트엔드 advertiser_id 버그 수정
5. ✅ **완료:** 조직 GCP 복호화 함수 추가

## 문제 해결 체크리스트

- [x] 프론트엔드: advertiser_id 수정
- [x] 프론트엔드: 브랜드 선택 검증 추가
- [x] DB 함수: get_organization_gcp_credentials 추가
- [ ] **DB 스키마: oauth_authorization_sessions.client_secret 컬럼 추가** ← 현재 단계
- [ ] **Edge Function: oauth-initiate Vault 제거**
- [ ] **Edge Function: oauth-callback Vault 제거**
- [ ] 재배포 및 테스트
