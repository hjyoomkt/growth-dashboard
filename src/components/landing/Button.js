import React from 'react';
import { Button as ChakraButton } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';

const MotionButton = motion(ChakraButton);

export const Button = ({
  variant = 'primary',
  children,
  size = 'lg',
  rightIcon,
  leftIcon,
  ...props
}) => {
  const variants = {
    primary: {
      bg: landingDesignSystem.colors.accent,
      color: landingDesignSystem.colors.white,
      _hover: {
        bg: landingDesignSystem.colors.accentLight,
      },
      border: 'none',
    },
    black: {
      bg: landingDesignSystem.colors.textPrimary,
      color: landingDesignSystem.colors.white,
      _hover: {
        bg: landingDesignSystem.colors.navy,
      },
      border: 'none',
    },
    secondary: {
      bg: 'transparent',
      color: landingDesignSystem.colors.textPrimary,
      border: `2px solid ${landingDesignSystem.colors.textPrimary}`,
      _hover: {
        bg: landingDesignSystem.colors.textPrimary,
        color: landingDesignSystem.colors.white,
      },
    },
    outline: {
      bg: 'transparent',
      color: landingDesignSystem.colors.textSecondary,
      border: `1px solid ${landingDesignSystem.colors.textSecondary}`,
      _hover: {
        borderColor: landingDesignSystem.colors.textPrimary,
        color: landingDesignSystem.colors.textPrimary,
      },
    },
  };

  const sizes = {
    sm: {
      height: '40px',
      px: '24px',
      fontSize: landingDesignSystem.typography.fontSizes.bodySmall,
    },
    md: {
      height: '48px',
      px: '32px',
      fontSize: landingDesignSystem.typography.fontSizes.body,
    },
    lg: {
      height: '56px',
      px: '40px',
      fontSize: landingDesignSystem.typography.fontSizes.body,
    },
  };

  return (
    <MotionButton
      borderRadius={landingDesignSystem.borderRadius.full}
      fontWeight={landingDesignSystem.typography.fontWeights.semibold}
      fontFamily={landingDesignSystem.typography.fontFamily.body}
      boxShadow={variant === 'primary' || variant === 'black' ? landingDesignSystem.shadows.md : 'none'}
      transition="all 0.3s ease"
      rightIcon={rightIcon}
      leftIcon={leftIcon}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      {...variants[variant]}
      {...sizes[size]}
      {...props}
    >
      {children}
    </MotionButton>
  );
};

export default Button;
