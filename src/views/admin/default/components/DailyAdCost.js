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
import React, { useMemo } from "react";
import { useDateRange } from "contexts/DateRangeContext";

export default function DailyAdCost(props) {
  const { ...rest } = props;

  const { startDate, endDate } = useDateRange();

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");

  // 동적 날짜 및 데이터 생성
  const { chartData, chartOptions } = useMemo(() => {
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
      },
      colors: ["#FF6B6B"],
      markers: {
        size: 0,
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
        tickAmount: Math.min(diffDays, 10),
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
        show: false,
      },
      fill: {
        type: "solid",
        opacity: 1,
      },
    };

    return { chartData: lineChartData, chartOptions: lineChartOptions };
  }, [startDate, endDate]);

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
          ₩0
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
        <LineChart
          key={`${startDate}-${endDate}`}
          chartData={chartData}
          chartOptions={chartOptions}
        />
      </Box>
    </Card>
  );
}
