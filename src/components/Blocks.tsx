import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, View } from 'react-native';
import { Block } from '../content';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/palette';
import { fonts, radius, spacing } from '../theme';
import { speak } from '../lib/speech';

const ENGLISH_ISH = /^[A-Za-z0-9 ,.'’!?;:()\-…/&€£$%"]+$/;
const strip = (s: string) => s.replace(/\*\*|\*/g, '').trim();
// ASCII-only Turkish ("O bir doktor.", "Evet.") passes ENGLISH_ISH, so also require a common English word.
const ENGLISH_WORDS = new Set(
  ("i i'm you he she it it's we they is am are isn't aren't was were the a an my your his her our their this that " +
    'these those yes no not do does don\'t doesn\'t did can can\'t to in on at of for with and or what where who how ' +
    'there have has some any very like go goes went')
    .split(' ')
);
const isEnglish = (s: string) =>
  ENGLISH_ISH.test(s) &&
  s
    .toLowerCase()
    .split(/[^a-z']+/)
    .some((w) => ENGLISH_WORDS.has(w));

/** Renders **bold** and *italic* runs inside a Text. */
export function Inline({ text, style }: { text: string; style?: TextStyle | TextStyle[] }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <Text key={i} style={{ fontFamily: fonts.sansBold }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <Text key={i} style={{ fontFamily: fonts.sansItalic }}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        )
      )}
    </Text>
  );
}

/** "EN sentence. — Türkçe cümle." → English part first, Turkish part (if any) after. */
function splitExample(item: string): { en: string; tr: string } | null {
  const parts = item.split(' — ');
  let n = 0;
  while (n < parts.length && isEnglish(strip(parts[n]))) n++;
  // Short lines like "Hello! — Merhaba!" have no common word; the first part is still English.
  if (n === 0 && parts.length > 1 && ENGLISH_ISH.test(strip(parts[0]))) n = 1;
  if (n === 0) return null;
  return { en: parts.slice(0, n).join(' — '), tr: parts.slice(n).join(' — ') };
}

export function SpeakButton({ text, colors }: { text: string; colors: ThemeColors }) {
  return (
    <TouchableOpacity onPress={() => speak(strip(text))} hitSlop={8} style={[styles.speak, { backgroundColor: colors.primaryMuted }]}>
      <Text style={styles.speakIcon}>🔊</Text>
    </TouchableOpacity>
  );
}

function ExampleRow({ en, tr, colors }: { en: string; tr: string; colors: ThemeColors }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.exampleRow}>
      <SpeakButton text={en} colors={colors} />
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={tr ? 0.7 : 1} onPress={() => tr && setOpen((v) => !v)}>
        <Inline text={en} style={[styles.body, { color: colors.text }]} />
        {tr ? (
          open ? (
            <Inline text={tr} style={[styles.small, { color: colors.textMuted }]} />
          ) : (
            <Text style={[styles.small, { color: colors.primary }]}>Türkçesi için dokun</Text>
          )
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

function DialogLine({ line, colors }: { line: string; colors: ThemeColors }) {
  const m = /^\*\*(.+?):\*\*\s*(.*)$/.exec(line);
  const speaker = m?.[1];
  const said = m ? m[2] : line;
  const speakable = ENGLISH_ISH.test(strip(said));
  return (
    <View style={styles.dialogLine}>
      {speakable ? <SpeakButton text={said} colors={colors} /> : null}
      <Text style={[styles.body, { color: colors.text, flex: 1 }]}>
        {speaker ? <Text style={{ fontFamily: fonts.sansBold, color: colors.primary }}>{speaker}: </Text> : null}
        <Inline text={said} />
      </Text>
    </View>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h':
            return <Inline key={i} text={b.text} style={[styles.heading, { color: colors.text }]} />;
          case 'p':
            return <Inline key={i} text={b.text} style={[styles.body, { color: colors.text }]} />;
          case 'quote':
            return (
              <View key={i} style={[styles.quote, { backgroundColor: colors.surfaceMuted, borderLeftColor: colors.primary }]}>
                {b.lines.map((l, j) => (
                  <DialogLine key={j} line={l} colors={colors} />
                ))}
              </View>
            );
          case 'ul':
          case 'ol':
            return (
              <View key={i} style={{ gap: spacing.sm }}>
                {b.items.map((item, j) => {
                  const ex = splitExample(item);
                  if (ex) return <ExampleRow key={j} en={ex.en} tr={ex.tr} colors={colors} />;
                  return (
                    <View key={j} style={styles.listRow}>
                      <Text style={[styles.body, { color: colors.textMuted }]}>{b.t === 'ol' ? `${j + 1}.` : '•'}</Text>
                      <Inline text={item} style={[styles.body, { color: colors.text, flex: 1 }]} />
                    </View>
                  );
                })}
              </View>
            );
          case 'table':
            return (
              <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.table, { borderColor: colors.border }]}>
                  {[b.head, ...b.rows].map((row, r) => (
                    <View
                      key={r}
                      style={[
                        styles.tableRow,
                        { borderColor: colors.border, backgroundColor: r === 0 ? colors.surfaceMuted : 'transparent' },
                      ]}
                    >
                      {row.map((cell, c) => (
                        <View key={c} style={[styles.cell, { borderColor: colors.border }]}>
                          <Inline
                            text={cell}
                            style={[styles.small, { color: colors.text }, r === 0 ? { fontFamily: fonts.sansBold } : {}]}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  speak: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakIcon: {
    fontSize: 14,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quote: {
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dialogLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  table: {
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    width: 150,
    padding: spacing.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
