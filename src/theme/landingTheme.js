// Design System for Landing Page - Strict Consistency
// Updated for Horizon UI theme and Marketing Analytics Dashboard
export const landingDesignSystem = {
  colors: {
    primary: '#F4F7FE', // Light background (Horizon secondaryGray.300)
    accent: '#422AFB', // Brand purple for CTAs and key highlights
    accentLight: '#7551FF', // Lighter purple for hover states
    textPrimary: '#000000', // Headlines - Pure black
    textSecondary: '#4A5568', // Body text - Medium gray
    white: '#FFFFFF',
    black: '#000000',
    navy: '#1B254B', // Dark navy for dark mode
    cardBg: '#1B2559', // Card background for dark mode
  },

  typography: {
    // Modern sans-serif based typography
    // NO gradients on text - solid colors only
    fontFamily: {
      heading: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      body: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    fontSizes: {
      hero: '72px',
      h1: '56px',
      h2: '48px',
      h3: '36px',
      h4: '28px',
      h5: '24px',
      body: '18px',
      bodySmall: '16px',
      caption: '14px',
      eyebrow: '12px',
    },
    fontWeights: {
      bold: 700,
      semibold: 600,
      medium: 500,
      regular: 400,
    },
    lineHeights: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.7,
    },
  },

  spacing: {
    // Consistent spacing scale
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    xxl: '64px',
    xxxl: '96px',
    section: '120px',
  },

  borderRadius: {
    // 24px+ for soft, friendly rounded corners
    small: '12px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    full: '9999px',
  },

  shadows: {
    // Soft drop shadows with low contrast
    none: 'none',
    sm: '0px 4px 12px rgba(0, 0, 0, 0.04)',
    md: '0px 8px 24px rgba(0, 0, 0, 0.06)',
    lg: '0px 12px 32px rgba(0, 0, 0, 0.08)',
    xl: '0px 20px 48px rgba(0, 0, 0, 0.10)',
  },

  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
    ultrawide: '1920px',
  },

  animation: {
    // Framer Motion compatible values
    duration: {
      fast: 0.2,
      normal: 0.3,
      slow: 0.5,
    },
    easing: {
      default: [0.4, 0.0, 0.2, 1],
      smooth: [0.25, 0.1, 0.25, 1],
    },
    hover: {
      y: -4,
      opacity: 0.9,
    },
  },
};

// Chakra UI theme extensions for Landing Page
export const landingThemeExtension = {
  colors: {
    landing: {
      primary: landingDesignSystem.colors.primary,
      accent: landingDesignSystem.colors.accent,
      textPrimary: landingDesignSystem.colors.textPrimary,
      textSecondary: landingDesignSystem.colors.textSecondary,
    },
  },

  fonts: {
    heading: landingDesignSystem.typography.fontFamily.heading,
    body: landingDesignSystem.typography.fontFamily.body,
  },

  fontSizes: landingDesignSystem.typography.fontSizes,

  shadows: landingDesignSystem.shadows,

  radii: landingDesignSystem.borderRadius,

  space: landingDesignSystem.spacing,
};
