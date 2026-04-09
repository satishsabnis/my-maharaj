import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { navy } from '../theme/colors';

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(async () => {
      if (navigated) return;
      setNavigated(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      const langSet = await AsyncStorage.getItem('maharaj_lang_set');
      if (!langSet) { router.replace('/language-select'); return; }
      const onboardingDone = await AsyncStorage.getItem('onboarding_complete');
      if (!onboardingDone) { router.replace('/onboarding'); } else { router.replace('/home'); }
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <Animated.View style={[s.content, { opacity }]}>
          <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>My Maharaj</Text>
          <Text style={s.subtitle}>Your personal meal planner</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  content:  { alignItems: 'center' },
  logo:     { width: 240, height: 100, marginBottom: 16 },
  title:    { fontSize: 28, fontWeight: '800', color: navy, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5A7A8A', fontWeight: '500' },
});
