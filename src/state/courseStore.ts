import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { CefrLevel } from '../types';
import { COURSES, EXAM_KEY, UNIT_PASS, unitTestKey } from '../content';
import { useStore } from './store';

export interface ProgressEntry {
  score: number | null;
  completed: boolean;
}

interface CourseState {
  loaded: boolean;
  progress: Record<string, ProgressEntry>; // key: `${level}:${itemKey}`
  error: string | null;
  load: () => Promise<void>;
  saveResult: (level: CefrLevel, itemKey: string, score: number | null, completed: boolean) => Promise<void>;
  reset: () => void;
}

const k = (level: string, itemKey: string) => `${level}:${itemKey}`;

export const useCourseStore = create<CourseState>()((set, get) => ({
  loaded: false,
  progress: {},
  error: null,

  load: async () => {
    const userId = useStore.getState().userId;
    if (!userId) return;
    const { data, error } = await supabase.from('course_progress').select('level, item_key, score, completed').eq('user_id', userId);
    if (error) {
      set({ error: error.message, loaded: true });
      return;
    }
    const progress: Record<string, ProgressEntry> = {};
    for (const row of data ?? []) progress[k(row.level, row.item_key)] = { score: row.score, completed: row.completed };
    set({ progress, loaded: true, error: null });
  },

  saveResult: async (level, itemKey, score, completed) => {
    const userId = useStore.getState().userId;
    if (!userId) return;
    const prev = get().progress[k(level, itemKey)];
    // Keep the best score: a worse retry shouldn't re-lock a unit that was already passed.
    const best = prev?.score != null && score != null ? Math.max(prev.score, score) : score ?? prev?.score ?? null;
    const done = completed || !!prev?.completed;
    set({ progress: { ...get().progress, [k(level, itemKey)]: { score: best, completed: done } } });
    const { error } = await supabase.from('course_progress').upsert(
      { user_id: userId, level, item_key: itemKey, score: best, completed: done, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,level,item_key' }
    );
    if (error) set({ error: error.message });
  },

  reset: () => set({ progress: {}, loaded: false }),
}));

export function useEntry(level: CefrLevel, itemKey: string): ProgressEntry | undefined {
  return useCourseStore((s) => s.progress[k(level, itemKey)]);
}

/** Units open in order: unit 1 always, unit N once unit N-1's test reached the pass mark. */
export function isUnitUnlocked(progress: Record<string, ProgressEntry>, level: CefrLevel, unitNo: number) {
  if (unitNo <= 1) return true;
  const prev = progress[k(level, unitTestKey(unitNo - 1))];
  return (prev?.score ?? 0) >= UNIT_PASS;
}

export function isUnitDone(progress: Record<string, ProgressEntry>, level: CefrLevel, unitNo: number) {
  return (progress[k(level, unitTestKey(unitNo))]?.score ?? 0) >= UNIT_PASS;
}

export function levelSummary(progress: Record<string, ProgressEntry>, level: CefrLevel) {
  const course = COURSES[level];
  if (!course) return { unitsDone: 0, unitsTotal: 0, examPassed: false, percent: 0 };
  const unitsDone = course.units.filter((u) => isUnitDone(progress, level, u.no)).length;
  const examPassed = !!progress[k(level, EXAM_KEY)]?.completed;
  // Weighting follows the analysis doc (US-15) minus the speaking/vocab parts we don't measure yet.
  const percent = Math.round((unitsDone / course.units.length) * 80 + (examPassed ? 20 : 0));
  return { unitsDone, unitsTotal: course.units.length, examPassed, percent };
}

// Drop cached progress when the signed-in user changes (sign-out / another account).
useStore.subscribe((s, prev) => {
  if (s.userId !== prev.userId) useCourseStore.getState().reset();
});
