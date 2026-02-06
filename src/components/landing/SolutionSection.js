import React, { useState } from 'react';
import { Box, Flex, Text, VStack, HStack, useColorMode, useDisclosure } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import { FiCheck } from 'react-icons/fi';
import Button from './Button';
import { MdArrowForward } from 'react-icons/md';
import PlatformModal from './PlatformModal';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export const SolutionSection = () => {
  const { colorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const features = [
    '멀티 채널 성과 통합',
    '실시간 캠페인 추적',
    '자동화된 ROI 계산',
  ];

  return (
    <Box
      id="analytics"
      py={{ base: '80px', md: '120px' }}
      bg={colorMode === 'dark' ? '#1F1F1F' : landingDesignSystem.colors.primary}
    >
      <Flex
        maxW="1440px"
        mx="auto"
        px={{ base: '24px', md: '48px', lg: '64px' }}
        direction={{ base: 'column', lg: 'row' }}
        gap={{ base: '48px', lg: '80px' }}
        align="center"
      >
        {/* Left Content */}
        <MotionFlex
          flex={1}
          direction="column"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.caption}
            fontWeight={landingDesignSystem.typography.fontWeights.semibold}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
            textTransform="uppercase"
            letterSpacing="0.1em"
            mb="24px"
          >
            솔루션
          </Text>

          <Text
            as="h2"
            fontSize={{ base: '36px', md: '48px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            mb="24px"
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
          >
            실전형 통합 분석 대시보드
          </Text>

          <Text
            fontSize={landingDesignSystem.typography.fontSizes.body}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
            lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
            mb="32px"
            maxW="500px"
          >
            모든 채널을 연결하고 실시간 데이터를 기반으로
            <br />
            성과·전환·ROI를 하나의 기준으로 관리하세요.
          </Text>

          {/* Feature List */}
          <VStack align="flex-start" spacing="16px" mb="40px">
            {features.map((feature, index) => (
              <HStack key={index} spacing="12px" align="flex-start">
                <Box
                  as={FiCheck}
                  fontSize="20px"
                  color={landingDesignSystem.colors.accent}
                  mt="2px"
                  flexShrink={0}
                />
                <Text
                  fontSize={landingDesignSystem.typography.fontSizes.body}
                  color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                  fontWeight={landingDesignSystem.typography.fontWeights.medium}
                >
                  {feature}
                </Text>
              </HStack>
            ))}
          </VStack>

          <Button
            variant="primary"
            size="lg"
            rightIcon={<MdArrowForward size={20} />}
            onClick={onOpen}
          >
            플랫폼 살펴보기
          </Button>

          <PlatformModal isOpen={isOpen} onClose={onClose} />
        </MotionFlex>

        {/* Right Visual */}
        <MotionBox
          flex={1}
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Box
            position="relative"
            borderRadius={landingDesignSystem.borderRadius.xlarge}
            overflow="hidden"
            boxShadow={landingDesignSystem.shadows.xl}
            bg={colorMode === 'dark' ? '#2A2A2A' : landingDesignSystem.colors.white}
            p={{ base: '24px', md: '32px' }}
          >
            {/* Dashboard Visual Mockup */}
            <VStack spacing="20px" align="stretch">
              {/* Header */}
              <HStack justify="space-between">
                <Box
                  w="100px"
                  h="32px"
                  borderRadius={landingDesignSystem.borderRadius.small}
                  bg={colorMode === 'dark' ? '#3A3A3A' : '#F5F5F5'}
                />
                <HStack spacing="8px">
                  <Box
                    w="32px"
                    h="32px"
                    borderRadius="50%"
                    bg={landingDesignSystem.colors.accent}
                  />
                  <Box
                    w="32px"
                    h="32px"
                    borderRadius="50%"
                    bg={colorMode === 'dark' ? '#3A3A3A' : '#F5F5F5'}
                  />
                </HStack>
              </HStack>

              {/* Chart */}
              <Box
                h="200px"
                borderRadius={landingDesignSystem.borderRadius.medium}
                bg={colorMode === 'dark' ? '#3A3A3A' : '#FAFAFA'}
                p="20px"
                position="relative"
              >
                <VStack align="flex-start" spacing="12px" mb="16px">
                  <HStack spacing="8px">
                    <Box w="6px" h="6px" borderRadius="50%" bg={landingDesignSystem.colors.accent} />
                    <Text
                      fontSize="10px"
                      fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                      color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                    >
                      LIVE METRICS
                    </Text>
                  </HStack>
                  <Text
                    fontSize="24px"
                    fontWeight={landingDesignSystem.typography.fontWeights.bold}
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                  >
                    +12%
                  </Text>
                </VStack>

                {/* Bars */}
                <HStack spacing="8px" align="flex-end" h="100px" justify="center">
                  {[60, 75, 45, 90, 70, 55, 80].map((height, index) => (
                    <Box
                      key={index}
                      w="24px"
                      h={`${height}%`}
                      borderRadius={landingDesignSystem.borderRadius.small}
                      bg={index === 3 ? landingDesignSystem.colors.textPrimary : colorMode === 'dark' ? '#505050' : '#D0D0D0'}
                    />
                  ))}
                </HStack>
              </Box>

              {/* Metrics Grid */}
              <Flex gap="12px">
                {['+12%', '+8%', '+24%'].map((value, index) => (
                  <Box
                    key={index}
                    flex={1}
                    p="16px"
                    borderRadius={landingDesignSystem.borderRadius.medium}
                    bg={colorMode === 'dark' ? '#3A3A3A' : '#FAFAFA'}
                  >
                    <Text
                      fontSize="10px"
                      fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                      color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                      mb="4px"
                    >
                      METRIC
                    </Text>
                    <Text
                      fontSize="18px"
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={landingDesignSystem.colors.accent}
                    >
                      {value}
                    </Text>
                  </Box>
                ))}
              </Flex>

              {/* Action Button */}
              <Flex justify="center" mt="8px">
                <Box
                  px="24px"
                  py="12px"
                  borderRadius={landingDesignSystem.borderRadius.full}
                  bg={landingDesignSystem.colors.textPrimary}
                >
                  <Text
                    fontSize="12px"
                    fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                    color={landingDesignSystem.colors.white}
                  >
                    View Dashboard
                  </Text>
                </Box>
              </Flex>
            </VStack>
          </Box>

          {/* Decorative Element */}
          <Box
            position="absolute"
            top="-60px"
            left="-60px"
            w="250px"
            h="250px"
            borderRadius="50%"
            bg={landingDesignSystem.colors.accent}
            opacity={0.08}
            filter="blur(80px)"
            zIndex={-1}
          />
        </MotionBox>
      </Flex>
    </Box>
  );
};

export default SolutionSection;
