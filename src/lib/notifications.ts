import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Identifier for the single recurring reminder, so we can find-and-cancel
// it instead of stacking duplicates every time settings change.
const REMINDER_ID = 'daily-word-reminder';

export const notificationsSupported = Platform.OS !== 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function androidChannelSetup() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Kelime hatırlatmaları',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function minuteOfDay(hour: number, minute: number) {
  return hour * 60 + minute;
}

/** Clamps a minute-of-day value into [start, end], wrapping past midnight if end < start. */
function clampIntoWindow(target: number, startMinute: number, endMinute: number) {
  if (startMinute <= endMinute) {
    return Math.min(Math.max(target, startMinute), endMinute);
  }
  // Window wraps past midnight (e.g. 22:00–06:00) — anything outside [end, start] is "inside".
  if (target > endMinute && target < startMinute) return startMinute;
  return target;
}

/** Schedules one daily local reminder inside the user's allowed window (fires at window start). */
export async function scheduleDailyReminder(startMinute: number, endMinute: number) {
  if (!notificationsSupported) return;
  await cancelDailyReminder();

  const target = clampIntoWindow(startMinute, startMinute, endMinute);
  const hour = Math.floor(target / 60) % 24;
  const minute = target % 60;

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Kelime Defteri',
      body: 'Bugünkü kelimelerini tekrar etmeyi unutma 📚',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'reminders',
    },
  });
}

export async function cancelDailyReminder() {
  if (!notificationsSupported) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}

export function formatMinuteOfDay(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseMinuteOfDay(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return minuteOfDay(h, m);
}
