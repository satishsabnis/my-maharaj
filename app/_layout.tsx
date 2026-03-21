import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { checkLipidExpiry, requestNotificationPermissions } from '../lib/notifications';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Request notification permissions and check lipid expiry on login
  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      await requestNotificationPermissions();
      await checkLipidExpiry(session.user.id);
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading) return;

    const currentRoute = segments[0] as string | undefined;
    const onAuthScreen =
      currentRoute === undefined ||
      currentRoute === 'index' ||
      currentRoute === 'login' ||
      currentRoute === 'signup';

    if (!session && !onAuthScreen) {
      router.replace('/');
    } else if (session && onAuthScreen) {
      router.replace('/home');
    }
  }, [session, loading]);

  return (
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
    </Stack>
  );
}
