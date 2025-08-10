import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={[styles.item, value===opt && styles.active]}
          accessibilityRole="tab"
          accessibilityState={{ selected: value===opt }}
          accessibilityLabel={`${opt} mode`}
          accessibilityHint={`Switch to ${opt} mode`}
        >
          <Text style={[styles.label, value===opt && styles.labelActive]}>{opt.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.full,
    padding: 4,
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  item: {
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.full,
    minHeight: 44,
    justifyContent: 'center',
    minWidth: 80,
  },
  active: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.elev1,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelActive: {
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

