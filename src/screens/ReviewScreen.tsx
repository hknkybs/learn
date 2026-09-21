import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { computeStreak, useDueWords, useStore } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/palette';
import { fonts, partOfSpeechLabels, radius, spacing, tenseColorKeys, tenseLabels } from '../theme';
import { RootScreenProps } from '../navigation/types';
import { ExampleSentence, ReviewGrade, Word } from '../types';
import { shuffle } from '../lib/batch';

type LapCounts = { good: number; hard: number; again: number };
const EMPTY_LAP_COUNTS: LapCounts = { good: 0, hard: 0, again: 0 };
const TENSE_ORDER = ['present_simple', 'present_continuous', 'past_simple', 'future'] as const;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Props = RootScreenProps<'Review'>;

export function ReviewScreen({ navigation }: Props) {
  const { colors, shadow } = useTheme();
  const dueWords = useDueWords();
  const allWords = useStore((s) => s.words);
  const progressByWordId = useStore((s) => s.progressByWordId);
  const reviewEvents = useStore((s) => s.reviewEvents);
  const reviewEventsAvailable = useStore((s) => s.reviewEventsAvailable);
  const reviewWord = useStore((s) => s.reviewWord);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [practiceQueue, setPracticeQueue] = useState<Word[] | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [lapCounts, setLapCounts] = useState<LapCounts>(EMPTY_LAP_COUNTS);
  const [lapSummary, setLapSummary] = useState<LapCounts | null>(null);
  const dueSessionTotal = useRef(dueWords.length);

  const word = practiceQueue ? practiceQueue[practiceIndex] : dueWords[0];

  useEffect(() => {
    setStep(1);
    setFlipped({});
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
    return (
      <LapSummary
        counts={lapSummary}
        streak={reviewEventsAvailable ? computeStreak(reviewEvents) : 0}
        colors={colors}
        onContinue={continueLap}
        onBack={() => navigation.goBack()}
      />
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
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} activeOpacity={0.85} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Ana sayfaya dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const total = practiceQueue ? practiceQueue.length : Math.max(dueSessionTotal.current, 1);
  const done = practiceQueue ? practiceIndex : Math.min(total, Math.max(0, total - dueWords.length));

  function grade(g: ReviewGrade) {
    reviewWord(word.id, g);
    setStep(1);
    setFlipped({});
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

  if (step === 3) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={[styles.stickyHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.stickyHeaderRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
              <Text style={[styles.backArrow, { color: colors.textMuted }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerWord, { color: colors.text }]}>{word.lemma}</Text>
            <Text style={[styles.headerTr, { color: colors.textMuted }]} numberOfLines={1}>
              {word.translationTr}
            </Text>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.tenseBody}>
          <View style={styles.tenseHeadRow}>
            <Text style={[styles.sectionLabel, { color: colors.statusNew }]}>ZAMANLARA GÖRE</Text>
            <Text style={[styles.tenseHint, { color: colors.primary }]}>👆 Türkçesi için karta dokun</Text>
          </View>
          {TENSE_ORDER.map((tense) => {
            const example = word.examples.find((e) => e.tense === tense);
            if (!example) return null;
            return (
              <FlipCard
                key={example.id}
                example={example}
                word={word}
                colors={colors}
                flipped={!!flipped[example.id]}
                onToggle={() => setFlipped((prev) => ({ ...prev, [example.id]: !prev[example.id] }))}
              />
            );
          })}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.gradeBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[styles.gradeQuestion, { color: colors.textMuted }]}>Bu kelimeyi ne kadar biliyorsun?</Text>
          <View style={styles.gradeRow}>
            <GradeButton label="Bilmiyorum" bg={colors.dangerMuted} fg={colors.danger} onPress={() => grade('again')} />
            <GradeButton label="Zorlandım" bg={colors.statusLearningMuted} fg={colors.statusLearning} onPress={() => grade('hard')} />
            <GradeButton label="Biliyorum" bg={colors.statusKnownMuted} fg={colors.statusKnown} onPress={() => grade('good')} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backArrow, { color: colors.textMuted }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.segments}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.segment, { backgroundColor: i < done ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.counter, { color: colors.textMuted }]}>
          {Math.min(done + 1, total)}/{total}
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={() => setStep(step === 1 ? 2 : 3)}>
        <View style={[styles.stepCard, { backgroundColor: colors.surface, ...shadow.card }]}>
          <FadeIn key={`${word.id}-${step}`} style={styles.stepContent}>
            {step === 1 ? (
              <>
                <Text style={[styles.sectionLabel, styles.spaced, { color: colors.statusNew }]}>İNGİLİZCE</Text>
                <Text style={[styles.bigWord, { color: colors.text }]}>{word.lemma}</Text>
                <Text style={[styles.posLine, { color: colors.textMuted }]}>
                  {partOfSpeechLabels[word.partOfSpeech]}
                  {word.ipa ? ` · ${word.ipa}` : ''}
                </Text>
                <HintPill text="Karşılığı için dokun" colors={colors} style={{ marginTop: 28 }} />
              </>
            ) : (
              <>
                <Text style={[styles.dimWord, { color: colors.statusNew }]}>{word.lemma}</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.translation, { color: colors.text }]}>{word.translationTr}</Text>
                {word.nuanceTr ? (
                  <View style={[styles.nuanceBox, { backgroundColor: colors.accentMuted }]}>
                    <Text style={[styles.nuanceTitle, { color: colors.accent }]}>TÜRKÇE KONUŞANA NOT</Text>
                    <Text style={[styles.nuanceBody, { color: colors.text }]}>{word.nuanceTr}</Text>
                  </View>
                ) : null}
                <HintPill text="Cümleler için dokun" colors={colors} style={{ marginTop: 24 }} />
              </>
            )}
          </FadeIn>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

function FadeIn({ children, style }: { children: React.ReactNode; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function HintPill({ text, colors, style }: { text: string; colors: ThemeColors; style?: any }) {
  return (
    <View style={[styles.hintPill, { backgroundColor: colors.primaryMuted }, style]}>
      <Text style={styles.hintEmoji}>👆</Text>
      <Text style={[styles.hintText, { color: colors.primary }]}>{text}</Text>
    </View>
  );
}

function GradeButton({ label, bg, fg, onPress }: { label: string; bg: string; fg: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.gradeButton, { backgroundColor: bg }]} activeOpacity={0.85} onPress={onPress}>
      <Text style={[styles.gradeText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function highlight(text: string, word: Word, boldStyle: object) {
  const candidates = [word.lemma, ...word.forms.map((f) => f.text.split(' ').pop() ?? f.text)]
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${candidates.join('|')})\\b`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={boldStyle}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

function FlipCard({
  example,
  word,
  colors,
  flipped,
  onToggle,
}: {
  example: ExampleSentence;
  word: Word;
  colors: ThemeColors;
  flipped: boolean;
  onToggle: () => void;
}) {
  const anim = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  const keys = tenseColorKeys[example.tense as keyof typeof tenseColorKeys] ?? tenseColorKeys.present_simple;
  const accent = colors[keys.color];
  const muted = colors[keys.muted];
  const label = tenseLabels[example.tense].toUpperCase();

  useEffect(() => {
    Animated.timing(anim, { toValue: flipped ? 1 : 0, duration: 500, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [flipped, anim]);

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <TouchableWithoutFeedback onPress={onToggle}>
      <View style={styles.flipWrap}>
        <Animated.View
          style={[
            styles.flipFace,
            styles.flipFront,
            { backgroundColor: colors.surface, borderLeftColor: accent, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
          ]}
        >
          <Text style={[styles.tenseLabel, { color: accent }]}>{label}</Text>
          <Text style={[styles.sentence, { color: colors.text }]}>
            {highlight(example.textEn, word, { fontFamily: fonts.sansBold })}
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.flipFace,
            styles.flipBack,
            { backgroundColor: muted, borderLeftColor: accent, transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
          ]}
        >
          <Text style={[styles.tenseLabel, { color: accent }]}>{label} · TÜRKÇE</Text>
          <Text style={[styles.sentence, { color: colors.text }]}>{example.textTr}</Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

function LapSummary({
  counts,
  streak,
  colors,
  onContinue,
  onBack,
}: {
  counts: LapCounts;
  streak: number;
  colors: ThemeColors;
  onContinue: () => void;
  onBack: () => void;
}) {
  const total = counts.good + counts.hard + counts.again;
  const rows = [
    { label: 'Biliyorum', value: counts.good, color: colors.statusKnown },
    { label: 'Zorlandım', value: counts.hard, color: colors.statusLearning },
    { label: 'Bilmiyorum', value: counts.again, color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
      <View style={styles.ringWrap}>
        <Ring rows={rows} total={total} trackColor={colors.border} />
        <View style={styles.ringCenter}>
          <Text style={[styles.ringCount, { color: colors.text }]}>{total}</Text>
          <Text style={[styles.ringLabel, { color: colors.textMuted }]}>kelime</Text>
        </View>
      </View>

      <Text style={[styles.summaryTitle, { color: colors.text }]}>Turu tamamladın</Text>
      {streak > 0 ? (
        <Text style={[styles.summarySub, { color: colors.textMuted }]}>Serin {streak} güne çıktı 🔥</Text>
      ) : (
        <View style={{ height: 22 }} />
      )}

      <View style={styles.summaryList}>
        {rows.map((row) => (
          <View key={row.label} style={[styles.summaryRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Text style={[styles.summaryRowLabel, { color: colors.text }]}>{row.label}</Text>
            <Text style={[styles.summaryRowValue, { color: row.color }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, styles.fullWidth, { backgroundColor: colors.primary, shadowColor: '#4F46E5' }]}
        activeOpacity={0.85}
        onPress={onContinue}
      >
        <Text style={styles.primaryButtonText}>Bir tur daha</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} style={{ marginTop: 14 }}>
        <Text style={[styles.backLink, { color: colors.textMuted }]}>Ana sayfaya dön</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const RING_SIZE = 132;
const RING_STROKE = 14;

function Ring({ rows, total, trackColor }: { rows: { value: number; color: string }[]; total: number; trackColor: string }) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const arcs = useMemo(() => {
    let offset = 0;
    return rows.map((row) => {
      const len = total > 0 ? (row.value / total) * circumference : 0;
      const arc = { len, offset, color: row.color };
      offset += len;
      return arc;
    });
  }, [rows, total, circumference]);

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} stroke={trackColor} strokeWidth={RING_STROKE} fill="none" />
      {arcs.map((arc, i) =>
        arc.len > 0 ? (
          <Circle
            key={i}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            stroke={arc.color}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${arc.len} ${circumference - arc.len}`}
            strokeDashoffset={-arc.offset}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        ) : null
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    fontFamily: fonts.serif,
    fontSize: 22,
    textAlign: 'center',
  },
  doneSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    marginBottom: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 8,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  backLink: {
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backArrow: {
    fontFamily: fonts.sans,
    fontSize: 22,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
  },
  counter: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
  },
  stepCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: radius.xl,
    padding: 24,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.96,
  },
  spaced: {
    marginBottom: 2,
  },
  bigWord: {
    fontFamily: fonts.serif,
    fontSize: 46,
    lineHeight: 51,
    textAlign: 'center',
  },
  posLine: {
    fontFamily: fonts.sansItalic,
    fontSize: 15,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  hintEmoji: {
    fontSize: 14,
  },
  hintText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
  },
  dimWord: {
    fontFamily: fonts.serif,
    fontSize: 30,
  },
  divider: {
    width: 40,
    height: 2,
    marginVertical: 14,
  },
  translation: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 39,
    textAlign: 'center',
  },
  nuanceBox: {
    alignSelf: 'stretch',
    marginTop: 20,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 5,
  },
  nuanceTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.66,
  },
  nuanceBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
  },
  stickyHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  stickyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingTop: 12,
  },
  headerWord: {
    fontFamily: fonts.serif,
    fontSize: 24,
  },
  headerTr: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  tenseBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },
  tenseHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tenseHint: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
  },
  flipWrap: {
    height: 116,
  },
  flipFace: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  flipFront: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  flipBack: {},
  tenseLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.72,
    marginBottom: 8,
  },
  sentence: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 25,
  },
  gradeBar: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  gradeQuestion: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    textAlign: 'center',
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  gradeText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringCount: {
    fontFamily: fonts.serif,
    fontSize: 34,
  },
  ringLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
  },
  summaryTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
  },
  summarySub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 22,
  },
  summaryList: {
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 26,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  summaryRowLabel: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
  },
  summaryRowValue: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
  },
});
