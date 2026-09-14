import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WordStatus } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, statusLabels } from '../theme';

export function StatusBadge({ status }: { status: WordStatus }) {
  const { colors } = useTheme();
  const tone =
    status === 'known'
      ? { bg: colors.statusKnownMuted, fg: colors.statusKnown }
      : status === 'learning'
      ? { bg: colors.statusLearningMuted, fg: colors.statusLearning }
      : { bg: colors.statusNewMuted, fg: colors.statusNew };

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.label, { color: tone.fg }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
