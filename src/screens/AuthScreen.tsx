import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

export function AuthScreen() {
  const { colors } = useTheme();
  const otpEmail = useStore((s) => s.otpEmail);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const sendOtp = useStore((s) => s.sendOtp);
  const verifyOtp = useStore((s) => s.verifyOtp);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingAction, setPendingAction] = useState<'send' | 'verify' | null>(null);

  async function handleSendOtp(targetEmail: string) {
    setPendingAction('send');
    await sendOtp(targetEmail);
    setPendingAction(null);
  }

  async function handleVerifyOtp() {
    setPendingAction('verify');
    await verifyOtp(code);
    setPendingAction(null);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Kelime Defteri</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {otpEmail
          ? `${otpEmail} adresine gönderilen kodu gir.`
          : 'Devam etmek için e-posta adresini gir.'}
      </Text>

      {!otpEmail ? (
        <>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="ornek@eposta.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, opacity: authLoading || !email ? 0.6 : 1 }]}
            disabled={authLoading || !email}
            onPress={() => handleSendOtp(email)}
          >
            <Text style={styles.buttonText}>{pendingAction === 'send' ? 'Gönderiliyor...' : 'Kod Gönder'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Kod"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={12}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, opacity: authLoading || code.length < 4 ? 0.6 : 1 }]}
            disabled={authLoading || code.length < 4}
            onPress={handleVerifyOtp}
          >
            <Text style={styles.buttonText}>{pendingAction === 'verify' ? 'Doğrulanıyor...' : 'Giriş Yap'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => handleSendOtp(email)} disabled={authLoading}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {pendingAction === 'send' ? 'Gönderiliyor...' : 'Kodu tekrar gönder'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {authError ? <Text style={[styles.error, { color: colors.danger }]}>{authError}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  linkButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontWeight: '600',
  },
  error: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
