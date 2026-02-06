import React from 'react';
import { Box, Text, VStack, HStack, SimpleGrid, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import { FaStar } from 'react-icons/fa';

const MotionBox = motion(Box);

export const TestimonialsSection = () => {
  const { colorMode } = useColorMode();

  const testimonials = [
    {
      quote: '제스트닷으로 보고 시간을 80% 단축하고 캠페인 ROI를 2배로 늘렸습니다.',
      author: 'Sarah Chen',
      role: '마케팅 디렉터 @ 테크플로우',
      rating: 5,
    },
    {
      quote: '드디어 모든 마케팅 데이터를 위한 하나의 대시보드. 게임 체인저입니다.',
      author: 'Michael Torres',
      role: 'CMO @ 스케일업',
      rating: 5,
    },
    {
      quote: '어트리뷰션 인사이트만으로도 첫 달에 투자 비용을 회수했습니다.',
      author: 'Jessica Kim',
      role: '그로스 리드 @ 데이터코프',
      rating: 5,
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
            고객 후기
          </Text>
          <Text
            fontSize={{ base: '36px', md: '48px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
          >
            가장 정확히 도달하는 제스트닷
          </Text>
        </VStack>

        {/* Testimonials Grid */}
        <MotionBox
          as={SimpleGrid}
          columns={{ base: 1, md: 3 }}
          spacing="24px"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {testimonials.map((testimonial, index) => (
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
                <VStack align="flex-start" spacing="24px">
                  {/* Star Rating */}
                  <HStack spacing="4px">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Box
                        key={i}
                        as={FaStar}
                        color={landingDesignSystem.colors.accent}
                        fontSize="16px"
                      />
                    ))}
                  </HStack>

                  {/* Quote */}
                  <Text
                    fontSize={landingDesignSystem.typography.fontSizes.body}
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                    lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
                    fontWeight={landingDesignSystem.typography.fontWeights.medium}
                  >
                    "{testimonial.quote}"
                  </Text>

                  {/* Author */}
                  <HStack spacing="16px" mt="auto">
                    {/* Avatar */}
                    <Box
                      w="48px"
                      h="48px"
                      borderRadius="50%"
                      bg={colorMode === 'dark' ? '#3A3A3A' : '#D0D0D0'}
                    />

                    {/* Author Info */}
                    <VStack align="flex-start" spacing="2px">
                      <Text
                        fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                        fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                        color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                      >
                        {testimonial.author}
                      </Text>
                      <Text
                        fontSize={landingDesignSystem.typography.fontSizes.caption}
                        color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                      >
                        {testimonial.role}
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </MotionBox>
      </Box>
    </Box>
  );
};

export default TestimonialsSection;
