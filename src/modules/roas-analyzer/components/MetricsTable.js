import React from 'react';
import '../styles/global.css';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatROAS,
  getDirectionArrow,
  getDirectionColorClass,
} from '../core/calculator';

/**
 * 지표 비교 테이블 컴포넌트
 */
const MetricsTable = ({ comparison }) => {
  if (!comparison) return null;

  const { current, previous, comparison: changes } = comparison;

  // 테이블 행 데이터 정의
  const rows = [
    {
      metric: '광고비',
      current: formatCurrency(current.adSpend),
      previous: formatCurrency(previous.adSpend),
      change: changes.adSpend,
      isPositiveGrowth: false, // 광고비 증가는 부정적
    },
    {
      metric: '매출',
      current: formatCurrency(current.revenue),
      previous: formatCurrency(previous.revenue),
      change: changes.revenue,
      isPositiveGrowth: true,
    },
    {
      metric: 'ROAS',
      current: formatROAS(current.roas),
      previous: formatROAS(previous.roas),
      change: changes.roas,
      isPositiveGrowth: true,
    },
    {
      metric: '전환수',
      current: formatNumber(current.conversions, 0),
      previous: formatNumber(previous.conversions, 0),
      change: changes.conversions,
      isPositiveGrowth: true,
    },
    {
      metric: '전환율 (CVR)',
      current: formatPercentage(current.cvr),
      previous: formatPercentage(previous.cvr),
      change: changes.cvr,
      isPositiveGrowth: true,
    },
    {
      metric: '클릭수',
      current: formatNumber(current.clicks, 0),
      previous: formatNumber(previous.clicks, 0),
      change: changes.clicks,
      isPositiveGrowth: true,
    },
    {
      metric: 'CPC (클릭당 비용)',
      current: formatCurrency(current.cpc),
      previous: formatCurrency(previous.cpc),
      change: changes.cpc,
      isPositiveGrowth: false, // CPC 증가는 부정적
    },
    {
      metric: 'AOV (객단가)',
      current: formatCurrency(current.aov),
      previous: formatCurrency(previous.aov),
      change: changes.aov,
      isPositiveGrowth: true,
    },
    {
      metric: 'CTR (클릭률)',
      current: formatPercentage(current.ctr),
      previous: formatPercentage(previous.ctr),
      change: changes.ctr,
      isPositiveGrowth: true,
    },
    {
      metric: 'CPA (전환당 비용)',
      current: formatCurrency(current.cpa),
      previous: formatCurrency(previous.cpa),
      change: changes.cpa,
      isPositiveGrowth: false, // CPA 증가는 부정적
    },
  ];

  return (
    <div className="roas-card">
      <h3 className="roas-heading-4">지표 비교표</h3>
      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table className="roas-table">
          <thead>
            <tr>
              <th>지표</th>
              <th style={{ textAlign: 'right' }}>현재</th>
              <th style={{ textAlign: 'right' }}>이전</th>
              <th style={{ textAlign: 'right' }}>변화</th>
              <th style={{ textAlign: 'right' }}>변화율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const { direction, percentage } = row.change;
              const colorClass = getDirectionColorClass(direction, row.isPositiveGrowth);
              const arrow = getDirectionArrow(direction);

              return (
                <tr key={index}>
                  <td style={{ fontWeight: 600 }}>{row.metric}</td>
                  <td style={{ textAlign: 'right' }}>{row.current}</td>
                  <td style={{ textAlign: 'right', color: '#A0AEC0' }}>{row.previous}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={colorClass} style={{ fontWeight: 600 }}>
                      {arrow}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={colorClass} style={{ fontWeight: 600 }}>
                      {formatPercentage(Math.abs(percentage))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MetricsTable;
