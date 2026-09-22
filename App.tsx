import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_400Regular_Italic,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexSerif_700Bold } from '@expo-google-fonts/ibm-plex-serif';
import { androidChannelSetup } from './src/lib/notifications';
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
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_400Regular_Italic,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexSerif_700Bold,
  });

  useEffect(() => {
    androidChannelSetup();
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

  if (bootStatus === 'loading' || !fontsLoaded) {
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
