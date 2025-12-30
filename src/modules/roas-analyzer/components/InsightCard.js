import React from 'react';
import '../styles/global.css';

/**
 * 인사이트 카드 컴포넌트
 * 자연어 분석 결과 표시
 */
const InsightCard = ({ analysis }) => {
  if (!analysis) return null;

  const { type, mainReason, contributingFactors, recommendations } = analysis;

  // 타입별 아이콘 및 색상
  const getTypeConfig = () => {
    switch (type) {
      case 'positive':
        return {
          icon: '✅',
          title: 'ROAS 개선',
          bgColor: '#F0FFF4',
          borderColor: '#48BB78',
          iconColor: '#48BB78',
        };
      case 'negative':
        return {
          icon: '⚠️',
          title: 'ROAS 하락',
          bgColor: '#FFF5F5',
          borderColor: '#F56565',
          iconColor: '#F56565',
        };
      default:
        return {
          icon: 'ℹ️',
          title: 'ROAS 안정',
          bgColor: '#EBF8FF',
          borderColor: '#4299E1',
          iconColor: '#4299E1',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      className="roas-card"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        backgroundColor: config.bgColor,
      }}
    >
      <div className="roas-flex roas-items-center roas-gap-2 roas-mb-3">
        <span style={{ fontSize: '24px' }}>{config.icon}</span>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#2D3748',
            margin: 0,
          }}
        >
          {config.title}
        </h3>
      </div>

      {/* 주요 원인 */}
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#2D3748',
          marginBottom: '16px',
          lineHeight: 1.6,
        }}
      >
        {mainReason}
      </div>

      {/* 기여 요인 */}
      {contributingFactors && contributingFactors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#4A5568',
              marginBottom: '8px',
            }}
          >
            주요 변화:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#4A5568',
              fontSize: '14px',
              lineHeight: 1.8,
            }}
          >
            {contributingFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 권장 사항 */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#4A5568',
              marginBottom: '8px',
            }}
          >
            💡 권장 사항:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#4A5568',
              fontSize: '14px',
              lineHeight: 1.8,
            }}
          >
            {recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InsightCard;
