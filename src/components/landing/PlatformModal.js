import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Image,
  useColorMode,
} from '@chakra-ui/react';
import { landingDesignSystem } from '../../theme/landingTheme';

const PlatformModal = ({ isOpen, onClose }) => {
  const { colorMode } = useColorMode();

  const features = [
    {
      id: 1,
      title: '이미지 검색 & 카피라이트 검색',
      items: [
        { text: '업종 및 무드·카피라이트 등', highlight: '이미지로만 표현된 요소', suffix: '를 검색 가능' },
        { text: '선택 이미지 기반', highlight: '유사 이미지', suffix: '추천' },
        { text: '저사기간, 성과순', highlight: '형태와 다양한', suffix: '필터' },
      ],
      quotes: [
        '"아이디어 본 배너의 카피만"',
        '"팔린 것으로 읽혀야를 해당품 공고"',
        '"붉은 바탕에" 카피라이트도포함된 광고"',
      ],
      imagePosition: 'left',
    },
    {
      id: 2,
      title: '경쟁사 자동 모니터링 & 대시보드',
      items: [
        { text: '기간 내 모든 브랜드 광고', highlight: '자동 수집', suffix: '' },
        { text: '광고가', highlight: '내려간 이후에도 확인 가능', suffix: '' },
        { text: '일자 별 게재', highlight: '히스토리 및 통계', suffix: '제공' },
        { text: '브랜드 광고', highlight: '운영패턴', suffix: '자료로 확인 가능' },
      ],
      description: '인스타·메타 커머셜러티 모드·해당 채널 모니터링\n개재 광고 수, 유형별 수치 및 일별 요약 브리핑 제공\n브랜드를 향상 소재 편집 기간 분석 기능',
      imagePosition: 'right',
    },
    {
      id: 3,
      title: '콘텐츠 보드 & 추천 광고 큐레이션',
      items: [
        { text: '좋은 콘텐츠는 저장 버튼만 누르면', highlight: '', suffix: '' },
        { text: '콘텐츠 정보 및 성과와 함께 바로 저장', highlight: '', suffix: '' },
        { text: '확장 프로그램(Snipit) 활용 시, 인스타그램', highlight: '', suffix: '' },
        { text: '& 메타 광고 라이브러리에서 즉시 저장 가능', highlight: '', suffix: '' },
        { text: '매일 자동 업데이트되는', highlight: '오늘의 AI 추천 광고', suffix: '' },
      ],
      footerText: '저장된 콘텐츠 기반 유사 이미지 탐색으로 인사이트도파생\n인사이트가 쌓 순간 채널 기능한 나매시 않은 빌래 채용',
      imagePosition: 'left',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay bg="rgba(0, 0, 0, 0.6)" backdropFilter="blur(4px)" />
      <ModalContent
        maxW="1200px"
        maxH="90vh"
        bg={colorMode === 'dark' ? '#1A1F37' : '#FFFFFF'}
        borderRadius="24px"
        overflow="hidden"
      >
        <ModalCloseButton
          top="20px"
          right="20px"
          color={colorMode === 'dark' ? 'white' : 'gray.600'}
          _hover={{ bg: colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.100' }}
        />
        <ModalBody p={{ base: '32px', md: '48px 64px' }}>
          <VStack spacing="48px" align="stretch">
            {/* Header */}
            <VStack spacing="20px" textAlign="center">
              {/* Badge */}
              <Flex
                px="20px"
                py="8px"
                borderRadius="full"
                border="1px solid rgba(66, 42, 251, 0.3)"
                bg="transparent"
              >
                <Text
                  fontSize="14px"
                  fontWeight="600"
                  color="#422AFB"
                >
                  마케터를 위한 생산성
                </Text>
              </Flex>

              {/* Title */}
              <Text
                fontSize={{ base: '24px', md: '32px' }}
                fontWeight="700"
                color={colorMode === 'dark' ? 'white' : '#1A202C'}
                lineHeight="1.4"
                textAlign="center"
              >
                <Text as="span" color="#422AFB">데이터</Text>로 도달하고,{' '}
                <Text as="span" color="#422AFB">모니터링</Text>으로 방향을 잡고,{' '}
                <Text as="span" color="#422AFB">보드</Text>로 쌓아가는
                <br />
                마케터를 위한 데이터 탐색 방식
              </Text>

              {/* Subtitle */}
              <Text
                fontSize="15px"
                color={colorMode === 'dark' ? 'whiteAlpha.700' : 'gray.500'}
                whiteSpace="nowrap"
              >
                찾아야 할 것이 막막한 순간부터, 원하는 레퍼런스를 만나, 전략으로 바꾸는 순간까지 제스트닷이 함께합니다.
              </Text>
            </VStack>

            {/* Feature 1 */}
            <Flex
              direction={{ base: 'column', md: 'row' }}
              gap="32px"
              align="center"
            >
              {/* Image Placeholder */}
              <Box
                flex="1.2"
                h={{ base: '250px', md: '320px' }}
                borderRadius="16px"
                bg={colorMode === 'dark' ? '#2D3258' : '#F8F9FC'}
                border="1px solid"
                borderColor={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.200'}
                overflow="hidden"
                position="relative"
              >
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  h="40px"
                  bg={colorMode === 'dark' ? '#252A48' : '#EEEEF4'}
                  borderBottom="1px solid"
                  borderColor={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.200'}
                />
                <Flex
                  position="absolute"
                  bottom="0"
                  left="0"
                  right="0"
                  h="60%"
                  bg="linear-gradient(180deg, transparent 0%, rgba(66, 42, 251, 0.1) 100%)"
                />
              </Box>

              {/* Content */}
              <VStack flex="1" align="flex-start" spacing="16px">
                <HStack spacing="8px">
                  <Box
                    w="24px"
                    h="24px"
                    borderRadius="6px"
                    bg="#422AFB"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="12px" color="white" fontWeight="bold">G</Text>
                  </Box>
                  <Text
                    fontSize="18px"
                    fontWeight="700"
                    color={colorMode === 'dark' ? 'white' : '#1A202C'}
                  >
                    데이터 & 베스트 크리에이티브 확인
                  </Text>
                </HStack>

                <VStack align="flex-start" spacing="8px" pl="4px">
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • <Text as="span" fontWeight="600">베스트 및 모든 크리에이티브 요소</Text> 확인 가능(meta)
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 선택 이미지 기반 <Text as="span" fontWeight="600">상세 데이터</Text> 확인
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • <Text as="span" fontWeight="600">매체별, 성과기반</Text> 다양한 필터
                  </Text>
                </VStack>

                <VStack
                  align="flex-start"
                  spacing="4px"
                  mt="8px"
                  p="12px"
                  borderRadius="8px"
                  bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'gray.50'}
                >
                  <Text fontSize="12px" color="#422AFB" fontStyle="italic">
                    "CTR 높은 소재 필터링"
                  </Text>
                  <Text fontSize="12px" color="#422AFB" fontStyle="italic">
                    "ROAS 높은 소재 필터링"
                  </Text>
                  <Text fontSize="12px" color="#422AFB" fontStyle="italic">
                    "전환수 높은 소재 필터링"
                  </Text>
                </VStack>
              </VStack>
            </Flex>

            {/* Feature 2 */}
            <Flex
              direction={{ base: 'column', md: 'row-reverse' }}
              gap="32px"
              align="center"
              bg={colorMode === 'dark' ? '#252A48' : '#F8F9FC'}
              p="32px"
              borderRadius="20px"
            >
              {/* Image Placeholder */}
              <Box
                flex="1.2"
                h={{ base: '250px', md: '320px' }}
                borderRadius="16px"
                bg={colorMode === 'dark' ? '#1A1F37' : '#FFFFFF'}
                border="1px solid"
                borderColor={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.200'}
                boxShadow="lg"
                overflow="hidden"
                position="relative"
              >
                <Flex
                  position="absolute"
                  top="16px"
                  left="16px"
                  gap="8px"
                >
                  <Box px="12px" py="4px" borderRadius="full" bg="#422AFB">
                    <Text fontSize="11px" color="white" fontWeight="600">메타조회</Text>
                  </Box>
                  <Box px="12px" py="4px" borderRadius="full" bg="gray.200">
                    <Text fontSize="11px" color="gray.600" fontWeight="600">흥보</Text>
                  </Box>
                </Flex>
              </Box>

              {/* Content */}
              <VStack flex="1" align="flex-start" spacing="16px">
                <HStack spacing="8px">
                  <Box
                    w="24px"
                    h="24px"
                    borderRadius="6px"
                    bg="#422AFB"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="12px" color="white" fontWeight="bold">O</Text>
                  </Box>
                  <Text
                    fontSize="18px"
                    fontWeight="700"
                    color={colorMode === 'dark' ? 'white' : '#1A202C'}
                  >
                    데이터 대시보드 & 실시간 분석
                  </Text>
                </HStack>

                <VStack align="flex-start" spacing="8px" pl="4px">
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 모든 광고 데이터를 <Text as="span" fontWeight="600">대시보드 형태로 확인</Text>
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 채널별 <Text as="span" fontWeight="600">실시간 성과 지표</Text> 모니터링
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 기간별 <Text as="span" fontWeight="600">트렌드 및 비교 분석</Text> 제공
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 커스텀 <Text as="span" fontWeight="600">리포트 자동 생성</Text> 가능
                  </Text>
                </VStack>

                <Box
                  mt="8px"
                  p="16px"
                  borderRadius="12px"
                  bg={colorMode === 'dark' ? '#1A1F37' : 'white'}
                  border="1px solid"
                  borderColor={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.200'}
                >
                  <Text fontSize="13px" color={colorMode === 'dark' ? 'whiteAlpha.700' : 'gray.600'} lineHeight="1.6">
                    직관적인 차트와 그래프로 한눈에 성과 파악<br />
                    일별/주별/월별 데이터 비교 분석<br />
                    맞춤형 KPI 설정 및 알림 기능 지원
                  </Text>
                </Box>
              </VStack>
            </Flex>

            {/* Feature 3 */}
            <Flex
              direction={{ base: 'column', md: 'row' }}
              gap="32px"
              align="center"
            >
              {/* Image Placeholder */}
              <Box
                flex="1.2"
                h={{ base: '250px', md: '320px' }}
                borderRadius="16px"
                bg={colorMode === 'dark' ? '#2D3258' : '#F8F9FC'}
                border="1px solid"
                borderColor={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.200'}
                overflow="hidden"
                position="relative"
              >
                              </Box>

              {/* Content */}
              <VStack flex="1" align="flex-start" spacing="16px">
                <HStack spacing="8px">
                  <Box
                    w="24px"
                    h="24px"
                    borderRadius="6px"
                    bg="#422AFB"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="12px" color="white" fontWeight="bold">O</Text>
                  </Box>
                  <Text
                    fontSize="18px"
                    fontWeight="700"
                    color={colorMode === 'dark' ? 'white' : '#1A202C'}
                  >
                    경쟁사 자동 모니터링 & 대시보드
                  </Text>
                </HStack>

                <VStack align="flex-start" spacing="8px" pl="4px">
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 기간 내 모든 브랜드 광고 <Text as="span" fontWeight="600">자동 수집</Text>
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 광고가 <Text as="span" fontWeight="600">내려간 이후에도 확인 가능</Text>
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 일자 별 게재 <Text as="span" fontWeight="600">히스토리 및 통계</Text> 제공
                  </Text>
                  <Text fontSize="14px" color={colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.700'}>
                    • 브랜드 광고 <Text as="span" fontWeight="600">운영패턴</Text> 자료로 확인 가능
                  </Text>
                </VStack>

                <Box
                  mt="8px"
                  p="12px"
                  borderRadius="8px"
                  bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'blue.50'}
                  borderLeft="3px solid"
                  borderColor="#422AFB"
                >
                  <Text fontSize="12px" color={colorMode === 'dark' ? 'whiteAlpha.700' : 'gray.600'} lineHeight="1.6">
                    인스타·메타 커머셜러티 모드·해당 채널 모니터링<br />
                    개재 광고 수, 유형별 수치 및 일별 요약 브리핑 제공<br />
                    브랜드를 향상 소재 편집 기간 분석 기능
                  </Text>
                </Box>
              </VStack>
            </Flex>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PlatformModal;
