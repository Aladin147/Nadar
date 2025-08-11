import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface TimingsBadgeProps {
  label: string;
  value: string | number;
  style?: ViewStyle;
}

export function TimingsBadge({ label, value, style }: TimingsBadgeProps) {
  const displayValue = typeof value === 'number' ? `${value}ms` : value;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>
        {label}: {displayValue}
      </Text>
    </View>
  );
}

export interface TimingsGroupProps {
  timings: Array<{ label: string; value: string | number }>;
  style?: ViewStyle;
}

export function TimingsGroup({ timings, style }: TimingsGroupProps) {
  return (
    <View style={[styles.group, style]}>
      {timings.map((timing, index) => (
        <TimingsBadge key={index} label={timing.label} value={timing.value} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#262626',
    borderRadius: theme.radius.sm,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing(1),
  },
  text: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
});
