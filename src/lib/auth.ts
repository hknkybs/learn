// Email-only login: the password is derived from the email, so knowing the
// email is enough to sign in. Acceptable for this personal, single-user app;
// keep in sync with scripts/set-email-password.mjs.
export function derivedPassword(email: string): string {
  return `kelime-defteri::${email.trim().toLowerCase()}`;
}
