import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme';
import {
  COURSES,
  EXAM_KEY,
  EXAM_PASS_SECTION,
  EXAM_PASS_TOTAL,
  ExamQuestion,
  UNIT_PASS,
  unitTestExercises,
  unitTestKey,
} from '../content';
import { ExerciseItem, ExerciseResult } from '../components/ExerciseItem';
import { Inline } from '../components/Blocks';
import { shuffle } from '../lib/batch';
import { speak } from '../lib/speech';
import { useCourseStore } from '../state/courseStore';

type Props = RootScreenProps<'Quiz'>;

// Section weights from the exam spec (A 30, B 20, C 20); writing/speaking aren't auto-graded yet.
const SECTION_WEIGHTS = [30, 20, 20];

export function QuizScreen(props: Props) {
  return props.route.params.kind === 'unit' ? <UnitTest {...props} /> : <LevelExam {...props} />;
}

function UnitTest({ navigation, route }: Props) {
  const { level, unitNo } = route.params;
  const course = COURSES[level]!;
  const unit = course.units.find((u) => u.no === unitNo)!;
  const { colors } = useTheme();
  const saveResult = useCourseStore((s) => s.saveResult);
  const questions = useMemo(() => shuffle(unitTestExercises(course, unit)), [course, unit]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [current, setCurrent] = useState<ExerciseResult | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: `Ünite ${unit.no} Testi` });
  }, [navigation, unit.no]);

  const finished = results.length === questions.length && questions.length > 0;
  const correct = results.filter((r) => r === 'correct').length;
  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const passed = score >= UNIT_PASS;

  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true;
      saveResult(level, unitTestKey(unit.no), score, passed);
    }
  }, [finished, score, passed, level, unit.no, saveResult]);

  if (finished) {
    const next = course.units.find((u) => u.no === unit.no + 1);
    return (
      <Result
        title={passed ? 'Testi geçtin 🎉' : 'Biraz daha çalışalım'}
        score={score}
        detail={`${correct}/${questions.length} doğru · Geçme notu %${UNIT_PASS}`}
        note={
          passed
            ? next
              ? `Ünite ${next.no} · ${next.title} açıldı.`
              : 'Tüm üniteleri bitirdin — seviye sonu sınavı açıldı.'
            : 'Yanlış yaptığın konuları tekrar okuyup testi yeniden çözebilirsin.'
        }
        primary={passed && next ? 'Sıradaki üniteye geç' : 'Üniteye dön'}
        onPrimary={() =>
          passed && next ? navigation.replace('Unit', { level, unitNo: next.no }) : navigation.goBack()
        }
        secondary="Tekrar çöz"
        onSecondary={() => navigation.replace('Quiz', { level, kind: 'unit', unitNo: unit.no })}
        passed={passed}
      />
    );
  }

  const q = questions[index];
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Progress index={index} total={questions.length} />
      <ExerciseItem key={index} exercise={q} onResult={setCurrent} />
      {current ? (
        <TouchableOpacity
          style={[styles.next, { backgroundColor: colors.primary }]}
          onPress={() => {
            setResults((r) => [...r, current]);
            setCurrent(null);
            setIndex((i) => Math.min(i + 1, questions.length - 1));
          }}
        >
          <Text style={styles.nextText}>{index + 1 === questions.length ? 'Testi bitir' : 'Sonraki soru'}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function LevelExam({ navigation, route }: Props) {
  const { level } = route.params;
  const course = COURSES[level]!;
  const { colors, shadow } = useTheme();
  const saveResult = useCourseStore((s) => s.saveResult);
  const flat = useMemo(
    () => course.exam.flatMap((s, si) => s.questions.map((q) => ({ ...q, section: si }))),
    [course.exam]
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const saved = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: `${level} Seviye Sonu Sınavı` });
  }, [navigation, level]);

  const finished = answers.length === flat.length;

  const sectionScores = course.exam.map((s, si) => {
    const qs = flat.map((q, i) => ({ q, i })).filter((x) => x.q.section === si);
    const ok = qs.filter((x) => answers[x.i] === x.q.answer).length;
    return qs.length ? Math.round((ok / qs.length) * 100) : 0;
  });
  const weights = course.exam.map((_, i) => SECTION_WEIGHTS[i] ?? 0);
  const total = Math.round(sectionScores.reduce((sum, s, i) => sum + s * weights[i], 0) / weights.reduce((a, b) => a + b, 0));
  const passed = total >= EXAM_PASS_TOTAL && sectionScores.every((s) => s >= EXAM_PASS_SECTION);

  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true;
      saveResult(level, EXAM_KEY, total, passed);
    }
  }, [finished, total, passed, level, saveResult]);

  if (finished) {
    return (
      <Result
        title={passed ? `${level} seviyesini tamamladın 🏅` : 'Sınavı bu sefer geçemedin'}
        score={total}
        detail={course.exam.map((s, i) => `${s.title}: %${sectionScores[i]}`).join('\n')}
        note={`Geçmek için toplam ≥ %${EXAM_PASS_TOTAL} ve her bölüm ≥ %${EXAM_PASS_SECTION} gerekli. Yazma ve konuşma bölümleri henüz uygulamada puanlanmıyor.`}
        primary="Seviyeye dön"
        onPrimary={() => navigation.goBack()}
        secondary="Tekrar dene"
        onSecondary={() => navigation.replace('Quiz', { level, kind: 'exam' })}
        passed={passed}
      />
    );
  }

  const q = flat[index] as ExamQuestion & { section: number };
  const section = course.exam[q.section];
  const pick = (option: number) => {
    setAnswers((a) => [...a, option]);
    setIndex((i) => Math.min(i + 1, flat.length - 1));
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Progress index={index} total={flat.length} label={section.title} />
      {section.passage?.length ? (
        <View style={[styles.passage, { backgroundColor: colors.surfaceMuted }]}>
          {section.passage.map((l, i) => (
            <Text key={i} style={[styles.passageText, { color: colors.text }]}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
      {q.audio ? (
        <TouchableOpacity
          style={[styles.listen, { backgroundColor: colors.primaryMuted }]}
          onPress={() => speak(q.audio!, 0.85)}
        >
          <Text style={[styles.listenText, { color: colors.primary }]}>🔊 Dinle (istediğin kadar)</Text>
        </TouchableOpacity>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadow.card]}>
        <Inline text={q.prompt} style={[styles.prompt, { color: colors.text }]} />
        {q.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => pick(i)}
            style={[styles.option, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={[styles.optionKey, { color: colors.primary }]}>{'abc'[i] ?? i + 1}</Text>
            <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function Progress({ index, total, label }: { index: number; total: number; label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {label ? `${label} · ` : ''}
        {index + 1}/{total}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${((index + 1) / total) * 100}%` }]} />
      </View>
    </View>
  );
}

function Result(props: {
  title: string;
  score: number;
  detail: string;
  note: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
  passed: boolean;
}) {
  const { colors } = useTheme();
  const tone = props.passed ? colors.statusKnown : colors.danger;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, styles.result]}>
      <Text style={[styles.resultScore, { color: tone }]}>%{props.score}</Text>
      <Text style={[styles.resultTitle, { color: colors.text }]}>{props.title}</Text>
      <Text style={[styles.resultDetail, { color: colors.textMuted }]}>{props.detail}</Text>
      <Text style={[styles.resultNote, { color: colors.text }]}>{props.note}</Text>
      <TouchableOpacity style={[styles.next, { backgroundColor: colors.primary, alignSelf: 'stretch' }]} onPress={props.onPrimary}>
        <Text style={styles.nextText}>{props.primary}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={props.onSecondary}>
        <Text style={[styles.secondary, { color: colors.textMuted }]}>{props.secondary}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: spacing.xxl },
  progressText: { fontFamily: fonts.sansSemibold, fontSize: 13 },
  track: { height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.pill },
  next: { borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  nextText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#FFFFFF' },
  card: { borderRadius: 20, padding: 18, gap: 10 },
  prompt: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  optionKey: { fontFamily: fonts.sansBold, fontSize: 14, width: 16 },
  optionText: { fontFamily: fonts.sans, fontSize: 15, flex: 1 },
  passage: { borderRadius: 16, padding: 16, gap: 8 },
  passageText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  listen: { borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  listenText: { fontFamily: fonts.sansBold, fontSize: 15 },
  result: { alignItems: 'center', paddingTop: 60 },
  resultScore: { fontFamily: fonts.serif, fontSize: 56 },
  resultTitle: { fontFamily: fonts.serif, fontSize: 24, textAlign: 'center' },
  resultDetail: { fontFamily: fonts.sans, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  resultNote: { fontFamily: fonts.sans, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  secondary: { fontFamily: fonts.sansSemibold, fontSize: 15, marginTop: 6 },
});
