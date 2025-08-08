import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)} style={[styles.item, value===opt && styles.active]} accessibilityRole="button" accessibilityState={{ selected: value===opt }} accessibilityLabel={`${opt} mode`}>
          <Text style={styles.label}>{opt.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: theme.spacing(1), justifyContent: 'center', marginBottom: theme.spacing(2) },
  item: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: theme.spacing(1), paddingHorizontal: theme.spacing(2), borderRadius: theme.radius.xl },
  active: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryAlt },
  label: { color: theme.colors.text, fontWeight: '700' },
});

