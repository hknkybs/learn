# Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur (ücretsiz plan yeterli).
2. Proje ayarlarından **Project URL** ve **anon public key**'i al → bunları kök dizindeki `.env` dosyasına yaz (`.env.example`'a bak).
3. **Settings → API → service_role key**'i al → bunu da `.env` dosyasına `SUPABASE_SERVICE_ROLE_KEY` olarak yaz. Bu anahtar RLS'i bypass eder, sadece `scripts/import-words.mjs` içinde ve **yalnızca kendi bilgisayarında** kullanılır — asla client koduna veya git'e girmemeli (`.gitignore` zaten `.env`'i hariç tutuyor).
4. Supabase Dashboard → **SQL Editor**'e git, [`schema.sql`](./schema.sql) dosyasının tamamını yapıştır ve çalıştır.
5. **Authentication → Providers → Email**'de "Email OTP" / "Confirm email" ayarlarının açık olduğundan emin ol.
6. **Authentication → Email Templates → Magic link or OTP** şablonunu aç. Varsayılan şablonda `{{ .Token }}` **yok** ve Supabase'in kendi (custom SMTP kurulmamış) e-posta gönderici ile bu şablon düzenlenemiyor — "Set up custom SMTP to edit templates" uyarısı çıkar. Bunu aşmak için:
   - Ücretsiz bir SMTP servisi kur ([Resend](https://resend.com) en hızlısı: kaydol → API Keys → yeni key oluştur).
   - Supabase'de **Authentication → Emails → SMTP Settings**'te custom SMTP'yi aç: Sender email `onboarding@resend.dev`, Host `smtp.resend.com`, Port `465`, Username `resend`, Password = Resend API key.
   - Not: `onboarding@resend.dev` domain doğrulaması istemez ama sadece Resend hesabını açtığın e-postaya gönderim yapar — kişisel/tek kullanıcılı bir uygulama için bu yeterli.
   - Kaydettikten sonra şablona geri dön, artık Body düzenlenebilir: sonuna `Or, enter this code: {{ .Token }}` ekle ve kaydet.
   - Not: Supabase bu kodu 6 değil **8 haneli** üretebiliyor; uygulamadaki kod giriş kutusu buna göre esnek bırakıldı (bkz. `src/screens/AuthScreen.tsx`).
7. Kelime bankasını yükle:

   ```bash
   node scripts/import-words.mjs data/seed-words.json
   ```

   Bu script `words`, `word_forms` ve `example_sentences` tablolarına upsert yapar (aynı `lemma` tekrar çalıştırıldığında güncellenir, çoğalmaz). Kendi kelimelerini eklemek için `data/seed-words.json` ile aynı formatta yeni bir JSON dosyası hazırlayıp script'e onun yolunu verebilirsin.

## Neden email OTP (magic link değil)?

Anonim oturum (bi-el-at'ta olduğu gibi) her cihazda farklı bir kullanıcı oluşturur — telefon ve bilgisayardan aynı ilerlemeyi görmek için uygun değil. Bunun yerine gerçek e-postanla (OTP kodu) giriş yapıyorsun; aynı hesap her cihazda aynı `user_id`'ye bağlanıyor ve `word_progress` verisi otomatik senkron oluyor. Deep-link/redirect URL ayarına gerek kalmadan mobilde çalışması için kod tabanlı doğrulama (magic link tıklamak yerine kodu girmek) kullanılıyor.
