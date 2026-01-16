// Chakra imports
import { Box, Flex, Text, useColorModeValue } from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import ReactApexChart from "react-apexcharts";
import { VSeparator } from "components/separator/Separator";
import React, { useState, useEffect } from "react";
import { supabase } from "config/supabase";

export default function GenderPurchasePie(props) {
  const { currentAdvertiserId, availableAdvertisers, startDate, endDate, ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const cardColor = useColorModeValue("white", "navy.700");
  const cardShadow = useColorModeValue(
    "0px 18px 40px rgba(112, 144, 176, 0.12)",
    "unset"
  );

  const [, setLoading] = useState(true);
  const [genderData, setGenderData] = useState({
    male: 0,
    female: 0,
    unknown: 0
  });

  useEffect(() => {
    fetchGenderData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const fetchGenderData = async () => {
    try {
      setLoading(true);

      const advertiserIds = currentAdvertiserId === 'all'
        ? (availableAdvertisers || []).map(adv => adv.id)
        : [currentAdvertiserId];

      if (advertiserIds.length === 0) {
        setGenderData({ male: 0, female: 0, unknown: 0 });
        return;
      }

      const { data, error } = await supabase
        .from('ad_performance_demographics')
        .select('gender, conversions')
        .in('advertiser_id', advertiserIds)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const result = { male: 0, female: 0, unknown: 0 };
      (data || []).forEach(row => {
        const conv = parseFloat(row.conversions) || 0;
        if (row.gender === 'male') result.male += conv;
        else if (row.gender === 'female') result.female += conv;
        else result.unknown += conv;
      });

      setGenderData(result);
    } catch (error) {
      console.error('성별 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPurchases = genderData.male + genderData.female + genderData.unknown;
  const malePurchases = genderData.male;
  const femalePurchases = genderData.female;
  const unknownPurchases = genderData.unknown;

  const malePercentage = totalPurchases > 0 ? ((malePurchases / totalPurchases) * 100).toFixed(0) : 0;
  const femalePercentage = totalPurchases > 0 ? ((femalePurchases / totalPurchases) * 100).toFixed(0) : 0;
  const unknownPercentage = totalPurchases > 0 ? ((unknownPurchases / totalPurchases) * 100).toFixed(0) : 0;

  // 차트 데이터
  const chartData = [malePurchases, femalePurchases, unknownPurchases];

  // 차트 옵션
  const chartOptions = {
    labels: ["남성", "여성", "알 수 없음"],
    colors: ["#422AFB", "#C084FC", "#CBD5E0"],
    chart: {
      width: "100%",
    },
    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
    },
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    hover: { mode: null },
    plotOptions: {
      donut: {
        expandOnClick: false,
        donut: {
          labels: {
            show: false,
          },
        },
      },
    },
    fill: {
      colors: ["#422AFB", "#C084FC", "#CBD5E0"],
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      y: {
        formatter: function (val) {
          return val + "건";
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
          성별 구매 분석
        </Text>
      </Flex>

      <Box
        h='240px'
        mt='20px'
        w='100%'
        px='15px'
        sx={{
          '& .apexcharts-canvas': {
            background: 'transparent !important',
          },
          '& .apexcharts-canvas svg': {
            background: 'transparent !important',
          }
        }}>
        <ReactApexChart
          options={chartOptions}
          series={chartData}
          type='pie'
          width='100%'
          height='100%'
        />
      </Box>

      <Card
        bg={cardColor}
        flexDirection='row'
        boxShadow={cardShadow}
        w='100%'
        p='15px'
        px='20px'
        mt='20px'
        mx='auto'>
        <Flex direction='column' py='5px' me='10px'>
          <Flex align='center'>
            <Box h='8px' w='8px' bg='#422AFB' borderRadius='50%' me='4px' />
            <Text
              fontSize='xs'
              color='secondaryGray.600'
              fontWeight='700'
              mb='5px'>
              남성
            </Text>
          </Flex>
          <Text fontSize='lg' color={textColor} fontWeight='700'>
            {malePercentage}%
          </Text>
        </Flex>
        <VSeparator mx={{ base: "30px", xl: "30px", "2xl": "40px" }} />
        <Flex direction='column' py='5px' me='10px'>
          <Flex align='center'>
            <Box h='8px' w='8px' bg='#C084FC' borderRadius='50%' me='4px' />
            <Text
              fontSize='xs'
              color='secondaryGray.600'
              fontWeight='700'
              mb='5px'>
              여성
            </Text>
          </Flex>
          <Text fontSize='lg' color={textColor} fontWeight='700'>
            {femalePercentage}%
          </Text>
        </Flex>
        <VSeparator mx={{ base: "30px", xl: "30px", "2xl": "40px" }} />
        <Flex direction='column' py='5px'>
          <Flex align='center'>
            <Box h='8px' w='8px' bg='#CBD5E0' borderRadius='50%' me='4px' />
            <Text
              fontSize='xs'
              color='secondaryGray.600'
              fontWeight='700'
              mb='5px'>
              알 수 없음
            </Text>
          </Flex>
          <Text fontSize='lg' color={textColor} fontWeight='700'>
            {unknownPercentage}%
          </Text>
        </Flex>
      </Card>
    </Card>
  );
}
