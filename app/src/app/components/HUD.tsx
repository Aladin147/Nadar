import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface HUDProps {
  message: string;
  visible?: boolean;
  style?: ViewStyle;
}

export function HUD({ message, visible = true, style }: HUDProps) {
  if (!visible) return null;

  return (
    <View style={[styles.overlay, style]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay35,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    alignItems: 'center',
    minWidth: 200,
    ...theme.shadows.elev2,
  },
  message: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginTop: theme.spacing(2),
    textAlign: 'center',
  },
});
