'use client';
/* eslint-disable */

import {
  Box,
  Flex,
  Progress,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
// Custom components
import Card from 'components/card/Card';
import Menu from 'components/menu/MainMenu';
import { AndroidLogo, AppleLogo, WindowsLogo } from 'components/icons/Icons';
import * as React from 'react';
import { useDateRange } from 'contexts/DateRangeContext';
import { useAuth } from 'contexts/AuthContext';
import { getMediaROASAnalysis } from 'services/supabaseService';
// Assets

const columnHelper = createColumnHelper();

// const columns = columnsDataCheck;
export default function ComplexTable(props) {
  const { tableData } = props;
  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [sorting, setSorting] = React.useState([]);
  const [mediaData, setMediaData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const iconColor = useColorModeValue('secondaryGray.500', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  // Supabase에서 매체별 ROAS 데이터 조회
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // availableAdvertiserIds 계산
        const availableAdvertiserIds = availableAdvertisers?.map(adv => adv.id) || [];

        const data = await getMediaROASAnalysis({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });

        // tech 정보 추가 (UI용)
        const techMapping = {
          'Google': ['apple', 'android'],
          'Naver': ['apple', 'windows'],
          'Meta': ['android', 'windows'],
          'Kakao': ['apple'],
          'Criteo': ['windows'],
        };

        const enhancedData = data.map(item => ({
          ...item,
          tech: techMapping[item.name] || [],
          date: formatDateRange(startDate, endDate),
        }));

        setMediaData(enhancedData);
      } catch (err) {
        console.error("매체별 ROAS 분석 데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  // 날짜 포맷팅 함수
  const formatDateRange = (start, end) => {
    const startD = new Date(start);
    const endD = new Date(end);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const startDay = startD.getDate();
    const startMonth = months[startD.getMonth()];
    const startYear = startD.getFullYear();

    const endDay = endD.getDate();
    const endMonth = months[endD.getMonth()];
    const endYear = endD.getFullYear();

    return `${startDay}.${startMonth}.${startYear} - ${endDay}.${endMonth}.${endYear}`;
  };

  let defaultData = mediaData;
  const columns = [
    columnHelper.accessor('name', {
      id: 'name',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          매체
        </Text>
      ),
      cell: (info) => (
        <Flex align="center">
          <Text color={textColor} fontSize="sm" fontWeight="700">
            {info.getValue()}
          </Text>
        </Flex>
      ),
    }),
    columnHelper.accessor('progress', {
      id: 'status',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          상태
        </Text>
      ),
      cell: (info) => {
        const progressPercent = info.getValue();
        let status = '보통';
        let statusColor = 'blue.500';

        if (progressPercent >= 80) {
          status = '좋음';
          statusColor = 'green.500';
        } else if (progressPercent < 50) {
          status = '나쁨';
          statusColor = 'red.500';
        }

        return (
          <Flex align="center">
            <Text color={statusColor} fontSize="sm" fontWeight="700">
              {status}
            </Text>
          </Flex>
        );
      },
    }),
    columnHelper.accessor('date', {
      id: 'date',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          기간
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('progress', {
      id: 'progress',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          ROAS
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        const progressPercent = info.getValue();

        // Progress Bar 색상 결정
        let colorScheme = 'gray';
        if (progressPercent >= 80) {
          colorScheme = 'brandScheme';
        } else if (progressPercent >= 50) {
          colorScheme = 'blue';
        }

        return (
          <Flex align="center">
            <Text me="10px" color={textColor} fontSize="sm" fontWeight="700">
              {row.roas}%
            </Text>
            <Progress
              variant="table"
              colorScheme={colorScheme}
              h="8px"
              w="63px"
              value={progressPercent}
            />
          </Flex>
        );
      },
    }),
  ];
  const [data, setData] = React.useState(() => [...defaultData]);

  // mediaData 변경 시 data 업데이트
  React.useEffect(() => {
    setData([...mediaData]);
  }, [mediaData]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });

  return (
    <Card
      flexDirection="column"
      w="100%"
      px="0px"
      overflowX={{ sm: 'scroll', lg: 'hidden' }}
    >
      <Flex px="25px" mb="8px" justifyContent="space-between" align="center">
        <Text
          color={textColor}
          fontSize="22px"
          fontWeight="700"
          lineHeight="100%"
        >
          매체별 ROAS 분석
        </Text>
        <Menu />
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
          <Table variant="simple" color="gray.500" mb="24px" mt="12px">
            <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <Th
                      key={header.id}
                      colSpan={header.colSpan}
                      pe="10px"
                      borderColor={borderColor}
                      cursor="pointer"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <Flex
                        justifyContent="space-between"
                        align="center"
                        fontSize={{ sm: '10px', lg: '12px' }}
                        color="gray.400"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: '',
                          desc: '',
                        }[header.column.getIsSorted()] ?? null}
                      </Flex>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table
              .getRowModel()
              .rows.slice(0, 11)
              .map((row) => {
                return (
                  <Tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <Td
                          key={cell.id}
                          fontSize={{ sm: '14px' }}
                          minW={{ sm: '150px', md: '200px', lg: 'auto' }}
                          borderColor="transparent"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </Td>
                      );
                    })}
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
