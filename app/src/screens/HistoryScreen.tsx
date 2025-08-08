import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { theme } from '../app/theme';
import { useAppState } from '../app/state/AppContext';
import { PrimaryButton } from '../app/components/PrimaryButton';

export default function HistoryScreen() {
  const { state, dispatch } = useAppState();

  function handleViewResult(result: any) {
    dispatch({ type: 'SET_CAPTURE_RESULT', result });
    dispatch({ type: 'NAVIGATE', route: 'results' });
  }

  if (state.history.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptyText}>Your analyzed images will appear here</Text>
          <PrimaryButton 
            title="Take First Photo" 
            onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })}
            style={styles.emptyButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{state.history.length} analyzed images</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {state.history.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.historyItem}
            onPress={() => handleViewResult(item)}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.mode} analysis from ${new Date(item.timestamp).toLocaleDateString()}`}
          >
            <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
            
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemMode}>{item.mode.toUpperCase()}</Text>
                <Text style={styles.itemDate}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </View>
              
              {item.question && (
                <Text style={styles.itemQuestion} numberOfLines={1}>
                  Q: {item.question}
                </Text>
              )}
              
              <Text style={styles.itemResult} numberOfLines={2}>
                {item.result}
              </Text>
              
              {item.timings && (
                <Text style={styles.itemTiming}>
                  {item.timings.total}ms
                </Text>
              )}
            </View>
            
            <View style={styles.itemArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing(0.5),
  },
  subtitle: {
    color: theme.colors.textMut,
    fontSize: 14,
  },
  scrollView: { flex: 1 },
  content: { padding: theme.spacing(2) },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.border,
  },
  itemContent: {
    flex: 1,
    marginLeft: theme.spacing(2),
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  itemMode: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  itemDate: {
    color: theme.colors.textMut,
    fontSize: 12,
  },
  itemQuestion: {
    color: theme.colors.textMut,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: theme.spacing(0.5),
  },
  itemResult: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: theme.spacing(0.5),
  },
  itemTiming: {
    color: theme.colors.textMut,
    fontSize: 11,
  },
  itemArrow: {
    marginLeft: theme.spacing(1),
  },
  arrowText: {
    color: theme.colors.textMut,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(2),
  },
  emptyTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
  },
  emptyText: {
    color: theme.colors.textMut,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  emptyButton: {
    width: 200,
  },
});
