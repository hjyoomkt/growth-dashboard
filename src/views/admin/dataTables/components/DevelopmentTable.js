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
// Assets

const columnHelper = createColumnHelper();

// const columns = columnsDataCheck;
export default function ComplexTable(props) {
  const { tableData } = props;
  const { startDate, endDate } = useDateRange();
  const [sorting, setSorting] = React.useState([]);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const iconColor = useColorModeValue('secondaryGray.500', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

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

  // 매체별 ROAS 데이터 생성
  const generateMediaData = React.useMemo(() => {
    const mediaList = [
      { name: 'Google', tech: ['apple', 'android'] },
      { name: 'Naver', tech: ['apple', 'windows'] },
      { name: 'Meta', tech: ['android', 'windows'] },
      { name: 'Kakao', tech: ['apple'] },
      { name: 'Criteo', tech: ['windows'] },
    ];

    const roasValues = mediaList.map(() => Math.floor(Math.random() * 400) + 100);
    const maxRoas = Math.max(...roasValues);

    return mediaList.map((media, index) => {
      const roas = roasValues[index];
      const progressPercent = Math.round((roas / maxRoas) * 100);

      return {
        name: media.name,
        tech: media.tech,
        date: formatDateRange(startDate, endDate),
        roas: roas,
        progress: progressPercent,
      };
    });
  }, [startDate, endDate]);

  let defaultData = tableData || generateMediaData;
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
          NAME
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
    columnHelper.accessor('tech', {
      id: 'tech',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          STATUS
        </Text>
      ),
      cell: (info) => (
        <Flex align="center">
          {info.getValue().map((item, key) => {
            if (item === 'apple') {
              return (
                <AppleLogo
                  key={key}
                  color={iconColor}
                  me="16px"
                  h="18px"
                  w="15px"
                />
              );
            } else if (item === 'android') {
              return (
                <AndroidLogo
                  key={key}
                  color={iconColor}
                  me="16px"
                  h="18px"
                  w="16px"
                />
              );
            } else if (item === 'windows') {
              return (
                <WindowsLogo key={key} color={iconColor} h="18px" w="19px" />
              );
            }
          })}
        </Flex>
      ),
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
          DATE
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

  // startDate, endDate 변경 시 데이터 업데이트
  React.useEffect(() => {
    setData([...generateMediaData]);
  }, [generateMediaData]);

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
    </Card>
  );
}
