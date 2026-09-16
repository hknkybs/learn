import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, useDueWords } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { partOfSpeechLabels, radius, spacing, tenseLabels } from '../theme';
import { RootScreenProps } from '../navigation/types';
import { ReviewGrade, Word } from '../types';
import { shuffle } from '../lib/batch';

type LapCounts = { good: number; hard: number; again: number };
const EMPTY_LAP_COUNTS: LapCounts = { good: 0, hard: 0, again: 0 };

type Props = RootScreenProps<'Review'>;

export function ReviewScreen({ navigation }: Props) {
  const { colors, shadow } = useTheme();
  const dueWords = useDueWords();
  const allWords = useStore((s) => s.words);
  const progressByWordId = useStore((s) => s.progressByWordId);
  const reviewWord = useStore((s) => s.reviewWord);
  const [revealed, setRevealed] = useState(false);
  const [practiceQueue, setPracticeQueue] = useState<Word[] | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [lapCounts, setLapCounts] = useState<LapCounts>(EMPTY_LAP_COUNTS);
  const [lapSummary, setLapSummary] = useState<LapCounts | null>(null);

  const word = practiceQueue ? practiceQueue[practiceIndex] : dueWords[0];

  useEffect(() => {
    setRevealed(false);
  }, [word?.id]);

  // Once the day's due queue is empty, seamlessly roll into free practice
  // over everything already started — no dead-end, no extra tap.
  useEffect(() => {
    if (dueWords.length === 0 && !practiceQueue) {
      const touched = shuffle(allWords.filter((w) => progressByWordId[w.id]));
      if (touched.length > 0) {
        setPracticeQueue(touched);
        setPracticeIndex(0);
      }
    }
  }, [dueWords.length, practiceQueue, allWords, progressByWordId]);

  function continueLap() {
    if (!practiceQueue) return;
    setPracticeQueue(shuffle(practiceQueue));
    setPracticeIndex(0);
    setLapCounts(EMPTY_LAP_COUNTS);
    setLapSummary(null);
  }

  if (lapSummary) {
    const total = lapSummary.good + lapSummary.hard + lapSummary.again;
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.doneTitle, { color: colors.text }]}>Turu tamamladın!</Text>
        <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>{total} kelime çalıştın.</Text>

        <View style={styles.summaryRow}>
          <SummaryChip label="Biliyorum" value={lapSummary.good} color={colors.statusKnown} bg={colors.statusKnownMuted} />
          <SummaryChip label="Zorlandım" value={lapSummary.hard} color={colors.statusLearning} bg={colors.statusLearningMuted} />
          <SummaryChip label="Bilmiyorum" value={lapSummary.again} color={colors.danger} bg={colors.dangerMuted} />
        </View>

        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={continueLap}>
          <Text style={styles.backButtonText}>Devam Et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.linkText, { color: colors.textMuted }]}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!word) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={[styles.doneTitle, { color: colors.text }]}>Henüz öğrenmeye başlanmış bir kelime yok</Text>
        <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>
          Ayarlar'dan haftalık bir liste oluşturarak başlayabilirsin.
        </Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Ana sayfaya dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function grade(g: ReviewGrade) {
    reviewWord(word.id, g);
    if (!practiceQueue) return;

    const key = g === 'good' ? 'good' : g === 'hard' ? 'hard' : 'again';
    const updatedCounts = { ...lapCounts, [key]: lapCounts[key] + 1 };

    const next = practiceIndex + 1;
    if (next < practiceQueue.length) {
      setLapCounts(updatedCounts);
      setPracticeIndex(next);
      return;
    }

    setLapSummary(updatedCounts);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
        {practiceQueue ? 'Serbest pratik · istediğin kadar tekrar edebilirsin' : `${dueWords.length} kelime kaldı`}
      </Text>

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

function SummaryChip({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.summaryChip, { backgroundColor: bg }]}>
      <Text style={[styles.summaryChipValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryChipLabel, { color }]}>{label}</Text>
    </View>
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
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
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
  linkButton: {
    marginTop: spacing.md,
  },
  linkText: {
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryChip: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 2,
    minWidth: 92,
  },
  summaryChipValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryChipLabel: {
    fontSize: 12,
    fontWeight: '600',
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
