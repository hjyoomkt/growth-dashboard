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
 * KPI 카드 컴포넌트
 * Horizon UI 프리미엄 스타일로 완전히 재구현
 */
const KPICard = ({
  title,
  value,
  previousValue,
  comparison,
  format = 'number',
  isPositiveGrowth = true,
  icon = null,
}) => {
  // 값 포맷팅
  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';

    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val, 2);
      case 'roas':
        return formatROAS(val);
      case 'number':
      default:
        return formatNumber(val, 2);
    }
  };

  const direction = comparison?.direction || 'neutral';
  const changePercentage = comparison?.percentage || 0;

  const colorClass = getDirectionColorClass(direction, isPositiveGrowth);
  const arrow = getDirectionArrow(direction);

  // 증감 방향에 따른 스타일
  const getTrendStyle = () => {
    if (direction === 'neutral') return {
      bg: '#F4F7FE',
      color: '#A3AED0',
    };

    const isGood = (direction === 'increase' && isPositiveGrowth) ||
                   (direction === 'decrease' && !isPositiveGrowth);

    if (isGood) {
      return {
        bg: 'linear-gradient(135deg, #E6FAF5 0%, #D1F5EB 100%)',
        color: '#05CD99',
      };
    } else {
      return {
        bg: 'linear-gradient(135deg, #FEEFEE 0%, #FDE5E3 100%)',
        color: '#EE5D50',
      };
    }
  };

  const trendStyle = getTrendStyle();

  return (
    <div className="roas-card" style={{
      background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFCFE 100%)',
    }}>
      {/* 헤더 */}
      <div className="roas-flex roas-justify-between roas-items-center" style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#A3AED0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {title}
        </div>
        {icon && (
          <div style={{
            fontSize: '24px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F4F7FE 0%, #E9EDF7 100%)',
            borderRadius: '14px',
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* 메인 값 */}
      <div style={{
        fontSize: '36px',
        fontWeight: 700,
        color: '#1B2559',
        lineHeight: 1.2,
        marginBottom: '16px',
        letterSpacing: '-0.02em',
      }}>
        {formatValue(value)}
      </div>

      {/* 증감 표시 */}
      {comparison && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '8px 14px',
          borderRadius: '70px',
          background: trendStyle.bg,
          marginBottom: '8px',
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 700,
            color: trendStyle.color,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '16px' }}>{arrow}</span>
            <span>{formatPercentage(Math.abs(changePercentage), 1)}</span>
          </span>
        </div>
      )}

      {/* 이전 값 */}
      {previousValue !== undefined && previousValue !== null && (
        <div style={{
          fontSize: '13px',
          color: '#A3AED0',
          fontWeight: 500,
        }}>
          이전: {formatValue(previousValue)}
        </div>
      )}
    </div>
  );
};

export default KPICard;
