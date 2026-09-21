// One-off: gives an existing OTP-created user the derived password used by the
// email-only login (see src/lib/auth.ts), so their data stays reachable.
// Usage: node scripts/set-email-password.mjs you@example.com

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf-8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email) {
  console.error('Kullanım: node scripts/set-email-password.mjs eposta@ornek.com');
  process.exit(1);
}

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;

const user = data.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error('Kullanıcı bulunamadı:', email);
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password: `kelime-defteri::${email}`,
  email_confirm: true,
});
if (updateError) throw updateError;
console.log('Şifre ayarlandı:', email, user.id);
