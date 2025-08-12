import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme, ui } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'boldLight';
  style?: ViewStyle | ViewStyle[];
}

export function Card({ children, variant = 'default', style }: CardProps) {
  const cardStyle = variant === 'boldLight' ? styles.boldLight : styles.default;
  
  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
  },
  boldLight: {
    ...ui.boldLightCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
  },
});
