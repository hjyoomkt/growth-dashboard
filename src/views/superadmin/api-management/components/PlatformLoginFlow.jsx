import React, { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { supabase } from 'services/supabaseService';
import { useAuth } from 'contexts/AuthContext';
import PlatformLoginModal from './PlatformLoginModal';
import BrandSelectModal from './BrandSelectModal';
import CustomerAccountModal from './CustomerAccountModal';
import ExistingTokenSelectModal from './ExistingTokenSelectModal';
import MetaAccountModal from './MetaAccountModal';
import NaverAccountModal from './NaverAccountModal';

export default function PlatformLoginFlow({
  isOpen,
  onClose,
  onComplete,
}) {
  const [currentStep, setCurrentStep] = useState('platform'); // platform, brand, tokenCheck, oauth, customer, metaAccount
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [integrationId, setIntegrationId] = useState(null);
  const [originalIntegrationBrandId, setOriginalIntegrationBrandId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [organizationTokens, setOrganizationTokens] = useState([]);

  // Meta 관련 state
  const [metaAccountInfo, setMetaAccountInfo] = useState(null);

  // Naver 관련 state
  const [naverAccountInfo, setNaverAccountInfo] = useState(null);

  const { organizationId } = useAuth();
  const toast = useToast();

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      resetFlow();
    }
  }, [isOpen]);

  const resetFlow = () => {
    setCurrentStep('platform');
    setSelectedPlatform(null);
    setSelectedBrandId(null);
    setRefreshToken(null);
    setIntegrationId(null);
    setOriginalIntegrationBrandId(null);
    setSelectedCustomerId(null);
    setOrganizationTokens([]);
  };

  // Step 1: 매체 선택
  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setCurrentStep('brand');
  };

  // Step 2: 브랜드 선택 후 기존 토큰 확인
  const handleBrandSelect = async (brandId) => {
    setSelectedBrandId(brandId);

    // Meta Ads는 바로 광고주 조회 단계로 이동
    if (selectedPlatform === 'Meta Ads') {
      setCurrentStep('metaAccount');
    } else if (selectedPlatform === 'Naver Ads') {
      // Naver Ads는 바로 Customer ID 입력 단계로 이동
      setCurrentStep('naverAccount');
    } else {
      // Google Ads는 기존 토큰 확인
      await checkExistingTokens(brandId);
    }
  };

  // 기존 토큰 확인
  const checkExistingTokens = async (brandId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('사용자 정보를 가져올 수 없습니다.');
      }

      const { data, error } = await supabase.rpc('get_organization_google_tokens', {
        p_user_email: user.email,
      });

      if (error) throw error;

      const tokens = data || [];

      if (tokens.length > 0) {
        // 기존 토큰 있음 → 토큰 선택 모달 표시
        setOrganizationTokens(tokens);
        setCurrentStep('tokenCheck');
      } else {
        // 기존 토큰 없음 → 바로 OAuth 진행
        setCurrentStep('oauth');
        await initiateGoogleOAuth(brandId);
      }
    } catch (error) {
      console.error('토큰 조회 실패:', error);
      // 에러 시 OAuth로 진행
      setCurrentStep('oauth');
      await initiateGoogleOAuth(brandId);
    }
  };

  // Google OAuth 로그인 실행
  const initiateGoogleOAuth = async (advertiserId) => {
    try {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;

      // oauth-initiate Edge Function 호출
      const response = await fetch(`${SUPABASE_URL}/functions/v1/oauth-initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          platform: 'Google Ads',
          use_organization_gcp: true, // 조직 GCP 사용
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OAuth 초기화 실패');
      }

      const { authorization_url } = await response.json();

      // OAuth 팝업 열기
      const popup = window.open(
        authorization_url,
        'GoogleOAuth',
        'width=600,height=700,left=100,top=100'
      );

      if (!popup) {
        throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      }

      // postMessage 수신 대기
      window.addEventListener('message', handleOAuthCallback);
    } catch (error) {
      console.error('OAuth 로그인 오류:', error);
      toast({
        title: 'Google 로그인 실패',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setCurrentStep('brand'); // 브랜드 선택으로 돌아가기
    }
  };

  // OAuth 콜백 처리
  const handleOAuthCallback = (event) => {
    // Origin 검증
    if (event.origin !== window.location.origin) {
      console.warn('Rejected unauthorized origin:', event.origin);
      return;
    }

    // 에러 처리
    if (event.data && event.data.error) {
      toast({
        title: 'Google 계정 연결 실패',
        description: event.data.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setCurrentStep('brand');
      window.removeEventListener('message', handleOAuthCallback);
      return;
    }

    // 성공 처리
    if (event.data && event.data.refreshToken) {
      console.log('✅ Refresh token received!');

      setRefreshToken(event.data.refreshToken);

      if (event.data.integrationId) {
        setIntegrationId(event.data.integrationId);
      }

      toast({
        title: 'Google 계정 연결 완료',
        description: '고객 계정을 선택해주세요.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // 고객 계정 선택 단계로 이동
      setCurrentStep('customer');

      window.removeEventListener('message', handleOAuthCallback);
    }
  };

  // 기존 토큰 선택
  const handleSelectExistingToken = async (integration) => {
    try {
      // 토큰 복호화
      const { data: decryptedToken, error } = await supabase.rpc('get_decrypted_token', {
        p_api_token_id: integration.integration_id,
        p_token_type: 'oauth_refresh_token',
      });

      if (error || !decryptedToken) {
        throw new Error('토큰 복호화 실패');
      }

      setRefreshToken(decryptedToken);
      setIntegrationId(integration.integration_id);
      setOriginalIntegrationBrandId(integration.advertiser_id); // 원래 브랜드 ID 추적
      setCurrentStep('customer');

      toast({
        title: '토큰 선택 완료',
        description: '고객 계정을 선택해주세요.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('토큰 선택 실패:', error);
      toast({
        title: '토큰 선택 실패',
        description: error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // 새 로그인 진행
  const handleNewLogin = async () => {
    setCurrentStep('oauth');
    await initiateGoogleOAuth(selectedBrandId);
  };

  // Step 3: 고객 계정 선택 후 전환 액션 선택으로 이동
  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);

    // 기존 토큰을 다른 브랜드에서 재사용하는 경우 감지
    const isDifferentBrand =
      integrationId &&
      originalIntegrationBrandId &&
      originalIntegrationBrandId !== selectedBrandId;

    // 부모 컴포넌트(APITokenTable)로 데이터 전달하여 기존 전환 액션 모달 열기
    onComplete({
      platform: selectedPlatform,
      brandId: selectedBrandId,
      refreshToken: refreshToken,
      integrationId: isDifferentBrand ? null : integrationId, // 다른 브랜드면 null
      sourceIntegrationId: isDifferentBrand ? integrationId : null, // 복사 원본 ID
      customerId: customerId,
    });

    // 플로우 초기화 및 닫기
    resetFlow();
    onClose();
  };

  // Meta 계정 선택 핸들러
  const handleMetaAccountSelect = ({ accountId, accountName, accessToken }) => {
    setMetaAccountInfo({ accountId, accountName, accessToken });

    // 부모 컴포넌트로 데이터 전달
    onComplete({
      platform: selectedPlatform,
      brandId: selectedBrandId,
      metaAccountId: accountId,
      metaAccountName: accountName,
      metaAccessToken: accessToken,
    });

    // 플로우 초기화 및 닫기
    resetFlow();
    onClose();
  };

  // Naver 계정 정보 입력 핸들러
  const handleNaverAccountSelect = ({ customerId }) => {
    setNaverAccountInfo({ customerId });

    // 부모 컴포넌트로 데이터 전달
    onComplete({
      platform: selectedPlatform,
      brandId: selectedBrandId,
      customerId: customerId,
    });

    // 플로우 초기화 및 닫기
    resetFlow();
    onClose();
  };

  // 모달 닫기 핸들러
  const handleClose = () => {
    resetFlow();
    onClose();
  };

  return (
    <>
      {/* Step 1: 매체 선택 */}
      <PlatformLoginModal
        isOpen={isOpen && currentStep === 'platform'}
        onClose={handleClose}
        onPlatformSelect={handlePlatformSelect}
      />

      {/* Step 2: 브랜드 선택 */}
      <BrandSelectModal
        isOpen={isOpen && currentStep === 'brand'}
        onClose={handleClose}
        onNext={handleBrandSelect}
      />

      {/* Step 2.5: 기존 토큰 선택 */}
      <ExistingTokenSelectModal
        isOpen={isOpen && currentStep === 'tokenCheck'}
        onClose={handleClose}
        onSelectToken={handleSelectExistingToken}
        onNewLogin={handleNewLogin}
        tokens={organizationTokens}
      />

      {/* Step 3: 고객 계정 선택 (Google Ads) */}
      <CustomerAccountModal
        isOpen={isOpen && currentStep === 'customer'}
        onClose={handleClose}
        onNext={handleCustomerSelect}
        refreshToken={refreshToken}
        integrationId={integrationId}
      />

      {/* Step 3: Meta 광고 계정 선택 (Meta Ads) */}
      <MetaAccountModal
        isOpen={isOpen && currentStep === 'metaAccount'}
        onClose={handleClose}
        onNext={handleMetaAccountSelect}
        brandId={selectedBrandId}
        organizationId={organizationId}
      />

      {/* Step 3: Naver 계정 정보 입력 (Naver Ads) */}
      <NaverAccountModal
        isOpen={isOpen && currentStep === 'naverAccount'}
        onClose={handleClose}
        onNext={handleNaverAccountSelect}
        brandId={selectedBrandId}
        organizationId={organizationId}
      />
    </>
  );
}
