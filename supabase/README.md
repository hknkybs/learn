# Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur (ücretsiz plan yeterli).
2. Proje ayarlarından **Project URL** ve **anon public key**'i al → bunları kök dizindeki `.env` dosyasına yaz (`.env.example`'a bak).
3. **Settings → API → service_role key**'i al → bunu da `.env` dosyasına `SUPABASE_SERVICE_ROLE_KEY` olarak yaz. Bu anahtar RLS'i bypass eder, sadece `scripts/import-words.mjs` içinde ve **yalnızca kendi bilgisayarında** kullanılır — asla client koduna veya git'e girmemeli (`.gitignore` zaten `.env`'i hariç tutuyor).
4. Supabase Dashboard → **SQL Editor**'e git, [`schema.sql`](./schema.sql) dosyasının tamamını yapıştır ve çalıştır.
5. **Authentication → Sign In / Providers → Email**'de **Confirm email**'i kapat. Uygulama tek adımlı e-posta girişi kullanıyor (kod/şifre yok): kayıtlıysa giriş yapar, değilse hesabı oluşturur. Onay açık kalırsa yeni kayıtlar oturum açamaz. SMTP/şablon ayarına gerek yok.
6. Daha önce OTP ile açılmış bir hesabın varsa (şifresi yoktur), verini kaybetmeden giriş yapabilmesi için bir kere çalıştır:

   ```bash
   node scripts/set-email-password.mjs eposta@ornek.com
   ```

7. Kelime bankasını yükle:

   ```bash
   node scripts/import-words.mjs data/seed-words.json
   ```

   Bu script `words`, `word_forms` ve `example_sentences` tablolarına upsert yapar (aynı `lemma` tekrar çalıştırıldığında güncellenir, çoğalmaz). Kendi kelimelerini eklemek için `data/seed-words.json` ile aynı formatta yeni bir JSON dosyası hazırlayıp script'e onun yolunu verebilirsin.

## Giriş modeli

E-posta adresi yeterli: uygulama şifreyi e-postadan türetiyor (`src/lib/auth.ts`). Yani e-postayı bilen herkes o hesaba girebilir — kişisel/tek kullanıcılı bir uygulama için bilinçli bir tercih. Aynı e-postayla her cihazda aynı `user_id`'ye bağlanıldığı için ilerleme senkron kalıyor.
