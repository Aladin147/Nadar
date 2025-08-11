import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { testConnection } from '../../api/client';

type Status = 'online' | 'offline' | 'unknown';

export function ConnectivityPill({ style }: { style?: ViewStyle }) {
  const [status, setStatus] = useState<Status>('unknown');

  async function check() {
    try {
      const ok = await testConnection();
      setStatus(ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }

  useEffect(() => {
    check();
    // Optionally recheck periodically in the future
  }, []);

  const bg =
    status === 'online'
      ? theme.colors.success
      : status === 'offline'
        ? theme.colors.danger
        : '#374151'; // Unknown state

  return (
    <TouchableOpacity
      onPress={check}
      accessibilityRole="button"
      accessibilityLabel={`Connectivity status: ${status}. Double tap to recheck.`}
      style={[styles.wrap, { backgroundColor: bg }, style]}
    >
      <View style={styles.dot} />
      <Text style={styles.text}>
        {status === 'unknown' ? 'Unknown' : status === 'online' ? 'Online' : 'Offline'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    opacity: 0.9,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
