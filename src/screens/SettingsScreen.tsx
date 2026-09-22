import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';
import { formatMinuteOfDay, notificationsSupported, parseMinuteOfDay } from '../lib/notifications';

const DAY_MS = 24 * 60 * 60 * 1000;

export function SettingsScreen() {
  const { colors, shadow } = useTheme();
  const userEmail = useStore((s) => s.userEmail);
  const words = useStore((s) => s.words);
  const progressByWordId = useStore((s) => s.progressByWordId);
  const userSettings = useStore((s) => s.userSettings);
  const setWeeklyGoal = useStore((s) => s.setWeeklyGoal);
  const startNewBatch = useStore((s) => s.startNewBatch);
  const resetProgress = useStore((s) => s.resetProgress);
  const setNotificationSettings = useStore((s) => s.setNotificationSettings);
  const authError = useStore((s) => s.authError);
  const signOut = useStore((s) => s.signOut);

  const [goalInput, setGoalInput] = useState(String(userSettings?.weeklyGoal ?? 20));
  const [creating, setCreating] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [notifToggling, setNotifToggling] = useState(false);
  const [startInput, setStartInput] = useState(formatMinuteOfDay(userSettings?.notifyStartMinute ?? 540));
  const [endInput, setEndInput] = useState(formatMinuteOfDay(userSettings?.notifyEndMinute ?? 1260));
  const [windowError, setWindowError] = useState<string | null>(null);

  useEffect(() => {
    if (userSettings) setGoalInput(String(userSettings.weeklyGoal));
  }, [userSettings?.weeklyGoal]);

  useEffect(() => {
    if (!userSettings) return;
    setStartInput(formatMinuteOfDay(userSettings.notifyStartMinute));
    setEndInput(formatMinuteOfDay(userSettings.notifyEndMinute));
  }, [userSettings?.notifyStartMinute, userSettings?.notifyEndMinute]);

  async function handleToggleNotifications(enabled: boolean) {
    setNotifToggling(true);
    await setNotificationSettings({ enabled });
    setNotifToggling(false);
  }

  function handleSaveWindow() {
    const start = parseMinuteOfDay(startInput);
    const end = parseMinuteOfDay(endInput);
    if (start === null || end === null) {
      setWindowError('Saatleri SS:DD biçiminde gir, ör. 09:00');
      return;
    }
    setWindowError(null);
    setNotificationSettings({ startMinute: start, endMinute: end });
  }

  const untouchedCount = words.filter((w) => !progressByWordId[w.id]).length;
  const nextAutoRefresh = userSettings?.batchStartedAt
    ? new Date(userSettings.batchStartedAt + 7 * DAY_MS).toLocaleDateString('tr-TR')
    : null;

  async function handleStartBatch() {
    const goal = Math.max(1, parseInt(goalInput, 10) || 1);
    setCreating(true);
    setResultMessage(null);
    await setWeeklyGoal(goal);
    const { added, requested } = await startNewBatch(goal);
    setCreating(false);
    setResultMessage(
      added < requested
        ? `${added} yeni kelime eklendi (havuzda daha fazla yeni kelime kalmadı).`
        : `${added} yeni kelime öğrenme listene eklendi.`
    );
  }

  function handleReset() {
    const message =
      'Bildiklerin, öğrendiklerin ve haftalık listen dahil tüm ilerlemen silinecek. Kelime bankasının kendisi etkilenmez. Emin misin?';

    const doReset = async () => {
      setResetting(true);
      setResultMessage(null);
      await resetProgress();
      setResetting(false);
      setResultMessage('Tüm ilerleme sıfırlandı.');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) doReset();
      return;
    }

    Alert.alert('Her şeyi sıfırla', message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: doReset },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Hesap</Text>
        <Text style={[styles.value, { color: colors.text }]}>{userEmail}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Kelime dağarcığı</Text>
        <Text style={[styles.value, { color: colors.text }]}>{words.length} kelime · {untouchedCount} henüz başlanmadı</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Haftalık kelime hedefi</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          keyboardType="number-pad"
          value={goalInput}
          onChangeText={setGoalInput}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, opacity: creating ? 0.6 : 1 }]}
          disabled={creating}
          onPress={handleStartBatch}
        >
          <Text style={styles.buttonText}>{creating ? 'Liste oluşturuluyor...' : `${goalInput || 0} Öğrenmeye Başla`}</Text>
        </TouchableOpacity>
        {resultMessage ? <Text style={[styles.result, { color: colors.textMuted }]}>{resultMessage}</Text> : null}
        {nextAutoRefresh ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Otomatik yenileme: {nextAutoRefresh} (bilinen kelimeler hariç, yeni bir liste otomatik eklenir)
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, ...shadow.card }]}>
        <View style={styles.notifRow}>
          <View style={styles.notifRowText}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Bildirimler</Text>
            <Text style={[styles.value, { color: colors.text }]}>Kelime hatırlatması</Text>
          </View>
          <Switch
            value={!!userSettings?.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            disabled={notifToggling || !userSettings}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        {!notificationsSupported ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Bildirimler yalnızca mobil uygulamada (iOS/Android) çalışır. Tercihini burada kaydedebilirsin, telefonda
            aynı hesapla girdiğinde devreye girer.
          </Text>
        ) : null}

        {userSettings?.notificationsEnabled ? (
          <View style={styles.windowBlock}>
            <Text style={[styles.hint, { color: colors.textMuted, marginTop: 0 }]}>
              Sadece bu saatler arasında bildirim al:
            </Text>
            <View style={styles.windowRow}>
              <TextInput
                style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                value={startInput}
                onChangeText={setStartInput}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.value, { color: colors.textMuted }]}>—</Text>
              <TextInput
                style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                value={endInput}
                onChangeText={setEndInput}
                placeholder="21:00"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={[styles.smallButton, { backgroundColor: colors.primary }]} onPress={handleSaveWindow}>
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
            {windowError ? <Text style={[styles.result, { color: colors.danger }]}>{windowError}</Text> : null}
          </View>
        ) : null}

        {authError ? <Text style={[styles.result, { color: colors.danger }]}>{authError}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: colors.dangerMuted, opacity: resetting ? 0.6 : 1 }]}
        disabled={resetting}
        onPress={handleReset}
      >
        <Text style={[styles.signOutText, { color: colors.danger }]}>{resetting ? 'Sıfırlanıyor...' : 'Her Şeyi Sıfırla'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.dangerMuted }]} onPress={signOut}>
        <Text style={[styles.signOutText, { color: colors.danger }]}>Çıkış Yap</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  result: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: 12,
    marginTop: spacing.xs,
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
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifRowText: {
    flex: 1,
  },
  windowBlock: {
    marginTop: spacing.md,
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    width: 68,
    textAlign: 'center',
  },
  smallButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginLeft: 'auto',
  },
});
