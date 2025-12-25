/* eslint-disable */

import {
  Box,
  Flex,
  Icon,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Badge,
  Switch,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Card from 'components/card/Card';
import * as React from 'react';
import { MdCheckCircle, MdCancel } from 'react-icons/md';

const columnHelper = createColumnHelper();

export default function UserTable(props) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState([]);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  // Mock 데이터 (향후 Supabase로 교체 예정)
  const mockUsers = React.useMemo(() => [
    {
      email: 'admin@example.com',
      joinDate: '2024.01.15',
      status: 'active',
      role: 'admin',
    },
    {
      email: 'user1@example.com',
      joinDate: '2024.02.20',
      status: 'active',
      role: 'user',
    },
    {
      email: 'user2@example.com',
      joinDate: '2024.03.10',
      status: 'inactive',
      role: 'user',
    },
    {
      email: 'manager@example.com',
      joinDate: '2024.01.25',
      status: 'active',
      role: 'admin',
    },
    {
      email: 'user3@example.com',
      joinDate: '2024.04.05',
      status: 'active',
      role: 'user',
    },
  ], []);

  const defaultData = tableData || mockUsers;

  const columns = [
    columnHelper.accessor('email', {
      id: 'email',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          이메일
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('joinDate', {
      id: 'joinDate',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          가입일
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('status', {
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
      cell: (info) => (
        <Flex align="center">
          <Icon
            w="24px"
            h="24px"
            me="5px"
            color={
              info.getValue() === 'active'
                ? 'green.500'
                : 'red.500'
            }
            as={
              info.getValue() === 'active'
                ? MdCheckCircle
                : MdCancel
            }
          />
          <Text color={textColor} fontSize="sm" fontWeight="700">
            {info.getValue() === 'active' ? '활성' : '비활성'}
          </Text>
        </Flex>
      ),
    }),
    columnHelper.accessor('role', {
      id: 'role',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          역할
        </Text>
      ),
      cell: (info) => (
        <Badge
          colorScheme={info.getValue() === 'admin' ? 'brand' : 'gray'}
          fontSize="sm"
          fontWeight="700"
          px="12px"
          py="4px"
          borderRadius="8px"
        >
          {info.getValue() === 'admin' ? '관리자' : '일반 사용자'}
        </Badge>
      ),
    }),
    columnHelper.accessor('access', {
      id: 'access',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          액세스
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Switch
            colorScheme="brand"
            isChecked={row.status === 'active'}
            onChange={() => handleAccessToggle(row.email, row.status)}
          />
        );
      },
    }),
  ];

  const [data, setData] = React.useState(() => [...defaultData]);

  // 액세스 토글 핸들러 (향후 Supabase로 교체)
  const handleAccessToggle = (email, currentStatus) => {
    setData(prevData =>
      prevData.map(user =>
        user.email === email
          ? { ...user, status: currentStatus === 'active' ? 'inactive' : 'active' }
          : user
      )
    );
  };

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
          회원 관리
        </Text>
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
