import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../app/theme';

export default function AccessibilityTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accessibility Test Screen</Text>
      <Text style={styles.description}>
        This screen is used for accessibility testing and development.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
