import React from 'react';
import { Box, Flex, Text, useColorMode, keyframes } from '@chakra-ui/react';
import { landingDesignSystem } from '../../theme/landingTheme';

export const LogoCarousel = () => {
  const { colorMode } = useColorMode();

  const companies = [
    'Spherule',
    'GlobalBank',
    'Nietzsche',
    'BOLTSHIFT',
    'Lightbox',
    'FeatherDev',
  ];

  // 무한 스크롤 애니메이션
  const scroll = keyframes`
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  `;

  return (
    <Box
      py={{ base: '60px', md: '80px' }}
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.white}
      borderTop={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`}
      borderBottom={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`}
    >
      <Box maxW="1440px" mx="auto" px={{ base: '24px', md: '48px', lg: '64px' }}>
        <Text
          fontSize={landingDesignSystem.typography.fontSizes.caption}
          fontWeight={landingDesignSystem.typography.fontWeights.semibold}
          color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : landingDesignSystem.colors.textSecondary}
          textAlign="center"
          textTransform="uppercase"
          letterSpacing="0.1em"
          mb="40px"
        >
          Trusted by leading brands
        </Text>

        {/* Logo Container with infinite scroll */}
        <Box position="relative" overflow="hidden">
          <Flex
            gap="80px"
            align="center"
            animation={`${scroll} 30s linear infinite`}
            w="max-content"
          >
            {/* 첫 번째 세트 */}
            {companies.map((company, index) => (
              <Text
                key={`first-${index}`}
                fontSize={{ base: '20px', md: '24px' }}
                fontWeight={landingDesignSystem.typography.fontWeights.bold}
                color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'}
                transition="color 0.3s ease"
                cursor="default"
                whiteSpace="nowrap"
                _hover={{
                  color: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                }}
              >
                {company}
              </Text>
            ))}
            {/* 두 번째 세트 (무한 루프용) */}
            {companies.map((company, index) => (
              <Text
                key={`second-${index}`}
                fontSize={{ base: '20px', md: '24px' }}
                fontWeight={landingDesignSystem.typography.fontWeights.bold}
                color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'}
                transition="color 0.3s ease"
                cursor="default"
                whiteSpace="nowrap"
                _hover={{
                  color: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                }}
              >
                {company}
              </Text>
            ))}
          </Flex>
        </Box>
      </Box>
    </Box>
  );
};

export default LogoCarousel;
