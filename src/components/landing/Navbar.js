import React from 'react';
import { Box, Flex, HStack, Text, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import Button from './Button';
import { HorizonLogo } from 'components/icons/Icons';

const MotionBox = motion(Box);

export const Navbar = () => {
  const { colorMode } = useColorMode();
  const navigate = useNavigate();

  const navLinks = [
    { label: '주요기능', href: '#features' },
    { label: '분석', href: '#analytics' },
    { label: '요금제', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // navbar height
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <MotionBox
      as="nav"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
      bg={colorMode === 'dark' ? 'rgba(27, 37, 89, 0.95)' : 'rgba(255, 255, 255, 0.95)'}
      backdropFilter="blur(12px)"
      borderBottom={`1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.2)' : 'rgba(66, 42, 251, 0.1)'}`}
      boxShadow={landingDesignSystem.shadows.sm}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Flex
        maxW="1440px"
        mx="auto"
        px={{ base: '24px', md: '48px', lg: '64px' }}
        py="20px"
        align="center"
        justify="space-between"
      >
        {/* Logo */}
        <Flex align="center">
          <HorizonLogo
            h='30px'
            w='150px'
            color={useColorModeValue('navy.700', 'white')}
          />
        </Flex>

        {/* Navigation Links */}
        <HStack spacing="32px" display={{ base: 'none', md: 'flex' }}>
          {navLinks.map((link) => (
            <Text
              key={link.label}
              onClick={() => scrollToSection(link.href)}
              fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
              fontWeight={landingDesignSystem.typography.fontWeights.medium}
              color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textSecondary}
              _hover={{
                color: colorMode === 'dark' ? landingDesignSystem.colors.accent : landingDesignSystem.colors.textPrimary,
                cursor: 'pointer',
              }}
              transition="color 0.3s ease"
              cursor="pointer"
            >
              {link.label}
            </Text>
          ))}
        </HStack>

        {/* CTA Buttons */}
        <HStack spacing="16px">
          <Text
            onClick={() => navigate('/auth/sign-in')}
            fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
            fontWeight={landingDesignSystem.typography.fontWeights.medium}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textSecondary}
            display={{ base: 'none', sm: 'block' }}
            _hover={{
              color: colorMode === 'dark' ? landingDesignSystem.colors.accent : landingDesignSystem.colors.textPrimary,
              cursor: 'pointer',
            }}
            transition="color 0.3s ease"
          >
            로그인
          </Text>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/auth/sign-up')}
          >
            시작하기
          </Button>
        </HStack>
      </Flex>
    </MotionBox>
  );
};

export default Navbar;
