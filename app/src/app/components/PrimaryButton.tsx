import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

export function PrimaryButton({ title, onPress, disabled, style }: { title: string; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!!disabled} accessibilityRole="button" accessibilityLabel={title} style={[styles.btn, disabled && styles.disabled, style]}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  text: { color: theme.colors.text, fontWeight: '800' },
});

