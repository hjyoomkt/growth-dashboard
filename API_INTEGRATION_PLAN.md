# API 연동 작업 계획서

## 📋 작업 개요
앱스스크립트 → 슈퍼베이스 API 전환 작업
- 기존 API 관리 페이지 기능 유지 (슈퍼어드민/브랜드어드민)
- 자동 스케줄러 기능 추가
- 매체별 API 제약사항 대응

---

## 🎯 핵심 요구사항

### 1. 토큰 추가 시 동작
#### Case A: 토큰 추가 + 기간 선택 + 저장
- 선택한 기간의 과거 데이터 즉시 수집 (초기 수집)
- **Meta**: 광고 데이터(90일 청크) + 성별/연령대(60일 청크) + 크리에이티브 순차 수집
- **Google/Naver**: 90일/30일 청크로 순차 수집
- 초기 수집 완료 후 자동 스케줄러 활성화
- 다음날 새벽부터 매일 자동 수집

#### Case B: 토큰 추가 + "나중에하기"
- 과거 데이터 수집 안함
- 자동 스케줄러만 즉시 생성 및 활성화
- 다음날 새벽부터 매일 자동 수집 시작

### 🚨 초기 연동 시 필수 처리사항
1. **순차 수집 보장**: 광고 데이터 → 성별/연령대 → 크리에이티브 순서 준수
2. **진행 상황 실시간 표시**: "Meta 광고 데이터 수집 중 (2/8 청크 완료)" 형태
3. **중단 시 재개 가능**: 실패한 청크부터 재시도 가능
4. **토큰 검증**: 첫 API 호출 전 토큰 유효성 체크 (401 에러 시 즉시 중단)
5. **초기 수집 실패 처리**: 사용자에게 명확한 에러 메시지 + 재시도 버튼 제공

### 2. 데이터 권한
- **본인 조직/브랜드 데이터만 노출**
- 본인 브랜드 + 하위 브랜드만 접근 가능
- 타 조직/타 브랜드 정보 노출 금지

### 3. API 버전 관리
- Meta Ads API 버전: v24.0
- 버전을 DB에 저장하여 대시보드에서 수정 가능
- 코드 수정 없이 버전 업데이트 가능한 구조

---

## 📊 매체별 API 제약사항

### Meta Ads
- **호출 단위**: 90일
- **주의사항**: Breakdown 조합 시 13개월 제한
- **Rate Limit**: 재시도 시 지수 백오프 (1초→2초→4초→8초)
- **API 버전**: v24.0

### Google Ads
- **호출 단위**: 90일
- **Paging**: 필요
- **Rate Limit**: 필요 시 재시도 간격 조절

### Naver Ads
- **호출 단위**: 30일 (단일 요청 최대 31일)
- **Paging**: 필요
- **Rate Limit**: 최소 1~2초 간격, 재시도 시 지수 백오프

---

## 🔧 백엔드 처리 로직

### 1. 순차 호출
- 2년치 데이터를 매체별 호출 단위로 분할
- 예: Meta 2년 = 90일 × 8번 순차 호출

### 2. Paging 처리
- 하루 데이터가 많으면 자동 페이지별 호출
- 각 페이지 데이터를 DB에 저장

### 3. Rate Limit / 오류 재시도
- `429 Too Many Requests`, `500`, `503` 발생 시 자동 재시도
- **지수 백오프 방식**: 1초 → 2초 → 4초 → 8초
- 최대 재시도 횟수 설정

### 4. 백그라운드 작업 큐
- Supabase Edge Function 사용
- 장시간 작업은 백그라운드에서 처리
- 클라이언트는 트리거만, 실제 처리는 서버

---

## 🖥️ 클라이언트 UI

### 1. 토큰 추가 시
- 예상 소요 시간 경고문 표시
- "데이터 수집에는 최대 X분이 소요될 수 있습니다"

### 2. 진행 상태 표시
- 진행률 표시 (20% 완료... 80% 완료...)
- 현재 처리 중인 기간 표시
- 실패 시 어디서 멈췄는지 명시

### 3. 데이터 연동 버튼
- 수동으로 특정 기간 재수집 가능
- 동일한 분할 로직 적용 (90일/30일 단위)

---

## 📅 자동 스케줄러

### 트리거 생성 시점
- 토큰 추가 시 자동 생성
- "나중에하기" 선택해도 생성됨

### 실행 시간 (✅ 최종 확정)
- **04:00 KST** - Meta 광고 데이터 수집
- **04:30 KST** - Meta 성별/연령대 수집 (Breakdown)
- **05:00 KST** - Meta 크리에이티브 수집
- **05:30 KST** - Google Ads 수집
- **06:00 KST** - Naver Ads 수집
- 각 작업 30분 간격으로 충돌 방지
- 전날 데이터 자동 수집

### 스케줄러 관리
- Supabase pg_cron 사용
- 토큰 삭제 시 스케줄러도 함께 삭제
- 각 매체별 독립 스케줄러로 충돌 방지

---

## ✅ 작업 순서

### Phase 1: 사전 조사
1. 현재 앱스스크립트 코드 위치 확인
2. 사용 중인 Meta Breakdown 파라미터 확인
3. 슈퍼베이스 연결 정보 확인
4. 기존 API 관리 페이지 기능 목록 파악
5. 현재 DB 테이블 구조 분석

### Phase 2: DB 설계
1. API 버전 관리 테이블 설계
2. 스케줄러 상태 관리 테이블 설계
3. 작업 큐 상태 관리 테이블 설계
4. 브랜드/조직 권한 확인 쿼리 설계

### Phase 3: 백엔드 구현
1. Supabase Edge Function 생성
   - 매체별 API 호출 함수
   - 기간 분할 로직
   - Paging 처리
   - Rate Limit / 재시도 로직
2. 백그라운드 작업 큐 구현
3. 스케줄러 설정 (pg_cron)
4. 권한 체크 미들웨어

### Phase 4: 프론트엔드 수정
1. API 버전 관리 UI 추가
2. 진행 상태 표시 UI 구현
3. 경고문 추가
4. 기존 기능 연동 (토큰 추가/삭제/목록)

### Phase 5: 테스트
1. 토큰 추가 시나리오 테스트
   - Case A: 기간 선택 + 저장
   - Case B: 나중에하기
2. 데이터 연동 버튼 테스트
3. 스케줄러 동작 확인
4. 권한 체크 테스트 (타 조직 데이터 접근 차단)
5. 오류 재시도 로직 테스트
6. 2년치 데이터 수집 테스트

### Phase 6: 배포
1. 백업 생성
2. 단계별 배포 (백엔드 → 프론트엔드)
3. 롤백 계획 준비
4. 모니터링

---

## ⚠️ 주의 사항

### 기존 서비스 영향도
- API 관리 페이지 모든 기능 정상 작동 필수
- 기존 데이터 손실 방지
- 배포 중 서비스 중단 최소화

### 보안
- API 토큰 암호화 저장
- 브랜드/조직 권한 엄격히 체크
- SQL Injection 방지

### 성능
- 장시간 작업은 백그라운드 처리
- DB 인덱스 최적화
- Rate Limit 준수

### 에러 처리
- 모든 실패 케이스 로깅
- 사용자에게 명확한 에러 메시지 제공
- 실패 지점부터 재시도 가능

---

## 📝 파일 위치 파악 완료

### 1. 앱스스크립트 원본 코드
- **위치**: `/Users/reon/Desktop/개발/앱스스크립트api/`
- **파일 목록**:
  - **`Meta_url_v1_0_batch_write(이미지호출제거).js`** (497줄) ← 기준 파일
  - `Google_auto_v1.0.js` (879줄) ← 기준 파일
  - `meta_updateMasterCreatives_v2.0.js` (크리에이티브 업데이트용)

### 2. Growth Dashboard 주요 파일
- **API 관리 페이지**:
  - `/src/views/superadmin/api-management/index.jsx`
  - `/src/views/superadmin/api-management/components/APITokenTable.js`

- **Supabase 서비스**:
  - `/src/services/supabaseService.js` (API 토큰 CRUD 함수)
  - `/src/config/supabase.js`

- **Supabase 설정**:
  - `.env` (Supabase URL, Anon Key)
  - `/supabase/functions/` (현재 send-invite-email만 존재)

### 3. Supabase 연결 정보
- **URL**: `https://qdzdyoqtzkfpcogecyar.supabase.co`
- **Anon Key**: (확인 완료)
- **DB**: PostgreSQL (Pooler 연결 가능)

### 4. 현재 API 관리 페이지 기능 (확인됨)
- ✅ API 토큰 CRUD (생성/조회/수정/삭제)
- ✅ 매체별 토큰 관리 (Meta, Google, Naver)
- ✅ 브랜드별 권한 체크
- ✅ 데이터 수집 상태 표시
- ✅ 전환액션 선택 UI (Google Ads)
- ⚠️ **데이터 연동 버튼 존재하지만 실제 API 호출 미구현**
- ⚠️ **스케줄러 미구현**

### 5. Supabase 테이블 구조 (✅ 실제 DB 확인 완료)

#### ad_performance 테이블
**전체 필드 목록:**
- `id` UUID (PK)
- `advertiser_id` UUID (FK → advertisers)
- `source` TEXT (Meta/Google/Naver)
- `ad_id` TEXT (광고 ID)
- `date` DATE (날짜)
- `campaign_name` TEXT
- `ad_group_name` TEXT
- `ad_name` TEXT
- `cost` NUMERIC(20,2)
- `impressions` BIGINT
- `clicks` BIGINT
- `conversions` NUMERIC(10,2)
- `conversion_value` NUMERIC(20,2)
- `add_to_cart` INTEGER
- `add_to_cart_value` NUMERIC(20,2)
- `additional_metrics` JSONB (성별/연령대 저장용)
- `collected_at` TIMESTAMPTZ
- `issue_status` TEXT
- `deleted_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**⚠️ 중요 제약사항:**
- UNIQUE: (advertiser_id, source, **campaign_ad_id**, date)
  - 현재 테이블에는 `campaign_ad_id` 필드 있음
  - 실제 데이터는 `ad_id` 필드 사용 중
  - **스키마 파일과 실제 DB 불일치 → 확인 필요**

**인덱스:**
- `idx_ad_performance_lookup`: (advertiser_id, date DESC, source)
- `idx_ad_performance_metrics`: GIN 인덱스 (additional_metrics JSONB)

#### api_tokens 테이블
**전체 필드 목록:**
- `id` UUID (PK)
- `advertiser_id` UUID (FK)
- `platform` TEXT (Meta Ads/Google Ads/Naver Ads)
- `customer_id` TEXT (Google)
- `manager_account_id` TEXT (Google)
- `developer_token` TEXT (Google)
- `target_conversion_action_id` TEXT[] (Google 배열)
- `refresh_token` TEXT (Google)
- `client_id` TEXT (Google)
- `client_secret` TEXT (Google)
- `account_id` TEXT (Meta/Naver)
- `access_token` TEXT (Meta/Naver)
- `secret_key` TEXT (Naver)
- `additional_credentials` JSONB
- `status` TEXT (active/inactive)
- `data_collection_status` TEXT (pending/success/error)
- `last_checked` TIMESTAMPTZ
- `deleted_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**인덱스:**
- `idx_api_tokens_advertiser`: (advertiser_id)

#### ad_creatives 테이블
- 크리에이티브 이미지/비디오 URL 저장
- UNIQUE: (advertiser_id, ad_id)

---

### 🚨 발견된 문제점

#### 1. ad_performance 테이블 필드명 불일치
- **schema.sql**: `campaign_ad_id` (UNIQUE 제약)
- **실제 DB**: `ad_id` 필드 사용
- **영향**: UNIQUE 제약이 `campaign_ad_id`를 참조하면 충돌 발생

#### 2. Breakdown 데이터 저장 방식 ✅ 확정
- **결정**: 별도 테이블 `ad_performance_demographics` 생성 (하단 "🗄️ 신규 테이블 설계" 참조)

---

## 📊 앱스스크립트 코드 분석 완료

### Meta Ads (Meta_url_v1_0_batch_write)
**현재 구현**:
- API 버전: v19.0
- 수집 레벨: Ad 레벨 (`level=ad`)
- Breakdown: 미사용
- 최적화: 배치 이름 조회 (50개씩), 이미지 API 호출 제거
- 페이징: 지원

**Supabase 전환 시 변경사항**:
- ✅ API 버전: v19.0 → **v24.0**
- ✅ Breakdown 추가: 별도 API 호출로 계정 레벨 demographics 수집
- ✅ 데이터 저장: ad_performance (광고 데이터) + ad_performance_demographics (성별/연령대)

### Google Ads (Google_auto_v1.0)
**현재 구현**:
- API 버전: v22
- 수집 레벨: **Campaign / AdGroup / AssetGroup** (혼합)
- Ad 레벨: **미수집** ❌
- 로직:
  ```
  AdGroup 있으면 → AdGroup ID
  AssetGroup 있으면 → AssetGroup ID (P-MAX)
  둘 다 없으면 → Campaign ID
  ```

**Supabase 전환 시 변경사항**:
- ✅ **Ad 레벨 추가** (ad_group_ad 리소스)
- ✅ 신규 우선순위:
  ```
  1. Ad ID 있으면 → Ad ID (YouTube/Demand Gen/GDN/Search)
  2. AdGroup 있으면 → AdGroup ID
  3. AssetGroup 있으면 → AssetGroup ID (P-MAX)
  4. 다 없으면 → Campaign ID
  ```
- ⚠️ **중요**: P-MAX는 Ad 개념 없음 → AssetGroup으로 fallback 필수

---

## 🗄️ 신규 테이블 설계

### ad_performance_demographics
**용도**: Meta Ads 계정 레벨 성별/연령대 집계

```sql
CREATE TABLE ad_performance_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id),
  source TEXT NOT NULL, -- 'Meta'
  date DATE NOT NULL,
  gender TEXT, -- 'male', 'female', 'unknown'
  age TEXT, -- '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  cost NUMERIC(20,2) DEFAULT 0,
  conversions NUMERIC(10,2) DEFAULT 0,
  conversion_value NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(advertiser_id, source, date, gender, age)
);

CREATE INDEX idx_demographics_lookup
ON ad_performance_demographics(advertiser_id, date DESC, source);
```

---

## ❌ 비효율 제거 항목

### Google Ads
1. ~~3번의 개별 지표 API 호출 (Campaign/AdGroup/AssetGroup)~~
   - → **개선**: ad_group_ad 쿼리 1번으로 통합 가능

2. ~~3번의 개별 전환 API 호출~~
   - → **개선**: 메인 쿼리에 metrics.conversions 포함

### Meta Ads
1. ~~이미지 URL 개별 API 호출~~
   - → ✅ 이미 제거됨 (batch_write 버전)

2. ~~API 버전 v19.0~~
   - → **v24.0으로 업그레이드**

---

## 🚨 실수 발생 시 대응

### 즉시 보고
- 어떤 작업 중 문제 발생했는지
- 영향 범위 (어떤 기능/데이터)
- 현재 상태

### 원복 절차
1. Git 커밋 단위로 롤백
2. DB 백업에서 복원 (필요 시)
3. 원복 완료 확인
4. 사용자 재확인

---

## 📌 다음 단계

**사용자 명령 대기 중**

위 내용 검토 후 Phase 1 시작 명령을 내려주시면 작업을 시작하겠습니다.

---

## 🔍 추가 확인 사항

### 매체별 구현 순서
1. **1차 구현**: Meta Ads, Google Ads
2. **2차 구현**: Naver Ads 및 기타 매체 (추후 동일 패턴 적용)

### 확장 가능한 구조 설계 원칙
- 매체별 API 로직을 독립 모듈화
- 새 매체 추가 시 최소한의 코드 수정으로 확장 가능
- 공통 로직 (기간 분할, 페이징, 재시도) 재사용
- 매체별 설정을 DB에 저장 (API 버전, 호출 제한 등)

---

## 🚨 작업 시작 전 필수 체크리스트

### 1. Meta Breakdown 파라미터 분석 (⚠️ 최우선 작업)

#### 현재 앱스스크립트에서 수집 중인 데이터
- **기존 수집**:
  - Insights: date_start, campaign_id, adset_id, ad_id, spend, impressions, actions, action_values
  - **Breakdown 없음** (현재 광고 레벨만 수집)
  - Attribution Windows: ["7d_click", "1d_view"]

#### 신규 수집 예정 데이터
- ⚠️ **성별(gender) 데이터**
- ⚠️ **연령대(age) 데이터**
- ⚠️ **성별 × 연령대 조합 데이터**
- ⚠️ **구매 전환 데이터 (성별/연령대별)**

#### Meta Breakdown 13개월 제한 문제

**문제 정의:**
- Meta API는 특정 Breakdown 조합 사용 시 **13개월 이상의 데이터를 한 번에 요청하면 일부 지표가 누락**됨
- 영향 받는 Breakdown: `age`, `gender`, `age+gender`, `placement`, `publisher_platform` 등

**필수 체크 항목:**
1. ⚠️ **Meta API v24.0 공식 문서 확인 필수** → Breakdown 파라미터 정확한 문법 확인
2. **수집할 Breakdown 조합 선택** → age, gender, age+gender 중 결정
3. **13개월 제한 회피 전략 확정** → 90일 / 60일 / 30일 단위 결정
4. ✅ **데이터 저장 구조** → ad_performance_demographics 별도 테이블
5. ✅ **API 호출 최적화** → 광고 데이터와 Demographics 별도 호출

**⚠️ Breakdown 작업 시작 전 필수 순서:**
1. Meta API v24.0 Insights 문서에서 `breakdowns` 파라미터 문법 확인
2. 지원되는 breakdown 값 목록 확인 (age, gender, age+gender 등)
3. 13개월 제한 공식 문서 확인
4. 위 확인 완료 후 구현 시작

### 2. DB 테이블 호환성 체크

#### 필드 매칭 확인 완료
- ✅ ad_performance 테이블 필드 호환성 확인
- ✅ Meta/Google 데이터 매핑 검증 완료
- ✅ Demographics 데이터는 별도 테이블로 분리


### 3. API 호출 시나리오 검증

#### 테스트 필요 시나리오
1. **토큰 추가 + 2년치 데이터 수집**
   - Meta: 90일씩 8번 vs 60일씩 12번 vs 30일씩 24번
   - Breakdown 있을 때 vs 없을 때
   - 예상 소요 시간 계산

2. **Breakdown 조합 테스트**
   - 성별만 수집
   - 연령대만 수집
   - 성별+연령대 동시 수집
   - 13개월 이상 데이터 요청 시 에러 발생 여부

3. **Rate Limit 테스트**
   - Meta: 초당 요청 수 제한
   - Google: 동시 요청 수 제한
   - 재시도 로직 검증

4. **Paging 처리**
   - 하루에 광고가 1000개 이상일 때
   - Breakdown으로 데이터가 폭발적으로 증가할 때

### 4. 대화 내용 체크리스트

#### 놓치지 말아야 할 핵심 요구사항
- [x] 앱스스크립트 → Supabase API 전환
- [x] 매체별 API 제약사항 대응 (90일/30일 분할)
- [x] 토큰 추가 시 초기 수집 + 자동 스케줄러 생성
- [x] "나중에하기" 선택 시에도 스케줄러 생성
- [x] 매일 새벽 자동 수집
- [x] 진행 상태 표시 UI
- [x] Rate Limit 재시도 (지수 백오프)
- [x] 브랜드 권한 체크 (본인 브랜드만)
- [x] API 버전 DB 저장 (대시보드에서 수정 가능)
- [ ] **성별/연령대 데이터 수집 (Meta Breakdown)**
- [ ] **13개월 제한 회피 전략**
- [ ] **기존 데이터와 신규 데이터 충돌 방지**

---

## 🚫 Breakdown 구현 전 필수 확인 (코드 작성 금지)

**다음 항목을 사용자에게 반드시 질문하고 답변 받아야 함:**

### 필수 질문 사항
1. **Meta Breakdown 조합**
   - 질문: "age만 수집? gender만? age+gender 둘 다?"
   - 답변 받기 전까지 코드 작성 금지

2. **13개월 제한 회피 전략**
   - 질문: "90일 단위? 60일 단위? 30일 단위?"
   - 답변 받기 전까지 코드 작성 금지

3. **스케줄러 실행 시간**
   - 질문: "매일 몇 시에 실행? (예: 04:00 KST)"
   - 답변 받기 전까지 스케줄러 설정 금지

**⚠️ 위 3가지 질문에 대한 사용자 답변 없이 Breakdown 구현 절대 금지**

---

## ⚠️ 작업 진행 전 최종 확인 사항

**절대 시작하기 전에 확인해야 할 것들:**

1. ⚠️ **Meta API v24.0 공식 문서 확인** → Breakdown 파라미터 문법 및 지원 값
2. 🚫 **사용자 질문 필수**: Meta Breakdown 조합 (age/gender/age+gender)
3. 🚫 **사용자 질문 필수**: 13개월 제한 회피 전략 (90일/60일/30일)
4. 🚫 **사용자 질문 필수**: 스케줄러 실행 시간 (예: 04:00 KST)
5. ~~**성별/연령대 데이터 저장 방식**~~ → ✅ ad_performance_demographics 테이블
6. ~~**DB 테이블 수정 필요 여부**~~ → ✅ ad_performance_demographics 신규 생성

**위 6가지 중 1~4번 확인 필요 (5~6번 완료)**

### 🔴 Breakdown 구현 시 필수 절차
1. **1순위**: Meta API v24.0 Insights 공식 문서 읽기
   - URL: `https://developers.facebook.com/docs/marketing-api/reference/adgroup/insights/`
   - `breakdowns` 파라미터 정확한 문법 확인
   - 지원되는 breakdown 값 목록 확인
2. **2순위**: 사용자에게 필수 질문 3가지 하기 (위 섹션 참조)
3. **3순위**: 13개월 제한 관련 문서 확인
4. **4순위**: 테스트 API 호출로 실제 동작 검증
5. **5순위**: 구현 시작

**⚠️ 사용자 답변 없이 추측으로 구현 시 버그 발생 - 절대 금지**

---

## 🔐 OAuth 2.0 & 보안 강화 통합 계획

### 배경
기존 앱스스크립트 → Supabase 전환 작업 중 다음 문제 발견:
1. **RLS 정책 취약점**: 모든 테이블이 `USING(true)` → 타 브랜드 데이터 접근 가능 (Supabase Linter 28개 경고)
2. **토큰 평문 저장**: api_tokens 테이블에 암호화 없이 저장, Vault 미사용
3. **Google OAuth 미구현**: UI에 "Google 계정 연결" 버튼 있으나 mock만 존재, 사용자가 80자 이상 토큰 수동 입력 필요
4. **전환 액션 조회 불가**: 하드코딩된 mock 데이터 4개만 표시, 실제 Google Ads API 호출 안 함

### 핵심 원칙
1. **기존 Token MVP 절대 중단 없음** - 병렬 구조로 진행, api_tokens 테이블 그대로 유지
2. **OAuth는 비활성 준비** - platform_configs.oauth_enabled = false 기본값, UI 버튼은 "준비 중" 메시지
3. **보안 강화 최우선** - RLS + Vault 먼저 적용 후 데이터 수집 파이프라인 구축
4. **모든 단계 독립 롤백 가능** - 각 Phase별 rollback 쿼리 준비

---

## 📐 아키텍처 설계

### 데이터베이스 구조 변경

#### 기존 테이블 보강
**api_tokens**
- 추가 컬럼: `access_token_vault_id`, `refresh_token_vault_id`, `developer_token_vault_id`, `client_secret_vault_id`, `secret_key_vault_id`
- RLS 정책 변경: `USING(true)` → `USING(advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())))`
- 평문 컬럼은 마이그레이션 완료 후 유지 (롤백용)

**ad_performance**
- RLS 정책 변경: 브랜드별 격리
- service_role만 INSERT/UPDATE 가능 (Edge Function 전용)

#### 신규 테이블 (OAuth 준비)
**platform_configs**
- 목적: 플랫폼별 설정 중앙화 (API 버전, OAuth 설정, 청크 크기)
- 주요 필드: platform, api_version, oauth_enabled (기본 false), oauth_client_id_vault_id, oauth_scopes, chunk_size_days
- 초기 데이터: Meta Ads (v24.0, 90일), Google Ads (v22, 90일), Naver Ads (v1, 30일)

**integrations**
- 목적: Token/OAuth 통합 테이블, 향후 api_tokens 대체
- integration_type: 'token' | 'oauth'
- OAuth 필드: oauth_state, oauth_access_token_vault_id, oauth_refresh_token_vault_id, oauth_token_expires_at
- Token 필드: legacy_access_token_vault_id, legacy_refresh_token_vault_id 등 (api_tokens 호환)
- RLS: 브랜드별 격리

**ad_accounts**
- 목적: OAuth 계정 메타데이터 (account_name, currency, timezone 등)
- integration_id 참조

**oauth_authorization_sessions**
- 목적: OAuth 플로우 추적 (CSRF 방지용 state_token, PKCE용 code_verifier)
- 15분 만료, 자동 정리 함수 포함

**collection_jobs**
- 목적: 데이터 수집 작업 로그
- 필드: integration_id, collection_date, started_at, completed_at, status, chunks_total, chunks_completed, chunks_failed

### 핵심 추상화: resolveAccessToken()

**목적:** 모든 데이터 수집기가 Token/OAuth 구분 없이 토큰 조회

**로직:**
```
resolveAccessToken(integration_id)
  ↓
if (integration_type === 'token')
  → Vault에서 legacy_access_token_vault_id 조회
  → 반환 (Google은 refresh_token 사용)

if (integration_type === 'oauth')
  → oauth_token_expires_at 확인 (5분 버퍼)
  → 만료 안 됨: oauth_access_token_vault_id 조회 → 반환
  → 만료됨:
    → oauth_refresh_token_vault_id로 플랫폼 refresh API 호출
    → 새 토큰 Vault 저장 + integration 업데이트
    → 반환
```

**장점:**
- 수집기는 `await resolveAccessToken(id)` 한 줄로 토큰 획득
- 토큰 갱신 로직 중앙 관리
- 향후 새 인증 방식 추가 용이

---

## 🗓️ 구현 단계 (6 Phases)

### Phase 1: 보안 강화 ✅ 완료
- RLS 정책 수정 + Supabase Vault 마이그레이션

---

### Phase 2: OAuth 테이블 준비 ✅ 완료
- 6개 테이블 생성 (platform_configs, collection_jobs, integrations, ad_accounts, oauth_authorization_sessions, ad_performance_demographics)
- RLS 정책 적용 (브랜드별 격리)
- cleanup 함수 및 트리거 설정

---

### Phase 2 상세 (참고용)

**Week 3**

**목표:** OAuth 지원 테이블 생성 (oauth_enabled = false 유지)

#### 작업 내역
1. **테이블 생성**
   - 파일: `supabase/migrations/003_oauth_tables.sql`
   - platform_configs: 초기 데이터 INSERT (Meta/Google/Naver, oauth_enabled = false)
   - integrations: Token/OAuth 통합, RLS 정책 포함
   - ad_accounts: OAuth 계정 메타데이터
   - oauth_authorization_sessions: OAuth 플로우 추적
   - cleanup_expired_oauth_sessions() 함수: 15분 만료 세션 자동 정리

2. **데이터 마이그레이션 함수** (선택적)
   - `migrate_api_token_to_integration(token_id)`: 기존 api_tokens → integrations 복사
   - integration_type = 'token' 고정
   - 실제 마이그레이션은 Phase 5 이후 진행 (검증 후)

#### 테스트 항목
- 모든 테이블 생성 성공 확인
- platform_configs 초기 데이터 3개 확인 (oauth_enabled = false)
- integrations RLS 정책 작동 확인 (브랜드별 격리)
- 기존 api_tokens 테이블 영향 없음 확인 (기존 기능 정상 작동)

#### 롤백 절차
```sql
DROP TABLE oauth_authorization_sessions CASCADE;
DROP TABLE ad_accounts CASCADE;
DROP TABLE integrations CASCADE;
DROP TABLE platform_configs CASCADE;
DROP FUNCTION cleanup_expired_oauth_sessions();
```

#### 사용자 영향
- 없음 (신규 테이블만 추가, 기존 기능 변경 없음)

---

### Phase 3: 핵심 추상화 구현 ✅ 완료

**목표:** `resolveAccessToken()` Edge Function 구현

#### 작업 내역
1. **Edge Function 생성** ✅
   - 파일: `supabase/functions/resolve-access-token/index.ts`
   - Input: `{ integration_id }`
   - Output: `{ access_token, token_type, expires_at?, refreshed?, platform }`
   - Token 타입: Vault에서 legacy_*_vault_id 조회 (Google은 refresh_token, Meta/Naver는 access_token)
   - OAuth 타입:
     - 만료 체크 (5분 버퍼)
     - 유효하면 oauth_access_token_vault_id 조회
     - 만료 시 oauth_refresh_token_vault_id로 플랫폼 refresh API 호출
     - 플랫폼별 refresh 로직: Google (oauth2.googleapis.com/token), Meta (graph.facebook.com/oauth/access_token)
     - 새 토큰 Vault 저장 + integrations 업데이트
   - 에러 처리: Vault 조회 실패, refresh 실패, 플랫폼 미지원 등
   - RLS 권한 체크: integration 조회 시 자동으로 브랜드 권한 확인

2. **token_refresh_logs 테이블** ✅
   - OAuth refresh 이벤트 추적
   - 필드: integration_id, platform, event_type, error_code, error_message, created_at
   - 마이그레이션: `supabase/migrations/003_token_refresh_logs.sql`

3. **테스트 가이드 문서 작성** ✅
   - 파일: `supabase/functions/resolve-access-token/test-manual.md`
   - Token/OAuth 타입별 테스트 시나리오
   - 에러 케이스 테스트 방법

#### 테스트 항목
- [ ] Token 타입 integration 생성 → resolveAccessToken 호출 → Vault 토큰 반환 확인
- [ ] OAuth 타입 (유효한 토큰) → 기존 토큰 반환, refreshed = false 확인
- [ ] OAuth 타입 (만료된 토큰) → refresh 후 새 토큰 반환, refreshed = true 확인
- [ ] integrations 테이블 oauth_token_expires_at 업데이트 확인
- [ ] 잘못된 integration_id → 에러 반환 확인
- [ ] RLS 권한 체크: 타 브랜드 integration 접근 차단 확인

#### 롤백 절차
```sql
-- Edge Function 삭제 (Supabase 대시보드)
DROP TABLE token_refresh_logs CASCADE;
```

#### 사용자 영향
- 없음 (백엔드 함수만 추가, UI 변경 없음)

---

### Phase 4: OAuth 흐름 준비 ✅ 완료

**목표:** OAuth UI/API 구현 (oauth_enabled = false 유지)

#### 작업 내역
1. **OAuth 시작 API** ✅
   - 파일: `supabase/functions/oauth-initiate/index.ts`
   - Input: `{ advertiser_id, platform }`
   - platform_configs에서 oauth_enabled 확인 → false면 에러 (403)
   - state_token 생성 (crypto.randomUUID(), CSRF 방지)
   - code_verifier 생성 (PKCE, Google)
   - oauth_authorization_sessions INSERT (15분 만료)
   - 플랫폼별 OAuth URL 생성:
     - Google: accounts.google.com/o/oauth2/v2/auth (access_type=offline, prompt=consent, PKCE)
     - Meta: facebook.com/v24.0/dialog/oauth
   - Output: `{ authorization_url, state_token }`
   - 배포 완료

2. **OAuth 콜백 핸들러** ✅
   - 파일: `supabase/functions/oauth-callback/index.ts`
   - Input: URL params (code, state, error?)
   - state_token 검증 (oauth_authorization_sessions 조회, 15분 만료 체크)
   - authorization code → tokens 교환:
     - Google: oauth2.googleapis.com/token (grant_type=authorization_code, code_verifier)
     - Meta: graph.facebook.com/oauth/access_token → long-lived token 교환
   - 토큰 Vault 저장 (access_token, refresh_token)
   - integrations INSERT (integration_type = 'oauth')
   - oauth_authorization_sessions 상태 업데이트 (status = 'completed')
   - 성공 시 리다이렉트: `${APP_URL}/admin/api-management?oauth_success=true&integration_id=...`
   - 실패 시 리다이렉트: `${APP_URL}/admin/api-management?oauth_error=...`
   - 배포 완료

3. **Frontend OAuth UI** ✅
   - 파일: `src/views/superadmin/api-management/components/APITokenTable.js`
   - handleGoogleOAuthConnect() 수정 (Line 280-361):
     - platform_configs.oauth_enabled 조회
     - false면 toast "OAuth 준비 중, 수동으로 리프레쉬 토큰 입력해주세요"
     - true면 oauth-initiate 호출 → 팝업 열기 (600x700, 중앙)
     - 팝업 완료 대기 (popup.closed 감지)
     - OAuth 성공 시 fetchTokens() 재조회

#### 테스트 항목
- [ ] platform_configs.oauth_enabled = false → oauth-initiate 호출 시 에러 확인
- [ ] Frontend: "OAuth 준비 중" 메시지 표시 확인
- [ ] oauth_enabled = true로 변경 (테스트 환경) → OAuth URL 생성 확인
- [ ] Google OAuth 전체 플로우 테스트 (수동):
  - [ ] oauth-initiate → URL 생성
  - [ ] 브라우저에서 승인
  - [ ] oauth-callback → integration 생성 확인
  - [ ] Vault에 토큰 저장 확인
- [ ] 15분 만료 세션 → 에러 확인
- [ ] state_token 불일치 → 에러 확인

#### 롤백 절차
```bash
# Supabase 대시보드에서 Edge Functions 삭제
# - oauth-initiate
# - oauth-callback
```

```bash
# Frontend 원복
git checkout src/views/superadmin/api-management/components/APITokenTable.js
```

#### 사용자 영향
- oauth_enabled = false 상태에서는 기존과 동일 (수동 토큰 입력)
- UI에 "OAuth 준비 중" 메시지 표시됨

---

### Phase 5: 데이터 수집 파이프라인 (Week 6-8)

**목표:** Meta/Google/Naver API 연동, 90일/30일 분할, Rate Limit 처리, 초기 연동 완벽 지원

#### 작업 내역
1. **메인 수집 Edge Function**
   - 파일: `supabase/functions/collect-ad-data/index.ts`
   - Input: `{ integration_id, start_date, end_date, mode: 'initial' | 'daily', collection_type?: 'ads' | 'demographics' | 'creatives' }`
   - 로직:
     1. **토큰 검증 (초기 연동 필수)**: resolveAccessToken() 호출 후 테스트 API 호출 (401/403 체크)
     2. integrations + platform_configs 조회
     3. 날짜 청크 계산:
        - **Meta 광고**: 90일 청크
        - **Meta 성별/연령대**: 60일 청크 (13개월 제한 회피)
        - **Google/Naver**: 90일/30일 청크
     4. 각 청크 순차 수집:
        - collectChunk(platform, accessToken, startDate, endDate, collectionType)
        - Rate limiting: Meta/Google 1초, Naver 2초 대기
        - 429 에러 → 지수 백오프 (1s→2s→4s→8s, 최대 3회 재시도)
        - **진행률 실시간 업데이트**: collection_jobs.chunks_completed 증가
     5. collection_jobs INSERT/UPDATE (진행 상황 추적)
     6. integrations.data_collection_status 업데이트 (success/partial/error)
   - Output: `{ success, progress: { total_chunks, completed, failed, errors[] } }`

1-1. **초기 연동 전용 오케스트레이터**
   - 파일: `supabase/functions/initial-collection/index.ts`
   - Input: `{ integration_id, start_date, end_date }`
   - 로직:
     1. **Meta 플랫폼**: 3단계 순차 실행
        - Step 1: collect-ad-data (collection_type='ads') 호출 → 완료 대기
        - Step 2: collect-ad-data (collection_type='demographics') 호출 → 완료 대기
        - Step 3: collect-ad-data (collection_type='creatives') 호출 → 완료 대기
     2. **Google/Naver 플랫폼**: 단일 호출
        - collect-ad-data (collection_type='ads') 호출
     3. 각 단계 실패 시 중단 + 에러 로그 저장 + 사용자에게 명확한 메시지 반환
     4. 모든 단계 성공 시 스케줄러 활성화
   - Output: `{ success, current_step, total_steps, errors[] }`

2. **플랫폼별 수집기**
   - 파일: `supabase/functions/_shared/collectors/meta.ts`
     - collectMetaAds(supabase, integration, accessToken, startDate, endDate)
     - Ad 레벨: `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights` (level=ad, no breakdowns, 페이징 처리)
     - Demographics 레벨: 별도 호출 (level=account, breakdowns=age,gender, 13개월 제한 → 60일 청크로 재분할)
     - ad_performance 테이블 upsert (onConflict: advertiser_id, source, campaign_ad_id, date)
     - ad_performance_demographics 테이블 upsert

   - 파일: `supabase/functions/_shared/collectors/google.ts`
     - collectGoogleAds(supabase, integration, accessToken, startDate, endDate)
     - GAQL 쿼리: `SELECT segments.date, campaign.id, ad_group.id, ad_group_ad.ad.id, metrics.* FROM ad_group_ad WHERE segments.date BETWEEN ... AND ad_group_ad.status = 'ENABLED'`
     - Ad 레벨 우선순위: ad_id → ad_group_id → campaign_id (P-MAX는 ad_id 없음)
     - searchStream API 사용 (newline-delimited JSON)
     - ad_performance 테이블 upsert

   - 파일: `supabase/functions/_shared/collectors/naver.ts`
     - collectNaverAds(supabase, integration, accessToken, startDate, endDate)
     - API: `https://api.naver.com/ncc/stats` (level=AD, timeIncrement=DAILY)
     - X-Signature 생성 (HMAC-SHA256, timestamp + body)
     - 30일 청크 준수
     - ad_performance 테이블 upsert

3. **Frontend 연동**
   - 파일: `src/views/superadmin/api-management/components/APITokenTable.js`
   - handleExecuteSync() 수정 (Line 323-339):
     - collect-ad-data Edge Function 호출
     - syncConfig (startDate, endDate, updateMode) 전달
     - 진행 상황 toast 표시
     - collection_jobs 테이블 실시간 구독 (선택적)

4. **초기 수집 모달 (토큰 추가 시 자동 표시)**
   - handleInitialSync() 수정 (Line 341-355):
     - 토큰 추가 직후 자동 호출
     - **Case A (기간 선택 + 저장)**:
       - initial-collection Edge Function 호출 (통합 오케스트레이터)
       - 진행 상황 모달 표시: "Meta 광고 데이터 수집 중 (Step 1/3, 청크 2/8 완료)"
       - collection_jobs 실시간 구독으로 진행률 업데이트
       - 완료 시: "수집 완료! 스케줄러가 활성화되었습니다" 메시지
       - 실패 시: "수집 실패: [상세 에러]" + 재시도 버튼
     - **Case B (나중에하기)**:
       - 초기 수집 스킵
       - 스케줄러만 즉시 활성화
       - "스케줄러가 생성되었습니다. 내일 새벽부터 자동 수집됩니다" 메시지

5. **토큰 검증 피드백**
   - 토큰 추가 직후 즉시 검증 API 호출
   - 401/403 에러 시: "토큰이 유효하지 않습니다. 다시 확인해주세요" 경고
   - 검증 성공 시에만 초기 수집 모달 표시

#### 테스트 항목
**초기 연동 시나리오:**
- [ ] 신규 Meta 토큰 추가 + 2년 기간 선택 + 저장 → 3단계 순차 수집 확인 (광고→성별/연령대→크리에이티브)
- [ ] 진행 상황 모달: "Step 1/3, 청크 2/8 완료" 실시간 업데이트 확인
- [ ] 잘못된 토큰 입력 → 검증 실패 경고 표시 확인
- [ ] "나중에하기" 선택 → 초기 수집 스킵, 스케줄러만 활성화 확인
- [ ] 초기 수집 중 실패 (네트워크 끊김) → 재시도 버튼 표시 확인

**데이터 수집 정확성:**
- [ ] Meta Ads: 1일 수집 → ad_performance 데이터 확인
- [ ] Meta Ads: 2년 수집 → 90일 청크 8개 확인, 진행 상황 로그
- [ ] Meta Demographics: 13개월 이상 → 60일 청크 재분할 확인, ad_performance_demographics 테이블 저장 확인
- [ ] Meta Creatives: 크리에이티브 데이터 수집 확인
- [ ] Google Ads: Ad 레벨 수집 → ad_id 우선 확인
- [ ] Google Ads: P-MAX 캠페인 → ad_group_id fallback 확인
- [ ] Naver Ads: 30일 수집 → 정상 작동 확인

**에러 처리:**
- [ ] 429 에러 시뮬레이션 → 지수 백오프 재시도 확인 (로그)
- [ ] 401 에러 (잘못된 토큰) → 즉시 중단, 사용자에게 명확한 에러 메시지
- [ ] resolveAccessToken() 호출 확인 (Token/OAuth 투명 처리)

#### 롤백 절차
- Edge Functions 삭제 (collect-ad-data, collectors)
- Frontend 수정 원복

#### 사용자 영향
- "데이터 연동" 버튼 실제 작동 시작
- 초기 수집 시 진행 상황 표시 (기존 mock toast 대신 실제 진행률)

---

### Phase 6: 자동 스케줄러 (Week 9)

**목표:** 매일 새벽 4시 자동 수집

#### 작업 내역
1. **스케줄러 설정**
   - 파일: `supabase/migrations/004_scheduler.sql`
   - pg_cron 확장 활성화
   - trigger_daily_collection() 함수:
     - 모든 active integrations 조회
     - 각 integration에 대해 collect-ad-data Edge Function 호출 (**어제 날짜 데이터 수집**)
     - 매체별 순차 실행 (Meta 광고→성별/연령대→크리에이티브→Google→Naver)
     - net.http_post() 사용
   - cron.schedule() 설정:
     - **19:00 UTC (04:00 KST)** - Meta 광고 데이터
     - **19:30 UTC (04:30 KST)** - Meta 성별/연령대
     - **20:00 UTC (05:00 KST)** - Meta 크리에이티브
     - **20:30 UTC (05:30 KST)** - Google Ads
     - **21:00 UTC (06:00 KST)** - Naver Ads
   - collection_jobs 테이블: 작업 로그 자동 기록
   - **중요**: 광고 매체는 전날 데이터가 확정되므로 어제 날짜 수집이 정확함

2. **모니터링 컴포넌트**
   - 파일: `src/views/superadmin/api-management/components/CollectionMonitor.jsx`
   - collection_jobs 테이블 실시간 구독
   - 최근 20개 작업 표시 (브랜드, 플랫폼, 수집 날짜, 상태, 진행률)
   - 상태 아이콘: 완료(녹색), 실패(빨강), 진행중(주황)
   - 파일: `src/views/superadmin/api-management/index.jsx`
     - CollectionMonitor 컴포넌트 추가 (APITokenTable 하단)

#### 테스트 항목
- trigger_daily_collection() 수동 실행 → 모든 active integrations 처리 확인
- collection_jobs 로그 생성 확인
- 스케줄러 자동 실행 확인 (다음날 새벽 대기 또는 cron 시간 임시 변경)
- Frontend 모니터링 화면 실시간 업데이트 확인
- 실패 케이스 (잘못된 토큰) → error 로그 확인

#### 롤백 절차
```sql
SELECT cron.unschedule('daily-ad-data-collection');
DROP TABLE collection_jobs CASCADE;
DROP FUNCTION trigger_daily_collection();
```

#### 사용자 영향
- 매일 새벽 자동 데이터 수집 시작
- 모니터링 화면에서 수집 현황 실시간 확인 가능

---

## 🔄 전체 롤백 전략

### 롤백 순서 (역순)
```sql
-- Phase 6
SELECT cron.unschedule('daily-ad-data-collection');
DROP TABLE collection_jobs CASCADE;
DROP FUNCTION trigger_daily_collection();

-- Phase 5
-- Edge Functions 삭제 (Supabase 대시보드)

-- Phase 4
-- Edge Functions 삭제

-- Phase 3
-- Edge Function 삭제

-- Phase 2
DROP TABLE oauth_authorization_sessions CASCADE;
DROP TABLE ad_accounts CASCADE;
DROP TABLE integrations CASCADE;
DROP TABLE platform_configs CASCADE;

-- Phase 1
ALTER TABLE api_tokens
DROP COLUMN access_token_vault_id,
DROP COLUMN refresh_token_vault_id,
DROP COLUMN developer_token_vault_id,
DROP COLUMN client_secret_vault_id,
DROP COLUMN secret_key_vault_id;

DROP TABLE vault_migration_log;
DROP FUNCTION get_user_advertiser_ids;

-- RLS 정책 원복
DROP POLICY "users_select_own_brand_tokens" ON api_tokens;
-- ... (모든 신규 정책 삭제)
CREATE POLICY "authenticated_users_select_api_tokens"
ON api_tokens FOR SELECT TO authenticated USING (true);
-- ... (모든 원래 정책 복구)
```

### 단계별 독립 롤백
- 각 Phase는 독립적으로 롤백 가능
- Phase N 실패 시 Phase N-1까지 상태로 복구
- 데이터 손실 없음 (평문 컬럼, 기존 테이블 유지)

---

## ✅ 통합 테스트 체크리스트

### 보안 검증
- [ ] Supabase Database Linter 경고 0개
- [ ] Master 사용자: 모든 브랜드 접근
- [ ] Agency 사용자: 같은 organization만 접근
- [ ] Advertiser 사용자: user_advertisers 기반 접근
- [ ] 타 브랜드 토큰 수정 시도 → RLS 차단
- [ ] Vault에 모든 민감 정보 저장 확인
- [ ] Frontend에서 토큰 값 노출 안 됨

### 기능 검증
- [ ] 기존 Token MVP 정상 작동 (토큰 추가/수정/삭제)
- [ ] OAuth 버튼 "준비 중" 메시지 표시
- [ ] oauth_enabled = true 변경 → OAuth 플로우 작동
- [ ] resolveAccessToken() Token 타입 작동
- [ ] resolveAccessToken() OAuth 타입 refresh 작동
- [ ] Meta Ads 2년 수집 → 90일 청크 확인
- [ ] Meta Demographics 수집 → 60일 분할 확인
- [ ] Google Ads Ad 레벨 수집 확인
- [ ] Google Ads P-MAX fallback 확인
- [ ] Naver Ads 30일 수집 확인
- [ ] 429 에러 → 재시도 확인
- [ ] 매일 새벽 스케줄러 자동 실행
- [ ] collection_jobs 로그 생성
- [ ] 모니터링 화면 실시간 업데이트

### 통합 시나리오
- [ ] 신규 브랜드 생성 → 토큰 추가 → 2년 데이터 수집 → 다음날 자동 수집
- [ ] 토큰 삭제 → 스케줄러 정지 확인
- [ ] 다른 브랜드 사용자 로그인 → 타 브랜드 데이터 접근 불가
- [ ] OAuth 활성화 → Google 계정 연결 → 데이터 수집

---

## 📊 핵심 파일 요약

### 데이터베이스 마이그레이션
1. `supabase/migrations/001_fix_rls_policies.sql` - RLS 보안 강화
2. `supabase/migrations/002_vault_migration.sql` - Vault 마이그레이션
3. `supabase/migrations/003_oauth_tables.sql` - OAuth 테이블 생성
4. `supabase/migrations/004_scheduler.sql` - pg_cron 스케줄러

### Edge Functions
1. `supabase/functions/vault-migrate/index.ts` - 기존 토큰 Vault 이동
2. `supabase/functions/vault-store-secrets/index.ts` - 신규 토큰 Vault 저장
3. `supabase/functions/resolve-access-token/index.ts` - **핵심 추상화**
4. `supabase/functions/oauth-initiate/index.ts` - OAuth 시작
5. `supabase/functions/oauth-callback/index.ts` - OAuth 콜백
6. `supabase/functions/collect-ad-data/index.ts` - **메인 수집기**
7. `supabase/functions/_shared/collectors/meta.ts` - Meta Ads 수집
8. `supabase/functions/_shared/collectors/google.ts` - Google Ads 수집
9. `supabase/functions/_shared/collectors/naver.ts` - Naver Ads 수집

### Frontend 수정
1. `src/services/supabaseService.js` - API 토큰 CRUD (Vault 통합)
2. `src/views/superadmin/api-management/components/APITokenTable.js` - 토큰 UI + OAuth 버튼
3. `src/views/superadmin/api-management/components/CollectionMonitor.jsx` - 수집 모니터링 (신규)
4. `src/views/superadmin/api-management/index.jsx` - 모니터 추가

---

## ⏱️ 예상 일정

| Phase | 작업 | 기간 | 누적 |
|-------|------|------|------|
| Phase 1 | 보안 강화 (RLS + Vault) | 2주 | 2주 |
| Phase 2 | OAuth 테이블 생성 | 1주 | 3주 |
| Phase 3 | resolveAccessToken 구현 | 1주 | 4주 |
| Phase 4 | OAuth 흐름 (비활성) | 1주 | 5주 |
| Phase 5 | 데이터 수집 파이프라인 | 3주 | 8주 |
| Phase 6 | 자동 스케줄러 | 1주 | 9주 |

**총 예상 기간: 9주**

---

## 🎯 최종 성공 기준

### 보안
- Supabase Database Linter 경고 0개
- RLS 정책으로 브랜드별 완전 격리
- 모든 민감 정보 Vault 암호화 저장
- Frontend에서 토큰 평문 노출 없음

### 기능
- 기존 Token MVP 100% 정상 작동
- OAuth 인프라 준비 완료 (oauth_enabled = false)
- Meta/Google/Naver 자동 데이터 수집
- 매일 새벽 4시 스케줄러 실행
- 실시간 수집 모니터링

### 안정성
- 모든 Phase 독립 롤백 가능
- 429 에러 자동 재시도
- 실패 케이스 완전 로깅
- 다운타임 0

---

## 📌 중요 원칙 재확인

1. ✅ **기존 Token MVP 절대 중단 없음**
2. ✅ **OAuth는 비활성 상태로 준비**
3. ✅ **보안 강화 최우선 (RLS + Vault)**
4. ✅ **모든 단계 독립 롤백 가능**
5. ✅ **기존 앱스스크립트 전환 요구사항 100% 포함**

---

## 🔍 구현 시 참고사항

### API_INTEGRATION_PLAN 기존 내용과 통합
- 앱스스크립트 코드 분석 완료 (Meta v19.0→v24.0, Google Ad 레벨 추가)
- ad_performance_demographics 테이블 설계 완료
- Meta Breakdown 13개월 제한 대응 (60일 청크)
- Google Ad 우선순위 (ad_id → ad_group_id → campaign_id)
- 매체별 API 제약사항 (90일/30일 분할, Rate Limit)
- 모든 기존 요구사항은 Phase 5에서 통합 구현

### 기존 발견 문제 해결
- ad_performance.campaign_ad_id vs ad_id 불일치 → Phase 5에서 확인 후 통일
- Google 전환 액션 mock 데이터 → Phase 5에서 실제 API 호출 구현
- 데이터 연동 버튼 미구현 → Phase 5에서 구현

### ✅ 최종 확정 사항 (2026-01-12)
- **Meta Breakdown 조합**: age + gender 모두 수집 (별도 API 호출)
- **13개월 제한 회피**: 일반 데이터 90일, Breakdown 60일 청크로 분할
- **스케줄러 실행 시간**:
  - 04:00 KST - Meta 광고 데이터 수집
  - 04:30 KST - Meta 성별/연령대 수집
  - 05:00 KST - Meta 크리에이티브 수집
  - 05:30 KST - Google Ads 수집
  - 06:00 KST - Naver Ads 수집
  - (각 작업 30분 간격으로 충돌 방지)
