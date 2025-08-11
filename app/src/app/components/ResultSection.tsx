import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Card } from './Card';

export interface ResultSectionProps {
  title: string;
  content: string;
  onPlayPress?: () => void;
  variant?: 'default' | 'boldLight';
  style?: ViewStyle;
}

export function ResultSection({
  title,
  content,
  onPlayPress,
  variant = 'default',
  style,
}: ResultSectionProps) {
  const isEmphasis = variant === 'boldLight' || title.toUpperCase() === 'IMMEDIATE';
  return (
    <Card
      variant={variant}
      style={[style, isEmphasis && styles.emphasisCard].filter(Boolean) as ViewStyle[]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, isEmphasis && styles.titleEmphasis]}>{title}</Text>
        {onPlayPress && (
          <TouchableOpacity
            style={[styles.playButton, isEmphasis && styles.playButtonEmphasis]}
            onPress={onPlayPress}
            accessibilityLabel={`Play ${title}`}
            accessibilityRole="button"
          >
            <Ionicons
              name="volume-high"
              size={18}
              color={isEmphasis ? '#fff' : theme.colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.content, isEmphasis && styles.contentEmphasis]}>{content}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.text,
    flex: 1,
  },
  titleEmphasis: {
    color: '#fff',
  },
  playButton: {
    padding: theme.spacing(0.5),
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: theme.spacing(1),
  },
  playButtonEmphasis: {
    backgroundColor: theme.colors.primary,
  },
  content: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  contentEmphasis: {
    color: '#dbeafe',
  },
  emphasisCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
});
