import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy } from '../theme/colors';

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = async () => {
      // Fade in
      await new Promise<void>(resolve =>
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => resolve())
      );
      // Hold for 3 seconds
      await new Promise<void>(resolve => setTimeout(resolve, 3000));
      // Fade out
      await new Promise<void>(resolve =>
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => resolve())
      );
      // Route — Supabase profile_completed is the sole source of truth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, profile_completed')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!profileRow) {
        router.replace('/onboarding');
        return;
      }
      if (profileRow.profile_completed) {
        router.replace('/home');
        return;
      }
      router.replace('/onboarding');
    };
    run();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <Animated.View style={{ flex: 1, opacity, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>My Maharaj</Text>
        <Text style={s.subtitle}>Your personal meal planner</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  logo:     { width: 160, height: 160, marginBottom: 16 },
  title:    { fontSize: 28, fontWeight: '800', color: navy, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5A7A8A', fontWeight: '500' },
});
