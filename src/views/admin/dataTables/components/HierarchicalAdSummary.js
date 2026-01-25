import React, { useState, useEffect, useMemo } from "react";
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
  Badge,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight, MdKeyboardArrowDown } from "react-icons/md";
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import {
  getCampaignAdSummary,
  getAdGroupAdSummary,
  getAdAdSummary,
} from "services/supabaseService";

export default function HierarchicalAdSummary() {
  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [activeTab, setActiveTab] = useState("campaign");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState("all");
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
  const inputBg = useColorModeValue('white', 'navy.700');
  const brandColor = useColorModeValue('brand.500', 'white');

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
        } else if (activeTab === "adgroup") {
          data = await getAdGroupAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        } else if (activeTab === "ad") {
          data = await getAdAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        }

        setTableData(data);
      } catch (err) {
        console.error("계층별 광고 요약 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate, activeTab]);

  const formatNumber = (num) => {
    return Math.round(num).toLocaleString();
  };

  const calculateMetric = (value1, value2, isPercentage = true) => {
    if (value2 === 0) return "0";
    const result = (value1 / value2) * (isPercentage ? 100 : 1);
    return isPercentage ? result.toFixed(2) : result.toFixed(0);
  };

  const tabs = [
    { id: "campaign", label: "캠페인", columnHeader: "캠페인명" },
    { id: "adgroup", label: "광고그룹", columnHeader: "광고그룹명" },
    { id: "ad", label: "광고", columnHeader: "광고명" },
  ];

  // 고유 매체 목록 추출
  const availableMedias = useMemo(() => {
    const mediaSet = new Set();
    tableData.forEach(row => {
      if (row.media) {
        mediaSet.add(row.media);
      }
    });
    return Array.from(mediaSet).sort();
  }, [tableData]);

  // 매체 필터링된 데이터
  const filteredData = useMemo(() => {
    if (selectedMedia === "all") {
      return tableData;
    }
    return tableData.filter(row => row.media === selectedMedia);
  }, [tableData, selectedMedia]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 탭/매체 변경 시 페이지 초기화
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, startDate, endDate, selectedMedia]);

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

  // 현재 탭의 컬럼 헤더 가져오기
  const currentTab = tabs.find(t => t.id === activeTab);
  const columnHeader = currentTab?.columnHeader || "이름";

  return (
    <Card flexDirection='column' w='100%' px='0px' overflowX='auto' mb='20px' h='auto' maxH='650px'>
      <Flex px='25px' mb='8px' justifyContent='space-between' align='center'>
        <Text color={textColor} fontSize='22px' fontWeight='700' lineHeight='100%'>
          계층별 광고 요약
        </Text>
        <Flex gap='12px' align='center'>
          {/* 매체 필터 */}
          <Menu closeOnSelect={true}>
            <MenuButton
              as={Button}
              rightIcon={<MdKeyboardArrowDown />}
              bg={inputBg}
              border='1px solid'
              borderColor={borderColor}
              color={textColor}
              fontWeight='500'
              fontSize='sm'
              _hover={{ bg: bgHover }}
              _active={{ bg: bgHover }}
              px='16px'
              h='36px'
              borderRadius='12px'>
              {selectedMedia === "all" ? "전체" : selectedMedia}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px' zIndex='10'>
              <MenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedMedia("all");
                }}
                bg={selectedMedia === "all" ? brandColor : 'transparent'}
                color={selectedMedia === "all" ? 'white' : textColor}
                _hover={{
                  bg: selectedMedia === "all" ? brandColor : bgHover,
                }}
                fontWeight={selectedMedia === "all" ? '600' : '500'}
                fontSize='sm'
                borderRadius='8px'
                mb='4px'>
                전체
              </MenuItem>
              {availableMedias.map((media) => (
                <MenuItem
                  key={media}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedMedia(media);
                  }}
                  bg={selectedMedia === media ? brandColor : 'transparent'}
                  color={selectedMedia === media ? 'white' : textColor}
                  _hover={{
                    bg: selectedMedia === media ? brandColor : bgHover,
                  }}
                  fontWeight={selectedMedia === media ? '600' : '500'}
                  fontSize='sm'
                  borderRadius='8px'
                  mb='4px'>
                  {media}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* 탭 버튼들 */}
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
      </Flex>

      {/* 광고 탭에서 안내 메시지 표시 */}
      {activeTab === "ad" && (
        <Alert status="info" mx="25px" mb="12px" borderRadius="8px">
          <AlertIcon />
          <Text fontSize="sm">
            Google Ads와 Naver는 광고 단위 데이터를 제공하지 않습니다.
            광고그룹 단위로 집계된 데이터가 "N/A"로 표시됩니다.
          </Text>
        </Alert>
      )}

      {isLoading ? (
        <Flex justify='center' align='center' minH='200px'>
          <Spinner size='xl' color='brand.500' />
        </Flex>
      ) : error ? (
        <Alert status='error' mx='25px' mb='20px'>
          <AlertIcon />
          {error}
        </Alert>
      ) : filteredData.length === 0 ? (
        <Flex justify='center' align='center' minH='200px'>
          <Text color='gray.500' fontSize='md'>
            {selectedMedia === "all"
              ? "선택한 기간에 데이터가 없습니다."
              : `${selectedMedia} 매체의 데이터가 없습니다.`}
          </Text>
        </Flex>
      ) : (
        <>
          <Box flex='1' overflowY='auto' maxH='500px'>
        <Table variant='simple' color='gray.500' mb='24px' mt='12px'>
          <Thead position='sticky' top='0' bg={tableHeaderBg} zIndex='1'>
            <Tr>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  매체
                </Flex>
              </Th>
              <Th pe='10px' borderColor={borderColor}>
                <Flex justifyContent='space-between' align='center' fontSize={{ sm: '10px', lg: '12px' }} color='gray.400'>
                  {columnHeader}
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
              const rowHeight = filteredData.length > 30 ? 'compact' : 'normal';

              return (
                <Tr key={index} h={rowHeight === 'compact' ? '36px' : 'auto'}>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '100px', md: '120px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Text fontSize='sm' fontWeight='700' color={textColor}>
                      {row.media}
                    </Text>
                  </Td>
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    <Flex align="center" gap="8px">
                      <Text fontSize='sm' fontWeight='700' color={textColor}>
                        {row.key}
                      </Text>
                      {activeTab === "ad" && !row.hasAdData && (
                        <Badge colorScheme="gray" fontSize="10px">
                          광고명 없음
                        </Badge>
                      )}
                    </Flex>
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
