import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Word, WordStatus } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { partOfSpeechLabels, radius, spacing } from '../theme';
import { StatusBadge } from './StatusBadge';

export function WordListItem({ word, status, onPress }: { word: Word; status: WordStatus; onPress: () => void }) {
  const { colors, shadow } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}
      activeOpacity={0.7}
    >
      <View style={styles.textCol}>
        <Text style={[styles.lemma, { color: colors.text }]}>{word.lemma}</Text>
        <Text style={[styles.pos, { color: colors.textMuted }]}>{partOfSpeechLabels[word.partOfSpeech]}</Text>
        <Text style={[styles.translation, { color: colors.textMuted }]} numberOfLines={1}>
          {word.translationTr}
        </Text>
      </View>
      <StatusBadge status={status} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  lemma: {
    fontSize: 17,
    fontWeight: '700',
  },
  pos: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  translation: {
    fontSize: 14,
  },
});
