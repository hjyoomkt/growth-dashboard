/**
 * ROAS Analyzer Module
 * 독립 실행 가능한 ROAS 분석 모듈
 *
 * 이 모듈은 Horizon UI와 완전히 독립적이며,
 * 추후 단독 서비스로 분리 가능합니다.
 */

export { default as ROASAnalyzer } from './ROASAnalyzer';

// 필요시 개별 컴포넌트 export
export { default as KPICard } from './components/KPICard';
export { default as Chart } from './components/Chart';
export { default as MetricsTable } from './components/MetricsTable';
export { default as InsightCard } from './components/InsightCard';
export { default as FileUpload } from './components/FileUpload';

// 유틸리티 함수 export
export * from './core/calculator';
export * from './core/analyzer';
export * from './utils/fileParser';

// 테마 export
export { roasTheme } from './styles/theme';
