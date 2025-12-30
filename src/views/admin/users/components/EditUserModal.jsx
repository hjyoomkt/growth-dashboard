import React, { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";
import { MdKeyboardArrowDown } from "react-icons/md";

export default function EditUserModal({ isOpen, onClose, user, onUpdate }) {
  const { isAgency, role: currentUserRole } = useAuth();
  const [formData, setFormData] = useState({
    role: "",
    advertiserIds: [], // 단일 → 다중 선택으로 변경
  });
  const [isLoading, setIsLoading] = useState(false);

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');

  // 권한 계층 구조 정의
  const roleHierarchy = {
    master: 8,
    org_admin: 7,            // 대행사 최고관리자
    org_manager: 6,          // 대행사 관리자
    org_staff: 5,            // 대행사 직원
    advertiser_admin: 4,     // 브랜드 대표운영자
    manager: 3,              // 브랜드 운영자
    editor: 2,               // 편집자
    viewer: 1,               // 뷰어
  };

  // 현재 사용자보다 낮거나 같은 권한만 부여 가능
  const canAssignRole = (targetRole) => {
    // org_admin은 절대 수정 불가 (master만 가능)
    if (targetRole === 'org_admin') {
      return false;
    }

    // 자신보다 높거나 같은 권한은 부여 불가
    return roleHierarchy[targetRole] < roleHierarchy[currentUserRole];
  };

  // Mock 클라이언트 목록 (대행사인 경우)
  const mockClients = [
    { id: "client-nike", name: "나이키" },
    { id: "client-adidas", name: "아디다스" },
    { id: "client-puma", name: "푸마" },
  ];

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
      viewer: '뷰어',
      editor: '편집자',
      manager: '브랜드 운영자',
      advertiser_admin: '브랜드 대표운영자',
      org_staff: '대행사 직원',
      org_manager: '대행사 부운영자',
      org_admin: '대행사 대표운영자',
    };
    return roleLabels[role] || role;
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    // TODO: Supabase에서 사용자 정보 업데이트
    console.log("사용자 정보 업데이트:", {
      userId: user.id || user.email,
      role: formData.role,
      advertiserIds: formData.advertiserIds,
    });

    // UI 업데이트 (부모 컴포넌트에 전달)
    if (onUpdate) {
      onUpdate(user.id || user.email, {
        role: formData.role,
        advertiserIds: formData.advertiserIds,
      });
    }

    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 500);

    /* Supabase 연동 시
    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: formData.role,
          advertiser_ids: formData.advertiserIds,
        })
        .eq('id', user.id);

      if (error) throw error;

      // UI 업데이트
      if (onUpdate) {
        onUpdate(user.id || user.email, {
          role: formData.role,
          advertiserIds: formData.advertiserIds,
        });
      }

      onClose();
    } catch (err) {
      console.error('업데이트 실패:', err);
    } finally {
      setIsLoading(false);
    }
    */
  };

  const handleClose = () => {
    setFormData({ role: "", advertiserIds: [] });
    onClose();
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>사용자 권한 변경</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="24px" align="stretch">
            {/* 사용자 정보 */}
            <Box>
              <Text fontSize="sm" color="gray.500" mb="8px">사용자</Text>
              <Text fontWeight="600" fontSize="md" color={textColor}>
                {user.name} ({user.email})
              </Text>

              {/* 현재 소속 브랜드 표시 */}
              {user.client && (
                <Text fontSize="sm" color="gray.600" mt="4px">
                  현재 소속: <Text as="span" fontWeight="600" color={brandColor}>{user.client}</Text>
                </Text>
              )}
              {user.clients && user.clients.length > 0 && (
                <Text fontSize="sm" color="gray.600" mt="4px">
                  현재 소속: <Text as="span" fontWeight="600" color={brandColor}>
                    {user.clients.join(", ")}
                  </Text>
                </Text>
              )}
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

                  <MenuItem
                    onClick={() => canAssignRole('manager') && handleRoleChange('manager')}
                    bg={formData.role === 'manager' ? brandColor : 'transparent'}
                    color={formData.role === 'manager' ? 'white' : textColor}
                    _hover={{
                      bg: formData.role === 'manager' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.role === 'manager' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='10px'
                    borderRadius='8px'
                    mt='4px'
                    isDisabled={!canAssignRole('manager')}
                    opacity={!canAssignRole('manager') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">브랜드 운영자</Text>
                      <Text fontSize="xs" opacity="0.8">어드민 접근 가능, 직원 관리 가능</Text>
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
                      <Text fontSize="xs" opacity="0.8">광고주 대표, 전체 관리 권한</Text>
                    </Box>
                  </MenuItem>

                  {isAgency() && (
                    <>
                      <MenuItem
                        onClick={() => canAssignRole('org_staff') && handleRoleChange('org_staff')}
                        bg={formData.role === 'org_staff' ? brandColor : 'transparent'}
                        color={formData.role === 'org_staff' ? 'white' : textColor}
                        _hover={{
                          bg: formData.role === 'org_staff' ? brandColor : bgHover,
                        }}
                        fontWeight={formData.role === 'org_staff' ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='10px'
                        borderRadius='8px'
                        mt='4px'
                        isDisabled={!canAssignRole('org_staff')}
                        opacity={!canAssignRole('org_staff') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">대행사 직원</Text>
                          <Text fontSize="xs" opacity="0.8">담당 브랜드 관리, 데이터 수정 가능</Text>
                        </Box>
                      </MenuItem>

                      <MenuItem
                        onClick={() => canAssignRole('org_manager') && handleRoleChange('org_manager')}
                        bg={formData.role === 'org_manager' ? brandColor : 'transparent'}
                        color={formData.role === 'org_manager' ? 'white' : textColor}
                        _hover={{
                          bg: formData.role === 'org_manager' ? brandColor : bgHover,
                        }}
                        fontWeight={formData.role === 'org_manager' ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='10px'
                        borderRadius='8px'
                        mt='4px'
                        isDisabled={!canAssignRole('org_manager')}
                        opacity={!canAssignRole('org_manager') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">대행사 부운영자</Text>
                          <Text fontSize="xs" opacity="0.8">대행사 직원, 브랜드 직원 관리 가능</Text>
                        </Box>
                      </MenuItem>

                      <MenuItem
                        onClick={() => canAssignRole('org_admin') && handleRoleChange('org_admin')}
                        bg={formData.role === 'org_admin' ? brandColor : 'transparent'}
                        color={formData.role === 'org_admin' ? 'white' : textColor}
                        _hover={{
                          bg: formData.role === 'org_admin' ? brandColor : bgHover,
                        }}
                        fontWeight={formData.role === 'org_admin' ? '600' : '500'}
                        fontSize='sm'
                        px='12px'
                        py='10px'
                        borderRadius='8px'
                        mt='4px'
                        isDisabled={!canAssignRole('org_admin')}
                        opacity={!canAssignRole('org_admin') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">대행사 대표운영자</Text>
                          <Text fontSize="xs" opacity="0.8">전체 시스템 관리</Text>
                        </Box>
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </Menu>
            </FormControl>

            {/* 브랜드 할당 (관리자급만 접근 가능) */}
            {(currentUserRole === 'master' || currentUserRole === 'org_admin' || currentUserRole === 'org_manager' || currentUserRole === 'advertiser_admin' || currentUserRole === 'manager') && (
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

                  {mockClients.map((client) => (
                    <HStack
                      key={client.id}
                      p="12px"
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={formData.advertiserIds.includes(client.id) ? brandColor : borderColor}
                      bg={formData.advertiserIds.includes(client.id) ? selectedBg : inputBg}
                      cursor="pointer"
                      onClick={() => {
                        const newIds = formData.advertiserIds.includes(client.id)
                          ? formData.advertiserIds.filter(id => id !== client.id)
                          : [...formData.advertiserIds, client.id];
                        setFormData({ ...formData, advertiserIds: newIds });
                      }}
                      _hover={{ borderColor: brandColor, bg: bgHover }}
                    >
                      <Box
                        w="16px"
                        h="16px"
                        borderRadius="4px"
                        border="2px solid"
                        borderColor={formData.advertiserIds.includes(client.id) ? brandColor : borderColor}
                        bg={formData.advertiserIds.includes(client.id) ? brandColor : 'transparent'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {formData.advertiserIds.includes(client.id) && (
                          <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                        )}
                      </Box>
                      <Text fontSize="sm" color={textColor} fontWeight="500">
                        {client.name}
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
          >
            저장
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
