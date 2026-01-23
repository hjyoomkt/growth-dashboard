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
  VStack,
  Text,
  Box,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  FormHelperText,
} from '@chakra-ui/react';
import { supabase } from 'services/supabaseService';

export default function NaverAccountModal({
  isOpen,
  onClose,
  onNext,
  brandId,
  organizationId,
}) {
  const [customerId, setCustomerId] = useState('');
  const [orgApiKeyPreview, setOrgApiKeyPreview] = useState('');
  const [orgSecretKeyPreview, setOrgSecretKeyPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const inputBg = useColorModeValue('white', 'navy.700');
  const boxBg = useColorModeValue('gray.50', 'navy.800');
  const toast = useToast();

  // 조직 자격증명 미리보기 조회
  useEffect(() => {
    if (isOpen && organizationId) {
      fetchOrganizationCredentials();
    }
  }, [isOpen, organizationId]);

  const fetchOrganizationCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_organization_naver_preview', { org_id: organizationId });

      if (error || !data || data.length === 0) {
        console.log('조직 네이버 자격증명 없음');
        toast({
          title: '네이버 API 설정 필요',
          description: '조직 설정에서 네이버 API Key와 Secret Key를 먼저 설정해주세요.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        onClose();
        return;
      }

      const preview = Array.isArray(data) ? data[0] : data;
      setOrgApiKeyPreview(preview.api_key_preview || '');
      setOrgSecretKeyPreview(preview.secret_key_preview || '');

      if (!preview.api_key_preview || !preview.secret_key_preview) {
        toast({
          title: '네이버 API 설정 필요',
          description: '조직 설정에서 네이버 API Key와 Secret Key를 먼저 설정해주세요.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        onClose();
      }
    } catch (err) {
      console.error('조직 자격증명 조회 실패:', err);
      toast({
        title: '오류',
        description: '조직 설정을 불러오는 데 실패했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!customerId || customerId.trim() === '') {
      toast({
        title: '필수 항목 누락',
        description: 'Customer ID를 입력해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onNext({
      customerId: customerId.trim(),
    });
  };

  const handleClose = () => {
    setCustomerId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" fontWeight="700">
          네이버 광고 계정 추가
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* 조직 설정 안내 */}
            <Alert status="info" borderRadius="md" fontSize="sm">
              <AlertIcon />
              <AlertDescription>
                조직에 설정된 API Key와 Secret Key를 사용합니다.
              </AlertDescription>
            </Alert>

            {/* 조직 자격증명 미리보기 */}
            <Box p={3} bg={boxBg} borderRadius="md">
              <Text fontSize="sm" fontWeight="600" mb={2} color={textColor}>
                조직 API 설정
              </Text>
              <VStack spacing={1} align="stretch">
                <Text fontSize="xs" color="gray.600">
                  API Key: {orgApiKeyPreview || '설정 안 됨'}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Secret Key: {orgSecretKeyPreview || '설정 안 됨'}
                </Text>
              </VStack>
            </Box>

            {/* Customer ID 입력 */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="500">
                Customer ID *
              </FormLabel>
              <Input
                placeholder="Customer ID 입력 (예: 123456)"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                bg={inputBg}
                fontSize="sm"
                type="text"
              />
              <FormHelperText fontSize="xs">
                네이버 광고 관리 시스템에서 확인할 수 있는 Customer ID를 입력하세요.
              </FormHelperText>
            </FormControl>

            <Alert status="warning" borderRadius="md" fontSize="xs">
              <AlertIcon />
              <AlertDescription>
                네이버는 계정 조회 API가 없어 Customer ID를 직접 입력해야 합니다.
              </AlertDescription>
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="brand"
            mr={3}
            onClick={handleNext}
            isDisabled={!customerId || customerId.trim() === '' || loading}
            fontSize="sm"
            fontWeight="500"
          >
            다음
          </Button>
          <Button onClick={handleClose} fontSize="sm" fontWeight="500">
            취소
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
