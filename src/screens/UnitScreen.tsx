import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme';
import { COURSES, KIND_LABELS, TopicKind, UNIT_PASS, unitTestExercises, unitTestKey } from '../content';
import { isUnitUnlocked, useCourseStore } from '../state/courseStore';

const KIND_ORDER: TopicKind[] = ['grammar', 'vocab', 'communication', 'pronunciation', 'mistake'];
const KIND_ICON: Record<TopicKind, string> = {
  grammar: '📐',
  vocab: '📚',
  communication: '💬',
  pronunciation: '🗣️',
  mistake: '⚠️',
};

type Props = RootScreenProps<'Unit'>;

export function UnitScreen({ navigation, route }: Props) {
  const { level, unitNo } = route.params;
  const course = COURSES[level]!;
  const unit = course.units.find((u) => u.no === unitNo)!;
  const { colors, shadow } = useTheme();
  const progress = useCourseStore((s) => s.progress);

  useEffect(() => {
    navigation.setOptions({ title: `Ünite ${unit.no}` });
  }, [navigation, unit.no]);

  const unlocked = isUnitUnlocked(progress, level, unit.no);
  const test = progress[`${level}:${unitTestKey(unit.no)}`];
  const testCount = unitTestExercises(course, unit).length;
  const unitWords = course.words.filter((w) => w.unit === unit.no);
  const topics = unit.codes.map((c) => course.topics[c]).filter(Boolean);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{unit.title}</Text>

      {!unlocked ? (
        <View style={[styles.banner, { backgroundColor: colors.accentMuted }]}>
          <Text style={[styles.bannerText, { color: colors.text }]}>
            🔒 Bu ünite kilitli. Ünite {unit.no - 1} testinden %{UNIT_PASS} alınca açılır. Konuları yine de okuyabilirsin.
          </Text>
        </View>
      ) : null}

      {KIND_ORDER.map((kind) => {
        if (kind === 'vocab') {
          if (!unitWords.length) return null;
          return (
            <View key={kind} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{KIND_LABELS.vocab.toUpperCase()}</Text>
              <Row
                icon={KIND_ICON.vocab}
                title={`Ünitenin kelimeleri (${unitWords.length})`}
                done={!!progress[`${level}:words-${unit.no}`]?.completed}
                onPress={() => navigation.navigate('UnitWords', { level, unitNo: unit.no })}
                colors={colors}
                shadow={shadow}
              />
            </View>
          );
        }
        const list = topics.filter((t) => t.kind === kind);
        if (!list.length) return null;
        return (
          <View key={kind} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{KIND_LABELS[kind].toUpperCase()}</Text>
            {list.map((t) => (
              <Row
                key={t.code}
                icon={KIND_ICON[kind]}
                title={t.title}
                meta={t.exercises.length ? `${t.exercises.length} alıştırma` : undefined}
                done={!!progress[`${level}:${t.code}`]?.completed}
                onPress={() => navigation.navigate('Topic', { level, code: t.code })}
                colors={colors}
                shadow={shadow}
              />
            ))}
          </View>
        );
      })}

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!unlocked || testCount === 0}
        onPress={() => navigation.navigate('Quiz', { level, kind: 'unit', unitNo: unit.no })}
        style={[styles.testButton, { backgroundColor: colors.primary, opacity: unlocked ? 1 : 0.5 }]}
      >
        <Text style={styles.testTitle}>Ünite Testi · {testCount} soru</Text>
        <Text style={styles.testMeta}>
          {test?.score != null
            ? `En iyi sonucun: %${test.score}${test.score >= UNIT_PASS ? ' · Geçtin ✓' : ` · Geçmek için %${UNIT_PASS}`}`
            : `Geçmek için %${UNIT_PASS} gerekli`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({
  icon,
  title,
  meta,
  done,
  onPress,
  colors,
  shadow,
}: {
  icon: string;
  title: string;
  meta?: string;
  done: boolean;
  onPress: () => void;
  colors: any;
  shadow: any;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.row, { backgroundColor: colors.surface }, shadow.card]}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {meta ? <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{meta}</Text> : null}
      </View>
      <Text style={[styles.rowCheck, { color: done ? colors.statusKnown : colors.border }]}>{done ? '✓' : '›'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serif, fontSize: 26 },
  banner: { borderRadius: 16, padding: 14 },
  bannerText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  section: { gap: 8 },
  sectionLabel: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14 },
  rowIcon: { fontSize: 18 },
  rowTitle: { fontFamily: fonts.sansSemibold, fontSize: 15 },
  rowMeta: { fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  rowCheck: { fontFamily: fonts.sansBold, fontSize: 20 },
  testButton: { borderRadius: 18, padding: 18, gap: 4, marginTop: spacing.sm },
  testTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: '#FFFFFF' },
  testMeta: { fontFamily: fonts.sans, fontSize: 13, color: '#E4E2F5' },
});
