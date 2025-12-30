import React from 'react';
import ReactApexChart from 'react-apexcharts';
import '../styles/global.css';
import { roasTheme } from '../styles/theme';

/**
 * 차트 컴포넌트
 * ApexCharts를 사용하되, Horizon UI 스타일과 독립적으로 구현
 */
const Chart = ({ type = 'line', title, data, categories, height = 350 }) => {
  // 차트 기본 옵션
  const getChartOptions = () => {
    const baseOptions = {
      chart: {
        toolbar: {
          show: false,
        },
        fontFamily: roasTheme.typography.fontFamily.base,
        zoom: {
          enabled: false,
        },
        offsetX: 0,
        offsetY: 0,
        parentHeightOffset: 0,
        sparkline: {
          enabled: false,
        },
      },
      colors: [
        roasTheme.colors.brand[500],
        roasTheme.colors.success[500],
        roasTheme.colors.warning[500],
        roasTheme.colors.info[500],
      ],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      grid: {
        borderColor: roasTheme.colors.gray[200],
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      xaxis: {
        categories: categories || [],
        labels: {
          style: {
            colors: roasTheme.colors.text.secondary,
            fontSize: '12px',
            fontWeight: 500,
          },
          rotate: 0,
          rotateAlways: false,
          hideOverlappingLabels: true,
          trim: false,
          offsetY: 5,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        tickPlacement: 'on',
        crosshairs: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: roasTheme.colors.text.secondary,
            fontSize: '12px',
            fontWeight: 500,
          },
          offsetX: -10,
        },
        min: undefined,
        forceNiceScale: true,
        tickAmount: 5,
      },
      tooltip: {
        theme: 'light',
        style: {
          fontSize: '12px',
          fontFamily: roasTheme.typography.fontFamily.base,
        },
      },
      legend: {
        show: true,
        fontSize: '14px',
        fontWeight: 500,
        labels: {
          colors: roasTheme.colors.text.primary,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
    };

    // 타입별 추가 옵션
    if (type === 'area') {
      return {
        ...baseOptions,
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.4,
            opacityTo: 0.1,
            stops: [0, 90, 100],
          },
        },
      };
    }

    if (type === 'bar') {
      return {
        ...baseOptions,
        plotOptions: {
          bar: {
            borderRadius: 8,
            columnWidth: '60%',
          },
        },
      };
    }

    return baseOptions;
  };

  const chartOptions = getChartOptions();

  return (
    <div className="roas-card">
      {title && <h3 className="roas-heading-4">{title}</h3>}
      <div style={{
        marginTop: title ? '16px' : 0,
        paddingBottom: '20px',
        paddingRight: '20px',
        paddingLeft: '5px',
        paddingTop: '10px'
      }}>
        <ReactApexChart
          options={chartOptions}
          series={data}
          type={type}
          height={height}
        />
      </div>
    </div>
  );
};

export default Chart;
