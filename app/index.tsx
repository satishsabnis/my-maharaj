import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { gold, textSec, white } from '../theme/colors';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <Logo size="large" />
          <Text style={s.devanagari}>मेरा महाराज · माझा महाराज · માઇ મહારાજ</Text>
          <Text style={s.tagSub}>Your personal kitchen planner</Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={s.actions}>
          <Button title="Create Account" onPress={() => router.push('/signup')} variant="primary" />
          <View style={{ height: 12 }} />
          <Button title="Sign In" onPress={() => router.push('/login')} variant="outline" />
          <Text style={s.legal}>
            By continuing you agree to our Terms and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: white },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },

  logoWrap:   { alignItems: 'center', marginTop: 0 },
  devanagari: { fontSize: 16, color: gold, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  tagSub:     { fontSize: 14, color: textSec, textAlign: 'center', marginTop: 4 },

  actions: { width: '100%' },
  legal:   { fontSize: 11, color: textSec, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
