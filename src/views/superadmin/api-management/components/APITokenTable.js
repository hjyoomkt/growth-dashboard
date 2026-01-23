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
  Divider,
  Spinner,
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
import { supabase, createApiToken, updateApiToken } from 'services/supabaseService';
import PlatformLoginFlow from './PlatformLoginFlow';

const columnHelper = createColumnHelper();

export default function APITokenTable(props) {
  const { ...rest } = props;
  const { isAgency, advertiserId, availableAdvertisers, organizationId } = useAuth();
  const [sorting, setSorting] = React.useState([]);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');
  const vStackBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isConversionModalOpen, onOpen: onConversionModalOpen, onClose: onConversionModalClose } = useDisclosure();
  const { isOpen: isSyncModalOpen, onOpen: onSyncModalOpen, onClose: onSyncModalClose } = useDisclosure();
  const { isOpen: isSyncWarningOpen, onOpen: onSyncWarningOpen, onClose: onSyncWarningClose } = useDisclosure();
  const { isOpen: isInitialCollectionModalOpen, onOpen: onInitialCollectionModalOpen, onClose: onInitialCollectionModalClose } = useDisclosure();
  const { isOpen: isPlatformLoginOpen, onOpen: onPlatformLoginOpen, onClose: onPlatformLoginClose } = useDisclosure();
  const [editMode, setEditMode] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState(null);
  const [savedIntegrationId, setSavedIntegrationId] = React.useState(null);
  const [isCollectionStarting, setIsCollectionStarting] = React.useState(false);

  // 매체 로그인 플로우 상태
  const [platformLoginData, setPlatformLoginData] = React.useState(null);

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
    advertiserId: '', // UUID 추가
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
    // 초기 데이터 수집 설정
    initialCollectionEnabled: true, // 초기 수집 활성화 여부
    initialCollectionRange: '', // 기본값 없음: 사용자가 반드시 선택해야 함
    customStartDate: '',
    customEndDate: '',
  });

  // 전환 액션 관리
  const [conversionActions, setConversionActions] = React.useState([]);
  const [isLoadingConversions, setIsLoadingConversions] = React.useState(false);
  const [selectedConversionActions, setSelectedConversionActions] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // GCP 소스 설정 (organization: 대행사 GCP 사용, custom: 직접 입력)
  const [gcpSource, setGcpSource] = React.useState('organization');
  const [organizationGcp, setOrganizationGcp] = React.useState({
    clientId: '',
    clientSecret: '',
    developerToken: '',
    mccId: '',
  });
  const [isLoadingOrgGcp, setIsLoadingOrgGcp] = React.useState(false);

  const [allData, setAllData] = React.useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = React.useState(false);

  // 조직 Google Ads 토큰 목록 관리
  const [organizationTokens, setOrganizationTokens] = React.useState([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = React.useState(null);
  const { isOpen: isTokenSelectModalOpen, onOpen: onTokenSelectModalOpen, onClose: onTokenSelectModalClose } = useDisclosure();

  // Google Customer 목록 관리
  const [googleCustomers, setGoogleCustomers] = React.useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(false);

  // 권한에 따라 데이터 필터링
  const data = React.useMemo(() => {
    // 대행사는 모든 데이터 접근
    if (isAgency()) {
      return allData;
    }
    // 클라이언트는 자신의 브랜드 데이터만 접근
    return allData.filter(item => item.advertiser_id === advertiserId);
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
      advertiserId: '',
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
    setGcpSource(token.gcp_source || 'organization');
    setFormData({
      advertiser: token.advertiser_name || '',
      accountDescription: token.account_description || '',
      platform: token.platform || '',
      customerId: token.customer_id || '',
      managerAccountId: token.manager_account_id || '',
      developerToken: token.developer_token_vault_id || '',
      targetConversionActionId: token.target_conversion_action_ids || [],
      refreshToken: token.refresh_token_vault_id || '',
      clientId: token.client_id_vault_id || '',
      clientSecret: token.client_secret_vault_id || '',
      secretKey: token.secret_key_vault_id || '',
      accountId: token.account_id || '',
      apiToken: token.api_token_vault_id || '',
      status: token.status || 'active',
    });
    onOpen();
  };

  // 조직 GCP 설정 조회 (부분 마스킹된 미리보기)
  const fetchOrganizationGcp = React.useCallback(async () => {
    if (!organizationId) return;

    setIsLoadingOrgGcp(true);
    try {
      // 전체 값 조회 (OAuth 및 API 호출용)
      const { data, error } = await supabase
        .rpc('get_organization_gcp_credentials', { org_id: organizationId });

      if (error) {
        console.error('[Organization GCP] 조회 실패:', error);
        return;
      }

      // data가 배열이면 첫 요소, 객체면 그대로 사용
      const credentials = Array.isArray(data) ? data[0] : data;

      if (credentials && credentials.client_id && credentials.client_secret) {
        // 전체 값 설정 (OAuth 및 전환액션 조회에 사용)
        setOrganizationGcp({
          clientId: credentials.client_id,
          clientSecret: credentials.client_secret,
          developerToken: credentials.developer_token || '',
          mccId: credentials.mcc_id || '',
        });
      }
    } catch (error) {
      console.error('[Organization GCP] 조회 에러:', error);
    } finally {
      setIsLoadingOrgGcp(false);
    }
  }, [organizationId]);

  // API 토큰 목록 조회
  const fetchTokens = React.useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select(`
          *,
          advertisers!advertiser_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // advertisers 관계 데이터를 advertiser_name으로 매핑
      const mappedData = (data || []).map(item => ({
        ...item,
        advertiser_name: item.advertisers?.name || '알 수 없음',
      }));

      console.log('[DEBUG] Integrations 데이터:', mappedData);
      console.log('[DEBUG] 첫 번째 항목 상세:', mappedData[0]);

      setAllData(mappedData);
    } catch (error) {
      console.error('[API Tokens] 조회 실패:', error);
      toast({
        title: '토큰 목록 조회 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingTokens(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (organizationId) {
      fetchOrganizationGcp();
    }
    fetchTokens();
  }, [organizationId, fetchOrganizationGcp, fetchTokens]);

  // GCP 소스 변경 시 MCC ID 자동 입력
  React.useEffect(() => {
    if (gcpSource === 'organization' && organizationGcp.mccId && !editMode) {
      setFormData(prev => ({
        ...prev,
        managerAccountId: organizationGcp.mccId,
      }));
    }
  }, [gcpSource, organizationGcp.mccId, editMode]);

  // 전환 액션 조회 모달 열기
  const handleOpenConversionModal = async () => {
    console.log('[Conversion Action] 조회 시작');
    console.log('[Conversion Action] formData:', {
      customerId: formData.customerId || '비어있음',
      developerToken: formData.developerToken || '비어있음',
      refreshToken: formData.refreshToken || '비어있음',
      clientId: formData.clientId || '비어있음',
      clientSecret: formData.clientSecret || '비어있음',
      gcpSource,
    });

    // GCP 정보 결정
    let clientId = formData.clientId;
    let clientSecret = formData.clientSecret;
    let developerToken = formData.developerToken;

    if (gcpSource === 'organization') {
      clientId = organizationGcp.clientId;
      clientSecret = organizationGcp.clientSecret;
      developerToken = organizationGcp.developerToken || formData.developerToken;
    }

    console.log('[Conversion Action] 사용할 GCP:', {
      gcpSource,
      clientId: clientId || '비어있음',
      clientSecret: clientSecret ? '있음' : '비어있음',
      developerToken: developerToken || '비어있음',
    });

    // 필수 필드 확인
    if (!formData.customerId || !developerToken || !formData.refreshToken || !clientId || !clientSecret) {
      toast({
        title: '필수 정보 누락',
        description: '전환 액션 조회를 위해 Customer ID, Developer Token, Refresh Token, Client ID, Client Secret을 먼저 입력해주세요.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      // Edge Function 호출하여 실제 전환 액션 조회
      setIsLoadingConversions(true);
      setConversionActions([]);
      setSelectedConversionActions([]);
      setCurrentPage(1);
      onConversionModalOpen();

      console.log('[Conversion Action] Edge Function 호출 시작');

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-conversion-actions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            customer_id: formData.customerId,
            developer_token: developerToken,
            manager_account_id: formData.managerAccountId || organizationGcp.mccId,
            refresh_token: formData.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || '전환 액션 조회 실패');
      }

      console.log('[Conversion Action] 조회 성공:', data);
      setConversionActions(data.conversionActions || []);

      toast({
        title: '조회 완료',
        description: `${data.count || 0}개의 전환 액션을 불러왔습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('[Conversion Action] 조회 실패:', error);
      toast({
        title: '전환 액션 조회 실패',
        description: error.message || '전환 액션을 불러오는 데 실패했습니다.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoadingConversions(false);
    }
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
  const handleConfirmConversionActions = async () => {
    console.log('[전환 액션 선택] 시작', {
      selectedIntegrationId,
      platformLoginData: !!platformLoginData,
      selectedConversionActions,
      editMode
    });

    // OAuth 플로우에서 온 경우: selectedIntegrationId 있고 editMode가 아니면 업데이트만
    if (selectedIntegrationId && !editMode && formData.platform === 'Google Ads') {
      console.log('[전환 액션 선택] OAuth 플로우 경로 - 업데이트만 실행');
      await handleSaveConversionActionsOnly();
      return;
    }

    // 기존 플로우: formData 업데이트만
    console.log('[전환 액션 선택] 기존 플로우 - formData 업데이트만');
    setFormData(prev => ({
      ...prev,
      targetConversionActionId: selectedConversionActions,
    }));
    onConversionModalClose();
  };

  // 전환 액션만 업데이트 (PlatformLoginFlow용)
  const handleSaveConversionActionsOnly = async () => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          legacy_customer_id: formData.customerId,
          legacy_target_conversion_action_id: selectedConversionActions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedIntegrationId);

      if (error) throw error;

      toast({
        title: 'API 토큰 추가 완료',
        description: '초기 데이터 수집을 설정합니다.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      // 전환 액션 모달 닫기
      onConversionModalClose();

      // 토큰 목록 새로고침
      fetchTokens();

      // savedIntegrationId 설정 (초기 수집 모달에서 사용)
      setSavedIntegrationId(selectedIntegrationId);

      // 메인 모달 닫고 초기 수집 모달 열기
      onClose();
      onInitialCollectionModalOpen();

      // platformLoginData 초기화
      setPlatformLoginData(null);
      setSelectedIntegrationId(null);
    } catch (error) {
      console.error('[전환 액션 저장] 실패:', error);
      toast({
        title: '저장 실패',
        description: error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // 개별 전환 액션 제거
  const handleRemoveConversionAction = (actionId) => {
    setFormData(prev => ({
      ...prev,
      targetConversionActionId: prev.targetConversionActionId.filter(id => id !== actionId),
    }));
  };

  // 조직의 기존 Google Ads 토큰 목록 조회
  const fetchOrganizationTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[토큰 조회] 사용자 없음');
        return [];
      }

      console.log('[토큰 조회] 사용자 이메일:', user.email);

      const { data, error } = await supabase.rpc('get_organization_google_tokens', {
        p_user_email: user.email,
      });

      if (error) {
        console.error('[토큰 조회] RPC 오류:', error);
        throw error;
      }

      console.log('[토큰 조회] 결과:', data);
      setOrganizationTokens(data || []);
      return data || [];
    } catch (error) {
      console.error('[토큰 조회] 실패:', error);
      return [];
    }
  };

  // Google OAuth 연결 (토큰 선택 또는 신규 발급)
  const handleGoogleOAuthConnect = async () => {
    // 브랜드 선택 확인
    if (!formData.advertiserId) {
      toast({
        title: '브랜드를 먼저 선택해주세요',
        description: 'Google 계정 연결 전에 브랜드를 선택해야 합니다.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    // 조직의 기존 토큰 목록 조회
    const tokens = await fetchOrganizationTokens();

    console.log('[OAuth Connect] 조회된 토큰 개수:', tokens?.length || 0);

    if (tokens && tokens.length > 0) {
      // 기존 토큰 있음 → 선택 모달 표시
      console.log('[OAuth Connect] 토큰 선택 모달 표시');
      onTokenSelectModalOpen();
    } else {
      // 기존 토큰 없음 → 바로 OAuth 인증
      console.log('[OAuth Connect] 새 OAuth 진행');
      proceedWithNewOAuth();
    }
  };

  // 새 토큰 발급 진행
  const proceedWithNewOAuth = async () => {
    // GCP 설정 확인
    let clientId, clientSecret;
    if (gcpSource === 'organization') {
      clientId = organizationGcp.clientId;
      clientSecret = organizationGcp.clientSecret;
    } else {
      clientId = formData.clientId;
      clientSecret = formData.clientSecret;
    }

    if (!clientId || !clientSecret) {
      toast({
        title: 'GCP 설정 필요',
        description: 'Client ID와 Client Secret을 먼저 입력해주세요.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast({
          title: '인증 오류',
          description: '세션이 만료되었습니다. 다시 로그인해주세요.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/oauth-initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          advertiser_id: formData.advertiserId,
          platform: 'Google Ads',
          use_organization_gcp: gcpSource === 'organization',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OAuth 초기화 실패');
      }

      const { authorization_url } = await response.json();

      const popup = window.open(
        authorization_url,
        'GoogleOAuth',
        'width=600,height=700,left=200,top=100'
      );

      if (!popup) {
        toast({
          title: '팝업 차단',
          description: '팝업 차단을 해제하고 다시 시도해주세요.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const handleMessage = (event) => {
        // ===== 디버깅 로그 추가 =====
        console.log('[APITokenTable] postMessage received');
        console.log('[APITokenTable] Event origin:', event.origin);
        console.log('[APITokenTable] Window origin:', window.location.origin);
        console.log('[APITokenTable] Event data:', event.data);
        // ===== 끝 =====

        if (event.origin !== window.location.origin) {
          console.warn('[APITokenTable] Rejected message from unauthorized origin:', event.origin);
          return;
        }

        if (event.data && event.data.error) {
          console.error('[APITokenTable] Error in OAuth:', event.data.message);
          toast({
            title: 'Google 계정 연결 실패',
            description: event.data.message || '알 수 없는 오류가 발생했습니다.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          window.removeEventListener('message', handleMessage);
          return;
        }

        if (event.data && event.data.refreshToken) {
          console.log('[APITokenTable] ✅ Refresh token received!');
          console.log('[APITokenTable] Token length:', event.data.refreshToken.length);
          console.log('[APITokenTable] Integration ID:', event.data.integrationId);

          setFormData(prev => ({
            ...prev,
            refreshToken: event.data.refreshToken,
          }));

          console.log('[APITokenTable] ✅ Form data updated with refresh token');

          // Integration ID 저장 (Customer 조회용)
          if (event.data.integrationId) {
            setSelectedIntegrationId(event.data.integrationId);
          }

          toast({
            title: 'Google 계정 연결 완료',
            description: 'Refresh Token이 자동으로 입력되었습니다. 이제 Google 브랜드 목록을 조회할 수 있습니다.',
            status: 'success',
            duration: 4000,
            isClosable: true,
          });

          window.removeEventListener('message', handleMessage);
        } else {
          console.error('[APITokenTable] ❌ postMessage received but no refreshToken in data');
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('OAuth 연결 오류:', error);
      toast({
        title: 'OAuth 연결 실패',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 기존 토큰 선택
  const handleSelectToken = async (integrationId) => {
    try {
      setSelectedIntegrationId(integrationId);

      // ===== 디버깅 로그 추가 =====
      console.log('[토큰 복호화] 요청 파라미터:', {
        p_api_token_id: integrationId,
        p_token_type: 'refresh_token'
      });
      // ===== 끝 =====

      // Refresh Token 복호화 및 자동입력
      const { data: decryptedToken, error } = await supabase.rpc('get_decrypted_token', {
        p_api_token_id: integrationId,
        p_token_type: 'oauth_refresh_token',
      });

      // ===== 디버깅 로그 추가 =====
      console.log('[토큰 복호화] 응답:', {
        data: decryptedToken,
        dataType: typeof decryptedToken,
        dataLength: decryptedToken?.length || 0,
        error: error
      });
      // ===== 끝 =====

      if (error) {
        console.error('[토큰 복호화] 오류:', error);
        throw new Error('토큰 복호화 실패');
      }

      if (decryptedToken) {
        console.log('[토큰 복호화] Refresh Token 자동입력 완료');
        setFormData(prev => ({
          ...prev,
          refreshToken: decryptedToken,
        }));
      } else {
        console.warn('[토큰 복호화] Refresh Token이 NULL입니다');
      }

      onTokenSelectModalClose();

      toast({
        title: '토큰 선택 완료',
        description: 'Refresh Token이 자동으로 입력되었습니다. 이제 Google 브랜드 목록을 조회할 수 있습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('[토큰 선택] 실패:', error);
      toast({
        title: '토큰 선택 실패',
        description: error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // Google Customer 목록 조회
  const handleFetchGoogleCustomers = async () => {
    if (!selectedIntegrationId) {
      toast({
        title: '토큰을 먼저 선택해주세요',
        description: 'Google 계정 연결 후 토큰을 선택해야 브랜드 목록을 조회할 수 있습니다.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsLoadingCustomers(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/list-google-customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          integration_id: selectedIntegrationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Customer 목록 조회 실패');
      }

      const { customers } = await response.json();

      setGoogleCustomers(customers || []);

      toast({
        title: 'Google 브랜드 목록 조회 완료',
        description: `${customers?.length || 0}개의 브랜드를 찾았습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Customer 목록 조회 실패:', error);
      toast({
        title: 'Google 브랜드 조회 실패',
        description: error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // 매체 로그인 플로우 완료 처리
  const handlePlatformLoginComplete = async (data) => {
    setPlatformLoginData(data);

    // Meta Ads 처리
    if (data.platform === 'Meta Ads') {
      try {
        // 1. Integration 생성
        const { data: newIntegration, error: integrationError } = await supabase
          .from('integrations')
          .insert({
            advertiser_id: data.brandId,
            platform: 'Meta Ads',
            integration_type: 'token',
            legacy_account_id: data.metaAccountId,
            account_description: data.metaAccountName,
          })
          .select()
          .single();

        if (integrationError) throw integrationError;

        // 2. Access Token 저장
        let tokenToSave = data.metaAccessToken;

        // 조직 토큰 사용 시 (metaAccessToken이 null) - 조직에서 토큰 가져오기
        if (!tokenToSave) {
          const { data: metaCredentials, error: metaError } = await supabase
            .rpc('get_organization_meta_credentials', { org_id: organizationId });

          if (metaError || !metaCredentials || metaCredentials.length === 0) {
            throw new Error('조직 메타 토큰을 찾을 수 없습니다.');
          }

          const credentials = Array.isArray(metaCredentials) ? metaCredentials[0] : metaCredentials;
          tokenToSave = credentials.access_token;
        }

        if (!tokenToSave) {
          throw new Error('Meta Access Token이 필요합니다.');
        }

        const { error: tokenError } = await supabase.rpc('store_encrypted_token', {
          p_api_token_id: newIntegration.id,
          p_access_token: tokenToSave,
        });

        if (tokenError) throw tokenError;

        // 3. 토큰 목록 새로고침
        fetchTokens();

        toast({
          title: 'API 토큰 추가 완료',
          description: '초기 데이터 수집을 설정합니다.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        // 4. savedIntegrationId 설정 후 초기 수집 모달 열기
        setSavedIntegrationId(newIntegration.id);
        onInitialCollectionModalOpen();

        // 5. platformLoginData 초기화
        setPlatformLoginData(null);
      } catch (error) {
        console.error('[Meta 토큰 저장] 실패:', error);
        toast({
          title: 'Meta 토큰 저장 실패',
          description: error.message,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
      return;
    }

    // Google Ads 처리
    setFormData(prev => ({
      ...prev,
      advertiser: availableAdvertisers.find(adv => adv.id === data.brandId)?.name || '',
      advertiserId: data.brandId,
      platform: data.platform,
      refreshToken: data.refreshToken,
      customerId: data.customerId,
    }));

    setSelectedIntegrationId(data.integrationId);
    setGcpSource('organization');

    // 조직 GCP 정보가 없으면 먼저 가져오기
    if (!organizationGcp.clientId) {
      await fetchOrganizationGcp();
    }

    // Google Ads 전환 액션 조회 실행
    try {
      setIsLoadingConversions(true);
      setConversionActions([]);
      setSelectedConversionActions([]);
      setCurrentPage(1);
      onConversionModalOpen();

      console.log('[Platform Login] 전환 액션 조회 시작');

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-conversion-actions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            customer_id: data.customerId,
            developer_token: organizationGcp.developerToken,
            manager_account_id: organizationGcp.mccId,
            refresh_token: data.refreshToken,
            client_id: organizationGcp.clientId,
            client_secret: organizationGcp.clientSecret,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || '전환 액션 조회 실패');
      }

      console.log('[Platform Login] 조회 성공:', result);
      setConversionActions(result.conversionActions || []);

      toast({
        title: '조회 완료',
        description: `${result.count || 0}개의 전환 액션을 불러왔습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('[Platform Login] 조회 실패:', error);
      toast({
        title: '전환 액션 조회 실패',
        description: error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoadingConversions(false);
    }
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
  const handleExecuteSync = async () => {
    onSyncWarningClose();

    try {
      // 1. 선택된 플랫폼의 Integration 조회
      const selectedToken = data.find(token => token.platform === syncConfig.selectedPlatform);

      if (!selectedToken) {
        toast({
          title: '연동 실패',
          description: '선택된 플랫폼을 찾을 수 없습니다.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // 2. 날짜 계산
      let startDate, endDate;
      const today = new Date();

      switch (syncConfig.dateRange) {
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = endDate = yesterday.toISOString().split('T')[0];
          break;
        case 'lastWeek':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          endDate = new Date(today).toISOString().split('T')[0];
          break;
        case 'lastMonth':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          startDate = monthAgo.toISOString().split('T')[0];
          endDate = new Date(today).toISOString().split('T')[0];
          break;
        case 'all':
          const oneYearAgoAll = new Date(today);
          oneYearAgoAll.setFullYear(oneYearAgoAll.getFullYear() - 1);
          const yesterdayAll = new Date(today);
          yesterdayAll.setDate(yesterdayAll.getDate() - 1);
          startDate = oneYearAgoAll.toISOString().split('T')[0];
          endDate = yesterdayAll.toISOString().split('T')[0];
          break;
        case 'custom':
          startDate = syncConfig.startDate;
          endDate = syncConfig.endDate;

          // 날짜 검증
          const syncStart = new Date(startDate);
          const syncEnd = new Date(endDate);
          const twoYearsAgoSync = new Date(today);
          twoYearsAgoSync.setFullYear(today.getFullYear() - 2);

          // 최대 2년 전까지 제한
          if (syncStart < twoYearsAgoSync) {
            toast({
              title: '날짜 범위 오류',
              description: '최대 2년 전까지의 데이터만 연동할 수 있습니다.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return;
          }

          // 최대 365일 간격 제한
          const syncDaysDiff = Math.floor((syncEnd - syncStart) / (1000 * 60 * 60 * 24));
          if (syncDaysDiff > 365) {
            toast({
              title: '날짜 범위 오류',
              description: '시작일과 종료일 간격은 최대 365일까지 가능합니다.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return;
          }
          break;
        default:
          throw new Error('Invalid date range');
      }

      // 3. initial-collection Edge Function 호출
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/initial-collection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            integration_id: selectedToken.id,
            start_date: startDate,
            end_date: endDate,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '데이터 수집 시작 실패');
      }

      toast({
        title: '데이터 연동 시작',
        description: `${selectedToken.platform} 데이터 수집이 시작되었습니다. CollectionMonitor에서 진행 상황을 확인하세요.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('데이터 연동 실패:', error);
      toast({
        title: '연동 실패',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 초기 수집 트리거 함수
  const triggerInitialCollection = async (integrationId, formData) => {
    try {
      // 날짜 범위 계산
      let startDate, endDate;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const twoYearsAgo = new Date(today);
      twoYearsAgo.setFullYear(today.getFullYear() - 2);

      switch (formData.initialCollectionRange) {
        case 'yesterday':
          startDate = endDate = yesterdayStr;
          break;
        case 'lastWeek':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          endDate = yesterdayStr;
          break;
        case 'lastMonth':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          startDate = monthAgo.toISOString().split('T')[0];
          endDate = yesterdayStr;
          break;
        case 'maxRange':
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(today.getFullYear() - 1);
          startDate = oneYearAgo.toISOString().split('T')[0];
          endDate = yesterdayStr;
          break;
        case 'custom':
          // 2년 제약 검증
          const customStart = new Date(formData.customStartDate);
          const customEnd = new Date(formData.customEndDate);

          if (customStart < twoYearsAgo) {
            toast({
              title: '날짜 범위 오류',
              description: '최대 2년 전까지의 데이터만 수집할 수 있습니다.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return false;
          }

          if (customEnd > yesterday) {
            toast({
              title: '날짜 범위 오류',
              description: '어제까지의 날짜만 선택할 수 있습니다.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return false;
          }

          if (customStart > customEnd) {
            toast({
              title: '날짜 범위 오류',
              description: '시작 날짜는 종료 날짜보다 빠를 수 없습니다.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return false;
          }

          // 365일 간격 제한
          const daysDiff = Math.floor((customEnd - customStart) / (1000 * 60 * 60 * 24));
          if (daysDiff > 365) {
            toast({
              title: '날짜 범위 오류',
              description: '시작일과 종료일 간격은 최대 365일까지 가능합니다.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return false;
          }

          startDate = formData.customStartDate;
          endDate = formData.customEndDate;
          break;
        default:
          return; // skip
      }

      // initial-collection Edge Function 호출
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/initial-collection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            integration_id: integrationId,
            start_date: startDate,
            end_date: endDate,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '초기 데이터 수집 시작 실패');
      }

      toast({
        title: '데이터 수집 시작',
        description: `${startDate} ~ ${endDate} 기간의 데이터 수집이 시작되었습니다. 하단 모니터에서 진행 상황을 확인하세요.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      return true;

    } catch (error) {
      console.error('초기 데이터 수집 실패:', error);
      toast({
        title: '수집 시작 실패',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  };

  const handleDelete = async (tokenId) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      toast({
        title: 'API 토큰 삭제 완료',
        description: 'API 토큰이 삭제되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchTokens();
    } catch (error) {
      console.error('[API Token] 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSave = async () => {
    // 플랫폼별 필수 필드 검증
    const isGoogleAds = formData.platform === 'Google Ads';
    const isNaverAds = formData.platform === 'Naver Ads';

    // GCP 검증
    let clientId = formData.clientId;
    let clientSecret = formData.clientSecret;
    let developerToken = formData.developerToken;
    let managerAccountId = formData.managerAccountId;

    if (isGoogleAds && gcpSource === 'organization') {
      clientId = organizationGcp.clientId;
      clientSecret = organizationGcp.clientSecret;
      developerToken = organizationGcp.developerToken || formData.developerToken;
      managerAccountId = organizationGcp.mccId || formData.managerAccountId;
    }

    // 디버깅: 각 필드 검증 상태
    console.log('[Save] 필드 검증:', {
      advertiser: !!formData.advertiser,
      platform: !!formData.platform,
      customerId: !!formData.customerId,
      managerAccountId: !!managerAccountId,
      developerToken: !!developerToken,
      targetConversionActionId: formData.targetConversionActionId.length,
      refreshToken: !!formData.refreshToken,
      clientId: !!clientId,
      clientSecret: !!clientSecret,
    });

    const hasRequiredFields = formData.advertiser && formData.platform &&
      (isGoogleAds
        ? formData.customerId && managerAccountId && developerToken &&
          formData.targetConversionActionId.length > 0 && formData.refreshToken &&
          clientId && clientSecret
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

    try {
      const tokenData = {
        advertiserId: formData.advertiserId,
        platform: formData.platform,
        status: formData.status,
        accountDescription: formData.accountDescription, // 계정 설명 추가
        // Google Ads
        ...(isGoogleAds && {
          customerId: formData.customerId,
          managerAccountId: managerAccountId,
          developerToken: developerToken,
          targetConversionActionId: formData.targetConversionActionId,
          refreshToken: formData.refreshToken,
          clientId: clientId,
          clientSecret: clientSecret,
        }),
        // Naver Ads
        ...(isNaverAds && {
          accountId: formData.accountId,
          apiToken: formData.apiToken,
          secretKey: formData.secretKey,
        }),
        // Meta/Kakao Ads
        ...(!isGoogleAds && !isNaverAds && {
          accountId: formData.accountId,
          apiToken: formData.apiToken,
        }),
      };

      if (editMode && selectedToken) {
        // 수정 모드: 바로 저장
        await updateApiToken(selectedToken.id, tokenData);

        toast({
          title: 'API 토큰 수정 완료',
          description: 'API 토큰이 수정되었습니다.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onClose();
        fetchTokens();
      } else {
        // 신규 추가 모드: 토큰 저장 후 초기 수집 모달로 이동
        const result = await createApiToken(tokenData);
        setSavedIntegrationId(result?.id);

        toast({
          title: 'API 토큰 추가 완료',
          description: '초기 데이터 수집을 설정합니다.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        // 토큰 추가 모달 닫고 초기 수집 모달 열기
        onClose();
        fetchTokens();
        onInitialCollectionModalOpen();
      }
    } catch (error) {
      console.error('[API Token] 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const columns = [
    columnHelper.accessor('advertiser_name', {
      id: 'advertiser_name',
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
          계정 ID
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        // 계정 ID 우선순위: legacy_account_id > account_id > legacy_customer_id
        const accountId = row.legacy_account_id || row.account_id || row.legacy_customer_id || '-';
        return (
          <Text color={textColor} fontSize="sm" fontWeight="500">
            {accountId}
          </Text>
        );
      },
    }),
    columnHelper.accessor('accountDescription', {
      id: 'accountDescription',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          설명
        </Text>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Text color={textColor} fontSize="sm" fontWeight="500">
            {row.account_description || '-'}
          </Text>
        );
      },
    }),
    columnHelper.accessor('updated_at', {
      id: 'updated_at',
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
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString('ko-KR') : '-'}
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
              leftIcon={<Icon as={MdLink} />}
              colorScheme="purple"
              variant="solid"
              size="sm"
              onClick={onPlatformLoginOpen}
            >
              매체 로그인
            </Button>
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
                          onClick={() => setFormData({ ...formData, advertiser: adv.name, advertiserId: adv.id })}
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
                autoComplete="off"
                data-form-type="other"
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
                {/* GCP 소스 선택 */}
                <FormControl mb={4}>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    GCP 설정 방식
                  </FormLabel>
                  <RadioGroup value={gcpSource} onChange={setGcpSource}>
                    <Stack spacing={2}>
                      <Radio value="organization" colorScheme="brand" size="sm">
                        <HStack>
                          <Text fontSize="sm" fontWeight="400">대행사 GCP 사용</Text>
                          {organizationGcp.clientId && (
                            <Badge colorScheme="green" fontSize="xs">설정됨</Badge>
                          )}
                        </HStack>
                      </Radio>
                      <Radio value="custom" colorScheme="brand" size="sm">
                        <Text fontSize="sm" fontWeight="400">직접 입력</Text>
                      </Radio>
                    </Stack>
                  </RadioGroup>
                  {gcpSource === 'organization' && !organizationGcp.clientId && (
                    <Alert status="warning" mt={2} fontSize="xs">
                      <AlertIcon boxSize="12px" />
                      <AlertDescription fontSize="xs">
                        대행사 GCP 설정이 없습니다. 관리자 대시보드에서 먼저 설정해주세요.
                      </AlertDescription>
                    </Alert>
                  )}
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    광고 계정 ID *
                  </FormLabel>

                  {/* 옵션 1: Google 브랜드 목록 조회 */}
                  {selectedIntegrationId && (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={handleFetchGoogleCustomers}
                      isLoading={isLoadingCustomers}
                      leftIcon={<MdSearch />}
                      mb={2}
                      width="full"
                    >
                      Google 브랜드 목록 조회
                    </Button>
                  )}

                  {/* 조회된 브랜드 드롭다운 */}
                  {googleCustomers.length > 0 && (
                    <Select
                      placeholder="조회된 브랜드 선택"
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      mb={2}
                      fontSize="sm"
                    >
                      {googleCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.id})
                        </option>
                      ))}
                    </Select>
                  )}

                  {/* 옵션 2: 수동 입력 (기존 방식 유지) */}
                  <Input
                    placeholder="또는 Customer ID 직접 입력 (예: 1234567890)"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    fontSize="sm"
                  />

                  {googleCustomers.length > 0 && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      위 드롭다운에서 선택하거나 직접 입력할 수 있습니다.
                    </Text>
                  )}
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    MCC ID *
                  </FormLabel>
                  <Input
                    placeholder="Manager Account ID"
                    value={formData.managerAccountId}
                    onChange={(e) => setFormData({ ...formData, managerAccountId: e.target.value })}
                    isDisabled={gcpSource === 'organization' && organizationGcp.mccId}
                    fontSize="sm"
                  />
                  {gcpSource === 'organization' && organizationGcp.mccId && (
                    <Text fontSize="xs" color="green.500" mt={1}>
                      ✓ 대행사 기본 MCC 사용 중
                    </Text>
                  )}
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
                    isDisabled={gcpSource === 'organization' && organizationGcp.developerToken}

                    fontSize="sm"
                  />
                  {gcpSource === 'organization' && organizationGcp.developerToken && (
                    <Text fontSize="xs" color="green.500" mt={1}>
                      ✓ 대행사 설정 사용 중
                    </Text>
                  )}
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                    구글애즈 전환 액션 ID *
                  </FormLabel>
                  <VStack align="stretch" spacing={2}>
                    {formData.targetConversionActionId.length > 0 && (
                      <Flex flexWrap="wrap" gap={2} mb={2}>
                        {formData.targetConversionActionId.map((actionId) => {
                          const action = conversionActions.find(a => a.id === actionId);
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

                {gcpSource === 'custom' && (
                  <>
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
                )}
                {gcpSource === 'organization' && organizationGcp.clientId && (
                  <Alert status="info" mb={4} fontSize="xs">
                    <AlertIcon boxSize="12px" />
                    <AlertDescription fontSize="xs">
                      대행사의 GCP 설정을 사용합니다. Client ID와 Client Secret은 자동으로 적용됩니다.
                    </AlertDescription>
                  </Alert>
                )}
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
            <Button onClick={onClose} mr={3}>취소</Button>
            <Button colorScheme="brand" onClick={handleSave}>
              {editMode ? '저장' : '다음'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Conversion Action Lookup Modal */}
      <Modal isOpen={isConversionModalOpen} onClose={onConversionModalClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>전환 액션 조회</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              추적할 전환 액션을 선택하세요. 여러 개 선택 가능합니다. (총 {conversionActions.length}개)
            </Text>

            {isLoadingConversions ? (
                <Box textAlign="center" py={10}>
                  <Spinner size="xl" color="brand.500" />
                  <Text mt={4} color="gray.500">전환액션 조회 중...</Text>
                </Box>
              ) : conversionActions.length === 0 ? (
                <Box textAlign="center" py={10}>
                  <Text color="gray.500">조회된 전환액션이 없습니다.</Text>
                </Box>
              ) : (
                <>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th w="50px"></Th>
                        <Th>이름</Th>
                        <Th w="120px">ID</Th>
                        <Th w="100px">상태</Th>
                        <Th w="200px">유형</Th>
                        <Th w="180px">카테고리</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {conversionActions
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((action) => (
                        <Tr
                          key={action.id}
                          _hover={{ bg: bgHover }}
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
                            <Badge
                              colorScheme={
                                action.status === 'ENABLED' ? 'green' :
                                action.status === 'REMOVED' ? 'red' :
                                'gray'
                              }
                              fontSize="xs"
                            >
                              {action.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme="purple" fontSize="xs">
                              {action.type}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme="blue" fontSize="xs">
                              {action.category}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>

                  <Flex justify="space-between" align="center" mt={4}>
                    <Text fontSize="sm" color="gray.600">
                      {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, conversionActions.length)} / {conversionActions.length}
                    </Text>
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
                        {currentPage} / {Math.ceil(conversionActions.length / itemsPerPage)}
                      </Text>
                      <Button
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        isDisabled={currentPage === Math.ceil(conversionActions.length / itemsPerPage)}
                      >
                        다음
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setCurrentPage(Math.ceil(conversionActions.length / itemsPerPage))}
                        isDisabled={currentPage === Math.ceil(conversionActions.length / itemsPerPage)}
                      >
                        마지막
                      </Button>
                    </HStack>
                  </Flex>
                </>
              )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="brand" mr={3} onClick={handleConfirmConversionActions}>
              선택 완료 ({selectedConversionActions.length})
            </Button>
            <Button onClick={onConversionModalClose}>취소</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 조직 Google Ads 토큰 선택 모달 */}
      <Modal isOpen={isTokenSelectModalOpen} onClose={onTokenSelectModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md" fontWeight="600">
            조직의 기존 Google Ads 토큰 선택
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">기존 토큰 재사용 권장</AlertTitle>
                <AlertDescription fontSize="xs">
                  같은 조직의 Google 계정으로 생성된 토큰을 재사용하면 재인증이 불필요합니다.
                </AlertDescription>
              </Box>
            </Alert>

            <VStack spacing={3} align="stretch">
              {organizationTokens.map((token) => (
                <Box
                  key={token.integration_id}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={borderColor}
                  _hover={{ bg: bgHover, cursor: 'pointer' }}
                  onClick={() => handleSelectToken(token.integration_id)}
                >
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="600">
                        {token.google_account_email || '(이메일 정보 없음)'}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        브랜드: {token.advertiser_name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        생성자: {token.created_by_user_email || '(정보 없음)'}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        생성일: {new Date(token.created_at).toLocaleDateString('ko-KR')}
                      </Text>
                    </VStack>
                    <Button size="sm" colorScheme="blue">
                      선택
                    </Button>
                  </HStack>
                </Box>
              ))}
            </VStack>

            <Divider my={4} />

            <Button
              width="full"
              variant="outline"
              colorScheme="green"
              onClick={() => {
                onTokenSelectModalClose();

                // 경고 메시지 표시
                const confirmNewToken = window.confirm(
                  '기존 토큰으로 브랜드가 보이지 않나요?\n\n' +
                  '새 Google 계정으로 OAuth 인증을 진행하시겠습니까?\n\n' +
                  '"취소"를 누르면 토큰 목록으로 돌아갑니다.'
                );

                if (confirmNewToken) {
                  proceedWithNewOAuth();
                } else {
                  onTokenSelectModalOpen();
                }
              }}
            >
              새 Google 계정으로 토큰 발급
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onTokenSelectModalClose}>닫기</Button>
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
                        `${data.find(token => token.platform === syncConfig.selectedPlatform).advertiser_name} - ${syncConfig.selectedPlatform}`
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
                        {token.advertiser_name} - {token.platform}
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
                      <Text fontSize="sm" fontWeight="400">최근 1년</Text>
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
                      max={(() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return yesterday.toISOString().split('T')[0];
                      })()}
                      min={(() => {
                        const twoYearsAgo = new Date();
                        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                        return twoYearsAgo.toISOString().split('T')[0];
                      })()}
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
                      max={(() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return yesterday.toISOString().split('T')[0];
                      })()}
                      min={syncConfig.startDate || (() => {
                        const twoYearsAgo = new Date();
                        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                        return twoYearsAgo.toISOString().split('T')[0];
                      })()}
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

            <VStack align="start" spacing={1.5} p={3} bg={vStackBg} borderRadius="12px">
              <Text fontSize="xs" fontWeight="600" mb={0.5}>연동 설정 확인:</Text>
              <Text fontSize="xs" fontWeight="400">• 매체: {syncConfig.selectedPlatform}</Text>
              <Text fontSize="xs" fontWeight="400">
                • 기간: {
                  syncConfig.dateRange === 'yesterday' ? '어제' :
                  syncConfig.dateRange === 'lastWeek' ? '지난주 (7일)' :
                  syncConfig.dateRange === 'lastMonth' ? '지난달 (30일)' :
                  syncConfig.dateRange === 'all' ? '최근 1년' :
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

      {/* Initial Collection Setup Modal */}
      <Modal isOpen={isInitialCollectionModalOpen} onClose={onInitialCollectionModalClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="lg" fontWeight="600">
            초기 데이터 수집 설정
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.600" mb={4}>
              토큰이 성공적으로 저장되었습니다. 과거 데이터 수집을 설정하세요.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontSize="sm" fontWeight="600" mb={2}>
                수집 기간 선택
              </FormLabel>
              <Text fontSize="xs" color="gray.500" mb={3}>
                최대 2년 전부터 어제까지 선택 가능하며, 한 번에 최대 1년(365일)까지 수집할 수 있습니다.
              </Text>
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
                  textAlign='left'
                  w="100%">
                  {formData.initialCollectionRange === 'yesterday' ? '어제' :
                   formData.initialCollectionRange === 'lastWeek' ? '지난 주 (7일)' :
                   formData.initialCollectionRange === 'lastMonth' ? '지난 달 (30일)' :
                   formData.initialCollectionRange === 'maxRange' ? '최대 (1년)' :
                   formData.initialCollectionRange === 'custom' ? '직접 입력' :
                   formData.initialCollectionRange === 'skip' ? '나중에 하기' : '기간을 선택하세요'}
                </MenuButton>
                <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                  {[
                    {value: 'yesterday', label: '어제'},
                    {value: 'lastWeek', label: '지난 주 (7일)'},
                    {value: 'lastMonth', label: '지난 달 (30일)'},
                    {value: 'maxRange', label: '최대 (1년)'},
                    {value: 'custom', label: '직접 입력'},
                    {value: 'skip', label: '나중에 하기'},
                  ].map((option) => (
                    <MenuItem
                      key={option.value}
                      onClick={() => setFormData({ ...formData, initialCollectionRange: option.value })}
                      bg={formData.initialCollectionRange === option.value ? brandColor : 'transparent'}
                      color={formData.initialCollectionRange === option.value ? 'white' : textColor}
                      _hover={{
                        bg: formData.initialCollectionRange === option.value ? brandColor : bgHover,
                      }}
                      fontWeight={formData.initialCollectionRange === option.value ? '600' : '500'}
                      fontSize='sm'
                      px='12px'
                      py='8px'
                      borderRadius='8px'
                      justifyContent='center'
                      textAlign='center'
                      minH='auto'>
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </FormControl>

            {/* 직접 입력 날짜 선택 */}
            {formData.initialCollectionRange === 'custom' && (
              <FormControl mb={4}>
                <FormLabel fontSize="sm" fontWeight="500" mb={2}>
                  수집 기간 선택 (최대 2년)
                </FormLabel>
                <Flex gap={3}>
                  <Input
                    type="date"
                    value={formData.customStartDate}
                    onChange={(e) => setFormData({ ...formData, customStartDate: e.target.value })}
                    placeholder="시작 날짜"
                    bg={inputBg}
                    border='1px solid'
                    borderColor={borderColor}
                    color={textColor}
                    fontSize='sm'
                    fontWeight='500'
                    _placeholder={{ color: 'secondaryGray.600', fontWeight: '400' }}
                    h='44px'
                    borderRadius='12px'
                    max={(() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return yesterday.toISOString().split('T')[0];
                    })()}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().split('T')[0]}
                  />
                  <Text alignSelf="center" fontSize="sm" color="gray.500">~</Text>
                  <Input
                    type="date"
                    value={formData.customEndDate}
                    onChange={(e) => setFormData({ ...formData, customEndDate: e.target.value })}
                    placeholder="종료 날짜"
                    bg={inputBg}
                    border='1px solid'
                    borderColor={borderColor}
                    color={textColor}
                    fontSize='sm'
                    fontWeight='500'
                    _placeholder={{ color: 'secondaryGray.600', fontWeight: '400' }}
                    h='44px'
                    borderRadius='12px'
                    max={(() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return yesterday.toISOString().split('T')[0];
                    })()}
                    min={formData.customStartDate || new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().split('T')[0]}
                  />
                </Flex>
              </FormControl>
            )}

            {formData.initialCollectionRange === 'skip' ? (
              <Alert status="info" borderRadius="md" fontSize="sm">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">나중에 수집하기</AlertTitle>
                  <AlertDescription fontSize="xs">
                    스케줄러만 활성화됩니다. 내일 새벽부터 매일 자동 수집됩니다.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : formData.initialCollectionRange !== 'skip' && (
              <Alert status="warning" borderRadius="md" fontSize="sm">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">주의사항</AlertTitle>
                  <AlertDescription fontSize="xs">
                    데이터 수집에는 시간이 소요될 수 있습니다. CollectionMonitor에서 진행 상황을 확인할 수 있습니다.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </ModalBody>

          <ModalFooter>
            <Button onClick={onInitialCollectionModalClose} mr={3}>
              {formData.initialCollectionRange === 'skip' ? '건너뛰기' : '취소'}
            </Button>
            <Button
              colorScheme="brand"
              isLoading={isCollectionStarting}
              loadingText="시작 중..."
              isDisabled={
                !formData.initialCollectionRange ||
                (formData.initialCollectionRange === 'custom' &&
                  (!formData.customStartDate || !formData.customEndDate))
              }
              onClick={async () => {
                if (formData.initialCollectionRange === 'skip') {
                  onInitialCollectionModalClose();
                  toast({
                    title: '설정 완료',
                    description: '스케줄러가 활성화되었습니다. 내일 새벽부터 자동 수집됩니다.',
                    status: 'info',
                    duration: 5000,
                    isClosable: true,
                  });
                } else {
                  setIsCollectionStarting(true);
                  const success = await triggerInitialCollection(savedIntegrationId, formData);
                  setIsCollectionStarting(false);
                  if (success) {
                    onInitialCollectionModalClose();
                  }
                }
              }}
            >
              {formData.initialCollectionRange === 'skip' ? '완료' : '시작'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 매체 로그인 플로우 */}
      <PlatformLoginFlow
        isOpen={isPlatformLoginOpen}
        onClose={onPlatformLoginClose}
        onComplete={handlePlatformLoginComplete}
      />
    </>
  );
}
