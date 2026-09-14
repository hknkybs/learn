import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStore, useWordProgress } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { formTypeLabels, partOfSpeechLabels, radius, spacing, statusLabels, tenseLabels } from '../theme';
import { RootScreenProps } from '../navigation/types';
import { WordStatus } from '../types';

type Props = RootScreenProps<'WordDetail'>;

export function WordDetailScreen({ route }: Props) {
  const { wordId } = route.params;
  const { colors, shadow } = useTheme();
  const word = useStore((s) => s.words.find((w) => w.id === wordId));
  const progress = useWordProgress(wordId);
  const setStatus = useStore((s) => s.setStatus);

  const examplesByTense = useMemo(() => {
    const order = ['general', 'present_simple', 'present_continuous', 'past_simple', 'future'];
    return [...(word?.examples ?? [])].sort((a, b) => order.indexOf(a.tense) - order.indexOf(b.tense));
  }, [word]);

  if (!word) return null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.lemma, { color: colors.text }]}>{word.lemma}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {partOfSpeechLabels[word.partOfSpeech]}
          {word.ipa ? `  ·  ${word.ipa}` : ''}
          {word.cefr ? `  ·  ${word.cefr}` : ''}
        </Text>
      </View>

      <Section title="Türkçe karşılığı" colors={colors} shadow={shadow}>
        <Text style={[styles.translation, { color: colors.text }]}>{word.translationTr}</Text>
      </Section>

      {word.nuanceTr ? (
        <Section title="Türkçe konuşan için not" colors={colors} shadow={shadow}>
          <Text style={[styles.body, { color: colors.text }]}>{word.nuanceTr}</Text>
        </Section>
      ) : null}

      {word.forms.length > 0 ? (
        <Section title="Zaman / hâl bilgisi" colors={colors} shadow={shadow}>
          {word.forms.map((f) => (
            <View key={f.id} style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>{formTypeLabels[f.formType]}</Text>
              <Text style={[styles.formText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {examplesByTense.length > 0 ? (
        <Section title="Örnek cümleler" colors={colors} shadow={shadow}>
          {examplesByTense.map((ex) => (
            <View key={ex.id} style={styles.exampleBlock}>
              <Text style={[styles.exampleTense, { color: colors.primary }]}>{tenseLabels[ex.tense]}</Text>
              <Text style={[styles.exampleEn, { color: colors.text }]}>{ex.textEn}</Text>
              <Text style={[styles.exampleTr, { color: colors.textMuted }]}>{ex.textTr}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      <View style={styles.statusRow}>
        {(['new', 'learning', 'known'] as WordStatus[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatus(wordId, s)}
            style={[
              styles.statusButton,
              {
                backgroundColor: progress.status === s ? colors.primary : colors.surfaceMuted,
              },
            ]}
          >
            <Text style={{ color: progress.status === s ? '#FFFFFF' : colors.textMuted, fontWeight: '700' }}>
              {statusLabels[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  colors,
  shadow,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
  shadow: any;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, ...shadow.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  lemma: {
    fontSize: 32,
    fontWeight: '800',
  },
  meta: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  translation: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  formLabel: {
    fontSize: 14,
  },
  formText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exampleBlock: {
    marginBottom: spacing.md,
  },
  exampleTense: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  exampleEn: {
    fontSize: 15,
    marginBottom: 2,
  },
  exampleTr: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
