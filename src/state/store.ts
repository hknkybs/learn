import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { BootStatus, ReviewGrade, UserSettings, Word, WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';
import { mapUserSettings, mapWord, mapWordProgress } from '../lib/mappers';
import { applyGrade, INTERVALS_DAYS } from '../lib/srs';
import { pickWeightedBatch } from '../lib/batch';

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
  otpEmail: string | null;
  authLoading: boolean;
  authError: string | null;
}

interface Actions {
  init: () => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
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

async function loadCatalogAndProgress(userId: string) {
  const [wordsRes, progressRes, settingsRes] = await Promise.all([
    supabase.from('words').select('*, word_forms(*), example_sentences(*)').order('lemma'),
    supabase.from('word_progress').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (wordsRes.error) throw wordsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const words = (wordsRes.data ?? []).map(mapWord);
  const progressByWordId: Record<string, WordProgress> = {};
  for (const row of progressRes.data ?? []) {
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

  return { words, progressByWordId, settings };
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
  let { words, progressByWordId, settings } = await loadCatalogAndProgress(userId);

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
  otpEmail: null,
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

  sendOtp: async (email) => {
    set({ authLoading: true, authError: null });
    const trimmed = email.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    if (error) {
      set({ authLoading: false, authError: error.message });
      return;
    }
    set({ authLoading: false, otpEmail: trimmed });
  },

  verifyOtp: async (code) => {
    const email = get().otpEmail;
    if (!email) return;
    set({ authLoading: true, authError: null });

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });
    if (error || !data.session) {
      set({ authLoading: false, authError: error?.message ?? 'Kod doğrulanamadı' });
      return;
    }

    try {
      await bootReady(data.session.user.id, data.session.user.email ?? null, set);
      set({ authLoading: false, otpEmail: null });
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
      otpEmail: null,
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
    set({ progressByWordId: { ...get().progressByWordId, [wordId]: optimistic } });

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

    set({ progressByWordId: {}, userSettings: mapUserSettings(data) });
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
