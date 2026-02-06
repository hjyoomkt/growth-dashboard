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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight, MdKeyboardArrowDown, MdTrendingUp, MdArrowUpward, MdArrowDownward, MdZoomOutMap, MdUnfoldMore } from "react-icons/md";
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
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const itemsPerPage = 30;
  const { isOpen, onOpen, onClose } = useDisclosure();

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
          campaignName: current.campaignName,
          adGroupName: current.adGroupName,
        });

        // 3. 증감 행
        mergedData.push({
          media: '',
          key: '',
          rowType: 'difference',
          campaignName: current.campaignName,
          adGroupName: current.adGroupName,
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
          currentCpa: current.cost / current.conversions,
          comparisonCpa: comparison.cost / comparison.conversions,
          currentRoas: current.conversionValue / current.cost,
          comparisonRoas: comparison.conversionValue / comparison.cost,
          currentCvr: current.conversions / current.clicks,
          comparisonCvr: comparison.conversions / comparison.clicks,
          currentAov: current.conversionValue / current.conversions,
          comparisonAov: comparison.conversionValue / comparison.conversions,
        });
      } else {
        // 비교 데이터 없음
        mergedData.push({
          rowType: 'comparison',
          media: '',
          key: '',
          campaignName: current.campaignName,
          adGroupName: current.adGroupName,
          noData: true
        });
        mergedData.push({
          rowType: 'difference',
          media: '',
          key: '',
          campaignName: current.campaignName,
          adGroupName: current.adGroupName,
          noData: true
        });
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

  // 현재 탭의 컬럼 헤더 가져오기
  const currentTab = tabs.find(t => t.id === activeTab);

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

  // 컬럼 정의 (탭별로 다른 컬럼 구조)
  const columnHelper = createColumnHelper();
  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('media', {
        id: 'media',
        header: () => <Text>매체</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 100,
        minSize: 80,
        maxSize: 200,
      }),
    ];

    // 광고그룹/광고 탭에서 캠페인명 추가
    if (activeTab === "adgroup" || activeTab === "ad") {
      baseColumns.push(
        columnHelper.accessor('campaignName', {
          id: 'campaignName',
          header: () => <Text>캠페인명</Text>,
          cell: (info) => info.getValue(),
          enableSorting: true,
          size: activeTab === "ad" ? 160 : (activeTab === "adgroup" ? 160 : 250),
          minSize: 120,
          maxSize: 500,
        })
      );
    }

    // 광고 탭에서 광고그룹명 추가
    if (activeTab === "ad") {
      baseColumns.push(
        columnHelper.accessor('adGroupName', {
          id: 'adGroupName',
          header: () => <Text>광고그룹명</Text>,
          cell: (info) => info.getValue(),
          enableSorting: true,
          size: 160,
          minSize: 120,
          maxSize: 500,
        })
      );
    }

    // key 컬럼 (탭별로 다른 이름)
    baseColumns.push(
      columnHelper.accessor('key', {
        id: 'key',
        header: () => <Text>{currentTab?.columnHeader || "이름"}</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: activeTab === "ad" ? 160 : (activeTab === "adgroup" ? 200 : 220),
        minSize: 120,
        maxSize: 500,
      })
    );

    // 공통 지표 컬럼
    baseColumns.push(
      columnHelper.accessor('cost', {
        id: 'cost',
        header: () => <Text>지출액</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 150,
        minSize: 100,
        maxSize: 250,
      }),
      columnHelper.accessor('impressions', {
        id: 'impressions',
        header: () => <Text>노출수</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 120,
        minSize: 80,
        maxSize: 200,
      }),
      columnHelper.accessor('clicks', {
        id: 'clicks',
        header: () => <Text>클릭수</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 100,
        minSize: 80,
        maxSize: 200,
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
        size: 100,
        minSize: 70,
        maxSize: 150,
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
        size: 100,
        minSize: 80,
        maxSize: 200,
      }),
      columnHelper.accessor((row) => {
        if (row.rowType === 'difference') return 0;
        if (row.conversions === 0) return 0;
        return row.cost / row.conversions;
      }, {
        id: 'cpa',
        header: () => <Text>CPA</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 100,
        minSize: 80,
        maxSize: 200,
      }),
      columnHelper.accessor('conversions', {
        id: 'conversions',
        header: () => <Text>전환수</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 100,
        minSize: 80,
        maxSize: 200,
      }),
      columnHelper.accessor('conversionValue', {
        id: 'conversionValue',
        header: () => <Text>전환가치</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 150,
        minSize: 100,
        maxSize: 250,
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
        size: 100,
        minSize: 70,
        maxSize: 150,
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
        size: 100,
        minSize: 70,
        maxSize: 150,
      }),
      columnHelper.accessor((row) => {
        if (row.rowType === 'difference') return 0;
        if (row.conversions === 0) return 0;
        return row.conversionValue / row.conversions;
      }, {
        id: 'aov',
        header: () => <Text>AOV</Text>,
        cell: (info) => info.getValue(),
        enableSorting: true,
        size: 100,
        minSize: 80,
        maxSize: 200,
      })
    );

    return baseColumns;
  }, [activeTab]);

  // 비교 모드 그룹 정렬 처리
  const sortedData = useMemo(() => {
    if (!sorting.length) return filteredData;

    const columnId = sorting[0].id;
    const isDesc = sorting[0].desc;

    // 정렬 값 계산 함수
    const getSortValue = (row) => {
      if (columnId === 'ctr') {
        return row.impressions === 0 ? 0 : (row.clicks / row.impressions) * 100;
      } else if (columnId === 'cpc') {
        return row.clicks === 0 ? 0 : row.cost / row.clicks;
      } else if (columnId === 'cpa') {
        return row.conversions === 0 ? 0 : row.cost / row.conversions;
      } else if (columnId === 'roas') {
        return row.cost === 0 ? 0 : (row.conversionValue / row.cost) * 100;
      } else if (columnId === 'cvr') {
        return row.clicks === 0 ? 0 : (row.conversions / row.clicks) * 100;
      } else if (columnId === 'aov') {
        return row.conversions === 0 ? 0 : row.conversionValue / row.conversions;
      } else {
        return row[columnId] || 0;
      }
    };

    // 비교 모드가 아니면 일반 정렬
    if (!comparisonMode) {
      const sorted = [...filteredData].sort((a, b) => {
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
    const currentRows = filteredData.filter(row => row.rowType === 'current');

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
      const originalIndex = filteredData.findIndex(
        r => r.rowType === 'current' && r.key === currentRow.key && r.media === currentRow.media
      );
      if (originalIndex !== -1) {
        result.push(filteredData[originalIndex]);     // current
        if (filteredData[originalIndex + 1]) {
          result.push(filteredData[originalIndex + 1]); // comparison
        }
        if (filteredData[originalIndex + 2]) {
          result.push(filteredData[originalIndex + 2]); // difference
        }
      }
    });

    return result;
  }, [filteredData, sorting, comparisonMode]);

  // React Table 인스턴스 생성
  const table = useReactTable({
    data: sortedData,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    columnResizeMode: 'onEnd',
    enableColumnResizing: true,
  });


  // 페이지네이션 계산 (정렬된 데이터 사용, 비교 모드에서는 3행을 1개 엔티티로 간주)
  const sortedRows = table.getRowModel().rows;
  const effectiveItemsPerPage = comparisonMode ? Math.floor(itemsPerPage / 3) * 3 : itemsPerPage;
  const totalPages = Math.ceil(sortedRows.length / effectiveItemsPerPage);
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * effectiveItemsPerPage,
    currentPage * effectiveItemsPerPage
  );

  // 탭/매체 변경 시 페이지 초기화
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, startDate, endDate, selectedMedia]);

  // 정렬 변경 시 페이지 초기화
  React.useEffect(() => {
    setCurrentPage(1);
  }, [sorting]);

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


  // 테이블 렌더링 함수 (일반 화면과 모달에서 공통 사용)
  const renderTable = () => (
    <Table variant='simple' color='gray.500' mb='24px' mt='12px' style={{ tableLayout: 'fixed' }} sx={{ 'td': { whiteSpace: 'nowrap' } }}>
      <Thead position='sticky' top='0' bg={tableHeaderBg} zIndex='1'>
        {table.getHeaderGroups().map((headerGroup) => (
          <Tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Th
                key={header.id}
                pe='10px'
                borderColor={borderColor}
                _hover={{
                  bg: bgHover,
                  '& .column-resizer': {
                    opacity: 1
                  }
                }}
                whiteSpace='nowrap'
                position='relative'
                style={{ width: `${header.getSize()}px` }}
              >
                <Flex
                  justifyContent='space-between'
                  align='center'
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color='gray.400'
                  cursor='pointer'
                  onClick={(e) => {
                    // 리사이저 영역 클릭 시 정렬 방지
                    if (e.target.closest('.column-resizer')) return;
                    header.column.getToggleSortingHandler()?.(e);
                  }}
                  flex='1'
                  mr='5px'
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
                {/* 컬럼 리사이저 */}
                <Box
                  className='column-resizer'
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    header.getResizeHandler()(e);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    header.getResizeHandler()(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  position='absolute'
                  right='0'
                  top='0'
                  height='100%'
                  width='5px'
                  cursor='col-resize'
                  userSelect='none'
                  touchAction='none'
                  bg={header.column.getIsResizing() ? 'brand.500' : 'brand.400'}
                  _hover={{ bg: 'brand.500' }}
                  opacity={header.column.getIsResizing() ? '1' : '0'}
                  transition='all 0.2s'
                  zIndex='1'
                />
              </Th>
            ))}
          </Tr>
        ))}
      </Thead>
      <Tbody>
        {paginatedRows.map((tableRow, index) => {
          const row = tableRow.original;
          const allColumns = table.getAllColumns();
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
          const cpa = row.rowType === 'difference'
            ? null
            : calculateMetric(row.cost, row.conversions, false);
          const roas = row.rowType === 'difference'
            ? null
            : row.cost === 0 ? "0" : Math.round((row.conversionValue / row.cost) * 100);
          const cvr = row.rowType === 'difference'
            ? null
            : calculateMetric(row.conversions, row.clicks);
          const aov = row.rowType === 'difference'
            ? null
            : calculateMetric(row.conversionValue, row.conversions, false);

          // 증감률 계산 (difference 행용)
          const ctrChange = row.rowType === 'difference' && row.currentCtr !== undefined
            ? calculatePercentageChange(row.currentCtr, row.comparisonCtr)
            : null;
          const cpcChange = row.rowType === 'difference' && row.currentCpc !== undefined
            ? calculatePercentageChange(row.currentCpc, row.comparisonCpc)
            : null;
          const cpaChange = row.rowType === 'difference' && row.currentCpa !== undefined
            ? calculatePercentageChange(row.currentCpa, row.comparisonCpa)
            : null;
          const roasChange = row.rowType === 'difference' && row.currentRoas !== undefined
            ? calculatePercentageChange(row.currentRoas, row.comparisonRoas)
            : null;
          const cvrChange = row.rowType === 'difference' && row.currentCvr !== undefined
            ? calculatePercentageChange(row.currentCvr, row.comparisonCvr)
            : null;
          const aovChange = row.rowType === 'difference' && row.currentAov !== undefined
            ? calculatePercentageChange(row.currentAov, row.comparisonAov)
            : null;

          const rowHeight = filteredData.length > 30 ? 'compact' : 'normal';

          return (
            <Tr key={index} h={rowHeight === 'compact' ? '36px' : 'auto'} bg={rowStyle.bg}>
              {/* 매체 컬럼 */}
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'media')?.getSize()}px` }}>
                {row.media ? (
                  <Flex align='center' gap='8px'>
                    <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color} whiteSpace='nowrap'>
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

              {/* 캠페인명 컬럼 (광고그룹, 광고 탭에서 표시) */}
              {(activeTab === "adgroup" || activeTab === "ad") && (
                <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'campaignName')?.getSize()}px` }}>
                  {row.campaignName ? (
                    <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color} noOfLines={1} overflow='hidden' textOverflow='ellipsis'>
                      {row.campaignName}
                    </Text>
                  ) : null}
                </Td>
              )}

              {/* 광고그룹명 컬럼 (광고 탭에서만 표시) */}
              {activeTab === "ad" && (
                <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'adGroupName')?.getSize()}px` }}>
                  {row.adGroupName ? (
                    <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color} noOfLines={1} overflow='hidden' textOverflow='ellipsis'>
                      {row.adGroupName}
                    </Text>
                  ) : null}
                </Td>
              )}

              {/* 캠페인명/광고그룹명/광고명 컬럼 */}
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'key')?.getSize()}px` }}>
                {row.key ? (
                  <Flex align="center" gap="8px">
                    <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color} noOfLines={1} overflow='hidden' textOverflow='ellipsis' flex='1'>
                      {row.key}
                    </Text>
                    {activeTab === "ad" && !row.hasAdData && row.rowType === 'current' && (
                      <Badge colorScheme="gray" fontSize="10px" flexShrink='0'>
                        광고명 없음
                      </Badge>
                    )}
                  </Flex>
                ) : null}
              </Td>

              {/* 지출액 */}
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'cost')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'impressions')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'clicks')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'ctr')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'cpc')?.getSize()}px` }}>
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

              {/* CPA */}
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'cpa')?.getSize()}px` }}>
                {row.noData ? (
                  <Text fontSize='sm' color='gray.400'>-</Text>
                ) : row.rowType === 'difference' && cpaChange !== null ? (
                  <Flex align='center' gap='4px'>
                    <Text fontSize='sm' fontWeight='700' color={getMetricColor(cpaChange, 'cost')}>
                      {cpaChange >= 0 ? '+' : ''}{cpaChange.toFixed(2)}%p
                    </Text>
                    {cpaChange !== 0 && (
                      <Icon
                        as={cpaChange >= 0 ? MdArrowUpward : MdArrowDownward}
                        w='14px'
                        h='14px'
                        color={getMetricColor(cpaChange, 'cost')}
                      />
                    )}
                  </Flex>
                ) : (
                  <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                    ₩{formatNumber(cpa)}
                  </Text>
                )}
              </Td>

              {/* 전환수 */}
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'conversions')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'conversionValue')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'roas')?.getSize()}px` }}>
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
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'cvr')?.getSize()}px` }}>
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

              {/* AOV */}
              <Td fontSize={{ sm: '14px' }} borderColor={borderColor} py={rowHeight === 'compact' ? '8px' : '12px'} style={{ width: `${allColumns.find(col => col.id === 'aov')?.getSize()}px` }}>
                {row.noData ? (
                  <Text fontSize='sm' color='gray.400'>-</Text>
                ) : row.rowType === 'difference' && aovChange !== null ? (
                  <Flex align='center' gap='4px'>
                    <Text fontSize='sm' fontWeight='700' color={getMetricColor(aovChange, 'performance')}>
                      {aovChange >= 0 ? '+' : ''}{aovChange.toFixed(2)}%p
                    </Text>
                    {aovChange !== 0 && (
                      <Icon
                        as={aovChange >= 0 ? MdArrowUpward : MdArrowDownward}
                        w='14px'
                        h='14px'
                        color={getMetricColor(aovChange, 'performance')}
                      />
                    )}
                  </Flex>
                ) : (
                  <Text fontSize='sm' fontWeight={rowStyle.fontWeight} color={rowStyle.color}>
                    ₩{formatNumber(aov)}
                  </Text>
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );

  return (
    <Card flexDirection='column' w='100%' px='0px' overflowX='auto' mb='20px' h='auto' maxH='650px'>
      <Flex px='25px' mb='8px' justifyContent='space-between' align='center'>
        <Text color={textColor} fontSize='22px' fontWeight='700' lineHeight='100%'>
          계층별 광고 요약
        </Text>
        <Flex gap='12px' align='center'>
          {/* 확대 버튼 */}
          <IconButton
            icon={<MdZoomOutMap />}
            aria-label="확대"
            bg={inputBg}
            border='1px solid'
            borderColor={borderColor}
            color={textColor}
            _hover={{ bg: bgHover }}
            _active={{ bg: bgHover }}
            h='36px'
            borderRadius='12px'
            onClick={onOpen}
          />

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
        <Text fontSize="xs" color="gray.500" mx="25px" mb="8px">
          * Google Ads와 Naver는 광고명을 제공하지 않아 "N/A"로 표시됩니다.
        </Text>
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
            {renderTable()}
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

      {/* 확대 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent bg={useColorModeValue('white', 'navy.800')} m='20px'>
          <ModalHeader>
            <Flex justifyContent='space-between' align='center'>
              <Text color={textColor} fontSize='24px' fontWeight='700'>
                계층별 광고 요약 - {currentTab?.label}
              </Text>
              <Flex gap='12px' align='center' mr='40px'>
                {/* 매체 필터 (모달용) */}
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

                {/* 탭 버튼들 (모달용) */}
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
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {activeTab === "ad" && (
              <Text fontSize="xs" color="gray.500" mb="8px">
                * Google Ads와 Naver는 광고명을 제공하지 않아 "N/A"로 표시됩니다.
              </Text>
            )}

            {isLoading ? (
              <Flex justify='center' align='center' minH='400px'>
                <Spinner size='xl' color='brand.500' />
              </Flex>
            ) : error ? (
              <Alert status='error' mb='20px'>
                <AlertIcon />
                {error}
              </Alert>
            ) : filteredData.length === 0 ? (
              <Flex justify='center' align='center' minH='400px'>
                <Text color='gray.500' fontSize='md'>
                  {selectedMedia === "all"
                    ? "선택한 기간에 데이터가 없습니다."
                    : `${selectedMedia} 매체의 데이터가 없습니다.`}
                </Text>
              </Flex>
            ) : (
              <>
                <Box overflowY='auto' maxH='calc(100vh - 200px)'>
                  {renderTable()}
                </Box>

                {totalPages > 1 && (
                  <Flex justify='center' align='center' mt='20px' gap='8px'>
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
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}
