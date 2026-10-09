import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing } from '../theme';
import { COURSES, KIND_LABELS } from '../content';
import { Blocks } from '../components/Blocks';
import { ExerciseItem, ExerciseResult } from '../components/ExerciseItem';
import { useCourseStore } from '../state/courseStore';

type Props = RootScreenProps<'Topic'>;

export function TopicScreen({ navigation, route }: Props) {
  const { level, code } = route.params;
  const topic = COURSES[level]!.topics[code];
  const { colors, shadow } = useTheme();
  const saveResult = useCourseStore((s) => s.saveResult);
  const [results, setResults] = useState<Record<number, ExerciseResult>>({});
  const saved = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: KIND_LABELS[topic.kind] });
    // Reading-only topics count as studied as soon as they're opened.
    if (!topic.exercises.length) saveResult(level, code, null, true);
  }, [navigation, topic, level, code, saveResult]);

  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter((r) => r === 'correct').length;
  const allDone = topic.exercises.length > 0 && answered === topic.exercises.length;

  useEffect(() => {
    if (allDone && !saved.current) {
      saved.current = true;
      saveResult(level, code, Math.round((correct / topic.exercises.length) * 100), true);
    }
  }, [allDone, correct, topic.exercises.length, level, code, saveResult]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>{topic.title}</Text>

      <View style={[styles.card, { backgroundColor: colors.surface }, shadow.card]}>
        <Blocks blocks={topic.blocks} />
      </View>

      {topic.exercises.length ? (
        <View style={styles.exercises}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {(topic.exerciseTitle ?? 'Alıştırma').toUpperCase()}
          </Text>
          {topic.exercises.map((ex, i) => (
            <ExerciseItem
              key={i}
              index={i + 1}
              exercise={ex}
              onResult={(r) => setResults((prev) => ({ ...prev, [i]: r }))}
            />
          ))}
          {allDone ? (
            <View style={[styles.summary, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.summaryText, { color: colors.primary }]}>
                {correct}/{topic.exercises.length} doğru
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serif, fontSize: 26 },
  card: { borderRadius: 20, padding: 18 },
  exercises: { gap: 12 },
  sectionLabel: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.72 },
  summary: { borderRadius: 16, padding: 14, alignItems: 'center' },
  summaryText: { fontFamily: fonts.sansBold, fontSize: 16 },
});
