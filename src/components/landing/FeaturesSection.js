import React from 'react';
import { Box, Flex, Text, VStack, SimpleGrid, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import { MdOutlineBarChart, MdOutlineSecurity } from 'react-icons/md';
import { TbBolt } from 'react-icons/tb';
import { MdArrowForward } from 'react-icons/md';

const MotionBox = motion(Box);

export const FeaturesSection = () => {
  const { colorMode } = useColorMode();

  const features = [
    {
      icon: MdOutlineBarChart,
      title: '실시간 캠페인 모니터링',
      description: (
        <>
          광고 채널별 성과를
          <br />
          지연 없이 한 화면에서 확인하세요.
        </>
      ),
      linkText: '자세히 보기',
    },
    {
      icon: TbBolt,
      title: '스마트 어트리뷰션',
      description: (
        <>
          전환에 실제로 기여한
          <br />
          채널과 캠페인을 명확히 파악합니다.
        </>
      ),
      linkText: '자세히 보기',
    },
    {
      icon: MdOutlineSecurity,
      title: 'ROI 중심 분석',
      description: (
        <>
          클릭이 아닌 <Text as="span" fontWeight="bold">매출과 효율 기준</Text>으로
          <br />
          브랜드의 ROI를 판단하세요.
        </>
      ),
      linkText: '자세히 보기',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
      id="features"
      py={{ base: '80px', md: '120px' }}
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.white}
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        {/* Header */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'flex-start', md: 'flex-end' }}
          mb="64px"
          gap="24px"
        >
          <VStack align="flex-start" spacing="16px" maxW="600px">
            <Text
              fontSize={landingDesignSystem.typography.fontSizes.caption}
              fontWeight={landingDesignSystem.typography.fontWeights.semibold}
              color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
              textTransform="uppercase"
              letterSpacing="0.1em"
            >
              주요 기능
            </Text>
            <Text
              fontSize={{ base: '36px', md: '48px' }}
              fontWeight={landingDesignSystem.typography.fontWeights.bold}
              color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
              lineHeight={landingDesignSystem.typography.lineHeights.tight}
              fontFamily={landingDesignSystem.typography.fontFamily.heading}
            >
              실무 핵심 기능만 담았습니다.
            </Text>
            <Text
              fontSize={landingDesignSystem.typography.fontSizes.body}
              color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
            >
              캠페인 성과를 빠르게 비교하고 바로 조정할 수 있습니다.
            </Text>
          </VStack>

          <Text
            fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
            fontWeight={landingDesignSystem.typography.fontWeights.semibold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            textDecoration="underline"
            textUnderlineOffset="4px"
            cursor="pointer"
            _hover={{ color: landingDesignSystem.colors.accent }}
            transition="color 0.3s ease"
            display={{ base: 'none', md: 'block' }}
          >
            전체 기능 목록 보기 →
          </Text>
        </Flex>

        {/* Feature Cards */}
        <MotionBox
          as={SimpleGrid}
          columns={{ base: 1, md: 3 }}
          spacing="24px"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <MotionBox
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                p={{ base: '32px', md: '40px' }}
                borderRadius={landingDesignSystem.borderRadius.large}
                bg={colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.white}
                border={`1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.3)' : 'rgba(0, 0, 0, 0.05)'}`}
                boxShadow={landingDesignSystem.shadows.md}
                h="100%"
                transition="all 0.3s ease"
                cursor="pointer"
                _hover={{
                  boxShadow: landingDesignSystem.shadows.lg,
                  borderColor: landingDesignSystem.colors.accent,
                }}
              >
                <VStack align="flex-start" spacing="24px" h="100%">
                  {/* Icon */}
                  <Box
                    as={feature.icon}
                    fontSize="48px"
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                  />

                  {/* Content */}
                  <VStack align="flex-start" spacing="12px" flex={1}>
                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.h5}
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                      lineHeight={landingDesignSystem.typography.lineHeights.tight}
                    >
                      {feature.title}
                    </Text>

                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.body}
                      color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
                      lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
                    >
                      {feature.description}
                    </Text>
                  </VStack>

                  {/* Link */}
                  <Flex
                    align="center"
                    gap="8px"
                    color={landingDesignSystem.colors.accent}
                    _hover={{ gap: '12px' }}
                    transition="gap 0.3s ease"
                  >
                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                      fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                    >
                      {feature.linkText}
                    </Text>
                    <Box as={MdArrowForward} fontSize="16px" />
                  </Flex>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </MotionBox>
      </Box>
    </Box>
  );
};

export default FeaturesSection;
