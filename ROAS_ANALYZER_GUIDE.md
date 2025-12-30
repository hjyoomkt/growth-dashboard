# ROAS 분석기 통합 가이드

## 🎯 프로젝트 개요

Horizon UI 대시보드에 **완전히 독립적인 ROAS 분석 모듈**을 성공적으로 추가했습니다.

### 핵심 설계 원칙
- ✅ Horizon UI 컴포넌트 **전혀 사용하지 않음**
- ✅ 자체 디자인 시스템으로 Horizon과 유사한 UI 구현
- ✅ 추후 **단독 서비스로 분리 가능**한 구조
- ✅ Horizon 대시보드 안에서는 '탭'처럼 보이지만, 기술적으로는 완전히 독립

---

## 📂 생성된 파일 구조

```
growth-dashboard/
├── src/
│   ├── modules/
│   │   └── roas-analyzer/              ← 새로 생성된 독립 모듈
│   │       ├── ROASAnalyzer.js         # 메인 페이지
│   │       ├── index.js                # 모듈 export
│   │       ├── README.md               # 모듈 문서
│   │       ├── sample-data-template.csv # 샘플 데이터
│   │       │
│   │       ├── components/             # UI 컴포넌트 (독립)
│   │       │   ├── KPICard.js
│   │       │   ├── Chart.js
│   │       │   ├── MetricsTable.js
│   │       │   ├── InsightCard.js
│   │       │   └── FileUpload.js
│   │       │
│   │       ├── core/                   # 비즈니스 로직
│   │       │   ├── calculator.js       # 지표 계산
│   │       │   └── analyzer.js         # ROAS 분석
│   │       │
│   │       ├── utils/                  # 유틸리티
│   │       │   └── fileParser.js       # 엑셀 파싱
│   │       │
│   │       ├── styles/                 # 독립 스타일
│   │       │   ├── theme.js            # 자체 테마
│   │       │   └── global.css          # 글로벌 CSS
│   │       │
│   │       └── types/                  # 타입 정의
│   │           └── index.js
│   │
│   └── routes.js                       ← 수정됨 (라우팅 추가)
│
└── package.json                        ← 수정됨 (xlsx 추가)
```

---

## 🚀 접속 방법

### 1. 개발 서버 실행
```bash
cd /Users/reon/Desktop/개발/growth-dashboard
npm start
```

### 2. 브라우저에서 접속
- **URL**: `http://localhost:3000/admin/roas-analyzer`
- 또는 사이드바에서 **"ROAS 분석"** 메뉴 클릭

---

## 📊 사용 방법

### Step 1: 엑셀 파일 준비
엑셀 파일에 다음 컬럼이 필요합니다:

| 컬럼명 | 예시 | 설명 |
|--------|------|------|
| date | 2025-12-15 | 날짜 (필수) |
| adSpend | 100000 | 광고비 (필수) |
| revenue | 450000 | 매출 (필수) |
| conversions | 45 | 전환수 (필수) |
| clicks | 500 | 클릭수 (필수) |
| impressions | 5000 | 노출수 (선택) |

**샘플 템플릿**: `src/modules/roas-analyzer/sample-data-template.csv`

### Step 2: 파일 업로드
1. ROAS 분석 페이지 접속
2. 파일을 드래그 앤 드롭 또는 클릭하여 업로드
3. 자동으로 분석 시작

### Step 3: 결과 확인
- **인사이트 카드**: ROAS 변화 원인 및 권장사항
- **KPI 카드**: 주요 지표 (ROAS, 매출, 광고비, 전환수 등)
- **차트**: 일별 ROAS 추이
- **비교 테이블**: 전체 지표 상세 비교

### Step 4: 비교 기간 변경
- **전일 대비**: 최근 1일 vs 그 전 1일
- **전주 대비**: 최근 7일 vs 그 전 7일

---

## 🎨 Horizon UI와의 관계

### 통합 방식
```
Horizon Dashboard (Chakra UI 기반)
│
├── /admin/default          ← Horizon UI 사용
├── /admin/data-tables      ← Horizon UI 사용
├── /admin/roas-analyzer    ← 독립 모듈 (Horizon UI 미사용!)
└── /admin/profile          ← Horizon UI 사용
```

### 기술적 독립성

| 항목 | Horizon UI | ROAS 분석기 |
|------|------------|-------------|
| UI 프레임워크 | Chakra UI | 순수 CSS |
| 컴포넌트 | Horizon 컴포넌트 | 자체 컴포넌트 |
| 테마 | Chakra Theme | 자체 테마 시스템 |
| 데이터 | DB 연동 | 파일 업로드만 |
| 의존성 | 높음 | 없음 |
| 분리 가능성 | 불가능 | **완전 독립** ✅ |

### 사용자 경험
- **외관**: Horizon UI와 유사한 디자인
- **느낌**: 동일한 대시보드의 일부처럼 보임
- **실제**: 완전히 별개의 독립 애플리케이션

---

## 🧮 계산 로직 상세

### 1. ROAS (광고 투자 수익률)
```javascript
ROAS = 매출 / 광고비

예시:
- 매출: ₩450,000
- 광고비: ₩100,000
- ROAS = 450,000 / 100,000 = 4.5
→ "광고비 1원당 4.5원의 매출 발생"
```

### 2. CVR (전환율)
```javascript
CVR = (전환수 / 클릭수) × 100

예시:
- 전환수: 45
- 클릭수: 500
- CVR = (45 / 500) × 100 = 9%
```

### 3. AOV (평균 주문 가치)
```javascript
AOV = 매출 / 전환수

예시:
- 매출: ₩450,000
- 전환수: 45
- AOV = 450,000 / 45 = ₩10,000
```

### 4. CPC (클릭당 비용)
```javascript
CPC = 광고비 / 클릭수

예시:
- 광고비: ₩100,000
- 클릭수: 500
- CPC = 100,000 / 500 = ₩200
```

---

## 🔍 분석 인사이트 로직

### ROAS 증가 시 분석
```
✅ 주요 원인:
1. 매출 증가 > 광고비 증가
2. 전환율(CVR) 5% 이상 상승
3. 객단가(AOV) 5% 이상 증가
4. CPC 5% 이상 감소

💡 권장 사항:
- 성공 요인을 다른 캠페인에 적용
- 광고 예산을 점진적으로 확대
- 효율적인 키워드/타겟팅 유지
```

### ROAS 감소 시 분석
```
⚠️ 주요 원인:
1. 광고비 증가 > 매출 증가
2. 전환율(CVR) 5% 이상 하락
3. 객단가(AOV) 5% 이상 감소
4. CPC 5% 이상 증가

💡 권장 사항:
- 비효율적 캠페인 예산 재배분
- 랜딩 페이지 최적화
- 타겟 오디언스 재검토
- 키워드 입찰 전략 조정
```

---

## 🎯 단독 서비스 분리 가이드

### 왜 분리가 쉬운가?
1. **의존성 제로**: Horizon UI에 전혀 의존하지 않음
2. **자체 완결성**: 모든 필요한 기능이 모듈 내부에 있음
3. **독립 실행**: 외부 데이터 소스 불필요 (파일 업로드만 사용)

### 분리 절차

#### 1단계: 모듈 복사
```bash
# 새 프로젝트 생성
npx create-react-app roas-analyzer-standalone
cd roas-analyzer-standalone

# 모듈 복사
cp -r ../growth-dashboard/src/modules/roas-analyzer ./src/
```

#### 2단계: package.json 수정
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-apexcharts": "^1.4.1",
    "apexcharts": "^3.50.0",
    "xlsx": "latest",
    "react-dropzone": "^14.2.3"
  }
}
```

#### 3단계: src/index.js 수정
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ROASAnalyzer } from './roas-analyzer';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ROASAnalyzer />);
```

#### 4단계: 실행
```bash
npm install
npm start
```

**완료!** 이제 완전히 독립적인 ROAS 분석 서비스가 됩니다.

---

## 🔒 보안 및 데이터 처리

### 데이터 흐름
```
사용자 PC
   ↓
엑셀 파일 선택
   ↓
브라우저 메모리에서 파싱 (XLSX 라이브러리)
   ↓
JavaScript로 계산 및 분석
   ↓
화면에 결과 표시
   ↓
(서버 전송 ❌, 저장 ❌)
```

### 개인정보 보호
- ✅ 모든 처리가 **브라우저에서만** 이루어짐
- ✅ 서버로 데이터 전송 **전혀 없음**
- ✅ 파일 저장 **전혀 없음**
- ✅ 페이지 새로고침 시 데이터 **모두 삭제**

---

## 📈 향후 확장 계획

### Phase 1 (현재)
- ✅ 프론트엔드만으로 동작
- ✅ 파일 업로드 기반
- ✅ 기본 분석 및 인사이트

### Phase 2 (백엔드 추가 시)
- 파일 이력 관리
- 다중 캠페인 비교
- 사용자별 데이터 저장
- API 연동 (Google Ads, Facebook Ads)

### Phase 3 (고급 기능)
- PDF 리포트 자동 생성
- 이메일 알림
- 자동 스케줄 분석
- 머신러닝 기반 예측
- 대시보드 공유 기능

---

## 🛠️ 기술 스택

### 현재 사용 중
```json
{
  "react": "19.0.0",
  "react-apexcharts": "1.4.1",
  "apexcharts": "3.50.0",
  "xlsx": "latest",
  "react-dropzone": "14.2.3"
}
```

### Horizon UI와 별도
- Chakra UI ❌
- Horizon UI 컴포넌트 ❌
- 순수 CSS ✅
- 자체 컴포넌트 ✅

---

## 📝 개발 내역

### 생성된 파일 (14개)
1. `ROASAnalyzer.js` - 메인 페이지
2. `index.js` - 모듈 진입점
3. `README.md` - 모듈 문서
4. `sample-data-template.csv` - 샘플 데이터
5. `components/KPICard.js` - KPI 카드
6. `components/Chart.js` - 차트
7. `components/MetricsTable.js` - 테이블
8. `components/InsightCard.js` - 인사이트
9. `components/FileUpload.js` - 파일 업로드
10. `core/calculator.js` - 계산 엔진
11. `core/analyzer.js` - 분석 엔진
12. `utils/fileParser.js` - 파일 파서
13. `styles/theme.js` - 테마
14. `styles/global.css` - 스타일

### 수정된 파일 (2개)
1. `src/routes.js` - 라우팅 추가
2. `package.json` - xlsx 라이브러리 추가

---

## 🎓 개발 원칙 요약

1. **독립성**: Horizon UI와 완전 분리
2. **일관성**: 유사한 디자인으로 사용자 경험 통일
3. **확장성**: 추후 단독 서비스 분리 가능
4. **보안성**: 모든 데이터 로컬 처리
5. **단순성**: 백엔드 없이 동작

---

## 📞 문의 및 지원

### 주요 파일 위치
- 메인 코드: `src/modules/roas-analyzer/`
- 문서: `src/modules/roas-analyzer/README.md`
- 샘플 데이터: `src/modules/roas-analyzer/sample-data-template.csv`

### 문제 해결
1. **페이지가 안 보여요** → URL 확인: `/admin/roas-analyzer`
2. **파일 업로드 오류** → 필수 컬럼 확인
3. **분석 결과 안 나와요** → 최소 2일(또는 2주) 데이터 필요
4. **차트가 안 보여요** → 브라우저 콘솔에서 에러 확인

---

**개발 완료일**: 2025-12-29
**개발자**: Claude Code
**버전**: 1.0.0

✅ **ROAS 분석기가 성공적으로 통합되었습니다!**
