import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase, getSessionUser } from '../lib/supabase';
import { requestNotificationPermissions } from '../lib/notifications';
import Logo from '../components/Logo';
import { white } from '../theme/colors';
import { LanguageProvider } from '../lib/LanguageProvider';
import { initAnalytics, identifyUser, track } from '../lib/analytics';

// ─── One-time AsyncStorage → Supabase migration ─────────────────────────────

async function migrateAsyncStorageToSupabase() {
  try {
    const migrated = await AsyncStorage.getItem('supabase_migration_done');
    if (migrated === 'true') return;

    const user = await getSessionUser();
    if (!user) return;

    // Migrate menu_history → meal_plans
    const menuRaw = await AsyncStorage.getItem('menu_history');
    if (menuRaw) {
      try {
        const plans = JSON.parse(menuRaw);
        if (Array.isArray(plans) && plans.length > 0) {
          const rows = plans.map((p: any) => ({
            user_id: user.id,
            period_start: p.days?.[0]?.date || new Date().toISOString().split('T')[0],
            period_end: p.days?.[p.days.length - 1]?.date || new Date().toISOString().split('T')[0],
            date_range: p.dateRange || '',
            cuisine: 'Various',
            food_pref: 'veg',
            plan_json: { days: p.days || [] },
            generated_at: p.createdAt || new Date().toISOString(),
          }));
          await supabase.from('meal_plans').insert(rows);
        }
      } catch {}
    }

    // Migrate dish_feedback → dish_feedback
    const feedbackRaw = await AsyncStorage.getItem('dish_feedback');
    if (feedbackRaw) {
      try {
        const all: Record<string, any> = JSON.parse(feedbackRaw);
        const rows = Object.entries(all).map(([dishName, fb]) => ({
          user_id: user.id,
          dish_name: dishName,
          rating: fb.rating || 'ok',
          count: fb.count || 1,
          is_favourite: fb.isFavourite || false,
        }));
        if (rows.length > 0) {
          await supabase.from('dish_feedback').upsert(rows, { onConflict: 'user_id,dish_name' });
        }
      } catch {}
    }

    // Migrate meal_prep_tasks → meal_prep_tasks
    const prepRaw = await AsyncStorage.getItem('meal_prep_tasks');
    if (prepRaw) {
      try {
        const tasks = JSON.parse(prepRaw);
        if (Array.isArray(tasks) && tasks.length > 0) {
          const rows = tasks.map((t: any) => ({
            user_id: user.id,
            dish: t.dish,
            day: t.day,
            meal: t.meal,
            prep_type: t.prepType || t.prep_type || 'Soak',
            instruction: t.instruction,
            timing: t.timing,
            urgency: t.urgency || 'upcoming',
            done: t.done || false,
          }));
          await supabase.from('meal_prep_tasks').insert(rows);
        }
      } catch {}
    }

    await AsyncStorage.setItem('supabase_migration_done', 'true');
  } catch {
    // Never block app on migration failure
  }
}

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

  // Route notification taps to plan-summary inside meal-wizard
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      track('push_notification_tapped', {
        notification_id: response.notification.request.identifier,
        action_identifier: response.actionIdentifier,
      });
      router.push('/meal-wizard?step=plan-summary' as never);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void initAnalytics();
    requestNotificationPermissions();

    // Force logout check via API + session + profile check
    (async () => {
      try {
        const base = 'https://my-maharaj.vercel.app';
        const resp = await fetch(`${base}/api/invalidate-sessions`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        });
        const data = await resp.json();
        const storedVersion = await AsyncStorage.getItem('app_version');
        if (data.forceLogout && storedVersion !== data.version) {
          await supabase.auth.signOut();
          // Targeted clear — preserve all profile fields; only remove session/flow keys
          await AsyncStorage.multiRemove([
            'wizard_step', 'current_week_plan', 'confirmed_meal_plan',
            'partial_plan', 'onboarding_complete', 'maharaj_lang_set',
            'maharaj_plan_ready', 'meal_plan_date', 'menu_history',
            'dish_history', 'dish_feedback', 'supabase_migration_done',
          ]);
          await AsyncStorage.setItem('app_version', data.version);
          router.replace('/upgrade-splash');
          setLoading(false);
          return;
        }
      } catch {}

      // Session check
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (!sess) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(sess);
      identifyUser(sess.user.id, { email: sess.user.email });

      // Profile setup check
      const profileSetup = await AsyncStorage.getItem('profile_setup_complete');
      if (!profileSetup || profileSetup === 'false') {
        router.replace('/dietary-profile?firstSetup=true' as never);
        setLoading(false);
        return;
      }

      // One-time data migration (fire-and-forget, never blocks UI)
      void migrateAsyncStorageToSupabase();

      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentRoute = segments[0] as string | undefined;
    const isSplash = currentRoute === undefined || currentRoute === 'index';
    const onAuthScreen = isSplash || currentRoute === 'login' || currentRoute === 'signup' || currentRoute === 'upgrade-splash' || currentRoute === 'cook';
    const onLangScreen = currentRoute === 'language-select' || currentRoute === 'disclaimer';

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
        <ActivityIndicator color="#2E5480" style={{ marginTop: 24 }} />
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
      <Stack.Screen name="meal-wizard" options={{ gestureEnabled: false }} />
      <Stack.Screen name="outdoor-catering" />
      <Stack.Screen name="ask-maharaj" />
      <Stack.Screen name="order-out" />
      <Stack.Screen name="language-select" />
      <Stack.Screen name="my-fridge" />
      <Stack.Screen name="lab-report" />
      <Stack.Screen name="meal-prep" />
      <Stack.Screen name="disclaimer" />
      <Stack.Screen name="upgrade-splash" />
      <Stack.Screen name="about" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="family-recipes" />
      <Stack.Screen name="cook" options={{ headerShown: false }} />
    </Stack>
    </LanguageProvider>
  );
}
