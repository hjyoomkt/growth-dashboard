import React, { createContext, useContext, useState } from 'react';
import { getKSTNow, getKSTYesterday, getKSTDaysAgo, formatDateToYYYYMMDD } from 'utils/dateUtils';

const DateRangeContext = createContext();

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within DateRangeProvider');
  }
  return context;
};

export const DateRangeProvider = ({ children }) => {
  // 기본값: 최근 30일 (종료일 = 어제, KST 기준)
  const getDefaultRange = () => {
    return {
      start: getKSTDaysAgo(30),
      end: getKSTYesterday(),
    };
  };

  const defaultRange = getDefaultRange();

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [selectedPreset, setSelectedPreset] = useState('최근 30일');

  // 날짜 범위 계산 유틸리티 함수 (KST 기준)
  const getDateRange = (preset) => {
    const kstNow = getKSTNow();
    const year = kstNow.getFullYear();
    const month = kstNow.getMonth();
    const day = kstNow.getDate();
    const dayOfWeek = kstNow.getDay();

    let start, end;

    switch (preset) {
      case '어제':
        return {
          start: getKSTYesterday(),
          end: getKSTYesterday(),
        };

      case '최근 7일':
        return {
          start: getKSTDaysAgo(7),
          end: getKSTYesterday(),
        };

      case '최근 14일':
        return {
          start: getKSTDaysAgo(14),
          end: getKSTYesterday(),
        };

      case '최근 30일':
        return {
          start: getKSTDaysAgo(30),
          end: getKSTYesterday(),
        };

      case '이번 주':
        // 월요일 기준
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start = new Date(year, month, day + mondayOffset);
        return {
          start: formatDateToYYYYMMDD(start),
          end: getKSTYesterday(),
        };

      case '지난주':
        // 지난 주 월요일~일요일
        const lastMondayOffset = dayOfWeek === 0 ? -13 : -6 - dayOfWeek;
        const lastSundayOffset = dayOfWeek === 0 ? -7 : -dayOfWeek;
        start = new Date(year, month, day + lastMondayOffset);
        end = new Date(year, month, day + lastSundayOffset);
        return {
          start: formatDateToYYYYMMDD(start),
          end: formatDateToYYYYMMDD(end),
        };

      case '이번 달':
        start = new Date(year, month, 1);
        return {
          start: formatDateToYYYYMMDD(start),
          end: getKSTYesterday(),
        };

      case '지난달':
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
        return {
          start: formatDateToYYYYMMDD(start),
          end: formatDateToYYYYMMDD(end),
        };

      default:
        return null;
    }
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
