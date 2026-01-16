import React, { useState, useEffect } from "react";
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
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getMediaAdSummary } from "services/supabaseService";

export default function MediaAdSummary() {
  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [mediaData, setMediaData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");

  // Supabase에서 매체별 광고 요약 데이터 조회
  useEffect(() => {
    const fetchMediaAdSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getMediaAdSummary({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });

        setMediaData(data);
      } catch (err) {
        console.error("매체별 광고 요약 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaAdSummary();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

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

      {isLoading ? (
        <Flex justify='center' align='center' minH='200px'>
          <Spinner size='xl' color='brand.500' />
        </Flex>
      ) : error ? (
        <Alert status='error' mx='25px' mb='20px'>
          <AlertIcon />
          {error}
        </Alert>
      ) : mediaData.length === 0 ? (
        <Flex justify='center' align='center' minH='200px'>
          <Text color='gray.500' fontSize='md'>
            선택한 기간에 데이터가 없습니다.
          </Text>
        </Flex>
      ) : (
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
      )}
    </Card>
  );
}
