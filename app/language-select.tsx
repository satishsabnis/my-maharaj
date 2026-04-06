import React, { useState } from 'react';
import {
  ImageBackground, SafeAreaView, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Image, Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { navy, gold, white, textSec, border } from '../theme/colors';

// ─── All Languages ────────────────────────────────────────────────────────────

const INDIAN_LANGUAGES = [
  { code: 'as', name: 'Assamese',  native: 'অসমীয়া' },
  { code: 'bn', name: 'Bengali',   native: 'বাংলা' },
  { code: 'bho',name: 'Bhojpuri',  native: 'भोजपुरी' },
  { code: 'doi',name: 'Dogri',     native: 'डोगरी' },
  { code: 'en', name: 'English',   native: 'English' },
  { code: 'gu', name: 'Gujarati',  native: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi',     native: 'हिन्दी' },
  { code: 'kn', name: 'Kannada',   native: 'ಕನ್ನಡ' },
  { code: 'ks', name: 'Kashmiri',  native: 'کشمیری' },
  { code: 'kok',name: 'Konkani',   native: 'कोंकणी' },
  { code: 'mai',name: 'Maithili',  native: 'मैथिली' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mni',name: 'Manipuri',  native: 'মৈতৈলোন্' },
  { code: 'mr', name: 'Marathi',   native: 'मराठी' },
  { code: 'ne', name: 'Nepali',    native: 'नेपाली' },
  { code: 'or', name: 'Odia',      native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi',   native: 'ਪੰਜਾਬੀ' },
  { code: 'sa', name: 'Sanskrit',  native: 'संस्कृतम्' },
  { code: 'sat',name: 'Santali',   native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd', name: 'Sindhi',    native: 'سنڌي' },
  { code: 'ta', name: 'Tamil',     native: 'தமிழ்' },
  { code: 'te', name: 'Telugu',    native: 'తెలుగు' },
  { code: 'ur', name: 'Urdu',      native: 'اردو' },
];

const INTERNATIONAL_LANGUAGES = [
  { code: 'ar', name: 'Arabic',      native: 'العربية' },
  { code: 'zh', name: 'Chinese',     native: '中文' },
  { code: 'nl', name: 'Dutch',       native: 'Nederlands' },
  { code: 'fr', name: 'French',      native: 'Français' },
  { code: 'de', name: 'German',      native: 'Deutsch' },
  { code: 'id', name: 'Indonesian',  native: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian',     native: 'Italiano' },
  { code: 'ja', name: 'Japanese',    native: '日本語' },
  { code: 'ko', name: 'Korean',      native: '한국어' },
  { code: 'ms', name: 'Malay',       native: 'Bahasa Melayu' },
  { code: 'fa', name: 'Persian',     native: 'فارسی' },
  { code: 'pt', name: 'Portuguese',  native: 'Português' },
  { code: 'ru', name: 'Russian',     native: 'Русский' },
  { code: 'es', name: 'Spanish',     native: 'Español' },
  { code: 'sw', name: 'Swahili',     native: 'Kiswahili' },
  { code: 'tl', name: 'Tagalog',     native: 'Filipino' },
  { code: 'th', name: 'Thai',        native: 'ภาษาไทย' },
  { code: 'tr', name: 'Turkish',     native: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese',  native: 'Tiếng Việt' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LanguageSelectScreen() {
  const [selected, setSelected] = useState('en');
  const [saving,   setSaving]   = useState(false);

  async function confirm() {
    setSaving(true);
    try {
      const user = await getSessionUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          app_language: selected,
        }, { onConflict: 'id' });
      }
      // Store locally too for immediate use
      await AsyncStorage.setItem('app_language', selected);
      await AsyncStorage.setItem('maharaj_lang_set', 'true');
    } catch (e) {
      console.error('Language save error:', e);
    } finally {
      setSaving(false);
      router.replace('/home');
    }
  }

  function LangPill({ code, name, native }: { code: string; name: string; native: string }) {
    const active = selected === code;
    return (
      <TouchableOpacity
        style={[s.pill, active && s.pillActive]}
        onPress={() => setSelected(code)}
        activeOpacity={0.8}
      >
        <Text style={[s.pillNative, active && s.pillNativeActive]}>{native}</Text>
        <Text style={[s.pillName, active && s.pillNameActive]}>{name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
          {/* English toggle always visible */}
          <TouchableOpacity
            style={[s.engToggle, selected === 'en' && s.engToggleActive]}
            onPress={() => setSelected('en')}
          >
            <Text style={[s.engToggleTxt, selected === 'en' && s.engToggleTxtActive]}>English</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <Text style={s.title}>Welcome to My Maharaj</Text>
          <Text style={s.subtitle}>Choose your preferred language · अपनी भाषा चुनें</Text>

          {/* Indian Languages */}
          <Text style={s.groupLabel}>Indian Languages</Text>
          <View style={s.grid}>
            {INDIAN_LANGUAGES.map((l) => (
              <LangPill key={l.code} {...l} />
            ))}
          </View>

          {/* International Languages */}
          <Text style={[s.groupLabel, { marginTop: 20 }]}>International Languages</Text>
          <View style={s.grid}>
            {INTERNATIONAL_LANGUAGES.map((l) => (
              <LangPill key={l.code} {...l} />
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[s.confirmBtn, saving && { opacity: 0.6 }]}
            onPress={confirm}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={s.confirmTxt}>
              {saving ? 'Saving...' : `Continue in ${INDIAN_LANGUAGES.find(l => l.code === selected)?.name ?? INTERNATIONAL_LANGUAGES.find(l => l.code === selected)?.name ?? 'English'} →`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={() => { AsyncStorage.setItem('maharaj_lang_set', 'true'); router.replace('/home'); }} activeOpacity={0.7}>
            <Text style={s.skipTxt}>Skip — use English</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={s.footer}>
            <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogo} resizeMode="contain" />
            <Text style={s.footerTxt}>Blue Flute Consulting LLC-FZ  |  www.bluefluteconsulting.com</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 16 : 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(27,58,92,0.1)',
  },
  logo:          { width: 180, height: 60 },
  engToggle:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: 'rgba(255,255,255,0.9)' },
  engToggleActive:{ backgroundColor: navy, borderColor: navy },
  engToggleTxt:  { fontSize: 13, color: navy, fontWeight: '600' },
  engToggleTxtActive: { color: white, fontWeight: '700' },

  scroll: { padding: 16, paddingBottom: 48 },

  title:    { fontSize: 26, fontWeight: '800', color: navy, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, color: textSec, textAlign: 'center', marginBottom: 24, lineHeight: 22 },

  groupLabel: { fontSize: 13, fontWeight: '700', color: navy, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },

  pill: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: border,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center', minWidth: 90,
  },
  pillActive:      { backgroundColor: navy, borderColor: navy },
  pillNative:      { fontSize: 15, fontWeight: '700', color: navy },
  pillNativeActive:{ color: gold },
  pillName:        { fontSize: 10, color: textSec, marginTop: 2 },
  pillNameActive:  { color: 'rgba(255,255,255,0.7)' },

  confirmBtn: {
    backgroundColor: navy, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    marginTop: 28, marginBottom: 20,
    shadowColor: navy, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  confirmTxt: { color: gold, fontSize: 16, fontWeight: '800' },

  skipBtn:  { alignItems: 'center', paddingVertical: 12 },
  skipTxt:  { fontSize: 14, color: textSec, fontWeight: '500' },

  footer:   { alignItems: 'center', paddingTop: 8 },
  bfLogo:   { width: 80, height: 28, marginBottom: 6 },
  footerTxt:{ fontSize: 10, color: textSec, textAlign: 'center' },
});
