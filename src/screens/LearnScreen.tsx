import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme';
import { CEFR_LEVELS, CefrLevel } from '../types';
import { COURSES } from '../content';
import { levelSummary, useCourseStore } from '../state/courseStore';

const LEVEL_NAMES: Record<CefrLevel, string> = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Orta üstü',
  C1: 'İleri',
  C2: 'Uzman',
};

type Props = TabScreenProps<'Learn'>;

export function LearnScreen({ navigation }: Props) {
  const { colors, shadow } = useTheme();
  const progress = useCourseStore((s) => s.progress);
  const loaded = useCourseStore((s) => s.loaded);
  const load = useCourseStore((s) => s.load);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Öğren</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Seviyeni seç; konu anlatımları, alıştırmalar ve testlerle adım adım ilerle.
        </Text>

        {CEFR_LEVELS.map((level) => {
          const course = COURSES[level];
          const summary = levelSummary(progress, level);
          const available = !!course;
          return (
            <TouchableOpacity
              key={level}
              activeOpacity={available ? 0.85 : 1}
              disabled={!available}
              onPress={() => navigation.navigate('Level', { level })}
              style={[
                styles.card,
                { backgroundColor: colors.surface, opacity: available ? 1 : 0.55 },
                available ? shadow.card : null,
              ]}
            >
              <View style={[styles.badge, { backgroundColor: available ? colors.primary : colors.surfaceMuted }]}>
                <Text style={[styles.badgeText, { color: available ? '#FFFFFF' : colors.textMuted }]}>{level}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.levelName, { color: colors.text }]}>{LEVEL_NAMES[level]}</Text>
                {available ? (
                  <>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {summary.unitsDone}/{summary.unitsTotal} ünite · %{summary.percent}
                    </Text>
                    <View style={[styles.track, { backgroundColor: colors.primaryMuted }]}>
                      <View style={[styles.fill, { backgroundColor: colors.primary, width: `${summary.percent}%` }]} />
                    </View>
                  </>
                ) : (
                  <Text style={[styles.meta, { color: colors.textMuted }]}>Yakında</Text>
                )}
              </View>
              {available ? <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: 12 },
  title: { fontFamily: fonts.serif, fontSize: 28 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: 16,
  },
  badge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.serif, fontSize: 20 },
  levelName: { fontFamily: fonts.sansBold, fontSize: 16 },
  meta: { fontFamily: fonts.sans, fontSize: 13 },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden', marginTop: 4 },
  fill: { height: 6, borderRadius: radius.pill },
  chevron: { fontSize: 28, fontFamily: fonts.sans },
});
