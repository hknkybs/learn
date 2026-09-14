# Kelime Defteri

Kişisel İngilizce kelime öğrenme uygulaması. Her kelime için Türkçe karşılık, Türkçe konuşana özel nüans notu, fiil/isim/sıfat hâlleri ve dört zamanda (geniş, şimdiki, geçmiş, gelecek) örnek cümle içerir; aralıklı tekrar (spaced repetition) ile "yeni / öğreniyorum / biliyorum" durumunu takip eder.

Expo (React Native) + TypeScript + Supabase ile yazıldı; telefon ve bilgisayardan aynı hesapla (e-posta OTP girişi) çalışır.

## Kurulum

```bash
npm install
```

1. Supabase kurulumu için [`supabase/README.md`](./supabase/README.md)'yi takip et (yeni proje, `.env`, şema, kelime içe aktarma).
2. Uygulamayı çalıştır:

   ```bash
   npm run ios      # veya
   npm run android  # veya
   npm run web
   ```

## Proje yapısı

- `src/screens` — Giriş, Ana Sayfa, Kelime Listesi, Kelime Detayı, Tekrar (Review), Ayarlar
- `src/state/store.ts` — auth + kelime kataloğu + ilerleme durumu (zustand)
- `src/lib/srs.ts` — aralıklı tekrar zamanlama mantığı
- `supabase/schema.sql` — veritabanı şeması ve RLS kuralları
- `data/seed-words.json` — kelime bankası (bkz. aynı formatta kendi kelimelerini eklemek için)
- `scripts/import-words.mjs` — JSON kelime bankasını Supabase'e yükleyen script

## Kendi kelimelerini eklemek

`data/seed-words.json` ile aynı formatta bir dosya hazırla (veya bu dosyaya ekle), sonra:

```bash
npm run import-words -- data/seed-words.json
```
