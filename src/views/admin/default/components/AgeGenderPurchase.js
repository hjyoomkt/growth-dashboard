// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import BarChart from "components/charts/BarChart";
import React from "react";

export default function AgeGenderPurchase(props) {
  const { ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");

  // Mock 데이터: 연령대별 성별 구매 (나중에 Supabase에서 가져올 데이터)
  const ageGroups = ['18-24', '25-34', '35-44', '45-64', '65+'];

  // 각 연령대별 성별 구매 수
  const maleData = [150, 580, 690, 1150, 1520];
  const femaleData = [100, 450, 580, 1150, 1080];
  const unknownData = [50, 120, 80, 200, 260];

  const totalPurchases = maleData.reduce((a, b) => a + b, 0) +
                         femaleData.reduce((a, b) => a + b, 0) +
                         unknownData.reduce((a, b) => a + b, 0);

  const barChartData = [
    {
      name: "남성",
      data: maleData,
    },
    {
      name: "여성",
      data: femaleData,
    },
    {
      name: "알수없음",
      data: unknownData,
    },
  ];

  const barChartOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 10,
        borderRadiusApplication: 'end',
        barHeight: '55%',
      },
    },
    colors: ["#422AFB", "#C084FC", "#CBD5E0"],
    dataLabels: {
      enabled: false,
    },
    grid: {
      show: false,
    },
    xaxis: {
      categories: ageGroups,
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#A3AED0",
          fontSize: "13px",
          fontWeight: "500",
        },
      },
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      y: {
        formatter: function (val) {
          return val + "건";
        },
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const ageGroup = ageGroups[dataPointIndex];
        const male = series[0][dataPointIndex];
        const female = series[1][dataPointIndex];
        const unknown = series[2][dataPointIndex];
        const total = male + female + unknown;

        return '<div style="padding: 12px; background: #1A202C; border-radius: 8px; min-width: 180px;">' +
          '<div style="color: #A3AED0; font-size: 12px; margin-bottom: 8px;">' + ageGroup + '</div>' +
          '<div style="margin-bottom: 6px;">' +
            '<span style="color: #422AFB; font-size: 14px;">●</span>' +
            '<span style="color: #fff; font-size: 13px; margin-left: 6px;">남성: ' + male + '건</span>' +
          '</div>' +
          '<div style="margin-bottom: 6px;">' +
            '<span style="color: #C084FC; font-size: 14px;">●</span>' +
            '<span style="color: #fff; font-size: 13px; margin-left: 6px;">여성: ' + female + '건</span>' +
          '</div>' +
          '<div style="margin-bottom: 6px;">' +
            '<span style="color: #CBD5E0; font-size: 14px;">●</span>' +
            '<span style="color: #fff; font-size: 13px; margin-left: 6px;">알수없음: ' + unknown + '건</span>' +
          '</div>' +
          '<div style="border-top: 1px solid #4A5568; margin-top: 8px; padding-top: 6px;">' +
            '<span style="color: #fff; font-size: 14px; font-weight: 600;">합계: ' + total + '건</span>' +
          '</div>' +
          '</div>';
      },
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      fontSize: '13px',
      fontFamily: 'DM Sans, sans-serif',
      labels: {
        colors: textColor,
      },
      markers: {
        width: 10,
        height: 10,
        radius: 10,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      },
    },
    states: {
      hover: {
        filter: {
          type: 'darken',
          value: 0.9,
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
          연령대별 성별 구매
        </Text>
      </Flex>

      <Box h='300px' mt='20px' w='100%' px='15px'>
        <BarChart
          chartData={barChartData}
          chartOptions={barChartOptions}
        />
      </Box>
    </Card>
  );
}
