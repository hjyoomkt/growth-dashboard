# Supabase 연동 가이드 (프로젝트 파일 기반)

> ⚠️ **중요**: 이 가이드는 Growth Dashboard 프로젝트 파일을 전체 분석하여 작성되었습니다.

---

## 📅 작업 진행 로그

### 2025-12-31 (화)

#### Phase 1: 데이터베이스 스키마 구축
- ✅ 기존 스키마 위험 요소 분석 완료
- ✅ 개선된 스키마 설계 완료 (CHECK 제거, JSONB 추가, Soft delete)
- ✅ database/schema.sql 생성 및 Supabase 실행 완료
- ✅ database/indexes.sql 생성 및 실행 완료
- ✅ database/sample_data.sql 생성 및 실행 완료 (1행 테스트 데이터)

#### Phase 2: 인증 시스템 연동
- ✅ supabaseService.js에 getUserMetadata, getAvailableAdvertisers 추가
- ✅ AuthContext.js Supabase 연동 완료 (Mock 주석 처리)
- ✅ database/create_test_user.js 생성 (Service Role Key 사용)
- ✅ 테스트 사용자 생성 완료 (test@example.com / Test1234! / master)
- ✅ SignIn 페이지 Supabase 연동 완료 (이메일/비밀번호, Toast 알림, Enter 키)
- ✅ NavbarLinksAdmin.js 사용자 정보 표시 (이메일, role)
- ✅ 로그인 테스트 성공 (test@example.com / master 권한 확인)

#### Phase 3: 메인 대시보드 KPI 연동
- ✅ supabaseService.js에 getKPIData() 함수 추가 (광고주/날짜 필터, CVR/ROAS 계산)
- ✅ views/admin/default/index.jsx KPI 카드 6개 연동
  - 총지출, 노출수, 클릭수, 전환수, CVR, ROAS
  - 실시간 데이터 조회 (useEffect)
  - 날짜 범위: 최근 30일 (임시)
- ✅ 데이터 확인 스크립트 생성 (check_data.js)
- ✅ KPI 데이터 표시 확인 (₩50,000, 10,000노출, 500클릭, 10전환, 2.00% CVR, 10.00 ROAS)

#### Phase 4: 차트 컴포넌트 연동 ✅ 완료
- ✅ supabaseService.js에 getDailyAdCost() 함수 추가 (날짜별 그룹화)
- ✅ DailyAdCost.js 연동 (일별 광고비 라인 차트)
  - Mock 랜덤 데이터 주석 처리
  - Supabase 실제 데이터 사용
  - useEffect로 실시간 조회
  - 총 광고비 계산 및 표시 추가
  - 차트 key prop 업데이트 (재렌더링 이슈 해결)
- ✅ supabaseService.js에 getMediaAdCost() 함수 추가 (매체별 그룹화)
- ✅ MediaAdCost.js 연동 (매체별 광고비 바 차트)
  - Mock 랜덤 데이터 주석 처리
  - Supabase 데이터 우선 사용
  - 차트 key prop 업데이트
- ✅ supabaseService.js에 getDailyRevenue() 함수 추가 (일별 conversion_value)
- ✅ TotalSpent.js 연동 (총매출 라인 차트)
  - Mock 랜덤 데이터 주석 처리
  - Supabase 실제 데이터 사용
  - 총 매출 계산 및 표시 추가
  - 차트 key prop 업데이트 (재렌더링 이슈 해결)
- ✅ supabaseService.js에 getMediaRevenue() 함수 추가 (매체별 conversion_value)
- ✅ WeeklyRevenue.js 연동 (매체별 매출 도넛 차트)
  - Mock 데이터 주석 처리
  - Supabase 실제 데이터 사용
  - 차트 key prop 업데이트
- ✅ supabaseService.js에 getDailyROASAndCost() 함수 추가 (일별 ROAS 계산)
- ✅ ROASAdCost.js 연동 (ROAS & 광고비 복합 차트)
  - Mock 랜덤 데이터 주석 처리
  - Supabase 실제 데이터 사용
  - ROAS를 퍼센티지로 변환 (10.0 → 1000%)
  - Y축 및 툴팁 포맷터 업데이트 (% 단위)
  - 차트 key prop 업데이트
- ✅ supabaseService.js에 getWeeklyConversions() 함수 추가 (요일별 전환수 집계)
- ✅ WeeklyConversions.js 연동 (요일별 전환수 바 차트)
  - Mock 랜덤 데이터 주석 처리
  - Supabase 실제 데이터 사용 (월~일 순서)
  - 차트 key prop 업데이트
- ✅ DateRangeContext 기본값 변경 (이번 주 → 최근 30일)
- ✅ 차트 재렌더링 이슈 해결 (key prop에 데이터 길이 포함)

#### Phase 5: 크리에이티브 컴포넌트 연동 ✅ 완료 (2025-12-31)

##### ✅ 완료된 작업
- ✅ database/schema.sql 스키마 분석 완료
  - ad_creatives 테이블: `ad_id`, `ad_name`, `url`, `creative_type` 컬럼 사용
  - ad_performance 테이블: `campaign_ad_id` 발견 → `ad_id`로 변경 필요 (컬럼명 통일)
  - **설계 문제**: 동일한 Meta ad_id 데이터를 두 테이블에서 다른 컬럼명으로 수집 (일관성 부족)

- ✅ database/rename_campaign_ad_id_to_ad_id.sql 생성 및 실행 완료
  - `ALTER TABLE ad_performance RENAME COLUMN campaign_ad_id TO ad_id;`
  - UNIQUE 제약조건 재생성 (`ad_performance_advertiser_id_source_ad_id_date_key`)
  - **실행 결과**: "Success. No rows returned" (Supabase SQL Editor)
  - **데이터베이스 스키마 변경 완료**: ad_performance 테이블에서 이제 `ad_id` 컬럼 사용

- ✅ supabaseService.js에 getBestCreatives() 함수 추가 (부분 수정)
  - ad_performance.ad_id + ad_creatives.ad_id JOIN 로직 구현
  - creative_type 필드로 이미지/영상 구분 ('video' → isVideo: true)
  - 광고비 순 내림차순 정렬, 상위 6개 제한
  - **⚠️ 코드 미완성**: 아직 `campaign_ad_id` 참조 남아있음 (아래 참조)

- ✅ supabaseService.js에 getAllCreatives() 함수 추가 (부분 수정)
  - ad_performance.ad_id + ad_creatives.ad_id JOIN 로직 구현
  - campaign_name 필드 포함 (캠페인 필터용)
  - **⚠️ 코드 미완성**: 아직 `campaign_ad_id` 참조 남아있음 (아래 참조)

- ✅ BestCreatives.js 연동 완료
  - Mock 데이터 주석 처리
  - Supabase getBestCreatives() 호출
  - **⚠️ UI 문제 발생**: 이미지 안 나오고 UI 깨짐 (원인 미조사)

- ✅ insert_sample_creatives.js 생성
  - ad_creatives: 6개 샘플 크리에이티브 (ad_id, url, creative_type 사용)
  - ad_performance: 180개 성과 데이터 (30일 × 6개 광고)
  - **⚠️ 코드 미완성**: 아직 `campaign_ad_id` 사용 중 (아래 참조)

##### 🔴 중요: 스키마 변경 후 코드 미동기화 문제

**데이터베이스 스키마는 이미 변경 완료**했지만, **코드가 아직 업데이트되지 않았습니다**.

다음 Claude 세션에서 **즉시** 다음 파일을 수정해야 합니다:

##### 🚨 필수 수정 파일 1: src/services/supabaseService.js

**Line 584** (getBestCreatives 함수):
```javascript
// ❌ 현재 (잘못됨):
.select('campaign_ad_id, source, cost, impressions, clicks, conversions, conversion_value')

// ✅ 수정 필요:
.select('ad_id, source, cost, impressions, clicks, conversions, conversion_value')
```

**Lines 602-615** (getBestCreatives 함수):
```javascript
// ❌ 현재 (잘못됨):
const aggregatedPerformance = (performanceData || []).reduce((acc, row) => {
  const adId = row.campaign_ad_id;  // ← 여기
  if (!acc[adId]) {
    acc[adId] = {
      campaign_ad_id: adId,  // ← 여기
      source: row.source,
      cost: 0,
      // ...

// ✅ 수정 필요:
const aggregatedPerformance = (performanceData || []).reduce((acc, row) => {
  const adId = row.ad_id;  // ← 변경
  if (!acc[adId]) {
    acc[adId] = {
      ad_id: adId,  // ← 변경
      source: row.source,
      cost: 0,
      // ...
```

**Line 687** (getAllCreatives 함수):
```javascript
// ❌ 현재:
.select('campaign_ad_id, source, campaign_name, ad_group_name, ad_name, cost, impressions, clicks, conversions, conversion_value')

// ✅ 수정 필요:
.select('ad_id, source, campaign_name, ad_group_name, ad_name, cost, impressions, clicks, conversions, conversion_value')
```

**Lines 705-718** (getAllCreatives 함수):
```javascript
// ❌ 현재:
const aggregatedPerformance = (performanceData || []).reduce((acc, row) => {
  const adId = row.campaign_ad_id;  // ← 여기
  if (!acc[adId]) {
    acc[adId] = {
      campaign_ad_id: adId,  // ← 여기
      // ...

// ✅ 수정 필요:
const aggregatedPerformance = (performanceData || []).reduce((acc, row) => {
  const adId = row.ad_id;  // ← 변경
  if (!acc[adId]) {
    acc[adId] = {
      ad_id: adId,  // ← 변경
      // ...
```

##### 🚨 필수 수정 파일 2: insert_sample_creatives.js

**Line 123** (samplePerformance 배열):
```javascript
// ❌ 현재:
samplePerformance.push({
  advertiser_id: advertiserId,
  campaign_name: `캠페인 ${Math.floor(i / 2) + 1}`,
  ad_group_name: `광고세트 ${i + 1}`,
  ad_name: sampleCreatives[i].ad_name,
  campaign_ad_id: adId,  // ← 여기
  source: source,
  // ...

// ✅ 수정 필요:
samplePerformance.push({
  advertiser_id: advertiserId,
  campaign_name: `캠페인 ${Math.floor(i / 2) + 1}`,
  ad_group_name: `광고세트 ${i + 1}`,
  ad_name: sampleCreatives[i].ad_name,
  ad_id: adId,  // ← 변경
  source: source,
  // ...
```

**Line 169** (ad_performance 조회):
```javascript
// ❌ 현재:
.select('campaign_ad_id, source, cost, impressions, clicks, conversions, conversion_value')

// ✅ 수정 필요:
.select('ad_id, source, cost, impressions, clicks, conversions, conversion_value')
```

**Line 177** (집계 로직):
```javascript
// ❌ 현재:
const aggregated = (performance || []).reduce((acc, row) => {
  const adId = row.campaign_ad_id;  // ← 여기
  if (!acc[adId]) {
    acc[adId] = {
      campaign_ad_id: adId,  // ← 여기
      // ...

// ✅ 수정 필요:
const aggregated = (performance || []).reduce((acc, row) => {
  const adId = row.ad_id;  // ← 변경
  if (!acc[adId]) {
    acc[adId] = {
      ad_id: adId,  // ← 변경
      // ...
```

##### 🚨 필수 수정 파일 3: test_creatives.js (선택, 테스트용)

**Line 27** (ad_creatives 테이블 확인):
```javascript
// ❌ 현재:
광고ID: c.campaign_ad_id?.substring(0, 15) + '...',

// ✅ 수정 필요:
광고ID: c.ad_id?.substring(0, 15) + '...',
```

**Line 38** (ad_performance 조회):
```javascript
// ❌ 현재:
.select('campaign_ad_id, source, cost')

// ✅ 수정 필요:
.select('ad_id, source, cost')
```

**Lines 42, 50, 62, 68, 101, 108** (모든 campaign_ad_id 참조):
```javascript
// ❌ 현재:
.not('campaign_ad_id', 'is', null)
광고ID: p.campaign_ad_id?.substring(0, 15) + '...',
.select('campaign_ad_id, source, cost, ...')
const adId = row.campaign_ad_id;
.in('campaign_ad_id', adIds)
const perf = aggregated[creative.campaign_ad_id] || {};

// ✅ 수정 필요:
.not('ad_id', 'is', null)
광고ID: p.ad_id?.substring(0, 15) + '...',
.select('ad_id, source, cost, ...')
const adId = row.ad_id;
.in('ad_id', adIds)
const perf = aggregated[creative.ad_id] || {};
```

##### ✅ 코드 수정 완료 및 데이터 검증 완료

**모든 코드 업데이트 완료** (2025-12-31):
1. ✅ src/services/supabaseService.js 수정 완료
   - getBestCreatives(): `campaign_ad_id` → `ad_id` 변경 완료
   - getAllCreatives(): `campaign_ad_id` → `ad_id` 변경 완료

2. ✅ insert_sample_creatives.js 수정 완료
   - samplePerformance 배열: `ad_id` 사용
   - 조회 쿼리: `ad_id` 사용
   - UPSERT 로직 추가 (중복 방지)

3. ✅ test_creatives.js 수정 완료
   - 모든 `campaign_ad_id` 참조를 `ad_id`로 변경

4. ✅ 샘플 데이터 재삽입 완료
   - 6개 크리에이티브 UPSERT 성공
   - 180개 성과 데이터 (30일 × 6개 광고) UPSERT 성공
   - 광고비 순 정렬 확인: 메타 > 메타 > 네이버 > 구글 > 카카오 > 메타

5. ✅ 대시보드 서버 실행 성공
   - http://localhost:3000 정상 컴파일
   - webpack 빌드 성공

##### ⚠️ 다음 작업 (브라우저에서 UI 확인)

1. **브라우저에서 크리에이티브 위젯 확인**
   - http://localhost:3000 접속
   - test@example.com / Test1234! 로그인
   - 대시보드 메인 페이지에서 "조회기간 BEST 소재" 위젯 확인
   - 확인 사항:
     - 크리에이티브 데이터가 표시되는지
     - 이미지/영상 URL이 올바르게 렌더링되는지
     - 광고비 순으로 정렬되어 있는지 (메타 > 메타 > 네이버 순)
     - UI가 깨지지 않았는지

2. **UI 문제 발생 시 디버깅**
   - 브라우저 개발자 도구 (F12) 열기:
     - Console 탭: 에러 메시지 확인
     - Network 탭: API 요청/응답, 이미지 로딩 실패 여부
     - React DevTools: 컴포넌트 props 및 state 확인
   - 가능한 원인:
     - BestCreatives.js의 이미지/영상 렌더링 로직
     - creative_type 값 ('image' vs 'video')
     - url 필드 매핑 (imageUrl/videoUrl)
     - CSS 스타일링

3. **AllCreatives.js 페이지 연동** (선택)
   - Mock 데이터 주석 처리
   - Supabase getAllCreatives() 호출
   - 페이지네이션/필터/정렬 기능 유지

4. **테스트 스크립트 실행** (선택)
   ```bash
   cd /Users/reon/Desktop/개발/growth-dashboard
   node test_creatives.js
   ```
   - JOIN 동작 확인
   - 광고비 순 정렬 검증
   - 이미지/영상 URL 존재 확인

##### 📌 다음 Claude 세션 시작 방법

1. 이 가이드 파일 읽기: [SUPABASE_INTEGRATION_GUIDE.md](SUPABASE_INTEGRATION_GUIDE.md)
2. Phase 5 완료 상태 확인:
   - ✅ 모든 코드에서 `campaign_ad_id` → `ad_id` 변경 완료
   - ✅ 샘플 데이터 삽입 완료 (6개 크리에이티브 + 180개 성과 데이터)
   - ✅ 대시보드 서버 정상 실행 중
3. 브라우저에서 http://localhost:3000 접속
4. "조회기간 BEST 소재" 위젯 UI 확인 및 디버깅
5. AllCreatives.js 페이지 연동 (선택)
6. Phase 6 (데이터 테이블 연동) 진행

#### 다음 단계
- ✅ Phase 5 마무리: 브라우저에서 크리에이티브 UI 최종 확인 (2026-01-02 완료)
- ✅ Phase 6: 데이터 테이블 연동 (AllCreatives.js) (2026-01-02 완료)
- ✅ Phase 3: API 토큰 관리 CRUD (2026-01-02 완료)
- ⏳ Phase 4: 앱스스크립트 데이터 수집 연동
- ⏳ Phase 7: 성별/연령대 컴포넌트 연동 (데이터 수집 후)
- ⏳ 추가 기능: OrganizationsTable, PermissionTable 연동

### 2026-01-02 (목)

#### Phase 6: 대시보드 연동 ✅ 완료
- ✅ ad_performance 데이터 fetch 구현
- ✅ DateRangeContext 날짜 필터링 쿼리
- ✅ KPI 계산 (총지출, 노출수, ROAS, CVR 등)
- ✅ 차트 컴포넌트 데이터 바인딩
- ✅ ad_creatives 데이터 fetch (크리에이티브 갤러리)
- ✅ 데이터 테이블 대시보드 차트 연동 완료
- ✅ 크리에이티브 영역 이미지/영상 렌더링 정상 동작 확인
- ✅ UI 깨짐 현상 없음 확인

#### Phase 3: API 토큰 관리 CRUD 연동 ✅ 완료 (2026-01-02)
- ✅ supabaseService.js에 API 토큰 함수 추가 (getApiTokens, createApiToken, updateApiToken, deleteApiToken)
- ✅ 필드명 자동 매핑 (camelCase ↔ snake_case)
- ✅ APITokenTable.js READ 로직 Supabase 전환
- ✅ APITokenTable.js CREATE 로직 Supabase 전환
- ✅ APITokenTable.js UPDATE 로직 Supabase 전환
- ✅ APITokenTable.js DELETE 로직 Supabase 전환 (Soft delete)
- ✅ 권한별 필터링 쿼리 구현 (대행사: 전체, 클라이언트: 본인 것만)
- ✅ 플랫폼별 필수 검증 로직 유지

---

## ⚠️ Claude 응답 규칙 (절대 준수)

1. **토큰 절약**: 코드 예시 제공 금지, 간결한 1-3줄 답변
2. **질문 우선**: 불확실하면 즉시 사용자에게 질문
3. **단계적 진행**: 사용자 승인 없이 다음 단계 진행 금지
4. **코드 수정 시 원본 보존**: 기존 코드 주석 처리 후 새 코드 추가 (원복 대비)

---

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [프로젝트 현황 분석](#프로젝트-현황-분석)
3. [데이터베이스 스키마 설계](#데이터베이스-스키마-설계)
4. [앱스스크립트 vs Supabase Edge Functions](#앱스스크립트-vs-supabase-edge-functions)
5. [연동 체크리스트](#연동-체크리스트)
6. [단계별 구현 가이드](#단계별-구현-가이드)
7. [주의사항 및 함정](#주의사항-및-함정)

---

## 프로젝트 개요

### 현재 상태
```
Google Ads API ─────┐
                    ├──> 앱스스크립트 ──> Google Sheets
Meta Ads API ───────┘
```

### 목표 상태
```
Google Ads API ─────┐
                    ├──> Supabase Edge Functions ──> Supabase DB
Meta Ads API ───────┘
```

### ✅ 핵심 변경사항
1. **앱스스크립트는 제거하지 않음**
   - 현재: 앱스스크립트가 Google Sheets에 저장
   - 마이그레이션 중: 앱스스크립트가 Supabase에도 저장 (이중 저장)
   - 최종: Supabase Edge Functions로 완전 전환

2. **Supabase Edge Functions 활용**
   - Google Ads API 호출
   - Meta Ads API 호출
   - 데이터 수집 상태 체크
   - Google OAuth 인증

3. **데이터 수집 자동화**
   - pg_cron 또는 외부 Cron (GitHub Actions, Vercel Cron)
   - 매일 오전 10시 데이터 수집 상태 체크

---

## 프로젝트 현황 분석

### 1. 인증 시스템 (AuthContext.js)

#### ✅ 현재 State 구조
```javascript
// src/contexts/AuthContext.js
{
  user: null,                    // 사용자 정보
  organizationId: null,          // 조직 ID
  advertiserId: null,            // 광고주 ID (클라이언트)
  role: null,                    // 권한
  organizationType: null,        // 조직 타입
  availableAdvertisers: [],      // 접근 가능한 광고주 목록
  currentAdvertiserId: null      // 현재 선택된 광고주
}
```

#### ✅ 권한 체계
```javascript
// Master
role: 'master'
organizationType: 'master'

// 대행사
organizationType: 'agency'
role: 'org_admin' | 'org_manager' | 'org_staff'

// 광고주
organizationType: 'advertiser'
role: 'advertiser_admin' | 'manager' | 'editor' | 'viewer'
```

#### ⚠️ Supabase 연동 시 필수 구현
1. **로그인 성공 후 users 테이블에서 메타데이터 조회**
   ```javascript
   const { data: userData } = await supabase
     .from('users')
     .select('*, organizations(*), advertisers(*)')
     .eq('id', user.id)
     .single();

   setOrganizationId(userData.organization_id);
   setAdvertiserId(userData.advertiser_id);
   setRole(userData.role);
   setOrganizationType(userData.organizations?.type);
   ```

2. **availableAdvertisers 조회 로직**
   - Master: 모든 advertisers
   - Agency (org_admin 계열): organization_id로 필터링
   - Advertiser: 본인의 advertiser_id만

---

### 2. API 토큰 관리 (APITokenTable.js)

#### ✅ Mock 데이터 구조
```javascript
// src/views/superadmin/api-management/components/APITokenTable.js (lines 127-161)
{
  id: number,                           // UUID로 변경 필요
  advertiserId: string,                 // UUID (advertisers.id)
  advertiser: string,                   // 조인으로 가져올 이름
  platform: 'Google Ads' | 'Meta Ads' | 'Naver Ads' | 'Kakao Ads',

  // Google Ads 필드
  customerId: string,                   // customer_id
  managerAccountId: string,             // manager_account_id
  developerToken: string,               // developer_token
  targetConversionActionId: string[],   // target_conversion_action_id (배열)
  refreshToken: string,                 // refresh_token
  clientId: string,                     // client_id
  clientSecret: string,                 // client_secret

  // Meta/Naver/Kakao 필드
  accountId: string,                    // account_id
  apiToken: string,                     // access_token

  // Naver 전용
  secretKey: string,                    // secret_key

  // 공통
  lastUpdated: string,                  // last_checked (TIMESTAMPTZ)
  status: 'active' | 'inactive',
  dataCollectionStatus: 'success' | 'error' | 'pending'
}
```

#### ✅ CRUD 로직 위치
```javascript
// CREATE (lines 208-228, 360-423)
handleAdd() → handleSave()

// READ (lines 127-171)
allData state → 권한별 필터링

// UPDATE (lines 230-249, 384-403)
handleEdit() → handleSave() (editMode)

// DELETE (lines 348-358)
handleDelete()
```

#### ⚠️ 필수 검증 로직 (lines 361-382)
```javascript
const isGoogleAds = formData.platform === 'Google Ads';
const isNaverAds = formData.platform === 'Naver Ads';

// Google Ads: 7개 필드 필수
if (isGoogleAds) {
  필수: customerId, managerAccountId, developerToken,
       targetConversionActionId (배열 길이 > 0),
       refreshToken, clientId, clientSecret
}

// Naver Ads: 3개 필드 필수
if (isNaverAds) {
  필수: accountId, apiToken, secretKey
}

// Meta/Kakao: 2개 필드 필수
else {
  필수: accountId, apiToken
}
```

#### ⚠️ Supabase 연동 포인트

1. **테이블명: `api_tokens`**
2. **필드명 매핑**
   - `customerId` → `customer_id`
   - `managerAccountId` → `manager_account_id`
   - `targetConversionActionId` → `target_conversion_action_id` (TEXT[])
   - `lastUpdated` → `last_checked` (TIMESTAMPTZ)
   - `dataCollectionStatus` → `data_collection_status`

3. **조인 필요**
   ```sql
   SELECT
     api_tokens.*,
     advertisers.name AS advertiser
   FROM api_tokens
   LEFT JOIN advertisers ON api_tokens.advertiser_id = advertisers.id
   ```

4. **권한 필터링 (lines 164-171)**
   ```javascript
   // Agency: 모든 데이터
   if (isAgency()) return allData;

   // Advertiser: 본인 것만
   return allData.filter(item => item.advertiserId === advertiserId);
   ```

---

### 3. 앱스스크립트 데이터 구조

#### ✅ Google Ads 수집 필드 (Google_auto_v1.0.js)

**PropertiesService 설정:**
```javascript
GOOGLE_REFRESH_TOKEN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_DEVELOPER_TOKEN
GOOGLE_CUSTOMER_ID
GOOGLE_MANAGER_ACCOUNT_ID
GOOGLE_SHEET_ID
GOOGLE_CONVERSION_ACTION_ID
GOOGLE_SHEET_NAME
```

**필수 헤더 (lines 21-37):**
```javascript
[
  "Source",                  // 'GOOGLE'
  "Campaign, Ad ID",         // campaign_ad_id
  "Date",                    // date (YYYY-MM-DD)
  "Campaign Name",           // campaign_name
  "Ad Group Name",           // ad_group_name
  "Ad Name",                 // ad_name
  "Cost (KRW)",              // cost (NUMERIC)
  "Impressions",             // impressions (INTEGER)
  "Clicks",                  // clicks (INTEGER)test@example.com
  "Conversions",             // conversions (NUMERIC - 소수점 가능!)
  "Conversion Value",        // conversion_value (NUMERIC)
  "장바구니담기",            // add_to_cart (Google은 0)
  "장바구니담기Value",       // add_to_cart_value (Google은 0)
  "수집날짜",                // collected_at (TIMESTAMPTZ)
  "이슈체크"                 // issue_status ('정상')
]
```

#### ⚠️ 중요: Google Ads는 3개 레벨 수집
```javascript
// 1. Campaign 레벨
// 2. AdGroup 레벨
// 3. AssetGroup 레벨 (PMax 캠페인)
```

#### ✅ Meta Ads 수집 필드 (Meta_auto_v1.0.js)

**PropertiesService 설정:**
```javascript
META_ACCESS_TOKEN
META_AD_ACCOUNT_ID
META_SHEET_ID
META_SHEET_NAME
```

**필수 헤더 (동일):**
- Source: 'META'
- Campaign, Ad ID: ad_id (Meta)
- add_to_cart, add_to_cart_value: 실제 값 수집

#### ✅ Meta Creatives 수집 (meta_updateMasterCreatives_v2.0.js)

**수집 필드:**
```javascript
{
  ad_id: string,
  Campaign Name: string,
  Ad Group Name: string,
  Ad Name: string,
  ad_type: 'image' | 'video' | 'carousel' | 'dynamic',
  creative_type: 'image' | 'video',
  url: string,
  width: number,
  height: number,
  hash: string
}
```

#### ⚠️ Supabase 테이블 매핑

**ad_performance 테이블:**
```sql
CREATE TABLE ad_performance (
  id UUID PRIMARY KEY,
  advertiser_id UUID NOT NULL,
  source TEXT NOT NULL,              -- 'GOOGLE' | 'META'
  campaign_ad_id TEXT NOT NULL,      -- "Campaign, Ad ID"
  date DATE NOT NULL,
  campaign_name TEXT,
  ad_group_name TEXT,
  ad_name TEXT,
  cost NUMERIC(15, 2),
  impressions INTEGER,
  clicks INTEGER,
  conversions NUMERIC(10, 2),        -- ⚠️ 소수점 가능!
  conversion_value NUMERIC(15, 2),
  add_to_cart INTEGER,
  add_to_cart_value NUMERIC(15, 2),
  collected_at TIMESTAMPTZ,
  issue_status TEXT,
  UNIQUE(advertiser_id, source, campaign_ad_id, date)
);
```

**ad_creatives 테이블:**
```sql
CREATE TABLE ad_creatives (
  id UUID PRIMARY KEY,
  advertiser_id UUID NOT NULL,
  ad_id TEXT NOT NULL,
  campaign_name TEXT,
  ad_group_name TEXT,
  ad_name TEXT,
  ad_type TEXT,
  creative_type TEXT,
  url TEXT,
  width INTEGER,
  height INTEGER,
  hash TEXT,
  collected_at TIMESTAMPTZ,
  UNIQUE(advertiser_id, ad_id)
);
```

---

### 4. 날짜 필터링 (DateRangeContext.js)

#### ✅ Context 구조
```javascript
// src/contexts/DateRangeContext.js
{
  startDate: "2024-12-25",        // YYYY-MM-DD
  endDate: "2024-12-31",          // YYYY-MM-DD
  selectedPreset: "이번 주",
  setStartDate: (date) => {},
  setEndDate: (date) => {},
  updateDateRange: (preset) => {}
}
```

#### ✅ 프리셋 옵션
```javascript
'어제'          // yesterday
'최근 7일'      // last 7 days
'최근 14일'     // last 14 days
'최근 30일'     // last 30 days
'이번 주'       // this week (월요일~오늘)
'지난주'        // last week (월~일)
'이번 달'       // this month
'지난달'        // last month
'직접설정'      // custom
```

#### ⚠️ Supabase 쿼리 예시
```javascript
const { data } = await supabase
  .from('ad_performance')
  .select('*')
  .eq('advertiser_id', advertiserId)
  .gte('date', startDate)
  .lte('date', endDate);
```

---

### 5. 대시보드 KPI (index.jsx)

#### ✅ 상단 6개 KPI 카드
```javascript
// src/views/admin/default/index.jsx (lines 68-150)
1. 총지출 (cost 합계)
2. 노출수 (impressions 합계)
3. 클릭수 (clicks 합계)
4. 전환수 (conversions 합계)
5. CVR (전환수 / 클릭수 * 100)
6. ROAS (conversion_value / cost)
```

#### ⚠️ 계산 지표 필요
```sql
-- View 또는 클라이언트 계산
SELECT
  SUM(cost) AS total_cost,
  SUM(impressions) AS total_impressions,
  SUM(clicks) AS total_clicks,
  SUM(conversions) AS total_conversions,
  SUM(conversion_value) AS total_revenue,
  CASE
    WHEN SUM(cost) > 0
    THEN ROUND(SUM(conversion_value) / SUM(cost), 2)
    ELSE 0
  END AS roas,
  CASE
    WHEN SUM(clicks) > 0
    THEN ROUND(SUM(conversions) / SUM(clicks) * 100, 2)
    ELSE 0
  END AS cvr
FROM ad_performance
WHERE advertiser_id = ?
  AND date >= ?
  AND date <= ?;
```

---

## ⚠️ 스키마 설계 위험 요소 분석 (2025-12-31 추가)

### 🔴 HIGH RISK
1. **CHECK 제약조건** → 신규 플랫폼 추가 시 ALTER TABLE 필요 (다운타임 발생)
2. **NUMERIC(15,2)** → 대규모 예산 초과 위험
3. **ad_type CHECK** → 신규 크리에이티브 형식 대응 불가

### 🟡 MEDIUM RISK
4. **신규 지표 추가** → 매번 스키마 변경 필요
5. **target_conversion_action_id TEXT[]** → 복수 전환 액션 추적 불가
6. **ON DELETE CASCADE** → 실수 삭제 시 데이터 영구 소실

### 개선 방향
- JSONB 확장 필드 추가 (`additional_metrics`, `additional_credentials`)
- CHECK 제약조건 제거
- Soft delete 패턴 적용
- NUMERIC 정밀도 확장

---

## 데이터베이스 스키마 설계

<!--
❌ 2025-12-31 DEPRECATED: 아래 스키마는 확장성 문제로 개선됨
기존 설계 참고용으로 보존
-->

### 1. organizations 테이블 (기존)
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('master', 'agency', 'advertiser')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. advertisers 테이블
```sql
CREATE TABLE advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
  organization_type TEXT CHECK (organization_type IN ('master', 'agency', 'advertiser')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. api_tokens 테이블 ⭐ 핵심!
```sql
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('Google Ads', 'Meta Ads', 'Naver Ads', 'Kakao Ads')),

  -- Google Ads
  customer_id TEXT,
  manager_account_id TEXT,
  developer_token TEXT,
  target_conversion_action_id TEXT[],
  refresh_token TEXT,
  client_id TEXT,
  client_secret TEXT,

  -- Meta Ads
  account_id TEXT,
  access_token TEXT,

  -- Naver Ads
  secret_key TEXT,

  -- 공통
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  data_collection_status TEXT DEFAULT 'pending' CHECK (data_collection_status IN ('success', 'error', 'pending')),
  last_checked TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. ad_performance 테이블
```sql
CREATE TABLE ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('GOOGLE', 'META', 'NAVER', 'KAKAO')),
  campaign_ad_id TEXT NOT NULL,
  date DATE NOT NULL,
  campaign_name TEXT,
  ad_group_name TEXT,
  ad_name TEXT,
  cost NUMERIC(15, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions NUMERIC(10, 2) DEFAULT 0,        -- ⚠️ 소수점!
  conversion_value NUMERIC(15, 2) DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  add_to_cart_value NUMERIC(15, 2) DEFAULT 0,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  issue_status TEXT DEFAULT '정상',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advertiser_id, source, campaign_ad_id, date)
);
```

### 6. ad_creatives 테이블 (기존)
```sql
CREATE TABLE ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  campaign_name TEXT,
  ad_group_name TEXT,
  ad_name TEXT,
  ad_type TEXT CHECK (ad_type IN ('image', 'video', 'carousel', 'dynamic')),
  creative_type TEXT CHECK (creative_type IN ('image', 'video')),
  url TEXT,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  hash TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advertiser_id, ad_id)
);
```

<!-- ❌ 기존 스키마 끝 -->

---

## ✅ 개선된 스키마 (2025-12-31)

### api_tokens (개선)
- CHECK 제약조건 제거
- `additional_credentials JSONB` 추가
- `deleted_at` soft delete 추가
- `ON DELETE RESTRICT`로 변경

### ad_performance (개선)
- CHECK 제약조건 제거
- `cost/conversion_value NUMERIC(20,2)` 확장
- `impressions/clicks BIGINT` 확장
- `additional_metrics JSONB` 추가
- `deleted_at` soft delete 추가

### ad_creatives (개선)
- CHECK 제약조건 제거
- `metadata JSONB` 추가
- `deleted_at` soft delete 추가

### 성능 최적화 인덱스
- `idx_ad_performance_lookup` 복합 인덱스
- `idx_ad_performance_metrics` GIN 인덱스 (JSONB)

---

## 연동 체크리스트

### ✅ Phase 1: 데이터베이스 설정
- [x] Supabase 프로젝트 생성
- [x] 개선된 스키마 SQL 실행
- [x] 인덱스 생성 (성능 최적화)
- [x] 샘플 데이터 삽입 (테스트용)
- [ ] RLS (Row Level Security) 정책 설정 (Phase 2 이후)

### ✅ Phase 2: 인증 시스템
- [ ] AuthContext.js에서 Supabase Auth 연동
- [ ] 로그인 성공 후 users 테이블 조회
- [ ] organizationId, role, organizationType state 업데이트
- [ ] availableAdvertisers 조회 로직 구현
- [ ] 권한 체크 헬퍼 함수 검증

### ✅ Phase 3: API 토큰 관리
- [ ] APITokenTable.js CRUD → Supabase 전환
- [ ] 필드명 매핑 (camelCase → snake_case)
- [ ] 권한별 필터링 쿼리
- [ ] 플랫폼별 필수 검증 로직 유지
- [ ] Google OAuth Edge Function 구현
- [ ] 전환 액션 조회 Edge Function 구현

### ✅ Phase 4: 데이터 수집
- [ ] 앱스스크립트 → Supabase 저장 로직 추가
- [ ] UPSERT 로직 구현 (ON CONFLICT)
- [ ] advertiser_id 매핑 (customer_id, account_id 기반)
- [ ] data_collection_status 업데이트
- [ ] 매일 오전 10시 자동 체크 (pg_cron 또는 외부)

### ✅ Phase 5: 대시보드 연동
- [ ] ad_performance 데이터 fetch
- [ ] DateRangeContext 날짜 필터링 쿼리
- [ ] KPI 계산 (총지출, 노출수, ROAS, CVR 등)
- [ ] 차트 컴포넌트 데이터 바인딩
- [ ] ad_creatives 데이터 fetch (크리에이티브 갤러리)

---

## 단계별 구현 가이드

### Step 1: Supabase 프로젝트 설정

1. **Supabase Dashboard에서 SQL Editor 열기**
2. **위 스키마 SQL 전체 실행**
3. **Table Editor에서 테이블 생성 확인**

### Step 2: AuthContext 수정

**파일:** `src/contexts/AuthContext.js`

**기존 코드 (lines 126-162):**
```javascript
const signIn = async (email, password) => {
  const data = await supabaseSignIn(email, password);
  // ⚠️ 여기서 users 테이블 조회 필요!
};
```

**수정 코드:**
```javascript
const signIn = async (email, password) => {
  try {
    // 1. Supabase Auth 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // 2. users 테이블에서 메타데이터 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        organizations(id, name, type),
        advertisers(id, name)
      `)
      .eq('id', authData.user.id)
      .single();

    if (userError) throw userError;

    // 3. State 업데이트
    setUser(authData.user);
    setOrganizationId(userData.organization_id);
    setAdvertiserId(userData.advertiser_id);
    setRole(userData.role);
    setOrganizationType(userData.organizations?.type);

    // 4. availableAdvertisers 조회
    await loadAvailableAdvertisers(userData);

    return { data: authData, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

const loadAvailableAdvertisers = async (userData) => {
  let query = supabase.from('advertisers').select('*');

  // Master: 모든 광고주
  if (userData.role === 'master') {
    // 필터 없음
  }
  // Agency: 같은 organization_id
  else if (userData.organizations?.type === 'agency') {
    query = query.eq('organization_id', userData.organization_id);
  }
  // Advertiser: 본인만
  else {
    query = query.eq('id', userData.advertiser_id);
  }

  const { data } = await query;
  setAvailableAdvertisers(data || []);
};
```

### Step 3: APITokenTable CRUD 수정

**파일:** `src/views/superadmin/api-management/components/APITokenTable.js`

**READ 수정 (lines 127-171):**
```javascript
// 기존 Mock 데이터 제거
// const [allData, setAllData] = React.useState([...]);

const [allData, setAllData] = React.useState([]);

React.useEffect(() => {
  fetchTokens();
}, []);

const fetchTokens = async () => {
  let query = supabase
    .from('api_tokens')
    .select(`
      *,
      advertisers(name)
    `);

  // 권한별 필터링
  if (!isAgency()) {
    query = query.eq('advertiser_id', advertiserId);
  }

  const { data, error } = await query;

  if (!error) {
    // 필드명 매핑 (snake_case → camelCase)
    const mappedData = data.map(token => ({
      id: token.id,
      advertiserId: token.advertiser_id,
      advertiser: token.advertisers?.name,
      platform: token.platform,
      customerId: token.customer_id,
      managerAccountId: token.manager_account_id,
      developerToken: token.developer_token,
      targetConversionActionId: token.target_conversion_action_id || [],
      refreshToken: token.refresh_token,
      clientId: token.client_id,
      clientSecret: token.client_secret,
      accountId: token.account_id,
      apiToken: token.access_token,
      secretKey: token.secret_key,
      lastUpdated: token.last_checked,
      status: token.status,
      dataCollectionStatus: token.data_collection_status
    }));

    setAllData(mappedData);
  }
};
```

**CREATE/UPDATE 수정 (lines 360-423):**
```javascript
const handleSave = async () => {
  // 기존 검증 로직 유지
  if (!hasRequiredFields) {
    toast({ title: '필수 항목 입력', status: 'error' });
    return;
  }

  // 필드명 매핑 (camelCase → snake_case)
  const tokenData = {
    advertiser_id: formData.advertiser,  // ⚠️ UUID로 변환 필요
    platform: formData.platform,
    customer_id: formData.customerId,
    manager_account_id: formData.managerAccountId,
    developer_token: formData.developerToken,
    target_conversion_action_id: formData.targetConversionActionId,
    refresh_token: formData.refreshToken,
    client_id: formData.clientId,
    client_secret: formData.clientSecret,
    account_id: formData.accountId,
    access_token: formData.apiToken,
    secret_key: formData.secretKey,
    status: formData.status,
    last_checked: new Date().toISOString()
  };

  if (editMode) {
    // UPDATE
    const { error } = await supabase
      .from('api_tokens')
      .update(tokenData)
      .eq('id', selectedToken.id);

    if (!error) {
      toast({ title: 'API 토큰 수정 완료', status: 'success' });
      fetchTokens();
    }
  } else {
    // INSERT
    const { error } = await supabase
      .from('api_tokens')
      .insert([tokenData]);

    if (!error) {
      toast({ title: 'API 토큰 추가 완료', status: 'success' });
      fetchTokens();
    }
  }

  onClose();
};
```

**DELETE 수정 (lines 348-358):**
```javascript
const handleDelete = async (tokenId) => {
  const { error } = await supabase
    .from('api_tokens')
    .delete()
    .eq('id', tokenId);

  if (!error) {
    toast({ title: '삭제 완료', status: 'success' });
    fetchTokens();
  }
};
```

### Step 4: 앱스스크립트 수정

**Google_auto_v1.0.js 수정:**

**기존 구조:**
```javascript
// Google Sheets에 데이터 쓰기
sheet.getRange(row, col).setValue(value);
```

**Supabase 저장 추가:**
```javascript
// Supabase REST API 호출
function saveToSupabase(metricsData) {
  var SUPABASE_URL = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

  // 1. customer_id로 advertiser_id 조회
  var advertiserResponse = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/api_tokens?platform=eq.Google Ads&customer_id=eq.' + CUSTOMER_ID,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    }
  );
  var tokens = JSON.parse(advertiserResponse.getContentText());
  if (tokens.length === 0) {
    Logger.log('advertiser_id를 찾을 수 없습니다: ' + CUSTOMER_ID);
    return;
  }
  var advertiserId = tokens[0].advertiser_id;

  // 2. UPSERT 데이터 준비
  var upsertData = metricsData.map(function(m) {
    return {
      advertiser_id: advertiserId,
      source: 'GOOGLE',
      campaign_ad_id: m.id,
      date: m.date,
      campaign_name: m.campaignName,
      ad_group_name: m.adGroupName,
      ad_name: m.adName,
      cost: m.cost,
      impressions: m.impressions,
      clicks: m.clicks,
      conversions: m.conversions,
      conversion_value: m.conversionValue,
      add_to_cart: 0,
      add_to_cart_value: 0,
      collected_at: new Date().toISOString(),
      issue_status: '정상'
    };
  });

  // 3. Supabase UPSERT
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Prefer': 'resolution=merge-duplicates'  // UPSERT
    },
    payload: JSON.stringify(upsertData)
  };

  UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/ad_performance',
    options
  );

  Logger.log('Supabase 저장 완료: ' + upsertData.length + '건');
}
```

**Meta_auto_v1.0.js 수정:**
```javascript
// account_id로 advertiser_id 조회
var advertiserResponse = UrlFetchApp.fetch(
  SUPABASE_URL + '/rest/v1/api_tokens?platform=eq.Meta Ads&account_id=eq.' + META_AD_ACCOUNT_ID,
  ...
);
```

---

## 주의사항 및 함정

### ⚠️ 함정 1: 필드명 불일치
**문제:**
- UI: camelCase (customerId, managerAccountId)
- DB: snake_case (customer_id, manager_account_id)

**해결:**
- 모든 CRUD에서 필드명 매핑 함수 사용
```javascript
const toSnakeCase = (obj) => { ... };
const toCamelCase = (obj) => { ... };
```

### ⚠️ 함정 2: conversions 소수점
**문제:**
- Google Ads API는 conversions를 소수점으로 반환 (예: 45.5)
- INTEGER로 저장 시 데이터 손실

**해결:**
```sql
conversions NUMERIC(10, 2)  -- ✅ 소수점 2자리 지원
```

### ⚠️ 함정 3: target_conversion_action_id 배열
**문제:**
- UI에서 배열로 관리 (string[])
- PostgreSQL TEXT[] 타입 필요

**해결:**
```sql
target_conversion_action_id TEXT[]  -- ✅ 배열 타입
```

```javascript
// JavaScript에서 삽입
{ target_conversion_action_id: ['7360669402', '1234567890'] }
```

### ⚠️ 함정 4: advertiser_id 매핑
**문제:**
- 앱스스크립트는 customer_id, account_id만 알고 있음
- advertiser_id를 어떻게 찾나?

**해결:**
1. api_tokens 테이블에서 customer_id/account_id로 조회
2. advertiser_id 획득
3. ad_performance에 저장

### ⚠️ 함정 5: RLS 정책
**문제:**
- RLS 활성화 시 service_role_key 없으면 조회 불가

**해결:**
- 앱스스크립트, Edge Function: service_role_key 사용
- 클라이언트: anon_key + RLS 정책 설정

```sql
-- api_tokens 조회 정책
CREATE POLICY "Users can view own tokens" ON api_tokens
  FOR SELECT USING (
    advertiser_id IN (
      SELECT advertiser_id FROM users WHERE id = auth.uid()
    )
  );
```

### ⚠️ 함정 6: UNIQUE 제약조건
**문제:**
- 같은 광고주의 같은 날짜, 같은 광고 데이터 중복 저장 방지

**해결:**
```sql
UNIQUE(advertiser_id, source, campaign_ad_id, date)
```

UPSERT 시:
```javascript
const { error } = await supabase
  .from('ad_performance')
  .upsert(data, {
    onConflict: 'advertiser_id,source,campaign_ad_id,date'
  });
```

### ⚠️ 함정 7: 날짜 포맷
**문제:**
- JavaScript: "2024-12-31"
- PostgreSQL: DATE 타입

**해결:**
- ISO 8601 형식 유지 (YYYY-MM-DD)
- PostgreSQL이 자동 변환

### ⚠️ 함정 8: data_collection_status 업데이트
**문제:**
- 오전 10시 기준으로 전일자 데이터 체크
- 어디서 업데이트?

**해결:**
1. Supabase Edge Function 또는 외부 Cron
2. 매일 오전 10시 실행
3. 전일자 데이터 존재 여부 확인
4. data_collection_status 업데이트

```javascript
// Edge Function 예시
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

const { data } = await supabase
  .from('ad_performance')
  .select('id')
  .eq('advertiser_id', advertiserId)
  .eq('date', yesterdayStr)
  .limit(1);

const status = data && data.length > 0 ? 'success' : 'error';

await supabase
  .from('api_tokens')
  .update({
    data_collection_status: status,
    last_checked: new Date().toISOString()
  })
  .eq('advertiser_id', advertiserId);
```

---

## 앱스스크립트 vs Supabase Edge Functions

### 현재 앱스스크립트 구조

#### 파일 위치
```
/Users/reon/Desktop/개발/앱스스크립트api/
├── Google_auto_v1.0.js              # Google Ads 데이터 수집
├── Meta_auto_v1.0.js                # Meta Ads 데이터 수집
└── meta_updateMasterCreatives_v2.0.js  # Meta 크리에이티브 수집
```

#### PropertiesService 설정
```javascript
// Google Ads
GOOGLE_REFRESH_TOKEN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_DEVELOPER_TOKEN
GOOGLE_CUSTOMER_ID              // ⭐ advertiser 식별 키
GOOGLE_MANAGER_ACCOUNT_ID
GOOGLE_CONVERSION_ACTION_ID
GOOGLE_SHEET_ID
GOOGLE_SHEET_NAME

// Meta Ads
META_ACCESS_TOKEN
META_AD_ACCOUNT_ID              // ⭐ advertiser 식별 키
META_SHEET_ID
META_SHEET_NAME
```

### ⚠️ 마이그레이션 전략

#### Phase 1: 이중 저장 (앱스스크립트 + Supabase)
```javascript
// Google_auto_v1.0.js 수정
function saveData(metricsData) {
  // 1. 기존 Google Sheets 저장 (유지)
  saveToGoogleSheets(metricsData);

  // 2. Supabase 저장 추가
  saveToSupabase(metricsData);
}
```

**장점:**
- 기존 시스템 중단 없음
- 데이터 검증 가능
- 롤백 가능

**단점:**
- 이중 저장으로 인한 성능 저하
- 일시적으로 복잡도 증가

#### Phase 2: Edge Functions로 완전 전환
```typescript
// supabase/functions/fetch-google-ads/index.ts

import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. api_tokens 테이블에서 모든 Google Ads 토큰 조회
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('*, advertisers(*)')
    .eq('platform', 'Google Ads')
    .eq('status', 'active')

  // 2. 각 토큰별로 Google Ads API 호출
  for (const token of tokens) {
    const adData = await fetchGoogleAdsAPI({
      customerId: token.customer_id,
      refreshToken: token.refresh_token,
      clientId: token.client_id,
      clientSecret: token.client_secret,
      developerToken: token.developer_token
    })

    // 3. ad_performance 테이블에 UPSERT
    for (const row of adData) {
      await supabase
        .from('ad_performance')
        .upsert({
          advertiser_id: token.advertiser_id,
          source: 'GOOGLE',
          campaign_ad_id: row.id,
          date: row.date,
          campaign_name: row.campaign_name,
          ad_group_name: row.ad_group_name,
          ad_name: row.ad_name,
          cost: row.cost,
          impressions: row.impressions,
          clicks: row.clicks,
          conversions: row.conversions,
          conversion_value: row.conversion_value,
          collected_at: new Date().toISOString(),
          issue_status: '정상'
        }, {
          onConflict: 'advertiser_id,source,campaign_ad_id,date'
        })
    }

    // 4. data_collection_status 업데이트
    await supabase
      .from('api_tokens')
      .update({
        data_collection_status: 'success',
        last_checked: new Date().toISOString()
      })
      .eq('id', token.id)
  }

  return new Response(JSON.stringify({ success: true }))
})
```

**장점:**
- 앱스스크립트 제거 가능
- Supabase 생태계 완전 통합
- 확장성 및 유지보수 용이

**단점:**
- Google Ads API, Meta Ads API 로직 재구현 필요
- 초기 개발 시간 소요

### 데이터 수집 자동화

#### 옵션 1: Supabase pg_cron
```sql
-- 매일 오전 10시(KST) 실행
SELECT cron.schedule(
  'fetch-google-ads-daily',
  '0 1 * * *',  -- UTC 기준 01:00 (KST 10:00)
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/fetch-google-ads',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'fetch-meta-ads-daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/fetch-meta-ads',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);

-- 데이터 수집 상태 체크
SELECT cron.schedule(
  'check-yesterday-data',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/check-yesterday-data',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

#### 옵션 2: GitHub Actions
```yaml
# .github/workflows/fetch-ads-data.yml
name: Fetch Ads Data Daily

on:
  schedule:
    - cron: '0 1 * * *'  # UTC 01:00 (KST 10:00)
  workflow_dispatch:  # 수동 실행 가능

jobs:
  fetch-google-ads:
    runs-on: ubuntu-latest
    steps:
      - name: Call Google Ads Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://your-project.supabase.co/functions/v1/fetch-google-ads

  fetch-meta-ads:
    runs-on: ubuntu-latest
    steps:
      - name: Call Meta Ads Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://your-project.supabase.co/functions/v1/fetch-meta-ads

  check-data:
    runs-on: ubuntu-latest
    needs: [fetch-google-ads, fetch-meta-ads]
    steps:
      - name: Check Yesterday Data
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://your-project.supabase.co/functions/v1/check-yesterday-data
```

#### 옵션 3: Vercel Cron
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/fetch-google-ads",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/fetch-meta-ads",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/check-yesterday-data",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### 놓치면 안 되는 추가 컴포넌트

#### 1. OrganizationsTable.jsx
```javascript
// src/views/superadmin/organizations/components/OrganizationsTable.jsx

// ⚠️ Mock 데이터가 있음 - Supabase 연동 필요
const mockOrganizations = [
  {
    id: 1,
    name: "나이키 코리아",
    type: "advertiser",         // organizations.type
    usersCount: 12,             // COUNT(users)
    advertisersCount: 1,        // COUNT(advertisers)
    isActive: true,
    approvalStatus: "approved", // ⚠️ 스키마에 없음! 추가 필요?
    createdAt: "2025-01-15"
  }
]

// ⚠️ Supabase 쿼리 구현 필요
const fetchOrganizations = async () => {
  const { data } = await supabase
    .from('organizations')
    .select(`
      *,
      users(count),
      advertisers(count)
    `)

  // 데이터 변환
  const mapped = data.map(org => ({
    ...org,
    usersCount: org.users[0].count,
    advertisersCount: org.advertisers[0].count
  }))
}
```

**⚠️ 추가 필드 필요 여부:**
- `approvalStatus`: 조직 승인 상태 (가입 승인 프로세스)
- `isActive`: 조직 활성화 상태

**스키마 추가:**
```sql
ALTER TABLE organizations
ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

#### 2. PermissionTable.js
```javascript
// src/views/superadmin/permissions/components/PermissionTable.js

// ⚠️ Mock 사용자 데이터
const mockUsers = [
  {
    email: 'superadmin@example.com',
    joinDate: '2024.01.01',
    status: 'active',
    role: 'superadmin'  // ⚠️ users.role과 다름!
  }
]

// ⚠️ 실제 스키마:
// role: 'master', 'org_admin', 'advertiser_admin', 'manager', 'editor', 'viewer'
```

**⚠️ 역할 체계 확인 필요:**
- Mock: `superadmin`, `admin`, `user`
- AuthContext: `master`, `org_admin`, `advertiser_admin`, `manager`, `editor`, `viewer`

**해결:**
- PermissionTable의 Mock 데이터는 예시일 뿐
- 실제 구현 시 AuthContext의 역할 체계 사용

#### 3. dataCollectionChecker.js
```javascript
// src/utils/dataCollectionChecker.js

// ⚠️ 이미 TODO가 명확하게 작성되어 있음
// ⚠️ Supabase Edge Function 예시 코드 포함 (lines 124-188)

/**
 * TODO: Supabase 연동 시 구현 내용
 * 1. Supabase에서 해당 광고주의 전일자 데이터 조회
 *    - SELECT * FROM ad_performance
 *      WHERE advertiser_id = ?
 *      AND platform = ?
 *      AND date = ?
 *
 * 2. 데이터 존재 여부에 따라 상태 반환
 *    - 데이터 있음: 'success'
 *    - 데이터 없음 & 오전 10시 이후: 'error'
 *    - 데이터 없음 & 오전 10시 이전: 'pending'
 */
```

**Edge Function 구현 위치:**
```
supabase/functions/check-yesterday-data/index.ts
```

---

## 마무리 체크리스트

### ✅ Phase 1: 데이터베이스 설정
- [ ] Supabase 프로젝트 생성
- [ ] 모든 테이블 생성 (organizations, advertisers, users, api_tokens, ad_performance, ad_creatives)
- [ ] UNIQUE 제약조건 확인 (ad_performance, ad_creatives, api_tokens)
- [ ] 인덱스 생성 확인 (성능 최적화)
- [ ] RLS 정책 설정 확인
- [ ] organizations 테이블에 approval_status, is_active 필드 추가 여부 결정

### ✅ Phase 2: 인증 시스템
- [ ] AuthContext.js Supabase Auth 연동
- [ ] 로그인 성공 후 users 테이블 조회
- [ ] organizationId, role, organizationType state 업데이트
- [ ] availableAdvertisers 조회 로직 구현
- [ ] 권한 체크 헬퍼 함수 검증 (isMaster, isOrgAdmin 등)

### ✅ Phase 3: API 토큰 관리 ✅ 완료 (2026-01-02)
- [x] APITokenTable.js READ 로직 Supabase 전환
- [x] 필드명 매핑 (camelCase ↔ snake_case)
- [x] CREATE/UPDATE 로직 Supabase 전환
- [x] DELETE 로직 Supabase 전환
- [x] 플랫폼별 필수 검증 로직 유지
- [x] 권한별 필터링 쿼리 구현
- [ ] Google OAuth Edge Function 구현 (선택)
- [ ] 전환 액션 조회 Edge Function 구현 (선택)

### ✅ Phase 4: 데이터 수집 (앱스스크립트)
- [ ] Google_auto_v1.0.js에 Supabase 저장 로직 추가
- [ ] Meta_auto_v1.0.js에 Supabase 저장 로직 추가
- [ ] meta_updateMasterCreatives_v2.0.js에 Supabase 저장 로직 추가
- [ ] advertiser_id 매핑 (customer_id/account_id → advertiser_id)
- [ ] UPSERT 로직 구현 (중복 방지)
- [ ] conversions 소수점 저장 확인
- [ ] 이중 저장 검증 (Sheets + Supabase)

### ✅ Phase 5: Edge Functions 전환 (선택)
- [ ] fetch-google-ads Edge Function 구현
- [ ] fetch-meta-ads Edge Function 구현
- [ ] fetch-meta-creatives Edge Function 구현
- [ ] check-yesterday-data Edge Function 구현
- [ ] pg_cron 또는 외부 Cron 설정
- [ ] 앱스스크립트 제거

### ✅ Phase 6: 대시보드 연동 ✅ 완료 (2026-01-02)
- [x] ad_performance 데이터 fetch 구현
- [x] DateRangeContext 날짜 필터링 쿼리
- [x] KPI 계산 (총지출, 노출수, ROAS, CVR 등)
- [x] 차트 컴포넌트 데이터 바인딩
- [x] ad_creatives 데이터 fetch (크리에이티브 갤러리)
- [x] 데이터 테이블 대시보드 차트 연동 완료
- [x] 크리에이티브 영역 이미지/영상 렌더링 정상 동작 확인
- [x] UI 깨짐 현상 없음 확인

### ✅ Phase 7: 추가 기능
- [ ] OrganizationsTable.jsx Supabase 연동
- [ ] PermissionTable.js Supabase 연동
- [ ] dataCollectionChecker.js 실제 구현

---

## 전체 프로젝트 파일 요약

### 🎯 분석 완료된 핵심 파일
1. **src/contexts/AuthContext.js** - 인증 및 권한 시스템 (295 lines)
2. **src/contexts/DateRangeContext.js** - 날짜 범위 필터링 (135 lines)
3. **src/views/superadmin/api-management/components/APITokenTable.js** - API 토큰 CRUD (1,468 lines)
4. **src/utils/dataCollectionChecker.js** - 데이터 수집 상태 체크 (189 lines)
5. **src/views/superadmin/organizations/components/OrganizationsTable.jsx** - 조직 관리
6. **src/views/superadmin/permissions/components/PermissionTable.js** - 권한 관리
7. **앱스스크립트api/Google_auto_v1.0.js** - Google Ads 수집
8. **앱스스크립트api/Meta_auto_v1.0.js** - Meta Ads 수집
9. **앱스스크립트api/meta_updateMasterCreatives_v2.0.js** - Meta 크리에이티브 수집

### 🗂️ 주요 디렉토리 구조
```
growth-dashboard/
├── src/
│   ├── contexts/              # AuthContext, DateRangeContext
│   ├── views/
│   │   ├── admin/            # 일반 대시보드
│   │   ├── superadmin/       # 대행사 관리자
│   │   ├── brandadmin/       # 클라이언트 관리자 (ClientAdminLayout)
│   │   └── master/           # 마스터 전용
│   ├── utils/                # dataCollectionChecker.js
│   ├── config/               # supabase.js
│   └── services/             # supabaseService.js
└── 앱스스크립트api/
    ├── Google_auto_v1.0.js
    ├── Meta_auto_v1.0.js
    └── meta_updateMasterCreatives_v2.0.js
```

### ✅ 확인 완료 사항
1. ✅ 전체 프로젝트 파일 구조 파악
2. ✅ 앱스스크립트 3개 파일 분석 (Google, Meta, Creatives)
3. ✅ 앱스스크립트 → Supabase 마이그레이션 전략 수립
4. ✅ Supabase Edge Functions 활용 방안 제시
5. ✅ 데이터 수집 자동화 옵션 3가지 제시 (pg_cron, GitHub Actions, Vercel Cron)
6. ✅ 놓칠 수 있는 컴포넌트 추가 확인 (OrganizationsTable, PermissionTable)
7. ✅ 스키마 추가 필드 제안 (approval_status, is_active)

---

**이 가이드는 Growth Dashboard 프로젝트의 전체 파일을 분석하여 작성되었으며, 실수 없는 Supabase 연동을 위한 완전한 체크리스트를 제공합니다.**
