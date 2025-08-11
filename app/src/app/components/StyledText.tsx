import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

type TypoVariant = keyof typeof theme.typography;

interface StyledTextProps extends TextProps {
  variant?: TypoVariant;
  color?: keyof typeof theme.colors;
  children: React.ReactNode;
}

export function StyledText({
  variant = 'body',
  color,
  style,
  children,
  ...props
}: StyledTextProps) {
  const textStyle = theme.typography[variant];
  const textColor = color ? theme.colors[color] : (variant === 'meta' ? theme.colors.textMut : theme.colors.text);

  return (
    <Text style={[textStyle, { color: textColor }, style]} {...props}>
      {children}
    </Text>
  );
}
