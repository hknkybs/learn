// Converts the A1 curriculum docs in content/a1/ (markdown + CSV) into
// src/content/a1.json, which the "Öğren" tab renders. Re-run after editing the docs:
//   node scripts/build-a1-content.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (name) => readFileSync(resolve(root, 'content/a1', name), 'utf-8');

const unescape = (s) => s.replace(/\\([_~\-|#.+!()[\]])/g, '$1').replace(/\\\*/g, '*');

/** Minimal markdown → block list (paragraphs, headings, tables, lists, quotes). */
function toBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => unescape(c.trim()));
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ t: 'table', head: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (line.startsWith('>')) {
      const out = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const l = lines[i].replace(/^\s*>\s?/, '').trim();
        if (l) out.push(unescape(l));
        i++;
      }
      blocks.push({ t: 'quote', lines: out });
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(unescape(lines[i].replace(/^\s*[-*] /, '').trim()));
        i++;
      }
      blocks.push({ t: 'ul', items });
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        items.push(unescape(lines[i].replace(/^\s*\d+\. /, '').trim()));
        i++;
      }
      blocks.push({ t: 'ol', items });
      continue;
    }
    if (/^#{2,4} /.test(line)) {
      blocks.push({ t: 'h', text: unescape(line.replace(/^#+ /, '')) });
      i++;
      continue;
    }
    blocks.push({ t: 'p', text: unescape(line.trim()) });
    i++;
  }
  return blocks;
}

/** Splits a doc into sections keyed by the heading's leading code (G01, F03, P05, V12...). */
function sections(md, level) {
  const marker = '#'.repeat(level) + ' ';
  const out = [];
  let current = null;
  for (const line of md.split('\n')) {
    if (line.startsWith(marker)) {
      const m = /^#+ ([A-Z]+\d+) (.*)$/.exec(line);
      current = m ? { code: m[1], heading: m[2], body: [] } : null;
      if (current) out.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }
  return out.map((s) => ({ ...s, body: s.body.join('\n') }));
}

function parseAnswerLine(line) {
  const text = unescape(line.replace(/^\*\*Cevaplar:\*\*\s*/, '').trim());
  const map = {};
  for (const part of text.split(' · ')) {
    const m = /^(\d+)\s+(.*)$/.exec(part.trim());
    if (m) map[Number(m[1])] = m[2].trim();
  }
  return map;
}

const topics = {};

// ── Grammar ────────────────────────────────────────────────────────────────
for (const s of sections(src('A1_Icerik_Kilavuzu_2_Gramer.md'), 2)) {
  const [title] = s.heading.split(' — ');
  const lines = s.body.split('\n');
  const exStart = lines.findIndex((l) => l.startsWith('**Alıştırma'));
  const ansIdx = lines.findIndex((l) => l.startsWith('**Cevaplar:**'));
  const teach = exStart === -1 ? lines : lines.slice(0, exStart);
  const exercises = [];
  let exerciseTitle;
  if (exStart !== -1 && ansIdx !== -1) {
    exerciseTitle = unescape(lines[exStart].replace(/\*\*/g, '').trim());
    const answers = parseAnswerLine(lines[ansIdx]);
    for (const l of lines.slice(exStart + 1, ansIdx)) {
      const m = /^(\d+)\. (.*)$/.exec(l.trim());
      if (m && answers[Number(m[1])]) exercises.push({ prompt: unescape(m[2]), answer: answers[Number(m[1])] });
    }
  }
  topics[s.code] = { code: s.code, kind: 'grammar', title, blocks: toBlocks(teach.join('\n')), exerciseTitle, exercises };
}

// ── Vocabulary themes (teaching notes; the word list itself comes from the CSV) ──
for (const s of sections(src('A1_Icerik_Kilavuzu_3_Kelime.md'), 3)) {
  const [title] = s.heading.split(' — ');
  const notes = s.body
    .split('\n')
    .filter((l) => l.startsWith('*Öğretim notu:*'))
    .map((l) => unescape(l.replace('*Öğretim notu:*', '').trim()));
  topics[s.code] = { code: s.code, kind: 'vocab', title, blocks: notes.map((text) => ({ t: 'p', text })), exercises: [] };
}

// ── Communication ──────────────────────────────────────────────────────────
for (const s of sections(src('A1_Icerik_Kilavuzu_4_Iletisim.md'), 2)) {
  const [title] = s.heading.split(' — ');
  topics[s.code] = { code: s.code, kind: 'communication', title, blocks: toBlocks(s.body), exercises: [] };
}

// ── Pronunciation ──────────────────────────────────────────────────────────
for (const s of sections(src('A1_Icerik_Kilavuzu_5_Telaffuz.md'), 2)) {
  const [title] = s.heading.split(' — ');
  topics[s.code] = { code: s.code, kind: 'pronunciation', title, blocks: toBlocks(s.body), exercises: [] };
}

// ── Turkish-speaker mistakes (table row = card, "**TRxx**" lists = fix-it drills) ──
{
  const md = src('A1_Icerik_Kilavuzu_6_TR_Hatalari.md');
  const table = toBlocks(md.split('## Hata Tamiri')[0]).find((b) => b.t === 'table');
  const drills = {};
  let current = null;
  for (const line of md.split('\n')) {
    const head = /^\*\*(TR\d+)\*\*$/.exec(line.trim());
    if (head) { current = head[1]; drills[current] = []; continue; }
    const item = /^\d+\. \*(.+?)\*\s*→\s*(.+)$/.exec(line.trim());
    if (current && item) drills[current].push({ prompt: unescape(item[1]), answer: unescape(item[2]).replace(/\*\*/g, '') });
  }
  for (const row of table.rows) {
    const [code, title, wrongRight, why, rule, related] = row;
    topics[code] = {
      code,
      kind: 'mistake',
      title,
      blocks: [
        { t: 'table', head: ['Yanlış → Doğru', 'Türkçede…', 'İngilizcede…'], rows: [[wrongRight, why, rule]] },
        { t: 'p', text: `İlgili konular: ${related}` },
      ],
      exerciseTitle: 'Hata Tamiri — hatayı bul ve düzelt',
      exercises: drills[code] ?? [],
    };
  }
}

// ── Units (from the overview's "Ünite sırası" table) ───────────────────────
const units = [];
for (const line of src('A1_Icerik_Kilavuzu_1_Genel_Bakis.md').split('\n')) {
  const m = /^\| Ü(\d+) ([^|]+)\| ([^|]+)\|$/.exec(line.trim());
  if (!m) continue;
  const codes = m[3].match(/\b(?:TR|[GVFP])\d+\b/g) ?? [];
  units.push({ no: Number(m[1]), title: m[2].trim(), codes: [...new Set(codes)] });
}

// ── Word list (CSV) ────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const [, ...wordRows] = parseCsv(src('A1_Kelime_Listesi.csv'));
const words = wordRows
  .filter((r) => r.length >= 6 && r[3])
  .map(([theme, , unit, word, tr, pos, countable, plural, third, ing, past]) => ({
    theme, unit: Number(unit), word, tr, pos,
    ...(countable ? { countable } : {}),
    ...(plural ? { plural } : {}),
    ...(third ? { third } : {}),
    ...(ing ? { ing } : {}),
    ...(past ? { past } : {}),
  }));

// ── Level-end exam (auto-gradable parts: A language use, B listening, C reading) ──
function parseExam(md) {
  const sectionsOut = [];
  const partA = md.split('## A. Dil Kullanımı')[1].split('## B.')[0];
  const keyA = Object.fromEntries(
    [...partA.match(/\*\*Cevap anahtarı A:\*\*(.*)/)[1].matchAll(/(\d+)([a-c])/g)].map((m) => [Number(m[1]), m[2]])
  );
  const qA = [];
  for (const line of partA.split('\n')) {
    const m = /^(\d+)\. (.*)$/.exec(line.trim());
    if (!m) continue;
    const parts = unescape(m[2]).split(/\s*\(([a-c])\)\s*/);
    const prompt = parts[0];
    const options = [];
    for (let k = 1; k < parts.length; k += 2) options.push(parts[k + 1].trim());
    qA.push({ prompt, options, answer: 'abc'.indexOf(keyA[Number(m[1])]) });
  }
  sectionsOut.push({ title: 'A. Dil Kullanımı', questions: qA });

  const partB = md.split('## B. Dinleme')[1].split('## C.')[0];
  const qB = [];
  for (const row of toBlocks(partB).find((b) => b.t === 'table').rows) {
    const [, audio, question, opts, ans] = row;
    const parts = opts.split(/\s*\(([a-c])\)\s*/);
    if (parts.length < 3) continue; // map-based question needs a picture
    const options = [];
    for (let k = 1; k < parts.length; k += 2) options.push(parts[k + 1].trim());
    qB.push({ prompt: question, audio: audio.replace(/^"|"$/g, ''), options, answer: 'abc'.indexOf(ans.trim()) });
  }
  sectionsOut.push({ title: 'B. Dinleme', questions: qB });

  const partC = md.split('## C. Okuma')[1].split('## D.')[0];
  const keyLine = partC.match(/\*\*Cevap anahtarı C:\*\*(.*)/)[1].trim();
  const keyC = {};
  for (const m of keyLine.matchAll(/(\d+)\s*([a-c]|Doğru|Yanlış)/g)) keyC[Number(m[1])] = m[2];
  const passage = toBlocks(partC).find((b) => b.t === 'quote');
  const qC = [];
  for (const line of partC.split('\n')) {
    const m = /^(\d+)\. (.*)$/.exec(line.trim());
    if (!m) continue;
    const text = unescape(m[2]);
    const key = keyC[Number(m[1])];
    if (text.startsWith('Doğru / Yanlış:')) {
      qC.push({ prompt: text.replace('Doğru / Yanlış:', '').trim() + ' (Doğru / Yanlış)', options: ['Doğru', 'Yanlış'], answer: key === 'Doğru' ? 0 : 1 });
    } else {
      const parts = text.split(/\s*\(([a-c])\)\s*/);
      const options = [];
      for (let k = 1; k < parts.length; k += 2) options.push(parts[k + 1].trim());
      qC.push({ prompt: parts[0], options, answer: 'abc'.indexOf(key) });
    }
  }
  sectionsOut.push({ title: 'C. Okuma', passage: passage?.lines ?? [], questions: qC });
  return sectionsOut;
}
const exam = parseExam(src('A1_Icerik_Kilavuzu_7_Seviye_Sonu_Sinavi.md'));

const out = { level: 'A1', units, topics, words, exam };
const outPath = resolve(root, 'src/content/a1.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out));

const count = (kind) => Object.values(topics).filter((t) => t.kind === kind).length;
console.log(
  `units=${units.length} grammar=${count('grammar')} vocab=${count('vocab')} communication=${count('communication')} ` +
    `pronunciation=${count('pronunciation')} mistakes=${count('mistake')} words=${words.length} ` +
    `exercises=${Object.values(topics).reduce((n, t) => n + t.exercises.length, 0)} ` +
    `exam=${exam.map((s) => `${s.title}:${s.questions.length}`).join(', ')}`
);
const missing = units.flatMap((u) => u.codes.filter((c) => !topics[c]).map((c) => `Ü${u.no}:${c}`));
if (missing.length) console.warn('Eksik konu kodları:', missing.join(' '));
