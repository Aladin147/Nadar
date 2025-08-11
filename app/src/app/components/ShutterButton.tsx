import React from 'react';
import { TouchableOpacity, StyleSheet, View, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

interface ShutterButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ShutterButton({ onPress, isLoading, disabled }: ShutterButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading || disabled}
      style={[styles.outer, (isLoading || disabled) && styles.disabled]}
      accessibilityLabel="Capture"
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(isLoading || disabled) }}
    >
      <View style={styles.inner}>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} size={32} />
        ) : (
          <View style={styles.icon} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.elev2,
  },
  inner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderColor: theme.colors.bg,
    borderWidth: 4,
  },
  disabled: {
    opacity: 0.7,
  },
});
