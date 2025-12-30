/**
 * ROAS 분석 계산 엔진
 * 모든 지표 계산 및 비교 분석 로직
 */

/**
 * 개별 지표 계산
 * @param {Array<RawDataRow>} data
 * @returns {CalculatedMetrics}
 */
export const calculateMetrics = (data) => {
  if (!data || data.length === 0) {
    return getEmptyMetrics();
  }

  // 합계 계산
  const totals = data.reduce(
    (acc, row) => ({
      adSpend: acc.adSpend + (row.adSpend || 0),
      revenue: acc.revenue + (row.revenue || 0),
      conversions: acc.conversions + (row.conversions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
    }),
    { adSpend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 }
  );

  // ROAS = 매출 / 광고비
  const roas = totals.adSpend > 0 ? totals.revenue / totals.adSpend : 0;

  // CVR (전환율) = 전환수 / 클릭수
  const cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  // CPC (클릭당 비용) = 광고비 / 클릭수
  const cpc = totals.clicks > 0 ? totals.adSpend / totals.clicks : 0;

  // AOV (평균 주문 가치) = 매출 / 전환수
  const aov = totals.conversions > 0 ? totals.revenue / totals.conversions : 0;

  // CTR (클릭률) = 클릭수 / 노출수
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  // CPA (전환당 비용) = 광고비 / 전환수
  const cpa = totals.conversions > 0 ? totals.adSpend / totals.conversions : 0;

  return {
    adSpend: totals.adSpend,
    revenue: totals.revenue,
    roas: roas,
    conversions: totals.conversions,
    cvr: cvr,
    clicks: totals.clicks,
    cpc: cpc,
    aov: aov,
    ctr: ctr,
    cpa: cpa,
  };
};

/**
 * 빈 지표 객체 반환
 * @returns {CalculatedMetrics}
 */
const getEmptyMetrics = () => ({
  adSpend: 0,
  revenue: 0,
  roas: 0,
  conversions: 0,
  cvr: 0,
  clicks: 0,
  cpc: 0,
  aov: 0,
  ctr: 0,
  cpa: 0,
});

/**
 * 두 기간 데이터 비교
 * @param {CalculatedMetrics} current
 * @param {CalculatedMetrics} previous
 * @returns {Object.<string, Comparison>}
 */
export const compareMetrics = (current, previous) => {
  const metrics = [
    'adSpend',
    'revenue',
    'roas',
    'conversions',
    'cvr',
    'clicks',
    'cpc',
    'aov',
    'ctr',
    'cpa',
  ];

  const comparison = {};

  metrics.forEach((metric) => {
    const currentValue = current[metric] || 0;
    const previousValue = previous[metric] || 0;

    const value = currentValue - previousValue;
    const percentage =
      previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

    let direction = 'neutral';
    if (value > 0) direction = 'increase';
    if (value < 0) direction = 'decrease';

    comparison[metric] = {
      value,
      percentage,
      direction,
    };
  });

  return comparison;
};

/**
 * 날짜 범위로 데이터 필터링
 * @param {Array<RawDataRow>} data
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array<RawDataRow>}
 */
export const filterDataByDateRange = (data, startDate, endDate) => {
  if (!startDate || !endDate) return data;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return data.filter((row) => {
    const rowDate = new Date(row.date);
    return rowDate >= start && rowDate <= end;
  });
};

/**
 * 데이터를 기간별로 분할 (일일, 주간, 월간)
 * @param {Array<RawDataRow>} data
 * @param {'daily' | 'weekly' | 'monthly'} period
 * @returns {Array<{period: string, data: Array<RawDataRow>, metrics: CalculatedMetrics}>}
 */
export const groupDataByPeriod = (data, period = 'daily') => {
  if (!data || data.length === 0) return [];

  // 날짜순 정렬
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (period === 'daily') {
    // 날짜별로 그룹화
    const dateGroups = {};
    sortedData.forEach((row) => {
      const date = row.date;
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(row);
    });

    return Object.entries(dateGroups)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([date, rows]) => ({
        period: date,
        data: rows,
        metrics: calculateMetrics(rows),
      }));
  }

  if (period === 'weekly') {
    const weeks = {};

    sortedData.forEach((row) => {
      const date = new Date(row.date);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(row);
    });

    return Object.entries(weeks).map(([weekStart, weekData]) => ({
      period: weekStart,
      data: weekData,
      metrics: calculateMetrics(weekData),
    }));
  }

  if (period === 'monthly') {
    const months = {};

    sortedData.forEach((row) => {
      const date = new Date(row.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(row);
    });

    return Object.entries(months).map(([month, monthData]) => ({
      period: `${month}-01`,
      data: monthData,
      metrics: calculateMetrics(monthData),
    }));
  }

  return [];
};

/**
 * 주의 시작일(월요일) 구하기
 * @param {Date} date
 * @returns {Date}
 */
const getWeekStart = (date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
  return new Date(date.setDate(diff));
};

/**
 * 전일/전주 대비 기간 계산
 * 메타 광고처럼 하루에 여러 행이 있는 경우를 고려
 * @param {Array<RawDataRow>} data
 * @param {'day' | 'week'} compareType
 * @returns {{current: Array<RawDataRow>, previous: Array<RawDataRow>}}
 */
export const splitDataForComparison = (data, compareType = 'day') => {
  if (!data || data.length === 0) {
    return { current: [], previous: [] };
  }

  // 1단계: 날짜별로 그룹화 (메타 광고는 하루에 여러 행이 있을 수 있음)
  const dateGroups = {};
  data.forEach((row) => {
    const date = row.date;
    if (!dateGroups[date]) {
      dateGroups[date] = [];
    }
    dateGroups[date].push(row);
  });

  // 2단계: 날짜 목록을 정렬 (최신 날짜부터)
  const sortedDates = Object.keys(dateGroups).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  console.log('=== 기간 분할 시작 ===');
  console.log(`전체 데이터: ${data.length}개 행`);
  console.log(`고유 날짜: ${sortedDates.length}일`);
  console.log(`비교 타입: ${compareType === 'day' ? '전일 대비' : '전주 대비'}`);
  console.log(`날짜 범위: ${sortedDates[sortedDates.length - 1]} ~ ${sortedDates[0]}`);

  let currentDates = [];
  let previousDates = [];

  if (compareType === 'day') {
    // 최근 1일 vs 그 전 1일
    currentDates = sortedDates.slice(0, 1);
    previousDates = sortedDates.slice(1, 2);
  } else if (compareType === 'week') {
    // 최근 7일 vs 그 전 7일
    currentDates = sortedDates.slice(0, 7);
    previousDates = sortedDates.slice(7, 14);
  }

  // 3단계: 날짜에 해당하는 모든 행 수집
  const current = currentDates.flatMap((date) => dateGroups[date] || []);
  const previous = previousDates.flatMap((date) => dateGroups[date] || []);

  // 로깅
  if (current.length > 0) {
    const currentSum = current.reduce((sum, row) => sum + (row.adSpend || 0), 0);
    const currentRevenue = current.reduce((sum, row) => sum + (row.revenue || 0), 0);
    console.log(`✓ 현재 기간: ${currentDates[currentDates.length - 1]} ~ ${currentDates[0]} (${currentDates.length}일, ${current.length}개 행)`);
    console.log(`  광고비: ${currentSum.toLocaleString('ko-KR')}원`);
    console.log(`  매출: ${currentRevenue.toLocaleString('ko-KR')}원`);
  }

  if (previous.length > 0) {
    const previousSum = previous.reduce((sum, row) => sum + (row.adSpend || 0), 0);
    const previousRevenue = previous.reduce((sum, row) => sum + (row.revenue || 0), 0);
    console.log(`✓ 이전 기간: ${previousDates[previousDates.length - 1]} ~ ${previousDates[0]} (${previousDates.length}일, ${previous.length}개 행)`);
    console.log(`  광고비: ${previousSum.toLocaleString('ko-KR')}원`);
    console.log(`  매출: ${previousRevenue.toLocaleString('ko-KR')}원`);
  }

  console.log('==================');

  return { current, previous };
};

/**
 * 백분율 포맷팅
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * 숫자 포맷팅 (천단위 쉼표)
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return '0';

  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * 통화 포맷팅
 * @param {number} value
 * @param {string} currency
 * @returns {string}
 */
export const formatCurrency = (value, currency = 'KRW') => {
  if (value === null || value === undefined || isNaN(value)) return '₩0';

  if (currency === 'KRW') {
    return `₩${formatNumber(value, 0)}`;
  }

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

/**
 * ROAS 포맷팅
 * @param {number} roas
 * @returns {string}
 */
export const formatROAS = (roas) => {
  if (roas === null || roas === undefined || isNaN(roas)) return '0.00';
  return roas.toFixed(2);
};

/**
 * 증감 표시 화살표 반환
 * @param {'increase' | 'decrease' | 'neutral'} direction
 * @returns {string}
 */
export const getDirectionArrow = (direction) => {
  if (direction === 'increase') return '↑';
  if (direction === 'decrease') return '↓';
  return '→';
};

/**
 * 증감 방향에 따른 색상 클래스 반환
 * @param {'increase' | 'decrease' | 'neutral'} direction
 * @param {boolean} isPositive - 증가가 긍정적인 지표인지 (ROAS, 매출 등)
 * @returns {string}
 */
export const getDirectionColorClass = (direction, isPositive = true) => {
  if (direction === 'neutral') return 'roas-text-secondary';

  if (isPositive) {
    return direction === 'increase' ? 'roas-text-success' : 'roas-text-danger';
  } else {
    return direction === 'increase' ? 'roas-text-danger' : 'roas-text-success';
  }
};
