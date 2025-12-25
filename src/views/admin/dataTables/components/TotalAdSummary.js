import React, { useState, useMemo } from "react";
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
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";

export default function TotalAdSummary() {
  const { startDate, endDate } = useDateRange();
  const [activeTab, setActiveTab] = useState("campaign");
  const [currentPage, setCurrentPage] = useState(1);
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

  // 매체 리스트
  const mediaList = ["Google", "Naver", "Meta", "Kakao", "Criteo"];

  // 동적 데이터 생성
  const tableData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const dailyAvg = diffDays > 0 ? diffDays : 1;

    const campaigns = ["봄 시즌 캠페인", "여름 프로모션", "신상품 런칭", "가을 세일", "겨울 특가"];

    if (activeTab === "campaign") {
      const data = [];
      campaigns.forEach((campaign) => {
        mediaList.forEach((media) => {
          data.push({
            media: media,
            key: campaign,
            cost: Math.floor((Math.random() * 100000 + 400000) * dailyAvg / 7),
            impressions: Math.floor((Math.random() * 200000 + 800000) * dailyAvg / 7),
            clicks: Math.floor((Math.random() * 8000 + 30000) * dailyAvg / 7),
            conversions: Math.floor((Math.random() * 80 + 250) * dailyAvg / 7),
            conversionValue: Math.floor((Math.random() * 800000 + 3000000) * dailyAvg / 7),
          });
        });
      });
      return data;
    } else if (activeTab === "daily") {
      const data = [];
      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        data.push({
          key: dateStr,
          cost: Math.floor(Math.random() * 50000 + 50000),
          impressions: Math.floor(Math.random() * 100000 + 100000),
          clicks: Math.floor(Math.random() * 3000 + 3000),
          conversions: Math.floor(Math.random() * 30 + 30),
          conversionValue: Math.floor(Math.random() * 300000 + 300000),
        });
      }
      return data;
    } else if (activeTab === "weekly") {
      const data = [];

      // 시작일의 요일 구하기 (0: 일요일, 1: 월요일, ..., 6: 토요일)
      const startDay = start.getDay();
      // 해당 주의 월요일로 이동 (월요일=1, 일요일=0이므로 일요일은 -6일 이동)
      const daysToMonday = startDay === 0 ? -6 : 1 - startDay;

      const firstMonday = new Date(start);
      firstMonday.setDate(start.getDate() + daysToMonday);

      // 전체 기간에 포함되는 주 수 계산
      const lastDay = new Date(end);
      const totalDays = Math.ceil((lastDay - firstMonday) / (1000 * 60 * 60 * 24));
      const weeks = Math.ceil(totalDays / 7);

      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const startStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
        const endStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

        data.push({
          key: `${startStr} ~ ${endStr}`,
          cost: Math.floor(Math.random() * 200000 + 300000),
          impressions: Math.floor(Math.random() * 400000 + 600000),
          clicks: Math.floor(Math.random() * 15000 + 20000),
          conversions: Math.floor(Math.random() * 150 + 180),
          conversionValue: Math.floor(Math.random() * 1500000 + 1800000),
        });
      }
      return data;
    } else if (activeTab === "monthly") {
      const data = [];
      const monthsInRange = Math.ceil(diffDays / 30);

      for (let i = 0; i < monthsInRange; i++) {
        const currentDate = new Date(start);
        currentDate.setMonth(currentDate.getMonth() + i);
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        data.push({
          key: `${year}년 ${String(month).padStart(2, '0')}월`,
          cost: Math.floor(Math.random() * 500000 + 1000000),
          impressions: Math.floor(Math.random() * 1000000 + 2000000),
          clicks: Math.floor(Math.random() * 40000 + 70000),
          conversions: Math.floor(Math.random() * 400 + 600),
          conversionValue: Math.floor(Math.random() * 4000000 + 6000000),
        });
      }
      return data;
    }

    return [];
  }, [startDate, endDate, activeTab, mediaList]);

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
    </Card>
  );
}
