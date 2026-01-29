/* eslint-disable */

import {
  Box,
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
  useToast,
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
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';
import { getUsers, updateUserRole } from 'services/supabaseService';

const columnHelper = createColumnHelper();

export default function PermissionTable(props) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState([]);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const toast = useToast();

  // ✅ Supabase 연동
  const { user, role, organizationId, advertiserId, organizationType, isMaster } = useAuth();
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // ✅ 디버그 로그
  React.useEffect(() => {
    console.log('🔍 권한 정보:', { role, organizationType, isMaster: isMaster() });
  }, [role, organizationType, isMaster]);

  // ✅ 사용자 목록 조회
  const fetchUsers = React.useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const currentUser = {
        id: user.id,
        role,
        organization_id: organizationId || null,
        advertiser_id: advertiserId || null,
        organization_type: organizationType,
      };

      const users = await getUsers(currentUser);
      setData(users);
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
  }, [user, role, organizationId, advertiserId, organizationType, toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ✅ 권한 계층 구조 정의
  const roleHierarchy = {
    master: 100,
    agency_admin: 7,
    agency_manager: 6,
    agency_staff: 5,
    advertiser_admin: 4,
    advertiser_staff: 3,
    editor: 2,
    viewer: 1,
  };

  // ✅ 수정 가능한 사용자인지 체크
  const canEditUser = (targetUser) => {
    if (!targetUser) return false;

    // Master는 모든 사용자 수정 가능 (단, 다른 Master는 수정 불가)
    if (isMaster()) {
      return targetUser.role !== 'master';
    }

    // 대상 사용자의 권한이 자신보다 낮아야 수정 가능
    const targetRoleLevel = roleHierarchy[targetUser.role] || 0;
    const currentRoleLevel = roleHierarchy[role] || 0;

    return targetRoleLevel < currentRoleLevel;
  };

  // ✅ 부여 가능한 권한인지 체크
  const canAssignRole = (targetRole) => {
    // Master 권한은 UI에서 절대 변경 불가
    if (targetRole === 'master') {
      return false;
    }

    // Master는 모든 권한 부여 가능 (master 제외)
    if (isMaster()) {
      return true;
    }

    // 자신보다 높거나 같은 권한은 부여 불가 (동급도 차단)
    return roleHierarchy[targetRole] < roleHierarchy[role];
  };

  // ✅ 역할 변경 핸들러 (Supabase 연동)
  const handleRoleChange = async (userId, newRole) => {
    const targetUser = data.find(u => u.id === userId);

    if (!targetUser) {
      toast({
        title: '권한 변경 실패',
        description: '사용자를 찾을 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 수정 권한 체크
    if (!canEditUser(targetUser)) {
      toast({
        title: '권한 변경 불가',
        description: '자신과 동급이거나 상위 권한을 가진 사용자는 수정할 수 없습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // 부여 권한 체크
    if (!canAssignRole(newRole)) {
      toast({
        title: '권한 변경 불가',
        description: '자신보다 높거나 동급의 권한으로 변경할 수 없습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const masterCount = data.filter(u => u.role === 'master').length;

    // 유일한 master를 다른 권한으로 변경하려는 경우
    if (targetUser?.role === 'master' && newRole !== 'master' && masterCount === 1) {
      toast({
        title: '권한 변경 불가',
        description: '최소 1명의 마스터 관리자가 필요합니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const currentUser = {
        id: user.id,
        role,
        organization_id: organizationId || null,
        advertiser_id: advertiserId || null,
      };

      await updateUserRole(userId, newRole, currentUser);

      toast({
        title: '권한 변경 완료',
        description: `${targetUser.email}의 권한이 변경되었습니다.`,
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

  // ✅ 역할 표시명 매핑
  const getRoleLabel = (role) => {
    const roleMap = {
      master: '마스터',
      specialist: '스페셜리스트',
      agency_admin: '에이전시 대표',
      agency_manager: '에이전시 관리자',
      agency_staff: '에이전시 직원',
      advertiser_admin: '브랜드 대표운영자',
      advertiser_staff: '브랜드 부운영자',
      editor: '편집자',
      viewer: '뷰어',
    };
    return roleMap[role] || role;
  };

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
    columnHelper.accessor('name', {
      id: 'name',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          이름
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue() || '-'}
        </Text>
      ),
    }),
    columnHelper.accessor('created_at', {
      id: 'created_at',
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
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString('ko-KR') : '-'}
        </Text>
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
          역할 변경
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        const currentRole = info.getValue();
        const userEditable = canEditUser(row);

        return (
          <Menu>
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
              borderRadius='12px'
              isDisabled={!userEditable}
            >
              {getRoleLabel(currentRole)}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
              {/* 브랜드 권한 */}
              <MenuItem
                onClick={() => handleRoleChange(row.id, 'advertiser_admin')}
                bg={currentRole === 'advertiser_admin' ? brandColor : 'transparent'}
                color={currentRole === 'advertiser_admin' ? 'white' : textColor}
                _hover={{ bg: currentRole === 'advertiser_admin' ? brandColor : bgHover }}
                fontWeight={currentRole === 'advertiser_admin' ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                isDisabled={!canAssignRole('advertiser_admin')}
                opacity={!canAssignRole('advertiser_admin') ? 0.4 : 1}
              >
                브랜드 대표운영자
              </MenuItem>
              <MenuItem
                onClick={() => handleRoleChange(row.id, 'advertiser_staff')}
                bg={currentRole === 'advertiser_staff' ? brandColor : 'transparent'}
                color={currentRole === 'advertiser_staff' ? 'white' : textColor}
                _hover={{ bg: currentRole === 'advertiser_staff' ? brandColor : bgHover }}
                fontWeight={currentRole === 'advertiser_staff' ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                mt='4px'
                isDisabled={!canAssignRole('advertiser_staff')}
                opacity={!canAssignRole('advertiser_staff') ? 0.4 : 1}
              >
                브랜드 부운영자
              </MenuItem>

              {/* 에이전시 권한 (마스터 또는 agency) */}
              {(isMaster() || organizationType === 'agency') && (
                <>
                  <MenuItem
                    onClick={() => handleRoleChange(row.id, 'agency_admin')}
                    bg={currentRole === 'agency_admin' ? brandColor : 'transparent'}
                    color={currentRole === 'agency_admin' ? 'white' : textColor}
                    _hover={{ bg: currentRole === 'agency_admin' ? brandColor : bgHover }}
                    fontWeight={currentRole === 'agency_admin' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    mt='4px'
                    isDisabled={!canAssignRole('agency_admin')}
                    opacity={!canAssignRole('agency_admin') ? 0.4 : 1}
                  >
                    에이전시 대표
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleRoleChange(row.id, 'agency_manager')}
                    bg={currentRole === 'agency_manager' ? brandColor : 'transparent'}
                    color={currentRole === 'agency_manager' ? 'white' : textColor}
                    _hover={{ bg: currentRole === 'agency_manager' ? brandColor : bgHover }}
                    fontWeight={currentRole === 'agency_manager' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    mt='4px'
                    isDisabled={!canAssignRole('agency_manager')}
                    opacity={!canAssignRole('agency_manager') ? 0.4 : 1}
                  >
                    에이전시 관리자
                  </MenuItem>
                </>
              )}

            </MenuList>
          </Menu>
        );
      },
    }),
  ];

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
          권한 관리
        </Text>
      </Flex>
      <Box px="25px" mb="20px">
        <Text color={textColor} fontSize="sm">
          사용자의 역할을 변경하여 관리자 권한을 부여하거나 회수할 수 있습니다.
        </Text>
        <Text color="gray.500" fontSize="sm" mt="8px">
          기본값: 회원가입 시 모든 사용자는 대시보드에 접근 가능한 일반 사용자로 등록됩니다.
        </Text>
      </Box>
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
