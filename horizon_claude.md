Horizon UI 템플릿 사용 지침
작업 시작 전 필수 확인사항
외부 라이브러리 설치 전 반드시 확인:
src/components/ 폴더에 유사한 컴포넌트가 이미 존재하는지 Glob 도구로 검색
package.json에 필요한 라이브러리가 이미 설치되어 있는지 확인
Horizon UI 템플릿의 예제 페이지들을 먼저 탐색
예시:
달력 UI 필요 시: **/*[Cc]alendar*.{js,jsx} 검색 → src/components/calendar/MiniCalendar.js 확인
차트 필요 시: src/components/charts/ 폴더 확인
테이블 필요 시: src/views/admin/dataTables/ 예제 확인
템플릿 구조
핵심 디렉토리:

src/
├── components/         # 재사용 가능한 UI 컴포넌트
│   ├── card/          # Card 컴포넌트
│   ├── calendar/      # MiniCalendar (react-calendar 기반)
│   ├── charts/        # BarChart, LineChart 등
│   ├── fields/        # Input, DateRangePicker 등 폼 요소
│   └── menu/          # MainMenu 등
├── views/admin/       # 페이지 컴포넌트
│   ├── default/       # 메인 대시보드
│   └── dataTables/    # 데이터 테이블 페이지
├── contexts/          # Context API (DateRangeContext 등)
├── routes.js          # 라우팅 설정
└── assets/css/        # 커스텀 CSS (MiniCalendar.css 등)
이미 설치된 주요 라이브러리:
@chakra-ui/react: UI 프레임워크
react-calendar: 달력 컴포넌트
react-icons: 아이콘 (MdCalendarToday, MdChevronLeft 등)
@tanstack/react-table: 테이블 라이브러리
apexcharts + react-apexcharts: 차트 라이브러리
UI 디자인 톤앤매너
색상 시스템 (useColorModeValue 사용):

textColor: ('secondaryGray.900', 'white')
borderColor: ('gray.200', 'whiteAlpha.100')
brandColor: ('brand.500', 'brand.400')
inputBg: ('white', 'navy.700')
bgHover: ('secondaryGray.100', 'whiteAlpha.100')
타이포그래피 규칙:
페이지/카드 제목: fontSize='22px' fontWeight='700'
섹션 제목: fontSize='lg' fontWeight='700'
테이블 헤더: fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'
테이블 데이터: fontSize='sm' fontWeight='700'
버튼 텍스트: fontWeight='500' (일반), fontWeight='600' (활성)
레이아웃 패턴:
Card 패딩: p='20px' (일반), px='0px' (테이블)
Border Radius: borderRadius='16px' (Input, Button), borderRadius='6px' (작은 버튼)
간격: gap='20px' (주요 요소), gap='8px' (밀접한 요소)
여백: mb='20px' (카드 간격)
테이블 디자인 표준:

Card: flexDirection='column' w='100%' px='0px' overflowX={{ sm: 'scroll', lg: 'hidden' }}
Table: variant='simple' color='gray.500' mb='24px' mt='12px'
Th: pe='10px' borderColor={borderColor}
Td: fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'
컴포넌트 재사용 패턴
새 기능 구현 전 확인할 예제:
테이블: src/views/admin/dataTables/components/DevelopmentTable.js
@tanstack/react-table 사용법
정렬 기능, 커스텀 셀 렌더링
달력: src/components/calendar/MiniCalendar.js
react-calendar 기본 설정
Chakra Icon 커스터마이징
차트: src/views/admin/default/components/
BarChart: MediaAdCost.js
LineChart: DailyAdCost.js
ApexCharts 옵션 설정, 한글 포맷팅
폼: src/components/fields/DateRangePicker.js
Popover를 활용한 커스텀 Input
Context API 연동
개발 워크플로우
UI 컴포넌트 작업 시:
유사한 기존 컴포넌트 검색 (src/views/admin/ 예제 페이지 확인)
기존 컴포넌트의 스타일 패턴 참조
useColorModeValue로 라이트/다크 모드 대응
반응형 속성 활용: {{ sm: '값1', md: '값2', lg: '값3' }}
데이터 연동 시:
Context API 확인 (src/contexts/)
useMemo로 데이터 연산 최적화
props 기본값 설정으로 유연성 확보
스타일 일관성 유지:
새 컴포넌트 작성 전 동일 카테고리의 기존 컴포넌트 Read 필수
색상, 폰트, 간격은 기존 패턴 그대로 사용
커스텀 CSS는 최소화, Chakra UI props 우선 활용
이 내용을 CLAUDE.md에 추가하면 다음 작업부터는 템플릿 구조를 먼저 파악하고 일관된 디자인을 유지할 수 있습니다.



### UI Color Rules (Horizon UI Chakra)

- 모든 UI 색상은 Chakra UI theme color tokens만 사용한다.
- 임의의 HEX 컬러(#xxxxxx)는 사용하지 않는다.

#### Brand
- 메인 강조 색상: brand.500
- 보조 강조 색상: brand.400, brand.600

#### Neutral (Background / Text)
- 배경 및 카드: gray.50 ~ gray.900
- 텍스트 대비는 다크/라이트 모드에 맞게 자동 적용

#### Performance / Status
- 성과 긍정 (매출, ROAS 상승): green.400, green.500
- 비용, 하락: red.400, red.500
- 보통/주의: orange.400

#### Info / Secondary
- 정보성 지표: blue.400
- 보조 강조: teal.400, cyan.400

#### Charts
- 차트 색상은 반드시 theme.colors에서 참조한다.
- 하드코딩된 색상은 사용할 경우 허락을 맡는다.