import a1 from './a1.json';
import { CefrLevel } from '../types';

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'quote'; lines: string[] };

export interface Exercise {
  prompt: string;
  answer: string;
}

export type TopicKind = 'grammar' | 'vocab' | 'communication' | 'pronunciation' | 'mistake';

export interface Topic {
  code: string;
  kind: TopicKind;
  title: string;
  blocks: Block[];
  exerciseTitle?: string;
  exercises: Exercise[];
}

export interface Unit {
  no: number;
  title: string;
  codes: string[];
}

export interface CourseWord {
  theme: string;
  unit: number;
  word: string;
  tr: string;
  pos: string;
  countable?: string;
  plural?: string;
  third?: string;
  ing?: string;
  past?: string;
}

export interface ExamQuestion {
  prompt: string;
  options: string[];
  answer: number;
  audio?: string;
}

export interface ExamSection {
  title: string;
  passage?: string[];
  questions: ExamQuestion[];
}

export interface Course {
  level: CefrLevel;
  units: Unit[];
  topics: Record<string, Topic>;
  words: CourseWord[];
  exam: ExamSection[];
}

export const COURSES: Partial<Record<CefrLevel, Course>> = {
  A1: a1 as unknown as Course,
};

export const KIND_LABELS: Record<TopicKind, string> = {
  grammar: 'Gramer',
  vocab: 'Kelimeler',
  communication: 'İletişim',
  pronunciation: 'Telaffuz',
  mistake: 'Sık hatalar',
};

/** Unit tests and the level exam need this score (percent) to pass. */
export const UNIT_PASS = 80;
export const EXAM_PASS_TOTAL = 70;
export const EXAM_PASS_SECTION = 60;

export const unitTestKey = (unitNo: number) => `U${String(unitNo).padStart(2, '0')}-test`;
export const EXAM_KEY = 'exam';

/** Exercises that make up a unit test: the unit's grammar drills plus its Turkish-mistake drills. */
export function unitTestExercises(course: Course, unit: Unit): (Exercise & { code: string; hint: string })[] {
  return unit.codes
    .map((c) => course.topics[c])
    .filter((t): t is Topic => !!t && (t.kind === 'grammar' || t.kind === 'mistake'))
    .flatMap((t) => {
      // Shuffled out of their topic, questions need the instruction ("Uygun zamiri yaz") to make sense.
      const instruction = t.exerciseTitle?.split(' — ')[1];
      const hint = instruction ? `${t.title} · ${instruction}` : t.title;
      return t.exercises.map((e) => ({ ...e, code: t.code, hint }));
    });
}
