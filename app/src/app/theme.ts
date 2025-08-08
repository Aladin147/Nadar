export const theme = {
  colors: {
    bg: '#0a0a0a',
    surface: '#1a1a1a',
    border: '#333',
    primary: '#6366f1',
    primaryAlt: '#8b5cf6',
    text: '#ffffff',
    textMut: '#9ca3af',
  },
  spacing: (n: number) => n * 8,
  radius: {
    sm: 8, md: 12, lg: 20, xl: 24,
  },
  typography: {
    title: { fontSize: 28, fontWeight: '800' as const },
    body: { fontSize: 16, lineHeight: 24 },
    label: { fontSize: 12, fontWeight: '600' as const },
  }
};

