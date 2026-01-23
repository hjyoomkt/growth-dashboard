import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  VStack,
  HStack,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
} from '@chakra-ui/react';

export default function ExistingTokenSelectModal({
  isOpen,
  onClose,
  onSelectToken,
  onNewLogin,
  tokens = [],
}) {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');

  const handleNewLoginClick = () => {
    const confirmNewToken = window.confirm(
      '기존 토큰으로 브랜드가 보이지 않나요?\n\n' +
      '새 Google 계정으로 OAuth 인증을 진행하시겠습니까?\n\n' +
      '"취소"를 누르면 토큰 목록으로 돌아갑니다.'
    );

    if (confirmNewToken) {
      // onClose() 제거 - 모달을 열린 상태로 유지하여 OAuth 완료 후 고객 계정 선택 모달이 열리도록 함
      onNewLogin();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
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
            {tokens.map((token) => (
              <Box
                key={token.integration_id}
                p={4}
                borderWidth="1px"
                borderRadius="md"
                borderColor={borderColor}
                _hover={{ bg: bgHover, cursor: 'pointer' }}
                onClick={() => onSelectToken(token.integration_id)}
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
            onClick={handleNewLoginClick}
          >
            새 Google 계정으로 토큰 발급
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>닫기</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
