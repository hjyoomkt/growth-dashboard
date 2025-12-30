/**
 * ROAS 분석 엔진
 * ROAS 변화 원인을 분석하고 자연어 인사이트 생성
 */

import {
  calculateMetrics,
  compareMetrics,
  formatPercentage,
  formatCurrency,
  formatROAS,
} from './calculator';

/**
 * 전체 분석 수행
 * @param {Array<RawDataRow>} currentData - 현재 기간 데이터
 * @param {Array<RawDataRow>} previousData - 이전 기간 데이터
 * @returns {AnalysisResult}
 */
export const performAnalysis = (currentData, previousData) => {
  // 지표 계산
  const currentMetrics = calculateMetrics(currentData);
  const previousMetrics = calculateMetrics(previousData);

  // 비교 분석
  const comparison = compareMetrics(currentMetrics, previousMetrics);

  // ROAS 변화 원인 분석
  const analysis = analyzeROASChange(currentMetrics, previousMetrics, comparison);

  return {
    current: {
      startDate: currentData[0]?.date || '',
      endDate: currentData[currentData.length - 1]?.date || '',
      data: currentData,
      aggregated: currentMetrics,
    },
    previous: {
      startDate: previousData[0]?.date || '',
      endDate: previousData[previousData.length - 1]?.date || '',
      data: previousData,
      aggregated: previousMetrics,
    },
    comparison: {
      current: currentMetrics,
      previous: previousMetrics,
      comparison: comparison,
    },
    analysis: analysis,
  };
};

/**
 * ROAS 변화 원인 분석
 * @param {CalculatedMetrics} current
 * @param {CalculatedMetrics} previous
 * @param {Object.<string, Comparison>} comparison
 * @returns {RoasAnalysis}
 */
const analyzeROASChange = (current, previous, comparison) => {
  const roasChange = comparison.roas;

  // ROAS 변화 없음
  if (Math.abs(roasChange.percentage) < 1) {
    return {
      type: 'neutral',
      mainReason: 'ROAS가 안정적으로 유지되고 있습니다.',
      contributingFactors: [],
      recommendations: ['현재 전략을 유지하면서 지속적으로 모니터링하세요.'],
    };
  }

  // ROAS 증가
  if (roasChange.direction === 'increase') {
    return analyzeROASIncrease(current, previous, comparison);
  }

  // ROAS 감소
  return analyzeROASDecrease(current, previous, comparison);
};

/**
 * ROAS 증가 원인 분석
 * @param {CalculatedMetrics} current
 * @param {CalculatedMetrics} previous
 * @param {Object.<string, Comparison>} comparison
 * @returns {RoasAnalysis}
 */
const analyzeROASIncrease = (current, previous, comparison) => {
  const factors = [];
  const recommendations = [];

  // ROAS = 매출 / 광고비
  // ROAS 증가 원인: 매출 증가 또는 광고비 감소

  const revenueChange = comparison.revenue.percentage;
  const adSpendChange = comparison.adSpend.percentage;
  const cvrChange = comparison.cvr.percentage;
  const aovChange = comparison.aov.percentage;
  const cpcChange = comparison.cpc.percentage;

  // 주요 원인 판단
  let mainReason = '';

  if (revenueChange > 10 && adSpendChange < 5) {
    mainReason = `매출이 ${formatPercentage(revenueChange)}% 증가하여 ROAS가 개선되었습니다.`;
  } else if (adSpendChange < -10) {
    mainReason = `광고비가 ${formatPercentage(Math.abs(adSpendChange))}% 감소하여 ROAS가 개선되었습니다.`;
  } else if (revenueChange > adSpendChange) {
    mainReason = `매출 증가율(${formatPercentage(revenueChange)}%)이 광고비 증가율(${formatPercentage(adSpendChange)}%)을 상회하여 ROAS가 개선되었습니다.`;
  } else {
    mainReason = 'ROAS가 개선되었습니다.';
  }

  // 기여 요인 분석
  if (cvrChange > 5) {
    factors.push(
      `전환율이 ${formatPercentage(cvrChange)}% 상승하여 더 많은 클릭이 전환으로 이어졌습니다.`
    );
    recommendations.push('전환율 상승 요인을 분석하고 이를 다른 캠페인에도 적용하세요.');
  }

  if (aovChange > 5) {
    factors.push(
      `객단가가 ${formatPercentage(aovChange)}% 증가하여 고객당 매출이 상승했습니다.`
    );
    recommendations.push('고객단가 상승 전략(업셀링, 크로스셀링)을 강화하세요.');
  }

  if (cpcChange < -5) {
    factors.push(
      `클릭당 비용이 ${formatPercentage(Math.abs(cpcChange))}% 감소하여 광고 효율이 개선되었습니다.`
    );
    recommendations.push('효율적인 키워드와 타겟팅을 유지하세요.');
  }

  if (comparison.conversions.percentage > 10) {
    factors.push(
      `전환수가 ${formatPercentage(comparison.conversions.percentage)}% 증가했습니다.`
    );
  }

  if (comparison.clicks.percentage > 10 && comparison.adSpend.percentage < 5) {
    factors.push('광고비 대비 클릭수가 효율적으로 증가했습니다.');
  }

  // 일반적인 권장사항
  if (recommendations.length === 0) {
    recommendations.push('현재의 성과를 분석하고 성공 요인을 다른 캠페인에 적용하세요.');
    recommendations.push('광고 예산을 점진적으로 확대하여 성장을 가속화하세요.');
  }

  return {
    type: 'positive',
    mainReason,
    contributingFactors: factors,
    recommendations,
  };
};

/**
 * ROAS 감소 원인 분석
 * @param {CalculatedMetrics} current
 * @param {CalculatedMetrics} previous
 * @param {Object.<string, Comparison>} comparison
 * @returns {RoasAnalysis}
 */
const analyzeROASDecrease = (current, previous, comparison) => {
  const factors = [];
  const recommendations = [];

  const revenueChange = comparison.revenue.percentage;
  const adSpendChange = comparison.adSpend.percentage;
  const cvrChange = comparison.cvr.percentage;
  const aovChange = comparison.aov.percentage;
  const cpcChange = comparison.cpc.percentage;

  // 주요 원인 판단
  let mainReason = '';

  if (adSpendChange > 10 && revenueChange < 5) {
    mainReason = `광고비가 ${formatPercentage(adSpendChange)}% 증가했으나 매출이 비례하여 증가하지 않아 ROAS가 하락했습니다.`;
    recommendations.push('광고비 증가가 매출로 이어지지 않는 원인을 파악하세요.');
    recommendations.push('비효율적인 캠페인의 예산을 줄이고 효율적인 캠페인에 재배분하세요.');
  } else if (revenueChange < -10) {
    mainReason = `매출이 ${formatPercentage(Math.abs(revenueChange))}% 감소하여 ROAS가 하락했습니다.`;
    recommendations.push('매출 감소 원인(시즌성, 경쟁 상황 등)을 분석하세요.');
  } else if (adSpendChange > revenueChange) {
    mainReason = `광고비 증가율(${formatPercentage(adSpendChange)}%)이 매출 증가율(${formatPercentage(revenueChange)}%)을 초과하여 ROAS가 하락했습니다.`;
    recommendations.push('광고 효율성을 개선하거나 일부 캠페인의 예산을 조정하세요.');
  } else {
    mainReason = 'ROAS가 감소했습니다.';
  }

  // 기여 요인 분석
  if (cvrChange < -5) {
    factors.push(
      `전환율이 ${formatPercentage(Math.abs(cvrChange))}% 하락하여 클릭이 전환으로 이어지지 않았습니다.`
    );
    recommendations.push('랜딩 페이지와 전환 퍼널을 최적화하세요.');
    recommendations.push('타겟 오디언스 설정을 재검토하세요.');
  }

  if (aovChange < -5) {
    factors.push(
      `객단가가 ${formatPercentage(Math.abs(aovChange))}% 감소하여 고객당 매출이 하락했습니다.`
    );
    recommendations.push('프로모션 전략을 검토하고 객단가를 높이는 방안을 모색하세요.');
  }

  if (cpcChange > 5) {
    factors.push(
      `클릭당 비용이 ${formatPercentage(cpcChange)}% 증가하여 광고 효율이 저하되었습니다.`
    );
    recommendations.push('경쟁이 치열한 키워드를 검토하고 입찰 전략을 조정하세요.');
    recommendations.push('품질 점수를 개선하여 CPC를 낮추세요.');
  }

  if (comparison.conversions.percentage < -10) {
    factors.push(
      `전환수가 ${formatPercentage(Math.abs(comparison.conversions.percentage))}% 감소했습니다.`
    );
  }

  if (comparison.ctr.percentage < -5) {
    factors.push('클릭률이 감소하여 광고 매력도가 저하되었습니다.');
    recommendations.push('광고 소재와 메시지를 새롭게 개선하세요.');
  }

  // 일반적인 권장사항
  if (recommendations.length === 0) {
    recommendations.push('전반적인 광고 캠페인을 재점검하고 최적화하세요.');
    recommendations.push('A/B 테스트를 통해 개선 방안을 찾으세요.');
  }

  return {
    type: 'negative',
    mainReason,
    contributingFactors: factors,
    recommendations,
  };
};

/**
 * 자연어 인사이트 생성
 * @param {AnalysisResult} analysisResult
 * @returns {string}
 */
export const generateInsightText = (analysisResult) => {
  const { comparison, analysis } = analysisResult;
  const { current, previous } = comparison;

  let insight = '';

  // 헤더
  insight += `### 📊 ROAS 분석 리포트\n\n`;

  // ROAS 요약
  const roasChange = comparison.comparison.roas;
  insight += `**현재 ROAS:** ${formatROAS(current.roas)} `;
  insight += `(이전 ${formatROAS(previous.roas)} → `;
  insight += `${roasChange.direction === 'increase' ? '↑' : roasChange.direction === 'decrease' ? '↓' : '→'} `;
  insight += `${formatPercentage(Math.abs(roasChange.percentage))}%)\n\n`;

  // 주요 원인
  insight += `**${analysis.type === 'positive' ? '✅' : analysis.type === 'negative' ? '⚠️' : 'ℹ️'} ${analysis.mainReason}**\n\n`;

  // 기여 요인
  if (analysis.contributingFactors.length > 0) {
    insight += `**주요 변화:**\n`;
    analysis.contributingFactors.forEach((factor) => {
      insight += `- ${factor}\n`;
    });
    insight += `\n`;
  }

  // 권장 사항
  if (analysis.recommendations.length > 0) {
    insight += `**권장 사항:**\n`;
    analysis.recommendations.forEach((recommendation) => {
      insight += `- ${recommendation}\n`;
    });
  }

  return insight;
};
