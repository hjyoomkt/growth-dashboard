import React, { useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";

export default function MediaAdSummary() {
  const { startDate, endDate } = useDateRange();

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");

  // 동적 데이터 생성
  const mediaData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const dailyAvg = diffDays > 0 ? diffDays : 1;

    return [
      {
        media: "네이버",
        cost: Math.floor((Math.random() * 50000 + 200000) * dailyAvg / 7),
        impressions: Math.floor((Math.random() * 100000 + 500000) * dailyAvg / 7),
        clicks: Math.floor((Math.random() * 5000 + 20000) * dailyAvg / 7),
        conversions: Math.floor((Math.random() * 50 + 150) * dailyAvg / 7),
        conversionValue: Math.floor((Math.random() * 500000 + 2000000) * dailyAvg / 7),
      },
      {
        media: "구글",
        cost: Math.floor((Math.random() * 40000 + 150000) * dailyAvg / 7),
        impressions: Math.floor((Math.random() * 80000 + 400000) * dailyAvg / 7),
        clicks: Math.floor((Math.random() * 4000 + 15000) * dailyAvg / 7),
        conversions: Math.floor((Math.random() * 40 + 120) * dailyAvg / 7),
        conversionValue: Math.floor((Math.random() * 400000 + 1500000) * dailyAvg / 7),
      },
      {
        media: "카카오",
        cost: Math.floor((Math.random() * 30000 + 120000) * dailyAvg / 7),
        impressions: Math.floor((Math.random() * 60000 + 300000) * dailyAvg / 7),
        clicks: Math.floor((Math.random() * 3000 + 12000) * dailyAvg / 7),
        conversions: Math.floor((Math.random() * 30 + 100) * dailyAvg / 7),
        conversionValue: Math.floor((Math.random() * 300000 + 1200000) * dailyAvg / 7),
      },
      {
        media: "기타",
        cost: Math.floor((Math.random() * 20000 + 60000) * dailyAvg / 7),
        impressions: Math.floor((Math.random() * 40000 + 150000) * dailyAvg / 7),
        clicks: Math.floor((Math.random() * 2000 + 8000) * dailyAvg / 7),
        conversions: Math.floor((Math.random() * 20 + 60) * dailyAvg / 7),
        conversionValue: Math.floor((Math.random() * 200000 + 600000) * dailyAvg / 7),
      },
    ];
  }, [startDate, endDate]);

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const calculateMetric = (value1, value2, isPercentage = true) => {
    if (value2 === 0) return "0";
    const result = (value1 / value2) * (isPercentage ? 100 : 1);
    return isPercentage ? result.toFixed(2) : result.toFixed(0);
  };

  return (
    <Card flexDirection='column' w='100%' px='0px' overflowX={{ sm: 'scroll', lg: 'hidden' }} mb='20px'>
      <Flex px='25px' mb='8px' justifyContent='space-between' align='center'>
        <Text color={textColor} fontSize='22px' fontWeight='700' lineHeight='100%'>
          매체 광고 요약
        </Text>
      </Flex>

      <Box>
        <Table variant='simple' color='gray.500' mb='24px' mt='12px'>
          <Thead>
            <Tr>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  매체
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  지출액
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  노출수
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  클릭수
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  CTR
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  CPC
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  전환수
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  전환가치
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  ROAS
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  CVR
                </Flex>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {mediaData.map((row, index) => {
              const ctr = calculateMetric(row.clicks, row.impressions);
              const cpc = calculateMetric(row.cost, row.clicks, false);
              const roas = calculateMetric(row.conversionValue, row.cost);
              const cvr = calculateMetric(row.conversions, row.clicks);

              return (
                <Tr key={index}>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {row.media}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      ₩{formatNumber(row.cost)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {formatNumber(row.impressions)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {formatNumber(row.clicks)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {ctr}%
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      ₩{formatNumber(cpc)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {row.conversions}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      ₩{formatNumber(row.conversionValue)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {roas}%
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {cvr}%
                    </Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
