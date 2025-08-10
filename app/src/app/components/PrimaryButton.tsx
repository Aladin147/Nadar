import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, buttons, typography } from '../theme';

export function PrimaryButton({ title, onPress, disabled, style }: { title: string; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.btn, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    ...buttons.primary,
    overflow: 'hidden',
    // Stronger blue glow to match mock
    shadowColor: '#3B82F6',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  disabled: { opacity: 0.6 },
  text: {
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 0.2,
    fontSize: 16
  },
});

