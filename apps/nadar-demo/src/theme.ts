export const theme = {
  colors: {
    primary: '#007AFF',
    primaryDark: '#0056CC',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    
    bg: '#000000',
    surface: '#1C1C1E',
    surfaceAlt: '#2C2C2E',
    
    text: '#FFFFFF',
    textMut: '#8E8E93',
    textInv: '#000000',
    
    border: '#38383A',
    borderLight: '#48484A',
  },
  
  spacing: (multiplier: number = 1) => multiplier * 8,
  
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  
  typography: {
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
    },
    heading: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
  },
};