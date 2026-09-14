import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

export function SettingsScreen() {
  const { colors, shadow } = useTheme();
  const userEmail = useStore((s) => s.userEmail);
  const words = useStore((s) => s.words);
  const signOut = useStore((s) => s.signOut);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Hesap</Text>
        <Text style={[styles.value, { color: colors.text }]}>{userEmail}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Kelime dağarcığı</Text>
        <Text style={[styles.value, { color: colors.text }]}>{words.length} kelime</Text>
      </View>

      <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.dangerMuted }]} onPress={signOut}>
        <Text style={[styles.signOutText, { color: colors.danger }]}>Çıkış Yap</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signOutText: {
    fontWeight: '700',
  },
});
