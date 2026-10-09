import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Exercise } from '../content';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme';
import { isAnswerCorrect } from '../lib/speech';
import { Inline } from './Blocks';

export type ExerciseResult = 'correct' | 'wrong';

/** Typed-answer drill: auto-checked loosely, with a manual "mine was right too" override. */
export function ExerciseItem({
  exercise,
  index,
  onResult,
}: {
  exercise: Exercise & { hint?: string };
  index?: number;
  onResult: (result: ExerciseResult) => void;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [result, setResult] = useState<ExerciseResult | null>(null);

  function check() {
    const r = isAnswerCorrect(value, exercise.answer) ? 'correct' : 'wrong';
    setResult(r);
    onResult(r);
  }

  function overrideCorrect() {
    setResult('correct');
    onResult('correct');
  }

  const tone =
    result === 'correct'
      ? { bg: colors.statusKnownMuted, fg: colors.statusKnown }
      : result === 'wrong'
      ? { bg: colors.dangerMuted, fg: colors.danger }
      : null;

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: tone?.fg ?? colors.border }]}>
      {exercise.hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{exercise.hint}</Text> : null}
      <Inline
        text={`${index != null ? `${index}. ` : ''}${exercise.prompt}`}
        style={[styles.prompt, { color: colors.text }]}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          value={value}
          onChangeText={setValue}
          editable={!result}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Cevabın"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => !result && value.trim() && check()}
        />
        {!result ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, opacity: value.trim() ? 1 : 0.5 }]}
            disabled={!value.trim()}
            onPress={check}
          >
            <Text style={styles.buttonText}>Kontrol</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {result && tone ? (
        <View style={[styles.feedback, { backgroundColor: tone.bg }]}>
          <Text style={[styles.feedbackTitle, { color: tone.fg }]}>{result === 'correct' ? 'Doğru ✓' : 'Yanlış'}</Text>
          <Text style={[styles.feedbackBody, { color: colors.text }]}>Cevap: {exercise.answer}</Text>
          {result === 'wrong' ? (
            <TouchableOpacity onPress={overrideCorrect}>
              <Text style={[styles.override, { color: colors.primary }]}>Benim cevabım da doğru</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  hint: { fontFamily: fonts.sansSemibold, fontSize: 12, marginBottom: -4 },
  prompt: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23 },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  button: { borderRadius: radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  buttonText: { fontFamily: fonts.sansBold, color: '#FFFFFF', fontSize: 14 },
  feedback: { borderRadius: 12, padding: 12, gap: 4 },
  feedbackTitle: { fontFamily: fonts.sansBold, fontSize: 14 },
  feedbackBody: { fontFamily: fonts.sans, fontSize: 14 },
  override: { fontFamily: fonts.sansSemibold, fontSize: 13, marginTop: 4 },
});
