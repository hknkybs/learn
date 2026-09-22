import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { BootStatus, ReviewEvent, ReviewGrade, UserSettings, Word, WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';
import { mapUserSettings, mapWord, mapWordProgress } from '../lib/mappers';
import { applyGrade, INTERVALS_DAYS } from '../lib/srs';
import { pickWeightedBatch } from '../lib/batch';
import { derivedPassword } from '../lib/auth';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_WEEKLY_GOAL = 20;

interface State {
  bootStatus: BootStatus;
  bootError: string | null;
  userId: string | null;
  userEmail: string | null;
  words: Word[];
  progressByWordId: Record<string, WordProgress>;
  userSettings: UserSettings | null;
  reviewEvents: ReviewEvent[];
  reviewEventsAvailable: boolean;
  authLoading: boolean;
  authError: string | null;
}

interface Actions {
  init: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setStatus: (wordId: string, status: WordStatus) => Promise<void>;
  reviewWord: (wordId: string, grade: ReviewGrade) => Promise<void>;
  setWeeklyGoal: (goal: number) => Promise<void>;
  startNewBatch: (goal?: number) => Promise<{ added: number; requested: number }>;
  resetProgress: () => Promise<void>;
}

type Store = State & Actions;

function defaultProgress(wordId: string): WordProgress {
  return {
    id: '',
    wordId,
    status: 'new',
    srsLevel: 0,
    timesReviewed: 0,
    lastReviewedAt: null,
    nextReviewAt: Date.now(),
  };
}

const PAGE_SIZE = 1000;

/** PostgREST caps a single response at ~1000 rows; page through with .range() to get everything. */
async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>) {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}

async function loadCatalogAndProgress(userId: string) {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const [wordsRows, progressRows, settingsRes, eventsOutcome] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from('words').select('*, word_forms(*), example_sentences(*)').order('lemma').range(from, to)
    ),
    fetchAllRows((from, to) => supabase.from('word_progress').select('*').eq('user_id', userId).range(from, to)),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    // The table may not exist yet (migration 0002 not applied) — degrade instead of failing boot.
    fetchAllRows((from, to) =>
      supabase
        .from('review_events')
        .select('word_id, grade, reviewed_at')
        .eq('user_id', userId)
        .gte('reviewed_at', since)
        .range(from, to)
    )
      .then((data) => ({ data, available: true }))
      .catch(() => ({ data: [] as any[], available: false })),
  ]);
  if (settingsRes.error) throw settingsRes.error;

  const words = wordsRows.map(mapWord);
  const progressByWordId: Record<string, WordProgress> = {};
  for (const row of progressRows) {
    const progress = mapWordProgress(row);
    progressByWordId[progress.wordId] = progress;
  }

  let settings: UserSettings;
  if (settingsRes.data) {
    settings = mapUserSettings(settingsRes.data);
  } else {
    const { data: created, error } = await supabase
      .from('user_settings')
      .insert({ user_id: userId, weekly_goal: DEFAULT_WEEKLY_GOAL })
      .select()
      .single();
    if (error) throw error;
    settings = mapUserSettings(created);
  }

  const reviewEventsAvailable = eventsOutcome.available;
  const reviewEvents: ReviewEvent[] = eventsOutcome.data.map((row: any) => ({
    wordId: row.word_id,
    grade: row.grade,
    reviewedAt: new Date(row.reviewed_at).getTime(),
  }));

  return { words, progressByWordId, settings, reviewEvents, reviewEventsAvailable };
}

async function insertBatchProgress(userId: string, wordIds: string[]) {
  if (wordIds.length === 0) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('word_progress')
    .insert(wordIds.map((wordId) => ({ user_id: userId, word_id: wordId, status: 'learning', next_review_at: now })))
    .select();
  if (error) throw error;
  return (data ?? []).map(mapWordProgress);
}

/** Picks `goal` untouched (no progress row) words, weighted by frequency tier, and starts them. */
async function generateBatch(userId: string, words: Word[], progressByWordId: Record<string, WordProgress>, goal: number) {
  const untouched = words.filter((w) => !progressByWordId[w.id]);
  const chosen = pickWeightedBatch(untouched, goal);
  const inserted = await insertBatchProgress(userId, chosen.map((w) => w.id));
  const nextProgressByWordId = { ...progressByWordId };
  for (const progress of inserted) nextProgressByWordId[progress.wordId] = progress;
  return { progressByWordId: nextProgressByWordId, added: inserted.length };
}

async function updateBatchStartedAt(userId: string, timestamp: number): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .update({ batch_started_at: new Date(timestamp).toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapUserSettings(data);
}

async function bootReady(userId: string, email: string | null, set: (partial: Partial<State>) => void) {
  let { words, progressByWordId, settings, reviewEvents, reviewEventsAvailable } = await loadCatalogAndProgress(userId);

  const dueForRefresh = settings.batchStartedAt === null || Date.now() - settings.batchStartedAt >= WEEK_MS;
  if (dueForRefresh) {
    const result = await generateBatch(userId, words, progressByWordId, settings.weeklyGoal);
    progressByWordId = result.progressByWordId;
    settings = await updateBatchStartedAt(userId, Date.now());
  }

  set({
    userId,
    userEmail: email,
    words,
    progressByWordId,
    userSettings: settings,
    reviewEvents,
    reviewEventsAvailable,
    bootStatus: 'ready',
  });
}

export const useStore = create<Store>()((set, get) => ({
  bootStatus: 'loading',
  bootError: null,
  userId: null,
  userEmail: null,
  words: [],
  progressByWordId: {},
  userSettings: null,
  reviewEvents: [],
  reviewEventsAvailable: false,
  authLoading: false,
  authError: null,

  init: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      if (!session) {
        set({ bootStatus: 'auth' });
        return;
      }

      await bootReady(session.user.id, session.user.email ?? null, set);
    } catch (err: any) {
      set({ bootStatus: 'error', bootError: err?.message ?? 'Bilinmeyen hata' });
    }
  },

  signInWithEmail: async (email) => {
    set({ authLoading: true, authError: null });
    const trimmed = email.trim().toLowerCase();
    const password = derivedPassword(trimmed);

    let { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error) {
      const signUp = await supabase.auth.signUp({ email: trimmed, password });
      if (signUp.error) {
        set({ authLoading: false, authError: signUp.error.message });
        return;
      }
      if (!signUp.data.session) {
        set({
          authLoading: false,
          authError: 'Kayıt oluştu ama oturum açılamadı. Supabase\'de "Confirm email" ayarını kapat.',
        });
        return;
      }
      data = { user: signUp.data.user!, session: signUp.data.session } as typeof data;
    }

    try {
      await bootReady(data.session!.user.id, data.session!.user.email ?? null, set);
      set({ authLoading: false });
    } catch (err: any) {
      set({ authLoading: false, authError: err?.message ?? 'Kelimeler yüklenemedi' });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      bootStatus: 'auth',
      userId: null,
      userEmail: null,
      words: [],
      progressByWordId: {},
      userSettings: null,
          authError: null,
    });
  },

  setStatus: async (wordId, status) => {
    const userId = get().userId;
    if (!userId) return;

    const existing = get().progressByWordId[wordId] ?? defaultProgress(wordId);
    const srsLevel = status === 'known' ? Math.max(existing.srsLevel, 4) : status === 'new' ? 0 : Math.max(existing.srsLevel, 1);
    const nextReviewAt = Date.now() + INTERVALS_DAYS[srsLevel] * 24 * 60 * 60 * 1000;

    const optimistic: WordProgress = { ...existing, status, srsLevel, nextReviewAt };
    set({ progressByWordId: { ...get().progressByWordId, [wordId]: optimistic } });

    const { data, error } = await supabase
      .from('word_progress')
      .upsert(
        {
          user_id: userId,
          word_id: wordId,
          status,
          srs_level: srsLevel,
          next_review_at: new Date(nextReviewAt).toISOString(),
        },
        { onConflict: 'user_id,word_id' }
      )
      .select()
      .single();

    if (!error && data) {
      set({ progressByWordId: { ...get().progressByWordId, [wordId]: mapWordProgress(data) } });
    }
  },

  reviewWord: async (wordId, grade) => {
    const userId = get().userId;
    if (!userId) return;

    const existing = get().progressByWordId[wordId] ?? defaultProgress(wordId);
    const result = applyGrade(existing.srsLevel, grade);
    const now = Date.now();

    const optimistic: WordProgress = {
      ...existing,
      status: result.status,
      srsLevel: result.srsLevel,
      timesReviewed: existing.timesReviewed + 1,
      lastReviewedAt: now,
      nextReviewAt: result.nextReviewAt,
    };
    set({
      progressByWordId: { ...get().progressByWordId, [wordId]: optimistic },
      reviewEvents: [...get().reviewEvents, { wordId, grade, reviewedAt: now }],
    });
    supabase
      .from('review_events')
      .insert({ user_id: userId, word_id: wordId, grade, reviewed_at: new Date(now).toISOString() })
      .then(() => {});

    const { data, error } = await supabase
      .from('word_progress')
      .upsert(
        {
          user_id: userId,
          word_id: wordId,
          status: result.status,
          srs_level: result.srsLevel,
          times_reviewed: existing.timesReviewed + 1,
          last_reviewed_at: new Date(now).toISOString(),
          next_review_at: new Date(result.nextReviewAt).toISOString(),
        },
        { onConflict: 'user_id,word_id' }
      )
      .select()
      .single();

    if (!error && data) {
      set({ progressByWordId: { ...get().progressByWordId, [wordId]: mapWordProgress(data) } });
    }
  },

  setWeeklyGoal: async (goal) => {
    const userId = get().userId;
    if (!userId) return;
    const clamped = Math.max(1, Math.round(goal));

    const current = get().userSettings;
    if (current) set({ userSettings: { ...current, weeklyGoal: clamped } });

    const { data, error } = await supabase
      .from('user_settings')
      .update({ weekly_goal: clamped })
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) set({ userSettings: mapUserSettings(data) });
  },

  startNewBatch: async (goal) => {
    const userId = get().userId;
    const state = get();
    if (!userId) return { added: 0, requested: 0 };

    const requested = goal ?? state.userSettings?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL;
    const result = await generateBatch(userId, state.words, state.progressByWordId, requested);
    const settings = await updateBatchStartedAt(userId, Date.now());

    set({ progressByWordId: result.progressByWordId, userSettings: settings });
    return { added: result.added, requested };
  },

  resetProgress: async () => {
    const userId = get().userId;
    if (!userId) return;

    const { error: deleteError } = await supabase.from('word_progress').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;

    const { data, error } = await supabase
      .from('user_settings')
      .update({ batch_started_at: null })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;

    if (get().reviewEventsAvailable) {
      await supabase.from('review_events').delete().eq('user_id', userId);
    }

    set({ progressByWordId: {}, reviewEvents: [], userSettings: mapUserSettings(data) });
  },
}));

export function useWordProgress(wordId: string): WordProgress {
  const progress = useStore((s) => s.progressByWordId[wordId]);
  return useMemo(() => progress ?? defaultProgress(wordId), [progress, wordId]);
}

export function useDueWords(): Word[] {
  return useStore(
    useShallow((s) => {
      const now = Date.now();
      return s.words
        .filter((w) => {
          const p = s.progressByWordId[w.id];
          return !!p && p.nextReviewAt <= now;
        })
        .sort((a, b) => {
          const pa = s.progressByWordId[a.id]?.nextReviewAt ?? 0;
          const pb = s.progressByWordId[b.id]?.nextReviewAt ?? 0;
          return pa - pb;
        });
    })
  );
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive days with at least one review, ending today (or yesterday if nothing yet today). */
export function computeStreak(events: ReviewEvent[]): number {
  const days = new Set(events.map((e) => dayKey(e.reviewedAt)));
  const cursor = new Date();
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Review counts for Monday..Sunday of the current week. */
export function computeWeeklyCounts(events: ReviewEvent[]): number[] {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset).getTime();
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of events) {
    const idx = Math.floor((e.reviewedAt - monday) / (24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < 7) counts[idx] += 1;
  }
  return counts;
}

export function countReviewsToday(events: ReviewEvent[]): number {
  const today = dayKey(Date.now());
  return events.filter((e) => dayKey(e.reviewedAt) === today).length;
}
