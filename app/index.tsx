import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
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

      // Always check disclaimer first
      const disclaimerAccepted = await AsyncStorage.getItem('maharaj_disclaimer_accepted');

      if (!disclaimerAccepted) {
        router.replace('/disclaimer');
        return;
      }

      // Small delay to let AsyncStorage-backed Supabase session hydrate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check auth state
      const { data: { session } } = await supabase.auth.getSession();

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
    <ImageBackground source={require('../assets/background.png')} style={{flex:1,width:'100%'}} resizeMode="cover">
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
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:   { alignItems: 'center' },
  logo:      { width: 240, height: 100, marginBottom: 16 },
  title:     { fontSize: 28, fontWeight: '800', color: navy, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: '#5A7A8A', fontWeight: '500' },
});
