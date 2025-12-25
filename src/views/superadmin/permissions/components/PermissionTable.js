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

  // TODO: Supabase 연동 시 실제 사용자 권한으로 교체
  const isSuperAdmin = true; // 현재 로그인한 사용자가 최고 관리자인지 여부

  // Mock 데이터 (향후 Supabase로 교체 예정)
  const mockUsers = React.useMemo(() => [
    {
      email: 'superadmin@example.com',
      joinDate: '2024.01.01',
      status: 'active',
      role: 'superadmin',
    },
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

  const [data, setData] = React.useState(() => [...defaultData]);

  // 역할 변경 핸들러 (향후 Supabase로 교체)
  const handleRoleChange = (email, newRole) => {
    // 최고 관리자를 다른 권한으로 변경하려는 경우 검증
    const currentUser = data.find(user => user.email === email);
    const superadminCount = data.filter(user => user.role === 'superadmin').length;

    // 현재 사용자가 유일한 최고 관리자이고, 권한을 내리려는 경우
    if (currentUser?.role === 'superadmin' && newRole !== 'superadmin' && superadminCount === 1) {
      toast({
        title: '권한 변경 불가',
        description: '최소 1명의 최고 관리자가 필요합니다. 다른 사용자에게 최고 관리자 권한을 부여한 후 변경해주세요.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setData(prevData =>
      prevData.map(user =>
        user.email === email
          ? { ...user, role: newRole }
          : user
      )
    );

    toast({
      title: '권한 변경 완료',
      description: `${email}의 권한이 변경되었습니다.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
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
        <Badge
          colorScheme={info.getValue() === 'active' ? 'green' : 'red'}
          fontSize="sm"
          fontWeight="700"
          px="12px"
          py="4px"
          borderRadius="8px"
        >
          {info.getValue() === 'active' ? '활성' : '비활성'}
        </Badge>
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
            >
              {currentRole === 'superadmin' ? '최고 관리자' : currentRole === 'admin' ? '관리자' : '일반 사용자'}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
              <MenuItem
                onClick={() => handleRoleChange(row.email, 'user')}
                bg={currentRole === 'user' ? brandColor : 'transparent'}
                color={currentRole === 'user' ? 'white' : textColor}
                _hover={{
                  bg: currentRole === 'user' ? brandColor : bgHover,
                }}
                fontWeight={currentRole === 'user' ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                justifyContent='center'
                textAlign='center'
                minH='auto'
              >
                일반 사용자
              </MenuItem>
              <MenuItem
                onClick={() => handleRoleChange(row.email, 'admin')}
                bg={currentRole === 'admin' ? brandColor : 'transparent'}
                color={currentRole === 'admin' ? 'white' : textColor}
                _hover={{
                  bg: currentRole === 'admin' ? brandColor : bgHover,
                }}
                fontWeight={currentRole === 'admin' ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                justifyContent='center'
                textAlign='center'
                minH='auto'
                mt='4px'
              >
                관리자
              </MenuItem>
              {isSuperAdmin && (
                <MenuItem
                  onClick={() => handleRoleChange(row.email, 'superadmin')}
                  bg={currentRole === 'superadmin' ? brandColor : 'transparent'}
                  color={currentRole === 'superadmin' ? 'white' : textColor}
                  _hover={{
                    bg: currentRole === 'superadmin' ? brandColor : bgHover,
                  }}
                  fontWeight={currentRole === 'superadmin' ? '600' : '500'}
                  fontSize='sm'
                  px='12px'
                  py='8px'
                  borderRadius='8px'
                  justifyContent='center'
                  textAlign='center'
                  minH='auto'
                  mt='4px'
                >
                  최고 관리자
                </MenuItem>
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
