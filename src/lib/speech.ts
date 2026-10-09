import * as Speech from 'expo-speech';

export function speak(text: string, rate = 0.9) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

/** Loose answer comparison for typed exercises: case, punctuation and "/" separators don't matter. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:"*/→()—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAnswerCorrect(given: string, expected: string): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  const candidates = [expected];
  const alt = /^(.*?)\s*\((?:veya|US:)\s*(.+?)\)\s*$/.exec(expected);
  if (alt) candidates.push(alt[1], alt[2]);
  const arrow = expected.split('→');
  if (arrow.length > 1) candidates.push(arrow[arrow.length - 1]);
  return candidates.some((c) => {
    const n = normalizeAnswer(c);
    if (n === g) return true;
    // Short fix-it answers ("works", "a doctor") may be typed as the whole corrected sentence.
    return n.split(' ').length <= 3 && ` ${g} `.includes(` ${n} `) && g.split(' ').length > n.split(' ').length;
  });
}
