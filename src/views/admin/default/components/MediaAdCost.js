// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import BarChart from "components/charts/BarChart";
import React, { useMemo } from "react";
import { useDateRange } from "contexts/DateRangeContext";

export default function MediaAdCost(props) {
  const { mediaData, ...rest } = props;

  const { startDate, endDate } = useDateRange();

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");

  // 동적 데이터 처리: props로 받은 mediaData 사용, 없으면 기간 기반 임시 데이터 생성
  const data = useMemo(() => {
    if (mediaData) return mediaData;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const dailyAvg = diffDays > 0 ? diffDays : 1;

    return [
      { name: "Google", value: Math.floor((Math.random() * 50000 + 200000) * dailyAvg / 7) },
      { name: "Naver", value: Math.floor((Math.random() * 40000 + 150000) * dailyAvg / 7) },
      { name: "Meta", value: Math.floor((Math.random() * 30000 + 120000) * dailyAvg / 7) },
      { name: "Kakao", value: Math.floor((Math.random() * 25000 + 100000) * dailyAvg / 7) },
      { name: "Criteo", value: Math.floor((Math.random() * 20000 + 60000) * dailyAvg / 7) },
    ];
  }, [mediaData, startDate, endDate]);
  const categories = data.map((item) => item.name);
  const values = data.map((item) => item.value);

  const barChartData = [{
    name: "광고비",
    data: values,
  }];

  const barChartOptions = {
    chart: {
      toolbar: {
        show: false,
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: function (val) {
          return '₩' + val.toLocaleString();
        },
      },
    },
    xaxis: {
      categories: categories,
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
    grid: {
      show: false,
    },
    colors: ["#E31A1A", "#01B574", "#422AFB", "#FFB547", "#EE5D50"],
    plotOptions: {
      bar: {
        borderRadius: 10,
        columnWidth: "40px",
        distributed: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: "solid",
      opacity: 0.9,
    },
    legend: {
      show: false,
    },
  };

  return (
    <Card align='center' direction='column' w='100%' {...rest}>
      <Flex align='center' w='100%' px='15px' py='10px'>
        <Text
          me='auto'
          color={textColor}
          fontSize='lg'
          fontWeight='700'
          lineHeight='100%'>
          매체별 광고비
        </Text>
      </Flex>

      <Box h='350px' mt='auto' w='100%' px='15px'>
        <BarChart key={`${startDate}-${endDate}`} chartData={barChartData} chartOptions={barChartOptions} />
      </Box>
    </Card>
  );
}
