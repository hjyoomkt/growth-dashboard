# Naver Ads Integration Guide

**플랜 파일**: `C:\Users\REON\.claude\plans\lexical-brewing-boot.md`
**작성일**: 2026-01-24
**작성자**: Claude Code
**버전**: 1.0

---

## 목차
- [1. 개요](#1-개요)
- [2. 시스템 구조](#2-시스템-구조)
- [3. 데이터 수집 방식](#3-데이터-수집-방식)
- [4. 인증 방식](#4-인증-방식)
- [5. DB 스키마](#5-db-스키마)
- [6. Edge Functions](#6-edge-functions)
- [7. 프론트엔드 컴포넌트](#7-프론트엔드-컴포넌트)
- [8. 테스트 가이드](#8-테스트-가이드)
- [9. 트러블슈팅](#9-트러블슈팅)

---

## 1. 개요

### 1.1. 목적
네이버 광고 데이터를 **광고그룹(AdGroup) 레벨**에서 수집하여 `ad_performance` 테이블에 저장합니다.

### 1.2. 메타/구글과의 차이점
| 항목 | 메타 | 구글 | 네이버 |
|------|------|------|--------|
| **수집 레벨** | Ad (광고) | Ad (광고) | AdGroup (광고그룹) |
| **인증 방식** | OAuth Access Token | OAuth Refresh Token | API Key + Secret Key |
| **토큰 저장** | Integration별 (Vault) | Integration별 (암호화) | 조직별 (암호화) |
| **계정 조회 API** | ✅ 있음 | ✅ 있음 | ❌ 없음 (수기 입력) |
| **고유 지표** | 장바구니, 가입 완료 | - | CPC, 평균 순위 |
| **API 호출 패턴** | 단일 호출 | 메트릭/전환 분리 | 순차 호출 (캠페인→그룹→통계) |

### 1.3. 수집 데이터 항목
- **기본 정보**: 날짜, 캠페인명, 광고그룹명
- **기본 성과**: 비용, 노출수, 클릭수
- **전환 성과**: 전환수, 전환 금액
- **네이버 고유**: CPC, 평균 순위
- **미수집**: 장바구니 추가, 가입 완료 (API 미제공)

---

## 2. 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                      Naver Ads Integration                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  Organization 설정  │  ← API Key + Secret Key 저장 (암호화)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  광고주(Advertiser) │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Integration       │  ← Customer ID만 저장
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│           데이터 수집 Flow              │
├─────────────────────────────────────────┤
│ 1. 조직에서 API Key/Secret Key 조회     │
│ 2. Integration에서 Customer ID 조회     │
│ 3. 캠페인 목록 조회 (/ncc/campaigns)    │
│ 4. 광고그룹 목록 조회 (/ncc/adgroups)   │
│ 5. 광고그룹별 통계 조회 (/stats)        │
│ 6. ad_performance 테이블에 저장         │
└─────────────────────────────────────────┘
```

---

## 3. 데이터 수집 방식

### 3.1. API 엔드포인트

#### Base URL
```
https://api.searchad.naver.com
```

#### 1) 캠페인 목록 조회
```http
GET /ncc/campaigns
Headers:
  Content-Type: application/json; charset=UTF-8
  X-Timestamp: {timestamp}
  X-API-KEY: {API_KEY}
  X-Customer: {CUSTOMER_ID}
  X-Signature: {signature}

Response:
[
  {
    nccCampaignId: "cmp-a001-01-000000001234567",
    name: "캠페인 이름"
  }
]
```

#### 2) 광고그룹 목록 조회
```http
GET /ncc/adgroups?nccCampaignId={campaignId}
Headers: (동일)

Response:
[
  {
    nccAdgroupId: "grp-a001-01-000000001234567",
    name: "광고그룹 이름"
  }
]
```

#### 3) 통계 데이터 조회
```http
GET /stats?id={adgroupId}&fields=["impCnt","clkCnt","salesAmt","ctr","cpc","avgRnk","ccnt","convAmt"]&timeRange={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
Headers: (동일)

Response:
{
  data: [
    {
      impCnt: 1000,        // 노출수
      clkCnt: 50,          // 클릭수
      salesAmt: 75000,     // 비용 (원)
      ctr: 5.0,            // 클릭률 (%)
      cpc: 1500,           // 클릭당 비용 (원)
      avgRnk: 2.5,         // 평균 순위
      ccnt: 10,            // 전환수
      convAmt: 500000      // 전환 금액 (원)
    }
  ]
}
```

### 3.2. Signature 생성 (기존 앱스스크립트 방식)

```typescript
function generateSignature(
  timestamp: string,
  method: string,
  endpoint: string,
  secretKey: string
): Promise<string> {
  // 1. 메시지 생성 (쿼리 파라미터 제외)
  const endpointPath = endpoint.split('?')[0]
  const message = `${timestamp}.${method}.${endpointPath}`

  // 2. HMAC-SHA256 서명
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const signatureArray = Array.from(new Uint8Array(signature))

  // 3. Base64 인코딩
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))

  return signatureBase64
}
```

### 3.3. 데이터 매핑

| 네이버 필드 | ad_performance 컬럼 | 타입 | 비고 |
|------------|-------------------|------|------|
| adgroup.nccAdgroupId | ad_id | string | 광고그룹 ID |
| date | date | string | 조회 날짜 (YYYY-MM-DD) |
| campaign.name | campaign_name | string | 캠페인 이름 |
| adgroup.name | ad_group_name | string | 광고그룹 이름 |
| - | ad_name | string | 빈 문자열 (광고그룹 레벨) |
| salesAmt | cost | number | 비용 (원) |
| impCnt | impressions | number | 노출수 |
| clkCnt | clicks | number | 클릭수 |
| ccnt | conversions | number | 전환수 |
| convAmt | conversion_value | number | 전환 금액 (원) |
| cpc | cpc | number | 클릭당 비용 (네이버 고유) |
| avgRnk | avg_rank | number | 평균 순위 (네이버 고유) |
| - | add_to_cart | number | 0 (미제공) |
| - | add_to_cart_value | number | 0 (미제공) |

---

## 4. 인증 방식

### 4.1. 조직 레벨 자격증명

네이버는 **조직 전체**에서 하나의 API Key와 Secret Key를 공유합니다.

#### 저장 위치
- **테이블**: `organizations`
- **컬럼**:
  - `naver_api_key_encrypted`: API Key (pgcrypto 암호화)
  - `naver_secret_key_encrypted`: Secret Key (pgcrypto 암호화)

#### DB 함수
1. **save_organization_naver_credentials**: 저장/삭제
2. **get_organization_naver_preview**: 미리보기 (마스킹)
3. **get_organization_naver_credentials**: 복호화 조회 (Edge Function 전용)

### 4.2. Integration 레벨 정보

각 광고주(Integration)는 **Customer ID만** 저장합니다.

#### 저장 위치
- **테이블**: `integrations`
- **컬럼**:
  - `legacy_account_id`: Customer ID (평문)
  - `account_description`: "Customer ID: {customerId}"

### 4.3. 데이터 수집 시 조회 흐름

```typescript
// 1. Integration에서 Customer ID 조회
const customerId = integration.legacy_account_id

// 2. Integration → Advertiser → Organization 조회
const { data: advertiser } = await supabase
  .from('advertisers')
  .select('organization_id')
  .eq('id', integration.advertiser_id)
  .single()

// 3. 조직에서 API Key/Secret Key 조회
const { data: orgCreds } = await supabase.rpc('get_organization_naver_credentials', {
  org_id: advertiser.organization_id
})

const apiKey = orgCreds[0].api_key
const secretKey = orgCreds[0].secret_key

// 4. 네이버 API 호출
await callNaverAPI('/ncc/campaigns', 'GET', null, apiKey, secretKey, customerId)
```

---

## 5. DB 스키마

### 5.1. organizations 테이블

```sql
-- 038_add_naver_credentials.sql
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS naver_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS naver_secret_key_encrypted TEXT;

COMMENT ON COLUMN organizations.naver_api_key_encrypted IS '네이버 광고 API Key (pgcrypto 암호화)';
COMMENT ON COLUMN organizations.naver_secret_key_encrypted IS '네이버 광고 Secret Key (pgcrypto 암호화)';
```

### 5.2. ad_performance 테이블

```sql
-- 039_add_naver_metrics.sql
ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS cpc NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS avg_rank NUMERIC(10, 2);

COMMENT ON COLUMN ad_performance.cpc IS '클릭당 비용 (네이버 고유 지표)';
COMMENT ON COLUMN ad_performance.avg_rank IS '평균 순위 (네이버 고유 지표)';
```

### 5.3. DB 함수

```sql
-- 040_naver_credentials_functions.sql

-- 1. 저장 함수
CREATE OR REPLACE FUNCTION save_organization_naver_credentials(
  org_id UUID,
  p_api_key TEXT DEFAULT NULL,
  p_secret_key TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  -- API Key 처리
  IF p_api_key = 'EMPTY_STRING' THEN
    UPDATE organizations SET naver_api_key_encrypted = NULL WHERE id = org_id;
  ELSIF p_api_key IS NOT NULL THEN
    UPDATE organizations
    SET naver_api_key_encrypted = pgp_sym_encrypt(p_api_key, encryption_key)
    WHERE id = org_id;
  END IF;

  -- Secret Key 처리
  IF p_secret_key = 'EMPTY_STRING' THEN
    UPDATE organizations SET naver_secret_key_encrypted = NULL WHERE id = org_id;
  ELSIF p_secret_key IS NOT NULL THEN
    UPDATE organizations
    SET naver_secret_key_encrypted = pgp_sym_encrypt(p_secret_key, encryption_key)
    WHERE id = org_id;
  END IF;
END;
$$;

-- 2. 미리보기 함수
CREATE OR REPLACE FUNCTION get_organization_naver_preview(org_id UUID)
RETURNS TABLE (
  api_key_preview TEXT,
  secret_key_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- (마스킹 처리 로직)
$$;

-- 3. 복호화 조회 함수
CREATE OR REPLACE FUNCTION get_organization_naver_credentials(org_id UUID)
RETURNS TABLE (
  api_key TEXT,
  secret_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- (복호화 로직)
$$;
```

---

## 6. Edge Functions

### 6.1. save-organization-naver

**경로**: `supabase/functions/save-organization-naver/index.ts`
**목적**: 조직 네이버 자격증명 저장

#### 주요 로직
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // 1. 사용자 인증 (user.id로 조회)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // 2. 권한 확인 (master 또는 agency_admin)
  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // 3. Service Role로 DB 함수 호출
  await serviceRoleSupabase.rpc('save_organization_naver_credentials', {
    org_id: organization_id,
    p_api_key: api_key || null,
    p_secret_key: secret_key || null,
  })
})
```

#### 배포
```bash
npx supabase functions deploy save-organization-naver --project-ref qdzdyoqtzkfpcogecyar
```

### 6.2. collect-ad-data (네이버 처리 추가)

**경로**: `supabase/functions/collect-ad-data/index.ts`

#### validateToken (네이버)
```typescript
if (platform === 'Naver Ads') {
  // Naver는 OAuth가 아니므로 Customer ID 존재 여부만 확인
  const customerId = integration.legacy_account_id
  if (!customerId) {
    return { valid: false, error: 'Missing Naver Customer ID' }
  }
}
```

#### resolveAccessToken (네이버)
```typescript
if (integration.platform === 'Naver Ads') {
  // 조직 자격증명 존재 여부만 확인
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('organization_id')
    .eq('id', integration.advertiser_id)
    .single()

  const { data: orgCreds } = await supabase.rpc('get_organization_naver_credentials', {
    org_id: advertiser.organization_id
  })

  if (!orgCreds || !orgCreds[0].api_key || !orgCreds[0].secret_key) {
    return null
  }

  return 'naver-org-credentials' // 더미 값 (collector에서 직접 조회)
}
```

### 6.3. _shared/collectors/naver.ts

**경로**: `supabase/functions/_shared/collectors/naver.ts`
**목적**: 네이버 광고 데이터 수집 (기존 앱스스크립트 방식 재구현)

#### 함수 시그니처
```typescript
export async function collectNaverAds(
  supabase: any,
  integration: any,
  accessToken: string, // 사용하지 않음 (조직 설정에서 직접 조회)
  startDate: string,
  endDate: string
)
```

#### 수집 로직
```typescript
// 1. 자격증명 조회
const customerId = integration.legacy_account_id
const { data: advertiser } = await supabase.from('advertisers').select('organization_id')...
const { data: orgCreds } = await supabase.rpc('get_organization_naver_credentials', {...})
const apiKey = orgCreds[0].api_key
const secretKey = orgCreds[0].secret_key

// 2. 캠페인 목록 조회
const campaigns = await callNaverAPI('/ncc/campaigns', 'GET', null, apiKey, secretKey, customerId)

// 3. 각 캠페인의 광고그룹 조회
for (const campaign of campaigns) {
  const adgroups = await callNaverAPI(`/ncc/adgroups?nccCampaignId=${campaign.nccCampaignId}`, ...)

  // 4. 각 광고그룹의 통계 조회
  for (const adgroup of adgroups) {
    const fields = '["impCnt","clkCnt","salesAmt","ctr","cpc","avgRnk","ccnt","convAmt"]'
    const timeRange = JSON.stringify({ since: startDate, until: endDate })
    const stats = await callNaverAPI(`/stats?id=${adgroup.nccAdgroupId}&fields=${fields}&timeRange=${timeRange}`, ...)

    // 5. DB 저장
    if (stats?.data?.length > 0) {
      for (const s of stats.data) {
        if ((s.impCnt || 0) > 0 || (s.clkCnt || 0) > 0 || (s.ccnt || 0) > 0) {
          await supabase.from('ad_performance').upsert({
            advertiser_id: integration.advertiser_id,
            source: 'Naver',
            ad_id: adgroup.nccAdgroupId, // ⚠️ campaign_ad_id 아님!
            date: startDate,
            campaign_name: campaign.name,
            ad_group_name: adgroup.name,
            ad_name: '',
            cost: parseFloat(s.salesAmt) || 0,
            impressions: parseInt(s.impCnt) || 0,
            clicks: parseInt(s.clkCnt) || 0,
            conversions: parseFloat(s.ccnt) || 0,
            conversion_value: parseFloat(s.convAmt) || 0,
            cpc: parseFloat(s.cpc) || null,
            avg_rank: parseFloat(s.avgRnk) || null,
            add_to_cart: 0,
            add_to_cart_value: 0,
            collected_at: new Date().toISOString(),
            issue_status: (!campaign.name || !adgroup.name) ? '캠페인명/광고그룹명 누락' : '정상'
          }, {
            onConflict: 'advertiser_id,source,ad_id,date' // ⚠️ campaign_ad_id 아님!
          })
        }
      }
    }
  }
}
```

---

## 7. 프론트엔드 컴포넌트

### 7.1. 조직 설정 (/superadmin/default)

**파일**: `src/views/superadmin/default/index.jsx`

#### 추가 State
```javascript
const [naverSettings, setNaverSettings] = useState({
  apiKey: '',
  secretKey: '',
});
const [isSavingNaver, setIsSavingNaver] = useState(false);
const [hasExistingNaver, setHasExistingNaver] = useState(false);
const [showNaverApiKey, setShowNaverApiKey] = useState(false);
const [showNaverSecretKey, setShowNaverSecretKey] = useState(false);
```

#### 주요 함수
1. **fetchNaverSettings**: RPC `get_organization_naver_preview` 호출
2. **handleSaveNaverSettings**: Edge Function `save-organization-naver` 호출
3. **handleNaverInputFocus**: 마스킹 해제

### 7.2. PlatformLoginModal

**파일**: `src/views/superadmin/api-management/components/PlatformLoginModal.jsx`

```javascript
{
  name: 'Naver Ads',
  icon: SiNaver,
  color: 'green.500',
  enabled: true, // ✅ false → true로 변경
}
```

### 7.3. NaverAccountModal (신규)

**파일**: `src/views/superadmin/api-management/components/NaverAccountModal.jsx`

#### 기능
1. 조직 API Key/Secret Key 미리보기 표시 (마스킹)
2. Customer ID 텍스트 입력
3. "다음" 버튼 → Integration 생성

#### 핵심 코드
```javascript
// 조직 자격증명 조회
useEffect(() => {
  if (isOpen && organizationId) {
    const { data } = await supabase
      .rpc('get_organization_naver_preview', { org_id: organizationId });

    setOrgApiKeyPreview(data[0].api_key_preview);
    setOrgSecretKeyPreview(data[0].secret_key_preview);
  }
}, [isOpen, organizationId]);

// Customer ID 입력 후 다음
const handleNext = () => {
  onNext({ customerId: customerId.trim() });
};
```

### 7.4. PlatformLoginFlow

**파일**: `src/views/superadmin/api-management/components/PlatformLoginFlow.jsx`

#### 네이버 처리 추가
```javascript
// Step 2: 브랜드 선택 후
const handleBrandSelect = async (brandId) => {
  setSelectedBrandId(brandId);

  if (selectedPlatform === 'Naver Ads') {
    setCurrentStep('naverAccount'); // ✅ 네이버는 바로 Customer ID 입력
  }
  // ...
};

// Step 3: Naver 계정 정보 입력
const handleNaverAccountSelect = ({ customerId }) => {
  onComplete({
    platform: selectedPlatform,
    brandId: selectedBrandId,
    customerId: customerId,
  });

  resetFlow();
  onClose();
};

// Modal 렌더링
<NaverAccountModal
  isOpen={isOpen && currentStep === 'naverAccount'}
  onClose={handleClose}
  onNext={handleNaverAccountSelect}
  brandId={selectedBrandId}
  organizationId={organizationId}
/>
```

### 7.5. APITokenTable

**파일**: `src/views/superadmin/api-management/components/APITokenTable.js`

#### Naver Ads 처리 추가
```javascript
const handlePlatformLoginComplete = async (data) => {
  if (data.platform === 'Naver Ads') {
    try {
      // 1. 조직 자격증명 확인 (존재 여부만 체크)
      const { data: naverCredentials } = await supabase
        .rpc('get_organization_naver_credentials', { org_id: organizationId });

      if (!naverCredentials?.[0]?.api_key || !naverCredentials?.[0]?.secret_key) {
        throw new Error('조직 설정에서 네이버 API Key와 Secret Key를 먼저 설정해주세요.');
      }

      // 2. Integration 생성 (Vault 사용 안 함)
      const { data: newIntegration } = await supabase
        .from('integrations')
        .insert({
          advertiser_id: data.brandId,
          platform: 'Naver Ads',
          integration_type: 'token',
          legacy_account_id: data.customerId,
          account_description: `Customer ID: ${data.customerId}`,
        })
        .select()
        .single();

      // 3. 토큰 목록 새로고침
      fetchTokens();

      // 4. 초기 수집 모달 열기
      setSavedIntegrationId(newIntegration.id);
      onInitialCollectionModalOpen();
    } catch (error) {
      toast({ title: 'Naver 토큰 저장 실패', description: error.message });
    }
    return;
  }
  // ...
};
```

---

## 8. 테스트 가이드

### 8.1. 조직 설정 테스트

1. https://www.zestdot.com/superadmin/default 접속
2. 네이버 API 설정 섹션 찾기
3. API Key, Secret Key 입력 후 저장
4. 페이지 새로고침
5. 마스킹된 값 표시 확인 (앞 4자리 + ••••••••  + 뒤 4자리)

#### 검증 SQL
```sql
SELECT
  id,
  name,
  naver_api_key_encrypted IS NOT NULL as has_api_key,
  naver_secret_key_encrypted IS NOT NULL as has_secret_key
FROM organizations
WHERE id = 'your-organization-id';
```

### 8.2. 광고주 추가 테스트

1. https://www.zestdot.com/superadmin/api-management 접속
2. "매체 로그인" 버튼 클릭
3. "Naver Ads" 선택
4. 브랜드 선택
5. Customer ID 입력 (예: 2501111)
6. "다음" 클릭
7. Integration 생성 확인

#### 검증 SQL
```sql
SELECT
  i.id,
  i.platform,
  i.legacy_account_id as customer_id,
  i.account_description,
  a.name as advertiser_name
FROM integrations i
JOIN advertisers a ON a.id = i.advertiser_id
WHERE i.platform = 'Naver Ads'
  AND i.deleted_at IS NULL;
```

### 8.3. 데이터 수집 테스트

1. APITokenTable에서 네이버 Integration 찾기
2. "초기 데이터 수집" 버튼 클릭
3. 날짜 범위 선택 (예: 2026-01-22 ~ 2026-01-22)
4. "수집 시작" 클릭
5. Collection Jobs 테이블에서 진행 상황 확인

#### 검증 SQL
```sql
-- 수집 작업 확인
SELECT
  id,
  integration_id,
  status,
  total_chunks,
  completed_chunks,
  failed_chunks,
  started_at,
  completed_at,
  error_message
FROM collection_jobs
WHERE integration_id = 'your-integration-id'
ORDER BY created_at DESC
LIMIT 5;

-- 수집 데이터 확인
SELECT
  date,
  campaign_name,
  ad_group_name,
  impressions,
  clicks,
  cost,
  cpc,
  avg_rank,
  conversions,
  conversion_value,
  collected_at,
  issue_status
FROM ad_performance
WHERE source = 'Naver'
  AND advertiser_id = 'your-advertiser-id'
ORDER BY date DESC
LIMIT 10;
```

### 8.4. Edge Function 로그 확인

https://supabase.com/dashboard/project/qdzdyoqtzkfpcogecyar/logs/edge-functions

**확인 항목**:
- `=== Naver Ads Collection Started ===`
- `Credentials loaded: Customer ID = xxx`
- `Total campaigns: N`
- `[1/N] Campaign: xxx`
- `└ Adgroups: N`
- `=== Naver Ads Collection Completed ===`
- `Total records saved: N`

---

## 9. 트러블슈팅

### 9.1. 네이버 API 에러

#### 문제: "잘못된 timeRange 형식입니다" (code: 11001)
**원인**: timeRange 파라미터에 더미 값이 전달됨
**해결**: `collectNaverAds` 함수 시그니처에 `accessToken` 파라미터 추가
```typescript
// ❌ 잘못된 방식
export async function collectNaverAds(supabase, integration, startDate, endDate)

// ✅ 올바른 방식
export async function collectNaverAds(supabase, integration, accessToken, startDate, endDate)
```

#### 문제: "Could not find the 'campaign_ad_id' column" (PGRST204)
**원인**: 테이블은 `ad_id` 컬럼을 사용하는데 `campaign_ad_id` 사용
**해결**: `ad_id`로 변경
```typescript
// ❌ 잘못된 방식
const rowData = { campaign_ad_id: adgroup.nccAdgroupId }
await supabase.from('ad_performance').upsert(rowData, {
  onConflict: 'advertiser_id,source,campaign_ad_id,date'
})

// ✅ 올바른 방식
const rowData = { ad_id: adgroup.nccAdgroupId }
await supabase.from('ad_performance').upsert(rowData, {
  onConflict: 'advertiser_id,source,ad_id,date'
})
```

#### 문제: "Naver API error [400]"
**원인**: Signature 생성 방식이 잘못됨
**해결**: 기존 앱스스크립트 방식 사용
- Message: `timestamp + "." + method + "." + endpoint(쿼리 제외)`
- Encoding: Base64 (Hex 아님)
- Headers: `X-API-KEY`, `X-Customer`, `X-Signature`

### 9.2. 인증 에러

#### 문제: "Failed to retrieve access token"
**원인**: `resolveAccessToken`이 네이버를 처리하지 못함
**해결**: 네이버 처리 로직 추가
```typescript
if (integration.platform === 'Naver Ads') {
  // 조직 자격증명 확인
  const { data: orgCreds } = await supabase.rpc('get_organization_naver_credentials', {...})
  if (!orgCreds?.[0]?.api_key || !orgCreds?.[0]?.secret_key) {
    return null
  }
  return 'naver-org-credentials' // 더미 값
}
```

#### 문제: "AuthSessionMissingError"
**원인**: Edge Function에서 `user.email`로 조회
**해결**: `user.id`로 변경
```typescript
// ❌ 잘못된 방식
.eq('email', user.email)

// ✅ 올바른 방식
.eq('id', user.id)
```

### 9.3. 프론트엔드 에러

#### 문제: "Failed to execute 'getComputedStyle'"
**원인**: Chakra UI Modal의 일시적인 DOM 에러
**해결**: 브라우저 완전 새로고침 (Ctrl+Shift+R)

#### 문제: "Vault 에러" (Could not find the table 'vault.secrets')
**원인**: 네이버는 Vault를 사용하지 않는데 Vault에 저장 시도
**해결**: APITokenTable에서 Vault 저장 단계 제거
```javascript
// ❌ 잘못된 방식
const { data: vaultData } = await supabase
  .from('vault.secrets')
  .insert({ secret: secret_key })

// ✅ 올바른 방식 (네이버는 Vault 사용 안 함)
// Integration만 생성, Vault 저장 없음
```

### 9.4. 데이터 수집 에러

#### 문제: "Total records saved: 0"
**가능한 원인**:
1. 조회 기간에 데이터가 없음
2. API 호출 실패 (로그 확인)
3. DB 저장 실패 (로그 확인)

**확인 방법**:
```typescript
// 로그에서 확인
// ✅ 정상: "└ Adgroups: 3" + 데이터 저장 로그
// ❌ 문제: "└ No adgroups found" 또는 에러 로그
```

---

## 10. 핵심 파일 경로

### DB 마이그레이션
- `supabase/migrations/038_add_naver_credentials.sql`
- `supabase/migrations/039_add_naver_metrics.sql`
- `supabase/migrations/040_naver_credentials_functions.sql`

### Edge Functions
- `supabase/functions/save-organization-naver/index.ts`
- `supabase/functions/collect-ad-data/index.ts`
- `supabase/functions/_shared/collectors/naver.ts`

### 프론트엔드
- `src/views/superadmin/default/index.jsx`
- `src/views/superadmin/api-management/components/PlatformLoginModal.jsx`
- `src/views/superadmin/api-management/components/NaverAccountModal.jsx`
- `src/views/superadmin/api-management/components/PlatformLoginFlow.jsx`
- `src/views/superadmin/api-management/components/APITokenTable.js`

---

## 11. 참고 자료

- **플랜 파일**: `C:\Users\REON\.claude\plans\lexical-brewing-boot.md`
- **기존 앱스스크립트**: `c:\Users\REON\Desktop\새 폴더\개발\naver_기존.js`
- **메타 통합 가이드**: `docs/META_ADS_INTEGRATION.md`
- **네이버 검색광고 API 문서**: https://naver.github.io/searchad-apidoc/

---

## 12. 버전 히스토리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-01-24 | 초기 작성 |

---

**작성 완료**: 2026-01-24
**작성자**: Claude Code
**문서 상태**: ✅ 완료
