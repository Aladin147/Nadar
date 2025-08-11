import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme, buttons } from '../theme';

export function SecondaryButton({
  title,
  onPress,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.btn, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    ...buttons.secondary,
  },
  disabled: { opacity: 0.6 },
  text: {
    color: theme.colors.text,
    fontWeight: '600',
    letterSpacing: 0.15,
    fontSize: 16,
  },
  textDisabled: {
    color: theme.colors.textMut,
  },
});
