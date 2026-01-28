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
  Icon,
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight, MdKeyboardArrowDown, MdTrendingUp, MdArrowUpward, MdArrowDownward } from "react-icons/md";
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import {
  getCampaignAdSummary,
  getAdGroupAdSummary,
  getAdAdSummary,
} from "services/supabaseService";

export default function HierarchicalAdSummary() {
  const {
    startDate,
    endDate,
    comparisonMode,
    comparisonStartDate,
    comparisonEndDate,
  } = useDateRange();
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
  const comparisonTextColor = useColorModeValue('gray.500', 'gray.400');
  const comparisonBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const differenceBg = useColorModeValue('blue.50', 'whiteAlpha.100');

  // 비교 기간 데이터 병합 함수
  const mergeAndCalculateDifferences = (currentData, comparisonData) => {
    if (!comparisonMode || !comparisonData || comparisonData.length === 0) {
      return currentData.map(row => ({ ...row, rowType: 'current' }));
    }

    const mergedData = [];
    currentData.forEach(current => {
      // key (campaign_name, ad_group_name, ad_name) 기준으로 매칭
      const comparison = comparisonData.find(c => c.key === current.key && c.media === current.media);

      // 1. 현재 기간 행
      mergedData.push({ ...current, rowType: 'current' });

      // 2. 비교 기간 행
      if (comparison) {
        mergedData.push({
          ...comparison,
          rowType: 'comparison',
          media: '',
          key: '',
        });

        // 3. 증감 행
        mergedData.push({
          media: '',
          key: '',
          rowType: 'difference',
          cost: current.cost - comparison.cost,
          impressions: current.impressions - comparison.impressions,
          clicks: current.clicks - comparison.clicks,
          conversions: current.conversions - comparison.conversions,
          conversionValue: current.conversionValue - comparison.conversionValue,
          // 백분율 변화율 계산용 원본 값 저장
          currentCost: current.cost,
          comparisonCost: comparison.cost,
          currentImpressions: current.impressions,
          comparisonImpressions: comparison.impressions,
          currentClicks: current.clicks,
          comparisonClicks: comparison.clicks,
          currentConversions: current.conversions,
          comparisonConversions: comparison.conversions,
          currentConversionValue: current.conversionValue,
          comparisonConversionValue: comparison.conversionValue,
          currentCtr: current.clicks / current.impressions,
          comparisonCtr: comparison.clicks / comparison.impressions,
          currentCpc: current.cost / current.clicks,
          comparisonCpc: comparison.cost / comparison.clicks,
          currentRoas: current.conversionValue / current.cost,
          comparisonRoas: comparison.conversionValue / comparison.cost,
          currentCvr: current.conversions / current.clicks,
          comparisonCvr: comparison.conversions / comparison.clicks,
        });
      } else {
        // 비교 데이터 없음
        mergedData.push({ rowType: 'comparison', media: '', key: '', noData: true });
        mergedData.push({ rowType: 'difference', media: '', key: '', noData: true });
      }
    });

    return mergedData;
  };

  // Supabase에서 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        let currentData = [];
        let comparisonData = [];

        // 현재 기간 데이터 조회
        if (activeTab === "campaign") {
          currentData = await getCampaignAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });

          // 비교 모드 활성화 시 비교 기간 데이터 조회
          if (comparisonMode && comparisonStartDate && comparisonEndDate) {
            comparisonData = await getCampaignAdSummary({
              advertiserId: currentAdvertiserId,
              availableAdvertiserIds,
              startDate: comparisonStartDate,
              endDate: comparisonEndDate,
            });
          }
        } else if (activeTab === "adgroup") {
          currentData = await getAdGroupAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });

          if (comparisonMode && comparisonStartDate && comparisonEndDate) {
            comparisonData = await getAdGroupAdSummary({
              advertiserId: currentAdvertiserId,
              availableAdvertiserIds,
              startDate: comparisonStartDate,
              endDate: comparisonEndDate,
            });
          }
        } else if (activeTab === "ad") {
          currentData = await getAdAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });

          if (comparisonMode && comparisonStartDate && comparisonEndDate) {
            comparisonData = await getAdAdSummary({
              advertiserId: currentAdvertiserId,
              availableAdvertiserIds,
              startDate: comparisonStartDate,
              endDate: comparisonEndDate,
            });
          }
        }

        // 데이터 병합 및 증감 계산
        const mergedData = mergeAndCalculateDifferences(currentData, comparisonData);
        setTableData(mergedData);
      } catch (err) {
        console.error("계층별 광고 요약 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate, activeTab, comparisonMode, comparisonStartDate, comparisonEndDate]);

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
    // 비교 모드에서는 3행씩 그룹으로 필터링
    if (comparisonMode) {
      const filtered = [];
      for (let i = 0; i < tableData.length; i += 3) {
        const currentRow = tableData[i];
        if (currentRow.media === selectedMedia || currentRow.rowType !== 'current') {
          filtered.push(tableData[i]); // current
          if (i + 1 < tableData.length) filtered.push(tableData[i + 1]); // comparison
          if (i + 2 < tableData.length) filtered.push(tableData[i + 2]); // difference
        }
      }
      return filtered;
    }
    return tableData.filter(row => row.media === selectedMedia);
  }, [tableData, selectedMedia, comparisonMode]);

  // 페이지네이션 계산 (비교 모드에서는 3행을 1개 엔티티로 간주)
  const effectiveItemsPerPage = comparisonMode ? Math.floor(itemsPerPage / 3) * 3 : itemsPerPage;
  const totalPages = Math.ceil(filteredData.length / effectiveItemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * effectiveItemsPerPage,
    currentPage * effectiveItemsPerPage
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
              // rowType에 따른 스타일링
              const getRowStyle = () => {
                if (row.rowType === 'current') {
                  return {
                    fontWeight: '700',
                    color: textColor,
                    bg: 'transparent',
                  };
                } else if (row.rowType === 'comparison') {
                  return {
                    fontWeight: '500',
                    color: comparisonTextColor,
                    bg: comparisonBg,
                  };
                } else if (row.rowType === 'difference') {
                  return {
                    fontWeight: '700',
                    color: textColor,
                    bg: differenceBg,
                  };
                }
                return { fontWeight: '700', color: textColor, bg: 'transparent' };
              };

              const rowStyle = getRowStyle();

              // 지표별 색상 결정 함수
              const getMetricColor = (value, metricType) => {
                if (row.noData) return 'gray.400';
                if (value === 0) return textColor;

                if (metricType === 'cost') {
                  return value > 0 ? 'red.500' : 'green.500';
                }
                if (metricType === 'performance') {
                  return value > 0 ? 'green.500' : 'red.500';
                }
                return value > 0 ? 'blue.500' : 'blue.500';
              };

              // 백분율 변화 계산
              const calculatePercentageChange = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return ((current - previous) / previous) * 100;
              };

              // 지표 계산
              const ctr = row.rowType === 'difference'
                ? null
                : calculateMetric(row.clicks, row.impressions);
              const cpc = row.rowType === 'difference'
                ? null
                : calculateMetric(row.cost, row.clicks, false);
              const roas = row.rowType === 'difference'
                ? null
                : calculateMetric(row.conversionValue, row.cost);
              const cvr = row.rowType === 'difference'
                ? null
                : calculateMetric(row.conversions, row.clicks);

              // 증감률 계산 (difference 행용)
              const ctrChange = row.rowType === 'difference' && row.currentCtr !== undefined
                ? calculatePercentageChange(row.currentCtr, row.comparisonCtr)
                : null;
              const cpcChange = row.rowType === 'difference' && row.currentCpc !== undefined
                ? calculatePercentageChange(row.currentCpc, row.comparisonCpc)
                : null;
              const roasChange = row.rowType === 'difference' && row.currentRoas !== undefined
                ? calculatePercentageChange(row.currentRoas, row.comparisonRoas)
                : null;
              const cvrChange = row.rowType === 'difference' && row.currentCvr !== undefined
                ? calculatePercentageChange(row.currentCvr, row.comparisonCvr)
                : null;

              const rowHeight = filteredData.length > 30 ? 'compact' : 'normal';

              return (
                <Tr key={index} h={rowHeight === 'compact' ? '36px' : 'auto'} bg={rowStyle.bg}>
                  {/* 매체 컬럼 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '100px', md: '120px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.media ? (
                      <Flex align='center' gap='8px'>
                        <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                          {row.media}
                        </Text>
                        {row.rowType === 'current' && comparisonMode && (
                          <Badge colorScheme='blue' fontSize='10px'>현재</Badge>
                        )}
                      </Flex>
                    ) : row.rowType === 'comparison' ? (
                      <Text fontSize='xs' color='gray.400' pl='20px'>비교 기간</Text>
                    ) : row.rowType === 'difference' ? (
                      <Flex align='center' gap='4px' pl='20px'>
                        <Icon as={MdTrendingUp} w='14px' h='14px' color='blue.500' />
                        <Text fontSize='xs' fontWeight='600' color='blue.500'>증감</Text>
                      </Flex>
                    ) : null}
                  </Td>

                  {/* 캠페인명/광고그룹명/광고명 컬럼 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.key ? (
                      <Flex align="center" gap="8px">
                        <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                          {row.key}
                        </Text>
                        {activeTab === "ad" && !row.hasAdData && row.rowType === 'current' && (
                          <Badge colorScheme="gray" fontSize="10px">
                            광고명 없음
                          </Badge>
                        )}
                      </Flex>
                    ) : null}
                  </Td>

                  {/* 지출액 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(row.cost, 'cost')}>
                          {(() => {
                            const change = calculatePercentageChange(row.currentCost || 0, row.comparisonCost || 1);
                            return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                          })()}
                        </Text>
                        {row.cost !== 0 && (
                          <Icon
                            as={row.cost >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(row.cost, 'cost')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        ₩{formatNumber(row.cost)}
                      </Text>
                    )}
                  </Td>

                  {/* 노출수 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(row.impressions, 'neutral')}>
                          {(() => {
                            const change = calculatePercentageChange(row.currentImpressions || 0, row.comparisonImpressions || 1);
                            return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                          })()}
                        </Text>
                        {row.impressions !== 0 && (
                          <Icon
                            as={row.impressions >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(row.impressions, 'neutral')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        {formatNumber(row.impressions)}
                      </Text>
                    )}
                  </Td>

                  {/* 클릭수 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(row.clicks, 'neutral')}>
                          {(() => {
                            const change = calculatePercentageChange(row.currentClicks || 0, row.comparisonClicks || 1);
                            return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                          })()}
                        </Text>
                        {row.clicks !== 0 && (
                          <Icon
                            as={row.clicks >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(row.clicks, 'neutral')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        {formatNumber(row.clicks)}
                      </Text>
                    )}
                  </Td>

                  {/* CTR */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' && ctrChange !== null ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(ctrChange, 'neutral')}>
                          {ctrChange >= 0 ? '+' : ''}{ctrChange.toFixed(2)}%p
                        </Text>
                        {ctrChange !== 0 && (
                          <Icon
                            as={ctrChange >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(ctrChange, 'neutral')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        {ctr}%
                      </Text>
                    )}
                  </Td>

                  {/* CPC */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' && cpcChange !== null ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(cpcChange, 'cost')}>
                          {cpcChange >= 0 ? '+' : ''}{cpcChange.toFixed(2)}%p
                        </Text>
                        {cpcChange !== 0 && (
                          <Icon
                            as={cpcChange >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(cpcChange, 'cost')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        ₩{formatNumber(cpc)}
                      </Text>
                    )}
                  </Td>

                  {/* 전환수 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(row.conversions, 'performance')}>
                          {(() => {
                            const change = calculatePercentageChange(row.currentConversions || 0, row.comparisonConversions || 1);
                            return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                          })()}
                        </Text>
                        {row.conversions !== 0 && (
                          <Icon
                            as={row.conversions >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(row.conversions, 'performance')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        {Math.round(row.conversions)}
                      </Text>
                    )}
                  </Td>

                  {/* 전환가치 */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(row.conversionValue, 'performance')}>
                          {(() => {
                            const change = calculatePercentageChange(row.currentConversionValue || 0, row.comparisonConversionValue || 1);
                            return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                          })()}
                        </Text>
                        {row.conversionValue !== 0 && (
                          <Icon
                            as={row.conversionValue >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(row.conversionValue, 'performance')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        ₩{formatNumber(row.conversionValue)}
                      </Text>
                    )}
                  </Td>

                  {/* ROAS */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' && roasChange !== null ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(roasChange, 'performance')}>
                          {roasChange >= 0 ? '+' : ''}{roasChange.toFixed(2)}%p
                        </Text>
                        {roasChange !== 0 && (
                          <Icon
                            as={roasChange >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(roasChange, 'performance')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        {roas}%
                      </Text>
                    )}
                  </Td>

                  {/* CVR */}
                  <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'}>
                    {row.noData ? (
                      <Text fontSize='sm' color='gray.400'>-</Text>
                    ) : row.rowType === 'difference' && cvrChange !== null ? (
                      <Flex align='center' gap='4px'>
                        <Text fontSize='sm' fontWeight='700' color={getMetricColor(cvrChange, 'neutral')}>
                          {cvrChange >= 0 ? '+' : ''}{cvrChange.toFixed(2)}%p
                        </Text>
                        {cvrChange !== 0 && (
                          <Icon
                            as={cvrChange >= 0 ? MdArrowUpward : MdArrowDownward}
                            w='14px'
                            h='14px'
                            color={getMetricColor(cvrChange, 'neutral')}
                          />
                        )}
                      </Flex>
                    ) : (
                      <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                        {cvr}%
                      </Text>
                    )}
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
