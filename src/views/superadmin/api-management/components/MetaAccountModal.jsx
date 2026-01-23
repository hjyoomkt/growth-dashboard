import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  RadioGroup,
  Radio,
  Stack,
  VStack,
  Text,
  Spinner,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { supabase } from 'services/supabaseService';

export default function MetaAccountModal({
  isOpen,
  onClose,
  onNext,
  brandId,
  organizationId,
}) {
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [useOrgToken, setUseOrgToken] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const inputBg = useColorModeValue('white', 'navy.700');
  const toast = useToast();

  // 조직 토큰 자동 입력
  useEffect(() => {
    if (isOpen && useOrgToken && organizationId) {
      fetchOrganizationToken();
    }
  }, [isOpen, useOrgToken, organizationId]);

  const fetchOrganizationToken = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_organization_meta_preview', { org_id: organizationId });

      if (error || !data || data.length === 0) {
        console.log('조직 토큰 없음, 수동 입력 필요');
        setUseOrgToken(false);
        return;
      }

      const preview = Array.isArray(data) ? data[0] : data;

      // 마스킹된 값 표시
      if (preview.access_token_preview) {
        setAccessToken(preview.access_token_preview);
      } else {
        setUseOrgToken(false);
      }
    } catch (err) {
      console.error('조직 토큰 조회 실패:', err);
      setUseOrgToken(false);
    }
  };

  const handleFetchAccounts = async () => {
    // 조직 토큰 사용 시에는 검증 스킵
    if (!useOrgToken && (!accessToken || accessToken.includes('••••'))) {
      toast({
        title: '토큰 필요',
        description: 'Access Token을 입력해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const sessionData = await supabase.auth.getSession();
      const sessionToken = sessionData.data.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/list-meta-adaccounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          organization_id: organizationId,
          access_token: useOrgToken ? undefined : accessToken,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '광고 계정 조회 실패');
      }

      const data = await response.json();
      setAdAccounts(data.accounts || []);

      if (data.accounts && data.accounts.length === 1) {
        setSelectedAccountId(data.accounts[0].id);
      }

      toast({
        title: '조회 완료',
        description: `${data.accounts.length}개의 광고 계정을 찾았습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('광고 계정 조회 오류:', err);
      setError(err.message);
      toast({
        title: '광고 계정 조회 실패',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (selectedAccountId) {
      const selectedAccount = adAccounts.find(acc => acc.id === selectedAccountId);
      onNext({
        accountId: selectedAccount.account_id,  // act_ 제외한 순수 ID
        accountName: selectedAccount.name,
        accessToken: useOrgToken ? null : accessToken,  // 조직 토큰 사용 시 null
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" fontWeight="700">
          Meta Ads 광고 계정 선택
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Access Token 입력 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500">
                Meta Access Token
              </FormLabel>
              <InputGroup>
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="조직 토큰 또는 수동 입력"
                  value={accessToken}
                  onChange={(e) => {
                    setAccessToken(e.target.value);
                    setUseOrgToken(false);
                  }}
                  onFocus={() => {
                    if (accessToken.includes('••••')) {
                      setAccessToken('');
                    }
                  }}
                  bg={inputBg}
                  fontSize="sm"
                  isDisabled={useOrgToken && accessToken.includes('••••')}
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showToken ? <MdVisibilityOff /> : <MdVisibility />}
                    onClick={() => setShowToken(!showToken)}
                    aria-label={showToken ? "숨기기" : "보기"}
                  />
                </InputRightElement>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {useOrgToken && accessToken.includes('••••')
                  ? '조직 토큰이 자동으로 입력되었습니다. 수정하려면 클릭하세요.'
                  : '조직 설정에 토큰이 없는 경우 수동으로 입력하세요.'}
              </Text>
            </FormControl>

            {/* 광고주 조회 버튼 */}
            <Button
              colorScheme="brand"
              onClick={handleFetchAccounts}
              isLoading={loading}
              loadingText="조회 중..."
              fontSize="sm"
              fontWeight="500"
            >
              광고주 조회
            </Button>

            {/* 조회 결과 */}
            {loading ? (
              <VStack spacing={4} py={6}>
                <Spinner size="lg" color="brand.500" />
                <Text fontSize="sm" color="secondaryGray.600">
                  광고 계정 목록을 불러오는 중...
                </Text>
              </VStack>
            ) : error ? (
              <Alert status="error" borderRadius="12px">
                <AlertIcon />
                <AlertDescription fontSize="sm">{error}</AlertDescription>
              </Alert>
            ) : adAccounts.length > 0 ? (
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500">
                  광고 계정 선택 *
                </FormLabel>
                <RadioGroup value={selectedAccountId} onChange={setSelectedAccountId}>
                  <Stack spacing={2}>
                    {adAccounts.map((account) => (
                      <Radio
                        key={account.id}
                        value={account.id}
                        colorScheme="brand"
                        size="md"
                      >
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="500" color={textColor}>
                            {account.displayName}
                          </Text>
                          <Text fontSize="xs" color="secondaryGray.600">
                            상태: {account.status}
                          </Text>
                        </VStack>
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              </FormControl>
            ) : null}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="brand"
            mr={3}
            onClick={handleNext}
            isDisabled={!selectedAccountId}
            fontSize="sm"
            fontWeight="500"
          >
            다음
          </Button>
          <Button onClick={onClose} fontSize="sm" fontWeight="500">
            취소
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
