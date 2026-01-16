---
## ⚠️ Claude 응답 규칙 (절대 준수)

1. **토큰 절약**: 코드 예시 제공 금지, 간결한 1-3줄 답변
2. **질문 우선**: 불확실하면 즉시 사용자에게 질문
3. **단계적 진행**: 사용자 승인 없이 다음 단계 진행 금지

---

# 프로젝트 개요

## 목적
Google Apps Script 기반 광고 대시보드를 Supabase + Horizon UI 템플릿 기반 웹 애플리케이션으로 전환

### 기존 시스템
- Google Sheets API 중심 Apps Script 구조
- 데이터 저장: Google Sheets
- 실행 환경: Google Apps Script (clasp 배포)

### 신규 시스템
- Frontend: React 19 + Chakra UI (Horizon UI 템플릿)
- Backend: Supabase (PostgreSQL)
- 배포: 웹 호스팅 (Vercel/Netlify 등)

### 아키텍처 특징
- **멀티 테넌트 구조**: 여러 광고주가 동일 시스템 사용
- **데이터 격리**: 광고주별 데이터 완전 분리
- **확장 가능**: 단일 광고주부터 다수 광고주까지 대응

---

## 기술 스택

### Frontend
- **React 19.0.0**: 컴포넌트 기반 UI
- **Chakra UI 2.6.1**: UI 프레임워크
- **ApexCharts 3.50.0**: 데이터 시각화
- **React Router DOM 6.25.1**: SPA 라우팅
- **Framer Motion 11.3.7**: 애니메이션

### UI 라이브러리
- **@tanstack/react-table 8.19.3**: 테이블 컴포넌트
- **react-calendar 5.0.0**: 달력 UI
- **react-icons 5.2.1**: 아이콘 세트

### Backend (예정)
- **Supabase**: PostgreSQL 데이터베이스 + Auth + Storage
- **Supabase JS Client**: 프론트엔드 연동

---

## 프로젝트 구조

```
e:\0_개발\horizon\
├── src/
│   ├── components/
│   │   ├── card/              # Card 컴포넌트
│   │   ├── calendar/          # MiniCalendar (react-calendar)
│   │   ├── charts/            # BarChart, LineChart, PieChart
│   │   └── fields/            # DateRangePicker 등 폼 요소
│   ├── contexts/
│   │   └── DateRangeContext.js  # 전역 날짜 범위 상태 관리
│   ├── views/admin/
│   │   └── default/
│   │       ├── index.jsx         # 메인 대시보드 레이아웃
│   │       └── components/       # 대시보드 컴포넌트들
│   └── routes.js              # 라우팅 설정
└── package.json
```

---

## 핵심 기능 및 컴포넌트

### 1. 날짜 범위 선택 (DateRangePicker)
**위치**: `src/components/fields/DateRangePicker.js`

**기능**:
- 프리셋: 어제, 최근 7일, 최근 14일, 최근 30일, 이번 주, 지난주, 이번 달, 지난달, 직접설정
- 직접설정 시 react-calendar 팝오버 표시
- DateRangeContext를 통해 전역 상태 관리

**Context 연동**: `src/contexts/DateRangeContext.js`
```javascript
const { startDate, endDate, selectedPreset, updateDateRange, setStartDate, setEndDate } = useDateRange();
```

---

### 2. 메인 대시보드 (index.jsx)
**위치**: `src/views/admin/default/index.jsx`

**레이아웃 구성**:
1. **상단 KPI 카드 (6개)**: 총지출, 노출수, 클릭수, 전환수, CVR, ROAS
2. **총매출 + 주간 매출**: TotalSpent, WeeklyRevenue
3. **비용 분석 (3개)**: DailyAdCost, MediaAdCost, ROASAdCost
4. **전환/구매 분석 (3개)**: WeeklyConversions, GenderPurchasePie, AgeGenderPurchase
5. **크리에이티브**: BestCreatives (상위 6개), AllCreatives (전체 목록 + 페이지네이션)

**현재 데이터**: Mock 데이터 (Math.random 기반)
**향후 작업**: Supabase 연동하여 실제 데이터 fetch

---

### 3. 차트 컴포넌트 목록

#### TotalSpent (총매출 라인 차트)
- **파일**: `src/views/admin/default/components/TotalSpent.js`
- **타입**: LineChart
- **데이터**: 날짜별 매출액 (startDate ~ endDate 기간)
- **동적 생성**: useMemo로 날짜 범위 변경 시 자동 재생성
- **Supabase 연동 필요**: 매출 테이블에서 일자별 합계 조회

#### WeeklyRevenue (주간 매출 바 차트)
- **파일**: `src/views/admin/default/components/WeeklyRevenue.js`
- **타입**: BarChart
- **데이터**: 요일별 매출 (월~일)

#### DailyAdCost (일자별 광고비 바 차트)
- **파일**: `src/views/admin/default/components/DailyAdCost.js`
- **타입**: BarChart
- **데이터**: 날짜별 광고비

#### MediaAdCost (매체별 광고비 바 차트)
- **파일**: `src/views/admin/default/components/MediaAdCost.js`
- **타입**: BarChart (horizontal)
- **데이터**: 네이버, 구글, 메타, 카카오 등 매체별 비용

#### ROASAdCost (ROAS별 광고비)
- **파일**: `src/views/admin/default/components/ROASAdCost.js`
- **타입**: BarChart
- **데이터**: ROAS 구간별 광고비 분포

#### WeeklyConversions (주간 전환수)
- **파일**: `src/views/admin/default/components/WeeklyConversions.js`
- **타입**: BarChart
- **데이터**: 요일별 전환수

#### GenderPurchasePie (성별 구매 분석)
- **파일**: `src/views/admin/default/components/GenderPurchasePie.js`
- **타입**: Pie Chart
- **데이터**: 남성, 여성, 알 수 없음
- **특이사항**: ApexCharts 파이 차트 회색 배경 이슈로 CSS sx prop 사용
```javascript
sx={{
  '& .apexcharts-canvas': { background: 'transparent !important' },
  '& .apexcharts-canvas svg': { background: 'transparent !important' }
}}
```

#### AgeGenderPurchase (연령대별 성별 구매)
- **파일**: `src/views/admin/default/components/AgeGenderPurchase.js`
- **타입**: BarChart (horizontal, stacked)
- **데이터**: 연령대(18-24, 25-34, 35-44, 45-64, 65+) × 성별(남성, 여성, 알수없음)
- **레이아웃**: 차트만 표시, 범례 하단 중앙

---

### 4. 크리에이티브 컴포넌트

#### BestCreatives (BEST 소재)
- **파일**: `src/views/admin/default/components/BestCreatives.js`
- **기능**: 상위 6개 크리에이티브 표시 (랭킹 배지 포함)
- **필터**: 매체별 필터 (네이버, 구글, 메타, 카카오)
- **데이터 구조**:
```javascript
{
  adName: "광고명",
  media: "네이버",
  impressions: 10000,
  clicks: 500,
  conversions: 30,
  cost: 150000,
  revenue: 500000,
  roas: 3.33,
  imageUrl: "https://..."
}
```

#### AllCreatives (전체 소재)
- **파일**: `src/views/admin/default/components/AllCreatives.js`
- **기능**: 전체 크리에이티브 목록 + 페이지네이션
- **필터**: 매체별, 캠페인별
- **정렬**: 노출수, 클릭수, 전환수, 비용, 매출, ROAS
- **페이지네이션**: 12개/페이지 (2행 × 6열)
- **자동 리셋**: 필터/정렬 변경 시 1페이지로 이동

---

## DateRangeContext 전역 상태

**위치**: `src/contexts/DateRangeContext.js`

**제공 값**:
```javascript
{
  startDate: "2024-12-23",      // YYYY-MM-DD 형식
  endDate: "2024-12-26",
  selectedPreset: "이번 주",
  setStartDate: (date) => {},
  setEndDate: (date) => {},
  updateDateRange: (preset) => {}
}
```

**사용 예시**:
```javascript
import { useDateRange } from "contexts/DateRangeContext";

const { startDate, endDate } = useDateRange();

// useMemo로 날짜 변경 시 데이터 재생성
const chartData = useMemo(() => {
  // startDate ~ endDate 기간 데이터 생성
}, [startDate, endDate]);
```

---

## Supabase 연동 가이드 (예정)

### 1. 설치
```bash
npm install @supabase/supabase-js
```

### 2. 클라이언트 초기화
**파일 생성**: `src/lib/supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 3. 환경 변수 설정
**파일**: `.env`
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 인증 상태 관리
**파일 생성**: `src/contexts/AuthContext.js`
```javascript
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from 'lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [advertiserId, setAdvertiserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdvertiserId(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdvertiserId(session.user.id);
      } else {
        setAdvertiserId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdvertiserId = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('advertiser_id')
      .eq('id', userId)
      .single();

    if (data) setAdvertiserId(data.advertiser_id);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, advertiserId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### 5. 데이터 페칭 예시 (멀티 테넌트)
```javascript
import { supabase } from "lib/supabaseClient";
import { useAuth } from "contexts/AuthContext";
import { useEffect, useState } from "react";

const [data, setData] = useState([]);
const { advertiserId } = useAuth();

useEffect(() => {
  if (!advertiserId) return;

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('ad_performance')
      .select('*')
      .eq('advertiser_id', advertiserId)  // 광고주 필터링
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) console.error(error);
    else setData(data);
  };

  fetchData();
}, [advertiserId, startDate, endDate]);
```

**RLS 정책이 활성화되어 있으면 `eq('advertiser_id', advertiserId)` 없이도 자동 필터링되지만, 명시적으로 작성하는 것을 권장합니다.**

---

## 데이터베이스 스키마 (예정)

### 멀티 테넌트 구조

**핵심 원칙:**
- 모든 테이블에 `advertiser_id` 필드 포함
- Supabase RLS (Row Level Security)로 광고주별 데이터 격리
- 로그인한 사용자는 본인 광고주 데이터만 조회 가능

---

### advertisers (광고주 마스터)
```sql
create table advertisers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,           -- 광고주명
  business_number text,         -- 사업자번호
  contact_email text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 인덱스
create index idx_advertisers_name on advertisers(name);
```

### users (사용자 계정)
```sql
create table users (
  id uuid primary key references auth.users(id),
  advertiser_id uuid references advertisers(id) not null,
  email text not null,
  name text,
  role text default 'viewer',  -- admin, editor, viewer
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 인덱스
create index idx_users_advertiser on users(advertiser_id);

-- RLS 정책
alter table users enable row level security;

create policy "사용자는 본인 광고주의 사용자 목록만 조회"
  on users for select
  using (advertiser_id = (select advertiser_id from users where id = auth.uid()));
```

### ad_performance (광고 성과 데이터)
```sql
create table ad_performance (
  id uuid primary key default uuid_generate_v4(),
  advertiser_id uuid references advertisers(id) not null,
  date date not null,
  media text not null,        -- 네이버, 구글, 메타, 카카오
  campaign text,
  ad_name text,
  impressions integer,
  clicks integer,
  conversions integer,
  cost numeric,
  revenue numeric,
  roas numeric,
  created_at timestamp default now()
);

-- 인덱스
create index idx_ad_performance_advertiser on ad_performance(advertiser_id);
create index idx_ad_performance_date on ad_performance(advertiser_id, date desc);
create index idx_ad_performance_media on ad_performance(advertiser_id, media);

-- RLS 정책
alter table ad_performance enable row level security;

create policy "광고주는 본인 데이터만 조회"
  on ad_performance for select
  using (advertiser_id = (select advertiser_id from users where id = auth.uid()));

create policy "광고주는 본인 데이터만 입력"
  on ad_performance for insert
  with check (advertiser_id = (select advertiser_id from users where id = auth.uid()));
```

### creative_performance (크리에이티브 성과)
```sql
create table creative_performance (
  id uuid primary key default uuid_generate_v4(),
  advertiser_id uuid references advertisers(id) not null,
  ad_name text not null,
  media text not null,
  campaign text,
  image_url text,
  impressions integer,
  clicks integer,
  conversions integer,
  cost numeric,
  revenue numeric,
  roas numeric,
  date_range daterange,
  created_at timestamp default now()
);

-- 인덱스
create index idx_creative_performance_advertiser on creative_performance(advertiser_id);
create index idx_creative_performance_media on creative_performance(advertiser_id, media);

-- RLS 정책
alter table creative_performance enable row level security;

create policy "광고주는 본인 크리에이티브만 조회"
  on creative_performance for select
  using (advertiser_id = (select advertiser_id from users where id = auth.uid()));
```

### purchase_demographics (구매 인구통계)
```sql
create table purchase_demographics (
  id uuid primary key default uuid_generate_v4(),
  advertiser_id uuid references advertisers(id) not null,
  date date not null,
  age_group text,             -- 18-24, 25-34, 35-44, 45-64, 65+
  gender text,                -- 남성, 여성, 알수없음
  purchase_count integer,
  created_at timestamp default now()
);

-- 인덱스
create index idx_purchase_demographics_advertiser on purchase_demographics(advertiser_id);
create index idx_purchase_demographics_date on purchase_demographics(advertiser_id, date desc);

-- RLS 정책
alter table purchase_demographics enable row level security;

create policy "광고주는 본인 구매 데이터만 조회"
  on purchase_demographics for select
  using (advertiser_id = (select advertiser_id from users where id = auth.uid()));
```

---

## 주요 작업 이력

### 2024-12-26
1. **BestCreatives**: 12개 페이지네이션 → 6개 단순 표시로 롤백
2. **AllCreatives**: 12개/페이지 페이지네이션 추가 (2행 × 6열)
3. **GenderPurchasePie**: 차트 크기 증가, 회색 배경 제거 (CSS sx prop 사용)
4. **AgeGenderPurchase**: 총 구매수 섹션 제거, 차트만 표시
5. **차트 레이아웃 순서 수정**: WeeklyConversions → GenderPurchasePie → AgeGenderPurchase
6. **CLAUDE.md 작성**: 프로젝트 전체 문서화
7. **멀티 테넌트 구조 추가**: 광고주별 데이터 격리, RLS 정책, 인증 시스템

---

## 멀티 테넌트 아키텍처 상세

### 데이터 격리 전략

**1. 데이터베이스 레벨**
- 모든 데이터 테이블에 `advertiser_id` 컬럼 필수
- Foreign Key로 advertisers 테이블 참조
- RLS 정책으로 쿼리 레벨에서 자동 필터링

**2. 애플리케이션 레벨**
- AuthContext로 현재 사용자의 advertiser_id 전역 관리
- 모든 데이터 조회 시 advertiser_id 필터 적용
- 컴포넌트는 AuthContext에서 advertiserId를 가져와 사용

**3. 보안**
- Supabase RLS로 백엔드 레벨 보안 보장
- 악의적인 클라이언트에서 다른 광고주 데이터 조회 불가
- auth.uid()로 현재 로그인 사용자 확인

### 사용자 흐름

1. **로그인**
   - 이메일/비밀번호로 Supabase Auth 인증
   - auth.uid() 획득

2. **광고주 확인**
   - users 테이블에서 auth.uid()로 advertiser_id 조회
   - AuthContext에 저장

3. **데이터 조회**
   - 모든 쿼리에 advertiser_id 필터 자동 적용
   - RLS 정책으로 2중 보안

4. **로그아웃**
   - Supabase Auth 세션 종료
   - AuthContext 초기화

### 확장 시나리오

**단일 광고주 (초기)**
- advertiser_id는 항상 동일
- 사용자 1명
- RLS 정책은 있지만 실질적으로 모든 데이터 조회 가능

**다수 광고주 (확장)**
- 광고주별로 users 레코드 생성
- 각 광고주는 본인 데이터만 조회
- 관리자 계정으로 여러 광고주 전환 가능

**엔터프라이즈 (미래)**
- 조직(organization) 개념 추가
- 조직 내 여러 광고주 그룹핑
- 세분화된 권한 관리 (팀별, 부서별)

---

## 다음 작업 (Supabase 연동)

### Phase 1: Supabase 설정
1. Supabase 프로젝트 생성
2. 테이블 스키마 생성
   - advertisers (광고주 마스터)
   - users (사용자 계정)
   - ad_performance (광고 성과)
   - creative_performance (크리에이티브)
   - purchase_demographics (구매 인구통계)
3. RLS (Row Level Security) 정책 설정
   - 모든 테이블에 advertiser_id 기반 정책 적용
   - auth.uid()로 현재 사용자의 광고주 확인
4. 인덱스 생성 (advertiser_id, date 등)
5. API 키 발급

### Phase 2: 인증 시스템 구축
1. Supabase Auth 설정 (이메일 로그인)
2. AuthContext 구현 (`src/contexts/AuthContext.js`)
3. 로그인/로그아웃 페이지 추가
4. Protected Route 구현 (미로그인 시 대시보드 접근 차단)
5. 광고주 선택 기능 (관리자용, 여러 광고주 관리 시)

### Phase 3: 데이터 마이그레이션
1. 광고주 데이터 생성 (advertisers 테이블)
2. 사용자 계정 생성 및 광고주 연결
3. Google Sheets 데이터 export
4. advertiser_id 추가하여 Supabase 테이블에 import
5. 데이터 검증

### Phase 4: Frontend 연동
1. `@supabase/supabase-js` 설치 및 초기화
2. AuthProvider로 App 감싸기
3. 각 컴포넌트별 데이터 페칭 로직 추가
   - TotalSpent: 일자별 매출 조회 (advertiser_id 필터)
   - MediaAdCost: 매체별 비용 집계 (advertiser_id 필터)
   - BestCreatives: 성과 상위 6개 조회 (advertiser_id 필터)
   - AllCreatives: 전체 목록 + 필터링/정렬 (advertiser_id 필터)
   - GenderPurchasePie: 성별 구매 통계 (advertiser_id 필터)
   - AgeGenderPurchase: 연령대×성별 구매 통계 (advertiser_id 필터)
4. 로딩 상태 및 에러 처리 추가
5. Mock 데이터 제거

### Phase 5: 권한 관리 (선택)
1. 사용자 역할별 기능 제한 (admin, editor, viewer)
2. 관리자 페이지 추가 (사용자 관리, 광고주 관리)

### Phase 6: 실시간 업데이트 (선택)
1. Supabase Realtime 구독
2. 데이터 변경 시 자동 리렌더링

---

## Horizon UI 템플릿 사용 지침

### 작업 시작 전 필수 확인사항
외부 라이브러리 설치 전 반드시 확인:
- `src/components/` 폴더에 유사한 컴포넌트가 이미 존재하는지 Glob 도구로 검색
- `package.json`에 필요한 라이브러리가 이미 설치되어 있는지 확인
- Horizon UI 템플릿의 예제 페이지들을 먼저 탐색

**예시**:
- 달력 UI 필요 시: `**/*[Cc]alendar*.{js,jsx}` 검색 → `src/components/calendar/MiniCalendar.js` 확인
- 차트 필요 시: `src/components/charts/` 폴더 확인
- 테이블 필요 시: `src/views/admin/dataTables/` 예제 확인

### 이미 설치된 주요 라이브러리
- `@chakra-ui/react`: UI 프레임워크
- `react-calendar`: 달력 컴포넌트
- `react-icons`: 아이콘 (MdCalendarToday, MdChevronLeft 등)
- `@tanstack/react-table`: 테이블 라이브러리
- `apexcharts + react-apexcharts`: 차트 라이브러리

### UI 디자인 톤앤매너

**색상 시스템 (useColorModeValue 사용)**:
- `textColor`: ('secondaryGray.900', 'white')
- `borderColor`: ('gray.200', 'whiteAlpha.100')
- `brandColor`: ('brand.500', 'brand.400')
- `inputBg`: ('white', 'navy.700')
- `bgHover`: ('secondaryGray.100', 'whiteAlpha.100')

**타이포그래피 규칙**:
- 페이지/카드 제목: `fontSize='22px' fontWeight='700'`
- 섹션 제목: `fontSize='lg' fontWeight='700'`
- 테이블 헤더: `fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'`
- 테이블 데이터: `fontSize='sm' fontWeight='700'`
- 버튼 텍스트: `fontWeight='500'` (일반), `fontWeight='600'` (활성)

**레이아웃 패턴**:
- Card 패딩: `p='20px'` (일반), `px='0px'` (테이블)
- Border Radius: `borderRadius='16px'` (Input, Button), `borderRadius='6px'` (작은 버튼)
- 간격: `gap='20px'` (주요 요소), `gap='8px'` (밀접한 요소)
- 여백: `mb='20px'` (카드 간격)

### UI Color Rules (Horizon UI Chakra)
- 모든 UI 색상은 Chakra UI theme color tokens만 사용한다.
- 임의의 HEX 컬러(#xxxxxx)는 사용하지 않는다.

**Brand**:
- 메인 강조 색상: `brand.500`
- 보조 강조 색상: `brand.400`, `brand.600`

**Neutral (Background / Text)**:
- 배경 및 카드: `gray.50` ~ `gray.900`
- 텍스트 대비는 다크/라이트 모드에 맞게 자동 적용

**Performance / Status**:
- 성과 긍정 (매출, ROAS 상승): `green.400`, `green.500`
- 비용, 하락: `red.400`, `red.500`
- 보통/주의: `orange.400`

**Info / Secondary**:
- 정보성 지표: `blue.400`
- 보조 강조: `teal.400`, `cyan.400`

**Charts**:
- 차트 색상은 반드시 `theme.colors`에서 참조한다.
- 하드코딩된 색상은 사용할 경우 허락을 받는다.

---

## 개발 워크플로우

### UI 컴포넌트 작업 시
1. 유사한 기존 컴포넌트 검색 (`src/views/admin/` 예제 페이지 확인)
2. 기존 컴포넌트의 스타일 패턴 참조
3. `useColorModeValue`로 라이트/다크 모드 대응
4. 반응형 속성 활용: `{{ sm: '값1', md: '값2', lg: '값3' }}`

### 데이터 연동 시
1. Context API 확인 (`src/contexts/`)
2. `useMemo`로 데이터 연산 최적화
3. props 기본값 설정으로 유연성 확보

### 스타일 일관성 유지
1. 새 컴포넌트 작성 전 동일 카테고리의 기존 컴포넌트 Read 필수
2. 색상, 폰트, 간격은 기존 패턴 그대로 사용
3. 커스텀 CSS는 최소화, Chakra UI props 우선 활용

---

## 참고 파일 경로

### Context
- DateRangeContext: `src/contexts/DateRangeContext.js`

### 재사용 컴포넌트
- DateRangePicker: `src/components/fields/DateRangePicker.js`
- MiniCalendar: `src/components/calendar/MiniCalendar.js`
- BarChart: `src/components/charts/BarChart.js`
- LineChart: `src/components/charts/LineChart.js`
- PieChart: `src/components/charts/PieChart.js`
- Card: `src/components/card/Card.js`
- MiniStatistics: `src/components/card/MiniStatistics.js`

### 대시보드 컴포넌트
- index.jsx: `src/views/admin/default/index.jsx`
- TotalSpent: `src/views/admin/default/components/TotalSpent.js`
- WeeklyRevenue: `src/views/admin/default/components/WeeklyRevenue.js`
- DailyAdCost: `src/views/admin/default/components/DailyAdCost.js`
- MediaAdCost: `src/views/admin/default/components/MediaAdCost.js`
- ROASAdCost: `src/views/admin/default/components/ROASAdCost.js`
- WeeklyConversions: `src/views/admin/default/components/WeeklyConversions.js`
- GenderPurchasePie: `src/views/admin/default/components/GenderPurchasePie.js`
- AgeGenderPurchase: `src/views/admin/default/components/AgeGenderPurchase.js`
- BestCreatives: `src/views/admin/default/components/BestCreatives.js`
- AllCreatives: `src/views/admin/default/components/AllCreatives.js`

---

## 알려진 이슈 및 해결책

### ApexCharts Pie Chart 회색 배경
**문제**: Pie Chart 타입만 회색 SVG 배경이 자동 생성됨
**원인**: ApexCharts 내부 렌더링 방식, `chart.background` 옵션으로 제거 불가
**해결**: Chakra UI `sx` prop으로 CSS 강제 오버라이드
```javascript
<Box sx={{
  '& .apexcharts-canvas': { background: 'transparent !important' },
  '& .apexcharts-canvas svg': { background: 'transparent !important' }
}}>
  <ReactApexChart type='pie' ... />
</Box>
```

---

## 드롭다운 컴포넌트 구성

### 참조 구현

```jsx
<Menu>
  <MenuButton
    as={Button}
    rightIcon={<MdKeyboardArrowDown />}
    bg={inputBg}
    border='1px solid'
    borderColor={borderColor}
    color={textColor}
    fontWeight='500'
    fontSize='sm'
    _hover={{ bg: bgHover }}
    _active={{ bg: bgHover }}
    px='16px'
    h='36px'
    borderRadius='12px'>
    {selectedValue}
  </MenuButton>
  <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
    {options.map((option) => (
      <MenuItem
        key={option}
        onClick={() => handleSelect(option)}
        bg={selectedValue === option ? brandColor : 'transparent'}
        color={selectedValue === option ? 'white' : textColor}
        _hover={{
          bg: selectedValue === option ? brandColor : bgHover,
        }}
        fontWeight={selectedValue === option ? '600' : '500'}
        fontSize='sm'
        px='12px'
        py='8px'
        borderRadius='8px'
        justifyContent='center'
        textAlign='center'
        minH='auto'>
        {option}
      </MenuItem>
    ))}
  </MenuList>
</Menu>
```

### 필수 import

```jsx
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from '@chakra-ui/react';

import { MdKeyboardArrowDown } from 'react-icons/md';
```

### 필수 color mode

```jsx
const inputBg = useColorModeValue('white', 'navy.700');
const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
const brandColor = useColorModeValue('brand.500', 'white');
```

---

## 권한 관리 시스템

### 권한 체계 (Role-Based Access Control)

**4단계 계층 구조**:
1. **마스터**: `master` - 시스템 원작자, 모든 권한 및 기능 접근 가능
2. **대행사** (`organizationType: 'agency'`):
   - `org_admin` - 대행사 최고관리자 (조직 생성, 사용자 관리)
   - `org_manager` - 대행사 관리자 (클라이언트 관리, 게시판 작성)
   - `org_staff` - 대행사 직원 (데이터 조회, 보고서 생성)
3. **클라이언트/브랜드** (`organizationType: 'advertiser'`):
   - `advertiser_admin` - 클라이언트 최고관리자 (브랜드 관리, 사용자 초대)
   - `manager` - 클라이언트 관리자 (데이터 조회, 게시판 작성)
   - `editor` - 클라이언트 편집자 (데이터 조회, 편집)
   - `viewer` - 클라이언트 뷰어 (데이터 조회만)
4. **권한 계층값** (높을수록 상위 권한):
   ```javascript
   master: 8
   org_admin: 7
   org_manager: 6
   org_staff: 5
   advertiser_admin: 4
   manager: 3
   editor: 2
   viewer: 1
   ```

### AuthContext 구현

**파일**: `src/contexts/AuthContext.js`

현재는 Mock 데이터로 작동하며, Supabase 연동 시 실제 인증으로 전환 예정.

**Mock 사용자 설정** (개발/테스트용):
```javascript
const mockUser = {
  id: 'mock-user-id',
  email: 'dev@example.com',
  role: 'master', // ← 여기를 변경해서 다른 권한 테스트
};

setUser(mockUser);
setRole(mockUser.role);
setOrganizationId(null); // 마스터는 조직에 속하지 않음
setAdvertiserId(null); // 마스터는 특정 브랜드에 속하지 않음
setOrganizationType('master'); // 마스터 타입

// Mock: 접근 가능한 브랜드 목록 설정
const mockAdvertisers = [
  { id: 'adv-nike', name: '나이키', organizationId: 'org-nike' },
  { id: 'adv-adidas', name: '아디다스', organizationId: 'org-adidas' },
  { id: 'adv-peppertux', name: '페퍼툭스', organizationId: 'org-pepper' },
  { id: 'adv-onnuri', name: '온누리스토어', organizationId: 'org-pepper' }, // 같은 회사
];
setAvailableAdvertisers(mockAdvertisers);
setCurrentAdvertiserId(null); // 전체 보기로 시작
```

**제공하는 값 및 함수**:
```javascript
const {
  // 사용자 정보
  user,                    // 현재 로그인 사용자
  role,                    // 사용자 권한
  organizationType,        // 'master' | 'agency' | 'advertiser'
  organizationId,          // 조직 ID
  advertiserId,            // 브랜드 ID (클라이언트만)
  loading,                 // 인증 로딩 상태

  // 인증 함수
  signIn,                  // 로그인
  signUp,                  // 회원가입
  signOut,                 // 로그아웃

  // 권한 체크 헬퍼
  isMaster,                // master인지 확인
  isOrgAdmin,              // 대행사 관리자급인지 확인
  isAdvertiserAdmin,       // 브랜드 관리자급인지 확인
  canEdit,                 // 편집 권한이 있는지 확인
  isAgency,                // 대행사인지 확인

  // 브랜드 전환 기능
  availableAdvertisers,    // 접근 가능한 브랜드 목록
  currentAdvertiserId,     // 현재 선택된 브랜드 ID (null = 전체)
  switchAdvertiser,        // 브랜드 전환 함수

  // 알림 기능
  apiNotifications,        // API 오류 알림 목록
  boardNotifications,      // 게시판 알림 목록
  allNotifications,        // 모든 알림 통합 (API + Board)
  addApiNotification,      // API 알림 추가
  addBoardNotification,    // 게시판 알림 추가
  markNotificationAsRead,  // 알림 읽음 처리
  markAllNotificationsAsRead, // 모든 알림 읽음 처리
  removeNotification,      // 알림 삭제
} = useAuth();
```

### 레이아웃별 접근 권한

**5개 레이아웃 구조**:

1. **Admin Layout** (`/admin/*`):
   - **목적**: 메인 대시보드 (광고 성과 분석, 차트, 크리에이티브)
   - **접근**: 모든 권한 접근 가능
   - **파일**: `src/layouts/admin/index.js`
   - **주요 페이지**:
     - `/admin/default` - 메인 대시보드
     - `/admin/data-tables` - 데이터 테이블
     - `/admin/profile` - 프로필 및 알림

2. **SuperAdmin Layout** (`/superadmin/*`):
   - **목적**: 대행사 관리자 전용 (조직 관리, API 토큰, 광고주 관리)
   - **접근**: `master`, `org_admin`, `org_manager`, `org_staff`, `advertiser_admin`, `manager`
   - **파일**: `src/layouts/superadmin/index.js`
   - **주요 페이지**:
     - `/superadmin/default` - 슈퍼어드민 대시보드
     - `/superadmin/organizations` - 조직 관리 (master 전용)
     - `/superadmin/advertisers` - 광고주 관리
     - `/superadmin/api-management` - API 토큰 관리
     - `/superadmin/users` - 사용자 관리
     - `/superadmin/board` - 슈퍼어드민 게시판

3. **ClientAdmin Layout** (`/brandadmin/*` 또는 `/clientadmin/*`):
   - **목적**: 브랜드 관리자 전용 (브랜드 관리, 팀 관리)
   - **접근**: `organizationType === 'advertiser'` + 관리자급 권한
   - **마스터 예외**: master는 항상 접근 가능
   - **파일**: `src/layouts/clientadmin/index.js`
   - **주요 페이지**:
     - `/brandadmin/default` - 브랜드 대시보드
     - `/brandadmin/users` - 브랜드 팀 관리
     - `/brandadmin/board` - 브랜드 게시판

4. **Master Layout** (`/master/*`):
   - **목적**: 마스터 전용 (시스템 설정, 전체 관리)
   - **접근**: `master` 전용
   - **파일**: `src/layouts/master/index.js`
   - **주요 페이지**: 시스템 전체 설정 및 관리

5. **Auth Layout** (`/auth/*`):
   - **목적**: 인증 (로그인, 회원가입, 비밀번호 재설정)
   - **접근**: 비로그인 사용자
   - **파일**: `src/layouts/auth/index.js`
   - **주요 페이지**:
     - `/auth/sign-in` - 로그인
     - `/auth/sign-up` - 회원가입 (초대 기반 + 자가 가입)
     - `/auth/forgot-password` - 비밀번호 찾기
     - `/auth/reset-password` - 비밀번호 재설정

### 사이드바 메뉴 권한

**파일**: `src/components/sidebar/components/Links.js`

메뉴별 플래그:
- `masterOnly`: master만 표시
- `orgAdminOnly`: 조직 레벨 관리자만 표시
- `adminOnly`: 관리자급만 표시
- `agencyOnly`: 대행사만 표시 (마스터는 예외)
- `advertiserOnly`: 클라이언트만 표시 (마스터는 예외)

---

## 사용자 초대 시스템

### InviteUserModal 구조

**파일**: `src/views/admin/users/components/InviteUserModal.jsx`

**초대 유형**:
1. **기존 조직에 신규 사용자 추가**: 일반적인 팀원 초대
2. **신규 광고주 조직 생성**: 대행사가 새 클라이언트 추가
3. **기존 조직에 신규 브랜드 추가**: 추가 브랜드 관리

### 권한별 초대 가능한 역할

**권한 계층 구조**:
```javascript
master: 8
org_admin: 7            // 대행사 최고관리자
org_manager: 6          // 대행사 관리자
org_staff: 5            // 대행사 직원
advertiser_admin: 4     // 클라이언트 최고관리자
manager: 3              // 클라이언트 관리자
editor: 2               // 편집자
viewer: 1               // 뷰어
```

**초대 규칙**:
- `org_admin`은 절대 초대 불가 (master만 생성 가능)
- 자신보다 높거나 같은 권한은 부여 불가
- 신규 광고주 초대 시: `advertiser_admin`만 가능
- 대행사는 클라이언트 직원까지 모두 초대 가능
- `advertiser_admin`은 `manager`, `editor`, `viewer`만 초대 가능

### 초대 프로세스

1. **초대 생성**:
   - 초대자가 이메일, 이름, 권한 입력
   - 초대 토큰 생성 (TODO: Supabase Function)
   - 이메일 발송 (TODO: Supabase Email Template)

2. **초대 수락**:
   - 초대 링크 클릭 → 회원가입 페이지 이동
   - 초대 토큰 검증
   - 비밀번호 설정
   - 계정 생성 및 조직/권한 자동 할당

---

## 회원가입 시스템

**파일**: `src/views/auth/signUp/index.jsx`

### 가입 유형

**1. 초대 가입** (`src/views/auth/signUp/components/InviteSignUpForm.jsx`):
- URL에 `token` 파라미터 존재 시
- 초대 토큰 검증 (TODO: Supabase)
- 이메일/이름/권한 자동 입력
- 비밀번호만 설정

**2. 자가 가입** (`src/views/auth/signUp/components/SelfSignUpForm.jsx`):
- 일반 회원가입 (현재 비활성화 가능)
- 이메일, 이름, 비밀번호, 조직 정보 입력
- 이메일 인증 필요 (TODO: Supabase)

### 이메일 인증 (TODO)

Supabase Email Auth 사용 예정:
```javascript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://yourdomain.com/verify-email',
  }
});
```

---

## 레이아웃 정렬 가이드

### 표준 패딩 규칙

**페이지 헤더**: `px="25px"` 필수
- Card의 기본 padding과 일치시켜 수평 정렬 유지
- 모든 페이지 제목, 설명, 액션 버튼 영역에 적용

**적용 파일**:
- `src/views/superadmin/default/index.jsx`
- `src/views/superadmin/organizations/index.jsx`
- `src/views/superadmin/api-management/index.jsx`
- `src/views/admin/users/index.jsx`

**예시**:
```jsx
<Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
  <Flex justify="space-between" align="center" mb="20px" px="25px">
    <Box>
      <Heading size="lg" mb="8px">페이지 제목</Heading>
      <Text fontSize="md" color="gray.600">설명 텍스트</Text>
    </Box>
    <Button colorScheme="brand">액션 버튼</Button>
  </Flex>

  <Card px="25px" py="25px">
    {/* 내용 */}
  </Card>
</Box>
```

---

## API 토큰 관리

**파일**: `src/views/superadmin/api-management/components/APITokenTable.js`

### 드롭다운 디자인 통일

모든 Select 컴포넌트를 Menu 컴포넌트로 변경하여 일관된 디자인 적용:
- 광고주 선택 드롭다운
- 플랫폼 선택 드롭다운
- 상태 선택 드롭다운 (활성/비활성)
- 동기화 모달 플랫폼 선택

**변경 전**:
```jsx
<Select value={value} onChange={handleChange}>
  <option>옵션</option>
</Select>
```

**변경 후**: 드롭다운 컴포넌트 구성 섹션 참조

---

## 최근 업데이트 (2025-12-30)

### 🎯 핵심 아키텍처 변경

**1. 4단계 권한 체계 확립**:
- **마스터**: 시스템 원작자, 모든 권한
- **대행사 (3단계)**: org_admin, org_manager, org_staff
- **클라이언트 (4단계)**: advertiser_admin, manager, editor, viewer
- **권한 계층값**: master(8) → org_admin(7) → ... → viewer(1)

**2. 5개 레이아웃 구조**:
- **Admin**: 메인 대시보드 (모든 사용자)
- **SuperAdmin**: 대행사 관리자 전용 (조직, API, 광고주 관리)
- **ClientAdmin (BrandAdmin)**: 브랜드 관리자 전용 (브랜드 팀 관리)
- **Master**: 마스터 전용 (시스템 전체 관리)
- **Auth**: 로그인, 회원가입, 비밀번호 재설정

**3. AuthContext 통합 관리**:
- 사용자 정보, 권한, 조직 정보 중앙 관리
- 브랜드 전환 시스템 (availableAdvertisers, currentAdvertiserId)
- 알림 관리 (API 알림 + 게시판 알림 통합)
- 권한 체크 헬퍼 함수 (isMaster, isOrgAdmin, canEdit 등)

### 🚀 새로운 기능

**1. 게시판 및 알림 시스템**:
- **2종류 게시판**: 슈퍼어드민 게시판 vs 브랜드 게시판
- **알림 대상 선택**: 권한 및 게시판 타입에 따라 동적 옵션 제공
- **2종류 알림**: API 오류 알림(빨강) + 게시판 알림(보라)
- **알림 표시**: 상단 카드(최대 3개) + 하단 리스트(스크롤)
- **게시글 모달**: 알림 클릭 시 자동 오픈 + 읽음 처리

**2. 브랜드 전환 시스템**:
- **대행사/마스터**: 여러 브랜드 관리, 브랜드 전환 가능
- **클라이언트**: 본인 브랜드만 조회, 전환 불가
- **전체 보기**: currentAdvertiserId가 null이면 전체 브랜드 조회
- **Supabase 연동 준비**: last_selected_advertiser_id 필드로 선택 기억

**3. 데이터 수집 상태 모니터링**:
- **오전 10시 기준**: 전일(D-1) 데이터 수집 상태 체크
- **3가지 상태**: success(정상), error(실패), pending(대기)
- **API 토큰 테이블**: 플랫폼별 데이터 수집 상태 표시 (색상 구분)
- **Supabase Edge Function**: 매일 자동 체크 + Cron Job 설정
- **알림 연동**: 데이터 수집 실패 시 API 알림 자동 생성

**4. 사용자 초대 시스템**:
- **초대 유형**: 기존 조직 추가, 신규 광고주, 신규 브랜드
- **권한별 제한**: org_admin 초대 불가, 상위 권한 부여 불가
- **초대 기반 회원가입**: 토큰 검증 → 비밀번호 설정 → 자동 할당
- **이메일 발송**: Supabase Email Template (TODO)

**5. 조직 및 광고주 관리**:
- **조직 관리 페이지**: Master 전용, 조직 생성/수정/삭제
- **광고주 관리 페이지**: 브랜드 생성/수정/삭제
- **API 토큰 관리**: 플랫폼별 토큰 등록, 데이터 수집 상태 모니터링

### 🎨 UI/UX 개선

**1. 디자인 통일**:
- **드롭다운**: Select → Menu 컴포넌트 변경 (API 관리, 게시판 등)
- **페이지 헤더**: 모든 페이지 `px="25px"` 통일 (Card와 정렬)
- **색상 시스템**: Chakra UI theme tokens 준수

**2. 반응형 레이아웃**:
- **사이드바**: 권한별 메뉴 동적 표시 (masterOnly, agencyOnly 등)
- **Navbar**: 브랜드 선택 드롭다운, 알림 아이콘, 프로필 메뉴

### 📋 Supabase 연동 TODO

**1. 인증 시스템**:
- [ ] Supabase Auth 연동 (이메일 로그인)
- [ ] 이메일 인증 (회원가입 시)
- [ ] 비밀번호 재설정 플로우
- [ ] Protected Route 구현

**2. 데이터베이스**:
- [ ] 테이블 스키마 생성 (users, organizations, advertisers, api_tokens 등)
- [ ] RLS 정책 구현 (조직별, 브랜드별 데이터 격리)
- [ ] 인덱스 생성 (organization_id, advertiser_id, date 등)

**3. Edge Functions**:
- [ ] 초대 토큰 생성 및 검증
- [ ] 게시판 알림 자동 생성 (create-board-notifications)
- [ ] 데이터 수집 상태 체크 (check-yesterday-data)
- [ ] 이메일 초대장 발송

**4. Cron Jobs**:
- [ ] 매일 오전 10시 데이터 수집 상태 체크
- [ ] GitHub Actions 또는 Vercel Cron 설정

**5. Realtime**:
- [ ] 게시판 알림 실시간 업데이트
- [ ] API 토큰 상태 실시간 모니터링

### 🔧 주요 파일 경로 추가

**Contexts**:
- AuthContext: [src/contexts/AuthContext.js](src/contexts/AuthContext.js)
- DateRangeContext: [src/contexts/DateRangeContext.js](src/contexts/DateRangeContext.js)

**Layouts**:
- Admin: [src/layouts/admin/index.js](src/layouts/admin/index.js)
- SuperAdmin: [src/layouts/superadmin/index.js](src/layouts/superadmin/index.js)
- ClientAdmin: [src/layouts/clientadmin/index.js](src/layouts/clientadmin/index.js)
- Master: [src/layouts/master/index.js](src/layouts/master/index.js)
- Auth: [src/layouts/auth/index.js](src/layouts/auth/index.js)

**Utils**:
- dataCollectionChecker: [src/utils/dataCollectionChecker.js](src/utils/dataCollectionChecker.js)

**게시판 및 알림**:
- 게시판 메인: [src/views/shared/board/index.jsx](src/views/shared/board/index.jsx)
- 게시글 작성 모달: [src/views/shared/board/components/CreatePostModal.jsx](src/views/shared/board/components/CreatePostModal.jsx)
- 게시글 보기 모달: [src/views/shared/board/components/ViewPostModal.jsx](src/views/shared/board/components/ViewPostModal.jsx)
- 알림 컴포넌트: [src/views/admin/profile/components/Notifications.js](src/views/admin/profile/components/Notifications.js)

**사용자 관리**:
- 사용자 초대 모달: [src/views/admin/users/components/InviteUserModal.jsx](src/views/admin/users/components/InviteUserModal.jsx)
- 사용자 수정 모달: [src/views/admin/users/components/EditUserModal.jsx](src/views/admin/users/components/EditUserModal.jsx)
- 사용자 테이블: [src/views/admin/users/components/UserTable.js](src/views/admin/users/components/UserTable.js)

**API 관리**:
- API 토큰 테이블: [src/views/superadmin/api-management/components/APITokenTable.js](src/views/superadmin/api-management/components/APITokenTable.js)

**회원가입**:
- 초대 기반 가입: [src/views/auth/signUp/components/InviteSignUpForm.jsx](src/views/auth/signUp/components/InviteSignUpForm.jsx)
- 자가 가입: [src/views/auth/signUp/components/SelfSignUpForm.jsx](src/views/auth/signUp/components/SelfSignUpForm.jsx)

---

## 게시판 및 알림 시스템

### 개요

게시판은 관리자(마스터, 대행사 관리자, 브랜드 관리자)가 사용자에게 공지사항과 알림을 전달하는 시스템입니다.

**파일 위치**:
- 게시판 메인: `src/views/shared/board/index.jsx`
- 게시글 작성 모달: `src/views/shared/board/components/CreatePostModal.jsx`
- 게시글 보기 모달: `src/views/shared/board/components/ViewPostModal.jsx`
- 알림 컴포넌트: `src/views/admin/profile/components/Notifications.js`

### 주요 기능

**1. 게시판 페이지** (`src/views/shared/board/index.jsx`):
- 게시글 목록 테이블 표시 (제목, 작성자, 대상, 작성일, 읽음상태)
- 제목 클릭 시 게시글 상세 모달 표시
- 권한에 따른 글 작성 버튼 표시 (master, org_admin, org_manager, advertiser_admin, manager)
- **브랜드 게시판 vs 슈퍼어드민 게시판 자동 판단**: URL 경로로 구분 (`/brandadmin/` 포함 여부)

**2. 게시글 작성** (`CreatePostModal.jsx`):
- 제목, 내용 입력
- **알림 대상 선택 (권한 및 게시판 타입에 따라 동적)**:
  - **슈퍼어드민 게시판** (master, org_admin, org_manager):
    - 모든 사용자 (대행사 + 브랜드)
    - 대행사 소속만
    - 모든 브랜드
    - 특정 브랜드 선택
  - **브랜드 게시판** (advertiser_admin, manager) 또는 `/brandadmin/` 경로:
    - 내 브랜드만
    - 특정 브랜드 선택 (본인 회사 보유 브랜드만)
- 게시 시 게시판 목록에 추가 + 대상 사용자에게 알림 생성

**3. 알림 시스템** (`Notifications.js`):
- **2가지 알림 타입**:
  - **API 알림**: API 오류 등 시스템 알림 (빨간색)
  - **게시판 알림**: 새 게시글 알림 (보라색)
- **3가지 표시 영역**:
  - 상단 카드 (최대 3개): 최근 알림 강조 표시, X 버튼으로 삭제
  - 하단 리스트 (스크롤): 모든 알림 목록, 읽음/안읽음 상태 표시
  - New 배지: 읽지 않은 알림 표시
- **알림 클릭 시**: 게시글 모달 자동 오픈 + 읽음 처리

**4. 게시글 보기 모달** (`ViewPostModal.jsx`):
- 제목, 작성자, 작성일, 대상, 내용 표시
- 게시판 페이지 또는 알림에서 호출 가능

### AuthContext 통합

**게시판/알림 관련 제공 값**:
```javascript
const {
  // 브랜드 관리
  availableAdvertisers,    // 접근 가능한 브랜드 목록
  advertiserId,            // 현재 사용자의 브랜드 ID

  // 알림 관리
  apiNotifications,        // API 알림 목록
  boardNotifications,      // 게시판 알림 목록
  addBoardNotification,    // 게시판 알림 추가
  markNotificationAsRead,  // 알림 읽음 처리
  removeNotification,      // 알림 삭제
} = useAuth();
```

### 데이터 구조

**게시글 (Post)**:
```javascript
{
  id: number,              // 게시글 ID (Date.now())
  title: string,           // 제목
  content: string,         // 내용
  author: string,          // 작성자 ('Admin')
  date: string,            // 작성일 (YYYY. MM. DD.)
  targets: string[],       // 대상 목록 ['모든 사용자', '내 브랜드']
  isRead: boolean,         // 읽음 여부
}
```

**알림 (Notification)**:
```javascript
{
  id: number,              // 알림 ID (Date.now())
  timestamp: string,       // 생성 시각 (ISO 8601)
  read: boolean,           // 읽음 여부
  type: string,            // 'board' | 'error'

  // 게시판 알림 추가 필드
  title: string,           // 알림 제목 ('새 게시글')
  message: string,         // 알림 메시지 (게시글 제목)
  postId: number,          // 게시글 ID
  postTitle: string,       // 게시글 제목
  postContent: string,     // 게시글 내용
  author: string,          // 작성자
  date: string,            // 작성일
  targets: string[],       // 대상 목록
}
```

### 브랜드 필터링 로직

**파일**: `CreatePostModal.jsx`

**브랜드 관리자 판단**:
```javascript
const isBrandAdmin = ['advertiser_admin', 'manager'].includes(role);
```

**보유 브랜드 필터링**:
```javascript
const myBrands = isBrandAdmin
  ? availableAdvertisers.filter(adv => adv.id === advertiserId)
  : availableAdvertisers;
```

**대상 선택 옵션 결정**:
```javascript
const getTargetOptions = () => {
  // 브랜드 게시판에서는 브랜드 옵션만 표시
  if (boardType === 'brand') {
    return [
      { value: 'my_brands', label: '내 브랜드만' },
      { value: 'specific_brands', label: '특정 브랜드 선택' },
    ];
  }

  // 슈퍼어드민 게시판에서는 권한에 따라 표시
  if (isSuperAdmin) {
    return [
      { value: 'all', label: '모든 사용자 (대행사 + 브랜드)' },
      { value: 'agency', label: '대행사 소속만' },
      { value: 'all_brands', label: '모든 브랜드' },
      { value: 'specific_brands', label: '특정 브랜드 선택' },
    ];
  } else {
    return [
      { value: 'my_brands', label: '내 브랜드만' },
      { value: 'specific_brands', label: '특정 브랜드 선택' },
    ];
  }
};
```

### Supabase 연동 가이드

#### 테이블 스키마

**board_posts (게시글)**:
```sql
create table board_posts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id),
  title text not null,
  content text not null,
  author_id uuid references users(id) not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_board_posts_org on board_posts(organization_id);
create index idx_board_posts_created on board_posts(created_at desc);

-- RLS 정책
alter table board_posts enable row level security;

create policy "사용자는 본인 조직의 게시글만 조회"
  on board_posts for select
  using (
    organization_id = (select organization_id from users where id = auth.uid())
    or organization_id is null  -- 전체 공지
  );

create policy "관리자만 게시글 작성"
  on board_posts for insert
  with check (
    exists (
      select 1 from users
      where id = auth.uid()
      and role in ('master', 'org_admin', 'org_manager', 'advertiser_admin', 'manager')
    )
  );
```

**board_post_targets (게시글 대상)**:
```sql
create table board_post_targets (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references board_posts(id) on delete cascade,
  target_type text not null,  -- 'all', 'agency', 'all_brands', 'my_brands', 'specific_brands'
  advertiser_id uuid references advertisers(id),  -- specific_brands인 경우
  created_at timestamp default now()
);

create index idx_board_post_targets_post on board_post_targets(post_id);
create index idx_board_post_targets_advertiser on board_post_targets(advertiser_id);
```

**board_notifications (게시판 알림)**:
```sql
create table board_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  post_id uuid references board_posts(id) on delete cascade,
  read boolean default false,
  created_at timestamp default now()
);

create index idx_board_notifications_user on board_notifications(user_id, read);
create index idx_board_notifications_created on board_notifications(created_at desc);

-- RLS 정책
alter table board_notifications enable row level security;

create policy "사용자는 본인 알림만 조회"
  on board_notifications for select
  using (user_id = auth.uid());

create policy "사용자는 본인 알림만 수정"
  on board_notifications for update
  using (user_id = auth.uid());
```

#### 데이터 페칭 예시

**게시글 목록 조회**:
```javascript
const fetchPosts = async () => {
  const { data, error } = await supabase
    .from('board_posts')
    .select(`
      *,
      author:users!board_posts_author_id_fkey(name),
      targets:board_post_targets(target_type, advertiser:advertisers(name))
    `)
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  else setPosts(data);
};
```

**게시글 작성**:
```javascript
const createPost = async ({ title, content, targetType, selectedBrands }) => {
  // 1. 게시글 생성
  const { data: post, error: postError } = await supabase
    .from('board_posts')
    .insert({
      title,
      content,
      author_id: user.id,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (postError) throw postError;

  // 2. 대상 설정
  const targets = targetType === 'specific_brands'
    ? selectedBrands.map(brandId => ({
        post_id: post.id,
        target_type: 'specific_brands',
        advertiser_id: brandId,
      }))
    : [{
        post_id: post.id,
        target_type: targetType,
      }];

  const { error: targetsError } = await supabase
    .from('board_post_targets')
    .insert(targets);

  if (targetsError) throw targetsError;

  // 3. 대상 사용자에게 알림 생성 (Supabase Function 또는 Trigger)
  await supabase.rpc('create_board_notifications', { post_id: post.id });
};
```

**알림 목록 조회**:
```javascript
const fetchNotifications = async () => {
  const { data, error } = await supabase
    .from('board_notifications')
    .select(`
      *,
      post:board_posts(id, title, content, author:users(name), created_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  else setBoardNotifications(data);
};
```

**알림 읽음 처리**:
```javascript
const markAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('board_notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) console.error(error);
};
```

#### Supabase Function (알림 생성)

**파일**: `supabase/functions/create-board-notifications/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { post_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  // 1. 게시글 대상 조회
  const { data: targets } = await supabase
    .from('board_post_targets')
    .select('target_type, advertiser_id')
    .eq('post_id', post_id)

  // 2. 대상 사용자 조회
  let targetUsers = []

  for (const target of targets) {
    if (target.target_type === 'all') {
      // 모든 사용자
      const { data } = await supabase.from('users').select('id')
      targetUsers.push(...data)
    } else if (target.target_type === 'agency') {
      // 대행사 소속만
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('organization_type', 'agency')
      targetUsers.push(...data)
    } else if (target.target_type === 'all_brands') {
      // 모든 브랜드
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('organization_type', 'advertiser')
      targetUsers.push(...data)
    } else if (target.target_type === 'specific_brands') {
      // 특정 브랜드
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('advertiser_id', target.advertiser_id)
      targetUsers.push(...data)
    } else if (target.target_type === 'my_brands') {
      // 내 브랜드 (작성자의 브랜드)
      const { data: author } = await supabase
        .from('board_posts')
        .select('author_id')
        .eq('id', post_id)
        .single()

      const { data: authorInfo } = await supabase
        .from('users')
        .select('advertiser_id')
        .eq('id', author.author_id)
        .single()

      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('advertiser_id', authorInfo.advertiser_id)
      targetUsers.push(...data)
    }
  }

  // 3. 알림 생성
  const notifications = [...new Set(targetUsers.map(u => u.id))].map(userId => ({
    user_id: userId,
    post_id: post_id,
  }))

  await supabase.from('board_notifications').insert(notifications)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### 현재 제약사항 (Mock 데이터)

**메모리 기반 상태**:
- 게시글 목록: useState로 관리 → 페이지 새로고침 시 초기화
- 알림 목록: AuthContext의 state → 새로고침 시 초기화
- 읽음 상태: 메모리에만 저장

**Supabase 연동 시 해결**:
- 게시글/알림 영구 저장
- 사용자별 읽음 상태 추적
- 실시간 알림 업데이트 (Supabase Realtime)
- 대상 사용자 자동 필터링

### 주요 포인트

**1. boardType prop 전달**:
```javascript
// Board index.jsx
const isBrandBoard = window.location.pathname.includes('/brandadmin/');

<CreatePostModal
  isOpen={isCreateOpen}
  onClose={onCreateClose}
  onAddPost={handleAddPost}
  boardType={isBrandBoard ? 'brand' : 'admin'}
/>
```

**2. 권한별 옵션 동적 표시**:
- URL 경로 (`/brandadmin/`)로 브랜드 게시판 판단
- `boardType === 'brand'`이면 무조건 브랜드 옵션만 표시
- 슈퍼어드민 게시판에서는 role에 따라 옵션 표시

**3. 브랜드 필터링**:
- 브랜드 관리자: `advertiserId`와 일치하는 브랜드만 표시
- 슈퍼어드민: 모든 브랜드 표시

**4. 알림 클릭 동작**:
- 게시판 알림 클릭 → 읽음 처리 + 게시글 모달 오픈
- notification 데이터를 post 형식으로 변환
- ViewPostModal에 전달

**5. 드롭다운 디자인 통일**:
- Select 컴포넌트 대신 Menu 컴포넌트 사용
- API 관리 페이지와 동일한 스타일 적용
- 선택된 항목 하이라이트 (brandColor 배경)

---

## 브랜드 전환 시스템

### 개요

대행사 및 마스터는 여러 브랜드의 데이터를 관리할 수 있습니다. 브랜드 전환 시스템은 사용자가 특정 브랜드를 선택하거나 전체 보기로 전환할 수 있는 기능을 제공합니다.

**파일**: `src/contexts/AuthContext.js`

### AuthContext 제공 값

```javascript
const {
  availableAdvertisers,    // 접근 가능한 브랜드 목록
  currentAdvertiserId,     // 현재 선택된 브랜드 ID (null = 전체 보기)
  switchAdvertiser,        // 브랜드 전환 함수
} = useAuth();
```

### 브랜드 데이터 구조

```javascript
const advertiser = {
  id: 'adv-nike',              // 브랜드 ID
  name: '나이키',               // 브랜드명
  organizationId: 'org-nike',  // 소속 조직 ID
};
```

### 사용 예시

**1. 브랜드 선택 드롭다운** (Navbar):
```javascript
import { useAuth } from 'contexts/AuthContext';

const { availableAdvertisers, currentAdvertiserId, switchAdvertiser } = useAuth();

<Menu>
  <MenuButton>
    {currentAdvertiserId
      ? availableAdvertisers.find(adv => adv.id === currentAdvertiserId)?.name
      : '전체 브랜드'}
  </MenuButton>
  <MenuList>
    <MenuItem onClick={() => switchAdvertiser(null)}>
      전체 브랜드
    </MenuItem>
    {availableAdvertisers.map(adv => (
      <MenuItem key={adv.id} onClick={() => switchAdvertiser(adv.id)}>
        {adv.name}
      </MenuItem>
    ))}
  </MenuList>
</Menu>
```

**2. 데이터 조회 시 필터링**:
```javascript
const { currentAdvertiserId } = useAuth();

// Supabase 연동 시
const { data } = await supabase
  .from('ad_performance')
  .select('*')
  .eq('advertiser_id', currentAdvertiserId || advertiserId)
  .gte('date', startDate)
  .lte('date', endDate);

// currentAdvertiserId가 null이면 전체 브랜드 조회
// currentAdvertiserId가 있으면 해당 브랜드만 조회
```

### 권한별 동작

**마스터 / 대행사**:
- `availableAdvertisers`: 모든 브랜드 목록
- `currentAdvertiserId`: 사용자가 선택한 브랜드 (null = 전체)
- 브랜드 전환 가능

**클라이언트**:
- `availableAdvertisers`: 본인이 속한 브랜드만
- `currentAdvertiserId`: 본인 브랜드 ID (고정)
- 브랜드 전환 불가 (단일 브랜드만 관리)

### Supabase 연동 가이드

**users 테이블 확장**:
```sql
alter table users add column last_selected_advertiser_id uuid;
```

**브랜드 전환 시 저장**:
```javascript
const switchAdvertiser = async (advertiserId) => {
  setCurrentAdvertiserId(advertiserId);

  // Supabase에 저장
  await supabase
    .from('users')
    .update({ last_selected_advertiser_id: advertiserId })
    .eq('id', user.id);
};
```

**로그인 시 복원**:
```javascript
const { data } = await supabase
  .from('users')
  .select('last_selected_advertiser_id')
  .eq('id', user.id)
  .single();

setCurrentAdvertiserId(data.last_selected_advertiser_id);
```

---

## 데이터 수집 상태 모니터링

### 개요

광고 플랫폼(Google Ads, Meta Ads 등)으로부터 데이터를 자동 수집하는 시스템의 상태를 모니터링합니다. 오전 10시를 기준으로 전일(D-1) 데이터 수집 여부를 확인합니다.

**파일**: `src/utils/dataCollectionChecker.js`

### 데이터 수집 상태

**3가지 상태**:
- `success` - 전일 데이터 수집 완료
- `error` - 오전 10시 이후인데 전일 데이터 미수집
- `pending` - 오전 10시 이전 (아직 수집 시간 아님)

### 핵심 함수

**1. 시간 체크**:
```javascript
import { isAfter10AM, getYesterdayDate } from 'utils/dataCollectionChecker';

const isAfter10 = isAfter10AM(); // true/false
const yesterday = getYesterdayDate(); // "2024-12-29"
```

**2. 데이터 수집 상태 체크**:
```javascript
import { checkYesterdayData } from 'utils/dataCollectionChecker';

const status = await checkYesterdayData(advertiserId, platform);
// 'success' | 'error' | 'pending'
```

**3. 모든 API 토큰 일괄 체크**:
```javascript
import { checkAllTokensData } from 'utils/dataCollectionChecker';

const updatedTokens = await checkAllTokensData(apiTokens);
// 각 토큰의 dataCollectionStatus 업데이트됨
```

### API 토큰 테이블에서 활용

**파일**: `src/views/superadmin/api-management/components/APITokenTable.js`

데이터 수집 상태를 색상으로 표시:
- 🟢 **초록색 (Success)**: 정상 수집
- 🔴 **빨간색 (Error)**: 수집 실패 (오전 10시 이후)
- 🟡 **회색 (Pending)**: 대기 중 (오전 10시 이전)

### Supabase 연동 가이드

**1. Supabase Edge Function 구현**:

파일: `supabase/functions/check-yesterday-data/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date()
  const isAfter10AM = now.getHours() >= 10

  if (!isAfter10AM) {
    return new Response(JSON.stringify({ message: 'Not yet 10 AM' }))
  }

  // 전일 날짜 계산
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // 모든 활성 API 토큰 조회
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('status', 'active')

  // 각 토큰별로 전일자 데이터 체크
  for (const token of tokens) {
    const { data: adData } = await supabase
      .from('ad_performance')
      .select('id')
      .eq('advertiser_id', token.advertiser_id)
      .eq('platform', token.platform)
      .eq('date', yesterdayStr)
      .limit(1)

    const status = adData && adData.length > 0 ? 'success' : 'error'

    // 상태 업데이트
    await supabase
      .from('api_tokens')
      .update({
        data_collection_status: status,
        last_check_time: now.toISOString()
      })
      .eq('id', token.id)
  }

  return new Response(JSON.stringify({ success: true }))
})
```

**2. Cron Job 설정**:

**GitHub Actions** (`.github/workflows/daily-data-check.yml`):
```yaml
name: Daily Data Collection Check
on:
  schedule:
    - cron: '0 1 * * *'  # 매일 오전 10시 (KST = UTC+9)
jobs:
  check-data:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST https://your-project.supabase.co/functions/v1/check-yesterday-data \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

**Vercel Cron** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/check-yesterday-data",
    "schedule": "0 1 * * *"
  }]
}
```

**3. api_tokens 테이블 스키마**:
```sql
create table api_tokens (
  id uuid primary key default uuid_generate_v4(),
  advertiser_id uuid references advertisers(id) not null,
  platform text not null,  -- 'Google Ads', 'Meta Ads', 'Kakao Moment' 등
  status text default 'active',  -- 'active', 'inactive'
  data_collection_status text,  -- 'success', 'error', 'pending'
  last_check_time timestamp,
  created_at timestamp default now()
);
```

### 알림 연동

데이터 수집 실패 시 API 알림 생성:

```javascript
import { useAuth } from 'contexts/AuthContext';

const { addApiNotification } = useAuth();

// 데이터 수집 실패 시
if (dataCollectionStatus === 'error') {
  addApiNotification({
    type: 'error',
    title: '데이터 수집 실패',
    message: `${advertiserName}의 ${platform} 전일 데이터가 수집되지 않았습니다.`,
    platform,
    advertiserId,
  });
}
```
