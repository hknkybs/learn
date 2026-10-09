import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing } from '../theme';
import { COURSES, CourseWord } from '../content';
import { Blocks, SpeakButton } from '../components/Blocks';
import { useCourseStore } from '../state/courseStore';

type Props = RootScreenProps<'UnitWords'>;

function tags(w: CourseWord): string {
  const out: string[] = [];
  if (w.countable === 'sayılamaz') out.push('sayılamaz');
  if (w.plural) out.push(`çoğ. ${w.plural}`);
  if (w.third) out.push(w.third);
  if (w.ing) out.push(w.ing);
  return out.join(' · ');
}

export function UnitWordsScreen({ navigation, route }: Props) {
  const { level, unitNo } = route.params;
  const course = COURSES[level]!;
  const { colors, shadow } = useTheme();
  const saveResult = useCourseStore((s) => s.saveResult);

  useEffect(() => {
    navigation.setOptions({ title: `Ünite ${unitNo} kelimeleri` });
    saveResult(level, `words-${unitNo}`, null, true);
  }, [navigation, unitNo, level, saveResult]);

  const groups = useMemo(() => {
    const map = new Map<string, CourseWord[]>();
    for (const w of course.words.filter((x) => x.unit === unitNo)) {
      map.set(w.theme, [...(map.get(w.theme) ?? []), w]);
    }
    return [...map.entries()];
  }, [course.words, unitNo]);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {groups.map(([theme, words]) => {
        const topic = course.topics[theme];
        return (
          <View key={theme} style={styles.group}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {(topic?.title ?? theme).toUpperCase()} · {words.length}
            </Text>
            {topic?.blocks.length ? (
              <View style={[styles.note, { backgroundColor: colors.accentMuted }]}>
                <Text style={[styles.noteTitle, { color: colors.accent }]}>ÖĞRETİM NOTU</Text>
                <Blocks blocks={topic.blocks} />
              </View>
            ) : null}
            <View style={[styles.card, { backgroundColor: colors.surface }, shadow.card]}>
              {words.map((w, i) => (
                <View
                  key={`${w.word}-${i}`}
                  style={[styles.row, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : null]}
                >
                  <SpeakButton text={w.word} colors={colors} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.word, { color: colors.text }]}>
                      {w.word} <Text style={[styles.pos, { color: colors.textMuted }]}>{w.pos}</Text>
                    </Text>
                    <Text style={[styles.tr, { color: colors.text }]}>{w.tr}</Text>
                    {tags(w) ? <Text style={[styles.tags, { color: colors.textMuted }]}>{tags(w)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20, paddingBottom: spacing.xxl },
  group: { gap: 10 },
  sectionLabel: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.72 },
  note: { borderRadius: 16, padding: 14, gap: 6 },
  noteTitle: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.66 },
  card: { borderRadius: 18, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  word: { fontFamily: fonts.serif, fontSize: 18 },
  pos: { fontFamily: fonts.sansItalic, fontSize: 12 },
  tr: { fontFamily: fonts.sans, fontSize: 14, marginTop: 2 },
  tags: { fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
});
