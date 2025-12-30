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
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdKeyboardArrowDown } from "react-icons/md";

export default function CreateOrganizationModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "advertiser",
    businessNumber: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Color mode values
  const inputBg = useColorModeValue('white', 'navy.700');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // TODO: Supabase에 조직 생성
    console.log("Create organization:", formData);
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>새 조직 생성</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="16px">
            <FormControl isRequired>
              <FormLabel>조직 유형</FormLabel>
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
                  h='36px'
                  borderRadius='12px'
                  w='100%'
                  textAlign='left'>
                  {formData.type === 'advertiser' ? '광고주 (직접 운영)' : '광고대행사 (다수 클라이언트 관리)'}
                </MenuButton>
                <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                  <MenuItem
                    onClick={() => setFormData({ ...formData, type: 'advertiser' })}
                    bg={formData.type === 'advertiser' ? brandColor : 'transparent'}
                    color={formData.type === 'advertiser' ? 'white' : textColor}
                    _hover={{
                      bg: formData.type === 'advertiser' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.type === 'advertiser' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    justifyContent='center'
                    textAlign='center'
                    minH='auto'>
                    광고주 (직접 운영)
                  </MenuItem>
                  <MenuItem
                    onClick={() => setFormData({ ...formData, type: 'agency' })}
                    bg={formData.type === 'agency' ? brandColor : 'transparent'}
                    color={formData.type === 'agency' ? 'white' : textColor}
                    _hover={{
                      bg: formData.type === 'agency' ? brandColor : bgHover,
                    }}
                    fontWeight={formData.type === 'agency' ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    justifyContent='center'
                    textAlign='center'
                    minH='auto'>
                    광고대행사 (다수 클라이언트 관리)
                  </MenuItem>
                </MenuList>
              </Menu>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>조직명</FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="예: 나이키 코리아"
              />
            </FormControl>

            <FormControl>
              <FormLabel>사업자등록번호</FormLabel>
              <Input
                name="businessNumber"
                value={formData.businessNumber}
                onChange={handleChange}
                placeholder="예: 123-45-67890"
              />
            </FormControl>

            <FormControl>
              <FormLabel>담당자 이메일</FormLabel>
              <Input
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="contact@example.com"
              />
            </FormControl>

            <FormControl>
              <FormLabel>담당자 연락처</FormLabel>
              <Input
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="02-1234-5678"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            취소
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            생성
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
