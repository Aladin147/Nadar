import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface ErrorBannerProps {
  message: string;
  style?: ViewStyle;
}

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  return (
    <View style={[styles.banner, style]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: `${theme.colors.danger}E6`, // 0.9 alpha
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    margin: theme.spacing(2),
  },
  text: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});
