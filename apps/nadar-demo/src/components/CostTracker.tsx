import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { 
  sessionCostTracker, 
  formatCost, 
  formatTokens,
  CostBreakdown 
} from '../utils/costTracker';

interface CostTrackerProps {
  visible?: boolean;
  onClose?: () => void;
}

export const CostTracker: React.FC<CostTrackerProps> = ({ 
  visible = false, 
  onClose 
}) => {
  const summary = sessionCostTracker.getSessionSummary();
  const lastRequest = sessionCostTracker.getLastRequestCost();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💰 Cost Tracker</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Session Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Session Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Total Requests:</Text>
              <Text style={styles.value}>{summary.totalRequests}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Total Cost:</Text>
              <Text style={[styles.value, styles.costValue]}>
                {formatCost(summary.totalCost)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Total Tokens:</Text>
              <Text style={styles.value}>{formatTokens(summary.totalTokens)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Session Duration:</Text>
              <Text style={styles.value}>
                {Math.round(summary.sessionDurationMs / 1000)}s
              </Text>
            </View>
          </View>

          {/* Last Request */}
          {lastRequest && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔄 Last Request</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Cost:</Text>
                <Text style={[styles.value, styles.costValue]}>
                  {formatCost(lastRequest.totalCost)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Input Tokens:</Text>
                <Text style={styles.value}>
                  {formatTokens(lastRequest.estimatedTokens.input)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Output Tokens:</Text>
                <Text style={styles.value}>
                  {formatTokens(lastRequest.estimatedTokens.output)}
                </Text>
              </View>
              {lastRequest.estimatedTokens.image && lastRequest.estimatedTokens.image > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Image Tokens:</Text>
                  <Text style={styles.value}>
                    {formatTokens(lastRequest.estimatedTokens.image)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Detailed Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💎 Cost Breakdown</Text>
            
            <Text style={styles.sectionTitle}>Gemini Flash</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Input Cost:</Text>
              <Text style={styles.value}>
                {formatCost(summary.breakdown.geminiInputCost)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Output Cost:</Text>
              <Text style={styles.value}>
                {formatCost(summary.breakdown.geminiOutputCost)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Image Cost:</Text>
              <Text style={styles.value}>
                {formatCost(summary.breakdown.geminiImageCost)}
              </Text>
            </View>
            
            {summary.breakdown.elevenLabsCost > 0 && (
              <>
                <Text style={styles.sectionTitle}>ElevenLabs TTS</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>TTS Cost:</Text>
                  <Text style={styles.value}>
                    {formatCost(summary.breakdown.elevenLabsCost)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Characters:</Text>
                  <Text style={styles.value}>
                    {summary.breakdown.elevenLabsChars.toLocaleString()}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Token Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Token Usage</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Input Tokens:</Text>
              <Text style={styles.value}>
                {formatTokens(summary.breakdown.estimatedTokens.input)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Output Tokens:</Text>
              <Text style={styles.value}>
                {formatTokens(summary.breakdown.estimatedTokens.output)}
              </Text>
            </View>
            {summary.breakdown.estimatedTokens.image && summary.breakdown.estimatedTokens.image > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Image Tokens:</Text>
                <Text style={styles.value}>
                  {formatTokens(summary.breakdown.estimatedTokens.image)}
                </Text>
              </View>
            )}
          </View>

          {/* Reset Button */}
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={() => {
              sessionCostTracker.reset();
              onClose?.();
            }}
          >
            <Text style={styles.resetButtonText}>🔄 Reset Session</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Compact cost display for embedding in other screens
export const CompactCostDisplay: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const summary = sessionCostTracker.getSessionSummary();
  
  if (summary.totalRequests === 0) return null;

  return (
    <TouchableOpacity style={styles.compactContainer} onPress={onPress}>
      <Text style={styles.compactText}>
        💰 {formatCost(summary.totalCost)} • {formatTokens(summary.totalTokens)} tokens
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing(1),
  },
  closeButtonText: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(3),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    marginVertical: theme.spacing(1),
    ...theme.shadows.sm,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(0.5),
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  costValue: {
    color: theme.colors.primary,
  },
  resetButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    alignItems: 'center',
    marginVertical: theme.spacing(3),
  },
  resetButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  compactContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    alignSelf: 'flex-start',
  },
  compactText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '500',
  },
});
