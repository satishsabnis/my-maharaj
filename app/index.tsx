import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { DISCLAIMER_VERSION } from '../lib/constants';
import { navy, white } from '../theme/colors';

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    // Fade in (1s), hold (4s), fade out (1s)
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start(async () => {
      if (navigated) return;
      setNavigated(true);

      // Always check disclaimer first (versioned key)
      const disclaimerAccepted = await AsyncStorage.getItem('maharaj_disclaimer_v' + DISCLAIMER_VERSION);

      if (!disclaimerAccepted) {
        router.replace('/disclaimer');
        return;
      }

      // Wait for AsyncStorage-backed Supabase session to hydrate
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) { session = data.session; break; }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!session) {
        router.replace('/login');
        return;
      }

      // Check language set
      const langSet = await AsyncStorage.getItem('maharaj_lang_set');

      if (!langSet) {
        router.replace('/language-select');
      } else {
        router.replace('/home');
      }
    });
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Animated.View style={[s.content, { opacity }]}>
          <Image
            source={require('../assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.title}>My Maharaj</Text>
          <Text style={s.subtitle}>Your personal kitchen planner</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: white },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:   { alignItems: 'center' },
  logo:      { width: 240, height: 100, marginBottom: 16 },
  title:     { fontSize: 28, fontWeight: '800', color: navy, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: '#5A7A8A', fontWeight: '500' },
});
