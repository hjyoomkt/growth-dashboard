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
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  CheckboxGroup,
  Checkbox,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight, MdArrowUpward, MdArrowDownward, MdUnfoldMore, MdZoomOutMap, MdKeyboardArrowDown } from "react-icons/md";
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
  getDailyAdSummary,
  getWeeklyAdSummary,
  getMonthlyAdSummary,
  getDailyAdSummaryWithDetails,
  getWeeklyAdSummaryWithDetails,
  getMonthlyAdSummaryWithDetails,
} from "services/supabaseService";

export default function TotalAdSummary() {
  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [activeTab, setActiveTab] = useState("daily");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);
  const itemsPerPage = 30;

  // 필터 상태
  const [selectedMedias, setSelectedMedias] = useState([]); // 다중 선택 (배열)
  const [selectedCampaigns, setSelectedCampaigns] = useState([]); // 다중 선택
  const [rawData, setRawData] = useState([]); // 필터링 전 원본 데이터

  // 모달 상태
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
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const evenRowBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  // Supabase에서 데이터 조회 (매체/캠페인 포함)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        let data = [];

        if (activeTab === "daily") {
          data = await getDailyAdSummaryWithDetails({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        } else if (activeTab === "weekly") {
          data = await getWeeklyAdSummaryWithDetails({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        } else if (activeTab === "monthly") {
          data = await getMonthlyAdSummaryWithDetails({
            advertiserId: currentAdvertiserId,
            availableAdvertiserIds,
            startDate,
            endDate,
          });
        }

        setRawData(data); // 원본 데이터 저장 (매체/캠페인 포함)
      } catch (err) {
        console.error("전체 광고 요약 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate, activeTab]);

  // 매체 목록 추출
  const availableMedias = useMemo(() => {
    const mediaSet = new Set(rawData.map(row => row.source).filter(Boolean));
    return Array.from(mediaSet).sort();
  }, [rawData]);

  // 캠페인 목록 추출 (선택된 매체에 따라 동적 변경)
  const availableCampaigns = useMemo(() => {
    const campaignSet = new Set();
    rawData.forEach(row => {
      // 매체가 선택되지 않았거나, 선택된 매체에 포함되는 경우
      if (selectedMedias.length === 0 || selectedMedias.includes(row.source)) {
        if (row.campaign_name) campaignSet.add(row.campaign_name);
      }
    });
    return Array.from(campaignSet).sort();
  }, [rawData, selectedMedias]);

  // 필터링 및 집계
  const filteredData = useMemo(() => {
    let filtered = rawData;

    // 매체 필터 (다중 선택)
    if (selectedMedias.length > 0) {
      filtered = filtered.filter(row => selectedMedias.includes(row.source));
    }

    // 캠페인 필터 (다중 선택)
    if (selectedCampaigns.length > 0) {
      filtered = filtered.filter(row => selectedCampaigns.includes(row.campaign_name));
    }

    // 날짜/주/월별로 집계
    const aggregated = {};
    filtered.forEach(row => {
      const key = row.key; // date/week_label/month_label

      if (!aggregated[key]) {
        aggregated[key] = {
          key,
          cost: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          conversionValue: 0,
        };
      }

      aggregated[key].cost += row.cost || 0;
      aggregated[key].impressions += row.impressions || 0;
      aggregated[key].clicks += row.clicks || 0;
      aggregated[key].conversions += row.conversions || 0;
      aggregated[key].conversionValue += row.conversion_value || 0;
    });

    return Object.values(aggregated);
  }, [rawData, selectedMedias, selectedCampaigns]);

  // 테이블 데이터에 반영
  useEffect(() => {
    setTableData(filteredData);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로
  }, [filteredData]);

  // 매체 변경 시 캠페인 선택 초기화 (선택된 캠페인이 더 이상 유효하지 않은 경우)
  useEffect(() => {
    if (selectedMedias.length > 0) {
      // 선택된 매체의 캠페인만 남기기
      const validCampaigns = selectedCampaigns.filter(campaign => {
        return rawData.some(row =>
          selectedMedias.includes(row.source) && row.campaign_name === campaign
        );
      });
      if (validCampaigns.length !== selectedCampaigns.length) {
        setSelectedCampaigns(validCampaigns);
      }
    }
  }, [selectedMedias, rawData]);

  const formatNumber = (num) => {
    return Math.round(num).toLocaleString();
  };

  const calculateMetric = (value1, value2, isPercentage = true) => {
    if (value2 === 0) return "0";
    const result = (value1 / value2) * (isPercentage ? 100 : 1);
    return isPercentage ? result.toFixed(2) : result.toFixed(0);
  };

  const tabs = [
    { id: "daily", label: "일별" },
    { id: "weekly", label: "주별" },
    { id: "monthly", label: "월별" },
  ];

  // 컬럼 정의
  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('key', {
      id: 'key',
      header: () => <Text>날짜</Text>,
      cell: (info) => (
        <Text fontSize='sm' fontWeight='700' color={textColor}>
          {info.getValue()}
        </Text>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('cost', {
      id: 'cost',
      header: () => <Text>지출액</Text>,
      cell: (info) => (
        <Text fontSize='sm' fontWeight='700' color={textColor}>
          ₩{formatNumber(info.getValue())}
        </Text>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('impressions', {
      id: 'impressions',
      header: () => <Text>노출수</Text>,
      cell: (info) => (
        <Text fontSize='sm' fontWeight='700' color={textColor}>
          {formatNumber(info.getValue())}
        </Text>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('clicks', {
      id: 'clicks',
      header: () => <Text>클릭수</Text>,
      cell: (info) => (
        <Text fontSize='sm' fontWeight='700' color={textColor}>
          {formatNumber(info.getValue())}
        </Text>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.impressions === 0) return 0;
      return (row.clicks / row.impressions) * 100;
    }, {
      id: 'ctr',
      header: () => <Text>CTR</Text>,
      cell: (info) => {
        const ctr = calculateMetric(info.row.original.clicks, info.row.original.impressions);
        return (
          <Text fontSize='sm' fontWeight='700' color={textColor}>
            {ctr}%
          </Text>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.clicks === 0) return 0;
      return row.cost / row.clicks;
    }, {
      id: 'cpc',
      header: () => <Text>CPC</Text>,
      cell: (info) => {
        const cpc = calculateMetric(info.row.original.cost, info.row.original.clicks, false);
        return (
          <Text fontSize='sm' fontWeight='700' color={textColor}>
            ₩{formatNumber(cpc)}
          </Text>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.conversions === 0) return 0;
      return row.cost / row.conversions;
    }, {
      id: 'cpa',
      header: () => <Text>CPA</Text>,
      cell: (info) => {
        const cpa = calculateMetric(info.row.original.cost, info.row.original.conversions, false);
        return (
          <Text fontSize='sm' fontWeight='700' color={textColor}>
            ₩{formatNumber(cpa)}
          </Text>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor('conversions', {
      id: 'conversions',
      header: () => <Text>전환수</Text>,
      cell: (info) => (
        <Text fontSize='sm' fontWeight='700' color={textColor}>
          {Math.round(info.getValue())}
        </Text>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('conversionValue', {
      id: 'conversionValue',
      header: () => <Text>전환가치</Text>,
      cell: (info) => (
        <Text fontSize='sm' fontWeight='700' color={textColor}>
          ₩{formatNumber(info.getValue())}
        </Text>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.cost === 0) return 0;
      return (row.conversionValue / row.cost) * 100;
    }, {
      id: 'roas',
      header: () => <Text>ROAS</Text>,
      cell: (info) => {
        const cost = info.row.original.cost;
        const conversionValue = info.row.original.conversionValue;
        const roas = cost === 0 ? "0" : Math.round((conversionValue / cost) * 100);
        return (
          <Text fontSize='sm' fontWeight='700' color={textColor}>
            {roas}%
          </Text>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.clicks === 0) return 0;
      return (row.conversions / row.clicks) * 100;
    }, {
      id: 'cvr',
      header: () => <Text>CVR</Text>,
      cell: (info) => {
        const cvr = calculateMetric(info.row.original.conversions, info.row.original.clicks);
        return (
          <Text fontSize='sm' fontWeight='700' color={textColor}>
            {cvr}%
          </Text>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      if (row.conversions === 0) return 0;
      return row.conversionValue / row.conversions;
    }, {
      id: 'aov',
      header: () => <Text>AOV</Text>,
      cell: (info) => {
        const aov = calculateMetric(info.row.original.conversionValue, info.row.original.conversions, false);
        return (
          <Text fontSize='sm' fontWeight='700' color={textColor}>
            ₩{formatNumber(aov)}
          </Text>
        );
      },
      enableSorting: true,
    }),
  ], [textColor]);

  // React Table 인스턴스 생성
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // 페이지네이션 계산 (정렬된 데이터 사용)
  const sortedRows = table.getRowModel().rows;
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 탭 변경 시 페이지 초기화
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, startDate, endDate]);

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

  return (
    <Card flexDirection='column' w='100%' px='0px' overflowX={{ sm: 'scroll', lg: 'hidden' }} overflowY='hidden' mb='20px' h='auto' maxH='650px'>
      <Flex px='25px' mb='8px' justifyContent='space-between' align='center'>
        <Text color={textColor} fontSize='22px' fontWeight='700' lineHeight='100%'>
          전체 광고 요약
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
          <Popover placement='bottom-end'>
            <PopoverTrigger>
              <Button
                rightIcon={<MdKeyboardArrowDown />}
                bg={inputBg}
                border='1px solid'
                borderColor={borderColor}
                fontWeight='500'
                fontSize='sm'
                h='36px'
                borderRadius='12px'>
                {selectedMedias.length === 0
                  ? "전체 매체"
                  : selectedMedias.length === 1
                  ? selectedMedias[0]
                  : `${selectedMedias.length}개 매체`}
              </Button>
            </PopoverTrigger>
            <PopoverContent w='250px'>
              <PopoverArrow />
              <PopoverBody p='16px' maxH='300px' overflowY='auto'>
                <VStack align="stretch" spacing="8px">
                  {/* 전체 선택 옵션 */}
                  <HStack
                    p="12px"
                    borderRadius="8px"
                    border="1px solid"
                    borderColor={selectedMedias.length === 0 ? brandColor : borderColor}
                    bg={selectedMedias.length === 0 ? selectedBg : inputBg}
                    cursor="pointer"
                    onClick={() => setSelectedMedias([])}
                    _hover={{ borderColor: brandColor, bg: bgHover }}
                  >
                    <Box
                      w="16px"
                      h="16px"
                      borderRadius="4px"
                      border="2px solid"
                      borderColor={selectedMedias.length === 0 ? brandColor : borderColor}
                      bg={selectedMedias.length === 0 ? brandColor : 'transparent'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {selectedMedias.length === 0 && (
                        <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                      )}
                    </Box>
                    <Text fontSize="sm" color={textColor} fontWeight="600">
                      전체 매체
                    </Text>
                  </HStack>

                  {availableMedias.map((media) => (
                    <HStack
                      key={media}
                      p="12px"
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={selectedMedias.includes(media) ? brandColor : borderColor}
                      bg={selectedMedias.includes(media) ? selectedBg : inputBg}
                      cursor="pointer"
                      onClick={() => {
                        const newMedias = selectedMedias.includes(media)
                          ? selectedMedias.filter(m => m !== media)
                          : [...selectedMedias, media];
                        setSelectedMedias(newMedias);
                      }}
                      _hover={{ borderColor: brandColor, bg: bgHover }}
                    >
                      <Box
                        w="16px"
                        h="16px"
                        borderRadius="4px"
                        border="2px solid"
                        borderColor={selectedMedias.includes(media) ? brandColor : borderColor}
                        bg={selectedMedias.includes(media) ? brandColor : 'transparent'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {selectedMedias.includes(media) && (
                          <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                        )}
                      </Box>
                      <Text fontSize="sm" color={textColor} fontWeight="500">
                        {media}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          {/* 캠페인 필터 */}
          <Popover placement='bottom-end'>
            <PopoverTrigger>
              <Button
                rightIcon={<MdKeyboardArrowDown />}
                bg={inputBg}
                border='1px solid'
                borderColor={borderColor}
                fontWeight='500'
                fontSize='sm'
                h='36px'
                borderRadius='12px'>
                {selectedCampaigns.length === 0
                  ? "전체 캠페인"
                  : selectedCampaigns.length === 1
                  ? selectedCampaigns[0]
                  : `${selectedCampaigns.length}개 선택`}
              </Button>
            </PopoverTrigger>
            <PopoverContent w='300px'>
              <PopoverArrow />
              <PopoverBody p='16px' maxH='400px' overflowY='auto'>
                <VStack align="stretch" spacing="8px">
                  {/* 전체 선택 옵션 */}
                  <HStack
                    p="12px"
                    borderRadius="8px"
                    border="1px solid"
                    borderColor={selectedCampaigns.length === 0 ? brandColor : borderColor}
                    bg={selectedCampaigns.length === 0 ? selectedBg : inputBg}
                    cursor="pointer"
                    onClick={() => setSelectedCampaigns([])}
                    _hover={{ borderColor: brandColor, bg: bgHover }}
                  >
                    <Box
                      w="16px"
                      h="16px"
                      borderRadius="4px"
                      border="2px solid"
                      borderColor={selectedCampaigns.length === 0 ? brandColor : borderColor}
                      bg={selectedCampaigns.length === 0 ? brandColor : 'transparent'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {selectedCampaigns.length === 0 && (
                        <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                      )}
                    </Box>
                    <Text fontSize="sm" color={textColor} fontWeight="600">
                      전체 캠페인
                    </Text>
                  </HStack>

                  {availableCampaigns.map((campaign) => (
                    <HStack
                      key={campaign}
                      p="12px"
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={selectedCampaigns.includes(campaign) ? brandColor : borderColor}
                      bg={selectedCampaigns.includes(campaign) ? selectedBg : inputBg}
                      cursor="pointer"
                      onClick={() => {
                        const newCampaigns = selectedCampaigns.includes(campaign)
                          ? selectedCampaigns.filter(c => c !== campaign)
                          : [...selectedCampaigns, campaign];
                        setSelectedCampaigns(newCampaigns);
                      }}
                      _hover={{ borderColor: brandColor, bg: bgHover }}
                    >
                      <Box
                        w="16px"
                        h="16px"
                        borderRadius="4px"
                        border="2px solid"
                        borderColor={selectedCampaigns.includes(campaign) ? brandColor : borderColor}
                        bg={selectedCampaigns.includes(campaign) ? brandColor : 'transparent'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {selectedCampaigns.includes(campaign) && (
                          <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                        )}
                      </Box>
                      <Text fontSize="sm" color={textColor} fontWeight="500">
                        {campaign}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>

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
            {paginatedRows.map((row, index) => {
              const rowHeight = sortedRows.length > 30 ? 'compact' : 'normal';
              const isEvenRow = index % 2 === 1;

              return (
                <Tr key={row.id} h={rowHeight === 'compact' ? '36px' : 'auto'} bg={isEvenRow ? evenRowBg : 'transparent'}>
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      key={cell.id}
                      fontSize={{ sm: '14px' }}
                      minW='120px'
                      maxW='300px'
                      borderColor={borderColor}
                      py={rowHeight === 'compact' ? '8px' : '12px'}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
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

      {/* 확대 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent bg={useColorModeValue('white', 'navy.800')} m='20px'>
          <ModalHeader>
            <Flex justifyContent='space-between' align='center'>
              <Text color={textColor} fontSize='24px' fontWeight='700'>
                전체 광고 요약 - {tabs.find(t => t.id === activeTab)?.label}
              </Text>
              <Flex gap='12px' align='center' mr='40px'>
                {/* 매체 필터 (모달) */}
                <Popover placement='bottom-end'>
                  <PopoverTrigger>
                    <Button
                      rightIcon={<MdKeyboardArrowDown />}
                      bg={inputBg}
                      border='1px solid'
                      borderColor={borderColor}
                      fontWeight='500'
                      fontSize='sm'
                      h='36px'
                      borderRadius='12px'>
                      {selectedMedias.length === 0
                        ? "전체 매체"
                        : selectedMedias.length === 1
                        ? selectedMedias[0]
                        : `${selectedMedias.length}개 매체`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent w='250px'>
                    <PopoverArrow />
                    <PopoverBody p='16px' maxH='300px' overflowY='auto'>
                      <VStack align="stretch" spacing="8px">
                        {/* 전체 선택 옵션 */}
                        <HStack
                          p="12px"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor={selectedMedias.length === 0 ? brandColor : borderColor}
                          bg={selectedMedias.length === 0 ? selectedBg : inputBg}
                          cursor="pointer"
                          onClick={() => setSelectedMedias([])}
                          _hover={{ borderColor: brandColor, bg: bgHover }}
                        >
                          <Box
                            w="16px"
                            h="16px"
                            borderRadius="4px"
                            border="2px solid"
                            borderColor={selectedMedias.length === 0 ? brandColor : borderColor}
                            bg={selectedMedias.length === 0 ? brandColor : 'transparent'}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            {selectedMedias.length === 0 && (
                              <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                            )}
                          </Box>
                          <Text fontSize="sm" color={textColor} fontWeight="600">
                            전체 매체
                          </Text>
                        </HStack>

                        {availableMedias.map((media) => (
                          <HStack
                            key={media}
                            p="12px"
                            borderRadius="8px"
                            border="1px solid"
                            borderColor={selectedMedias.includes(media) ? brandColor : borderColor}
                            bg={selectedMedias.includes(media) ? selectedBg : inputBg}
                            cursor="pointer"
                            onClick={() => {
                              const newMedias = selectedMedias.includes(media)
                                ? selectedMedias.filter(m => m !== media)
                                : [...selectedMedias, media];
                              setSelectedMedias(newMedias);
                            }}
                            _hover={{ borderColor: brandColor, bg: bgHover }}
                          >
                            <Box
                              w="16px"
                              h="16px"
                              borderRadius="4px"
                              border="2px solid"
                              borderColor={selectedMedias.includes(media) ? brandColor : borderColor}
                              bg={selectedMedias.includes(media) ? brandColor : 'transparent'}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              {selectedMedias.includes(media) && (
                                <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                              )}
                            </Box>
                            <Text fontSize="sm" color={textColor} fontWeight="500">
                              {media}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>

                {/* 캠페인 필터 (모달) */}
                <Popover placement='bottom-end'>
                  <PopoverTrigger>
                    <Button
                      rightIcon={<MdKeyboardArrowDown />}
                      bg={inputBg}
                      border='1px solid'
                      borderColor={borderColor}
                      fontWeight='500'
                      fontSize='sm'
                      h='36px'
                      borderRadius='12px'>
                      {selectedCampaigns.length === 0
                        ? "전체 캠페인"
                        : selectedCampaigns.length === 1
                        ? selectedCampaigns[0]
                        : `${selectedCampaigns.length}개 선택`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent w='300px'>
                    <PopoverArrow />
                    <PopoverBody p='16px' maxH='400px' overflowY='auto'>
                      <VStack align="stretch" spacing="8px">
                        {/* 전체 선택 옵션 */}
                        <HStack
                          p="12px"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor={selectedCampaigns.length === 0 ? brandColor : borderColor}
                          bg={selectedCampaigns.length === 0 ? selectedBg : inputBg}
                          cursor="pointer"
                          onClick={() => setSelectedCampaigns([])}
                          _hover={{ borderColor: brandColor, bg: bgHover }}
                        >
                          <Box
                            w="16px"
                            h="16px"
                            borderRadius="4px"
                            border="2px solid"
                            borderColor={selectedCampaigns.length === 0 ? brandColor : borderColor}
                            bg={selectedCampaigns.length === 0 ? brandColor : 'transparent'}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            {selectedCampaigns.length === 0 && (
                              <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                            )}
                          </Box>
                          <Text fontSize="sm" color={textColor} fontWeight="600">
                            전체 캠페인
                          </Text>
                        </HStack>

                        {availableCampaigns.map((campaign) => (
                          <HStack
                            key={campaign}
                            p="12px"
                            borderRadius="8px"
                            border="1px solid"
                            borderColor={selectedCampaigns.includes(campaign) ? brandColor : borderColor}
                            bg={selectedCampaigns.includes(campaign) ? selectedBg : inputBg}
                            cursor="pointer"
                            onClick={() => {
                              const newCampaigns = selectedCampaigns.includes(campaign)
                                ? selectedCampaigns.filter(c => c !== campaign)
                                : [...selectedCampaigns, campaign];
                              setSelectedCampaigns(newCampaigns);
                            }}
                            _hover={{ borderColor: brandColor, bg: bgHover }}
                          >
                            <Box
                              w="16px"
                              h="16px"
                              borderRadius="4px"
                              border="2px solid"
                              borderColor={selectedCampaigns.includes(campaign) ? brandColor : borderColor}
                              bg={selectedCampaigns.includes(campaign) ? brandColor : 'transparent'}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              {selectedCampaigns.includes(campaign) && (
                                <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                              )}
                            </Box>
                            <Text fontSize="sm" color={textColor} fontWeight="500">
                              {campaign}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>

                {/* 탭 버튼들 (모달) */}
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
            {isLoading ? (
              <Flex justify='center' align='center' minH='400px'>
                <Spinner size='xl' color='brand.500' />
              </Flex>
            ) : error ? (
              <Alert status='error' mb='20px'>
                <AlertIcon />
                {error}
              </Alert>
            ) : tableData.length === 0 ? (
              <Flex justify='center' align='center' minH='400px'>
                <Text color='gray.500' fontSize='md'>
                  선택한 기간에 데이터가 없습니다.
                </Text>
              </Flex>
            ) : (
              <>
                <Box overflowY='auto' maxH='calc(100vh - 200px)'>
                  <Table variant='simple' color='gray.500' mb='24px'>
                    <Thead position='sticky' top='0' bg={tableHeaderBg} zIndex='1'>
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
                      {paginatedRows.map((row, index) => {
                        const isEvenRow = index % 2 === 1;
                        return (
                          <Tr key={row.id} bg={isEvenRow ? evenRowBg : 'transparent'}>
                            {row.getVisibleCells().map((cell) => (
                              <Td
                                key={cell.id}
                                fontSize={{ sm: '14px' }}
                                minW='120px'
                                maxW='300px'
                                borderColor={borderColor}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </Td>
                            ))}
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>

                {/* 페이지네이션 (모달) */}
                {totalPages > 1 && (
                  <Flex justify='center' align='center' pb='20px' gap='8px'>
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
