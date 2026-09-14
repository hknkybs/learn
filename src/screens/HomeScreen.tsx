import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, useDueWords } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';
import { TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors, shadow } = useTheme();
  const words = useStore((s) => s.words);
  const progressByWordId = useStore((s) => s.progressByWordId);
  const dueWords = useDueWords();

  const counts = useMemo(() => {
    let known = 0;
    let learning = 0;
    let fresh = 0;
    for (const w of words) {
      const status = progressByWordId[w.id]?.status ?? 'new';
      if (status === 'known') known += 1;
      else if (status === 'learning') learning += 1;
      else fresh += 1;
    }
    return { known, learning, fresh, total: words.length };
  }, [words, progressByWordId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: colors.text }]}>Merhaba 👋</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bugün için {dueWords.length} kelime hazır.</Text>

      <View style={styles.statsRow}>
        <StatChip label="Yeni" value={counts.fresh} color={colors.statusNew} bg={colors.statusNewMuted} />
        <StatChip label="Öğreniyorum" value={counts.learning} color={colors.statusLearning} bg={colors.statusLearningMuted} />
        <StatChip label="Biliyorum" value={counts.known} color={colors.statusKnown} bg={colors.statusKnownMuted} />
      </View>

      <TouchableOpacity
        style={[
          styles.reviewButton,
          { backgroundColor: colors.primary, opacity: dueWords.length === 0 ? 0.5 : 1, ...shadow.floating },
        ]}
        disabled={dueWords.length === 0}
        onPress={() => navigation.navigate('Review')}
      >
        <Text style={styles.reviewButtonText}>
          {dueWords.length === 0 ? 'Bugünlük tekrar kalmadı 🎉' : `Çalışmaya Başla (${dueWords.length})`}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatChip({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  chipValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewButton: {
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
