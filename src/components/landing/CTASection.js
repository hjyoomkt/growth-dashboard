import React from 'react';
import { Box, Text, VStack, HStack, useColorMode } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { landingDesignSystem } from '../../theme/landingTheme';
import Button from './Button';

const MotionBox = motion(Box);

export const CTASection = () => {
  const { colorMode } = useColorMode();
  const navigate = useNavigate();

  return (
    <Box
      py={{ base: '80px', md: '100px' }}
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.white}
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        <MotionBox
          position="relative"
          p={{ base: '48px 32px', md: '80px 64px' }}
          borderRadius={landingDesignSystem.borderRadius.xlarge}
          bg={colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.black}
          border={`2px solid ${landingDesignSystem.colors.accent}`}
          overflow="hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Background Gradient */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="500px"
            h="500px"
            borderRadius="50%"
            bg={landingDesignSystem.colors.accent}
            opacity={0.08}
            filter="blur(100px)"
            zIndex={0}
          />

          {/* Content */}
          <VStack spacing="32px" textAlign="center" position="relative" zIndex={1}>
            <Text
              fontSize={landingDesignSystem.typography.fontSizes.caption}
              fontWeight={landingDesignSystem.typography.fontWeights.semibold}
              color="rgba(255, 255, 255, 0.6)"
              textTransform="uppercase"
              letterSpacing="0.1em"
            >
              시작하기
            </Text>

            <Text
              fontSize={{ base: '36px', md: '56px' }}
              fontWeight={landingDesignSystem.typography.fontWeights.bold}
              color={landingDesignSystem.colors.white}
              lineHeight={landingDesignSystem.typography.lineHeights.tight}
              fontFamily={landingDesignSystem.typography.fontFamily.heading}
              maxW="700px"
            >
              최적화할 준비가 되셨나요?
            </Text>

            <Text
              fontSize={landingDesignSystem.typography.fontSizes.body}
              color="rgba(255, 255, 255, 0.8)"
              maxW="600px"
              lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
            >
              제스트닷으로 더 나은 ROI를 달성하는 수천 개의 마케팅 팀에 합류하세요.
            </Text>

            <HStack spacing="16px" flexWrap="wrap" justify="center" pt="8px">
              <Button variant="primary" size="lg" onClick={() => navigate('/auth/sign-up')}>
                지금 시작하기
              </Button>
              <Button
                variant="outline"
                size="lg"
                borderColor="rgba(255, 255, 255, 1)"
                color="rgba(255, 255, 255, 1)"
                _hover={{
                  bg: 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
                onClick={() => navigate('/auth/sign-up')}
              >
                영업문의
              </Button>
            </HStack>
          </VStack>
        </MotionBox>
      </Box>
    </Box>
  );
};

export default CTASection;
