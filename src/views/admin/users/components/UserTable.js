/* eslint-disable */

import {
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
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
import { MdMoreVert } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';
import EditUserModal from './EditUserModal';

const columnHelper = createColumnHelper();

export default function UserTable(props) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState([]);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const { isAgency, role, organizationId, advertiserId } = useAuth();

  // Mock 데이터 (대행사용 - 클라이언트명 포함)
  const mockUsers = React.useMemo(() => [
    {
      name: '김철수',
      email: 'ceo@booming.com',
      role: 'org_admin',
      organizationId: 'org-1', // 부밍 대행사
      advertiserId: null, // org_admin은 전체 브랜드 접근
      client: null,
      joinDate: '2024.01.15',
      status: 'active',
    },
    {
      name: '박대행',
      email: 'manager@booming.com',
      role: 'org_manager',
      organizationId: 'org-1', // 부밍 대행사
      advertiserId: null, // 대행사 직원
      client: null,
      joinDate: '2024.01.20',
      status: 'active',
    },
    {
      name: '이영희',
      email: 'am1@booming.com',
      role: 'advertiser_admin',
      organizationId: 'org-1', // 부밍 대행사 소속
      advertiserId: 'adv-nike', // 나이키 담당 AM
      client: '나이키',
      joinDate: '2024.02.20',
      status: 'active',
    },
    {
      name: '박민수',
      email: 'am2@booming.com',
      role: 'advertiser_admin',
      organizationId: 'org-1', // 부밍 대행사 소속
      advertiserId: 'adv-adidas', // 아디다스 담당 AM
      client: '아디다스',
      joinDate: '2024.03.10',
      status: 'active',
    },
    {
      name: '최지은',
      email: 'designer@booming.com',
      role: 'editor',
      organizationId: 'org-1', // 부밍 대행사 소속
      advertiserId: 'adv-nike', // 나이키 담당
      client: '나이키',
      clients: ['나이키', '아디다스'], // 복수 브랜드 접근 예시
      joinDate: '2024.01.25',
      status: 'active',
    },
    {
      name: '정수현',
      email: 'intern@booming.com',
      role: 'viewer',
      organizationId: 'org-1', // 부밍 대행사 소속
      advertiserId: null, // 전체 보기
      client: null,
      joinDate: '2024.04.05',
      status: 'active',
    },
    // 브랜드 회사 직원 (나이키)
    {
      name: '김나이키',
      email: 'ceo@nike.com',
      role: 'advertiser_admin',
      organizationId: 'org-nike', // 나이키 회사
      advertiserId: 'adv-nike',
      client: '나이키',
      joinDate: '2024.01.10',
      status: 'active',
    },
    {
      name: '이나이키',
      email: 'manager@nike.com',
      role: 'manager',
      organizationId: 'org-nike', // 나이키 회사
      advertiserId: 'adv-nike',
      client: '나이키',
      joinDate: '2024.01.15',
      status: 'active',
    },
    {
      name: '박나이키',
      email: 'staff@nike.com',
      role: 'editor',
      organizationId: 'org-nike', // 나이키 회사
      advertiserId: 'adv-nike',
      client: '나이키',
      joinDate: '2024.02.01',
      status: 'active',
    },
    // 브랜드 회사 직원 (아디다스)
    {
      name: '김아디다스',
      email: 'ceo@adidas.com',
      role: 'advertiser_admin',
      organizationId: 'org-adidas', // 아디다스 회사
      advertiserId: 'adv-adidas',
      client: '아디다스',
      joinDate: '2024.02.01',
      status: 'active',
    },
    {
      name: '이아디다스',
      email: 'staff@adidas.com',
      role: 'editor',
      organizationId: 'org-adidas', // 아디다스 회사
      advertiserId: 'adv-adidas',
      client: '아디다스',
      joinDate: '2024.02.10',
      status: 'active',
    },
  ], []);

  // 권한에 따른 사용자 필터링
  const filteredUsers = React.useMemo(() => {
    const users = tableData || mockUsers;

    // Master는 모든 사용자 조회 가능
    if (role === 'master') {
      return users;
    }

    // 대행사 (org_admin, org_manager, org_staff)는 모든 브랜드와 대행사 직원 조회 가능
    if (['org_admin', 'org_manager', 'org_staff'].includes(role)) {
      return users.filter(user =>
        user.organizationId === organizationId || // 같은 대행사 직원
        user.advertiserId // 또는 대행사가 관리하는 브랜드 직원
      );
    }

    // 브랜드 (advertiser_admin, manager)는 본인 회사 직원만 조회 가능
    if (['advertiser_admin', 'manager'].includes(role)) {
      return users.filter(user =>
        user.organizationId === organizationId // 같은 회사 직원만
      );
    }

    // 기본: 본인만 조회
    return users.filter(user => user.email === user.email);
  }, [tableData, mockUsers, role, organizationId, advertiserId]);

  const [data, setData] = React.useState(() => filteredUsers);

  // filteredUsers 변경 시 data 업데이트
  React.useEffect(() => {
    setData(filteredUsers);
  }, [filteredUsers]);

  const handleAccessToggle = (userEmail, currentAccess) => {
    // UI 즉시 업데이트
    setData(prevData =>
      prevData.map(user =>
        user.email === userEmail
          ? { ...user, status: currentAccess ? 'inactive' : 'active' }
          : user
      )
    );

    // TODO: Supabase에서 액세스 권한 업데이트
    console.log('액세스 변경:', userEmail, currentAccess ? 'deny' : 'allow');
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleUpdateUser = (userId, updatedData) => {
    // 사용자 데이터 업데이트
    setData(prevData =>
      prevData.map(user =>
        (user.id || user.email) === userId
          ? {
              ...user,
              role: updatedData.role,
              advertiserIds: updatedData.advertiserIds,
              // clients 배열도 업데이트 (UI 표시용)
              clients: updatedData.advertiserIds.length > 0
                ? updatedData.advertiserIds.map(id => {
                    // Mock 클라이언트 목록에서 이름 찾기
                    const mockClients = [
                      { id: "client-nike", name: "나이키" },
                      { id: "client-adidas", name: "아디다스" },
                      { id: "client-puma", name: "푸마" },
                    ];
                    const client = mockClients.find(c => c.id === id);
                    return client ? client.name : id;
                  })
                : null,
              client: updatedData.advertiserIds.length === 1
                ? (() => {
                    const mockClients = [
                      { id: "client-nike", name: "나이키" },
                      { id: "client-adidas", name: "아디다스" },
                      { id: "client-puma", name: "푸마" },
                    ];
                    const client = mockClients.find(c => c.id === updatedData.advertiserIds[0]);
                    return client ? client.name : updatedData.advertiserIds[0];
                  })()
                : null,
            }
          : user
      )
    );
  };

  const handleDeactivateUser = (user) => {
    if (window.confirm(`${user.name} (${user.email})를 비활성화하시겠습니까?\n\n비활성화된 사용자는 로그인할 수 없으며, 모든 액세스 권한이 제거됩니다.`)) {
      // UI 업데이트
      setData(prevData =>
        prevData.map(u =>
          u.email === user.email
            ? { ...u, status: 'inactive' }
            : u
        )
      );

      // TODO: Supabase에서 사용자 비활성화
      console.log('사용자 비활성화:', user.id || user.email);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      master: { label: 'Master', color: 'red' },
      org_admin: { label: '대행사 최고관리자', color: 'purple' },
      org_manager: { label: '대행사 관리자', color: 'purple' },
      org_staff: { label: '대행사 직원', color: 'purple' },
      advertiser_admin: { label: '브랜드 대표운영자', color: 'blue' },
      manager: { label: '브랜드 운영자', color: 'cyan' },
      editor: { label: '편집자', color: 'green' },
      viewer: { label: '뷰어', color: 'gray' },
    };
    const config = roleConfig[role] || { label: role, color: 'gray' };
    return (
      <Badge colorScheme={config.color} fontSize="xs">
        {config.label}
      </Badge>
    );
  };

  const columns = React.useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            이름
          </Text>
        ),
        cell: (info) => (
          <Text color={textColor} fontSize="sm" fontWeight="700">
            {info.getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor('email', {
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
    ];

    // 브랜드 컬럼 추가 (대행사와 브랜드 모두)
    // - 대행사: "담당 브랜드" (직원이 어느 브랜드를 담당하는지)
    // - 브랜드: "접근 가능한 브랜드" (팀원이 어느 브랜드에 접근 가능한지)
    baseColumns.push(
      columnHelper.accessor('client', {
        id: 'client',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            {isAgency() ? '담당 브랜드' : '접근 가능한 브랜드'}
          </Text>
        ),
        cell: (info) => {
          const client = info.getValue();
          // clients 배열이 있으면 사용 (복수 브랜드)
          const row = info.row.original;
          const clients = row.clients;

          if (clients && clients.length > 0) {
            return (
              <Text color={textColor} fontSize="sm">
                {clients.join(', ')}
              </Text>
            );
          }

          return (
            <Text color={textColor} fontSize="sm">
              {client || (
                <Text as="span" color="gray.400">
                  전체
                </Text>
              )}
            </Text>
          );
        },
      })
    );

    baseColumns.push(
      columnHelper.accessor('role', {
        id: 'role',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            권한
          </Text>
        ),
        cell: (info) => getRoleBadge(info.getValue()),
      }),
      columnHelper.accessor('joinDate', {
        id: 'joinDate',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            가입일
          </Text>
        ),
        cell: (info) => (
          <Text color={textColor} fontSize="sm">
            {info.getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            상태
          </Text>
        ),
        cell: (info) => {
          const isActive = info.getValue() === 'active';
          return (
            <Badge colorScheme={isActive ? 'green' : 'gray'} fontSize="xs">
              {isActive ? '활성' : '비활성'}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'access',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            액세스
          </Text>
        ),
        cell: (info) => {
          const row = info.row.original;
          // 액세스 권한은 별도 필드로 관리 (임시로 status 사용)
          const hasAccess = row.status === 'active';
          return (
            <Flex align="center" gap="8px">
              <Switch
                colorScheme="brand"
                isChecked={hasAccess}
                onChange={() => handleAccessToggle(row.email, hasAccess)}
                size="sm"
              />
              <Text fontSize="sm" color={textColor}>
                {hasAccess ? '허용' : '차단'}
              </Text>
            </Flex>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
            액션
          </Text>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="ghost"
                rightIcon={<Icon as={MdMoreVert} />}
              />
              <MenuList>
                <MenuItem onClick={() => handleEditUser(row)}>
                  권한 변경
                </MenuItem>
                {isAgency() && (
                  <MenuItem onClick={() => handleEditUser(row)}>
                    브랜드 재할당
                  </MenuItem>
                )}
                <MenuItem color="red.500" onClick={() => handleDeactivateUser(row)}>
                  비활성화
                </MenuItem>
              </MenuList>
            </Menu>
          );
        },
      })
    );

    return baseColumns;
  }, [isAgency, textColor]);

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
    <>
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
            {isAgency() ? '직원 목록' : '팀원 목록'}
          </Text>
        </Flex>
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
                        header.getContext()
                      )}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted()] ?? null}
                    </Flex>
                  </Th>
                );
              })}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => {
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
                        cell.getContext()
                      )}
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Card>

    <EditUserModal
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      user={selectedUser}
      onUpdate={handleUpdateUser}
    />
    </>
  );
}
