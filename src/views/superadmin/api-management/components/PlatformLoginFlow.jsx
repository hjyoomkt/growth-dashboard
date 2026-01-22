import React, { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { supabase } from 'services/supabaseService';
import PlatformLoginModal from './PlatformLoginModal';
import BrandSelectModal from './BrandSelectModal';
import CustomerAccountModal from './CustomerAccountModal';

export default function PlatformLoginFlow({
  isOpen,
  onClose,
  onComplete,
}) {
  const [currentStep, setCurrentStep] = useState('platform'); // platform, brand, oauth, customer
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [integrationId, setIntegrationId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

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
    setSelectedCustomerId(null);
  };

  // Step 1: 매체 선택
  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setCurrentStep('brand');
  };

  // Step 2: 브랜드 선택 후 OAuth 로그인 시작
  const handleBrandSelect = async (brandId) => {
    setSelectedBrandId(brandId);
    setCurrentStep('oauth');

    // OAuth 로그인 시작
    await initiateGoogleOAuth(brandId);
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

  // Step 3: 고객 계정 선택 후 전환 액션 선택으로 이동
  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);

    // 부모 컴포넌트(APITokenTable)로 데이터 전달하여 기존 전환 액션 모달 열기
    onComplete({
      platform: selectedPlatform,
      brandId: selectedBrandId,
      refreshToken: refreshToken,
      integrationId: integrationId,
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

      {/* Step 3: 고객 계정 선택 */}
      <CustomerAccountModal
        isOpen={isOpen && currentStep === 'customer'}
        onClose={handleClose}
        onNext={handleCustomerSelect}
        refreshToken={refreshToken}
        integrationId={integrationId}
      />
    </>
  );
}
