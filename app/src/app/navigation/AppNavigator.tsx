import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

export type Route = 'landing' | 'onboarding' | 'capture' | 'results' | 'settings' | 'history';

export function AppNavigator({ 
  currentRoute, 
  onNavigate, 
  children 
}: { 
  currentRoute: Route; 
  onNavigate: (route: Route) => void; 
  children: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      
      {currentRoute !== 'landing' && currentRoute !== 'onboarding' && (
        <View style={styles.tabBar}>
          <TabButton 
            icon="📷" 
            label="Capture" 
            active={currentRoute === 'capture'} 
            onPress={() => onNavigate('capture')} 
          />
          <TabButton 
            icon="📋" 
            label="History" 
            active={currentRoute === 'history'} 
            onPress={() => onNavigate('history')} 
          />
          <TabButton 
            icon="⚙️" 
            label="Settings" 
            active={currentRoute === 'settings'} 
            onPress={() => onNavigate('settings')} 
          />
        </View>
      )}
    </View>
  );
}

function TabButton({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[styles.tab, active && styles.tabActive]} 
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: theme.spacing(1),
    paddingTop: theme.spacing(1),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    color: theme.colors.textMut,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
