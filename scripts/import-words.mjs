// Upserts a word-bank JSON file (see data/seed-words.json for the shape)
// into Supabase using the service-role key, which bypasses RLS.
// Usage: node scripts/import-words.mjs [path/to/words.json]

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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'EXPO_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env dosyasında tanımlı olmalı (bkz. supabase/README.md).'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const inputPath = resolve(process.cwd(), process.argv[2] ?? 'data/seed-words.json');
const words = JSON.parse(readFileSync(inputPath, 'utf-8'));

let count = 0;
for (const word of words) {
  const { data: wordRow, error: wordError } = await supabase
    .from('words')
    .upsert(
      {
        lemma: word.lemma,
        part_of_speech: word.partOfSpeech,
        cefr: word.cefr ?? null,
        ipa: word.ipa ?? null,
        translation_tr: word.translationTr,
        nuance_tr: word.nuanceTr ?? null,
        frequency_score: word.frequencyScore ?? 3,
      },
      { onConflict: 'lemma' }
    )
    .select()
    .single();

  if (wordError) {
    console.error(`"${word.lemma}" kaydedilemedi:`, wordError.message);
    continue;
  }

  const wordId = wordRow.id;

  await supabase.from('word_forms').delete().eq('word_id', wordId);
  if (word.forms?.length) {
    const { error } = await supabase
      .from('word_forms')
      .insert(word.forms.map((f) => ({ word_id: wordId, form_type: f.formType, text: f.text })));
    if (error) console.error(`"${word.lemma}" formları kaydedilemedi:`, error.message);
  }

  await supabase.from('example_sentences').delete().eq('word_id', wordId);
  if (word.examples?.length) {
    const { error } = await supabase.from('example_sentences').insert(
      word.examples.map((e) => ({
        word_id: wordId,
        tense: e.tense,
        text_en: e.textEn,
        text_tr: e.textTr,
      }))
    );
    if (error) console.error(`"${word.lemma}" örnekleri kaydedilemedi:`, error.message);
  }

  count += 1;
  console.log(`✓ ${word.lemma}`);
}

console.log(`\n${count}/${words.length} kelime içe aktarıldı.`);
