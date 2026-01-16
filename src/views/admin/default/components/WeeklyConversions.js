// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import BarChart from "components/charts/BarChart";
import React, { useState, useEffect, useMemo } from "react";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getWeeklyConversions } from "services/supabaseService";

export default function WeeklyConversions(props) {
  const { ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getWeeklyConversions({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });
        setWeeklyData(data && data.length === 7 ? data : [0, 0, 0, 0, 0, 0, 0]);
      } catch (error) {
        console.error('요일별 전환수 조회 실패:', error);
        setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
      }
    };
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");

  // 요일별 전환수 데이터 생성
  const { chartData, chartOptions, maxConversion } = useMemo(() => {
    /* ❌ Mock 랜덤 데이터 (원복용 보존)
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 요일별 전환수 집계 (0=일요일 ~ 6=토요일)
    const dayConversions = [0, 0, 0, 0, 0, 0, 0];

    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // Mock 데이터: 랜덤 전환수 (실제로는 Supabase에서 가져올 데이터)
      dayConversions[dayOfWeek] += Math.floor(Math.random() * 50) + 10;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 월~일 순서로 재배열 (1월 2화 3수 4목 5금 6토 0일)
    const reorderedData = [
      dayConversions[1], // 월
      dayConversions[2], // 화
      dayConversions[3], // 수
      dayConversions[4], // 목
      dayConversions[5], // 금
      dayConversions[6], // 토
      dayConversions[0], // 일
    ];
    */

    // ✅ Supabase 실제 데이터 (이미 월~일 순서)
    const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    const safeData = weeklyData && Array.isArray(weeklyData) && weeklyData.length === 7
      ? weeklyData
      : [0, 0, 0, 0, 0, 0, 0];
    const maxValue = Math.max(...safeData);

    const barChartData = [{
      name: "전환수",
      data: safeData,
    }];

    const barChartOptions = {
      chart: {
        type: 'bar',
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 12,
          borderRadiusApplication: 'end',
          columnWidth: '45%',
          distributed: false,
        },
      },
      colors: ["#422AFB"],
      dataLabels: {
        enabled: false,
      },
      grid: {
        show: false,
      },
      xaxis: {
        categories: weekdays,
        labels: {
          style: {
            colors: "#A3AED0",
            fontSize: "14px",
            fontWeight: "500",
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        show: true,
        labels: {
          style: {
            colors: "#A3AED0",
            fontSize: "12px",
          },
        },
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: function (val) {
            return val + "건";
          },
        },
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const value = series[seriesIndex][dataPointIndex];
          const day = weekdays[dataPointIndex];
          return '<div style="padding: 10px; background: #1A202C; border-radius: 8px;">' +
            '<div style="color: #fff; font-size: 14px; font-weight: 600;">' + day + '</div>' +
            '<div style="color: #fff; font-size: 16px; font-weight: 700; margin-top: 4px;">' + value + '건</div>' +
            '</div>';
        },
      },
      legend: {
        show: false,
      },
      states: {
        hover: {
          filter: {
            type: 'darken',
            value: 0.85,
          },
        },
      },
    };

    return {
      chartData: barChartData,
      chartOptions: barChartOptions,
      maxConversion: maxValue,
    };
  }, [weeklyData]);

  return (
    <Card align='center' direction='column' w='100%' {...rest}>
      <Flex align='center' w='100%' px='15px' py='10px'>
        <Text
          me='auto'
          color={textColor}
          fontSize='lg'
          fontWeight='700'
          lineHeight='100%'>
          요일별 전환수
        </Text>
      </Flex>

      <Flex w='100%' flexDirection='column' px='15px'>
        <Flex align='center' mb='10px'>
          <Text
            color={textColor}
            fontSize='28px'
            fontWeight='700'
            lineHeight='100%'>
            {maxConversion}
          </Text>
          <Text
            color='secondaryGray.600'
            fontSize='sm'
            fontWeight='500'
            ml='5px'>
            건
          </Text>
        </Flex>
        <Text
          color='green.500'
          fontSize='sm'
          fontWeight='500'>
          최대 전환 요일
        </Text>
      </Flex>

      <Box h='240px' mt='20px' w='100%' px='15px'>
        {maxConversion === 0 ? (
          <Flex h='100%' align='center' justify='center'>
            <Text color='secondaryGray.600'>데이터가 없습니다</Text>
          </Flex>
        ) : (
          <BarChart
            
            chartData={chartData}
            chartOptions={chartOptions}
          />
        )}
      </Box>
    </Card>
  );
}
