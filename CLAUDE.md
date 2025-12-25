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
