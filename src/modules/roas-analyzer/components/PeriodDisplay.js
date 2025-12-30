import React from 'react';
import '../styles/global.css';

/**
 * 비교 기간 표시 컴포넌트
 * 어떤 기간을 비교하고 있는지 명확하게 표시
 */
const PeriodDisplay = ({ current, previous, compareType }) => {
  if (!current || !previous) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateRange = (startDate, endDate) => {
    if (startDate === endDate) {
      const date = new Date(startDate);
      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
    return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  };

  const getCompareTypeLabel = () => {
    return compareType === 'day' ? '전일 대비' : '전주 대비';
  };

  return (
    <div className="roas-card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FF 100%)' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#A3AED0', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📅 비교 기간 분석
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1B2559', marginBottom: '4px' }}>
          {getCompareTypeLabel()} 분석 중
        </div>
      </div>

      <div className="roas-grid roas-grid-cols-2" style={{ gap: '16px' }}>
        {/* 현재 기간 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4318FF 0%, #6B46FF 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0px 4px 12px rgba(67, 24, 255, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#05CD99',
              marginRight: '8px',
            }} />
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              현재 기간
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
            {formatDateRange(current.startDate, current.endDate)}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
            {current.data?.length || 0}일 데이터
          </div>
        </div>

        {/* 이전 기간 */}
        <div
          style={{
            background: '#F4F7FE',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#A3AED0',
              marginRight: '8px',
            }} />
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#A3AED0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              이전 기간
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1B2559' }}>
            {formatDateRange(previous.startDate, previous.endDate)}
          </div>
          <div style={{ fontSize: '13px', color: '#A3AED0', marginTop: '4px' }}>
            {previous.data?.length || 0}일 데이터
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: '#EEF2FF',
        borderRadius: '12px',
        border: '1px solid #E0E7FF',
      }}>
        <div style={{ fontSize: '13px', color: '#4318FF', fontWeight: 600, textAlign: 'center' }}>
          💡 {compareType === 'day' ? '최근 1일과 그 전 1일' : '최근 7일과 그 전 7일'}을 비교하여 ROAS 변화를 분석합니다
        </div>
      </div>
    </div>
  );
};

export default PeriodDisplay;
