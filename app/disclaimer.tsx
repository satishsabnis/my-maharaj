import React, { useEffect, useState } from 'react';
import { BackHandler, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { navy, gold, white, textSec, border } from '../theme/colors';

const SECTIONS = [
  {
    title: 'Privacy Policy',
    body: 'We collect only data you provide. Your personal data, family health information and meal preferences are stored securely and never shared with third parties.',
  },
  {
    title: 'Data Security',
    body: 'All data is encrypted and stored on secure servers. We are not responsible for data loss due to device failure or account deletion.',
  },
  {
    title: 'Health Disclaimer',
    body: 'Meal suggestions are for informational purposes only. Always consult a qualified nutritionist or doctor before making dietary changes based on health conditions.',
  },
  {
    title: 'Terms of Use',
    body: 'By using My Maharaj you agree to use it for personal household meal planning only. Commercial use requires a separate license.',
  },
  {
    title: 'Lab Report Disclaimer',
    body: 'Lab report analysis is AI-generated and indicative only. It does not constitute medical advice. Always consult your doctor.',
  },
];

export default function DisclaimerScreen() {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = window.localStorage?.getItem('maharaj_disclaimer_accepted');
      if (accepted) setViewOnly(true);
    }
  }, []);

  function accept() {
    setAccepting(true);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('maharaj_disclaimer_accepted', 'true');
    }
    const langSet = typeof window !== 'undefined' ? window.localStorage?.getItem('maharaj_lang_set') : null;
    if (langSet) {
      router.replace('/home');
    } else {
      router.replace('/language-select');
    }
  }

  function exitApp() {
    if (Platform.OS === 'web') {
      window.close();
    } else {
      BackHandler.exitApp();
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>Terms & Disclaimers</Text>
        <Text style={s.subtitle}>Please read and accept before continuing</Text>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.card}>
            <Text style={s.cardTitle}>{sec.title}</Text>
            <Text style={s.cardBody}>{sec.body}</Text>
          </View>
        ))}

        {viewOnly ? (
          <TouchableOpacity style={s.acceptBtn} onPress={() => router.back()} activeOpacity={0.88}>
            <Text style={s.acceptTxt}>Close</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={s.acceptBtn} onPress={accept} disabled={accepting} activeOpacity={0.88}>
              <Text style={s.acceptTxt}>{accepting ? 'Please wait...' : 'I Agree & Continue'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.exitBtn} onPress={exitApp} activeOpacity={0.7}>
              <Text style={s.exitTxt}>Exit App</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: white },
  scroll:   { padding: 24, paddingBottom: 48 },
  logo:     { width: 180, height: 60, alignSelf: 'center', marginBottom: 16, marginTop: 8 },
  title:    { fontSize: 24, fontWeight: '800', color: navy, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: textSec, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  card:     { backgroundColor: '#F8FAFB', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border },
  cardTitle:{ fontSize: 15, fontWeight: '700', color: navy, marginBottom: 6 },
  cardBody: { fontSize: 14, color: textSec, lineHeight: 22 },
  acceptBtn:{ backgroundColor: navy, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  acceptTxt:{ color: gold, fontSize: 16, fontWeight: '800' },
  exitBtn:  { borderWidth: 1.5, borderColor: border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  exitTxt:  { color: textSec, fontSize: 14, fontWeight: '600' },
});
