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
import { getDailyRevenue } from "services/supabaseService";

export default function TotalSpent(props) {
  const { ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [revenueData, setRevenueData] = useState([]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[TotalSpent] 조회 시작:', { currentAdvertiserId, startDate, endDate });
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getDailyRevenue({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });
        console.log('[TotalSpent] 조회 결과:', data);
        setRevenueData(data || []);
      } catch (error) {
        console.error('일별 매출 조회 실패:', error);
        setRevenueData([]);
      }
    };
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");

  // 총 매출 계산
  const totalRevenue = useMemo(() => {
    return revenueData.reduce((sum, d) => sum + d.revenue, 0);
  }, [revenueData]);

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

      data.push(Math.floor(Math.random() * 100000) + 100000);
    }
    */

    // ✅ Supabase 실제 데이터
    const safeData = revenueData && Array.isArray(revenueData) ? revenueData : [];
    const categories = safeData.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const data = safeData.map(d => d.revenue);

    const lineChartData = [{
      name: "매출",
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
      },
      colors: ["#39B68D"],
      markers: {
        size: 0,
        colors: "white",
        strokeColors: "#39B68D",
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
        enabled: false,
      },
      stroke: {
        curve: "smooth",
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
        labels: {
          style: {
            colors: "#A3AED0",
            fontSize: "12px",
            fontWeight: "500",
          },
          offsetX: -10,
          formatter: function (val) {
            if (!val || val === 0) return "₩0";
            const maxVal = data.length > 0 ? Math.max(...data) : 0;
            if (maxVal >= 1000000) {
              return "₩" + (val / 10000).toFixed(0) + "만";
            } else if (maxVal >= 100000) {
              return "₩" + (val / 10000).toFixed(0) + "만";
            } else if (maxVal >= 10000) {
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
        show: false,
      },
      fill: {
        type: "solid",
        opacity: 1,
      },
    };

    return { chartData: lineChartData, chartOptions: lineChartOptions };
  }, [revenueData]);

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
          총매출
        </Text>
      </Flex>
      <Flex w='100%' flexDirection='column'>
        <Flex flexDirection='column' ps='25px' pe='20px' pt='5px' pb='15px'>
          <Text
            color={textColor}
            fontSize='34px'
            textAlign='start'
            fontWeight='700'
            lineHeight='100%'>
            ₩{totalRevenue.toLocaleString()}
          </Text>
          <Text
            color={textColorSecondary}
            fontSize='sm'
            fontWeight='500'
            mt='4px'>
            매출액
          </Text>
        </Flex>
        <Box h='260px' w='100%' px='15px' pb='15px'>
          {revenueData.length === 0 ? (
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
      </Flex>
    </Card>
  );
}
