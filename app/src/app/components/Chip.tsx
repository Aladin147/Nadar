import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface ChipProps {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ title, selected = false, onPress, style }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected, style]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.hairline,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.elev1,
  },
  text: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  textSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
});
