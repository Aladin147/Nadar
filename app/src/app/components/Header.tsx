import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StyledText } from './StyledText';
import { theme } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <StyledText variant="title">{title}</StyledText>
        {subtitle && <StyledText variant="body" color="textMut">{subtitle}</StyledText>}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  titleContainer: {
    gap: theme.spacing(0.5),
  },
});
