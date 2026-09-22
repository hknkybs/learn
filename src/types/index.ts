export type PartOfSpeech = 'verb' | 'noun' | 'adjective' | 'adverb' | 'phrase' | 'preposition' | 'conjunction' | 'pronoun' | 'number' | 'other';

export type WordFormType =
  | 'base'
  | 'third_person_singular'
  | 'past_simple'
  | 'past_participle'
  | 'gerund'
  | 'singular'
  | 'plural'
  | 'comparative'
  | 'superlative';

export type Tense = 'general' | 'present_simple' | 'present_continuous' | 'past_simple' | 'future';

export type WordStatus = 'new' | 'learning' | 'known';

export type BootStatus = 'loading' | 'auth' | 'ready' | 'error';

export interface WordForm {
  id: string;
  formType: WordFormType;
  text: string;
}

export interface ExampleSentence {
  id: string;
  tense: Tense;
  textEn: string;
  textTr: string;
}

export interface Word {
  id: string;
  lemma: string;
  partOfSpeech: PartOfSpeech;
  cefr: string | null;
  ipa: string | null;
  translationTr: string;
  nuanceTr: string | null;
  /** 1 = most frequently used in real speech, 5 = rarest. Drives weekly batch selection. */
  frequencyScore: number;
  forms: WordForm[];
  examples: ExampleSentence[];
}

export interface UserSettings {
  weeklyGoal: number;
  batchStartedAt: number | null;
  notificationsEnabled: boolean;
  notifyStartMinute: number;
  notifyEndMinute: number;
}

export interface WordProgress {
  id: string;
  wordId: string;
  status: WordStatus;
  srsLevel: number;
  timesReviewed: number;
  lastReviewedAt: number | null;
  nextReviewAt: number;
}

export type ReviewGrade = 'again' | 'hard' | 'good';

export interface ReviewEvent {
  wordId: string;
  grade: ReviewGrade;
  reviewedAt: number;
}
