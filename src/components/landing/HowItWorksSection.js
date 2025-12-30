import React from 'react';
import { Box, Text, VStack, HStack, SimpleGrid, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';

const MotionBox = motion(Box);

export const HowItWorksSection = () => {
  const { colorMode } = useColorMode();

  const steps = [
    {
      number: '01',
      title: '채널 연동',
      description: (
        <>
          Google Ads, Meta 등
          <br />
          주요 채널을 바로 연동
        </>
      ),
    },
    {
      number: '02',
      title: '구성',
      description: (
        <>
          여러 브랜드와 팀 계정을
          <br />
          하나의 대시보드로 관리
        </>
      ),
    },
    {
      number: '03',
      title: '분석',
      description: (
        <>
          데이터 흐름을 한눈에 보고
          <br />
          광고 성과를 비교 분석
        </>
      ),
    },
    {
      number: '04',
      title: '최적화',
      description: (
        <>
          의사결정에 바로 쓰는
          <br />
          핵심 인사이트 도출
        </>
      ),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <Box
      py={{ base: '80px', md: '120px' }}
      bg={colorMode === 'dark' ? '#1F1F1F' : landingDesignSystem.colors.textPrimary}
      position="relative"
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        {/* Header */}
        <VStack spacing="16px" mb="64px" textAlign="center">
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.caption}
            fontWeight={landingDesignSystem.typography.fontWeights.semibold}
            color="rgba(255, 255, 255, 0.6)"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            작동 방식
          </Text>
          <Text
            fontSize={{ base: '36px', md: '48px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={landingDesignSystem.colors.white}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
          >
            복잡한 설정 없이, 4단계로 바로 시작하세요.
          </Text>
        </VStack>

        {/* Steps Grid */}
        <MotionBox
          as={SimpleGrid}
          columns={{ base: 1, sm: 2, lg: 4 }}
          spacing={{ base: '32px', md: '24px' }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {steps.map((step, index) => (
            <MotionBox
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                p={{ base: '32px', md: '32px' }}
                borderRadius={landingDesignSystem.borderRadius.large}
                bg="rgba(255, 255, 255, 0.05)"
                border="1px solid rgba(255, 255, 255, 0.1)"
                boxShadow={landingDesignSystem.shadows.md}
                h="100%"
                transition="all 0.3s ease"
                _hover={{
                  bg: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: landingDesignSystem.shadows.lg,
                }}
              >
                <VStack align="flex-start" spacing="20px">
                  {/* Step Number and Title */}
                  <HStack spacing="16px" align="center">
                    <Box
                      w="64px"
                      h="64px"
                      borderRadius={landingDesignSystem.borderRadius.medium}
                      bg="rgba(255, 255, 255, 0.1)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text
                        fontSize="24px"
                        fontWeight={landingDesignSystem.typography.fontWeights.bold}
                        color={landingDesignSystem.colors.white}
                        fontFamily={landingDesignSystem.typography.fontFamily.heading}
                      >
                        {step.number}
                      </Text>
                    </Box>

                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.h4}
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={landingDesignSystem.colors.white}
                      lineHeight={landingDesignSystem.typography.lineHeights.tight}
                    >
                      {step.title}
                    </Text>
                  </HStack>

                  {/* Description */}
                  <Text
                    fontSize={landingDesignSystem.typography.fontSizes.body}
                    color="rgba(255, 255, 255, 0.7)"
                    lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
                  >
                    {step.description}
                  </Text>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </MotionBox>
      </Box>

      {/* Decorative gradient */}
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="600px"
        h="600px"
        borderRadius="50%"
        bg={landingDesignSystem.colors.accent}
        opacity={0.03}
        filter="blur(100px)"
        zIndex={0}
        pointerEvents="none"
      />
    </Box>
  );
};

export default HowItWorksSection;
