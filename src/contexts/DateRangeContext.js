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
  // 기본값: 최근 30일 (종료일 = 어제)
  const getDefaultRange = () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);

    return {
      start: formatDate(thirtyDaysAgo),
      end: formatDate(yesterday),
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
    const yesterday = new Date(year, month, day - 1);

    let start, end;

    switch (preset) {
      case '어제':
        start = new Date(year, month, day - 1);
        end = new Date(year, month, day - 1);
        break;

      case '최근 7일':
        start = new Date(year, month, day - 7);
        end = yesterday;
        break;

      case '최근 14일':
        start = new Date(year, month, day - 14);
        end = yesterday;
        break;

      case '최근 30일':
        start = new Date(year, month, day - 30);
        end = yesterday;
        break;

      case '이번 주':
        // 월요일 기준
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start = new Date(year, month, day + mondayOffset);
        end = yesterday;
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
        end = yesterday;
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
    setSelectedPreset,
    updateDateRange,
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};
