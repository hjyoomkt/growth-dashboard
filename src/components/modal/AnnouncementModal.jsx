import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Button,
  VStack,
  Image,
  Flex,
} from '@chakra-ui/react';

/**
 * 재사용 가능한 공지사항 팝업 모달 컴포넌트
 *
 * @param {boolean} isOpen - 모달 표시 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {string} title - 메인 타이틀
 * @param {string} subtitle - 부제목/설명
 * @param {string} imageSrc - 메인 이미지 경로
 * @param {string} buttonText - 버튼 텍스트
 * @param {function} onButtonClick - 버튼 클릭 핸들러
 * @param {number} currentSlide - 현재 슬라이드 번호 (선택)
 * @param {number} totalSlides - 전체 슬라이드 수 (선택)
 */
export default function AnnouncementModal({
  isOpen,
  onClose,
  title = '경쟁사 광고 모니터링은 제스트닷에서',
  subtitle = '실시간 광고 데이터 분석과 경쟁사 광고 모니터링을 한 곳에서 확인하세요!',
  imageSrc,
  buttonText = '더 알아보기',
  onButtonClick,
  currentSlide = 0,
  totalSlides = 1,
}) {
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        borderRadius="24px"
        overflow="hidden"
        mx={4}
        maxW="440px"
        bg="transparent"
        boxShadow="0 20px 60px rgba(0,0,0,0.3)"
      >
        <ModalCloseButton
          zIndex={2}
          color="gray.700"
          bg="white"
          borderRadius="full"
          size="sm"
          top={3}
          right={3}
          _hover={{ bg: 'gray.100' }}
        />

        <ModalBody p={0}>
          {/* 상단 노란색 영역 */}
          <Box
            bg="#FED500"
            py={12}
            px={6}
            position="relative"
          >
            {/* 이미지 프레임 */}
            <Flex
              justify="center"
              align="center"
              position="relative"
            >
              <Box
                position="relative"
                width="100%"
                maxW="380px"
                bg="white"
                borderRadius="12px"
                p={3}
                boxShadow="0 8px 24px rgba(0,0,0,0.15)"
              >
                {/* 메인 이미지 */}
                {imageSrc && (
                  <Image
                    src={imageSrc}
                    alt="광고 모니터링 예시"
                    borderRadius="8px"
                    width="100%"
                    objectFit="contain"
                  />
                )}
              </Box>
            </Flex>
          </Box>

          {/* 하단 흰색 영역 */}
          <Box bg="white" px={8} py={10}>
            <VStack spacing={6} align="stretch">
              {/* 타이틀 */}
              <Text
                fontSize="22px"
                fontWeight="700"
                color="gray.900"
                textAlign="center"
                lineHeight="1.4"
              >
                {title}
              </Text>

              {/* 부제목 */}
              <Text
                fontSize="15px"
                color="gray.600"
                textAlign="center"
                lineHeight="1.6"
              >
                {subtitle}
              </Text>

              {/* 더 알아보기 버튼 */}
              <Button
                size="lg"
                bg="white"
                color="gray.700"
                border="1px solid"
                borderColor="gray.300"
                borderRadius="12px"
                fontSize="16px"
                fontWeight="600"
                py={6}
                _hover={{
                  bg: 'gray.50',
                  borderColor: 'gray.400',
                }}
                _active={{
                  bg: 'gray.100'
                }}
                onClick={handleButtonClick}
              >
                {buttonText}
              </Button>

              {/* 페이지 인디케이터 */}
              {totalSlides > 1 && (
                <Flex justify="center" gap={2} pt={2}>
                  {Array.from({ length: totalSlides }).map((_, index) => (
                    <Box
                      key={index}
                      w={2}
                      h={2}
                      borderRadius="full"
                      bg={index === currentSlide ? 'gray.800' : 'gray.300'}
                      transition="all 0.3s"
                    />
                  ))}
                </Flex>
              )}
            </VStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
