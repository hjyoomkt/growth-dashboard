import React from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  useColorMode,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import Button from './Button';
import { MdPlayCircleOutline } from 'react-icons/md';
import { FiCheck } from 'react-icons/fi';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionText = motion(Text);

export const HeroSection = () => {
  const { colorMode } = useColorMode();
  const navigate = useNavigate();

  // Prevent auto-focus on page load
  React.useEffect(() => {
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
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

  const trustBadges = [
    { icon: FiCheck, text: '⭐ 4.9 / 5 평균 만족도' },
    { icon: FiCheck, text: '대시보드 바로 보기' },
    { icon: FiCheck, text: '내 데이터 연결하기' },
  ];

  return (
    <Box
      position="relative"
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.white}
      overflow="hidden"
      pt={{ base: '80px', md: '90px' }}
    >
      <Flex
        maxW="1440px"
        mx="auto"
        px={{ base: '24px', md: '48px', lg: '64px' }}
        pt={{ base: '40px', md: '60px', lg: '80px' }}
        pb="125px"
        align="center"
        direction={{ base: 'column', lg: 'row' }}
        gap={{ base: '48px', lg: '64px' }}
      >
        {/* Left Content */}
        <MotionFlex
          flex={1}
          direction="column"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Eyebrow Text */}
          <MotionText
            fontSize={landingDesignSystem.typography.fontSizes.eyebrow}
            fontWeight={landingDesignSystem.typography.fontWeights.semibold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textSecondary}
            textTransform="uppercase"
            letterSpacing="0.1em"
            mb="24px"
            variants={itemVariants}
          >
            마케팅 분석 플랫폼
          </MotionText>

          {/* Headline */}
          <MotionText
            as="h1"
            fontSize={{ base: '48px', md: '56px', lg: '72px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            mb="24px"
            variants={itemVariants}
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
            style={{ backfaceVisibility: 'hidden', perspective: 1000 }}
          >
            흩어진 마케팅 데이터 ROI로 연결하세요
          </MotionText>

          {/* Description */}
          <MotionText
            fontSize={landingDesignSystem.typography.fontSizes.body}
            fontWeight={landingDesignSystem.typography.fontWeights.regular}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : landingDesignSystem.colors.textSecondary}
            lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
            mb="40px"
            maxW="560px"
            variants={itemVariants}
          >
            모든 광고·분석 데이터를 하나의 화면에서 연결하고{'\n'}실시간으로 성과를 판단하세요.
          </MotionText>

          {/* CTA Buttons */}
          <MotionBox variants={itemVariants}>
            <HStack spacing="16px" mb="32px" flexWrap="wrap">
              <Button
                variant="black"
                size="md"
                onClick={() => navigate('/auth/sign-up')}
              >
                무료로 시작하기
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<MdPlayCircleOutline size={20} />}
              >
                데모 보기
              </Button>
            </HStack>
          </MotionBox>

          {/* Trust Badges */}
          <MotionBox variants={itemVariants}>
            <VStack align="flex-start" spacing="12px">
              <Text
                fontSize={landingDesignSystem.typography.fontSizes.caption}
                fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Built for performance-focused marketing teams
              </Text>
              <HStack spacing="12px" flexWrap="wrap">
                {trustBadges.map((badge, index) => (
                  <Flex
                    key={index}
                    align="center"
                    gap="6px"
                    px="14px"
                    py="8px"
                    borderRadius={landingDesignSystem.borderRadius.full}
                    bg={colorMode === 'dark' ? 'rgba(66, 42, 251, 0.15)' : 'rgba(66, 42, 251, 0.08)'}
                    border={`1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.3)' : 'rgba(66, 42, 251, 0.2)'}`}
                    transition="all 0.3s ease"
                    _hover={{
                      bg: colorMode === 'dark' ? 'rgba(66, 42, 251, 0.25)' : 'rgba(66, 42, 251, 0.15)',
                      borderColor: landingDesignSystem.colors.accent,
                      transform: 'translateY(-2px)',
                    }}
                  >
                    <Box
                      as={badge.icon}
                      color={landingDesignSystem.colors.accent}
                      fontSize="16px"
                    />
                    <Text
                      fontSize="14px"
                      fontWeight={landingDesignSystem.typography.fontWeights.medium}
                      color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                    >
                      {badge.text}
                    </Text>
                  </Flex>
                ))}
              </HStack>
            </VStack>
          </MotionBox>
        </MotionFlex>

        {/* Right Content - Dashboard Preview */}
        <MotionBox
          flex={1}
          position="relative"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <Box
            position="relative"
            borderRadius={landingDesignSystem.borderRadius.xlarge}
            overflow="hidden"
            boxShadow={landingDesignSystem.shadows.xl}
            bg={colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.white}
            border={`1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.3)' : 'rgba(0, 0, 0, 0.05)'}`}
            p={{ base: '16px', md: '24px' }}
          >
            {/* Dashboard Mockup */}
            <VStack spacing="16px" align="stretch">
              {/* Dashboard Header */}
              <Flex justify="space-between" align="center" mb="8px">
                <HStack spacing="6px">
                  <Box w="12px" h="12px" borderRadius="50%" bg="#FF5F57" />
                  <Box w="12px" h="12px" borderRadius="50%" bg="#FFBD2E" />
                  <Box w="12px" h="12px" borderRadius="50%" bg="#28CA42" />
                </HStack>
                <HStack spacing="12px">
                  <Box
                    w="32px"
                    h="32px"
                    borderRadius="8px"
                    bg={colorMode === 'dark' ? 'rgba(66, 42, 251, 0.2)' : landingDesignSystem.colors.primary}
                  />
                  <Box
                    w="32px"
                    h="32px"
                    borderRadius="8px"
                    bg={landingDesignSystem.colors.accent}
                  />
                </HStack>
              </Flex>

              {/* Stats Row */}
              <HStack spacing="12px" mb="8px">
                {[
                  { label: 'REVENUE', value: '$124.5k', change: '+12%' },
                  { label: 'USERS', value: '34.2k', change: '+8%' },
                  { label: 'ACTIVE', value: '1.8k', change: '+24%' },
                ].map((stat, index) => (
                  <VStack
                    key={index}
                    flex={1}
                    align="flex-start"
                    spacing="4px"
                    p="16px"
                    borderRadius={landingDesignSystem.borderRadius.medium}
                    bg={colorMode === 'dark' ? 'rgba(66, 42, 251, 0.15)' : landingDesignSystem.colors.primary}
                  >
                    <Text
                      fontSize="10px"
                      fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                      color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                      letterSpacing="0.05em"
                    >
                      {stat.label}
                    </Text>
                    <Text
                      fontSize="20px"
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      fontSize="12px"
                      fontWeight={landingDesignSystem.typography.fontWeights.medium}
                      color={landingDesignSystem.colors.accent}
                    >
                      {stat.change}
                    </Text>
                  </VStack>
                ))}
              </HStack>

              {/* Chart Area */}
              <Box
                h="200px"
                borderRadius={landingDesignSystem.borderRadius.medium}
                bg={colorMode === 'dark' ? 'rgba(66, 42, 251, 0.15)' : landingDesignSystem.colors.primary}
                p="16px"
                position="relative"
              >
                <HStack justify="space-between" align="center" mb="12px">
                  <Text
                    fontSize="12px"
                    fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                  >
                    GROWTH VELOCITY
                  </Text>
                  <HStack spacing="6px">
                    <Box w="6px" h="6px" borderRadius="50%" bg={landingDesignSystem.colors.accent} />
                    <Text fontSize="10px" color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}>
                      LIVE
                    </Text>
                  </HStack>
                </HStack>
                {/* Simplified chart representation */}
                <Box position="relative" h="140px">
                  <svg width="100%" height="100%" viewBox="0 0 400 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={landingDesignSystem.colors.accent} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={landingDesignSystem.colors.accent} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 120 Q 100 90, 200 60 T 400 20 L 400 140 L 0 140 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M 0 120 Q 100 90, 200 60 T 400 20"
                      stroke={landingDesignSystem.colors.textPrimary}
                      strokeWidth="3"
                      fill="none"
                    />
                  </svg>
                  <Box
                    position="absolute"
                    top="20px"
                    right="40px"
                    bg={landingDesignSystem.colors.accent}
                    px="12px"
                    py="6px"
                    borderRadius={landingDesignSystem.borderRadius.small}
                  >
                    <Text
                      fontSize="14px"
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={landingDesignSystem.colors.textPrimary}
                    >
                      +127%
                    </Text>
                  </Box>
                </Box>
              </Box>

              {/* Notification */}
              <HStack
                spacing="12px"
                p="12px"
                borderRadius={landingDesignSystem.borderRadius.medium}
                bg={colorMode === 'dark' ? 'rgba(66, 42, 251, 0.15)' : landingDesignSystem.colors.primary}
              >
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="50%"
                  bg={landingDesignSystem.colors.accent}
                />
                <VStack align="flex-start" spacing="2px" flex={1}>
                  <Text
                    fontSize="12px"
                    fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                    color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
                  >
                    Workflow "Q3 Report" automated
                  </Text>
                  <Text
                    fontSize="10px"
                    color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
                  >
                    Triggered by @sarah_j
                  </Text>
                </VStack>
                <Text
                  fontSize="10px"
                  fontWeight={landingDesignSystem.typography.fontWeights.medium}
                  color={landingDesignSystem.colors.accent}
                >
                  Just now
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* Decorative Elements */}
          <Box
            position="absolute"
            top="-40px"
            right="-40px"
            w="200px"
            h="200px"
            borderRadius="50%"
            bg={landingDesignSystem.colors.accent}
            opacity={0.1}
            filter="blur(60px)"
            zIndex={-1}
          />
        </MotionBox>
      </Flex>
    </Box>
  );
};

export default HeroSection;
