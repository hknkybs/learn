import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { BootStatus, ReviewGrade, Word, WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';
import { mapWord, mapWordProgress } from '../lib/mappers';
import { applyGrade, INTERVALS_DAYS } from '../lib/srs';

interface State {
  bootStatus: BootStatus;
  bootError: string | null;
  userId: string | null;
  userEmail: string | null;
  words: Word[];
  progressByWordId: Record<string, WordProgress>;
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
  const [wordsRes, progressRes] = await Promise.all([
    supabase.from('words').select('*, word_forms(*), example_sentences(*)').order('lemma'),
    supabase.from('word_progress').select('*').eq('user_id', userId),
  ]);
  if (wordsRes.error) throw wordsRes.error;
  if (progressRes.error) throw progressRes.error;

  const words = (wordsRes.data ?? []).map(mapWord);
  const progressByWordId: Record<string, WordProgress> = {};
  for (const row of progressRes.data ?? []) {
    const progress = mapWordProgress(row);
    progressByWordId[progress.wordId] = progress;
  }
  return { words, progressByWordId };
}

export const useStore = create<Store>()((set, get) => ({
  bootStatus: 'loading',
  bootError: null,
  userId: null,
  userEmail: null,
  words: [],
  progressByWordId: {},
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

      const { words, progressByWordId } = await loadCatalogAndProgress(session.user.id);
      set({
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        words,
        progressByWordId,
        bootStatus: 'ready',
      });
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
      const { words, progressByWordId } = await loadCatalogAndProgress(data.session.user.id);
      set({
        authLoading: false,
        otpEmail: null,
        userId: data.session.user.id,
        userEmail: data.session.user.email ?? null,
        words,
        progressByWordId,
        bootStatus: 'ready',
      });
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
          return !p || p.nextReviewAt <= now;
        })
        .sort((a, b) => {
          const pa = s.progressByWordId[a.id]?.nextReviewAt ?? 0;
          const pb = s.progressByWordId[b.id]?.nextReviewAt ?? 0;
          return pa - pb;
        });
    })
  );
}
