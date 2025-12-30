// ROAS Analyzer 독립 디자인 시스템
// Horizon UI와 유사한 톤/구조, 하지만 완전히 독립적으로 구현

export const roasTheme = {
  colors: {
    // Primary colors
    brand: {
      50: '#E6F6FF',
      100: '#BAE3FF',
      200: '#7CC4FA',
      300: '#47A3F3',
      400: '#2186EB',
      500: '#0967D2',
      600: '#0552B5',
      700: '#03449E',
      800: '#01337D',
      900: '#002159',
    },

    // Neutral colors
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },

    // Status colors
    success: {
      50: '#F0FFF4',
      500: '#48BB78',
      700: '#2F855A',
    },
    danger: {
      50: '#FFF5F5',
      500: '#F56565',
      700: '#C53030',
    },
    warning: {
      50: '#FFFAF0',
      500: '#ED8936',
      700: '#C05621',
    },
    info: {
      50: '#EBF8FF',
      500: '#4299E1',
      700: '#2B6CB0',
    },

    // Background
    background: {
      light: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#F7FAFC',
    },

    // Text
    text: {
      primary: '#2D3748',
      secondary: '#718096',
      tertiary: '#A0AEC0',
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  typography: {
    fontFamily: {
      base: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      heading: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// 유틸리티 함수들
export const getColor = (colorPath) => {
  const paths = colorPath.split('.');
  let value = roasTheme.colors;

  for (const path of paths) {
    value = value[path];
    if (!value) return colorPath;
  }

  return value;
};

export const getSpacing = (size) => {
  return roasTheme.spacing[size] || size;
};

export const getBorderRadius = (size) => {
  return roasTheme.borderRadius[size] || size;
};

export const getShadow = (size) => {
  return roasTheme.shadows[size] || 'none';
};
