import React, { createContext, useContext, useState } from 'react';

const DateRangeContext = createContext();

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within DateRangeProvider');
  }
  return context;
};

export const DateRangeProvider = ({ children }) => {
  // 기본값: 최근 30일 (2025-12-31 임시 변경)
  const getDefaultRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);

    return {
      start: formatDate(thirtyDaysAgo),
      end: formatDate(today),
    };
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const defaultRange = getDefaultRange();

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [selectedPreset, setSelectedPreset] = useState('최근 30일');

  // 날짜 범위 계산 유틸리티 함수
  const getDateRange = (preset) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const dayOfWeek = today.getDay();

    let start, end;

    switch (preset) {
      case '어제':
        start = new Date(year, month, day - 1);
        end = new Date(year, month, day - 1);
        break;

      case '최근 7일':
        start = new Date(year, month, day - 6);
        end = today;
        break;

      case '최근 14일':
        start = new Date(year, month, day - 13);
        end = today;
        break;

      case '최근 30일':
        start = new Date(year, month, day - 29);
        end = today;
        break;

      case '이번 주':
        // 월요일 기준
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start = new Date(year, month, day + mondayOffset);
        end = today;
        break;

      case '지난주':
        // 지난 주 월요일~일요일
        const lastMondayOffset = dayOfWeek === 0 ? -13 : -6 - dayOfWeek;
        const lastSundayOffset = dayOfWeek === 0 ? -7 : -dayOfWeek;
        start = new Date(year, month, day + lastMondayOffset);
        end = new Date(year, month, day + lastSundayOffset);
        break;

      case '이번 달':
        start = new Date(year, month, 1);
        end = today;
        break;

      case '지난달':
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
        break;

      default:
        return null;
    }

    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  };

  const updateDateRange = (preset) => {
    setSelectedPreset(preset);

    if (preset === '직접설정') {
      return;
    }

    const range = getDateRange(preset);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const value = {
    startDate,
    endDate,
    selectedPreset,
    setStartDate,
    setEndDate,
    updateDateRange,
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};
