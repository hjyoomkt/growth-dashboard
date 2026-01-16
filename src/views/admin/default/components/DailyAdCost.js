// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import LineChart from "components/charts/LineChart";
import React, { useMemo, useState, useEffect } from "react";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getDailyAdCost } from "services/supabaseService";

export default function DailyAdCost(props) {
  const { ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [dailyData, setDailyData] = useState([]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getDailyAdCost({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });
        setDailyData(data || []);
      } catch (error) {
        console.error('일별 광고비 조회 실패:', error);
        setDailyData([]);
      }
    };
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");

  // 총 광고비 계산
  const totalCost = useMemo(() => {
    return dailyData.reduce((sum, d) => sum + d.cost, 0);
  }, [dailyData]);

  // ===== 2025-12-31: Supabase 데이터로 차트 생성 =====
  const { chartData, chartOptions } = useMemo(() => {
    /* ❌ Mock 랜덤 데이터 (원복용 보존)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const categories = [];
    const data = [];

    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      categories.push(`${month}/${day}`);

      data.push(Math.floor(Math.random() * 50000) + 50000);
    }
    */

    // ✅ Supabase 실제 데이터
    const safeData = dailyData && Array.isArray(dailyData) ? dailyData : [];
    const categories = safeData.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const data = safeData.map(d => d.cost);

    const lineChartData = [{
      name: "광고비",
      data: data,
    }];

    const lineChartOptions = {
      chart: {
        toolbar: {
          show: false,
        },
        dropShadow: {
          enabled: false,
        },
        type: 'line',
      },
      colors: ["#FF6B6B"],
      markers: {
        size: 6,
        colors: "white",
        strokeColors: "#FF6B6B",
        strokeWidth: 3,
        strokeOpacity: 0.9,
        strokeDashArray: 0,
        fillOpacity: 1,
        discrete: [],
        shape: "circle",
        radius: 2,
        offsetX: 0,
        offsetY: 0,
        showNullDataPoints: true,
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: function (val) {
            return "₩" + val.toLocaleString();
          },
        },
      },
      dataLabels: {
        enabled: data.length === 1,
        offsetY: -10,
        style: {
          fontSize: '14px',
          colors: ["#4318FF"]
        },
        formatter: function (val) {
          return "₩" + val.toLocaleString();
        },
      },
      stroke: {
        curve: data.length === 1 ? "straight" : "smooth",
        type: "line",
        width: 4,
      },
      xaxis: {
        type: "category",
        categories: categories,
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
        tickAmount: Math.min(safeData.length, 10),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        show: true,
        tickAmount: 4,
        min: 0,
        max: data.length === 1 && data[0] > 0 ? data[0] * 1.2 : undefined,
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
      legend: {
        show: false,
      },
      grid: {
        show: true,
        borderColor: '#E2E8F0',
        strokeDashArray: 5,
        yaxis: {
          lines: {
            show: true
          }
        },
      },
      fill: {
        type: "solid",
        opacity: 1,
      },
    };

    return { chartData: lineChartData, chartOptions: lineChartOptions };
  }, [dailyData]);

  return (
    <Card
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'
      {...rest}>
      <Flex justify='space-between' align='start' w='100%' px='15px' py='10px'>
        <Text color={textColor} fontSize='lg' fontWeight='700' lineHeight='100%'>
          일일 광고 비용
        </Text>
      </Flex>
      <Flex flexDirection='column' ps='25px' pe='20px' pt='5px' pb='15px'>
        <Text
          color={textColor}
          fontSize='34px'
          textAlign='start'
          fontWeight='700'
          lineHeight='100%'>
          ₩{totalCost.toLocaleString()}
        </Text>
        <Text
          color={textColorSecondary}
          fontSize='sm'
          fontWeight='500'
          mt='4px'>
          총 광고비
        </Text>
      </Flex>
      <Box h='240px' w='100%' px='15px' pb='15px'>
        {dailyData.length === 0 ? (
          <Flex h='100%' align='center' justify='center'>
            <Text color='secondaryGray.600'>데이터가 없습니다</Text>
          </Flex>
        ) : (
          <LineChart
            
            chartData={chartData}
            chartOptions={chartOptions}
          />
        )}
      </Box>
    </Card>
  );
}
