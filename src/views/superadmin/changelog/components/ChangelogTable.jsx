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

export default function ChangelogTable({
  changelogs = [],
  isLoading = false,
  totalCount = 0,
  currentPage = 1,
  pageSize = 100,
  onPageChange,
  showBrandColumn = true,
}) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const { role } = useAuth();

  // 작업 타입 뱃지 색상
  const getActionBadgeColor = (actionType) => {
    switch (actionType) {
      case 'create': return 'green';
      case 'delete': return 'red';
      case 'update': return 'blue';
      case 'invite': return 'purple';
      default: return 'gray';
    }
  };

  // 대상 타입 뱃지 색상
  const getTargetBadgeColor = (targetType) => {
    switch (targetType) {
      case 'user': return 'blue';
      case 'token': return 'orange';
      case 'brand': return 'green';
      case 'access': return 'yellow';
      case 'role': return 'purple';
      default: return 'gray';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 작업 타입 한글 변환
  const getActionTypeLabel = (actionType) => {
    switch (actionType) {
      case 'create': return '추가';
      case 'delete': return '삭제';
      case 'update': return '변경';
      case 'invite': return '초대';
      default: return actionType;
    }
  };

  // 대상 타입 한글 변환
  const getTargetTypeLabel = (targetType) => {
    switch (targetType) {
      case 'user': return '사용자';
      case 'token': return '토큰';
      case 'brand': return '브랜드';
      case 'access': return '액세스';
      case 'role': return '권한';
      default: return targetType;
    }
  };

  // 컬럼 정의
  const allColumns = [
    // 브랜드 컬럼 (superadmin만)
    columnHelper.accessor('changed_by_role', {
      id: 'brand',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          브랜드
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        const isAgency = row.changed_by_role?.startsWith('agency');
        const displayName = isAgency ? row.organization_name : row.advertiser_name;
        return (
          <Text color={textColor} fontSize="sm" fontWeight="500">
            {displayName || '-'}
          </Text>
        );
      },
    }),

    // 이름 컬럼
    columnHelper.accessor('changed_by_name', {
      id: 'name',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          이름
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="500">
          {info.getValue()}
        </Text>
      ),
    }),

    // 이메일 컬럼
    columnHelper.accessor('changed_by_email', {
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

    // 변경일 컬럼
    columnHelper.accessor('created_at', {
      id: 'date',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          변경일
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">
          {formatDate(info.getValue())}
        </Text>
      ),
    }),

    // 변경내역 컬럼
    columnHelper.accessor('action_detail', {
      id: 'detail',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          변경내역
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Flex direction="column" gap="4px">
            <Flex gap="8px">
              <Badge colorScheme={getTargetBadgeColor(row.target_type)} fontSize="xs">
                {getTargetTypeLabel(row.target_type)}
              </Badge>
              <Badge colorScheme={getActionBadgeColor(row.action_type)} fontSize="xs">
                {getActionTypeLabel(row.action_type)}
              </Badge>
            </Flex>
            <Text color={textColor} fontSize="sm">
              {info.getValue()}
            </Text>
          </Flex>
        );
      },
    }),
  ];

  // showBrandColumn에 따라 브랜드 컬럼 포함 여부 결정
  const columns = showBrandColumn ? allColumns : allColumns.filter(col => col.id !== 'brand');

  const table = useReactTable({
    data: changelogs,
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

  if (changelogs.length === 0) {
    return (
      <Card>
        <Center py="80px">
          <Text color="secondaryGray.600" fontSize="md">
            변경 이력이 없습니다.
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
