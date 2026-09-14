import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, useDueWords } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { partOfSpeechLabels, radius, spacing, tenseLabels } from '../theme';
import { RootScreenProps } from '../navigation/types';
import { ReviewGrade } from '../types';

type Props = RootScreenProps<'Review'>;

export function ReviewScreen({ navigation }: Props) {
  const { colors, shadow } = useTheme();
  const dueWords = useDueWords();
  const reviewWord = useStore((s) => s.reviewWord);
  const [revealed, setRevealed] = useState(false);

  const word = dueWords[0];

  useEffect(() => {
    setRevealed(false);
  }, [word?.id]);

  if (!word) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.doneTitle, { color: colors.text }]}>Bugünlük bu kadar!</Text>
        <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>Tüm tekrarları tamamladın.</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Ana sayfaya dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function grade(g: ReviewGrade) {
    reviewWord(word.id, g);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.progressLabel, { color: colors.textMuted }]}>{dueWords.length} kelime kaldı</Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
          <Text style={[styles.lemma, { color: colors.text }]}>{word.lemma}</Text>
          <Text style={[styles.pos, { color: colors.textMuted }]}>{partOfSpeechLabels[word.partOfSpeech]}</Text>

          {!revealed ? (
            <TouchableOpacity style={[styles.revealButton, { borderColor: colors.primary }]} onPress={() => setRevealed(true)}>
              <Text style={[styles.revealButtonText, { color: colors.primary }]}>Cevabı Göster</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.answer}>
              <Text style={[styles.translation, { color: colors.text }]}>{word.translationTr}</Text>
              {word.nuanceTr ? <Text style={[styles.nuance, { color: colors.textMuted }]}>{word.nuanceTr}</Text> : null}

              {word.examples.slice(0, 2).map((ex) => (
                <View key={ex.id} style={styles.exampleBlock}>
                  <Text style={[styles.exampleTense, { color: colors.primary }]}>{tenseLabels[ex.tense]}</Text>
                  <Text style={[styles.exampleEn, { color: colors.text }]}>{ex.textEn}</Text>
                  <Text style={[styles.exampleTr, { color: colors.textMuted }]}>{ex.textTr}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {revealed ? (
        <View style={styles.gradeRow}>
          <TouchableOpacity style={[styles.gradeButton, { backgroundColor: colors.dangerMuted }]} onPress={() => grade('again')}>
            <Text style={[styles.gradeText, { color: colors.danger }]}>Bilmiyorum</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gradeButton, { backgroundColor: colors.statusLearningMuted }]} onPress={() => grade('hard')}>
            <Text style={[styles.gradeText, { color: colors.statusLearning }]}>Zorlandım</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gradeButton, { backgroundColor: colors.statusKnownMuted }]} onPress={() => grade('good')}>
            <Text style={[styles.gradeText, { color: colors.statusKnown }]}>Biliyorum</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 48,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  doneSubtitle: {
    fontSize: 15,
    marginBottom: spacing.md,
  },
  backButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 320,
  },
  lemma: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  pos: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  revealButton: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    marginTop: spacing.lg,
  },
  revealButtonText: {
    fontWeight: '700',
  },
  answer: {
    width: '100%',
    gap: spacing.sm,
  },
  translation: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  nuance: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  exampleBlock: {
    marginTop: spacing.sm,
  },
  exampleTense: {
    fontSize: 12,
    fontWeight: '700',
  },
  exampleEn: {
    fontSize: 15,
    marginTop: 2,
  },
  exampleTr: {
    fontSize: 14,
    marginTop: 2,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  gradeButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  gradeText: {
    fontWeight: '700',
  },
});
