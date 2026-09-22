// Upserts a word-bank JSON file (see data/seed-words.json for the shape)
// into Supabase using the service-role key, which bypasses RLS.
// Usage: node scripts/import-words.mjs [path/to/words.json] [--check]
// --check validates the file only (no Supabase connection, no upload).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  let raw;
  try {
    raw = readFileSync(envPath, 'utf-8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const inputPath = resolve(process.cwd(), args.find((a) => !a.startsWith('--')) ?? 'data/seed-words.json');

let words;
try {
  words = JSON.parse(readFileSync(inputPath, 'utf-8'));
} catch (err) {
  console.error(`Dosya okunamadı / geçerli JSON değil: ${inputPath}\n${err.message}`);
  process.exit(1);
}

const POS = ['verb', 'noun', 'adjective', 'adverb', 'phrase', 'preposition', 'conjunction', 'pronoun', 'number', 'other'];
const FORM_TYPES = [
  'base', 'third_person_singular', 'past_simple', 'past_participle', 'gerund',
  'singular', 'plural', 'comparative', 'superlative',
];
const TENSES = ['general', 'present_simple', 'present_continuous', 'past_simple', 'future'];
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function validate(list) {
  const errors = [];
  const warnings = [];
  const skipIndexes = new Set();
  if (!Array.isArray(list)) return { errors: ['Dosyanın kökü bir dizi ([...]) olmalı.'], warnings, skipIndexes };

  const seen = new Map();
  list.forEach((w, i) => {
    const id = `#${i + 1} "${w?.lemma ?? '?'}"`;
    const err = (msg) => errors.push(`${id}: ${msg}`);
    const warn = (msg) => warnings.push(`${id}: ${msg}`);

    if (!w?.lemma || typeof w.lemma !== 'string') return err('lemma eksik');
    const key = w.lemma.trim().toLowerCase();
    if (seen.has(key)) {
      warn(`lemma "${w.lemma}" dosyada birden fazla kez var (ilk geçen "${list[seen.get(key)].partOfSpeech}" kaydedilecek, bu atlanıyor — aynı lemma için tek satır destekleniyor)`);
      skipIndexes.add(i);
      return;
    }
    seen.set(key, i);

    if (!POS.includes(w.partOfSpeech)) err(`partOfSpeech geçersiz (${POS.join(' | ')})`);
    if (!w.translationTr) err('translationTr eksik');
    if (w.frequencyScore === undefined) warn('frequencyScore yok, 3 olarak yüklenecek');
    else if (![1, 2, 3, 4, 5].includes(w.frequencyScore)) err('frequencyScore 1-5 arası tam sayı olmalı');
    if (w.cefr && !CEFR.includes(w.cefr)) err(`cefr geçersiz (${CEFR.join(' | ')})`);

    for (const f of w.forms ?? []) {
      if (!FORM_TYPES.includes(f.formType)) err(`forms: bilinmeyen formType "${f.formType}"`);
      if (!f.text) err(`forms: "${f.formType}" için text boş`);
    }

    const tenses = new Set();
    for (const e of w.examples ?? []) {
      if (!TENSES.includes(e.tense)) err(`examples: bilinmeyen tense "${e.tense}"`);
      if (!e.textEn || !e.textTr) err(`examples: "${e.tense}" için textEn/textTr eksik`);
      if (tenses.has(e.tense)) warn(`aynı tense ("${e.tense}") için birden fazla örnek var, ilki gösterilir`);
      tenses.add(e.tense);
    }
    if (w.partOfSpeech === 'verb' || w.partOfSpeech === 'phrase') {
      const missing = ['present_simple', 'present_continuous', 'past_simple', 'future'].filter((t) => !tenses.has(t));
      if (missing.length) warn(`eksik zaman örnekleri: ${missing.join(', ')}`);
    }
  });
  return { errors, warnings, skipIndexes };
}

const { errors, warnings, skipIndexes } = validate(words);
warnings.forEach((m) => console.warn(`⚠ ${m}`));
if (errors.length) {
  errors.forEach((m) => console.error(`✗ ${m}`));
  console.error(`\n${errors.length} hata bulundu, yükleme yapılmadı.`);
  process.exit(1);
}
words = words.filter((_, i) => !skipIndexes.has(i));
console.log(`✓ ${words.length} kelime geçerli${warnings.length ? ` (${warnings.length} uyarı)` : ''}.`);
if (checkOnly) process.exit(0);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'EXPO_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env dosyasında tanımlı olmalı (bkz. supabase/README.md).'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const WORD_CHUNK = 500;
const ROW_CHUNK = 1000;

console.log(`${words.length} kelime yükleniyor...`);

const wordIdByLemma = new Map();
for (const [i, batch] of chunk(words, WORD_CHUNK).entries()) {
  const { data, error } = await supabase
    .from('words')
    .upsert(
      batch.map((w) => ({
        lemma: w.lemma,
        part_of_speech: w.partOfSpeech,
        cefr: w.cefr ?? null,
        ipa: w.ipa ?? null,
        translation_tr: w.translationTr,
        nuance_tr: w.nuanceTr ?? null,
        frequency_score: w.frequencyScore ?? 3,
      })),
      { onConflict: 'lemma' }
    )
    .select('id, lemma');
  if (error) {
    console.error(`Kelime grubu ${i + 1} kaydedilemedi:`, error.message);
    process.exit(1);
  }
  for (const row of data) wordIdByLemma.set(row.lemma, row.id);
  console.log(`✓ kelimeler ${Math.min((i + 1) * WORD_CHUNK, words.length)}/${words.length}`);
}

const wordIds = [...wordIdByLemma.values()];
for (const batch of chunk(wordIds, WORD_CHUNK)) {
  await supabase.from('word_forms').delete().in('word_id', batch);
  await supabase.from('example_sentences').delete().in('word_id', batch);
}

const formRows = [];
const exampleRows = [];
for (const w of words) {
  const wordId = wordIdByLemma.get(w.lemma);
  if (!wordId) continue;
  for (const f of w.forms ?? []) formRows.push({ word_id: wordId, form_type: f.formType, text: f.text });
  for (const e of w.examples ?? []) exampleRows.push({ word_id: wordId, tense: e.tense, text_en: e.textEn, text_tr: e.textTr });
}

for (const [i, batch] of chunk(formRows, ROW_CHUNK).entries()) {
  const { error } = await supabase.from('word_forms').insert(batch);
  if (error) console.error(`Hâl grubu ${i + 1} kaydedilemedi:`, error.message);
}
console.log(`✓ ${formRows.length} hâl (form) yüklendi`);

for (const [i, batch] of chunk(exampleRows, ROW_CHUNK).entries()) {
  const { error } = await supabase.from('example_sentences').insert(batch);
  if (error) console.error(`Örnek cümle grubu ${i + 1} kaydedilemedi:`, error.message);
}
console.log(`✓ ${exampleRows.length} örnek cümle yüklendi`);

console.log(`\n${wordIdByLemma.size}/${words.length} kelime içe aktarıldı.`);
