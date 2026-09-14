import { ExampleSentence, Word, WordForm, WordProgress } from '../types';

export function mapWordForm(row: any): WordForm {
  return { id: row.id, formType: row.form_type, text: row.text };
}

export function mapExampleSentence(row: any): ExampleSentence {
  return { id: row.id, tense: row.tense, textEn: row.text_en, textTr: row.text_tr };
}

export function mapWord(row: any): Word {
  return {
    id: row.id,
    lemma: row.lemma,
    partOfSpeech: row.part_of_speech,
    cefr: row.cefr,
    ipa: row.ipa,
    translationTr: row.translation_tr,
    nuanceTr: row.nuance_tr,
    forms: (row.word_forms ?? []).map(mapWordForm),
    examples: (row.example_sentences ?? []).map(mapExampleSentence),
  };
}

export function mapWordProgress(row: any): WordProgress {
  return {
    id: row.id,
    wordId: row.word_id,
    status: row.status,
    srsLevel: row.srs_level,
    timesReviewed: row.times_reviewed,
    lastReviewedAt: row.last_reviewed_at ? new Date(row.last_reviewed_at).getTime() : null,
    nextReviewAt: new Date(row.next_review_at).getTime(),
  };
}
