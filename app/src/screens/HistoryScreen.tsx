import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../app/theme';
import { useAppState } from '../app/state/AppContext';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { Card } from '../app/components/Card';
import { ConnectivityPill } from '../app/components/ConnectivityPill';
import { ScreenWrapper } from '../app/components/ScreenWrapper';
import { StyledText } from '../app/components/StyledText';
import { Header } from '../app/components/Header';

export default function HistoryScreen() {
  const { state, dispatch } = useAppState();

  function handleViewResult(result: any) {
    dispatch({ type: 'SET_CAPTURE_RESULT', result });
    dispatch({ type: 'NAVIGATE', route: 'results' });
  }

  if (state.history.length === 0) {
    return (
      <ScreenWrapper style={styles.emptyState}>
        <StyledText style={styles.emptyIcon}>📋</StyledText>
        <StyledText variant="title" style={styles.emptyTitle}>No History Yet</StyledText>
        <StyledText color="textMut" style={styles.emptyText}>Your analyzed images will appear here</StyledText>
        <PrimaryButton
          title="Take First Photo"
          onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })}
          style={styles.emptyButton}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="History"
        subtitle={`${state.history.length} analyzed images`}
        right={
          <TouchableOpacity onPress={() => dispatch({ type: 'NAVIGATE', route: 'settings' })}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {state.history.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleViewResult(item)}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.mode} analysis from ${new Date(item.timestamp).toLocaleDateString()}`}
          >
            <Card style={styles.historyItem}>
              <View style={styles.itemLayout}>
                <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />

                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <View style={styles.modePill}>
                      <StyledText style={styles.itemMode}>{item.mode.toUpperCase()}</StyledText>
                    </View>
                    <StyledText color="textMut" style={styles.itemDate}>
                      {new Date(item.timestamp).toLocaleDateString()}
                    </StyledText>
                  </View>

                  {item.question && (
                    <StyledText color="textMut" style={styles.itemQuestion} numberOfLines={1}>
                      Q: {item.question}
                    </StyledText>
                  )}

                  <StyledText style={styles.itemResult} numberOfLines={2}>
                    {item.structured?.immediate || item.result}
                  </StyledText>
                </View>

                <View style={styles.itemArrow}>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMut} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(2),
  },
  historyItem: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.colors.surfaceAlt,
  },
  itemLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  itemContent: {
    flex: 1,
    gap: theme.spacing(0.5),
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modePill: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  itemMode: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemDate: {
    fontSize: 12,
  },
  itemQuestion: {
    fontStyle: 'italic',
  },
  itemResult: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemArrow: {
    marginLeft: 'auto',
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
    marginBottom: theme.spacing(1),
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  emptyButton: {
    width: '80%',
    maxWidth: 300,
  },
});
