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
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { MdTrendingUp, MdArrowUpward, MdArrowDownward, MdUnfoldMore } from "react-icons/md";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Card from "components/card/Card.js";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getMediaAdSummary } from "services/supabaseService";

export default function MediaAdSummary() {
  const {
    startDate,
    endDate,
    comparisonMode,
    comparisonStartDate,
    comparisonEndDate,
  } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [mediaData, setMediaData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const comparisonTextColor = useColorModeValue('gray.500', 'gray.400');
  const comparisonBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const differenceBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const bgHover = useColorModeValue('gray.50', 'whiteAlpha.50');

  // 비교 기간 데이터 병합 함수
  const mergeAndCalculateDifferences = (currentData, comparisonData) => {
    if (!comparisonMode || !comparisonData || comparisonData.length === 0) {
      return currentData.map(row => ({ ...row, rowType: 'current' }));
    }

    const mergedData = [];
    currentData.forEach(current => {
      const comparison = comparisonData.find(c => c.media === current.media);

      // 1. 현재 기간 행
      mergedData.push({ ...current, rowType: 'current', media: current.media });

      // 2. 비교 기간 행
      if (comparison) {
        mergedData.push({ ...comparison, rowType: 'comparison', media: '' });

        // 3. 증감 행
        mergedData.push({
          media: '',
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
        mergedData.push({ rowType: 'comparison', media: '', noData: true });
        mergedData.push({ rowType: 'difference', media: '', noData: true });
      }
    });

    return mergedData;
  };

  // Supabase에서 매체별 광고 요약 데이터 조회
  useEffect(() => {
    const fetchMediaAdSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);

        // 현재 기간 데이터 조회
        const currentData = await getMediaAdSummary({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });

        // 비교 모드 활성화 시 비교 기간 데이터 조회
        let comparisonData = [];
        if (comparisonMode && comparisonStartDate && comparisonEndDate) {
          comparisonData = await getMediaAdSummary({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate: comparisonStartDate,
            endDate: comparisonEndDate,
          });
        }

        // 데이터 병합 및 증감 계산
        const mergedData = mergeAndCalculateDifferences(currentData, comparisonData);
        setMediaData(mergedData);
      } catch (err) {
        console.error("매체별 광고 요약 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaAdSummary();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate, comparisonMode, comparisonStartDate, comparisonEndDate]);

  const formatNumber = (num) => {
    return Math.round(num).toLocaleString();
  };

  const calculateMetric = (value1, value2, isPercentage = true) => {
    if (value2 === 0) return "0";
    const result = (value1 / value2) * (isPercentage ? 100 : 1);
    return isPercentage ? result.toFixed(2) : result.toFixed(0);
  };

  // 컬럼 정의
  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('media', {
      id: 'media',
      header: () => <Text>매체</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('cost', {
      id: 'cost',
      header: () => <Text>지출액</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('impressions', {
      id: 'impressions',
      header: () => <Text>노출수</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('clicks', {
      id: 'clicks',
      header: () => <Text>클릭수</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.rowType === 'difference') return 0;
      if (row.impressions === 0) return 0;
      return (row.clicks / row.impressions) * 100;
    }, {
      id: 'ctr',
      header: () => <Text>CTR</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.rowType === 'difference') return 0;
      if (row.clicks === 0) return 0;
      return row.cost / row.clicks;
    }, {
      id: 'cpc',
      header: () => <Text>CPC</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('conversions', {
      id: 'conversions',
      header: () => <Text>전환수</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('conversionValue', {
      id: 'conversionValue',
      header: () => <Text>전환가치</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.rowType === 'difference') return 0;
      if (row.cost === 0) return 0;
      return (row.conversionValue / row.cost) * 100;
    }, {
      id: 'roas',
      header: () => <Text>ROAS</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.rowType === 'difference') return 0;
      if (row.clicks === 0) return 0;
      return (row.conversions / row.clicks) * 100;
    }, {
      id: 'cvr',
      header: () => <Text>CVR</Text>,
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
  ], []);

  // 비교 모드 그룹 정렬 처리
  const sortedData = useMemo(() => {
    if (!sorting.length) return mediaData;

    const columnId = sorting[0].id;
    const isDesc = sorting[0].desc;

    // 정렬 값 계산 함수
    const getSortValue = (row) => {
      if (columnId === 'ctr') {
        return row.impressions === 0 ? 0 : (row.clicks / row.impressions) * 100;
      } else if (columnId === 'cpc') {
        return row.clicks === 0 ? 0 : row.cost / row.clicks;
      } else if (columnId === 'roas') {
        return row.cost === 0 ? 0 : (row.conversionValue / row.cost) * 100;
      } else if (columnId === 'cvr') {
        return row.clicks === 0 ? 0 : (row.conversions / row.clicks) * 100;
      } else {
        return row[columnId] || 0;
      }
    };

    // 비교 모드가 아니면 일반 정렬
    if (!comparisonMode) {
      const sorted = [...mediaData].sort((a, b) => {
        const valA = getSortValue(a);
        const valB = getSortValue(b);

        if (typeof valA === 'string' && typeof valB === 'string') {
          return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return isDesc ? valB - valA : valA - valB;
      });
      return sorted;
    }

    // 비교 모드: 3행씩 그룹으로 정렬
    const currentRows = mediaData.filter(row => row.rowType === 'current');

    currentRows.sort((a, b) => {
      const valA = getSortValue(a);
      const valB = getSortValue(b);

      if (typeof valA === 'string' && typeof valB === 'string') {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? valB - valA : valA - valB;
    });

    // 정렬된 순서대로 3행씩 재구성
    const result = [];
    currentRows.forEach(currentRow => {
      const originalIndex = mediaData.findIndex(
        r => r.rowType === 'current' && r.media === currentRow.media
      );
      if (originalIndex !== -1) {
        result.push(mediaData[originalIndex]);     // current
        if (mediaData[originalIndex + 1]) {
          result.push(mediaData[originalIndex + 1]); // comparison
        }
        if (mediaData[originalIndex + 2]) {
          result.push(mediaData[originalIndex + 2]); // difference
        }
      }
    });

    return result;
  }, [mediaData, sorting, comparisonMode]);

  // React Table 인스턴스 생성
  const table = useReactTable({
    data: sortedData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

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
              {table.getHeaderGroups().map((headerGroup) => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Th
                      key={header.id}
                      pe='10px'
                      borderColor={borderColor}
                      cursor='pointer'
                      onClick={header.column.getToggleSortingHandler()}
                      _hover={{ bg: bgHover }}
                    >
                      <Flex
                        justifyContent='space-between'
                        align='center'
                        fontSize={{ sm: '10px', lg: '12px' }}
                        color='gray.400'
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <Box ml='4px'>
                          {header.column.getIsSorted() === 'asc' ? (
                            <Icon as={MdArrowUpward} w='14px' h='14px' color='brand.500' />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <Icon as={MdArrowDownward} w='14px' h='14px' color='brand.500' />
                          ) : (
                            <Icon as={MdUnfoldMore} w='14px' h='14px' color='gray.300' />
                          )}
                        </Box>
                      </Flex>
                    </Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody>
              {sortedData.map((row, index) => {
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

                  // 비용 관련: 증가=빨강, 감소=초록
                  if (metricType === 'cost') {
                    return value > 0 ? 'red.500' : 'green.500';
                  }
                  // 성과 관련: 증가=초록, 감소=빨강
                  if (metricType === 'performance') {
                    return value > 0 ? 'green.500' : 'red.500';
                  }
                  // 중립: 파랑
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
                  : row.cost === 0 ? "0" : Math.round((row.conversionValue / row.cost) * 100);
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

                return (
                  <Tr key={index} bg={rowStyle.bg}>
                    {/* 매체 컬럼 */}
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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

                    {/* 지출액 */}
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
                    <Td fontSize={{ sm: '14px' }} minW={{ sm: '150px', md: '200px', lg: 'auto' }} borderColor='transparent'>
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
      )}
    </Card>
  );
}
