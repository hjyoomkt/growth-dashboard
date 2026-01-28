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
  useDisclosure,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import { MdCamera, MdDelete } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import DeleteAccountConfirmModal from './DeleteAccountConfirmModal';
import OwnershipTransferModal from './OwnershipTransferModal';
import DeleteBrandModal from 'views/superadmin/advertisers/components/DeleteBrandModal';
import { useAuth } from 'contexts/AuthContext';
import { deleteBrand, canDeleteBrand } from 'services/supabaseService';
import { supabase } from 'config/supabase';

export default function ProfileEditModal({ isOpen, onClose, currentData }) {
  const toast = useToast();
  const { user, role, advertiserId, signOut } = useAuth();
  const [formData, setFormData] = useState({
    name: currentData?.name || '',
    job: currentData?.job || '',
    email: currentData?.email || '',
    phone: currentData?.phone || '',
    avatar: currentData?.avatar || '',
    banner: currentData?.banner || '',
  });

  const {
    isOpen: isDeleteConfirmOpen,
    onOpen: onDeleteConfirmOpen,
    onClose: onDeleteConfirmClose
  } = useDisclosure();

  const {
    isOpen: isTransferOpen,
    onOpen: onTransferOpen,
    onClose: onTransferClose
  } = useDisclosure();

  const {
    isOpen: isDeleteBrandOpen,
    onOpen: onDeleteBrandOpen,
    onClose: onDeleteBrandClose
  } = useDisclosure();

  const [newOwnerId, setNewOwnerId] = useState(null);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);
  const navigate = useNavigate();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.800');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  const isAdvertiserAdmin = role === 'advertiser_admin';
  const isMaster = role === 'master';

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

  // 브랜드 정보 가져오기
  React.useEffect(() => {
    const fetchBrandInfo = async () => {
      if (isAdvertiserAdmin && advertiserId) {
        try {
          const { data, error } = await supabase
            .from('advertisers')
            .select('id, name, business_number, website_url, contact_email, contact_phone')
            .eq('id', advertiserId)
            .single();

          if (error) throw error;
          setCurrentBrand(data);
        } catch (error) {
          console.error('[ProfileEditModal] 브랜드 정보 조회 실패:', error);
        }
      }
    };

    if (isOpen) {
      fetchBrandInfo();
    }
  }, [isOpen, isAdvertiserAdmin, advertiserId]);

  const handleDeleteClick = () => {
    if (isAdvertiserAdmin) {
      // 브랜드 대표운영자는 소유권 이전 모달 먼저 표시
      onTransferOpen();
    } else {
      // 일반 사용자는 바로 삭제 확인 모달 표시
      onDeleteConfirmOpen();
    }
  };

  const handleTransferComplete = (selectedUserId) => {
    setNewOwnerId(selectedUserId);
    onTransferClose();
    // 소유권 이전 완료 후 삭제 확인 모달 표시
    onDeleteConfirmOpen();
  };

  // 브랜드 삭제 버튼 클릭
  const handleDeleteBrandClick = () => {
    if (!currentBrand) {
      toast({
        title: '오류',
        description: '브랜드 정보를 불러올 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    onDeleteBrandOpen();
  };

  // 브랜드 삭제 확인
  const confirmDeleteBrand = async (brandId) => {
    try {
      setIsDeletingBrand(true);

      // 권한 확인
      const permissionCheck = await canDeleteBrand(user.id, brandId);
      if (!permissionCheck.canDelete) {
        throw new Error(permissionCheck.reason);
      }

      // 브랜드 삭제
      const result = await deleteBrand(brandId, currentBrand.name);

      // 성공 여부 명시적 확인
      if (!result || !result.success) {
        throw new Error('브랜드 삭제 실패');
      }

      console.log('[ProfileEditModal] 브랜드 삭제 성공:', result);

      toast({
        title: '서비스 탈퇴 완료',
        description: `${currentBrand.name} 브랜드와 관련된 모든 데이터가 삭제되었습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      // 모달 닫기
      onDeleteBrandClose();
      onClose();

      // 로그아웃 및 리다이렉트
      setTimeout(async () => {
        await signOut();
        navigate('/auth/sign-in');
      }, 1000);
    } catch (error) {
      console.error('[ProfileEditModal] 브랜드 삭제 실패:', error);
      toast({
        title: '브랜드 삭제 실패',
        description: error.message || '삭제 중 오류가 발생했습니다. 브라우저 콘솔을 확인하거나 관리자에게 문의하세요.',
        status: 'error',
        duration: 8000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setIsDeletingBrand(false);
    }
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

            {/* 구분선 */}
            <Divider my={4} />

            {/* 회원탈퇴 섹션 */}
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm" fontWeight="500" color="red.500">
                위험 영역
              </Text>
              <Tooltip
                label={isMaster ? 'Master 계정은 삭제할 수 없습니다.' : ''}
                placement="top"
                hasArrow
              >
                <Button
                  leftIcon={<MdDelete />}
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteClick}
                  isDisabled={isMaster}
                >
                  회원탈퇴
                </Button>
              </Tooltip>
              {isMaster && (
                <Text fontSize="xs" color="gray.500">
                  Master 계정은 삭제할 수 없습니다.
                </Text>
              )}
              {!isMaster && (
                <Text fontSize="xs" color="gray.500">
                  본인 계정만 삭제됩니다. 브랜드는 유지됩니다.
                </Text>
              )}
            </VStack>

            {/* 브랜드 삭제 섹션 (advertiser_admin만) */}
            {isAdvertiserAdmin && currentBrand && (
              <>
                <Divider my={2} />
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="sm" fontWeight="500" color="red.600">
                    서비스 탈퇴
                  </Text>
                  <Button
                    leftIcon={<MdDelete />}
                    colorScheme="red"
                    size="sm"
                    onClick={handleDeleteBrandClick}
                  >
                    서비스 탈퇴 (브랜드 삭제)
                  </Button>
                  <Text fontSize="xs" color="red.400">
                    브랜드 및 소속된 모든 사용자, 데이터가 영구 삭제됩니다.
                  </Text>
                </VStack>
              </>
            )}
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

      {/* 소유권 이전 모달 (브랜드 대표운영자용) */}
      {isAdvertiserAdmin && (
        <OwnershipTransferModal
          isOpen={isTransferOpen}
          onClose={onTransferClose}
          onTransferComplete={handleTransferComplete}
          currentUser={{ ...user, advertiser_id: advertiserId }}
          onDeleteBrand={handleDeleteBrandClick}
        />
      )}

      {/* 회원탈퇴 확인 모달 */}
      <DeleteAccountConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={onDeleteConfirmClose}
        user={user}
        newOwnerId={newOwnerId}
      />

      {/* 브랜드 삭제 확인 모달 */}
      {currentBrand && (
        <DeleteBrandModal
          isOpen={isDeleteBrandOpen}
          onClose={onDeleteBrandClose}
          brand={currentBrand}
          onConfirm={confirmDeleteBrand}
          isLoading={isDeletingBrand}
        />
      )}
    </Modal>
  );
}
