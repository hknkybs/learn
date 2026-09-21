import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

export function AuthScreen() {
  const { colors } = useTheme();
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const signInWithEmail = useStore((s) => s.signInWithEmail);

  const [email, setEmail] = useState('');
  const canSubmit = email.includes('@') && !authLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Kelime Defteri</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Devam etmek için e-posta adresini gir.</Text>

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        placeholder="ornek@eposta.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => canSubmit && signInWithEmail(email)}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.6 }]}
        disabled={!canSubmit}
        onPress={() => signInWithEmail(email)}
      >
        <Text style={styles.buttonText}>{authLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</Text>
      </TouchableOpacity>

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
  error: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
