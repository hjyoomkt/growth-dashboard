// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
// Custom components
import DonutChart from "components/charts/DonutChart";
import React from "react";

export default function WeeklyRevenue(props) {
  const { mediaData, ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const legendTextColor = useColorModeValue("secondaryGray.900", "white");

  // 동적 데이터 처리: props로 받은 mediaData 사용, 없으면 임시 데이터 사용
  const defaultData = [
    { name: "Google", value: 450000 },
    { name: "Naver", value: 320000 },
    { name: "Meta", value: 280000 },
    { name: "Kakao", value: 200000 },
    { name: "Criteo", value: 150000 },
    { name: "기타", value: 100000 },
  ];

  const data = mediaData || defaultData;
  const labels = data.map((item) => item.name);
  const values = data.map((item) => item.value);

  // 매체별 색상 매핑
  const getMediaColor = (name) => {
    const colorMap = {
      "Google": "#E31A1A",
      "Naver": "#01B574",
      "Meta": "#422AFB",
      "Kakao": "#FFB547",
      "Criteo": "#EE5D50",
      "기타": "#A3AED0"
    };
    return colorMap[name] || "#A3AED0";
  };

  const colors = labels.map(label => getMediaColor(label));

  // 도넛차트 데이터 (매체별 매출)
  const pieChartData = values;
  const pieChartOptions = {
    labels: labels,
    colors: colors.slice(0, labels.length),
    chart: {
      type: 'donut',
      height: 350,
    },
    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
    },
    legend: {
      show: true,
      position: "bottom",
      fontSize: '14px',
      fontFamily: 'DM Sans, sans-serif',
      labels: {
        colors: legendTextColor,
      },
      markers: {
        width: 12,
        height: 12,
        radius: 12,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 8,
      },
    },
    dataLabels: {
      enabled: false,
    },
    hover: { mode: null },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: false,
          },
        },
      },
    },
    fill: {
      colors: colors.slice(0, labels.length),
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      y: {
        formatter: function (val) {
          return '₩' + val.toLocaleString();
        },
      },
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
          매체별 매출 분석
        </Text>
      </Flex>

      <Box h='100%' mt='auto' w='100%'>
        <DonutChart chartData={pieChartData} chartOptions={pieChartOptions} />
      </Box>
    </Card>
  );
}
