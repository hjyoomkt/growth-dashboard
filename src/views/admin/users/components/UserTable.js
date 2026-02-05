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
  useToast,
  HStack,
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
import { getUsers, updateUserRole, updateUserStatus, logChangelog } from 'services/supabaseService';
import EditUserModal from './EditUserModal';
import BrandListModal from './BrandListModal';
import AdminDeleteUserModal from './AdminDeleteUserModal';

const columnHelper = createColumnHelper();

export default function UserTable(props) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState([]);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [brandListModalOpen, setBrandListModalOpen] = React.useState(false);
  const [selectedBrandUser, setSelectedBrandUser] = React.useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState(null);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const { user, isAgency, role, organizationId, advertiserId, organizationType, isMaster, currentOrganizationId } = useAuth();
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const toast = useToast();

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // ✅ 디버그 로그
  React.useEffect(() => {
    console.log('🔍 UserTable 권한 정보:', { role, organizationType, isMaster: isMaster() });
  }, [role, organizationType, isMaster]);

  // ✅ 사용자 목록 조회 (Supabase)
  const fetchUsers = React.useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const currentUser = {
        id: user.id,
        role,
        organization_id: organizationId,
        advertiser_id: advertiserId,
        organizationType,
        currentOrganizationId: currentOrganizationId,
      };

      const users = await getUsers(currentUser);
      console.log('[UserTable] 조회된 사용자:', users);

      // 데이터 변환: accessible_advertisers를 clients 배열로 매핑
      const transformedUsers = users.map(u => {
        const clients = u.accessible_advertisers?.map(adv => adv.name) || [];
        console.log('[UserTable] 변환:', { name: u.name, accessible_advertisers: u.accessible_advertisers, clients });

        return {
          ...u,
          clients,
          advertiserIds: u.accessible_advertisers?.map(adv => adv.id) || [],
          // 단일 브랜드 표시 (레거시 호환)
          client: u.accessible_advertisers && u.accessible_advertisers.length > 0
            ? u.accessible_advertisers[0].name
            : (u.advertisers?.name || null),
          // 가입일 포맷팅
          joinDate: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '',
        };
      });

      console.log('[UserTable] 최종 데이터:', transformedUsers);
      setData(transformedUsers);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
      toast({
        title: '사용자 목록 조회 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, role, organizationId, advertiserId, organizationType, currentOrganizationId, toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAccessToggle = async (userId, currentAccess) => {
    const newStatus = currentAccess ? 'inactive' : 'active';

    try {
      const currentUser = {
        id: user.id,
        role,
        organization_id: organizationId,
        advertiser_id: advertiserId,
      };

      // 대상 사용자 정보 조회
      const targetUser = data.find(u => u.id === userId);

      // Supabase에서 액세스 권한 업데이트 (권한 검증 포함)
      await updateUserStatus(userId, newStatus, currentUser);

      // 변경 로그 기록
      if (targetUser) {
        await logChangelog({
          targetType: 'access',
          targetId: userId,
          targetName: targetUser.name || targetUser.email,
          actionType: 'update',
          actionDetail: `${targetUser.name || targetUser.email}의 액세스 상태 변경: ${currentAccess ? '허용' : '차단'} → ${newStatus === 'active' ? '허용' : '차단'}`,
          advertiserId: targetUser.advertiser_id,
          advertiserName: targetUser.advertiser_name,
          organizationId: targetUser.organization_id,
          organizationName: targetUser.organization_name,
          oldValue: { status: currentAccess ? 'active' : 'inactive' },
          newValue: { status: newStatus },
        });
      }

      // UI 업데이트
      setData(prevData =>
        prevData.map(user =>
          user.id === userId
            ? { ...user, status: newStatus }
            : user
        )
      );

      toast({
        title: '액세스 변경 완료',
        description: `사용자 액세스가 ${newStatus === 'active' ? '허용' : '차단'}되었습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('액세스 변경 실패:', error);
      toast({
        title: '액세스 변경 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleShowBrands = (user) => {
    setSelectedBrandUser(user);
    setBrandListModalOpen(true);
  };

  const handleUpdateUser = async (userId, updatedData) => {
    try {
      const currentUser = {
        id: user.id,
        role,
        organization_id: organizationId,
        advertiser_id: advertiserId,
      };

      await updateUserRole(userId, updatedData.role, currentUser);

      toast({
        title: '권한 변경 완료',
        description: '사용자 권한이 변경되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // 목록 새로고침
      fetchUsers();
    } catch (error) {
      console.error('권한 변경 실패:', error);
      toast({
        title: '권한 변경 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeactivateUser = async (targetUser) => {
    if (window.confirm(`${targetUser.name} (${targetUser.email})를 비활성화하시겠습니까?\n\n비활성화된 사용자는 로그인할 수 없으며, 모든 액세스 권한이 제거됩니다.`)) {
      try {
        const currentUser = {
          id: user.id,
          role,
          organization_id: organizationId,
          advertiser_id: advertiserId,
        };

        // Supabase에서 사용자 비활성화 (권한 검증 포함)
        await updateUserStatus(targetUser.id, 'inactive', currentUser);

        // UI 업데이트
        setData(prevData =>
          prevData.map(u =>
            u.id === targetUser.id
              ? { ...u, status: 'inactive' }
              : u
          )
        );

        toast({
          title: '사용자 비활성화 완료',
          description: `${targetUser.name}님이 비활성화되었습니다.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error('사용자 비활성화 실패:', error);
        toast({
          title: '비활성화 실패',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleDeleteUser = (targetUser) => {
    setUserToDelete(targetUser);
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
    fetchUsers();
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      master: { label: '마스터', color: 'red' },
      agency_admin: { label: '에이전시 대표', color: 'purple' },
      agency_manager: { label: '에이전시 관리자', color: 'purple' },
      agency_staff: { label: '에이전시 직원', color: 'purple' },
      advertiser_admin: { label: '브랜드 대표운영자', color: 'blue' },
      advertiser_staff: { label: '브랜드 부운영자', color: 'cyan' },
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
            if (clients.length === 1) {
              return (
                <Badge bg="black" color="white" fontSize="xs">
                  {clients[0]}
                </Badge>
              );
            }

            return (
              <Flex align="center" gap="6px">
                <Badge bg="black" color="white" fontSize="xs">
                  {clients[0]}
                </Badge>
                <Badge
                  colorScheme="blue"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() => handleShowBrands(row)}
                  _hover={{ transform: 'scale(1.05)', opacity: 0.8 }}
                >
                  +{clients.length - 1}
                </Badge>
              </Flex>
            );
          }

          return (
            <Badge colorScheme="gray" fontSize="xs">
              전체
            </Badge>
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
                onChange={() => handleAccessToggle(row.id, hasAccess)}
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
                <MenuItem color="red.500" onClick={() => handleDeactivateUser(row)}>
                  비활성화
                </MenuItem>
                {(role === 'master' || role === 'agency_admin') && (
                  <MenuItem
                    color="red.600"
                    onClick={() => handleDeleteUser(row)}
                    isDisabled={row.role === 'master' || row.id === user.id}
                  >
                    회원삭제
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          );
        },
      })
    );

    return baseColumns;
  }, [isAgency, textColor]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const currentData = React.useMemo(() => {
    return data.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [data, currentPage, itemsPerPage]);

  // 데이터 변경 시 첫 페이지로 리셋
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const table = useReactTable({
    data: currentData,
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

      {/* 페이지네이션 UI */}
      {data.length > 0 && (
        <Flex justify="center" align="center" mt={4} px="25px" pb="20px">
          <HStack spacing={2}>
            <Button
              size="sm"
              onClick={() => setCurrentPage(1)}
              isDisabled={currentPage === 1}
            >
              처음
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              isDisabled={currentPage === 1}
            >
              이전
            </Button>
            <Text fontSize="sm" px={3}>
              {currentPage} / {totalPages}
            </Text>
            <Button
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              isDisabled={currentPage === totalPages}
            >
              다음
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              isDisabled={currentPage === totalPages}
            >
              마지막
            </Button>
          </HStack>
        </Flex>
      )}
    </Card>

    <EditUserModal
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      user={selectedUser}
      onUpdate={handleUpdateUser}
    />

    <BrandListModal
      isOpen={brandListModalOpen}
      onClose={() => setBrandListModalOpen(false)}
      userName={selectedBrandUser?.name}
      brands={selectedBrandUser?.clients}
    />

    <AdminDeleteUserModal
      isOpen={deleteModalOpen}
      onClose={() => {
        setDeleteModalOpen(false);
        setUserToDelete(null);
      }}
      targetUser={userToDelete}
      onDeleteSuccess={handleDeleteSuccess}
    />
    </>
  );
}
