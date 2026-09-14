import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { useStore } from './src/state/store';
import { isSupabaseConfigured } from './src/lib/supabase';

function AppShell() {
  const { colors, isDark } = useTheme();
  const bootStatus = useStore((s) => s.bootStatus);
  const bootError = useStore((s) => s.bootError);

  useEffect(() => {
    useStore.getState().init();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Supabase yapılandırılmamış</Text>
        <Text style={[styles.errorBody, { color: colors.textMuted }]}>
          Kök dizindeki .env dosyasını supabase/README.md'ye göre doldur.
        </Text>
      </View>
    );
  }

  if (bootStatus === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (bootStatus === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Bir şeyler ters gitti</Text>
        <Text style={[styles.errorBody, { color: colors.textMuted }]}>{bootError}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {bootStatus === 'auth' ? <AuthScreen /> : <RootNavigator />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorBody: {
    fontSize: 14,
    textAlign: 'center',
  },
});
