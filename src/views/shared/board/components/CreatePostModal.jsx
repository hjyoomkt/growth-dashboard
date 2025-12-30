import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Text,
  Box,
  Checkbox,
  CheckboxGroup,
  Stack,
  useColorModeValue,
  VStack,
  Divider,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Icon,
} from '@chakra-ui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';

export default function CreatePostModal({ isOpen, onClose, onAddPost, boardType = 'admin' }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const bgColor = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');

  const { role, availableAdvertisers, addBoardNotification, advertiserId } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);

  // 브랜드 관리자인지 확인 (advertiser_admin, manager)
  const isBrandAdmin = ['advertiser_admin', 'manager'].includes(role);

  // 초기 대상 타입 설정: 브랜드 게시판이거나 브랜드 관리자는 'my_brands', 슈퍼어드민은 'all'
  const [targetType, setTargetType] = useState(
    (boardType === 'brand' || isBrandAdmin) ? 'my_brands' : 'all'
  );

  // Superadmin 권한 여부 (master, org_admin, org_manager)
  const isSuperAdmin = ['master', 'org_admin', 'org_manager'].includes(role);

  // 브랜드 관리자의 경우 보유 브랜드만 필터링
  const myBrands = isBrandAdmin
    ? availableAdvertisers.filter(adv => adv.id === advertiserId)
    : availableAdvertisers;

  // 대상 선택 옵션 (Superadmin vs Brand Manager)
  const getTargetOptions = () => {
    // 브랜드 게시판에서는 브랜드 옵션만 표시
    if (boardType === 'brand') {
      return [
        { value: 'my_brands', label: '내 브랜드만' },
        { value: 'specific_brands', label: '특정 브랜드 선택' },
      ];
    }

    // 슈퍼어드민 게시판에서는 권한에 따라 표시
    if (isSuperAdmin) {
      return [
        { value: 'all', label: '모든 사용자 (대행사 + 브랜드)' },
        { value: 'agency', label: '대행사 소속만' },
        { value: 'all_brands', label: '모든 브랜드' },
        { value: 'specific_brands', label: '특정 브랜드 선택' },
      ];
    } else {
      // Brand Manager (advertiser_admin, manager)
      return [
        { value: 'my_brands', label: '내 브랜드만' },
        { value: 'specific_brands', label: '특정 브랜드 선택' },
      ];
    }
  };

  const handleSubmit = () => {
    // TODO: Supabase 연동 시 실제 게시글 생성 로직 구현
    console.log('Creating post:', { title, content, targetType, selectedBrands });

    const postId = Date.now();
    const targetLabels =
      targetType === 'all' ? ['모든 사용자'] :
      targetType === 'agency' ? ['대행사 소속'] :
      targetType === 'all_brands' ? ['모든 브랜드'] :
      targetType === 'my_brands' ? ['내 브랜드'] :
      selectedBrands.map(brandId => {
        const brand = availableAdvertisers.find(a => a.id === brandId);
        return brand ? brand.name : brandId;
      });

    const newPost = {
      id: postId,
      title: title,
      author: 'Admin',
      date: new Date().toLocaleDateString('ko-KR'),
      targets: targetLabels,
      isRead: false,
      content: content,
    };

    // 게시판에 게시글 추가
    if (onAddPost) {
      onAddPost(newPost);
    }

    // 알림 생성 (실제로는 게시글 대상에게만 알림이 가도록 구현)
    addBoardNotification({
      title: '새 게시글',
      message: title,
      postId: postId,
      postTitle: title,
      postContent: content,
      author: 'Admin',
      date: new Date().toLocaleDateString('ko-KR'),
      targets: targetLabels,
    });

    // 폼 초기화 및 모달 닫기
    setTitle('');
    setContent('');
    setTargetType('all');
    setSelectedBrands([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          <Text color={textColor} fontSize="xl" fontWeight="700">
            게시글 작성
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="20px">
            {/* 제목 */}
            <FormControl>
              <FormLabel color={textColor} fontSize="sm" fontWeight="600">
                제목
              </FormLabel>
              <Input
                placeholder="게시글 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fontSize="sm"
              />
            </FormControl>

            {/* 대상 선택 */}
            <FormControl>
              <FormLabel color={textColor} fontSize="sm" fontWeight="500" mb={2}>
                알림 대상
              </FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<Icon as={MdKeyboardArrowDown} />}
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  fontWeight='500'
                  fontSize='sm'
                  _hover={{ bg: bgHover }}
                  _active={{ bg: bgHover }}
                  px='16px'
                  h='44px'
                  borderRadius='12px'
                  textAlign='left'
                  w="100%"
                >
                  {getTargetOptions().find(opt => opt.value === targetType)?.label || '대상 선택'}
                </MenuButton>
                <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                  {getTargetOptions().map((option) => (
                    <MenuItem
                      key={option.value}
                      onClick={() => {
                        setTargetType(option.value);
                        setSelectedBrands([]);
                      }}
                      bg={targetType === option.value ? brandColor : 'transparent'}
                      color={targetType === option.value ? 'white' : textColor}
                      _hover={{
                        bg: targetType === option.value ? brandColor : bgHover,
                      }}
                      fontWeight={targetType === option.value ? '600' : '500'}
                      fontSize='sm'
                      px='12px'
                      py='8px'
                      borderRadius='8px'
                      justifyContent='center'
                      textAlign='center'
                      minH='auto'
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </FormControl>

            {/* 특정 브랜드 선택 */}
            {targetType === 'specific_brands' && (
              <FormControl>
                <FormLabel color={textColor} fontSize="sm" fontWeight="600" mb="12px">
                  브랜드 선택
                </FormLabel>
                <Box
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="8px"
                  p="12px"
                  maxH="200px"
                  overflowY="auto"
                >
                  <CheckboxGroup
                    value={selectedBrands}
                    onChange={(values) => setSelectedBrands(values)}
                  >
                    <Stack spacing="8px">
                      {myBrands.map((brand) => (
                        <Checkbox key={brand.id} value={brand.id} fontSize="sm">
                          {brand.name}
                        </Checkbox>
                      ))}
                    </Stack>
                  </CheckboxGroup>
                </Box>
              </FormControl>
            )}

            <Divider />

            {/* 내용 */}
            <FormControl>
              <FormLabel color={textColor} fontSize="sm" fontWeight="600">
                내용
              </FormLabel>
              <Textarea
                placeholder="게시글 내용을 입력하세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                fontSize="sm"
                minH="200px"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr="12px" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="brand"
            onClick={handleSubmit}
            isDisabled={!title || !content}
          >
            게시
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
