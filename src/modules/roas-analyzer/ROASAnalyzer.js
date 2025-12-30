import React, { useState } from 'react';
import './styles/global.css';

// Components
import FileUpload from './components/FileUpload';
import KPICard from './components/KPICard';
import Chart from './components/Chart';
import MetricsTable from './components/MetricsTable';
import InsightCard from './components/InsightCard';
import PeriodDisplay from './components/PeriodDisplay';

// Core logic
import { parseExcelFile, parseCSVFile } from './utils/fileParser';
import { performAnalysis } from './core/analyzer';
import { splitDataForComparison, groupDataByPeriod } from './core/calculator';

/**
 * ROAS Analyzer - 독립 모듈
 * Horizon UI와 완전히 분리된 독립적인 ROAS 분석 시스템
 */
const ROASAnalyzer = () => {
  const [rawData, setRawData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [compareType, setCompareType] = useState('week'); // 'day' or 'week'

  /**
   * 파일 업로드 처리
   */
  const handleFileUpload = async (file) => {
    try {
      setError(null);
      setAnalysisResult(null);

      // 파일 파싱
      let parsedData;
      if (file.name.toLowerCase().endsWith('.csv')) {
        parsedData = await parseCSVFile(file);
      } else {
        parsedData = await parseExcelFile(file);
      }

      setRawData(parsedData);

      // 자동 분석 수행
      performAutoAnalysis(parsedData);
    } catch (err) {
      setError(err.message);
      console.error('File upload error:', err);
    }
  };

  /**
   * 자동 분석 수행
   */
  const performAutoAnalysis = (data) => {
    try {
      // 데이터를 현재/이전 기간으로 분할
      const { current, previous } = splitDataForComparison(data, compareType);

      if (current.length === 0 || previous.length === 0) {
        setError('비교할 데이터가 충분하지 않습니다. 최소 2일(또는 2주) 이상의 데이터가 필요합니다.');
        return;
      }

      // 분석 수행
      const result = performAnalysis(current, previous);
      setAnalysisResult(result);
    } catch (err) {
      setError(`분석 중 오류 발생: ${err.message}`);
      console.error('Analysis error:', err);
    }
  };

  /**
   * 비교 타입 변경
   */
  const handleCompareTypeChange = (type) => {
    setCompareType(type);
    if (rawData) {
      performAutoAnalysis(rawData);
    }
  };

  /**
   * 차트 데이터 준비
   */
  const prepareChartData = () => {
    if (!rawData) return null;

    const dailyData = groupDataByPeriod(rawData, 'daily');

    return {
      categories: dailyData.map((d) => d.period),
      series: [
        {
          name: 'ROAS',
          data: dailyData.map((d) => d.metrics.roas.toFixed(2)),
        },
        {
          name: '매출',
          data: dailyData.map((d) => Math.round(d.metrics.revenue)),
        },
      ],
    };
  };

  const chartData = prepareChartData();

  return (
    <div className="roas-analyzer-root">
      <div className="roas-analyzer-container">
        {/* 설명 텍스트 */}
        <div style={{ marginBottom: '24px' }}>
          <p className="roas-text-secondary" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            엑셀 또는 CSV 파일을 업로드하여 광고 성과를 자동으로 분석하고 ROAS 변화 원인에 대한 인사이트를 받아보세요.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div
            className="roas-card"
            style={{
              backgroundColor: '#FFF5F5',
              borderLeft: '4px solid #F56565',
              marginBottom: '24px',
            }}
          >
            <div className="roas-flex roas-items-center roas-gap-2">
              <span style={{ fontSize: '24px' }}>❌</span>
              <div>
                <div style={{ fontWeight: 600, color: '#C53030', marginBottom: '4px' }}>
                  오류 발생
                </div>
                <div style={{ fontSize: '14px', color: '#4A5568' }}>{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* 파일 업로드 */}
        {!rawData && (
          <FileUpload onFileUpload={handleFileUpload} onError={setError} />
        )}

        {/* 분석 결과 */}
        {analysisResult && (
          <>
            {/* 비교 타입 선택 */}
            <div className="roas-card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FF 100%)' }}>
              <div className="roas-flex roas-justify-between roas-items-center">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#A3AED0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚙️ 분석 설정
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1B2559' }}>
                    비교 기간을 선택하세요
                  </div>
                </div>
                <div className="roas-flex roas-gap-2">
                  <button
                    className={`roas-button ${
                      compareType === 'day' ? 'roas-button-primary' : 'roas-button-secondary'
                    }`}
                    onClick={() => handleCompareTypeChange('day')}
                  >
                    📅 전일 대비
                  </button>
                  <button
                    className={`roas-button ${
                      compareType === 'week' ? 'roas-button-primary' : 'roas-button-secondary'
                    }`}
                    onClick={() => handleCompareTypeChange('week')}
                  >
                    📆 전주 대비
                  </button>
                </div>
              </div>
            </div>

            {/* 비교 기간 표시 */}
            <PeriodDisplay
              current={analysisResult.current}
              previous={analysisResult.previous}
              compareType={compareType}
            />

            {/* 인사이트 카드 */}
            <InsightCard analysis={analysisResult.analysis} />

            {/* KPI 카드들 */}
            <div className="roas-grid roas-grid-cols-4" style={{ marginTop: '24px' }}>
              <KPICard
                title="ROAS"
                value={analysisResult.comparison.current.roas}
                previousValue={analysisResult.comparison.previous.roas}
                comparison={analysisResult.comparison.comparison.roas}
                format="roas"
                icon="📈"
              />
              <KPICard
                title="매출"
                value={analysisResult.comparison.current.revenue}
                previousValue={analysisResult.comparison.previous.revenue}
                comparison={analysisResult.comparison.comparison.revenue}
                format="currency"
                icon="💰"
              />
              <KPICard
                title="광고비"
                value={analysisResult.comparison.current.adSpend}
                previousValue={analysisResult.comparison.previous.adSpend}
                comparison={analysisResult.comparison.comparison.adSpend}
                format="currency"
                isPositiveGrowth={false}
                icon="💳"
              />
              <KPICard
                title="전환수"
                value={analysisResult.comparison.current.conversions}
                previousValue={analysisResult.comparison.previous.conversions}
                comparison={analysisResult.comparison.comparison.conversions}
                format="number"
                icon="🎯"
              />
            </div>

            {/* 세부 지표 KPI */}
            <div className="roas-grid roas-grid-cols-3" style={{ marginTop: '24px' }}>
              <KPICard
                title="전환율 (CVR)"
                value={analysisResult.comparison.current.cvr}
                previousValue={analysisResult.comparison.previous.cvr}
                comparison={analysisResult.comparison.comparison.cvr}
                format="percentage"
              />
              <KPICard
                title="객단가 (AOV)"
                value={analysisResult.comparison.current.aov}
                previousValue={analysisResult.comparison.previous.aov}
                comparison={analysisResult.comparison.comparison.aov}
                format="currency"
              />
              <KPICard
                title="클릭당 비용 (CPC)"
                value={analysisResult.comparison.current.cpc}
                previousValue={analysisResult.comparison.previous.cpc}
                comparison={analysisResult.comparison.comparison.cpc}
                format="currency"
                isPositiveGrowth={false}
              />
            </div>

            {/* 차트 */}
            {chartData && (
              <div className="roas-grid roas-grid-cols-1" style={{ marginTop: '24px' }}>
                <Chart
                  type="line"
                  title="일별 ROAS 추이"
                  data={[chartData.series[0]]}
                  categories={chartData.categories}
                  height={300}
                />
              </div>
            )}

            {/* 지표 비교표 */}
            <div style={{ marginTop: '24px' }}>
              <MetricsTable comparison={analysisResult.comparison} />
            </div>

            {/* 새 파일 업로드 버튼 */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                className="roas-button roas-button-secondary"
                onClick={() => {
                  setRawData(null);
                  setAnalysisResult(null);
                  setError(null);
                }}
              >
                새 파일 업로드
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ROASAnalyzer;
