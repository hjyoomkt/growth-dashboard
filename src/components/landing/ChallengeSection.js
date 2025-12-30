import React from 'react';
import { Box, Text, VStack, SimpleGrid, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import { MdOutlineWarning, MdOutlineAccessTime } from 'react-icons/md';
import { TbTrendingDown } from 'react-icons/tb';

const MotionBox = motion(Box);

export const ChallengeSection = () => {
  const { colorMode } = useColorMode();

  const challenges = [
    {
      icon: MdOutlineWarning,
      title: '데이터의 분산',
      description: (
        <>
          광고 플랫폼, 분석 툴, 리포트가 제각각이라
          <br />
          성과를 한눈에 보기 어렵습니다.
        </>
      ),
    },
    {
      icon: MdOutlineAccessTime,
      title: '불확실한 인사이트',
      description: (
        <>
          데이터를 확인할 때쯤이면
          <br />
          이미 캠페인 타이밍은 지나가 있습니다.
        </>
      ),
    },
    {
      icon: TbTrendingDown,
      title: '통제되지 않는 광고비',
      description: (
        <>
          성과를 실시간으로 보지 못해
          <br />
          예산이 비효율적으로 소진됩니다.
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
      bg={colorMode === 'dark' ? landingDesignSystem.colors.textPrimary : landingDesignSystem.colors.white}
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        {/* Header */}
        <VStack spacing="16px" mb="64px" textAlign="center">
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.caption}
            fontWeight={landingDesignSystem.typography.fontWeights.semibold}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            문제 제기 (Pain Point)
          </Text>
          <Text
            fontSize={{ base: '36px', md: '48px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
            maxW="800px"
          >
            왜 마케팅 분석은 늘 답답할까요?
          </Text>
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.body}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
            maxW="600px"
          >
            데이터는 많은데 정작 <Text as="span" fontWeight="bold">결정에 쓸 수 있는 정보는 부족</Text>합니다.
          </Text>
        </VStack>

        {/* Challenge Cards */}
        <MotionBox
          as={SimpleGrid}
          columns={{ base: 1, md: 3 }}
          spacing="24px"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {challenges.map((challenge, index) => (
            <MotionBox
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                p={{ base: '32px', md: '40px' }}
                borderRadius={landingDesignSystem.borderRadius.large}
                bg={colorMode === 'dark' ? '#2A2A2A' : landingDesignSystem.colors.primary}
                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`}
                boxShadow={landingDesignSystem.shadows.md}
                h="100%"
                transition="all 0.3s ease"
                _hover={{
                  boxShadow: landingDesignSystem.shadows.lg,
                  borderColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <VStack align="flex-start" spacing="20px">
                  {/* Icon */}
                  <Box
                    as={challenge.icon}
                    fontSize="48px"
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                  />

                  {/* Title */}
                  <Text
                    fontSize={landingDesignSystem.typography.fontSizes.h5}
                    fontWeight={landingDesignSystem.typography.fontWeights.bold}
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                    lineHeight={landingDesignSystem.typography.lineHeights.tight}
                  >
                    {challenge.title}
                  </Text>

                  {/* Description */}
                  <Text
                    fontSize={landingDesignSystem.typography.fontSizes.body}
                    color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
                    lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
                  >
                    {challenge.description}
                  </Text>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </MotionBox>
      </Box>
    </Box>
  );
};

export default ChallengeSection;
