// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useState, useEffect, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getDailyROASAndCost } from "services/supabaseService";

export default function ROASAdCost(props) {
  const { ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [roasData, setRoasData] = useState([]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getDailyROASAndCost({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });
        setRoasData(data || []);
      } catch (error) {
        console.error('일별 ROAS 조회 실패:', error);
        setRoasData([]);
      }
    };
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");

  // 동적 날짜 및 데이터 생성
  const { chartOptions, chartSeries } = useMemo(() => {
    /* ❌ Mock 랜덤 데이터 (원복용 보존)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const categories = [];
    const adCostData = [];
    const roasData = [];

    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      categories.push(`${month}/${day}`);

      adCostData.push(Math.floor(Math.random() * 50000) + 50000);
      roasData.push((Math.random() * 3 + 1).toFixed(2));
    }
    */

    // ✅ Supabase 실제 데이터 - 빈 배열 방어 강화
    const safeData = roasData && Array.isArray(roasData) && roasData.length > 0 ? roasData : [];

    // 데이터가 없으면 null 반환 (차트 렌더링 완전 차단)
    if (safeData.length === 0) {
      return {
        chartOptions: null,
        chartSeries: null
      };
    }

    // Invalid Date 필터링
    const validData = safeData.filter(d => {
      const date = new Date(d.date);
      return !isNaN(date.getTime()) &&
             typeof d.cost === 'number' && !Number.isNaN(d.cost) &&
             typeof d.roas === 'number' && !Number.isNaN(d.roas);
    });

    if (validData.length === 0) {
      return {
        chartOptions: null,
        chartSeries: null
      };
    }

    const categories = validData.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const adCostData = validData.map(d => d.cost);
    const roasValues = validData.map(d => d.roas * 100); // 퍼센티지로 변환 (10.0 → 1000%)

    // 디버깅: 실제 데이터 확인
    console.log('=== ROAS & 광고비 데이터 ===');
    console.log('validData:', validData);
    console.log('adCostData:', adCostData);
    console.log('roasValues:', roasValues);

    const series = [
      {
        name: "광고비",
        type: "column",
        data: adCostData,
      },
      {
        name: "ROAS",
        type: "line",
        data: roasValues,
      },
    ];

    const options = {
      chart: {
        height: 350,
        type: "line",
        toolbar: {
          show: false,
        },
      },
      stroke: {
        width: [0, 4],
        curve: "smooth",
      },
      colors: ["#4318FF", "#39B68D"],
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "50%",
        },
      },
      fill: {
        opacity: [0.9, 1],
        type: ["solid", "solid"],
      },
      labels: categories,
      markers: {
        size: validData.length === 1 ? 6 : 0,
      },
      xaxis: {
        labels: {
          style: {
            colors: "#A3AED0",
            fontSize: "12px",
            fontWeight: "500",
          },
          rotate: -45,
          rotateAlways: false,
          hideOverlappingLabels: true,
          showDuplicates: false,
          trim: true,
        },
        tickAmount: Math.min(validData.length, 10),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: [
        {
          tickAmount: 4,
          labels: {
            style: {
              colors: "#A3AED0",
              fontSize: "12px",
              fontWeight: "500",
            },
            formatter: function (val) {
              if (val >= 100000) {
                return "₩" + (val / 10000).toFixed(0) + "만";
              } else if (val >= 10000) {
                return "₩" + (val / 10000).toFixed(1) + "만";
              }
              return "₩" + val.toLocaleString();
            },
          },
        },
        {
          opposite: true,
          min: 0,
          labels: {
            style: {
              colors: "#A3AED0",
              fontSize: "12px",
              fontWeight: "500",
            },
            formatter: function (val) {
              return val.toFixed(0) + '%';
            },
          },
        },
      ],
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        y: {
          formatter: function (val, { seriesIndex }) {
            if (seriesIndex === 0) {
              return "₩" + Math.round(val).toLocaleString();
            }
            return val.toFixed(0) + '%';
          },
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontSize: "14px",
        fontFamily: "DM Sans, sans-serif",
        labels: {
          colors: textColor,
        },
        markers: {
          width: 12,
          height: 12,
          radius: 12,
        },
      },
      grid: {
        show: false,
      },
    };

    return { chartOptions: options, chartSeries: series };
  }, [roasData, textColor]);

  return (
    <Card
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'
      {...rest}>
      <Flex w='100%' px='15px' py='10px'>
        <Text color={textColor} fontSize='lg' fontWeight='700' lineHeight='100%'>
          ROAS & 광고비 분석
        </Text>
      </Flex>
      <Box h='350px' w='100%' px='15px' pb='15px'>
        {!chartSeries || !chartOptions || chartSeries.length === 0 ? (
          <Flex h='100%' align='center' justify='center'>
            <Text color='secondaryGray.600'>데이터가 없습니다</Text>
          </Flex>
        ) : (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type='line'
            height='100%'
          />
        )}
      </Box>
    </Card>
  );
}
