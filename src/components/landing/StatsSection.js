import React from 'react';
import { Box, Flex, Text, VStack, SimpleGrid, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';

const MotionBox = motion(Box);

export const StatsSection = () => {
  const { colorMode } = useColorMode();

  const stats = [
    { value: '50k+', label: '활성 사용자' },
    { value: '2,000', label: '기업' },
    { value: '99.9%', label: '가동 시간' },
    { value: '24/7', label: '지원' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
      py={{ base: '60px', md: '80px' }}
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.white}
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        <Flex
          direction={{ base: 'column', lg: 'row' }}
          gap={{ base: '40px', lg: '60px' }}
          align="center"
        >
          {/* Left Content */}
          <VStack align="flex-start" spacing="16px" flex={1}>
            <Text
              fontSize={landingDesignSystem.typography.fontSizes.caption}
              fontWeight={landingDesignSystem.typography.fontWeights.semibold}
              color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
              textTransform="uppercase"
              letterSpacing="0.1em"
            >
              회사 소개
            </Text>

            <Text
              as="h2"
              fontSize={{ base: '32px', md: '40px' }}
              fontWeight={landingDesignSystem.typography.fontWeights.bold}
              color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
              lineHeight={landingDesignSystem.typography.lineHeights.tight}
              fontFamily={landingDesignSystem.typography.fontFamily.heading}
            >
              마케터가 직접 만든 분석 도구
            </Text>

            <Text
              fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
              color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
              lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
              maxW="500px"
            >
              그로스메트릭스는 "왜 아직도 엑셀로 보고서를 만들까?"라는 질문에서 시작했습니다.{'\n\n'}우리가 쓰고 싶었던 대시보드를 직접 만들었습니다.
            </Text>
          </VStack>

          {/* Right Stats Grid */}
          <MotionBox
            flex={1}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <SimpleGrid columns={{ base: 2, md: 2 }} spacing="16px">
              {stats.map((stat, index) => (
                <MotionBox
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box
                    p={{ base: '24px', md: '28px' }}
                    borderRadius={landingDesignSystem.borderRadius.large}
                    bg={colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.primary}
                    border={`1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.3)' : 'rgba(0, 0, 0, 0.05)'}`}
                    boxShadow={landingDesignSystem.shadows.md}
                    transition="all 0.3s ease"
                    _hover={{
                      boxShadow: landingDesignSystem.shadows.lg,
                      borderColor: landingDesignSystem.colors.accent,
                    }}
                  >
                    <VStack align="flex-start" spacing="8px">
                      <Text
                        fontSize={{ base: '32px', md: '40px' }}
                        fontWeight={landingDesignSystem.typography.fontWeights.bold}
                        color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                        lineHeight={1}
                        fontFamily={landingDesignSystem.typography.fontFamily.heading}
                      >
                        {stat.value}
                      </Text>
                      <Text
                        fontSize={landingDesignSystem.typography.fontSizes.caption}
                        fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                        color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                        letterSpacing="0.05em"
                      >
                        {stat.label}
                      </Text>
                    </VStack>
                  </Box>
                </MotionBox>
              ))}
            </SimpleGrid>
          </MotionBox>
        </Flex>
      </Box>
    </Box>
  );
};

export default StatsSection;
