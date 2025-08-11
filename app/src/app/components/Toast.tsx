import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  visible: boolean;
  onHide?: () => void;
  duration?: number;
  style?: ViewStyle;
}

export function Toast({
  message,
  type = 'error',
  visible,
  onHide,
  duration = 4000,
  style,
}: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  // Don't render if not visible
  if (!visible) return null;

  const backgroundColor =
    type === 'error'
      ? theme.colors.danger
      : type === 'success'
        ? theme.colors.success
        : theme.colors.surface;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={message}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: theme.spacing(2),
    right: theme.spacing(2),
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    zIndex: 1000,
    ...theme.shadows.elev2,
  },
  message: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
});
