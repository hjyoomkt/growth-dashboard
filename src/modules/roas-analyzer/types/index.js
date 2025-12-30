// ROAS Analyzer Types
// JSDoc을 사용한 타입 정의 (TypeScript 없이도 타입 안정성 확보)

/**
 * @typedef {Object} RawDataRow
 * @property {string} date - 날짜 (YYYY-MM-DD)
 * @property {number} adSpend - 광고비
 * @property {number} revenue - 매출
 * @property {number} conversions - 전환수
 * @property {number} clicks - 클릭수
 * @property {number} impressions - 노출수
 */

/**
 * @typedef {Object} CalculatedMetrics
 * @property {number} adSpend - 광고비
 * @property {number} revenue - 매출
 * @property {number} roas - ROAS (Return on Ad Spend)
 * @property {number} conversions - 전환수
 * @property {number} cvr - 전환율 (Conversion Rate)
 * @property {number} clicks - 클릭수
 * @property {number} cpc - CPC (Cost Per Click)
 * @property {number} aov - AOV (Average Order Value)
 * @property {number} ctr - CTR (Click Through Rate)
 * @property {number} cpa - CPA (Cost Per Acquisition)
 */

/**
 * @typedef {Object} Comparison
 * @property {number} value - 증감값
 * @property {number} percentage - 증감률 (%)
 * @property {'increase' | 'decrease' | 'neutral'} direction - 증감 방향
 */

/**
 * @typedef {Object} MetricsWithComparison
 * @property {CalculatedMetrics} current - 현재 기간 지표
 * @property {CalculatedMetrics} previous - 이전 기간 지표
 * @property {Object.<string, Comparison>} comparison - 각 지표의 증감 정보
 */

/**
 * @typedef {Object} RoasAnalysis
 * @property {string} type - 분석 타입 ('positive' | 'negative' | 'neutral')
 * @property {string} mainReason - 주요 원인
 * @property {Array<string>} contributingFactors - 기여 요인들
 * @property {Array<string>} recommendations - 권장 사항들
 */

/**
 * @typedef {Object} PeriodData
 * @property {string} startDate - 시작일
 * @property {string} endDate - 종료일
 * @property {Array<RawDataRow>} data - 원시 데이터
 * @property {CalculatedMetrics} aggregated - 집계된 지표
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {PeriodData} current - 현재 기간 데이터
 * @property {PeriodData} previous - 이전 기간 데이터
 * @property {MetricsWithComparison} comparison - 비교 분석 결과
 * @property {RoasAnalysis} analysis - ROAS 분석 결과
 */

/**
 * @typedef {Object} ChartDataPoint
 * @property {string} date - 날짜
 * @property {number} value - 값
 * @property {string} label - 레이블
 */

/**
 * @typedef {Object} TableRow
 * @property {string} metric - 지표명
 * @property {string|number} current - 현재값
 * @property {string|number} previous - 이전값
 * @property {string|number} change - 변화량
 * @property {string} changePercent - 변화율
 * @property {'increase' | 'decrease' | 'neutral'} trend - 트렌드
 */

export {};
