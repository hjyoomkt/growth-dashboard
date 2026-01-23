# 페이지별 타이틀 변경 가이드

## 1. react-helmet-async 설치

```bash
npm install react-helmet-async
```

## 2. App.js 수정

`src/App.js` 파일을 다음과 같이 수정하여 HelmetProvider로 감싸주세요:

```javascript
import './assets/css/App.css';
import { Routes, Route } from 'react-router-dom';
import AuthLayout from './layouts/auth';
import AdminLayout from './layouts/admin';
import SuperAdminLayout from './layouts/superadmin';
import ClientAdminLayout from './layouts/clientadmin';
import MasterLayout from './layouts/master';
import RTLLayout from './layouts/rtl';
import Landing from './views/landing';
import { ChakraProvider } from '@chakra-ui/react';
import initialTheme from './theme/theme';
import { useState } from 'react';
import { DateRangeProvider } from './contexts/DateRangeContext';
import { AuthProvider } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async'; // 추가

export default function Main() {
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  return (
    <HelmetProvider> {/* HelmetProvider로 전체 앱 감싸기 */}
      <ChakraProvider theme={currentTheme}>
        <AuthProvider>
          <DateRangeProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/main" element={<Landing />} />
              <Route path="auth/*" element={<AuthLayout />} />
              <Route
                path="admin/*"
                element={
                  <AdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="superadmin/*"
                element={
                  <SuperAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="brandadmin/*"
                element={
                  <ClientAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="master/*"
                element={
                  <MasterLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="rtl/*"
                element={
                  <RTLLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
            </Routes>
          </DateRangeProvider>
        </AuthProvider>
      </ChakraProvider>
    </HelmetProvider>
  );
}
```

## 3. 페이지별 타이틀 설정

각 페이지 컴포넌트에서 `PageHelmet`을 import하고 사용하세요.

### 예제 1: Landing 페이지

```javascript
import React from 'react';
import { Box } from '@chakra-ui/react';
import { PageHelmet } from '../../components/HelmetProvider'; // 추가

// Import all landing sections
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
// ... 기타 imports

export default function Landing() {
  return (
    <Box>
      {/* SEO 메타태그 설정 */}
      <PageHelmet
        title="제스트닷 | 마케팅 인텔리전스 통합 대시보드"
        description="구글·메타·네이버 광고 데이터를 한 화면에서 확인하는 마케팅 성과 대시보드입니다."
        keywords="마케팅 대시보드, 광고 성과 분석, 퍼포먼스 마케팅"
      />

      <Navbar />
      <HeroSection />
      {/* ... 기타 섹션들 */}
    </Box>
  );
}
```

### 예제 2: 대시보드 페이지

```javascript
import { PageHelmet } from '../../components/HelmetProvider';

export default function Dashboard() {
  return (
    <>
      <PageHelmet
        title="대시보드 | 제스트닷"
        description="광고 성과를 실시간으로 확인하세요"
        keywords="대시보드, 광고 성과, 실시간 분석"
      />

      {/* 대시보드 컨텐츠 */}
    </>
  );
}
```

### 예제 3: 로그인 페이지

```javascript
import { PageHelmet } from '../../components/HelmetProvider';

export default function SignIn() {
  return (
    <>
      <PageHelmet
        title="로그인 | 제스트닷"
        description="제스트닷 마케팅 대시보드에 로그인하세요"
      />

      {/* 로그인 폼 */}
    </>
  );
}
```

## 4. PageHelmet Props

- **title**: 페이지 타이틀 (브라우저 탭에 표시됨)
- **description**: 페이지 설명 (검색 엔진용)
- **keywords**: 검색 키워드
- **ogTitle**: Open Graph 타이틀 (소셜 미디어 공유용, 기본값: title)
- **ogDescription**: Open Graph 설명 (기본값: description)
- **ogImage**: Open Graph 이미지 URL
- **ogUrl**: Open Graph URL

## 5. 페이지별 추천 타이틀

```javascript
// 랜딩 페이지
title: "제스트닷 | 마케팅 인텔리전스 통합 대시보드"

// 대시보드
title: "대시보드 | 제스트닷"

// 로그인
title: "로그인 | 제스트닷"

// 회원가입
title: "회원가입 | 제스트닷"

// 광고 관리
title: "광고 관리 | 제스트닷"

// 성과 분석
title: "성과 분석 | 제스트닷"

// 설정
title: "설정 | 제스트닷"
```

이렇게 설정하면 각 페이지마다 다른 타이틀과 메타태그를 가질 수 있습니다!
