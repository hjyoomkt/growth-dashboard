# resolve-access-token Edge Function 테스트 가이드

## 전제 조건
1. Phase 2 완료: integrations 테이블 생성 완료
2. Phase 1 완료: Vault에 토큰 저장 완료
3. Edge Function 배포 완료

## 테스트 시나리오

### 1. Token 타입 integration 테스트

#### 준비
```sql
-- integrations 테이블에 Token 타입 데이터 삽입
INSERT INTO integrations (
  advertiser_id,
  platform,
  integration_type,
  legacy_access_token_vault_id,
  status
) VALUES (
  '실제_advertiser_id',
  'Meta Ads',
  'token',
  'vault_secret_id',
  'active'
);
```

#### API 호출
```bash
curl -X POST 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/resolve-access-token' \
  -H 'Authorization: Bearer JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"integration_id": "integration_uuid"}'
```

#### 예상 결과
```json
{
  "access_token": "vault에서_조회한_토큰",
  "token_type": "token",
  "platform": "Meta Ads"
}
```

### 2. OAuth 타입 (유효한 토큰) 테스트

#### 준비
```sql
-- OAuth 타입, 만료 안 된 토큰
INSERT INTO integrations (
  advertiser_id,
  platform,
  integration_type,
  oauth_access_token_vault_id,
  oauth_refresh_token_vault_id,
  oauth_token_expires_at,
  status
) VALUES (
  '실제_advertiser_id',
  'Google Ads',
  'oauth',
  'access_token_vault_id',
  'refresh_token_vault_id',
  NOW() + INTERVAL '1 hour', -- 1시간 후 만료
  'active'
);
```

#### 예상 결과
```json
{
  "access_token": "기존_access_token",
  "token_type": "oauth",
  "expires_at": "2026-01-13T00:00:00Z",
  "refreshed": false,
  "platform": "Google Ads"
}
```

### 3. OAuth 타입 (만료된 토큰, refresh 필요) 테스트

#### 준비
```sql
-- OAuth 타입, 만료된 토큰
UPDATE integrations SET
  oauth_token_expires_at = NOW() - INTERVAL '1 hour' -- 1시간 전 만료
WHERE id = 'integration_uuid';
```

#### 예상 결과
```json
{
  "access_token": "새로_refresh된_토큰",
  "token_type": "oauth",
  "expires_at": "2026-01-13T00:00:00Z",
  "refreshed": true,
  "platform": "Google Ads"
}
```

#### 확인 사항
- integrations 테이블 `oauth_access_token_vault_id` 업데이트 확인
- integrations 테이블 `oauth_token_expires_at` 업데이트 확인
- token_refresh_logs 테이블에 로그 기록 확인

### 4. 에러 케이스 테스트

#### 잘못된 integration_id
```bash
curl -X POST 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/resolve-access-token' \
  -H 'Authorization: Bearer JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"integration_id": "invalid-uuid"}'
```

예상 결과:
```json
{
  "error": "Integration not found or access denied"
}
```

#### 권한 없는 integration 접근
- 다른 브랜드의 integration_id로 호출
- RLS 정책에 의해 차단되어야 함

예상 결과:
```json
{
  "error": "Integration not found or access denied"
}
```

## 로그 확인
```sql
-- token_refresh_logs 조회
SELECT * FROM token_refresh_logs
ORDER BY created_at DESC
LIMIT 10;
```

## 롤백 방법
```sql
-- Edge Function 삭제 (Supabase 대시보드)
-- token_refresh_logs 테이블 삭제
DROP TABLE token_refresh_logs CASCADE;
```
