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
} from '@chakra-ui/react';
import { supabase } from 'services/supabaseService';

export default function CustomerAccountModal({
  isOpen,
  onClose,
  onNext,
  refreshToken,
  integrationId,
}) {
  const [loading, setLoading] = useState(true);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const toast = useToast();

  useEffect(() => {
    if (isOpen && refreshToken && integrationId) {
      fetchCustomerAccounts();
    }
  }, [isOpen, refreshToken, integrationId]);

  const fetchCustomerAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/list-google-customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integration_id: integrationId,
        }),
      });

      if (!response.ok) {
        throw new Error('고객 계정 목록 조회 실패');
      }

      const data = await response.json();
      setCustomerAccounts(data.customers || []);

      // 계정이 1개면 자동 선택
      if (data.customers && data.customers.length === 1) {
        setSelectedCustomerId(data.customers[0].id);
      }
    } catch (err) {
      console.error('고객 계정 조회 오류:', err);
      setError(err.message);
      toast({
        title: '고객 계정 조회 실패',
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
    if (selectedCustomerId) {
      onNext(selectedCustomerId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" fontWeight="700">
          Google Ads 고객 계정 선택
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {loading ? (
            <VStack spacing={4} py={6}>
              <Spinner size="lg" color="brand.500" />
              <Text fontSize="sm" color="secondaryGray.600">
                고객 계정 목록을 불러오는 중...
              </Text>
            </VStack>
          ) : error ? (
            <Alert status="error" borderRadius="12px">
              <AlertIcon />
              <AlertDescription fontSize="sm">{error}</AlertDescription>
            </Alert>
          ) : customerAccounts.length === 0 ? (
            <Alert status="warning" borderRadius="12px">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                접근 가능한 고객 계정이 없습니다.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" mb={3}>
                  고객 계정을 선택하세요 *
                </FormLabel>
                <RadioGroup value={selectedCustomerId} onChange={setSelectedCustomerId}>
                  <Stack spacing={2}>
                    {customerAccounts.map((account) => (
                      <Radio
                        key={account.id}
                        value={account.id}
                        colorScheme="brand"
                        size="md"
                      >
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="500" color={textColor}>
                            {account.name}
                          </Text>
                          <Text fontSize="xs" color="secondaryGray.600">
                            ID: {account.id}
                          </Text>
                        </VStack>
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              </FormControl>

              <Text fontSize="xs" color="secondaryGray.600" mt={4}>
                선택한 계정의 광고 데이터가 수집됩니다.
              </Text>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="brand"
            mr={3}
            onClick={handleNext}
            isDisabled={!selectedCustomerId || loading || error}
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
