/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _|
 | |_| | | | | |_) || |  / / | | |  \| | | | | || |
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___|

=========================================================
* Horizon UI - v1.1.0
=========================================================

* Product Page: https://www.horizon-ui.com/
* Copyright 2023 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Chakra imports
import {
  Box,
  SimpleGrid,
  Text,
  useColorModeValue,
  Icon,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Badge,
} from "@chakra-ui/react";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React, { useState, useEffect, useCallback } from "react";
import {
  MdPeople,
  MdSecurity,
  MdBarChart,
  MdVisibility,
  MdVisibilityOff,
  MdSave,
  MdCloud,
} from "react-icons/md";
import { SiMeta, SiNaver } from "react-icons/si";
import { getUserStats, getUsers, supabase } from "services/supabaseService";
import { useAuth } from "contexts/AuthContext";

export default function SuperAdminDashboard() {
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const cardBg = useColorModeValue("white", "navy.700");
  const inputBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const toast = useToast();

  const {
    user,
    role,
    organizationId: userOrgId,    // 사용자 본인의 조직 ID
    advertiserId,
    organizationType,
    currentOrganizationId,         // Master가 선택한 대행사 ID
  } = useAuth();

  // Master는 선택된 대행사 ID 사용, 다른 권한은 본인 조직 ID 사용
  const effectiveOrganizationId = role === 'master' && currentOrganizationId
    ? currentOrganizationId
    : userOrgId;

  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
  });

  // GCP 설정 상태
  const [gcpSettings, setGcpSettings] = useState({
    clientId: '',
    clientSecret: '',
    developerToken: '',
    mccId: '',
  });
  const [isGcpLoading, setIsGcpLoading] = useState(false);
  const [isSavingGcp, setIsSavingGcp] = useState(false);
  const [hasExistingGcp, setHasExistingGcp] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showDeveloperToken, setShowDeveloperToken] = useState(false);

  // Meta 설정 상태
  const [metaSettings, setMetaSettings] = useState({
    appId: '',
    appSecret: '',
    accessToken: '',
  });
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [hasExistingMeta, setHasExistingMeta] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Naver 설정 상태
  const [naverSettings, setNaverSettings] = useState({
    apiKey: '',
    secretKey: '',
  });
  const [isNaverLoading, setIsNaverLoading] = useState(false);
  const [isSavingNaver, setIsSavingNaver] = useState(false);
  const [hasExistingNaver, setHasExistingNaver] = useState(false);
  const [showNaverApiKey, setShowNaverApiKey] = useState(false);
  const [showNaverSecretKey, setShowNaverSecretKey] = useState(false);

  // 권한 체크: master 또는 agency_admin만 GCP 설정 가능
  const canManageGcp = role === 'master' || role === 'agency_admin';

  // Master만 GCP 자격증명 수정 가능 (agency_admin은 MCC ID만 수정 가능)
  const canEditGcpCredentials = role === 'master';

  // GCP 설정 조회
  const fetchGcpSettings = useCallback(async () => {
    console.log('[GCP Settings] fetchGcpSettings 호출됨:', { effectiveOrganizationId, canManageGcp });
    if (!effectiveOrganizationId || !canManageGcp) {
      console.log('[GCP Settings] Early return:', { effectiveOrganizationId, canManageGcp });
      return;
    }

    console.log('[GCP Settings] 미리보기 조회 시작...');
    setIsGcpLoading(true);
    try {
      // GCP 설정 미리보기 조회 (부분 마스킹)
      const { data: previewData, error: previewError } = await supabase
        .rpc('get_organization_gcp_preview', {
          org_id: effectiveOrganizationId
        });

      console.log('[GCP Settings] RPC 응답:', { previewData, previewError });

      if (previewError) {
        console.error('[GCP Settings] 미리보기 조회 실패:', previewError);
        return;
      }

      // previewData가 배열이면 첫 요소, 객체면 그대로 사용
      const preview = Array.isArray(previewData) ? previewData[0] : previewData;
      console.log('[GCP Settings] Preview 데이터:', preview);

      const hasCredentials = preview?.client_id_preview && preview?.client_secret_preview;
      console.log('[GCP Settings] hasCredentials:', hasCredentials);
      setHasExistingGcp(hasCredentials);

      if (hasCredentials) {
        // 부분 마스킹된 값으로 표시
        const newSettings = {
          clientId: preview.client_id_preview || '',
          clientSecret: preview.client_secret_preview || '',
          developerToken: preview.developer_token_preview || '',
          mccId: preview.mcc_id_preview || '',
        };
        console.log('[GCP Settings] Setting masked values:', newSettings);
        setGcpSettings(newSettings);
      } else {
        console.log('[GCP Settings] No credentials to display - 설정 초기화');
        setGcpSettings({
          clientId: '',
          clientSecret: '',
          developerToken: '',
          mccId: '',
        });
      }
    } catch (error) {
      console.error('[GCP Settings] 조회 실패:', error);
    } finally {
      setIsGcpLoading(false);
    }
  }, [effectiveOrganizationId, canManageGcp]);

  // GCP 설정 저장
  const handleSaveGcpSettings = async () => {
    if (!effectiveOrganizationId) {
      toast({
        title: '오류',
        description: '조직 정보를 찾을 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 마스킹된 값인지 확인 (부분 마스킹 패턴: xxxx••••••••••)
    const isMasked = (value) => value && value.includes('••••');
    const isClientIdMasked = isMasked(gcpSettings.clientId);
    const isClientSecretMasked = isMasked(gcpSettings.clientSecret);
    const isDeveloperTokenMasked = isMasked(gcpSettings.developerToken);
    const isMccIdMasked = isMasked(gcpSettings.mccId);

    // agency_admin은 기존 설정 없이 새로 생성 불가 (Master만 가능)
    if (!hasExistingGcp && !canEditGcpCredentials) {
      toast({
        title: '권한 없음',
        description: 'Google API 자격증명은 Master 관리자만 설정할 수 있습니다.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (!hasExistingGcp && (!gcpSettings.clientId || !gcpSettings.clientSecret)) {
      toast({
        title: '필수 항목 누락',
        description: 'Client ID와 Client Secret은 필수입니다.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSavingGcp(true);
    try {
      // Edge Function 호출하여 Vault에 저장 (Service Role 권한 사용)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('인증 세션이 없습니다. 다시 로그인해주세요.');
      }

      const apiKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

      const payload = {
        organization_id: effectiveOrganizationId,
      };

      // 마스킹되지 않은 필드만 payload에 추가
      if (!isClientIdMasked) {
        payload.client_id = gcpSettings.clientId?.trim() || 'EMPTY_STRING';
      }
      if (!isClientSecretMasked) {
        payload.client_secret = gcpSettings.clientSecret?.trim() || 'EMPTY_STRING';
      }
      if (!isDeveloperTokenMasked) {
        payload.developer_token = gcpSettings.developerToken?.trim() || 'EMPTY_STRING';
      }
      if (!isMccIdMasked) {
        payload.mcc_id = gcpSettings.mccId?.trim() || 'EMPTY_STRING';
      }

      console.log('[GCP Settings] Save payload:', {
        ...payload,
        client_id: payload.client_id ? (payload.client_id === 'EMPTY_STRING' ? 'EMPTY_STRING' : 'HAS_VALUE') : 'NOT_INCLUDED',
        client_secret: payload.client_secret ? (payload.client_secret === 'EMPTY_STRING' ? 'EMPTY_STRING' : 'HAS_VALUE') : 'NOT_INCLUDED',
        developer_token: payload.developer_token ? (payload.developer_token === 'EMPTY_STRING' ? 'EMPTY_STRING' : 'HAS_VALUE') : 'NOT_INCLUDED',
        mcc_id: payload.mcc_id ? (payload.mcc_id === 'EMPTY_STRING' ? 'EMPTY_STRING' : 'HAS_VALUE') : 'NOT_INCLUDED',
      });

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/save-organization-gcp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': apiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save GCP credentials');
      }

      toast({
        title: '저장 완료',
        description: 'Google API 설정이 저장되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // 저장 후 미리보기 다시 불러오기
      await fetchGcpSettings();
    } catch (error) {
      console.error('[GCP Settings] 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: error.message || '설정 저장에 실패했습니다.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSavingGcp(false);
    }
  };

  // 입력 필드 클릭 시 마스킹 해제
  const handleInputFocus = (field) => {
    // Master가 아닌 경우 자격증명 필드는 마스킹 해제 불가
    if (!canEditGcpCredentials && ['clientId', 'clientSecret', 'developerToken'].includes(field)) {
      return;
    }

    const value = gcpSettings[field];
    // 마스킹된 값인지 확인 (부분 마스킹 패턴: xxxx••••••••••)
    if (value && value.includes('••••')) {
      setGcpSettings(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Meta 설정 조회
  const fetchMetaSettings = useCallback(async () => {
    if (!effectiveOrganizationId || !canManageGcp) return;

    setIsMetaLoading(true);
    try {
      const { data: previewData, error: previewError } = await supabase
        .rpc('get_organization_meta_preview', {
          org_id: effectiveOrganizationId
        });

      if (previewError) {
        console.error('[Meta Settings] 미리보기 조회 실패:', previewError);
        return;
      }

      const preview = Array.isArray(previewData) ? previewData[0] : previewData;
      const hasCredentials = preview?.access_token_preview;
      setHasExistingMeta(hasCredentials);

      if (hasCredentials) {
        setMetaSettings({
          appId: preview.app_id_preview || '',
          appSecret: preview.app_secret_preview || '',
          accessToken: preview.access_token_preview || '',
        });
      } else {
        setMetaSettings({
          appId: '',
          appSecret: '',
          accessToken: '',
        });
      }
    } catch (error) {
      console.error('[Meta Settings] 조회 실패:', error);
    } finally {
      setIsMetaLoading(false);
    }
  }, [effectiveOrganizationId, canManageGcp]);

  // Naver 설정 조회
  const fetchNaverSettings = useCallback(async () => {
    if (!effectiveOrganizationId || !canManageGcp) return;

    setIsNaverLoading(true);
    try {
      const { data: previewData, error: previewError } = await supabase
        .rpc('get_organization_naver_preview', {
          org_id: effectiveOrganizationId
        });

      if (previewError) {
        console.error('[Naver Settings] 미리보기 조회 실패:', previewError);
        return;
      }

      const preview = Array.isArray(previewData) ? previewData[0] : previewData;
      const hasCredentials = preview?.api_key_preview;
      setHasExistingNaver(hasCredentials);

      if (hasCredentials) {
        setNaverSettings({
          apiKey: preview.api_key_preview || '',
          secretKey: preview.secret_key_preview || '',
        });
      } else {
        setNaverSettings({
          apiKey: '',
          secretKey: '',
        });
      }
    } catch (error) {
      console.error('[Naver Settings] 조회 실패:', error);
    } finally {
      setIsNaverLoading(false);
    }
  }, [effectiveOrganizationId, canManageGcp]);

  // Meta 설정 저장
  const handleSaveMetaSettings = async () => {
    if (!effectiveOrganizationId) {
      toast({
        title: '오류',
        description: '조직 정보를 찾을 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const isMasked = (value) => value && value.includes('••••');
    const isAccessTokenMasked = isMasked(metaSettings.accessToken);

    if (!hasExistingMeta && !metaSettings.accessToken) {
      toast({
        title: '필수 항목 누락',
        description: 'Access Token은 필수입니다.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSavingMeta(true);
    try {
      // 세션 토큰 가져오기
      let { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('인증 세션이 없습니다. 다시 로그인해주세요.');
      }

      // Supabase 인증 세션 토큰 만료 시간 확인 (디버깅용 - Meta API 토큰 아님!)
      if (sessionData?.session) {
        const expiresAt = sessionData.session.expires_at; // Unix timestamp (초)
        const now = Math.floor(Date.now() / 1000); // 현재 시간 (초)
        const remainingSeconds = expiresAt - now;
        const remainingMinutes = Math.floor(remainingSeconds / 60);

        console.log('[Meta Settings] Supabase 세션 토큰 (인증용, Meta API 토큰 아님):', {
          현재시간: new Date().toLocaleString('ko-KR'),
          세션만료시간: new Date(expiresAt * 1000).toLocaleString('ko-KR'),
          남은시간: `${remainingMinutes}분 ${remainingSeconds % 60}초`,
          세션만료됨: remainingSeconds <= 0
        });
      }

      const apiKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

      const payload = {
        organization_id: effectiveOrganizationId,
      };

      if (!isMasked(metaSettings.appId)) {
        payload.app_id = metaSettings.appId?.trim() || 'EMPTY_STRING';
      }
      if (!isMasked(metaSettings.appSecret)) {
        payload.app_secret = metaSettings.appSecret?.trim() || 'EMPTY_STRING';
      }
      if (!isAccessTokenMasked) {
        payload.access_token = metaSettings.accessToken?.trim() || 'EMPTY_STRING';
      }

      // API 호출 함수 (재사용 가능)
      const callSaveApi = async (token) => {
        return await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/save-organization-meta`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': apiKey,
            },
            body: JSON.stringify(payload),
          }
        );
      };

      // 첫 번째 시도
      let response = await callSaveApi(accessToken);

      // 401 에러 발생 시 세션 갱신 후 재시도
      if (response.status === 401) {
        console.log('[Meta Settings] 401 에러 발생, 세션 갱신 후 재시도...');

        // 세션 강제 갱신
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession?.session?.access_token) {
          throw new Error('세션 갱신에 실패했습니다. 다시 로그인해주세요.');
        }

        accessToken = refreshedSession.session.access_token;
        console.log('[Meta Settings] 세션 갱신 완료, 재시도 중...');

        // 두 번째 시도
        response = await callSaveApi(accessToken);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Meta credentials');
      }

      toast({
        title: '저장 완료',
        description: 'Meta API 설정이 저장되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await fetchMetaSettings();
    } catch (error) {
      console.error('[Meta Settings] 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: error.message || '설정 저장에 실패했습니다.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSavingMeta(false);
    }
  };

  // Naver 설정 저장
  const handleSaveNaverSettings = async () => {
    if (!effectiveOrganizationId) {
      toast({
        title: '오류',
        description: '조직 정보를 찾을 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const isMasked = (value) => value && value.includes('••••');
    const isApiKeyMasked = isMasked(naverSettings.apiKey);
    const isSecretKeyMasked = isMasked(naverSettings.secretKey);

    if (!hasExistingNaver && (!naverSettings.apiKey || !naverSettings.secretKey)) {
      toast({
        title: '필수 항목 누락',
        description: 'API Key와 Secret Key는 모두 필수입니다.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSavingNaver(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('인증 세션이 없습니다. 다시 로그인해주세요.');
      }

      const apiKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

      const payload = {
        organization_id: effectiveOrganizationId,
      };

      if (!isApiKeyMasked) {
        payload.api_key = naverSettings.apiKey?.trim() || 'EMPTY_STRING';
      }
      if (!isSecretKeyMasked) {
        payload.secret_key = naverSettings.secretKey?.trim() || 'EMPTY_STRING';
      }

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/save-organization-naver`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': apiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Naver credentials');
      }

      toast({
        title: '저장 완료',
        description: '네이버 API 설정이 저장되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await fetchNaverSettings();
    } catch (error) {
      console.error('[Naver Settings] 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: error.message || '설정 저장에 실패했습니다.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSavingNaver(false);
    }
  };

  // Meta 입력 필드 클릭 시 마스킹 해제
  const handleMetaInputFocus = (field) => {
    const value = metaSettings[field];
    if (value && value.includes('••••')) {
      setMetaSettings(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Naver 입력 필드 클릭 시 마스킹 해제
  const handleNaverInputFocus = (field) => {
    const value = naverSettings[field];
    if (value && value.includes('••••')) {
      setNaverSettings(prev => ({ ...prev, [field]: '' }));
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('[SuperAdminDashboard] 통계 조회 시작:', { role, effectiveOrganizationId });

        // master는 대행사 선택 여부에 따라 통계 조회
        if (role === 'master') {
          if (effectiveOrganizationId) {
            // 대행사를 선택한 경우: 해당 대행사의 사용자만
            console.log('[SuperAdminDashboard] 선택된 대행사의 통계 조회:', effectiveOrganizationId);
            const currentUser = {
              id: user.id,
              role: 'agency_admin',  // agency_admin처럼 동작
              organization_id: effectiveOrganizationId,
              organizationType: 'agency',
            };

            const users = await getUsers(currentUser);
            console.log('[SuperAdminDashboard] 대행사 사용자:', users);

            const totalUsers = users.length;
            const adminUsers = users.filter(u =>
              ['agency_admin', 'agency_manager', 'advertiser_admin', 'advertiser_staff'].includes(u.role)
            ).length;
            const activeUsers = users.filter(u => u.status === 'active').length;

            console.log('[SuperAdminDashboard] 대행사 통계:', { totalUsers, adminUsers, activeUsers });

            setStats({
              totalUsers,
              adminUsers,
              activeUsers,
            });
          } else {
            // 대행사 미선택: 전체 통계
            const data = await getUserStats();
            console.log('[SuperAdminDashboard] 전체 통계:', data);
            setStats(data);
          }
        } else {
          // agency_admin 등은 권한 기반 필터링
          const currentUser = {
            id: user.id,
            role,
            organization_id: effectiveOrganizationId,
            advertiser_id: advertiserId,
            organizationType,
          };

          const users = await getUsers(currentUser);
          console.log('[SuperAdminDashboard] 조직 사용자:', users);

          const totalUsers = users.length;
          const adminUsers = users.filter(u =>
            ['agency_admin', 'agency_manager', 'advertiser_admin', 'advertiser_staff'].includes(u.role)
          ).length;
          const activeUsers = users.filter(u => u.status === 'active').length;

          console.log('[SuperAdminDashboard] 조직 통계:', { totalUsers, adminUsers, activeUsers });

          setStats({
            totalUsers,
            adminUsers,
            activeUsers,
          });
        }
      } catch (error) {
        console.error('[SuperAdminDashboard] 통계 조회 실패:', error);
      }
    };

    if (user) {
      fetchStats();
      fetchGcpSettings();
      fetchMetaSettings();
      fetchNaverSettings();
    }
  }, [user?.id, role, effectiveOrganizationId, advertiserId, organizationType, fetchGcpSettings, fetchMetaSettings, fetchNaverSettings]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Text
        color={textColor}
        fontSize="2xl"
        fontWeight="700"
        mb="20px"
        px="25px"
      >
        관리자 대시보드
      </Text>

      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, "2xl": 3 }}
        gap='20px'
        mb='20px'
        px="25px">
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdPeople} color={brandColor} />
              }
            />
          }
          name='총 사용자'
          value={stats.totalUsers.toString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdSecurity} color={brandColor} />
              }
            />
          }
          name='관리자 계정'
          value={stats.adminUsers.toString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdBarChart} color={brandColor} />
              }
            />
          }
          name='활성 사용자'
          value={stats.activeUsers.toString()}
        />
      </SimpleGrid>

      {/* Google API 설정 섹션 - master 또는 agency_admin만 표시 */}
      {canManageGcp && (
        <>
          {/* Master가 대행사 미선택 시 안내 메시지 */}
          {role === 'master' && !effectiveOrganizationId && (
            <Alert status="info" borderRadius="md" mt="20px" mx="25px">
              <AlertIcon />
              <AlertDescription>
                상단 네비게이션 바에서 대행사를 선택하면 해당 대행사의 API 설정을 관리할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          <Box
            bg={cardBg}
            p="24px"
            borderRadius="20px"
            mt="20px"
            mx="25px"
            border="1px solid"
            borderColor={borderColor}
          >
          <HStack mb="16px" spacing={3}>
            <Icon as={MdCloud} w="24px" h="24px" color={brandColor} />
            <Text color={textColor} fontSize="lg" fontWeight="700">
              Google API 설정
            </Text>
            {hasExistingGcp && (
              <Badge colorScheme="green" fontSize="xs">설정됨</Badge>
            )}
          </HStack>

          <Alert status="info" borderRadius="md" mb="16px" fontSize="sm">
            <AlertIcon />
            <AlertDescription>
              이 설정은 조직 내 모든 브랜드에서 Google Ads 연동 시 공유됩니다.
              브랜드별로 자체 GCP를 사용할 수도 있습니다.
            </AlertDescription>
          </Alert>

          {/* Agency Admin 권한 안내 */}
          {!canEditGcpCredentials && (
            <Alert status="warning" borderRadius="md" mb="16px" fontSize="sm">
              <AlertIcon />
              <AlertDescription>
                Google API 자격증명(Client ID, Client Secret, Developer Token)은 Master 관리자만 수정할 수 있습니다.
                MCC ID는 수정 가능합니다.
              </AlertDescription>
            </Alert>
          )}

          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={!canEditGcpCredentials ? 'gray.500' : undefined}>
                Google OAuth Client ID
                {!canEditGcpCredentials && (
                  <Badge ml={2} colorScheme="gray" fontSize="2xs">Master 전용</Badge>
                )}
              </FormLabel>
              <Input
                placeholder="xxxxx.apps.googleusercontent.com"
                value={gcpSettings.clientId}
                onChange={(e) => setGcpSettings(prev => ({ ...prev, clientId: e.target.value }))}
                onFocus={() => handleInputFocus('clientId')}
                bg={!canEditGcpCredentials ? 'gray.100' : inputBg}
                fontSize="sm"
                isDisabled={!canEditGcpCredentials}
                _disabled={{ cursor: 'not-allowed', opacity: 0.6 }}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={!canEditGcpCredentials ? 'gray.500' : undefined}>
                Google OAuth Client Secret
                {!canEditGcpCredentials && (
                  <Badge ml={2} colorScheme="gray" fontSize="2xs">Master 전용</Badge>
                )}
              </FormLabel>
              <InputGroup>
                <Input
                  type={showClientSecret ? "text" : "password"}
                  placeholder="GOCSPX-xxxxx"
                  value={gcpSettings.clientSecret}
                  onChange={(e) => setGcpSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                  onFocus={() => handleInputFocus('clientSecret')}
                  bg={!canEditGcpCredentials ? 'gray.100' : inputBg}
                  fontSize="sm"
                  isDisabled={!canEditGcpCredentials}
                  _disabled={{ cursor: 'not-allowed', opacity: 0.6 }}
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showClientSecret ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    aria-label={showClientSecret ? "숨기기" : "보기"}
                    isDisabled={!canEditGcpCredentials}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={!canEditGcpCredentials ? 'gray.500' : undefined}>
                Google Ads Developer Token (선택)
                {!canEditGcpCredentials && (
                  <Badge ml={2} colorScheme="gray" fontSize="2xs">Master 전용</Badge>
                )}
              </FormLabel>
              <InputGroup>
                <Input
                  type={showDeveloperToken ? "text" : "password"}
                  placeholder="Developer Token"
                  value={gcpSettings.developerToken}
                  onChange={(e) => setGcpSettings(prev => ({ ...prev, developerToken: e.target.value }))}
                  onFocus={() => handleInputFocus('developerToken')}
                  bg={!canEditGcpCredentials ? 'gray.100' : inputBg}
                  fontSize="sm"
                  isDisabled={!canEditGcpCredentials}
                  _disabled={{ cursor: 'not-allowed', opacity: 0.6 }}
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showDeveloperToken ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowDeveloperToken(!showDeveloperToken)}
                    aria-label={showDeveloperToken ? "숨기기" : "보기"}
                    isDisabled={!canEditGcpCredentials}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Developer Token은 토큰 추가 시 개별 입력도 가능합니다.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                기본 MCC ID (선택)
              </FormLabel>
              <Input
                placeholder="123-456-7890"
                value={gcpSettings.mccId}
                onChange={(e) => setGcpSettings(prev => ({ ...prev, mccId: e.target.value }))}
                onFocus={() => handleInputFocus('mccId')}
                bg={inputBg}
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                여러 MCC를 사용하는 경우 주로 사용하는 MCC ID를 입력하세요. 수동 토큰 입력 시 자동으로 입력됩니다.
              </Text>
            </FormControl>

            <Divider />

            <Button
              colorScheme="brand"
              leftIcon={<MdSave />}
              onClick={handleSaveGcpSettings}
              isLoading={isSavingGcp}
              loadingText="저장 중..."
              size="md"
              alignSelf="flex-start"
            >
              {hasExistingGcp ? '설정 업데이트' : '설정 저장'}
            </Button>
          </VStack>
        </Box>
        </>
      )}

      {/* Meta API 설정 섹션 - master 또는 agency_admin만 표시 */}
      {canManageGcp && (
        <Box
          bg={cardBg}
          p="24px"
          borderRadius="20px"
          mt="20px"
          mx="25px"
          border="1px solid"
          borderColor={borderColor}
        >
          <HStack mb="16px" spacing={3}>
            <Icon as={SiMeta} w="24px" h="24px" color="blue.500" />
            <Text color={textColor} fontSize="lg" fontWeight="700">
              Meta API 설정
            </Text>
            {hasExistingMeta && (
              <Badge colorScheme="blue" fontSize="xs">설정됨</Badge>
            )}
          </HStack>

          <Alert status="info" borderRadius="md" mb="16px" fontSize="sm">
            <AlertIcon />
            <AlertDescription>
              이 설정은 조직 내 모든 브랜드에서 Meta Ads 연동 시 공유됩니다.
              브랜드별로 자체 토큰을 사용할 수도 있습니다.
            </AlertDescription>
          </Alert>

          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                Meta App ID (선택)
              </FormLabel>
              <Input
                placeholder="1234567890123456"
                value={metaSettings.appId}
                onChange={(e) => setMetaSettings(prev => ({ ...prev, appId: e.target.value }))}
                onFocus={() => handleMetaInputFocus('appId')}
                bg={inputBg}
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                App ID는 토큰 검증 시 사용됩니다 (선택사항).
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                Meta App Secret (선택)
              </FormLabel>
              <InputGroup>
                <Input
                  type={showAppSecret ? "text" : "password"}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={metaSettings.appSecret}
                  onChange={(e) => setMetaSettings(prev => ({ ...prev, appSecret: e.target.value }))}
                  onFocus={() => handleMetaInputFocus('appSecret')}
                  bg={inputBg}
                  fontSize="sm"
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showAppSecret ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    aria-label={showAppSecret ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                App Secret은 토큰 검증 시 사용됩니다 (선택사항).
              </Text>
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="500">
                Meta Access Token (Long-lived User Access Token) *
              </FormLabel>
              <InputGroup>
                <Input
                  type={showAccessToken ? "text" : "password"}
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={metaSettings.accessToken}
                  onChange={(e) => setMetaSettings(prev => ({ ...prev, accessToken: e.target.value }))}
                  onFocus={() => handleMetaInputFocus('accessToken')}
                  bg={inputBg}
                  fontSize="sm"
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showAccessToken ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    aria-label={showAccessToken ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                60일 유효기간의 Long-lived User Access Token을 입력하세요.
              </Text>
            </FormControl>

            <Divider />

            <Button
              colorScheme="brand"
              leftIcon={<MdSave />}
              onClick={handleSaveMetaSettings}
              isLoading={isSavingMeta}
              loadingText="저장 중..."
              size="md"
              alignSelf="flex-start"
            >
              {hasExistingMeta ? '설정 업데이트' : '설정 저장'}
            </Button>
          </VStack>
        </Box>
      )}

      {/* Naver API 설정 섹션 - master 또는 agency_admin만 표시 */}
      {canManageGcp && (
        <Box
          bg={cardBg}
          p="24px"
          borderRadius="20px"
          mt="20px"
          mx="25px"
          border="1px solid"
          borderColor={borderColor}
        >
          <HStack mb="16px" spacing={3}>
            <Icon as={SiNaver} w="24px" h="24px" color="green.500" />
            <Text color={textColor} fontSize="lg" fontWeight="700">
              네이버 광고 API 설정
            </Text>
            {hasExistingNaver && (
              <Badge colorScheme="green" fontSize="xs">설정됨</Badge>
            )}
          </HStack>

          <Alert status="info" borderRadius="md" mb="16px" fontSize="sm">
            <AlertIcon />
            <AlertDescription>
              이 설정은 조직 내 모든 브랜드에서 네이버 광고 연동 시 공유됩니다.
              각 브랜드별로 Customer ID는 별도로 입력해야 합니다.
            </AlertDescription>
          </Alert>

          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="500">
                API Key *
              </FormLabel>
              <InputGroup>
                <Input
                  type={showNaverApiKey ? "text" : "password"}
                  placeholder="API Key 입력"
                  value={naverSettings.apiKey}
                  onChange={(e) => setNaverSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  onFocus={() => handleNaverInputFocus('apiKey')}
                  bg={inputBg}
                  fontSize="sm"
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showNaverApiKey ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowNaverApiKey(!showNaverApiKey)}
                    aria-label={showNaverApiKey ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                네이버 광고 시스템에서 발급받은 API Key를 입력하세요.
              </Text>
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="500">
                Secret Key *
              </FormLabel>
              <InputGroup>
                <Input
                  type={showNaverSecretKey ? "text" : "password"}
                  placeholder="Secret Key 입력"
                  value={naverSettings.secretKey}
                  onChange={(e) => setNaverSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                  onFocus={() => handleNaverInputFocus('secretKey')}
                  bg={inputBg}
                  fontSize="sm"
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showNaverSecretKey ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowNaverSecretKey(!showNaverSecretKey)}
                    aria-label={showNaverSecretKey ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                네이버 광고 시스템에서 발급받은 Secret Key를 입력하세요.
              </Text>
            </FormControl>

            <Divider />

            <Button
              colorScheme="brand"
              leftIcon={<MdSave />}
              onClick={handleSaveNaverSettings}
              isLoading={isSavingNaver}
              loadingText="저장 중..."
              size="md"
              alignSelf="flex-start"
            >
              {hasExistingNaver ? '설정 업데이트' : '설정 저장'}
            </Button>
          </VStack>
        </Box>
      )}

      <Box
        bg={cardBg}
        p="20px"
        borderRadius="20px"
        mt="20px"
        mx="25px"
      >
        <Text color={textColor} fontSize="lg" fontWeight="700" mb="10px">
          관리자 기능
        </Text>
        <Text color={textColor} fontSize="sm">
          왼쪽 사이드바에서 회원 관리, 권한 관리 등의 메뉴를 이용할 수 있습니다.
        </Text>
        <Text color={textColor} fontSize="sm" mt="10px">
          Home 버튼을 클릭하면 메인 대시보드로 돌아갑니다.
        </Text>
      </Box>
    </Box>
  );
}
