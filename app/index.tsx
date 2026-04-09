import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      // Route
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const langSet = await AsyncStorage.getItem('maharaj_lang_set');
      if (!langSet) {
        router.replace('/language-select');
        return;
      }
      const onboardingDone = await AsyncStorage.getItem('onboarding_complete');
      if (!onboardingDone) {
        router.replace('/onboarding');
        return;
      }
      router.replace('/home');
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
