import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, buttons } from '../theme';
import { StyledText } from './StyledText';

export function PrimaryButton({
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
      <LinearGradient
        colors={['#1E40AF', '#3B82F6', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <StyledText variant="section" style={styles.text}>
        {title}
      </StyledText>
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
    color: '#FFFFFF',
    fontWeight: '700', // Matches section variant
  },
});
