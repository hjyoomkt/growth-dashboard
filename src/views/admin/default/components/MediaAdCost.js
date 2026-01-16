// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import BarChart from "components/charts/BarChart";
import React, { useMemo, useState, useEffect } from "react";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getMediaAdCost } from "services/supabaseService";

export default function MediaAdCost(props) {
  const { mediaData, ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [mediaDataFromDB, setMediaDataFromDB] = useState([]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getMediaAdCost({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });
        setMediaDataFromDB(data || []);
      } catch (error) {
        console.error('매체별 광고비 조회 실패:', error);
        setMediaDataFromDB([]);
      }
    };
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");

  // ===== 2025-12-31: Supabase 데이터 우선 사용 =====
  const data = useMemo(() => {
    if (mediaData) return mediaData;
    if (mediaDataFromDB.length > 0) return mediaDataFromDB;
    return [];
  }, [mediaData, mediaDataFromDB, startDate, endDate]);
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
        {data.length === 0 ? (
          <Flex h='100%' align='center' justify='center'>
            <Text color='secondaryGray.600'>데이터가 없습니다</Text>
          </Flex>
        ) : (
          <BarChart  chartData={barChartData} chartOptions={barChartOptions} />
        )}
      </Box>
    </Card>
  );
}
