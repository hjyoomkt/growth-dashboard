import React, { useState } from 'react';
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
  Avatar,
  Box,
  Text,
  useColorModeValue,
  Flex,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { MdCamera } from 'react-icons/md';

export default function ProfileEditModal({ isOpen, onClose, currentData }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: currentData?.name || '',
    job: currentData?.job || '',
    email: currentData?.email || '',
    phone: currentData?.phone || '',
    avatar: currentData?.avatar || '',
    banner: currentData?.banner || '',
  });

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.800');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  const handleSubmit = () => {
    // TODO: 실제로는 API 호출하여 프로필 정보 업데이트
    console.log('Updated profile:', formData);
    onClose();
  };

  const handleAvatarUpload = () => {
    toast({
      title: '서비스 준비중',
      description: '프로필 이미지 업로드 기능은 현재 준비 중입니다.',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top',
    });
  };

  const handleBannerUpload = () => {
    toast({
      title: '서비스 준비중',
      description: '배너 이미지 업로드 기능은 현재 준비 중입니다.',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" fontWeight="600">
          프로필 편집
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* 배너 이미지 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">
                배너 이미지
              </FormLabel>
              <Box position="relative">
                <Box
                  h="120px"
                  w="100%"
                  borderRadius="12px"
                  bg={formData.banner ? `url(${formData.banner})` : 'gray.200'}
                  bgSize="cover"
                  bgPosition="center"
                  border="1px solid"
                  borderColor={borderColor}
                />
                <IconButton
                  icon={<MdCamera />}
                  aria-label="배너 업로드"
                  position="absolute"
                  bottom="10px"
                  right="10px"
                  size="sm"
                  borderRadius="8px"
                  onClick={handleBannerUpload}
                />
              </Box>
            </FormControl>

            {/* 프로필 이미지 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">
                프로필 이미지
              </FormLabel>
              <Flex align="center" gap={4}>
                <Box position="relative">
                  <Avatar
                    src={formData.avatar}
                    size="xl"
                    border="2px solid"
                    borderColor={borderColor}
                  />
                  <IconButton
                    icon={<MdCamera />}
                    aria-label="프로필 이미지 업로드"
                    position="absolute"
                    bottom="0"
                    right="0"
                    size="sm"
                    borderRadius="50%"
                    onClick={handleAvatarUpload}
                  />
                </Box>
                <Text fontSize="xs" color={placeholderColor}>
                  JPG, PNG 파일을 업로드하세요
                </Text>
              </Flex>
            </FormControl>

            {/* 이름 */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">
                이름
              </FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="이름을 입력하세요"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>

            {/* 직책 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">
                직책
              </FormLabel>
              <Input
                value={formData.job}
                onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                placeholder="직책을 입력하세요"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>

            {/* 이메일 */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">
                이메일
              </FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="이메일을 입력하세요"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>

            {/* 전화번호 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">
                전화번호
              </FormLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="전화번호를 입력하세요"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} fontSize="sm">
            취소
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            fontSize="sm"
            fontWeight="500"
          >
            저장
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
