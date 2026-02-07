import {
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Badge,
  Flex,
  Spinner,
  Center,
  Box,
  Button,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Card from 'components/card/Card';
import * as React from 'react';
import { useAuth } from 'contexts/AuthContext';

const columnHelper = createColumnHelper();

export default function AccessLogsTable({
  accessLogs = [],
  isLoading = false,
  totalCount = 0,
  currentPage = 1,
  pageSize = 100,
  onPageChange,
  showOrganizationColumn = true,
}) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const { role } = useAuth();

  // 액션 타입 뱃지 색상
  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'login': return 'green';
      case 'logout': return 'red';
      default: return 'gray';
    }
  };

  // 날짜 포맷팅 (한국시간 KST)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // 액션 한글 변환
  const getActionLabel = (action) => {
    switch (action) {
      case 'login': return '로그인';
      case 'logout': return '로그아웃';
      default: return action;
    }
  };

  // User Agent 간소화 (브라우저명만 표시)
  const simplifyUserAgent = (userAgent) => {
    if (!userAgent) return '-';

    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';

    return 'Other';
  };

  // 컬럼 정의
  const allColumns = [
    // 조직/브랜드 컬럼
    columnHelper.accessor('organization_name', {
      id: 'organization',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          조직/브랜드
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        const displayName = row.organization_name || row.advertiser_name || '-';
        return (
          <Text color={textColor} fontSize="sm" fontWeight="500">
            {displayName}
          </Text>
        );
      },
    }),

    // 이름 컬럼
    columnHelper.accessor('user_name', {
      id: 'name',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          이름
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="500">
          {info.getValue() || '-'}
        </Text>
      ),
    }),

    // 이메일 컬럼
    columnHelper.accessor('user_email', {
      id: 'email',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          이메일
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">
          {info.getValue()}
        </Text>
      ),
    }),

    // 권한 컬럼
    columnHelper.accessor('user_role', {
      id: 'role',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          권한
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">
          {info.getValue()}
        </Text>
      ),
    }),

    // 동작 컬럼
    columnHelper.accessor('action', {
      id: 'action',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          동작
        </Text>
      ),
      cell: (info) => (
        <Badge colorScheme={getActionBadgeColor(info.getValue())} fontSize="xs">
          {getActionLabel(info.getValue())}
        </Badge>
      ),
    }),

    // 일시 컬럼 (KST)
    columnHelper.accessor('created_at', {
      id: 'date',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          일시 (KST)
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">
          {formatDate(info.getValue())}
        </Text>
      ),
    }),

    // IP 주소 컬럼
    columnHelper.accessor('ip_address', {
      id: 'ip',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          IP 주소
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontFamily="monospace">
          {info.getValue() || '-'}
        </Text>
      ),
    }),

    // User Agent 컬럼
    columnHelper.accessor('user_agent', {
      id: 'userAgent',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          브라우저
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">
          {simplifyUserAgent(info.getValue())}
        </Text>
      ),
    }),
  ];

  // showOrganizationColumn에 따라 조직 컬럼 포함 여부 결정
  const columns = showOrganizationColumn ? allColumns : allColumns.filter(col => col.id !== 'organization');

  const table = useReactTable({
    data: accessLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card>
        <Center py="80px">
          <Spinner size="xl" />
        </Center>
      </Card>
    );
  }

  if (accessLogs.length === 0) {
    return (
      <Card>
        <Center py="80px">
          <Text color="secondaryGray.600" fontSize="md">
            액세스 로그가 없습니다.
          </Text>
        </Center>
      </Card>
    );
  }

  return (
    <Card px="0px">
      <Box overflowX="auto">
        <Table variant="simple" color="gray.500" mb="24px">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    borderColor={borderColor}
                    pe="10px"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td
                    key={cell.id}
                    fontSize={{ sm: '14px' }}
                    minW={{ sm: '150px', md: '200px', lg: 'auto' }}
                    borderColor={borderColor}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* 페이지네이션 */}
      <Flex justify="space-between" align="center" px="25px" pb="20px">
        <Text fontSize="sm" color="secondaryGray.600">
          전체 {totalCount}개 중 {((currentPage - 1) * pageSize) + 1}-
          {Math.min(currentPage * pageSize, totalCount)}개 표시
        </Text>
        <Flex gap="10px">
          <Button
            size="sm"
            onClick={() => onPageChange((currentPage - 2) * pageSize)}
            isDisabled={currentPage === 1}
          >
            이전
          </Button>
          <Text fontSize="sm" color={textColor} alignSelf="center">
            {currentPage} / {Math.ceil(totalCount / pageSize) || 1}
          </Text>
          <Button
            size="sm"
            onClick={() => onPageChange(currentPage * pageSize)}
            isDisabled={currentPage * pageSize >= totalCount}
          >
            다음
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
