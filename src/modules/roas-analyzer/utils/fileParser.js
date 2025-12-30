import * as XLSX from 'xlsx';

/**
 * 엑셀/CSV 파일을 파싱하여 데이터 추출
 * @param {File} file - 업로드된 파일
 * @returns {Promise<Array<RawDataRow>>}
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 첫 번째 시트 가져오기
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: null,
        });

        // 데이터 정규화
        const normalizedData = normalizeData(jsonData);

        resolve(normalizedData);
      } catch (error) {
        reject(new Error(`파일 파싱 오류: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * 다양한 형식의 데이터를 표준 형식으로 정규화
 * @param {Array} rawData
 * @returns {Array<RawDataRow>}
 */
const normalizeData = (rawData) => {
  if (!rawData || rawData.length === 0) {
    throw new Error('데이터가 비어있습니다.');
  }

  // 컬럼 매핑 (다양한 형식 지원)
  const columnMappings = {
    date: [
      'date', '날짜', '일자', 'Date', 'DATE',
      '일', '보고 시작', '리포팅 시작', 'Day'
    ],
    adSpend: [
      'adSpend', 'ad_spend', '광고비', '광고비용', 'cost', 'Cost', 'spend', 'Spend',
      '지출 금액 (KRW)', '지출 금액', '지출', 'Amount spent', 'Amount Spent'
    ],
    revenue: [
      'revenue', '매출', '수익', 'Revenue', 'REVENUE', 'sales', 'Sales',
      '구매 전환값', '전환값', 'Purchase conversion value', 'Conversion value'
    ],
    conversions: [
      'conversions', '전환수', '전환', 'Conversions', 'CONVERSIONS', 'conv',
      '구매', 'Purchase', 'Purchases', 'Orders'
    ],
    clicks: [
      'clicks', '클릭수', '클릭', 'Clicks', 'CLICKS',
      '링크 클릭', 'Link clicks', 'Link Clicks', 'Outbound clicks'
    ],
    impressions: [
      'impressions', '노출수', '노출', 'Impressions', 'IMPRESSIONS', 'impr',
      'Reach', '도달'
    ],
  };

  // 실제 컬럼명 찾기
  const firstRow = rawData[0];
  const columnMap = {};

  console.log('=== 컬럼 매핑 시작 ===');
  console.log('파일의 실제 컬럼명:', Object.keys(firstRow));
  console.log('첫 번째 행 샘플:', firstRow);

  for (const [standardKey, possibleNames] of Object.entries(columnMappings)) {
    const foundColumn = possibleNames.find((name) => name in firstRow);
    if (foundColumn) {
      columnMap[standardKey] = foundColumn;
      console.log(`✓ ${standardKey} → "${foundColumn}" (값 예시: ${firstRow[foundColumn]})`);
    } else {
      console.log(`✗ ${standardKey} → 찾을 수 없음`);
    }
  }
  console.log('==================');

  // 필수 컬럼 확인
  const requiredColumns = ['date', 'adSpend', 'revenue', 'conversions', 'clicks'];
  const missingColumns = requiredColumns.filter((col) => !columnMap[col]);

  if (missingColumns.length > 0) {
    throw new Error(
      `필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}\n` +
        `필요한 컬럼: 날짜, 광고비, 매출, 전환수, 클릭수`
    );
  }

  // 데이터 변환
  const normalizedData = rawData.map((row, index) => {
    try {
      const normalizedRow = {
        date: parseDate(row[columnMap.date]),
        adSpend: parseNumber(row[columnMap.adSpend]),
        revenue: parseNumber(row[columnMap.revenue]),
        conversions: parseNumber(row[columnMap.conversions]),
        clicks: parseNumber(row[columnMap.clicks]),
        impressions: columnMap.impressions ? parseNumber(row[columnMap.impressions]) : 0,
      };

      // 유효성 검증
      if (!normalizedRow.date) {
        throw new Error(`날짜 형식이 올바르지 않습니다: ${row[columnMap.date]}`);
      }

      return normalizedRow;
    } catch (error) {
      throw new Error(`${index + 2}번째 행 오류: ${error.message}`);
    }
  });

  // 전체 합계 로깅 (디버깅용)
  const totalAdSpend = normalizedData.reduce((sum, row) => sum + row.adSpend, 0);
  const totalRevenue = normalizedData.reduce((sum, row) => sum + row.revenue, 0);
  console.log('=== 파싱 결과 요약 ===');
  console.log(`총 ${normalizedData.length}개 행 파싱 완료`);
  console.log(`광고비 합계: ${totalAdSpend.toLocaleString('ko-KR')}원`);
  console.log(`매출 합계: ${totalRevenue.toLocaleString('ko-KR')}원`);
  console.log('==================');

  return normalizedData;
};

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 변환
 * @param {string|Date} dateValue
 * @returns {string}
 */
const parseDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    let date;

    // Excel 시리얼 날짜 처리
    if (typeof dateValue === 'number') {
      date = XLSX.SSF.parse_date_code(dateValue);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // 문자열 날짜 처리
    if (typeof dateValue === 'string') {
      // YYYY-MM-DD 형식
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }

      // YYYY/MM/DD 형식
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateValue)) {
        return dateValue.replace(/\//g, '-');
      }

      // MM/DD/YYYY 형식
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
        const [month, day, year] = dateValue.split('/');
        return `${year}-${month}-${day}`;
      }

      // Date 객체로 파싱 시도
      date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * 숫자 값으로 변환 (쉼표, 통화 기호 제거)
 * @param {string|number} value
 * @returns {number}
 */
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // 원본 값 로깅 (디버깅용)
    const original = value;

    // 앞뒤 공백 제거
    let cleaned = value.trim();

    // 통화 기호 제거
    cleaned = cleaned.replace(/[₩$€£¥]/g, '');

    // 괄호로 표시된 음수 처리 (예: "(1,000)" → "-1000")
    const isNegative = cleaned.includes('(') && cleaned.includes(')');
    cleaned = cleaned.replace(/[()]/g, '');

    // 천단위 구분자 처리
    // 쉼표가 천단위 구분자인지 소수점인지 판단
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;

    if (commaCount > 0 && dotCount === 0) {
      // 쉼표만 있는 경우 → 천단위 구분자
      cleaned = cleaned.replace(/,/g, '');
    } else if (dotCount > 0 && commaCount === 0) {
      // 점만 있는 경우 → 소수점
      // 그대로 유지
    } else if (commaCount > 0 && dotCount > 0) {
      // 둘 다 있는 경우 → 마지막 것이 소수점
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');

      if (lastDot > lastComma) {
        // 점이 나중에 나옴 → 점이 소수점, 쉼표는 천단위
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // 쉼표가 나중에 나옴 → 쉼표가 소수점, 점은 천단위
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    }

    // 남은 공백 제거
    cleaned = cleaned.replace(/\s/g, '');

    // 숫자 변환
    let number = parseFloat(cleaned);

    if (isNegative) {
      number = -Math.abs(number);
    }

    // 디버깅 로그 (큰 차이가 있을 때만)
    if (!isNaN(number) && Math.abs(number) > 1000) {
      console.log('숫자 파싱:', original, '→', number);
    }

    return isNaN(number) ? 0 : number;
  }

  return 0;
};

/**
 * CSV 파일 파싱 (대안)
 * @param {File} file
 * @returns {Promise<Array<RawDataRow>>}
 */
export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error('데이터가 충분하지 않습니다.');
        }

        // 헤더 파싱
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

        // 데이터 파싱
        const jsonData = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        const normalizedData = normalizeData(jsonData);
        resolve(normalizedData);
      } catch (error) {
        reject(new Error(`CSV 파싱 오류: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsText(file);
  });
};

/**
 * 파일 형식 검증
 * @param {File} file
 * @returns {boolean}
 */
export const validateFileType = (file) => {
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const fileName = file.name.toLowerCase();

  return validExtensions.some((ext) => fileName.endsWith(ext));
};

/**
 * 파일 크기 검증 (10MB 제한)
 * @param {File} file
 * @returns {boolean}
 */
export const validateFileSize = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSize;
};
