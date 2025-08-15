// Nadar - Sophisticated Dark Theme
// Inspired by modern design systems with accessibility-first approach

export const theme = {
  colors: {
    // Core Brand Colors - Deep blue with premium feel
    primary: '#3B82F6',        // Modern blue, accessible contrast
    primaryDark: '#1E40AF',    // Darker blue for pressed states
    primaryLight: '#60A5FA',   // Lighter blue for highlights
    primaryGlow: '#1E40AF',    // Glow effect behind CTAs

    // Semantic Colors - Clear and accessible
    success: '#10B981',        // Emerald green
    warning: '#F59E0B',        // Amber
    error: '#EF4444',          // Red
    info: '#06B6D4',           // Cyan

    // Background Hierarchy - Rich dark palette
    bg: '#0A0F14',             // Deep dark background
    surface: '#0F1621',        // Primary surface
    surfaceAlt: '#101825',     // Alternative surface
    surfaceElevated: '#172235', // Elevated surface (cards, modals)
    surfaceHighlight: '#1F2A37', // Highlighted surface

    // Text Hierarchy - High contrast for accessibility
    text: '#E5E7EB',           // Primary text (high contrast)
    textSecondary: '#9CA3AF',  // Secondary text (muted)
    textTertiary: '#6B7280',   // Tertiary text (subtle)
    textInverse: '#111827',    // Text on light backgrounds

    // Interactive Elements
    border: '#1F2A37',         // Default borders
    borderLight: '#374151',    // Lighter borders
    borderFocus: '#93C5FD',    // Focus ring color

    // Overlay & Effects
    overlay: 'rgba(0, 0, 0, 0.75)',      // Modal overlays
    overlayLight: 'rgba(0, 0, 0, 0.35)',  // Light overlays
    glass: 'rgba(15, 22, 33, 0.8)',      // Glass morphism

    // Accessibility
    focus: '#93C5FD',          // Focus indicators
    disabled: '#4B5563',       // Disabled state
    divider: 'rgba(255, 255, 255, 0.08)', // Hairline dividers
  },

  // Consistent spacing system (8pt grid)
  spacing: (multiplier: number = 1) => multiplier * 8,

  // Modern border radius scale
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 999,
  },

  // Typography scale - Optimized for accessibility
  typography: {
    // Display text (hero sections)
    display: {
      fontSize: 32,
      fontWeight: '800' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    // Page titles
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    // Section headings
    heading: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    // Subheadings
    subheading: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: -0.1,
    },
    // Body text
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    // Small body text
    bodySmall: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0,
    },
    // Captions and metadata
    caption: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.1,
    },
    // Labels and buttons
    label: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
  },

  // Elevation system - Modern shadows for depth
  shadows: {
    // Subtle elevation
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    // Medium elevation
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    // High elevation
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    // Maximum elevation
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  // Animation system - Smooth and delightful
  animation: {
    // Duration presets
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
      slower: 500,
    },
    // Easing curves
    easing: {
      ease: [0.25, 0.1, 0.25, 1] as const,
      easeIn: [0.42, 0, 1, 1] as const,
      easeOut: [0, 0, 0.58, 1] as const,
      easeInOut: [0.42, 0, 0.58, 1] as const,
      spring: [0.68, -0.55, 0.265, 1.55] as const,
    },
    // Spring configurations
    spring: {
      gentle: { tension: 120, friction: 14 },
      wobbly: { tension: 180, friction: 12 },
      stiff: { tension: 210, friction: 20 },
    },
  },

  // Gradient definitions
  gradients: {
    // Primary brand gradient
    primary: {
      colors: ['#3B82F6', '#1E40AF'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Background gradients
    background: {
      colors: ['#0A0F14', '#0F1621'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Surface gradients
    surface: {
      colors: ['#172235', '#1F2A37'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Overlay gradients
    overlay: {
      colors: ['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.4)'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
  },
};

// Utility functions for consistent styling
export const createTextStyle = (variant: keyof typeof theme.typography, color?: string) => ({
  ...theme.typography[variant],
  color: color || theme.colors.text,
});

export const createShadowStyle = (elevation: keyof typeof theme.shadows) => ({
  ...theme.shadows[elevation],
});

// Pre-built component styles for consistency
export const componentStyles = {
  // Button variants
  button: {
    primary: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      minHeight: 56,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      ...theme.shadows.md,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      minHeight: 56,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      ...theme.shadows.sm,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(3),
      minHeight: 56,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    floating: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      width: 64,
      height: 64,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      ...theme.shadows.lg,
    },
  },

  // Card variants
  card: {
    default: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing(3),
      ...theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.lg,
      padding: theme.spacing(3),
      ...theme.shadows.md,
    },
    glass: {
      backgroundColor: theme.colors.glass,
      borderRadius: theme.radius.lg,
      padding: theme.spacing(3),
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
  },

  // Input variants
  input: {
    default: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing(2),
      paddingHorizontal: theme.spacing(2),
      minHeight: 48,
      ...createTextStyle('body'),
    },
    focused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      ...theme.shadows.sm,
    },
  },
};