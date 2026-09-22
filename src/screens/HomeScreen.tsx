import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  computeStreak,
  computeWeeklyCounts,
  countReviewsToday,
  useDueWords,
  useStore,
} from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { fonts, partOfSpeechLabels, radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Home'>;

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

function formatToday(): string {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
}

export function HomeScreen({ navigation }: Props) {
  const { colors, shadow } = useTheme();
  const words = useStore((s) => s.words);
  const progressByWordId = useStore((s) => s.progressByWordId);
  const reviewEvents = useStore((s) => s.reviewEvents);
  const reviewEventsAvailable = useStore((s) => s.reviewEventsAvailable);
  const dueWords = useDueWords();

  const counts = useMemo(() => {
    let known = 0;
    let learning = 0;
    let fresh = 0;
    for (const w of words) {
      const status = progressByWordId[w.id]?.status ?? 'new';
      if (status === 'known') known += 1;
      else if (status === 'learning') learning += 1;
      else fresh += 1;
    }
    return { known, learning, fresh };
  }, [words, progressByWordId]);

  const streak = useMemo(() => computeStreak(reviewEvents), [reviewEvents]);
  const weekly = useMemo(() => computeWeeklyCounts(reviewEvents), [reviewEvents]);
  const doneToday = useMemo(() => countReviewsToday(reviewEvents), [reviewEvents]);

  const wordOfTheDay = useMemo(() => {
    if (words.length === 0) return null;
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return words[seed % words.length];
  }, [words]);

  const touchedCount = counts.known + counts.learning;
  const canPractice = touchedCount > 0;
  const heroCount = dueWords.length > 0 ? dueWords.length : touchedCount;
  const estimatedMinutes = Math.max(1, Math.round(heroCount * 1.5));
  const progress = dueWords.length + doneToday > 0 ? Math.min(1, doneToday / (dueWords.length + doneToday)) : 0;

  const weekMax = Math.max(1, ...weekly);
  const weekTotal = weekly.reduce((sum, n) => sum + n, 0);
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Merhaba</Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>{formatToday()}</Text>
          </View>
          {reviewEventsAvailable && streak > 0 ? (
            <View style={[styles.streakBadge, { backgroundColor: colors.statusLearningMuted }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.streakText, { color: colors.statusLearning }]}>{streak} gün</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.hero, { backgroundColor: colors.primary, shadowColor: '#4F46E5' }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>{dueWords.length > 0 ? 'BUGÜNÜN TURU' : 'SERBEST PRATİK'}</Text>
              <Text style={styles.heroCount}>{heroCount} kelime</Text>
            </View>
            <View style={styles.heroEta}>
              <Text style={styles.heroEtaLabel}>yaklaşık</Text>
              <Text style={styles.heroEtaValue}>{estimatedMinutes} dk</Text>
            </View>
          </View>
          {reviewEventsAvailable ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.heroButton, { opacity: canPractice ? 1 : 0.6 }]}
            activeOpacity={0.85}
            disabled={!canPractice}
            onPress={() => navigation.navigate('Review')}
          >
            <Text style={[styles.heroButtonText, { color: colors.primary }]}>
              {canPractice ? 'Çalışmaya Başla' : "Önce Ayarlar'dan bir liste oluştur"}
            </Text>
          </TouchableOpacity>
        </View>

        {reviewEventsAvailable ? (
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Bu hafta</Text>
              <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{weekTotal} tekrar</Text>
            </View>
            <View style={styles.chart}>
              {weekly.map((n, i) => {
                const isToday = i === todayIndex;
                return (
                  <View key={i} style={styles.chartCol}>
                    <View style={styles.chartBarArea}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: Math.max(10, (n / weekMax) * 56),
                            backgroundColor: isToday ? colors.primary : colors.primaryMuted,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.chartLabel,
                        isToday
                          ? { color: colors.primary, fontFamily: fonts.sansBold }
                          : { color: colors.textMuted },
                      ]}
                    >
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {wordOfTheDay ? (
          <View style={[styles.card, styles.wotd, { backgroundColor: colors.surface, ...shadow.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.accent }]}>GÜNÜN KELİMESİ</Text>
            <View style={styles.wotdRow}>
              <Text style={[styles.wotdWord, { color: colors.text }]}>{wordOfTheDay.lemma}</Text>
              <Text style={[styles.wotdPos, { color: colors.textMuted }]}>
                {partOfSpeechLabels[wordOfTheDay.partOfSpeech]}
              </Text>
            </View>
            <Text style={[styles.wotdTr, { color: colors.text }]}>{wordOfTheDay.translationTr}</Text>
            {wordOfTheDay.nuanceTr ? (
              <Text style={[styles.wotdNuance, { color: colors.textMuted }]}>{wordOfTheDay.nuanceTr}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.chips}>
          <StatChip label="Yeni" value={counts.fresh} color={colors.statusNew} bg={colors.statusNewMuted} />
          <StatChip label="Öğreniyorum" value={counts.learning} color={colors.statusLearning} bg={colors.statusLearningMuted} />
          <StatChip label="Biliyorum" value={counts.known} color={colors.statusKnown} bg={colors.statusKnownMuted} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: 14,
  },
  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 24,
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: 14,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: '#C9C7DE',
    letterSpacing: 0.52,
  },
  heroCount: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 44,
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroEta: {
    alignItems: 'flex-end',
  },
  heroEtaLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: '#C9C7DE',
  },
  heroEtaValue: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  heroButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
  },
  card: {
    borderRadius: radius.lg,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  cardMeta: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  chart: {
    flexDirection: 'row',
    gap: 8,
    height: 78,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  chartBarArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 7,
  },
  chartLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  wotd: {
    gap: 6,
  },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.72,
  },
  wotdRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  wotdWord: {
    fontFamily: fonts.serif,
    fontSize: 26,
  },
  wotdPos: {
    fontFamily: fonts.sansItalic,
    fontSize: 13,
  },
  wotdTr: {
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  wotdNuance: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  chipValue: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
  },
  chipLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
  },
});
