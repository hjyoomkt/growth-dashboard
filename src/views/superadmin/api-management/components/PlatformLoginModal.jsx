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
  SimpleGrid,
  Box,
  Icon,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { FaGoogle } from 'react-icons/fa';
import { SiMeta, SiNaver } from 'react-icons/si';
import { RiKakaoTalkFill } from 'react-icons/ri';

export default function PlatformLoginModal({ isOpen, onClose, onPlatformSelect }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');
  const disabledBg = useColorModeValue('gray.100', 'whiteAlpha.50');
  const disabledColor = useColorModeValue('gray.400', 'whiteAlpha.400');

  const handlePlatformClick = (platform) => {
    if (platform === 'Google Ads') {
      onPlatformSelect(platform);
    }
  };

  const platforms = [
    {
      name: 'Google Ads',
      icon: FaGoogle,
      color: 'red.500',
      enabled: true,
    },
    {
      name: 'Meta Ads',
      icon: SiMeta,
      color: 'blue.600',
      enabled: false,
    },
    {
      name: 'Naver',
      icon: SiNaver,
      color: 'green.500',
      enabled: false,
    },
    {
      name: 'Kakao',
      icon: RiKakaoTalkFill,
      color: 'yellow.500',
      enabled: false,
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg" fontWeight="700">
          매체 로그인
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text fontSize="sm" color="secondaryGray.600" mb={4}>
            연동할 광고 매체를 선택하세요
          </Text>
          <SimpleGrid columns={2} spacing={4}>
            {platforms.map((platform) => (
              <Box
                key={platform.name}
                as={platform.enabled ? 'button' : 'div'}
                onClick={() => handlePlatformClick(platform.name)}
                p="20px"
                bg={platform.enabled ? 'transparent' : disabledBg}
                border="2px solid"
                borderColor={platform.enabled ? 'gray.200' : disabledBg}
                borderRadius="16px"
                cursor={platform.enabled ? 'pointer' : 'not-allowed'}
                _hover={
                  platform.enabled
                    ? {
                        borderColor: brandColor,
                        bg: bgHover,
                      }
                    : {}
                }
                transition="all 0.2s"
                opacity={platform.enabled ? 1 : 0.5}
              >
                <VStack spacing={3}>
                  <Icon
                    as={platform.icon}
                    w="40px"
                    h="40px"
                    color={platform.enabled ? platform.color : disabledColor}
                  />
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color={platform.enabled ? textColor : disabledColor}
                  >
                    {platform.name}
                  </Text>
                  {!platform.enabled && (
                    <Text fontSize="xs" color={disabledColor} fontWeight="500">
                      준비 중
                    </Text>
                  )}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} fontSize="sm" fontWeight="500">
            닫기
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
