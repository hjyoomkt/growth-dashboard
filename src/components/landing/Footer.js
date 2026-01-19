import React from 'react';
import { Box, Flex, Text, VStack, HStack, SimpleGrid, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { landingDesignSystem } from '../../theme/landingTheme';
import { HorizonLogo } from 'components/icons/Icons';

export const Footer = () => {
  const { colorMode } = useColorMode();

  const footerLinks = {
    Product: ['기능', '통합', '요금제', 'API'],
    Company: ['회사 소개', '채용', '문의', '블로그'],
    Legal: ['개인정보 처리방침', '서비스 약관', '쿠키 정책'],
  };

  return (
    <Box
      as="footer"
      py={{ base: '60px', md: '80px' }}
      bg={colorMode === 'dark' ? '#1F1F1F' : landingDesignSystem.colors.textPrimary}
      borderTop={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`}
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        <Flex
          direction={{ base: 'column', lg: 'row' }}
          justify="space-between"
          gap={{ base: '48px', lg: '80px' }}
        >
          {/* Brand Section */}
          <VStack align={{ base: 'center', lg: 'flex-start' }} spacing="24px" flex={1}>
            <Flex align="center">
              <HorizonLogo
                h='30px'
                w='150px'
                color='white'
              />
            </Flex>

            <Text
              fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
              color="rgba(255, 255, 255, 0.6)"
              maxW="300px"
              textAlign={{ base: 'center', lg: 'left' }}
            >
              현대 마케팅 팀을 위한 통합 분석 플랫폼. 모든 캠페인을 한 곳에서 추적, 분석, 최적화하세요.
            </Text>
          </VStack>

          {/* Links Section */}
          <SimpleGrid
            columns={{ base: 2, md: 3 }}
            spacing={{ base: '32px', md: '48px' }}
            flex={2}
          >
            {Object.entries(footerLinks).map(([category, links]) => (
              <VStack key={category} align={{ base: 'center', md: 'flex-start' }} spacing="16px">
                <Text
                  fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                  fontWeight={landingDesignSystem.typography.fontWeights.semibold}
                  color={landingDesignSystem.colors.white}
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  {category}
                </Text>
                {links.map((link) => (
                  <Text
                    key={link}
                    as="a"
                    href="#"
                    fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                    color="rgba(255, 255, 255, 0.6)"
                    _hover={{
                      color: landingDesignSystem.colors.accent,
                      cursor: 'pointer',
                    }}
                    transition="color 0.3s ease"
                  >
                    {link}
                  </Text>
                ))}
              </VStack>
            ))}
          </SimpleGrid>
        </Flex>

        {/* Bottom Section */}
        <Flex
          mt={{ base: '48px', md: '64px' }}
          pt={{ base: '24px', md: '32px' }}
          borderTop="1px solid rgba(255, 255, 255, 0.1)"
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align="center"
          gap="16px"
        >
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.caption}
            color="rgba(255, 255, 255, 0.5)"
            textAlign={{ base: 'center', md: 'left' }}
          >
            © 2026 ZEST DOT. All rights reserved.
          </Text>

          <HStack spacing="24px">
            {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
              <Text
                key={social}
                as="a"
                href="#"
                fontSize={landingDesignSystem.typography.fontSizes.caption}
                color="rgba(255, 255, 255, 0.5)"
                _hover={{
                  color: landingDesignSystem.colors.accent,
                  cursor: 'pointer',
                }}
                transition="color 0.3s ease"
              >
                {social}
              </Text>
            ))}
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default Footer;
