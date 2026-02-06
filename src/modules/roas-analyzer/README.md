# ROAS 분석기 (ROAS Analyzer)

## 📋 개요

ROAS 분석기는 **완전히 독립적인 광고 성과 분석 모듈**입니다. Horizon UI 대시보드 안에 통합되어 있지만, 기술적으로는 Horizon UI와 완전히 분리되어 있어 추후 단독 서비스로 쉽게 분리할 수 있습니다.

## ✨ 주요 특징

### 완전한 독립성
- ❌ Horizon UI 컴포넌트 사용 안 함
- ❌ Horizon UI 스타일 의존성 없음
- ✅ 자체 디자인 시스템 구현
- ✅ 독립적인 계산/분석 엔진
- ✅ 단독 배포 가능

### 핵심 기능
1. **엑셀 파일 업로드** - .xlsx, .xls, .csv 지원
2. **자동 지표 계산**
   - 광고비, 매출, ROAS
   - 전환수, 전환율(CVR)
   - 클릭수, CPC
   - 객단가(AOV), CTR, CPA
3. **기간 비교 분석** - 전일/전주 대비
4. **ROAS 변화 원인 분석** - AI 기반 인사이트
5. **시각화**
   - KPI 카드
   - 인터랙티브 차트
   - 상세 비교 테이블

## 📁 폴더 구조

```
src/modules/roas-analyzer/
│
├── ROASAnalyzer.js          # 메인 페이지 컴포넌트
├── index.js                 # 모듈 진입점
│
├── components/              # UI 컴포넌트
│   ├── KPICard.js          # KPI 카드
│   ├── Chart.js            # 차트
│   ├── MetricsTable.js     # 지표 비교 테이블
│   ├── InsightCard.js      # 인사이트 카드
│   └── FileUpload.js       # 파일 업로드
│
├── core/                    # 핵심 로직
│   ├── calculator.js       # 지표 계산 엔진
│   └── analyzer.js         # ROAS 분석 엔진
│
├── utils/                   # 유틸리티
│   └── fileParser.js       # 엑셀/CSV 파싱
│
├── styles/                  # 스타일
│   ├── theme.js            # 자체 디자인 시스템
│   └── global.css          # 글로벌 스타일
│
└── types/                   # 타입 정의
    └── index.js            # JSDoc 타입 정의
```

## 🚀 사용 방법

### 1. 대시보드에서 접근
- URL: `http://localhost:3000/admin/roas-analyzer`
- 사이드바에서 "ROAS 분석" 클릭

### 2. 엑셀 파일 업로드
엑셀 파일은 다음 컬럼을 포함해야 합니다:

| 컬럼명 | 설명 | 필수 |
|--------|------|------|
| 날짜 (date) | YYYY-MM-DD 형식 | ✅ |
| 광고비 (adSpend) | 숫자 | ✅ |
| 매출 (revenue) | 숫자 | ✅ |
| 전환수 (conversions) | 숫자 | ✅ |
| 클릭수 (clicks) | 숫자 | ✅ |
| 노출수 (impressions) | 숫자 | ⚪ |

**지원하는 컬럼명 형식:**
- 날짜: `date`, `날짜`, `일자`, `Date`
- 광고비: `adSpend`, `광고비`, `cost`, `spend`
- 매출: `revenue`, `매출`, `수익`, `sales`
- 전환수: `conversions`, `전환수`, `전환`
- 클릭수: `clicks`, `클릭수`, `클릭`

### 3. 분석 결과 확인
- **인사이트 카드**: ROAS 변화 원인 및 권장사항
- **KPI 카드**: 주요 지표 한눈에 보기
- **차트**: 일별 ROAS 추이
- **비교 테이블**: 모든 지표의 상세 비교

## 🧮 계산 로직

### ROAS (Return on Ad Spend)
```
ROAS = 매출 / 광고비
```

### CVR (전환율)
```
CVR = (전환수 / 클릭수) × 100
```

### CPC (클릭당 비용)
```
CPC = 광고비 / 클릭수
```

### AOV (평균 주문 가치)
```
AOV = 매출 / 전환수
```

### CTR (클릭률)
```
CTR = (클릭수 / 노출수) × 100
```

### CPA (전환당 비용)
```
CPA = 광고비 / 전환수
```

## 🔍 분석 로직

### ROAS 증가 원인 분석
1. **매출 증가** - 매출 증가율이 광고비 증가율보다 높을 때
2. **전환율 개선** - CVR이 5% 이상 상승
3. **객단가 상승** - AOV가 5% 이상 증가
4. **CPC 감소** - 클릭당 비용이 5% 이상 감소

### ROAS 감소 원인 분석
1. **광고비 과다 증가** - 광고비 증가가 매출로 이어지지 않음
2. **전환율 하락** - CVR이 5% 이상 하락
3. **객단가 감소** - AOV가 5% 이상 감소
4. **CPC 증가** - 클릭당 비용이 5% 이상 증가

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: #0967D2 (브랜드 블루)
- **Success**: #48BB78 (녹색)
- **Danger**: #F56565 (빨강)
- **Warning**: #ED8936 (주황)
- **Gray Scale**: #F7FAFC ~ #171923

### 타이포그래피
- **Heading**: DM Sans
- **Body**: System Font Stack

### 컴포넌트
- 모든 카드: 12px border-radius, box-shadow
- 버튼: 8px border-radius, hover 효과
- 테이블: zebra striping, hover 효과

## 🔧 기술 스택

- **React** 19.0.0
- **ApexCharts** - 차트 렌더링
- **XLSX** - 엑셀 파일 파싱
- **react-dropzone** - 파일 업로드
- **순수 CSS** - Horizon UI 미사용

## 📦 단독 배포 가이드

이 모듈을 단독 서비스로 분리하려면:

### 1. 모듈 복사
```bash
cp -r src/modules/roas-analyzer ./roas-analyzer-standalone
```

### 2. 필요한 패키지 설치
```bash
npm install react react-dom react-apexcharts xlsx react-dropzone
```

### 3. 진입점 생성
```javascript
// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ROASAnalyzer } from './roas-analyzer';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ROASAnalyzer />);
```

### 4. 실행
```bash
npm start
```

## 🔒 데이터 처리

- **로컬 처리**: 모든 데이터는 브라우저에서만 처리
- **서버 전송 없음**: 업로드된 파일은 서버로 전송되지 않음
- **개인정보 보호**: 데이터가 외부로 유출되지 않음

## 🚧 향후 확장 가능성

### 백엔드 추가 시
- 파일 저장 및 이력 관리
- 다중 캠페인 비교
- 팀 협업 기능
- API 연동 (Google Ads, Facebook Ads)

### 추가 기능
- PDF 리포트 생성
- 이메일 알림
- 자동 스케줄 분석
- 머신러닝 기반 예측

## 📞 문의

모듈 관련 문의사항은 개발팀에 연락주세요.

---

**만든 날짜**: 2025-12-29
**버전**: 1.0.0
**라이선스**: Proprietary
