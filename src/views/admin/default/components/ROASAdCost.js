// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useDateRange } from "contexts/DateRangeContext";

export default function ROASAdCost(props) {
  const { ...rest } = props;

  const { startDate, endDate } = useDateRange();

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");

  // 동적 날짜 및 데이터 생성
  const { chartOptions, chartSeries } = useMemo(() => {
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

    const series = [
      {
        name: "광고비",
        type: "column",
        data: adCostData,
      },
      {
        name: "ROAS",
        type: "line",
        data: roasData,
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
        size: 0,
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
        tickAmount: Math.min(diffDays, 10),
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
          labels: {
            style: {
              colors: "#A3AED0",
              fontSize: "12px",
              fontWeight: "500",
            },
            formatter: function (val) {
              return val.toFixed(2);
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
              return "₩" + val.toLocaleString();
            }
            return val.toFixed(2);
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
  }, [startDate, endDate, textColor]);

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
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type='line'
          height='100%'
        />
      </Box>
    </Card>
  );
}
