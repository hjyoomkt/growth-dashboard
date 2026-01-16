import React, { useState } from "react";
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
  Alert,
  AlertIcon,
  Text,
  Code,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Box,
  Switch,
  HStack,
  useToast,
  IconButton,
  Flex,
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";
import { MdKeyboardArrowDown, MdContentCopy } from "react-icons/md";
import { createInviteCode, getAdvertiserOrganizations } from "services/supabaseService";

export default function InviteUserModal({ isOpen, onClose }) {
  const { isAgency, isMaster, role: currentUserRole, user, organizationId, advertiserId, availableAdvertisers } = useAuth();
  const toast = useToast();

  // 디버깅: 사용자 정보 출력
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔍 InviteUserModal 디버깅:');
      console.log('- currentUserRole:', currentUserRole);
      console.log('- advertiserId:', advertiserId);
      console.log('- availableAdvertisers:', availableAdvertisers);
    }
  }, [isOpen, currentUserRole, advertiserId, availableAdvertisers]);
  const [formData, setFormData] = useState({
    email: "",
    role: "viewer",
    advertiserIds: [], // 다중 광고주 할당 (배열로 변경)
    isNewAdvertiser: false, // 신규 광고주 등록 여부 (대행사 전용)
    isNewBrand: false, // 기존 조직에 새 브랜드 추가 (대행사 전용)
    targetOrganizationId: "", // 브랜드를 추가할 기존 조직 ID
  });
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const codeBgHover = useColorModeValue('gray.100', 'whiteAlpha.200');
  const readOnlyBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  // 조직 목록 조회
  React.useEffect(() => {
    if (isOpen && (isMaster() || currentUserRole === 'agency_admin' || currentUserRole === 'agency_manager')) {
      fetchOrganizations();
    }
  }, [isOpen, isMaster, currentUserRole]);

  const fetchOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const orgs = await getAdvertiserOrganizations({
        role: currentUserRole,
        organization_id: organizationId
      });
      setOrganizations(orgs);
    } catch (error) {
      console.error('조직 목록 조회 실패:', error);
      toast({
        title: '조직 목록 조회 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // 권한 계층 구조 정의
  const roleHierarchy = {
    master: 8,
    org_admin: 7,            // 대행사 최고관리자
    org_manager: 6,          // 대행사 관리자
    org_staff: 5,            // 대행사 직원
    advertiser_admin: 4,     // 클라이언트 최고관리자
    manager: 3,              // 클라이언트 관리자
    editor: 2,               // 편집자
    viewer: 1,               // 뷰어
  };

  // 현재 사용자보다 낮거나 같은 권한만 부여 가능
  const canAssignRole = (targetRole) => {
    // org_admin은 절대 초대 불가 (master만 생성 가능)
    if (targetRole === 'org_admin') {
      return false;
    }

    // 신규 광고주 초대 시: advertiser_admin만 가능
    if (formData.isNewAdvertiser) {
      return targetRole === 'advertiser_admin';
    }

    // 기존 조직에 신규 브랜드 추가 시: advertiser_admin만 가능
    if (formData.isNewBrand) {
      return targetRole === 'advertiser_admin';
    }

    // 대행사(org_admin, org_manager, org_staff)는 클라이언트 직원까지 모두 초대 가능
    if (['org_admin', 'org_manager', 'org_staff'].includes(currentUserRole)) {
      return ['org_manager', 'org_staff', 'advertiser_admin', 'manager', 'editor', 'viewer'].includes(targetRole);
    }

    // advertiser_admin이 초대하는 경우: manager, editor, viewer 가능
    if (currentUserRole === 'advertiser_admin') {
      return ['manager', 'editor', 'viewer'].includes(targetRole);
    }

    // manager가 초대하는 경우: editor, viewer만 가능
    if (currentUserRole === 'manager') {
      return ['editor', 'viewer'].includes(targetRole);
    }

    // 나머지는 계층 구조에 따라 판단 (낮은 권한만)
    return roleHierarchy[targetRole] < roleHierarchy[currentUserRole];
  };

  // 실제 클라이언트 목록 (availableAdvertisers 사용)
  // advertiser_admin, advertiser_staff는 자신의 브랜드만, agency/master는 모든 브랜드
  const clients = (availableAdvertisers || [])
    .filter(adv => {
      // advertiser_admin, advertiser_staff는 자신의 브랜드만 표시
      if (['advertiser_admin', 'advertiser_staff'].includes(currentUserRole) && advertiserId) {
        return adv.id === advertiserId;
      }
      // agency_admin, master 등은 모든 브랜드 표시
      return true;
    })
    .map(adv => ({
      id: adv.id,
      name: adv.name
    }));

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
      manager: '클라이언트 관리자',
      advertiser_admin: '클라이언트 최고관리자',
      org_staff: '대행사 직원',
      org_manager: '대행사 관리자',
      org_admin: '대행사 최고관리자',
    };
    return roleLabels[role] || role;
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // invite_type 결정
      let inviteType = 'existing_member'; // 기본값: 기존 조직 멤버 초대
      let targetOrgId = organizationId;
      let targetAdvId = formData.advertiserIds.length > 0 ? formData.advertiserIds[0] : advertiserId;

      if (formData.isNewAdvertiser) {
        // 에이전시에서 신규 클라이언트 초대 시
        inviteType = 'new_brand';
        targetOrgId = organizationId; // 에이전시의 organization_id 유지
        targetAdvId = null;
      } else if (formData.isNewBrand) {
        inviteType = 'new_brand';
        targetOrgId = formData.targetOrganizationId;
        targetAdvId = null;
      }

      // 조직 이름 가져오기
      let organizationName = null;
      if (targetOrgId) {
        // TODO: Supabase에서 organization name 조회
        organizationName = '해당 조직';
      }

      // Supabase에 초대 코드 생성
      const inviteData = {
        email: formData.email,
        role: formData.role,
        organizationId: targetOrgId,
        advertiserId: targetAdvId,
        createdBy: user.id,
        inviteType: inviteType,
        advertiserIds: formData.advertiserIds.length > 0 ? formData.advertiserIds : null,
        inviterName: user.name || '관리자',
        organizationName: organizationName,
      };

      const result = await createInviteCode(inviteData);
      setInviteCode(result.code);

      toast({
        title: '초대 코드 생성 완료',
        description: `${formData.email}님에게 초대 코드가 생성되었습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      console.log("초대 생성:", {
        email: formData.email,
        role: formData.role,
        code: result.code,
        inviteType: inviteType,
      });
    } catch (err) {
      console.error('초대 실패:', err);
      toast({
        title: '초대 코드 생성 실패',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "복사 완료",
        description: `${label}가 클립보드에 복사되었습니다.`,
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    } catch (err) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleClose = () => {
    setFormData({ email: "", role: "viewer", advertiserIds: [], isNewAdvertiser: false, isNewBrand: false });
    setInviteCode(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isAgency() ? '직원 초대' : '팀원 초대'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!inviteCode ? (
            <VStack spacing="24px">
              {/* 대행사 및 Master 전용: 신규 광고주 초대 옵션 */}
              {(isAgency() || isMaster()) && (
                <VStack spacing="16px" w="100%">
                  <FormControl>
                    <HStack justify="space-between" align="center">
                      <Box>
                        <FormLabel fontSize="sm" color={textColor} mb="4px">신규 클라이언트 조직 초대</FormLabel>
                        <Text fontSize="xs" color="gray.500">
                          새로운 광고주 회사를 등록하고 관리자를 초대합니다
                        </Text>
                      </Box>
                      <Switch
                        isChecked={formData.isNewAdvertiser}
                        onChange={(e) => {
                          const isNew = e.target.checked;
                          setFormData({
                            ...formData,
                            isNewAdvertiser: isNew,
                            isNewBrand: false, // 둘 중 하나만 선택 가능
                            role: isNew ? 'advertiser_admin' : 'viewer',
                            advertiserIds: isNew ? [] : formData.advertiserIds,
                          });
                        }}
                        colorScheme="brand"
                        size="lg"
                      />
                    </HStack>
                  </FormControl>

                  <FormControl>
                    <HStack justify="space-between" align="center">
                      <Box>
                        <FormLabel fontSize="sm" color={textColor} mb="4px">기존 브랜드에 하위 브랜드 추가</FormLabel>
                        <Text fontSize="xs" color="gray.500">
                          관리 중인 브랜드에 새로운 하위 브랜드를 추가합니다
                        </Text>
                      </Box>
                      <Switch
                        isChecked={formData.isNewBrand}
                        onChange={(e) => {
                          const isNew = e.target.checked;
                          setFormData({
                            ...formData,
                            isNewBrand: isNew,
                            isNewAdvertiser: false, // 둘 중 하나만 선택 가능
                            role: isNew ? 'advertiser_admin' : 'viewer',
                            advertiserIds: isNew ? [] : formData.advertiserIds,
                            targetOrganizationId: isNew ? "" : formData.targetOrganizationId,
                          });
                        }}
                        colorScheme="brand"
                        size="lg"
                      />
                    </HStack>
                  </FormControl>

                  {/* 하위 브랜드를 추가할 브랜드 선택 (isNewBrand일 때만) */}
                  {formData.isNewBrand && (
                    <FormControl isRequired>
                      <FormLabel fontSize="sm" color="gray.500">하위 브랜드를 추가할 기존 브랜드 선택</FormLabel>
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
                          {formData.targetOrganizationId
                            ? organizations.find(org => org.id === formData.targetOrganizationId)?.name
                            : isLoadingOrgs ? "로딩 중..." : "브랜드를 선택하세요"}
                        </MenuButton>
                        <MenuList minW='auto' w='400px' px='8px' py='8px'>
                          {organizations.map((org) => (
                            <MenuItem
                              key={org.id}
                              onClick={() => {
                                // 조직 선택 시 해당 조직의 최고관리자 이메일을 기본값으로 제안
                                setFormData({
                                  ...formData,
                                  targetOrganizationId: org.id,
                                  email: org.adminEmail, // 기본값 제안 (변경 가능)
                                });
                              }}
                              bg={formData.targetOrganizationId === org.id ? brandColor : 'transparent'}
                              color={formData.targetOrganizationId === org.id ? 'white' : textColor}
                              _hover={{
                                bg: formData.targetOrganizationId === org.id ? brandColor : bgHover,
                              }}
                              fontWeight={formData.targetOrganizationId === org.id ? '600' : '500'}
                              fontSize='sm'
                              px='12px'
                              py='10px'
                              borderRadius='8px'
                            >
                              <Box>
                                <Text>{org.name}</Text>
                                <Text fontSize="xs" opacity="0.7">관리자: {org.adminEmail}</Text>
                              </Box>
                            </MenuItem>
                          ))}
                        </MenuList>
                      </Menu>
                      {formData.targetOrganizationId && (
                        <Text fontSize="xs" color="gray.500" mt="8px">
                          선택한 브랜드 관리자 계정에 새 하위 브랜드 접근 권한이 추가됩니다
                        </Text>
                      )}
                    </FormControl>
                  )}
                </VStack>
              )}

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.500">
                  이메일 주소
                  {formData.isNewBrand && formData.targetOrganizationId && (
                    <Text as="span" fontSize="xs" color="gray.500" ml="8px">
                      (선택한 브랜드의 관리자 이메일이 기본값으로 입력됩니다)
                    </Text>
                  )}
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  h='44px'
                  borderRadius='12px'
                  _hover={{ borderColor: brandColor }}
                  _focus={{ borderColor: brandColor, boxShadow: `0 0 0 1px ${brandColor}` }}
                />
                {formData.isNewBrand && formData.targetOrganizationId && (
                  <Text fontSize="xs" color="gray.500" mt="4px">
                    다른 브랜드의 이메일을 입력하여 새로운 관리자를 지정할 수 있습니다
                  </Text>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.500">
                  권한
                  {(formData.isNewAdvertiser || formData.isNewBrand) && (
                    <Text as="span" fontSize="xs" color="gray.500" ml="8px">
                      (신규 클라이언트/하위 브랜드는 자동으로 관리자 권한)
                    </Text>
                  )}
                </FormLabel>
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
                        <Text fontWeight="600">관리자</Text>
                        <Text fontSize="xs" opacity="0.8">어드민 접근 가능, 직원 관리 가능</Text>
                      </Box>
                    </MenuItem>

                    {(isAgency() || isMaster()) && (
                      <>
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
                            <Text fontWeight="600">클라이언트 최고관리자</Text>
                            <Text fontSize="xs" opacity="0.8">광고주 대표, 전체 관리 권한</Text>
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
                            <Text fontWeight="600">대행사 관리자</Text>
                            <Text fontSize="xs" opacity="0.8">대행사 직원, 클라이언트 직원 관리 가능</Text>
                          </Box>
                        </MenuItem>

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
                            <Text fontSize="xs" opacity="0.8">담당 클라이언트 관리, 데이터 수정 가능</Text>
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
                            <Text fontWeight="600">대행사 최고관리자</Text>
                            <Text fontSize="xs" opacity="0.8">전체 시스템 관리</Text>
                          </Box>
                        </MenuItem>
                      </>
                    )}
                  </MenuList>
                </Menu>
              </FormControl>

              {/* 브랜드/클라이언트 선택 (관리자급만 접근 가능, 신규 광고주/브랜드 아닐 때만) */}
              {!formData.isNewAdvertiser && !formData.isNewBrand && (currentUserRole === 'master' || currentUserRole === 'org_admin' || currentUserRole === 'org_manager' || currentUserRole === 'advertiser_admin' || currentUserRole === 'advertiser_staff' || currentUserRole === 'manager') && (
                <FormControl>
                  <FormLabel fontSize="sm" color="gray.500">
                    {isAgency() ? '담당 클라이언트 (복수 선택 가능)' : '접근 가능한 브랜드 (복수 선택 가능)'}
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
                        전체 클라이언트
                      </Text>
                    </HStack>

                    {clients.map((client) => (
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
                      ? "전체 클라이언트 데이터에 접근할 수 있습니다."
                      : `${formData.advertiserIds.length}개 클라이언트 선택됨`}
                  </Text>
                </FormControl>
              )}

              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  초대 이메일이 발송되며, 7일 이내에 가입해야 합니다.
                </Text>
              </Alert>
            </VStack>
          ) : (
            <VStack spacing="16px" align="stretch">
              <Alert status="success" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">초대 코드가 생성되었습니다!</Text>
              </Alert>

              <FormControl>
                <FormLabel>초대 코드</FormLabel>
                <Flex gap="8px">
                  <Code
                    flex="1"
                    p="12px"
                    fontSize="lg"
                    fontWeight="bold"
                    borderRadius="8px"
                    cursor="pointer"
                    onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                    _hover={{ bg: codeBgHover }}
                    transition="all 0.2s"
                  >
                    {inviteCode}
                  </Code>
                  <IconButton
                    icon={<MdContentCopy />}
                    onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                    aria-label="초대 코드 복사"
                    colorScheme="brand"
                    variant="outline"
                    size="md"
                  />
                </Flex>
              </FormControl>

              <FormControl>
                <FormLabel>초대 링크</FormLabel>
                <Flex gap="8px">
                  <Code
                    flex="1"
                    p="12px"
                    fontSize="sm"
                    borderRadius="8px"
                    wordBreak="break-all"
                    cursor="pointer"
                    onClick={() => copyToClipboard(`${window.location.origin}/auth/sign-up?code=${inviteCode}`, "초대 링크")}
                    _hover={{ bg: codeBgHover }}
                    transition="all 0.2s"
                  >
                    {`${window.location.origin}/auth/sign-up?code=${inviteCode}`}
                  </Code>
                  <IconButton
                    icon={<MdContentCopy />}
                    onClick={() => copyToClipboard(`${window.location.origin}/auth/sign-up?code=${inviteCode}`, "초대 링크")}
                    aria-label="초대 링크 복사"
                    colorScheme="brand"
                    variant="outline"
                    size="md"
                  />
                </Flex>
              </FormControl>

              <Alert status="warning" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  이 코드를 {formData.email}에게 전달하거나, 초대 이메일을 확인하도록 안내하세요.
                </Text>
              </Alert>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {!inviteCode ? (
            <>
              <Button variant="ghost" mr={3} onClick={handleClose}>
                취소
              </Button>
              <Button
                colorScheme="brand"
                onClick={handleSubmit}
                isLoading={isLoading}
                isDisabled={!formData.email}
              >
                초대 코드 생성
              </Button>
            </>
          ) : (
            <Button colorScheme="brand" onClick={handleClose}>
              완료
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
