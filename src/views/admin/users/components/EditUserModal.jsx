import React, { useState, useEffect, useRef } from "react";
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
  VStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Box,
  HStack,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";
import { MdKeyboardArrowDown } from "react-icons/md";
import { updateUserRoleAndAdvertisers, logChangelog } from "services/supabaseService";
import { supabase } from "config/supabase";

export default function EditUserModal({ isOpen, onClose, user, onUpdate }) {
  const { isAgency, role: currentUserRole, isMaster, organizationType, availableAdvertisers, user: currentUser } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    role: "",
    advertiserIds: [], // 단일 → 다중 선택으로 변경
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const cancelRef = useRef();

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');

  // 권한 계층 구조 정의 (master 제외 - UI에서 변경 불가)
  const roleHierarchy = {
    agency_admin: 7,            // 에이전시 대표
    agency_manager: 6,          // 에이전시 관리자
    agency_staff: 5,            // 에이전시 직원
    advertiser_admin: 4,        // 브랜드 대표운영자
    advertiser_staff: 3,        // 브랜드 부운영자
    editor: 2,                  // 편집자
    viewer: 1,                  // 뷰어
  };

  // 현재 사용자보다 낮은 권한만 부여 가능 (동급 차단, 하위는 허용)
  const canAssignRole = (targetRole) => {
    // Master 권한은 UI에서 절대 변경 불가
    if (targetRole === 'master') {
      return false;
    }

    // Master는 모든 권한 부여 가능 (master 제외)
    if (isMaster()) {
      return true;
    }

    // 자신보다 높거나 같은 권한은 부여 불가 (동급 차단, 하위는 허용)
    return roleHierarchy[targetRole] < roleHierarchy[currentUserRole];
  };

  // 수정 가능한 사용자인지 체크 (자기보다 낮은 권한만, 동급은 불가)
  const canEditUser = (targetUser) => {
    if (!targetUser) return false;

    // Master는 모든 사용자 수정 가능 (단, 다른 Master는 수정 불가)
    if (isMaster()) {
      return targetUser.role !== 'master';
    }

    // 대상 사용자의 권한이 자신보다 낮아야 수정 가능 (동급은 불가)
    const targetRoleLevel = roleHierarchy[targetUser.role] || 0;
    const currentRoleLevel = roleHierarchy[currentUserRole] || 0;

    console.log('[canEditUser] 권한 체크:', {
      currentUserRole,
      currentRoleLevel,
      targetUserRole: targetUser.role,
      targetRoleLevel,
      canEdit: targetRoleLevel < currentRoleLevel
    });

    return targetRoleLevel < currentRoleLevel;
  };

  // 실제 광고주 목록 (AuthContext에서 가져옴 + 그룹 브랜드 포함)
  const [advertisers, setAdvertisers] = useState([]);

  // 그룹 브랜드 포함하여 조회
  useEffect(() => {
    const fetchGroupAdvertisers = async () => {
      if (!availableAdvertisers || availableAdvertisers.length === 0) {
        setAdvertisers([]);
        return;
      }

      try {
        // 내 브랜드 IDs
        const myAdvertiserIds = availableAdvertisers.map(adv => adv.id);

        // advertiser_group_id 조회
        const { data: myAdvertisers } = await supabase
          .from('advertisers')
          .select('id, advertiser_group_id')
          .in('id', myAdvertiserIds);

        const groupIds = [...new Set(
          myAdvertisers.map(adv => adv.advertiser_group_id).filter(Boolean)
        )];

        // 같은 그룹의 모든 브랜드 ID
        let allBrandIds = [...myAdvertiserIds];

        if (groupIds.length > 0) {
          const { data: groupBrands } = await supabase
            .from('advertisers')
            .select('id')
            .in('advertiser_group_id', groupIds);

          allBrandIds = [
            ...allBrandIds,
            ...groupBrands.map(adv => adv.id)
          ];
        }

        // 중복 제거
        allBrandIds = [...new Set(allBrandIds)];

        // 전체 브랜드 정보 조회
        const { data: allBrands } = await supabase
          .from('advertisers')
          .select('id, name')
          .in('id', allBrandIds)
          .is('deleted_at', null)
          .order('name');

        setAdvertisers(allBrands || []);
      } catch (error) {
        console.error('그룹 브랜드 조회 실패:', error);
        setAdvertisers(availableAdvertisers || []);
      }
    };

    fetchGroupAdvertisers();
  }, [availableAdvertisers]);

  useEffect(() => {
    if (user) {
      // user.client가 문자열인 경우 배열로 변환 (이전 버전 호환성)
      const clientIds = user.advertiserIds || (user.client ? [user.client] : []);
      setFormData({
        role: user.role || "",
        advertiserIds: clientIds,
      });
    }
  }, [user]);

  const handleRoleChange = (newRole) => {
    setFormData({
      ...formData,
      role: newRole,
    });
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      master: '마스터',
      agency_admin: '에이전시 대표',
      agency_manager: '에이전시 관리자',
      agency_staff: '에이전시 직원',
      advertiser_admin: '브랜드 대표운영자',
      advertiser_staff: '브랜드 부운영자',
      editor: '편집자',
      viewer: '뷰어',
    };
    return roleLabels[role] || role;
  };

  // 브랜드 권한 목록
  const BRAND_ROLES = ['viewer', 'editor', 'advertiser_admin', 'advertiser_staff'];

  // 담당 브랜드가 변경되었는지 확인
  const isBrandChanged = () => {
    const originalIds = user.advertiserIds || [];
    const newIds = formData.advertiserIds || [];

    // 배열 길이가 다르면 변경됨
    if (originalIds.length !== newIds.length) return true;

    // 정렬 후 비교
    const sortedOriginal = [...originalIds].sort();
    const sortedNew = [...newIds].sort();

    return !sortedOriginal.every((id, index) => id === sortedNew[index]);
  };

  // 실제 저장 로직
  const performSave = async () => {
    setIsLoading(true);

    try {
      // Supabase에서 사용자 역할 및 브랜드 접근 권한 업데이트
      const updatedUser = await updateUserRoleAndAdvertisers(
        user.id,
        formData.role,
        formData.advertiserIds,
        { ...currentUser, role: currentUserRole } // role 필드 추가
      );

      console.log("사용자 정보 업데이트 성공:", updatedUser);

      // 변경 로그 기록
      await logChangelog({
        targetType: 'role',
        targetId: user.id,
        targetName: user.name || user.email,
        actionType: 'update',
        actionDetail: `${user.name || user.email}의 권한 변경: ${getRoleLabel(user.role)} → ${getRoleLabel(formData.role)}`,
        advertiserId: user.advertiser_id,
        advertiserName: user.advertiser_name,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        oldValue: { role: user.role },
        newValue: { role: formData.role },
      });

      toast({
        title: "업데이트 완료",
        description: "사용자 권한 및 브랜드 접근 권한이 성공적으로 변경되었습니다.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // UI 업데이트 (부모 컴포넌트에 전달)
      if (onUpdate) {
        onUpdate(user.id, {
          role: formData.role,
          advertiserIds: formData.advertiserIds,
        });
      }

      onClose();
    } catch (err) {
      console.error('업데이트 실패:', err);

      toast({
        title: "업데이트 실패",
        description: err.message || "사용자 정보를 업데이트하는 중 오류가 발생했습니다.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 저장 버튼 클릭 시 처리
  const handleSubmit = () => {
    // 브랜드 권한을 가진 사용자의 담당 브랜드가 변경되었는지 확인
    if (BRAND_ROLES.includes(formData.role) && isBrandChanged()) {
      // 확인 다이얼로그 표시
      setIsConfirmOpen(true);
    } else {
      // 바로 저장
      performSave();
    }
  };

  // 확인 다이얼로그에서 "예" 클릭 시
  const handleConfirmSave = () => {
    setIsConfirmOpen(false);
    performSave();
  };

  // 확인 다이얼로그에서 "아니요" 클릭 시
  const handleCancelSave = () => {
    setIsConfirmOpen(false);
  };

  const handleClose = () => {
    setFormData({ role: "", advertiserIds: [] });
    onClose();
  };

  if (!user) return null;

  // 수정 권한 체크
  const hasEditPermission = canEditUser(user);

  return (
    <>
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>사용자 권한 변경</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="24px" align="stretch">
            {/* 권한 없음 경고 */}
            {!hasEditPermission && (
              <Box
                p="12px"
                bg="red.50"
                border="1px solid"
                borderColor="red.200"
                borderRadius="8px"
              >
                <Text fontSize="sm" color="red.600" fontWeight="600">
                  ⚠️ 이 사용자를 수정할 권한이 없습니다
                </Text>
                <Text fontSize="xs" color="red.500" mt="4px">
                  자신과 동급이거나 상위 권한을 가진 사용자는 수정할 수 없습니다.
                </Text>
              </Box>
            )}

            {/* 사용자 정보 */}
            <Box>
              <Text fontSize="sm" color="gray.500" mb="8px">사용자</Text>
              <Text fontWeight="600" fontSize="md" color={textColor}>
                {user.name} ({user.email})
              </Text>

              {/* 현재 소속 브랜드 표시 */}
              {user.clients && user.clients.length > 0 ? (
                <Text fontSize="sm" color="gray.600" mt="4px">
                  현재 소속: <Text as="span" fontWeight="600" color={brandColor}>
                    {user.clients.join(", ")}
                  </Text>
                </Text>
              ) : user.client ? (
                <Text fontSize="sm" color="gray.600" mt="4px">
                  현재 소속: <Text as="span" fontWeight="600" color={brandColor}>{user.client}</Text>
                </Text>
              ) : null}
            </Box>

            {/* 권한 변경 */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.500">권한 변경</FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<MdKeyboardArrowDown />}
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  fontWeight='500'
                  fontSize='sm'
                  _hover={{ bg: bgHover }}
                  _active={{ bg: bgHover }}
                  w="100%"
                  h='44px'
                  borderRadius='12px'
                  textAlign="left"
                >
                  {getRoleLabel(formData.role)}
                </MenuButton>
                <MenuList minW='auto' w='300px' px='8px' py='8px'>
                  {/* 일반 권한 */}
                  <MenuItem
                    onClick={() => canAssignRole('viewer') && handleRoleChange('viewer')}
                    bg={formData.role === 'viewer' ? brandColor : 'transparent'}
                    color={formData.role === 'viewer' ? 'white' : textColor}
                    _hover={{
                      bg: formData.role === 'viewer' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.role === 'viewer' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='10px'
                    borderRadius='8px'
                    isDisabled={!canAssignRole('viewer')}
                    opacity={!canAssignRole('viewer') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">뷰어</Text>
                      <Text fontSize="xs" opacity="0.8">읽기 전용 권한</Text>
                    </Box>
                  </MenuItem>

                  <MenuItem
                    onClick={() => canAssignRole('editor') && handleRoleChange('editor')}
                    bg={formData.role === 'editor' ? brandColor : 'transparent'}
                    color={formData.role === 'editor' ? 'white' : textColor}
                    _hover={{
                      bg: formData.role === 'editor' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.role === 'editor' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='10px'
                    borderRadius='8px'
                    mt='4px'
                    isDisabled={!canAssignRole('editor')}
                    opacity={!canAssignRole('editor') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">편집자</Text>
                      <Text fontSize="xs" opacity="0.8">데이터 수정 가능</Text>
                    </Box>
                  </MenuItem>

                  {/* 브랜드 권한 */}
                  <MenuItem
                    onClick={() => canAssignRole('advertiser_staff') && handleRoleChange('advertiser_staff')}
                    bg={formData.role === 'advertiser_staff' ? brandColor : 'transparent'}
                    color={formData.role === 'advertiser_staff' ? 'white' : textColor}
                    _hover={{
                      bg: formData.role === 'advertiser_staff' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.role === 'advertiser_staff' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='10px'
                    borderRadius='8px'
                    mt='4px'
                    isDisabled={!canAssignRole('advertiser_staff')}
                    opacity={!canAssignRole('advertiser_staff') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">브랜드 부운영자</Text>
                      <Text fontSize="xs" opacity="0.8">브랜드 어드민 접근 가능</Text>
                    </Box>
                  </MenuItem>

                  <MenuItem
                    onClick={() => canAssignRole('advertiser_admin') && handleRoleChange('advertiser_admin')}
                    bg={formData.role === 'advertiser_admin' ? brandColor : 'transparent'}
                    color={formData.role === 'advertiser_admin' ? 'white' : textColor}
                    _hover={{
                      bg: formData.role === 'advertiser_admin' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.role === 'advertiser_admin' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='10px'
                    borderRadius='8px'
                    mt='4px'
                    isDisabled={!canAssignRole('advertiser_admin')}
                    opacity={!canAssignRole('advertiser_admin') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">브랜드 대표운영자</Text>
                      <Text fontSize="xs" opacity="0.8">브랜드 어드민 접근, 전체 관리 권한</Text>
                    </Box>
                  </MenuItem>

                  {/* 에이전시 권한 (마스터 또는 agency) */}
                  {(isMaster() || organizationType === 'agency') && (
                    <>
                      <MenuItem
                        onClick={() => canAssignRole('agency_staff') && handleRoleChange('agency_staff')}
                        bg={formData.role === 'agency_staff' ? brandColor : 'transparent'}
                        color={formData.role === 'agency_staff' ? 'white' : textColor}
                        _hover={{
                          bg: formData.role === 'agency_staff' ? brandColor : bgHover,
                        }}
                        fontWeight={formData.role === 'agency_staff' ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='10px'
                        borderRadius='8px'
                        mt='4px'
                        isDisabled={!canAssignRole('agency_staff')}
                        opacity={!canAssignRole('agency_staff') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">에이전시 직원</Text>
                          <Text fontSize="xs" opacity="0.8">담당 브랜드 관리, 데이터 수정</Text>
                        </Box>
                      </MenuItem>

                      <MenuItem
                        onClick={() => canAssignRole('agency_manager') && handleRoleChange('agency_manager')}
                        bg={formData.role === 'agency_manager' ? brandColor : 'transparent'}
                        color={formData.role === 'agency_manager' ? 'white' : textColor}
                        _hover={{
                          bg: formData.role === 'agency_manager' ? brandColor : bgHover,
                        }}
                        fontWeight={formData.role === 'agency_manager' ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='10px'
                        borderRadius='8px'
                        mt='4px'
                        isDisabled={!canAssignRole('agency_manager')}
                        opacity={!canAssignRole('agency_manager') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">에이전시 관리자</Text>
                          <Text fontSize="xs" opacity="0.8">슈퍼 어드민 접근, 직원 관리</Text>
                        </Box>
                      </MenuItem>

                      <MenuItem
                        onClick={() => canAssignRole('agency_admin') && handleRoleChange('agency_admin')}
                        bg={formData.role === 'agency_admin' ? brandColor : 'transparent'}
                        color={formData.role === 'agency_admin' ? 'white' : textColor}
                        _hover={{
                          bg: formData.role === 'agency_admin' ? brandColor : bgHover,
                        }}
                        fontWeight={formData.role === 'agency_admin' ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='10px'
                        borderRadius='8px'
                        mt='4px'
                        isDisabled={!canAssignRole('agency_admin')}
                        opacity={!canAssignRole('agency_admin') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">에이전시 대표</Text>
                          <Text fontSize="xs" opacity="0.8">슈퍼 어드민 접근, 대행사 전체 관리</Text>
                        </Box>
                      </MenuItem>
                    </>
                  )}

                </MenuList>
              </Menu>
            </FormControl>

            {/* 브랜드 할당 (관리자급만 접근 가능) */}
            {(currentUserRole === 'master' || currentUserRole === 'agency_admin' || currentUserRole === 'agency_manager' || currentUserRole === 'advertiser_admin' || currentUserRole === 'advertiser_staff') && (
              <FormControl>
                <FormLabel fontSize="sm" color="gray.500">
                  {isAgency() ? '담당 브랜드 (복수 선택 가능)' : '접근 가능한 브랜드 (복수 선택 가능)'}
                </FormLabel>
                <VStack align="stretch" spacing="8px">
                  {/* 전체 선택 옵션 */}
                  <HStack
                    p="12px"
                    borderRadius="8px"
                    border="1px solid"
                    borderColor={formData.advertiserIds.length === 0 ? brandColor : borderColor}
                    bg={formData.advertiserIds.length === 0 ? selectedBg : inputBg}
                    cursor="pointer"
                    onClick={() => {
                      setFormData({ ...formData, advertiserIds: [] });
                    }}
                    _hover={{ borderColor: brandColor, bg: bgHover }}
                  >
                    <Box
                      w="16px"
                      h="16px"
                      borderRadius="4px"
                      border="2px solid"
                      borderColor={formData.advertiserIds.length === 0 ? brandColor : borderColor}
                      bg={formData.advertiserIds.length === 0 ? brandColor : 'transparent'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {formData.advertiserIds.length === 0 && (
                        <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                      )}
                    </Box>
                    <Text fontSize="sm" color={textColor} fontWeight="600">
                      전체 브랜드
                    </Text>
                  </HStack>

                  {advertisers.map((advertiser) => (
                    <HStack
                      key={advertiser.id}
                      p="12px"
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={formData.advertiserIds.includes(advertiser.id) ? brandColor : borderColor}
                      bg={formData.advertiserIds.includes(advertiser.id) ? selectedBg : inputBg}
                      cursor="pointer"
                      onClick={() => {
                        const newIds = formData.advertiserIds.includes(advertiser.id)
                          ? formData.advertiserIds.filter(id => id !== advertiser.id)
                          : [...formData.advertiserIds, advertiser.id];
                        setFormData({ ...formData, advertiserIds: newIds });
                      }}
                      _hover={{ borderColor: brandColor, bg: bgHover }}
                    >
                      <Box
                        w="16px"
                        h="16px"
                        borderRadius="4px"
                        border="2px solid"
                        borderColor={formData.advertiserIds.includes(advertiser.id) ? brandColor : borderColor}
                        bg={formData.advertiserIds.includes(advertiser.id) ? brandColor : 'transparent'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {formData.advertiserIds.includes(advertiser.id) && (
                          <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                        )}
                      </Box>
                      <Text fontSize="sm" color={textColor} fontWeight="500">
                        {advertiser.name}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
                <Text fontSize="xs" color="gray.500" mt="8px">
                  {formData.advertiserIds.length === 0
                    ? "전체 브랜드 데이터에 접근할 수 있습니다."
                    : `${formData.advertiserIds.length}개 브랜드 선택됨`}
                </Text>
              </FormControl>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            취소
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!hasEditPermission}
          >
            저장
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* 브랜드 변경 확인 다이얼로그 */}
    <AlertDialog
      isOpen={isConfirmOpen}
      leastDestructiveRef={cancelRef}
      onClose={handleCancelSave}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            담당 브랜드 변경 확인
          </AlertDialogHeader>

          <AlertDialogBody>
            타 광고주 목록이 선택된 것이 아닌지 주의하세요.
            <br />
            정말 변경하시겠습니까?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={handleCancelSave}>
              아니요
            </Button>
            <Button colorScheme="brand" onClick={handleConfirmSave} ml={3}>
              예
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  </>
  );
}
