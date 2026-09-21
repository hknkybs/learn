# Kelime dosyası formatı

[`words-template.json`](./words-template.json) örnek dosyadır: bir kelime = dizideki bir nesne. Kopyalayıp doldur, sonra:

```bash
node scripts/import-words.mjs data/kelimelerim.json --check   # sadece doğrula, yükleme
node scripts/import-words.mjs data/kelimelerim.json           # Supabase'e yükle
```

Aynı `lemma` tekrar yüklenirse güncellenir, çoğalmaz. Yükleme kelime kataloğunu değiştirir, ilerleme verine dokunmaz.

## Alanlar

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `lemma` | evet | Kelimenin sözlük hâli (`achieve`, `give up`). Benzersiz olmalı. |
| `partOfSpeech` | evet | `verb`, `noun`, `adjective`, `adverb`, `phrase`, `other` |
| `translationTr` | evet | Türkçe karşılık (virgülle birden fazla yazılabilir) |
| `frequencyScore` | önerilir | 1-5. **1 = en sık kullanılan**, 5 = en nadir. Haftalık liste seçiminde %40/30/15/10/5 oranıyla dağıtılır. Yazılmazsa 3 olur. |
| `cefr` | hayır | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` |
| `ipa` | hayır | Telaffuz, ör. `/əˈtʃiːv/` |
| `nuanceTr` | hayır | "Türkçe konuşana not": tipik hatalar, yanlış dostlar, edat/yapı tuzakları |
| `forms` | hayır | Hâl listesi (aşağıda). Yoksa `[]` yaz. |
| `examples` | hayır | Zamana göre örnek cümleler (aşağıda) |

## `forms` — `{ "formType": "...", "text": "..." }`

- Fiil: `base`, `third_person_singular`, `past_simple`, `past_participle`, `gerund`
- İsim: `singular`, `plural`
- Sıfat: `comparative`, `superlative` (uzun sıfatlar için `more reliable` gibi)

## `examples` — `{ "tense": "...", "textEn": "...", "textTr": "..." }`

`tense` değerleri: `present_simple` (geniş), `present_continuous` (şimdiki), `past_simple` (geçmiş), `future` (gelecek), `general` (zamansız).

- **Fiiller** için dördünü de yaz: uygulamadaki dört zaman kartı bunlardan oluşur.
- Sıfat/isimlerde şimdiki zaman doğal olmuyorsa atla; eksik zaman için kart gösterilmez.
- Cümlede kelimenin çekimli hâli geçerse (`achieves`, `achieved`) uygulama onu otomatik kalın gösterir; bunun için `forms` doldurulmuş olmalı.
- Aynı `tense` için birden fazla cümle yazma; uygulama ilkini gösterir.

## İpuçları

- JSON'da yorum yazılamaz; metinde çift tırnak yerine tek tırnak kullan (`'başarmak'`) ya da `\"` ile kaçır.
- Dosyayı kaydetmeden önce `--check` ile doğrula; hataları satır satır kelimeyle birlikte listeler.
