import React from 'react';
import { Box, Flex, Text, VStack, HStack, SimpleGrid, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { NavLink } from 'react-router-dom';
import { landingDesignSystem } from '../../theme/landingTheme';
import { ZestDotLogo } from 'components/icons/Icons';

export const Footer = () => {
  const { colorMode } = useColorMode();

  const footerLinks = {
    Product: [
      { label: '기능', href: '#' },
      { label: '통합', href: '#' },
      { label: '요금제', href: '#' },
      { label: 'API', href: '#' },
    ],
    Company: [
      { label: '회사 소개', href: '#' },
      { label: '채용', href: '#' },
      { label: '문의', href: '#' },
      { label: '블로그', href: '#' },
    ],
    Legal: [
      { label: '개인정보 처리방침', href: '/auth/privacy-policy' },
      { label: '서비스 약관', href: '/auth/terms-of-service' },
      { label: '쿠키 정책', href: '#' },
    ],
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
              <ZestDotLogo
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
                    key={link.label}
                    as={link.href.startsWith('/') ? NavLink : 'a'}
                    to={link.href.startsWith('/') ? link.href : undefined}
                    href={link.href.startsWith('/') ? undefined : link.href}
                    fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
                    color="rgba(255, 255, 255, 0.6)"
                    _hover={{
                      color: landingDesignSystem.colors.accent,
                      cursor: 'pointer',
                    }}
                    transition="color 0.3s ease"
                  >
                    {link.label}
                  </Text>
                ))}
              </VStack>
            ))}
          </SimpleGrid>
        </Flex>

        {/* Bottom Section */}
        <VStack
          mt={{ base: '48px', md: '64px' }}
          pt={{ base: '24px', md: '32px' }}
          borderTop="1px solid rgba(255, 255, 255, 0.1)"
          align={{ base: 'center', md: 'flex-start' }}
          spacing="12px"
        >
          {/* Company Info */}
          <Text fontSize={landingDesignSystem.typography.fontSizes.caption} color="rgba(255, 255, 255, 0.4)">
            상호: 제스트닷 | 주소: 서울 강남구 역삼동 하이츠빌딩 151, 03342
          </Text>
          <Text fontSize={landingDesignSystem.typography.fontSizes.caption} color="rgba(255, 255, 255, 0.4)">
            전화: 10-0000-0000 | 이메일: zestdot@zestdot.com
          </Text>

          {/* Copyright and Social Links */}
          <Flex
            width="100%"
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            gap="16px"
            mt="8px"
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
        </VStack>
      </Box>
    </Box>
  );
};

export default Footer;
