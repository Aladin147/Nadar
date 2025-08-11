import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ConnectivityPill } from '../components/ConnectivityPill';

export type Route = 'landing' | 'capture' | 'results' | 'settings' | 'history' | 'accessibility-test';

export function AppNavigator({ 
  currentRoute, 
  onNavigate, 
  children 
}: { 
  currentRoute: Route; 
  onNavigate: (route: Route) => void; 
  children: React.ReactNode;
}) {
  const title =
    currentRoute === 'results' ? 'Results' :
    currentRoute === 'history' ? 'History' :
    currentRoute === 'settings' ? 'Settings' :
    currentRoute === 'accessibility-test' ? 'Accessibility Test' :
    'نظر';
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {currentRoute !== 'landing' && (
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              {currentRoute !== 'capture' && (
                <TouchableOpacity
                  onPress={() => onNavigate('capture')}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  style={styles.backBtn}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.brand}>{title}</Text>
                <Text style={styles.brandSub}>Nadar</Text>
              </View>
            </View>
            <ConnectivityPill />
          </View>
        )}
        {children}
      </View>
      
      {currentRoute !== 'landing' && (
        <View style={styles.tabBar}>
          <TabButton 
            icon={<Ionicons name="camera-outline" size={22} color={theme.colors.textMut} />} 
            label="Capture" 
            active={currentRoute === 'capture'} 
            onPress={() => onNavigate('capture')} 
          />
          <TabButton 
            icon={<Ionicons name="time-outline" size={22} color={theme.colors.textMut} />} 
            label="History" 
            active={currentRoute === 'history'} 
            onPress={() => onNavigate('history')} 
          />
          <TabButton 
            icon={<Ionicons name="settings-outline" size={22} color={theme.colors.textMut} />} 
            label="Settings" 
            active={currentRoute === 'settings'} 
            onPress={() => onNavigate('settings')} 
          />
        </View>
      )}
    </View>
  );
}

function TabButton({ icon, label, active, onPress }: { icon: React.ReactNode; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[styles.tab, active && styles.tabActive]} 
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        {icon}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.surfaceAlt,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  backBtn: { paddingHorizontal: theme.spacing(1), paddingVertical: theme.spacing(0.5) },
  backIcon: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  brand: { ...theme.typography.title, color: theme.colors.text },
  brandSub: { color: theme.colors.textMut, fontSize: 12, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderTopWidth: 0,
    paddingBottom: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.xl,
    margin: theme.spacing(1.25),
    borderColor: theme.colors.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1),
    borderRadius: theme.radius.lg,
    marginHorizontal: theme.spacing(0.5),
    minHeight: 48,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.elev1,
  },
  iconWrap: { marginBottom: 4 },
  tabLabel: {
    fontSize: 12,
    color: theme.colors.textMut,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
