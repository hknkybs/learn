import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, statusLabels } from '../theme';
import { WordListItem } from '../components/WordListItem';
import { TabScreenProps } from '../navigation/types';
import { WordStatus } from '../types';

type Props = TabScreenProps<'Words'>;

type Filter = 'all' | WordStatus;

export function WordListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const words = useStore((s) => s.words);
  const progressByWordId = useStore((s) => s.progressByWordId);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return words;
    return words.filter((w) => (progressByWordId[w.id]?.status ?? 'new') === filter);
  }, [words, progressByWordId, filter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: colors.text }]}>Kelimeler</Text>

      <View style={styles.filterRow}>
        {(['all', 'new', 'learning', 'known'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f ? colors.primary : colors.surfaceMuted },
            ]}
          >
            <Text style={{ color: filter === f ? '#FFFFFF' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
              {f === 'all' ? 'Tümü' : statusLabels[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <WordListItem
            word={item}
            status={progressByWordId[item.id]?.status ?? 'new'}
            onPress={() => navigation.navigate('WordDetail', { wordId: item.id })}
          />
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
            Bu filtrede kelime yok.
          </Text>
        }
      />
    </SafeAreaView>
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
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
});
