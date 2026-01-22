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
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Icon,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';

export default function BrandSelectModal({ isOpen, onClose, onNext }) {
  const { availableAdvertisers } = useAuth();
  const [selectedBrandId, setSelectedBrandId] = useState(null);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');

  const selectedBrand = availableAdvertisers.find(adv => adv.id === selectedBrandId);

  const handleNext = () => {
    if (selectedBrandId) {
      onNext(selectedBrandId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" fontWeight="700">
          브랜드 선택
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="500" mb={2}>
              연동할 브랜드를 선택하세요 *
            </FormLabel>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<Icon as={MdKeyboardArrowDown} />}
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontWeight="500"
                fontSize="sm"
                _hover={{ bg: bgHover }}
                _active={{ bg: bgHover }}
                px="16px"
                h="44px"
                borderRadius="12px"
                w="100%"
                textAlign="left"
              >
                {selectedBrand ? selectedBrand.name : '브랜드를 선택하세요'}
              </MenuButton>
              <MenuList minW="auto" w="fit-content" px="8px" py="8px" maxH="300px" overflowY="auto">
                {availableAdvertisers.map((advertiser) => (
                  <MenuItem
                    key={advertiser.id}
                    onClick={() => setSelectedBrandId(advertiser.id)}
                    bg={selectedBrandId === advertiser.id ? brandColor : 'transparent'}
                    color={selectedBrandId === advertiser.id ? 'white' : textColor}
                    _hover={{
                      bg: selectedBrandId === advertiser.id ? brandColor : bgHover,
                    }}
                    fontWeight={selectedBrandId === advertiser.id ? '600' : '500'}
                    fontSize="sm"
                    px="12px"
                    py="8px"
                    borderRadius="8px"
                    justifyContent="center"
                    textAlign="center"
                    minH="auto"
                  >
                    {advertiser.name}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </FormControl>

          <Text fontSize="xs" color="secondaryGray.600" mt={3}>
            선택한 브랜드의 Google Ads 계정에 연동됩니다.
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="brand"
            mr={3}
            onClick={handleNext}
            isDisabled={!selectedBrandId}
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
