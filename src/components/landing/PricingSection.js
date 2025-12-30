import React from 'react';
import { Box, Flex, Text, VStack, HStack, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import { FiCheck } from 'react-icons/fi';
import Button from './Button';

const MotionBox = motion(Box);

export const PricingSection = () => {
  const { colorMode } = useColorMode();

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: '/month',
      description: '개인 또는 소규모 팀을 위한 시작 플랜',
      features: ['프로젝트 1개', '핵심 마케팅 지표 분석', '기본 대시보드', '커뮤니티 기반 지원'],
      buttonText: '무료시작',
      buttonVariant: 'outline',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: '성과 관리가 필요한 성장 단계의 팀을 위해',
      features: [
        '프로젝트 무제한',
        '고급 분석 및 커스텀 지표',
        '우선 기술 지원',
        '주요 마케팅 채널 맞춤 연동',
      ],
      buttonText: '시작하기',
      buttonVariant: 'primary',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: '대규모 마케팅 운영을 위한 맞춤형 솔루션',
      features: [
        '엔터프라이즈급 보안 (SSO 등)',
        '전담 성공 매니저 지원',
        'SLA 기반 안정성 보장',
        '온프레미스 또는 전용 환경 배포 옵션',
      ],
      buttonText: '영업문의',
      buttonVariant: 'secondary',
      popular: false,
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
      id="pricing"
      py={{ base: '80px', md: '120px' }}
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.primary}
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
            요금제
          </Text>
          <Text
            fontSize={{ base: '36px', md: '48px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
          >
            필요에 맞게 시작하고, 성장에 따라 확장하세요.
          </Text>
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.body}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
          >
            예상치 못한 비용 없이, 언제든지 업그레이드 또는 취소할 수 있습니다.
          </Text>
        </VStack>

        {/* Pricing Cards */}
        <MotionBox
          as={Flex}
          direction={{ base: 'column', lg: 'row' }}
          gap="24px"
          justify="center"
          align={{ base: 'stretch', lg: 'flex-end' }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {plans.map((plan, index) => (
            <MotionBox
              key={index}
              flex={1}
              maxW={{ base: '100%', lg: '400px' }}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                position="relative"
                p={{ base: '40px', md: '48px' }}
                borderRadius={landingDesignSystem.borderRadius.large}
                bg={plan.popular
                  ? (colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.black)
                  : (colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.white)
                }
                border={plan.popular
                  ? '2px solid #422AFB'
                  : `1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
                }
                boxShadow={plan.popular ? landingDesignSystem.shadows.xl : landingDesignSystem.shadows.md}
                h="100%"
                transition="all 0.3s ease"
                _hover={{
                  boxShadow: landingDesignSystem.shadows.xl,
                  borderColor: '#422AFB',
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <Box
                    position="absolute"
                    top="-12px"
                    left="50%"
                    transform="translateX(-50%)"
                    px="16px"
                    py="6px"
                    borderRadius={landingDesignSystem.borderRadius.full}
                    bg={landingDesignSystem.colors.white}
                  >
                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.caption}
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={landingDesignSystem.colors.textPrimary}
                      textTransform="uppercase"
                      letterSpacing="0.05em"
                    >
                      ⭐ Most Popular
                    </Text>
                  </Box>
                )}

                <VStack align="flex-start" spacing="32px">
                  {/* Plan Name */}
                  <VStack align="flex-start" spacing="8px" w="100%">
                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.h4}
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={plan.popular
                        ? landingDesignSystem.colors.white
                        : (colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary)
                      }
                    >
                      {plan.name}
                    </Text>
                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                      color={plan.popular
                        ? 'rgba(255, 255, 255, 0.7)'
                        : (colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary)
                      }
                    >
                      {plan.description}
                    </Text>
                  </VStack>

                  {/* Price */}
                  <HStack align="baseline" spacing="4px">
                    <Text
                      fontSize="48px"
                      fontWeight={landingDesignSystem.typography.fontWeights.bold}
                      color={plan.popular
                        ? landingDesignSystem.colors.white
                        : (colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary)
                      }
                      lineHeight={1}
                    >
                      {plan.price}
                    </Text>
                    <Text
                      fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                      color={plan.popular
                        ? 'rgba(255, 255, 255, 0.7)'
                        : (colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary)
                      }
                    >
                      {plan.period}
                    </Text>
                  </HStack>

                  {/* Features */}
                  <VStack align="flex-start" spacing="16px" w="100%">
                    {plan.features.map((feature, idx) => (
                      <HStack key={idx} spacing="12px" align="flex-start">
                        <Box
                          as={FiCheck}
                          fontSize="20px"
                          color={landingDesignSystem.colors.accent}
                          mt="2px"
                          flexShrink={0}
                        />
                        <Text
                          fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                          color={plan.popular
                            ? 'rgba(255, 255, 255, 0.9)'
                            : (colorMode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : landingDesignSystem.colors.textPrimary)
                          }
                        >
                          {feature}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>

                  {/* CTA Button */}
                  <Button
                    variant={plan.buttonVariant}
                    size="lg"
                    w="100%"
                  >
                    {plan.buttonText}
                  </Button>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </MotionBox>
      </Box>
    </Box>
  );
};

export default PricingSection;
