# API 관리 시스템

광고 플랫폼 API 토큰을 관리하고 데이터 수집 상태를 모니터링하는 시스템입니다.

## 주요 기능

### 1. API 토큰 관리
- 광고 플랫폼별 API 토큰 등록 및 관리
- 지원 플랫폼: Google Ads, Meta Ads, Naver Ads, Kakao Ads
- 암호화된 토큰 저장 (Supabase 연동 예정)

### 2. 데이터 수집 상태 모니터링
**오전 10시 기준 전일자 데이터 체크**

- **체크 시간**: 매일 오전 10시 (KST)
- **체크 대상**: 전일(D-1) 날짜의 광고 데이터
- **판별 로직**:
  - ✅ **success**: 전일자 데이터가 정상적으로 수집됨
  - ❌ **error**: 오전 10시 이후인데 전일자 데이터가 없음
  - ⏳ **pending**: 오전 10시 이전이거나 데이터 수집 대기 중

### 3. 데이터 연동
- 선택한 기간의 광고 데이터를 수동으로 연동
- 기간 옵션: 어제, 지난주(7일), 지난달(30일), 전체, 사용자 지정
- 처리 방식: 기존 데이터 건너뛰기 / 전체 업데이트

## 파일 구조

```
src/views/superadmin/api-management/
├── index.jsx                     # 메인 페이지
├── components/
│   └── APITokenTable.js          # API 토큰 테이블 컴포넌트
└── README.md                     # 현재 문서

src/utils/
└── dataCollectionChecker.js      # 데이터 수집 상태 체크 유틸리티
```

## Supabase 연동 계획

### 데이터베이스 스키마

#### 1. `api_tokens` 테이블
```sql
CREATE TABLE api_tokens (
  id BIGSERIAL PRIMARY KEY,
  advertiser_id TEXT NOT NULL,
  advertiser TEXT NOT NULL,
  account_description TEXT,
  platform TEXT NOT NULL,

  -- Google Ads 필드
  customer_id TEXT,
  manager_account_id TEXT,
  developer_token TEXT,
  target_conversion_action_id TEXT[],
  refresh_token TEXT,
  client_id TEXT,
  client_secret TEXT,

  -- Naver Ads 필드
  secret_key TEXT,

  -- 공통 필드
  account_id TEXT,
  api_token TEXT,

  status TEXT DEFAULT 'active',
  data_collection_status TEXT DEFAULT 'pending',
  last_check_time TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `ad_performance` 테이블
```sql
CREATE TABLE ad_performance (
  id BIGSERIAL PRIMARY KEY,
  advertiser_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  cost DECIMAL,
  conversions INTEGER,
  -- ... 기타 광고 지표
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advertiser_id, platform, date)
);
```

### Edge Function 구현

#### 파일: `supabase/functions/check-yesterday-data/index.ts`

매일 오전 10시에 실행되는 Edge Function입니다.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000 // KST = UTC+9
  const kstNow = new Date(now.getTime() + kstOffset)
  const isAfter10AM = kstNow.getHours() >= 10

  if (!isAfter10AM) {
    return new Response(JSON.stringify({
      message: 'Not yet 10 AM KST',
      currentTime: kstNow.toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 전일 날짜 계산 (KST 기준)
  const yesterday = new Date(kstNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // 모든 활성 API 토큰 조회
  const { data: tokens, error: tokensError } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('status', 'active')

  if (tokensError) {
    return new Response(JSON.stringify({ error: tokensError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results = []

  // 각 토큰별로 전일자 데이터 체크
  for (const token of tokens) {
    const { data: adData, error: adError } = await supabase
      .from('ad_performance')
      .select('id')
      .eq('advertiser_id', token.advertiser_id)
      .eq('platform', token.platform)
      .eq('date', yesterdayStr)
      .limit(1)

    if (adError) {
      console.error(`Error checking data for ${token.advertiser}:`, adError)
      continue
    }

    const status = adData && adData.length > 0 ? 'success' : 'error'

    // 상태 업데이트
    const { error: updateError } = await supabase
      .from('api_tokens')
      .update({
        data_collection_status: status,
        last_check_time: now.toISOString()
      })
      .eq('id', token.id)

    if (updateError) {
      console.error(`Error updating status for ${token.advertiser}:`, updateError)
    }

    results.push({
      advertiser: token.advertiser,
      platform: token.platform,
      status,
      yesterdayDate: yesterdayStr
    })
  }

  return new Response(JSON.stringify({
    success: true,
    checkTime: kstNow.toISOString(),
    yesterdayDate: yesterdayStr,
    results
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Cron Job 설정

#### 방법 1: GitHub Actions

파일: `.github/workflows/daily-data-check.yml`

```yaml
name: Daily Data Check

on:
  schedule:
    # 매일 오전 10시 (KST) = 오전 1시 (UTC)
    - cron: '0 1 * * *'
  workflow_dispatch: # 수동 실행 가능

jobs:
  check-data:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            https://your-project.supabase.co/functions/v1/check-yesterday-data \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

#### 방법 2: Vercel Cron

파일: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/check-yesterday-data",
      "schedule": "0 1 * * *"
    }
  ]
}
```

#### 방법 3: Supabase pg_cron (가장 권장)

```sql
-- pg_cron 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매일 오전 10시(KST) = 오전 1시(UTC)에 실행
SELECT cron.schedule(
  'check-yesterday-data',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/check-yesterday-data',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

## 프론트엔드 연동

### 현재 상태 (Mock)
- `src/views/superadmin/api-management/components/APITokenTable.js`의 173-206번째 줄에 주석 처리된 코드가 있습니다.
- Mock 데이터를 사용하여 UI를 표시합니다.

### Supabase 연동 후
1. 주석 처리된 `useEffect` 코드 활성화
2. Supabase 클라이언트 초기화
3. 실시간 구독으로 `api_tokens` 테이블 변경 감지
4. 오전 10시 이후 자동으로 UI 업데이트

## 개발 로드맵

- [ ] Supabase 프로젝트 설정
- [ ] 데이터베이스 스키마 생성
- [ ] Edge Function 배포
- [ ] Cron Job 설정 (pg_cron 권장)
- [ ] 프론트엔드 Supabase 클라이언트 연동
- [ ] 실제 광고 API 연동 (Google Ads, Meta Ads, Naver Ads)
- [ ] 데이터 수집 로직 구현
- [ ] 알림 시스템 추가 (데이터 수집 실패 시 알림)

## 문의

개발 관련 문의사항은 이슈로 등록해주세요.
