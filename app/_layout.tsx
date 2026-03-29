import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { white } from '../theme/colors';
import { LanguageProvider } from '../lib/LanguageProvider';

// ─── Fix browser back button exiting the app on web ──────────────────────────

function useBrowserBackGuard() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.history.pushState(null, '', window.location.href);
    const handler = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const router   = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useBrowserBackGuard();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentRoute = segments[0] as string | undefined;
    const isSplash = currentRoute === undefined || currentRoute === 'index';
    const onAuthScreen = isSplash || currentRoute === 'login' || currentRoute === 'signup';
    const onLangScreen = currentRoute === 'language-select';

    // Let splash screen handle its own navigation
    if (isSplash) return;

    // Protect authenticated routes
    if (!session && !onAuthScreen && !onLangScreen) {
      router.replace('/login');
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: white, alignItems: 'center', justifyContent: 'center' }}>
        <Logo size="large" />
        <ActivityIndicator color="#1B3A5C" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <LanguageProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="home" />
      <Stack.Screen name="dietary-profile" />
      <Stack.Screen name="festivals" />
      <Stack.Screen name="party-menu" />
      <Stack.Screen name="cuisine-selection" />
      <Stack.Screen name="table-etiquettes" />
      <Stack.Screen name="traditional-plating" />
      <Stack.Screen name="menu-history" />
      <Stack.Screen name="meal-wizard" />
      <Stack.Screen name="outdoor-catering" />
      <Stack.Screen name="ask-maharaj" />
      <Stack.Screen name="order-out" />
      <Stack.Screen name="language-select" />
      <Stack.Screen name="my-fridge" />
      <Stack.Screen name="lab-report" />
      <Stack.Screen name="meal-prep" />
    </Stack>
    </LanguageProvider>
  );
}
