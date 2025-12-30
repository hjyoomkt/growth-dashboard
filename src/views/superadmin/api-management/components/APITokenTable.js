/* eslint-disable */

import {
  Box,
  Button,
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
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  Checkbox,
  HStack,
  VStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Radio,
  RadioGroup,
  Stack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
import { MdEdit, MdDelete, MdAdd, MdSearch, MdLink, MdCheckCircle, MdOutlineError, MdSchedule, MdSync, MdKeyboardArrowDown } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';
import { checkYesterdayData, getYesterdayDate, isAfter10AM } from 'utils/dataCollectionChecker';

const columnHelper = createColumnHelper();

export default function APITokenTable(props) {
  const { ...rest } = props;
  const { isAgency, advertiserId, availableAdvertisers } = useAuth();
  const [sorting, setSorting] = React.useState([]);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');
  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isConversionModalOpen, onOpen: onConversionModalOpen, onClose: onConversionModalClose } = useDisclosure();
  const { isOpen: isSyncModalOpen, onOpen: onSyncModalOpen, onClose: onSyncModalClose } = useDisclosure();
  const { isOpen: isSyncWarningOpen, onOpen: onSyncWarningOpen, onClose: onSyncWarningClose } = useDisclosure();
  const [editMode, setEditMode] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState(null);

  // 데이터 연동 상태
  const [syncConfig, setSyncConfig] = React.useState({
    selectedPlatform: '',
    dateRange: 'yesterday', // yesterday, lastWeek, lastMonth, custom, all
    updateMode: 'skipExisting', // skipExisting, updateAll
    startDate: '',
    endDate: '',
  });

  // Form states
  const [formData, setFormData] = React.useState({
    advertiser: '',
    accountDescription: '', // 계정 설명/메모
    platform: '',
    // Google Ads 전용 필드
    customerId: '',
    managerAccountId: '',
    developerToken: '',
    targetConversionActionId: [],
    refreshToken: '',
    clientId: '',
    clientSecret: '',
    // Naver Ads 전용 필드
    secretKey: '',
    // 공통 필드
    accountId: '',
    apiToken: '',
    status: 'active',
  });

  // Mock conversion actions (향후 Supabase Edge Function으로 교체)
  const mockConversionActions = [
    { id: '7360669402', name: '차맵_DB수집', type: 'WEBPAGE', category: 'PURCHASE', status: 'ENABLED' },
    { id: '7360669403', name: '차맵_구매완료', type: 'WEBPAGE', category: 'PURCHASE', status: 'ENABLED' },
    { id: '7360669404', name: '차맵_장바구니', type: 'WEBPAGE', category: 'ADD_TO_CART', status: 'ENABLED' },
    { id: '7360669405', name: '차맵_회원가입', type: 'WEBPAGE', category: 'SIGN_UP', status: 'ENABLED' },
  ];

  const [selectedConversionActions, setSelectedConversionActions] = React.useState([]);

  // Mock 데이터 (향후 Supabase로 교체 예정)
  // TODO: Supabase 연동 시 아래 내용으로 교체
  // - useEffect에서 Supabase의 api_tokens 테이블 조회
  // - 실시간 구독으로 데이터 변경 감지
  // - 오전 10시 이후 자동으로 dataCollectionStatus 업데이트
  const [allData, setAllData] = React.useState([
    {
      id: 1,
      advertiserId: 'adv-nike',
      advertiser: '나이키',
      platform: 'Google Ads',
      customerId: '7521796943',
      refreshToken: '1//06***...***ts',
      lastUpdated: '2024.12.01',
      status: 'active',
      dataCollectionStatus: 'success', // success, error, pending (오전 10시 기준으로 전일자 데이터 체크)
    },
    {
      id: 2,
      advertiserId: 'adv-adidas',
      advertiser: '아디다스',
      platform: 'Meta Ads',
      accountId: 'act_9876543210',
      apiToken: 'meta_*********************abc',
      lastUpdated: '2024.11.28',
      status: 'active',
      dataCollectionStatus: 'error', // 데이터 수집 실패 (오전 10시 이후 전일자 데이터 없음)
    },
    {
      id: 3,
      advertiserId: 'adv-peppertux',
      advertiser: '페퍼툭스',
      platform: 'Naver Ads',
      accountId: 'naver-123456',
      apiToken: 'naver_********************def',
      lastUpdated: '2024.11.15',
      status: 'inactive',
      dataCollectionStatus: 'pending', // 오전 10시 이전 또는 데이터 수집 대기중
    },
  ]);

  // 권한에 따라 데이터 필터링
  const data = React.useMemo(() => {
    // 대행사는 모든 데이터 접근
    if (isAgency()) {
      return allData;
    }
    // 클라이언트는 자신의 브랜드 데이터만 접근
    return allData.filter(item => item.advertiserId === advertiserId);
  }, [allData, isAgency, advertiserId]);

  // TODO: Supabase 연동 후 주석 해제
  // 컴포넌트 마운트 시 데이터 수집 상태 체크
  // React.useEffect(() => {
  //   const checkDataStatus = async () => {
  //     const yesterday = getYesterdayDate();
  //     const isAfter10 = isAfter10AM();
  //
  //     console.log(`데이터 체크 시작: ${yesterday} (오전 10시 ${isAfter10 ? '이후' : '이전'})`);
  //
  //     // 각 활성 토큰에 대해 전일자 데이터 체크
  //     const updatedData = await Promise.all(
  //       allData.map(async (token) => {
  //         if (token.status !== 'active') {
  //           return token;
  //         }
  //
  //         const status = await checkYesterdayData(token.advertiserId, token.platform);
  //         return {
  //           ...token,
  //           dataCollectionStatus: status,
  //         };
  //       })
  //     );
  //
  //     setAllData(updatedData);
  //   };
  //
  //   checkDataStatus();
  //
  //   // 매 시간마다 재체크 (오전 10시 이후에 상태가 바뀔 수 있으므로)
  //   const interval = setInterval(checkDataStatus, 60 * 60 * 1000); // 1시간
  //
  //   return () => clearInterval(interval);
  // }, []);

  const handleAdd = () => {
    setEditMode(false);
    setSelectedToken(null);
    setFormData({
      advertiser: '',
      accountDescription: '',
      platform: '',
      customerId: '',
      managerAccountId: '',
      developerToken: '',
      targetConversionActionId: [],
      refreshToken: '',
      clientId: '',
      clientSecret: '',
      secretKey: '',
      accountId: '',
      apiToken: '',
      status: 'active',
    });
    onOpen();
  };

  const handleEdit = (token) => {
    setEditMode(true);
    setSelectedToken(token);
    setFormData({
      advertiser: token.advertiser || '',
      platform: token.platform || '',
      customerId: token.customerId || '',
      managerAccountId: token.managerAccountId || '',
      developerToken: token.developerToken || '',
      targetConversionActionId: token.targetConversionActionId || [],
      refreshToken: token.refreshToken || '',
      clientId: token.clientId || '',
      clientSecret: token.clientSecret || '',
      secretKey: token.secretKey || '',
      accountId: token.accountId || '',
      apiToken: token.apiToken || '',
      status: token.status || 'active',
    });
    onOpen();
  };

  // 전환 액션 조회 모달 열기
  const handleOpenConversionModal = () => {
    // TODO: Supabase Edge Function으로 실제 Google Ads API 호출
    // 현재는 mock 데이터 사용
    setSelectedConversionActions([]);
    onConversionModalOpen();
  };

  // 전환 액션 선택 토글
  const handleToggleConversionAction = (actionId) => {
    setSelectedConversionActions(prev => {
      if (prev.includes(actionId)) {
        return prev.filter(id => id !== actionId);
      } else {
        return [...prev, actionId];
      }
    });
  };

  // 전환 액션 선택 완료
  const handleConfirmConversionActions = () => {
    setFormData(prev => ({
      ...prev,
      targetConversionActionId: selectedConversionActions,
    }));
    onConversionModalClose();
  };

  // 개별 전환 액션 제거
  const handleRemoveConversionAction = (actionId) => {
    setFormData(prev => ({
      ...prev,
      targetConversionActionId: prev.targetConversionActionId.filter(id => id !== actionId),
    }));
  };

  // Google OAuth 연결 (Mock)
  const handleGoogleOAuthConnect = () => {
    // TODO: Supabase Edge Function으로 실제 OAuth 플로우 구현
    // 1. 팝업 윈도우로 Google OAuth URL 열기
    // 2. Authorization code 받기
    // 3. Edge Function에서 code → refresh_token 교환
    // 4. refresh_token을 formData에 자동 입력

    // Mock 구현: 임시 토큰 문자열 생성
    const mockRefreshToken = '1//0gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    setFormData(prev => ({
      ...prev,
      refreshToken: mockRefreshToken,
    }));

    toast({
      title: 'Google 계정 연결 완료',
      description: '리프레쉬 토큰이 자동으로 입력되었습니다.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // 데이터 연동 시작
  const handleSyncData = () => {
    setSyncConfig({
      selectedPlatform: '',
      dateRange: 'yesterday',
      updateMode: 'skipExisting',
      startDate: '',
      endDate: '',
    });
    onSyncModalOpen();
  };

  // 경고 확인 후 실제 연동 시작
  const handleConfirmSync = () => {
    onSyncModalClose();
    onSyncWarningOpen();
  };

  // 최종 연동 실행
  const handleExecuteSync = () => {
    onSyncWarningClose();

    // TODO: Supabase Edge Function으로 실제 데이터 연동 구현
    // 1. 선택된 플랫폼의 API 토큰 조회
    // 2. 기간에 맞는 데이터 조회
    // 3. updateMode에 따라 데이터 삽입/업데이트
    // 4. 진행 상황 표시

    toast({
      title: '데이터 연동 시작',
      description: '백그라운드에서 데이터 연동이 진행됩니다. 완료 시 알림을 받게 됩니다.',
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleDelete = (tokenId) => {
    // Mock 삭제 (향후 Supabase API 호출로 교체)
    setAllData(prevData => prevData.filter(item => item.id !== tokenId));
    toast({
      title: 'API 토큰 삭제 완료',
      description: 'API 토큰이 삭제되었습니다.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSave = () => {
    // 플랫폼별 필수 필드 검증
    const isGoogleAds = formData.platform === 'Google Ads';
    const isNaverAds = formData.platform === 'Naver Ads';
    const hasRequiredFields = formData.advertiser && formData.platform &&
      (isGoogleAds
        ? formData.customerId && formData.managerAccountId && formData.developerToken &&
          formData.targetConversionActionId.length > 0 && formData.refreshToken &&
          formData.clientId && formData.clientSecret
        : isNaverAds
        ? formData.accountId && formData.apiToken && formData.secretKey
        : formData.accountId && formData.apiToken);

    if (!hasRequiredFields) {
      toast({
        title: '입력 오류',
        description: '필수 필드를 모두 입력해주세요.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (editMode && selectedToken) {
      // Mock 수정 (향후 Supabase API 호출로 교체)
      setAllData(prevData =>
        prevData.map(item =>
          item.id === selectedToken.id
            ? {
                ...item,
                ...formData,
                lastUpdated: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
              }
            : item
        )
      );
      toast({
        title: 'API 토큰 수정 완료',
        description: 'API 토큰이 수정되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      // Mock 추가 (향후 Supabase API 호출로 교체)
      const newToken = {
        id: allData.length + 1,
        advertiserId: advertiserId, // 현재 로그인한 사용자의 브랜드 ID
        ...formData,
        lastUpdated: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      };
      setAllData(prevData => [...prevData, newToken]);
      toast({
        title: 'API 토큰 추가 완료',
        description: '새로운 API 토큰이 추가되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }

    onClose();
  };

  const columns = [
    columnHelper.accessor('advertiser', {
      id: 'advertiser',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          광고주
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('platform', {
      id: 'platform',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          플랫폼
        </Text>
      ),
      cell: (info) => (
        <Badge
          colorScheme={
            info.getValue() === 'Google Ads' ? 'red' :
            info.getValue() === 'Meta Ads' ? 'purple' :
            info.getValue() === 'Naver Ads' ? 'green' : 'gray'
          }
          fontSize="sm"
          px="10px"
          py="3px"
          borderRadius="7px"
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('accountId', {
      id: 'accountId',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          계정 정보
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        // Google Ads: customerId 표시
        if (row.platform === 'Google Ads') {
          return (
            <Text color={textColor} fontSize="sm" fontWeight="500">
              {row.customerId || '-'}
            </Text>
          );
        }
        // 기타 플랫폼: accountId 표시
        return (
          <Text color={textColor} fontSize="sm" fontWeight="500">
            {info.getValue() || '-'}
          </Text>
        );
      },
    }),
    columnHelper.accessor('apiToken', {
      id: 'apiToken',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          토큰 정보
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        // Google Ads: developerToken 표시
        if (row.platform === 'Google Ads') {
          return (
            <Text color="gray.400" fontSize="sm" fontWeight="500" fontFamily="monospace">
              {row.developerToken ? row.developerToken.substring(0, 20) + '***' : '-'}
            </Text>
          );
        }
        // 기타 플랫폼: apiToken 표시
        return (
          <Text color="gray.400" fontSize="sm" fontWeight="500" fontFamily="monospace">
            {info.getValue() || '-'}
          </Text>
        );
      },
    }),
    columnHelper.accessor('lastUpdated', {
      id: 'lastUpdated',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          마지막 수정
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="500">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('dataCollectionStatus', {
      id: 'dataCollectionStatus',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          수집 상태
        </Text>
      ),
      cell: (info) => (
        <Flex align="center">
          <Icon
            w="24px"
            h="24px"
            me="5px"
            color={
              info.getValue() === 'success'
                ? 'green.500'
                : info.getValue() === 'error'
                ? 'red.500'
                : info.getValue() === 'pending'
                ? 'orange.500'
                : null
            }
            as={
              info.getValue() === 'success'
                ? MdCheckCircle
                : info.getValue() === 'error'
                ? MdOutlineError
                : info.getValue() === 'pending'
                ? MdSchedule
                : null
            }
          />
          <Text color={textColor} fontSize="sm" fontWeight="700">
            {info.getValue() === 'success'
              ? '정상'
              : info.getValue() === 'error'
              ? '오류'
              : '대기'}
          </Text>
        </Flex>
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
          활성 상태
        </Text>
      ),
      cell: (info) => (
        <Badge
          colorScheme={info.getValue() === 'active' ? 'green' : 'red'}
          fontSize="sm"
          px="10px"
          py="3px"
          borderRadius="7px"
        >
          {info.getValue() === 'active' ? '활성' : '비활성'}
        </Badge>
      ),
    }),
    columnHelper.accessor('actions', {
      id: 'actions',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          관리
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Flex gap="8px">
            <IconButton
              icon={<Icon as={MdEdit} />}
              size="sm"
              colorScheme="blue"
              variant="ghost"
              onClick={() => handleEdit(row)}
              aria-label="수정"
            />
            <IconButton
              icon={<Icon as={MdDelete} />}
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={() => handleDelete(row.id)}
              aria-label="삭제"
            />
          </Flex>
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
    <>
      <Card flexDirection="column" w="100%" px="0px" overflowX={{ sm: 'scroll', lg: 'hidden' }} {...rest}>
        <Flex px="25px" mb="8px" justifyContent="space-between" align="center">
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
            API 토큰 관리
          </Text>
          <HStack spacing={2}>
            <Button
              leftIcon={<Icon as={MdSync} />}
              colorScheme="blue"
              variant="solid"
              size="sm"
              onClick={handleSyncData}
            >
              데이터 연동
            </Button>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="brand"
              variant="solid"
              size="sm"
              onClick={handleAdd}
            >
              토큰 추가
            </Button>
          </HStack>
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
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editMode ? 'API 토큰 수정' : 'API 토큰 추가'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl mb={4} isRequired>
              <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                브랜드명 선택 *
              </FormLabel>
              <Menu>
                {({ isOpen: isMenuOpen, onClose: onMenuClose }) => (
                  <>
                    <MenuButton
                      as={Button}
                      rightIcon={<Icon as={MdKeyboardArrowDown} />}
                      bg={inputBg}
                      border='1px solid'
                      borderColor={borderColor}
                      color={textColor}
                      fontWeight='500'
                      fontSize='sm'
                      _hover={{ bg: bgHover }}
                      _active={{ bg: bgHover }}
                      px='16px'
                      h='44px'
                      borderRadius='12px'
                      textAlign='left'>
                      {formData.advertiser || '브랜드를 선택하세요'}
                    </MenuButton>
                    <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                      {availableAdvertisers && availableAdvertisers.map((adv) => (
                        <MenuItem
                          key={adv.id}
                          onClick={() => setFormData({ ...formData, advertiser: adv.name })}
                          bg={formData.advertiser === adv.name ? brandColor : 'transparent'}
                          color={formData.advertiser === adv.name ? 'white' : textColor}
                          _hover={{
                            bg: formData.advertiser === adv.name ? brandColor : bgHover,
                          }}
                          fontWeight={formData.advertiser === adv.name ? '600' : '500'}
                          fontSize='sm'
                          px='12px'
                          py='8px'
                          borderRadius='8px'
                          justifyContent='center'
                          textAlign='center'
                          minH='auto'>
                          {adv.name}
                        </MenuItem>
                      ))}
                      {/* 직접 입력 구분선 */}
                      <Box borderTop='1px solid' borderColor={borderColor} my='8px' />
                      {/* 직접 입력 필드 */}
                      <Box px='4px' py='4px'>
                        <Input
                          placeholder="브랜드명 직접 입력"
                          value={formData.advertiser && !availableAdvertisers?.find(a => a.name === formData.advertiser) ? formData.advertiser : ''}
                          onChange={(e) => setFormData({ ...formData, advertiser: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          bg={inputBg}
                          fontSize="sm"
                          size="sm"
                          borderRadius='8px'
                        />
                      </Box>
                    </MenuList>
                  </>
                )}
              </Menu>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                계정 설명 (선택)
              </FormLabel>
              <Input
                placeholder="예: 메인 계정, 리타게팅 전용, 신상품 캠페인용"
                value={formData.accountDescription}
                onChange={(e) => setFormData({ ...formData, accountDescription: e.target.value })}
                
                fontSize="sm"
              />
              <Text fontSize="xs" color="secondaryGray.600" mt={2}>
                같은 광고주의 여러 계정을 구분하기 위한 메모입니다.
              </Text>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                플랫폼
              </FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<Icon as={MdKeyboardArrowDown} />}
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  fontWeight='500'
                  fontSize='sm'
                  _hover={{ bg: bgHover }}
                  _active={{ bg: bgHover }}
                  px='16px'
                  h='44px'
                  borderRadius='12px'
                  textAlign='left'>
                  {formData.platform || '플랫폼 선택'}
                </MenuButton>
                <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                  {['Google Ads', 'Meta Ads', 'Naver Ads', 'Kakao Ads'].map((platform) => (
                    <MenuItem
                      key={platform}
                      onClick={() => setFormData({ ...formData, platform })}
                      bg={formData.platform === platform ? brandColor : 'transparent'}
                      color={formData.platform === platform ? 'white' : textColor}
                      _hover={{
                        bg: formData.platform === platform ? brandColor : bgHover,
                      }}
                      fontWeight={formData.platform === platform ? '600' : '500'}
                      fontSize='sm'
                      px='12px'
                      py='8px'
                      borderRadius='8px'
                      justifyContent='center'
                      textAlign='center'
                      minH='auto'>
                      {platform}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </FormControl>

            {/* Google Ads 전용 필드 */}
            {formData.platform === 'Google Ads' ? (
              <>
                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    광고 계정 ID *
                  </FormLabel>
                  <Input
                    placeholder="Customer ID (예: 1234567890)"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    MCC ID *
                  </FormLabel>
                  <Input
                    placeholder="Manager Account ID"
                    value={formData.managerAccountId}
                    onChange={(e) => setFormData({ ...formData, managerAccountId: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    MCC 개발자 토큰 *
                  </FormLabel>
                  <Input
                    type="password"
                    placeholder="Developer Token"
                    value={formData.developerToken}
                    onChange={(e) => setFormData({ ...formData, developerToken: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    구글애즈 전환 액션 ID *
                  </FormLabel>
                  <VStack align="stretch" spacing={2}>
                    {formData.targetConversionActionId.length > 0 && (
                      <Flex flexWrap="wrap" gap={2} mb={2}>
                        {formData.targetConversionActionId.map((actionId) => {
                          const action = mockConversionActions.find(a => a.id === actionId);
                          return (
                            <Tag
                              key={actionId}
                              size="md"
                              borderRadius="full"
                              variant="solid"
                              colorScheme="brand"
                            >
                              <TagLabel>{action ? action.name : actionId}</TagLabel>
                              <TagCloseButton onClick={() => handleRemoveConversionAction(actionId)} />
                            </Tag>
                          );
                        })}
                      </Flex>
                    )}
                    <HStack>
                      <Button
                        size="sm"
                        leftIcon={<Icon as={MdSearch} />}
                        colorScheme="blue"
                        variant="outline"
                        onClick={handleOpenConversionModal}
                      >
                        전환 액션 조회
                      </Button>
                    </HStack>
                  </VStack>
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    리프레쉬 토큰 *
                  </FormLabel>
                  <VStack align="stretch" spacing={2}>
                    <Input
                      type="password"
                      placeholder="Refresh Token"
                      value={formData.refreshToken}
                      onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                      
                      fontSize="sm"
                    />
                    <HStack>
                      <Button
                        size="sm"
                        leftIcon={<Icon as={MdLink} />}
                        colorScheme="green"
                        variant="outline"
                        onClick={handleGoogleOAuthConnect}
                      >
                        Google 계정 연결
                      </Button>
                      {formData.refreshToken && (
                        <Text fontSize="xs" color="green.500" fontWeight="500">
                          ✓ 토큰 입력됨
                        </Text>
                      )}
                    </HStack>
                  </VStack>
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    GCP Client ID *
                  </FormLabel>
                  <Input
                    placeholder="Client ID"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    GCP Client Secret *
                  </FormLabel>
                  <Input
                    type="password"
                    placeholder="Client Secret"
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>
              </>
            ) : formData.platform === 'Naver Ads' ? (
              <>
                {/* Naver Ads 전용 필드 */}
                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    네이버 커스터머 ID *
                  </FormLabel>
                  <Input
                    placeholder="네이버 커스터머 ID 입력"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    API 토큰 *
                  </FormLabel>
                  <Input
                    type="password"
                    placeholder="API 토큰 입력"
                    value={formData.apiToken}
                    onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    Secret Key *
                  </FormLabel>
                  <Input
                    type="password"
                    placeholder="Secret Key 입력"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>
              </>
            ) : (
              <>
                {/* 기타 플랫폼 필드 */}
                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    계정 ID *
                  </FormLabel>
                  <Input
                    placeholder="광고 계정 ID"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    API 토큰 *
                  </FormLabel>
                  <Input
                    type="password"
                    placeholder="API 토큰 입력"
                    value={formData.apiToken}
                    onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                    
                    fontSize="sm"
                  />
                </FormControl>
              </>
            )}

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                상태
              </FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<Icon as={MdKeyboardArrowDown} />}
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  fontWeight='500'
                  fontSize='sm'
                  _hover={{ bg: bgHover }}
                  _active={{ bg: bgHover }}
                  px='16px'
                  h='44px'
                  borderRadius='12px'
                  textAlign='left'>
                  {formData.status === 'active' ? '활성' : formData.status === 'inactive' ? '비활성' : '상태 선택'}
                </MenuButton>
                <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                  {[{value: 'active', label: '활성'}, {value: 'inactive', label: '비활성'}].map((status) => (
                    <MenuItem
                      key={status.value}
                      onClick={() => setFormData({ ...formData, status: status.value })}
                      bg={formData.status === status.value ? brandColor : 'transparent'}
                      color={formData.status === status.value ? 'white' : textColor}
                      _hover={{
                        bg: formData.status === status.value ? brandColor : bgHover,
                      }}
                      fontWeight={formData.status === status.value ? '600' : '500'}
                      fontSize='sm'
                      px='12px'
                      py='8px'
                      borderRadius='8px'
                      justifyContent='center'
                      textAlign='center'
                      minH='auto'>
                      {status.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="brand" mr={3} onClick={handleSave}>
              저장
            </Button>
            <Button onClick={onClose}>취소</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Conversion Action Lookup Modal */}
      <Modal isOpen={isConversionModalOpen} onClose={onConversionModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>전환 액션 조회</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              추적할 전환 액션을 선택하세요. 여러 개 선택 가능합니다.
            </Text>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th w="40px"></Th>
                  <Th>이름</Th>
                  <Th>ID</Th>
                  <Th>유형</Th>
                  <Th>카테고리</Th>
                </Tr>
              </Thead>
              <Tbody>
                {mockConversionActions.map((action) => (
                  <Tr
                    key={action.id}
                    _hover={{ bg: useColorModeValue('gray.50', 'whiteAlpha.50') }}
                    cursor="pointer"
                    onClick={() => handleToggleConversionAction(action.id)}
                  >
                    <Td>
                      <Checkbox
                        isChecked={selectedConversionActions.includes(action.id)}
                        onChange={() => handleToggleConversionAction(action.id)}
                      />
                    </Td>
                    <Td fontWeight="500">{action.name}</Td>
                    <Td fontSize="xs" color="gray.500">{action.id}</Td>
                    <Td>
                      <Badge colorScheme="purple" fontSize="xs">
                        {action.type}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme="green" fontSize="xs">
                        {action.category}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="brand" mr={3} onClick={handleConfirmConversionActions}>
              선택 완료 ({selectedConversionActions.length})
            </Button>
            <Button onClick={onConversionModalClose}>취소</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 데이터 연동 설정 모달 */}
      <Modal isOpen={isSyncModalOpen} onClose={onSyncModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md" fontWeight="600">데이터 연동</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                  매체 선택 *
                </FormLabel>
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<Icon as={MdKeyboardArrowDown} />}
                    bg={inputBg}
                    border='1px solid'
                    borderColor={borderColor}
                    color={textColor}
                    fontWeight='500'
                    fontSize='sm'
                    _hover={{ bg: bgHover }}
                    _active={{ bg: bgHover }}
                    px='16px'
                    h='44px'
                    borderRadius='12px'
                    w='100%'
                    textAlign='left'>
                    {syncConfig.selectedPlatform ?
                      data.find(token => token.platform === syncConfig.selectedPlatform) ?
                        `${data.find(token => token.platform === syncConfig.selectedPlatform).advertiser} - ${syncConfig.selectedPlatform}`
                        : syncConfig.selectedPlatform
                      : '연동할 매체를 선택하세요'}
                  </MenuButton>
                  <MenuList minW='auto' w='fit-content' px='8px' py='8px' maxH='300px' overflowY='auto'>
                    {data.filter(token => token.status === 'active').map((token) => (
                      <MenuItem
                        key={token.id}
                        onClick={() => setSyncConfig({ ...syncConfig, selectedPlatform: token.platform })}
                        bg={syncConfig.selectedPlatform === token.platform ? brandColor : 'transparent'}
                        color={syncConfig.selectedPlatform === token.platform ? 'white' : textColor}
                        _hover={{
                          bg: syncConfig.selectedPlatform === token.platform ? brandColor : bgHover,
                        }}
                        fontWeight={syncConfig.selectedPlatform === token.platform ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='8px'
                        borderRadius='8px'
                        justifyContent='center'
                        textAlign='center'
                        minH='auto'>
                        {token.advertiser} - {token.platform}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                  기간 선택 *
                </FormLabel>
                <RadioGroup
                  value={syncConfig.dateRange}
                  onChange={(value) => setSyncConfig({ ...syncConfig, dateRange: value })}
                >
                  <Stack spacing={2}>
                    <Radio value="yesterday" colorScheme="brand" size="sm">
                      <Text fontSize="sm" fontWeight="400">어제</Text>
                    </Radio>
                    <Radio value="lastWeek" colorScheme="brand" size="sm">
                      <Text fontSize="sm" fontWeight="400">지난주 (최근 7일)</Text>
                    </Radio>
                    <Radio value="lastMonth" colorScheme="brand" size="sm">
                      <Text fontSize="sm" fontWeight="400">지난달 (최근 30일)</Text>
                    </Radio>
                    <Radio value="all" colorScheme="brand" size="sm">
                      <Text fontSize="sm" fontWeight="400">전체 데이터</Text>
                    </Radio>
                    <Radio value="custom" colorScheme="brand" size="sm">
                      <Text fontSize="sm" fontWeight="400">사용자 지정</Text>
                    </Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {syncConfig.dateRange === 'custom' && (
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                      시작일
                    </FormLabel>
                    <Input
                      type="date"
                      value={syncConfig.startDate}
                      onChange={(e) => setSyncConfig({ ...syncConfig, startDate: e.target.value })}
                      fontSize="sm"
                      h="44px"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                      종료일
                    </FormLabel>
                    <Input
                      type="date"
                      value={syncConfig.endDate}
                      onChange={(e) => setSyncConfig({ ...syncConfig, endDate: e.target.value })}
                      fontSize="sm"
                      h="44px"
                    />
                  </FormControl>
                </HStack>
              )}

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                  데이터 처리 방식 *
                </FormLabel>
                <RadioGroup
                  value={syncConfig.updateMode}
                  onChange={(value) => setSyncConfig({ ...syncConfig, updateMode: value })}
                >
                  <Stack spacing={2}>
                    <Radio value="skipExisting" colorScheme="brand" size="sm">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="500">기존 데이터 건너뛰기</Text>
                        <Text fontSize="xs" fontWeight="400" color="secondaryGray.600">
                          DB에 이미 있는 날짜는 건너뛰고 새로운 데이터만 추가합니다
                        </Text>
                      </VStack>
                    </Radio>
                    <Radio value="updateAll" colorScheme="brand" size="sm">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="500">전체 업데이트</Text>
                        <Text fontSize="xs" fontWeight="400" color="secondaryGray.600">
                          기존 데이터를 최신 데이터로 덮어씁니다 (시간이 더 소요됩니다)
                        </Text>
                      </VStack>
                    </Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleConfirmSync}
              isDisabled={!syncConfig.selectedPlatform}
              fontSize="sm"
              fontWeight="500"
              size="sm"
            >
              다음
            </Button>
            <Button
              onClick={onSyncModalClose}
              fontSize="sm"
              fontWeight="500"
              size="sm"
            >
              취소
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 데이터 연동 경고 모달 */}
      <Modal isOpen={isSyncWarningOpen} onClose={onSyncWarningClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md" fontWeight="600">
            <HStack spacing={2}>
              <Icon as={MdOutlineError} w="18px" h="18px" color="orange.500" />
              <Text fontSize="md">주의사항</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Alert
              status="warning"
              variant="left-accent"
              borderRadius="12px"
              mb={4}
              py={3}
            >
              <AlertIcon boxSize="16px" />
              <Box>
                <AlertTitle fontSize="xs" fontWeight="600" mb={0.5}>데이터 연동에 많은 시간이 소요됩니다</AlertTitle>
                <AlertDescription fontSize="xs" fontWeight="400">
                  과부하 방지를 위해 꼭 필요한 상황에만 연동해야 합니다.
                </AlertDescription>
              </Box>
            </Alert>

            <VStack align="start" spacing={1.5} p={3} bg={useColorModeValue('gray.50', 'whiteAlpha.50')} borderRadius="12px">
              <Text fontSize="xs" fontWeight="600" mb={0.5}>연동 설정 확인:</Text>
              <Text fontSize="xs" fontWeight="400">• 매체: {syncConfig.selectedPlatform}</Text>
              <Text fontSize="xs" fontWeight="400">
                • 기간: {
                  syncConfig.dateRange === 'yesterday' ? '어제' :
                  syncConfig.dateRange === 'lastWeek' ? '지난주 (7일)' :
                  syncConfig.dateRange === 'lastMonth' ? '지난달 (30일)' :
                  syncConfig.dateRange === 'all' ? '전체 데이터' :
                  `${syncConfig.startDate} ~ ${syncConfig.endDate}`
                }
              </Text>
              <Text fontSize="xs" fontWeight="400">
                • 처리: {syncConfig.updateMode === 'skipExisting' ? '기존 건너뛰기' : '전체 업데이트'}
              </Text>
            </VStack>

            <Text fontSize="xs" fontWeight="500" color="gray.600" mt={3}>
              정말 데이터 연동을 진행하시겠습니까?
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleExecuteSync}
              fontSize="sm"
              fontWeight="500"
              size="sm"
            >
              계속 하기
            </Button>
            <Button
              onClick={onSyncWarningClose}
              fontSize="sm"
              fontWeight="500"
              size="sm"
            >
              취소
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
