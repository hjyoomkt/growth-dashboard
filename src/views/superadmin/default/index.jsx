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

  const { user, role, organizationId, advertiserId, organizationType } = useAuth();
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
  });
  const [isGcpLoading, setIsGcpLoading] = useState(false);
  const [isSavingGcp, setIsSavingGcp] = useState(false);
  const [hasExistingGcp, setHasExistingGcp] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showDeveloperToken, setShowDeveloperToken] = useState(false);

  // 권한 체크: master 또는 agency_admin만 GCP 설정 가능
  const canManageGcp = role === 'master' || role === 'agency_admin';

  // GCP 설정 조회
  const fetchGcpSettings = useCallback(async () => {
    if (!organizationId || !canManageGcp) return;

    setIsGcpLoading(true);
    try {
      // 조직의 GCP 설정 존재 여부 확인
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('google_client_id_vault_id, google_client_secret_vault_id, google_developer_token_vault_id')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        console.error('[GCP Settings] 조직 조회 실패:', orgError);
        return;
      }

      const hasCredentials = orgData?.google_client_id_vault_id && orgData?.google_client_secret_vault_id;
      setHasExistingGcp(hasCredentials);

      if (hasCredentials) {
        // 기존 설정이 있으면 마스킹된 값으로 표시
        setGcpSettings({
          clientId: '••••••••••••••••',
          clientSecret: '••••••••••••••••',
          developerToken: orgData?.google_developer_token_vault_id ? '••••••••••••••••' : '',
        });
      }
    } catch (error) {
      console.error('[GCP Settings] 조회 실패:', error);
    } finally {
      setIsGcpLoading(false);
    }
  }, [organizationId, canManageGcp]);

  // GCP 설정 저장
  const handleSaveGcpSettings = async () => {
    if (!organizationId) {
      toast({
        title: '오류',
        description: '조직 정보를 찾을 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 마스킹된 값이면 변경하지 않음
    const isClientIdMasked = gcpSettings.clientId === '••••••••••••••••';
    const isClientSecretMasked = gcpSettings.clientSecret === '••••••••••••••••';
    const isDeveloperTokenMasked = gcpSettings.developerToken === '••••••••••••••••';

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
      console.log('[GCP Settings] Headers check:', {
        hasAccessToken: !!accessToken,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        url: process.env.REACT_APP_SUPABASE_URL,
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
          body: JSON.stringify({
            organization_id: organizationId,
            client_id: isClientIdMasked ? null : gcpSettings.clientId,
            client_secret: isClientSecretMasked ? null : gcpSettings.clientSecret,
            developer_token: isDeveloperTokenMasked ? null : gcpSettings.developerToken,
          }),
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

      setHasExistingGcp(true);
      // 저장 후 마스킹 처리
      setGcpSettings({
        clientId: '••••••••••••••••',
        clientSecret: '••••••••••••••••',
        developerToken: gcpSettings.developerToken ? '••••••••••••••••' : '',
      });
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
    if (gcpSettings[field] === '••••••••••••••••') {
      setGcpSettings(prev => ({ ...prev, [field]: '' }));
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('[SuperAdminDashboard] 통계 조회 시작:', { role, organizationId });

        // master는 전체 통계, agency_admin은 자신의 조직 통계
        if (role === 'master') {
          const data = await getUserStats();
          console.log('[SuperAdminDashboard] 전체 통계:', data);
          setStats(data);
        } else {
          // agency_admin 등은 권한 기반 필터링
          const currentUser = {
            id: user.id,
            role,
            organization_id: organizationId,
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
    }
  }, [user, role, organizationId, advertiserId, organizationType, fetchGcpSettings]);

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

          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                Google OAuth Client ID
              </FormLabel>
              <Input
                placeholder="xxxxx.apps.googleusercontent.com"
                value={gcpSettings.clientId}
                onChange={(e) => setGcpSettings(prev => ({ ...prev, clientId: e.target.value }))}
                onFocus={() => handleInputFocus('clientId')}
                bg={inputBg}
                fontSize="sm"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                Google OAuth Client Secret
              </FormLabel>
              <InputGroup>
                <Input
                  type={showClientSecret ? "text" : "password"}
                  placeholder="GOCSPX-xxxxx"
                  value={gcpSettings.clientSecret}
                  onChange={(e) => setGcpSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                  onFocus={() => handleInputFocus('clientSecret')}
                  bg={inputBg}
                  fontSize="sm"
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showClientSecret ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    aria-label={showClientSecret ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                Google Ads Developer Token (선택)
              </FormLabel>
              <InputGroup>
                <Input
                  type={showDeveloperToken ? "text" : "password"}
                  placeholder="Developer Token"
                  value={gcpSettings.developerToken}
                  onChange={(e) => setGcpSettings(prev => ({ ...prev, developerToken: e.target.value }))}
                  onFocus={() => handleInputFocus('developerToken')}
                  bg={inputBg}
                  fontSize="sm"
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showDeveloperToken ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowDeveloperToken(!showDeveloperToken)}
                    aria-label={showDeveloperToken ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Developer Token은 토큰 추가 시 개별 입력도 가능합니다.
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
