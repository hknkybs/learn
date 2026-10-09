import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme';
import { COURSES, EXAM_KEY, UNIT_PASS, unitTestKey } from '../content';
import { isUnitDone, isUnitUnlocked, levelSummary, useCourseStore } from '../state/courseStore';

type Props = RootScreenProps<'Level'>;

export function LevelScreen({ navigation, route }: Props) {
  const { level } = route.params;
  const course = COURSES[level]!;
  const { colors, shadow } = useTheme();
  const progress = useCourseStore((s) => s.progress);
  const loaded = useCourseStore((s) => s.loaded);
  const load = useCourseStore((s) => s.load);

  useEffect(() => {
    navigation.setOptions({ title: `${level} Seviyesi` });
    if (!loaded) load();
  }, [navigation, level, loaded, load]);

  const summary = levelSummary(progress, level);
  const allUnitsDone = summary.unitsDone === summary.unitsTotal;
  const exam = progress[`${level}:${EXAM_KEY}`];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text style={styles.heroLabel}>{level} İLERLEMEN</Text>
        <Text style={styles.heroValue}>%{summary.percent}</Text>
        <View style={styles.heroTrack}>
          <View style={[styles.heroFill, { width: `${summary.percent}%` }]} />
        </View>
        <Text style={styles.heroMeta}>
          {summary.unitsDone}/{summary.unitsTotal} ünite tamamlandı · Her ünite testinden %{UNIT_PASS} alınca sıradaki açılır
        </Text>
      </View>

      {course.units.map((unit) => {
        const unlocked = isUnitUnlocked(progress, level, unit.no);
        const done = isUnitDone(progress, level, unit.no);
        const score = progress[`${level}:${unitTestKey(unit.no)}`]?.score;
        const status = done ? 'Tamamlandı' : unlocked ? 'Açık' : 'Kilitli';
        const tone = done
          ? { bg: colors.statusKnownMuted, fg: colors.statusKnown }
          : unlocked
          ? { bg: colors.primaryMuted, fg: colors.primary }
          : { bg: colors.surfaceMuted, fg: colors.textMuted };
        return (
          <TouchableOpacity
            key={unit.no}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Unit', { level, unitNo: unit.no })}
            style={[styles.unit, { backgroundColor: colors.surface, opacity: unlocked ? 1 : 0.7 }, shadow.card]}
          >
            <View style={[styles.unitNo, { backgroundColor: tone.bg }]}>
              <Text style={[styles.unitNoText, { color: tone.fg }]}>{done ? '✓' : unlocked ? unit.no : '🔒'}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.unitTitle, { color: colors.text }]}>
                Ünite {unit.no} · {unit.title}
              </Text>
              <Text style={[styles.unitMeta, { color: colors.textMuted }]}>
                {status}
                {score != null ? ` · Test: %${score}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!allUnitsDone}
        onPress={() => navigation.navigate('Quiz', { level, kind: 'exam' })}
        style={[styles.unit, { backgroundColor: colors.surface, opacity: allUnitsDone ? 1 : 0.6 }, shadow.card]}
      >
        <View style={[styles.unitNo, { backgroundColor: exam?.completed ? colors.statusKnownMuted : colors.accentMuted }]}>
          <Text style={styles.unitNoText}>{exam?.completed ? '🏅' : '🎓'}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.unitTitle, { color: colors.text }]}>{level} Seviye Sonu Sınavı</Text>
          <Text style={[styles.unitMeta, { color: colors.textMuted }]}>
            {exam?.completed
              ? `Geçtin · %${exam.score}`
              : allUnitsDone
              ? exam?.score != null
                ? `Son deneme: %${exam.score} · Tekrar dene`
                : 'Hazırsın — sınava gir'
              : `${summary.unitsTotal} ünitenin hepsi bitince açılır`}
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: spacing.xxl },
  hero: { borderRadius: 24, padding: 20, gap: 8, marginBottom: 6 },
  heroLabel: { fontFamily: fonts.sansSemibold, fontSize: 13, color: '#C9C7DE', letterSpacing: 0.52 },
  heroValue: { fontFamily: fonts.serif, fontSize: 40, color: '#FFFFFF' },
  heroTrack: { height: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  heroFill: { height: 6, borderRadius: radius.pill, backgroundColor: '#FFFFFF' },
  heroMeta: { fontFamily: fonts.sans, fontSize: 13, color: '#E4E2F5', lineHeight: 19 },
  unit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 18, padding: 14 },
  unitNo: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unitNoText: { fontFamily: fonts.sansBold, fontSize: 16 },
  unitTitle: { fontFamily: fonts.sansBold, fontSize: 15 },
  unitMeta: { fontFamily: fonts.sans, fontSize: 13 },
});
