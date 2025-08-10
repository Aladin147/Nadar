export const theme = {
  colors: {
    // Core palette (dark) - Updated to match design guide exactly
    bg: '#0A0F14',
    surface: '#0F1621',
    surfaceAlt: '#101825',
    surfaceBoldLight: '#172235',
    border: '#1F2A37',
    primary: '#3B82F6',
    primaryAlt: '#60A5FA',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    text: '#E5E7EB',
    textMut: '#9CA3AF',
    focus: '#93C5FD',

    // Opacity tokens
    hairline: 'rgba(255,255,255,0.08)',
    overlay70: 'rgba(0,0,0,0.70)', // camera overlays
    overlay35: 'rgba(0,0,0,0.35)', // HUD
  },
  spacing: (n: number) => n * 8,
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  typography: {
    display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: 0.2 },
    title: { fontSize: 24, fontWeight: '800' as const, letterSpacing: 0.2 },
    section: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.15 },
    body: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
    meta: { fontSize: 12, fontWeight: '600' as const },
  },
  shadows: {
    elev1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 6,
    },
    elev2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.32,
      shadowRadius: 24,
      elevation: 10,
    },
  },
  gradients: {
    brand: {
      colors: ['#0B1220', '#0A0F14'],
      // Radial glow behind primary CTA
      radialAccent: '#1E40AF',
    },
  },
  motion: {
    durations: {
      enter: 180,
      exit: 140,
      press: 90,
    },
    easing: [0.2, 0.8, 0.2, 1] as const, // cubic bezier
    spring: {
      tension: 0.5,
      damping: 12,
    },
  },
};

export const ui = {
  // Usage: style={[styles.card, ui.boldLightCard]}
  boldLightCard: {
    backgroundColor: theme.colors.surfaceBoldLight,
    borderColor: '#273449',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  // Focus ring for web accessibility
  focusRing: {
    outlineWidth: 3,
    outlineStyle: 'solid' as const,
    outlineColor: theme.colors.focus,
  },
} as const;

// Typography utilities
export const typography = {
  // Apply theme typography with color
  display: (color: string = theme.colors.text) => ({
    ...theme.typography.display,
    color,
  }),
  title: (color: string = theme.colors.text) => ({
    ...theme.typography.title,
    color,
  }),
  section: (color: string = theme.colors.text) => ({
    ...theme.typography.section,
    color,
  }),
  body: (color: string = theme.colors.text) => ({
    ...theme.typography.body,
    color,
  }),
  meta: (color: string = theme.colors.textMut) => ({
    ...theme.typography.meta,
    color,
  }),
};

// Button style utilities
export const buttons = {
  primary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing(2), // 16dp
    paddingHorizontal: theme.spacing(2.5), // 20dp
    minHeight: 56,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...theme.shadows.elev1,
  },
  secondary: {
    backgroundColor: theme.colors.hairline,
    borderColor: theme.colors.hairline,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2.5),
    minHeight: 56,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2.5),
    minHeight: 56,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

