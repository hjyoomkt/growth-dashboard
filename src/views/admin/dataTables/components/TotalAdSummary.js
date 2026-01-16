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
  Button,
  useColorModeValue,
  HStack,
  IconButton,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import {
  getCampaignAdSummary,
  getDailyAdSummary,
  getWeeklyAdSummary,
  getMonthlyAdSummary,
} from "services/supabaseService";

export default function TotalAdSummary() {
  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [activeTab, setActiveTab] = useState("campaign");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 30;

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const tabBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const tabActiveBg = useColorModeValue("brand.500", "brand.400");
  const tabActiveColor = useColorModeValue("white", "white");
  const tabInactiveColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const pageBtnBg = useColorModeValue("white", "navy.800");
  const pageBtnActiveBg = useColorModeValue("brand.500", "brand.400");
  const pageBtnBorderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const bgHover = useColorModeValue('gray.100', 'whiteAlpha.100');
  const tableHeaderBg = useColorModeValue('white', 'navy.800');

  // Supabase에서 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        let data = [];

        if (activeTab === "campaign") {
          data = await getCampaignAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        } else if (activeTab === "daily") {
          data = await getDailyAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        } else if (activeTab === "weekly") {
          data = await getWeeklyAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        } else if (activeTab === "monthly") {
          data = await getMonthlyAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        }

        setTableData(data);
      } catch (err) {
        console.error("전체 광고 요약 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate, activeTab]);

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const calculateMetric = (value1, value2, isPercentage = true) => {
    if (value2 === 0) return "0";
    const result = (value1 / value2) * (isPercentage ? 100 : 1);
    return isPercentage ? result.toFixed(2) : result.toFixed(0);
  };

  const tabs = [
    { id: "campaign", label: "캠페인" },
    { id: "daily", label: "일별" },
    { id: "weekly", label: "주별" },
    { id: "monthly", label: "월별" },
  ];

  // 페이지네이션 계산
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const paginatedData = tableData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 탭 변경 시 페이지 초기화
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, startDate, endDate]);

  // 페이지네이션 버튼 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <Card flexDirection='column' w='100%' px='0px' overflowX={{ sm: 'scroll', lg: 'hidden' }} mb='20px' h='auto' maxH='650px'>
      <Flex px='25px' mb='8px' justifyContent='space-between' align='center'>
        <Text color={textColor} fontSize='22px' fontWeight='700' lineHeight='100%'>
          전체 광고 요약
        </Text>
        <Flex gap='8px'>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size='sm'
              bg={activeTab === tab.id ? tabActiveBg : tabBg}
              color={activeTab === tab.id ? tabActiveColor : tabInactiveColor}
              fontWeight={activeTab === tab.id ? '600' : '500'}
              _hover={{
                bg: activeTab === tab.id ? tabActiveBg : tabBg,
              }}
              borderRadius='6px'
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </Button>
          ))}
        </Flex>
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
      ) : tableData.length === 0 ? (
        <Flex justify='center' align='center' minH='200px'>
          <Text color='gray.500' fontSize='md'>
            선택한 기간에 데이터가 없습니다.
          </Text>
        </Flex>
      ) : (
        <>
          <Box flex='1' overflowY='auto' maxH='500px'>
        <Table variant='simple' color='gray.500' mb='24px' mt='12px'>
          <Thead position='sticky' top='0' bg={tableHeaderBg} zIndex='1'>
            <Tr>
              {activeTab === "campaign" && (
                <Th pe='10px' borderColor={borderColor}>
                  <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                    매체
                  </Flex>
                </Th>
              )}
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  {activeTab === "campaign" ? "캠페인" : "날짜"}
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
            {paginatedData.map((row, index) => {
              const ctr = calculateMetric(row.clicks, row.impressions);
              const cpc = calculateMetric(row.cost, row.clicks, false);
              const roas = calculateMetric(row.conversionValue, row.cost);
              const cvr = calculateMetric(row.conversions, row.clicks);
              const rowHeight = tableData.length > 30 ? 'compact' : 'normal';

              return (
                <Tr key={index} h={rowHeight === 'compact' ? '36px' : 'auto'}>
                  {activeTab === "campaign" && (
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '100px', md: '120px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                      <Text fontSize='sm' fontWeight='700' color={textColor}>
                        {row.media}
                      </Text>
                    </Td>
                  )}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {row.key}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      ₩{formatNumber(row.cost)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {formatNumber(row.impressions)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {formatNumber(row.clicks)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {ctr}%
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      ₩{formatNumber(cpc)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {row.conversions}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      ₩{formatNumber(row.conversionValue)}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {roas}%
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
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

      {totalPages > 1 && (
        <Flex justify='center' align='center' px='25px' pb='20px' gap='8px'>
          <IconButton
            icon={<MdChevronLeft />}
            size='sm'
            bg={pageBtnBg}
            color={textColor}
            border='1px solid'
            borderColor={pageBtnBorderColor}
            borderRadius='6px'
            isDisabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            _hover={{ bg: bgHover }}
            _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
          />

          <HStack spacing='4px'>
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <Text key={`ellipsis-${index}`} color={textColor} px='8px'>...</Text>
              ) : (
                <Button
                  key={page}
                  size='sm'
                  minW='32px'
                  h='32px'
                  bg={currentPage === page ? pageBtnActiveBg : pageBtnBg}
                  color={currentPage === page ? 'white' : textColor}
                  border='1px solid'
                  borderColor={currentPage === page ? pageBtnActiveBg : pageBtnBorderColor}
                  borderRadius='6px'
                  onClick={() => setCurrentPage(page)}
                  _hover={{
                    bg: currentPage === page ? pageBtnActiveBg : bgHover,
                  }}
                  fontWeight={currentPage === page ? '600' : '500'}
                  fontSize='sm'
                >
                  {page}
                </Button>
              )
            ))}
          </HStack>

          <IconButton
            icon={<MdChevronRight />}
            size='sm'
            bg={pageBtnBg}
            color={textColor}
            border='1px solid'
            borderColor={pageBtnBorderColor}
            borderRadius='6px'
            isDisabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            _hover={{ bg: bgHover }}
            _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
          />
        </Flex>
      )}
        </>
      )}
    </Card>
  );
}
