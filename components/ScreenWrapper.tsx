import React from 'react';
import {
  Image, ImageBackground, Platform, SafeAreaView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { navy, gold, white, textSec, border } from '../theme/colors';

interface Props {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  showHome?: boolean;
  rightElement?: React.ReactNode;
}

export default function ScreenWrapper({
  title,
  children,
  onBack,
  showHome = true,
  rightElement,
}: Props) {
  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={s.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={s.safe}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={onBack ?? (() => router.back())}
            style={s.backBtn}
          >
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.title} numberOfLines={1}>{title}</Text>

          <View style={s.headerRight}>
            {rightElement}
            <Image
              source={require('../assets/blueflute-logo.png')}
              style={s.bfLogo}
              resizeMode="contain"
            />
            {showHome && (
              <TouchableOpacity
                onPress={() => router.push('/home' as never)}
                style={s.homeBtn}
              >
                <Text style={s.homeTxt}>🏠</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Content ── */}
        <View style={s.content}>
          {children}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Image
            source={require('../assets/blueflute-logo.png')}
            style={s.footerLogo}
            resizeMode="contain"
          />
          <Text style={s.footerTxt}>Blue Flute Consulting LLC-FZ</Text>
          <Text style={s.footerUrl}>www.bluefluteconsulting.com</Text>
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg:   { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27,58,92,0.1)',
  },
  backBtn:  { paddingRight: 8, minWidth: 64 },
  backTxt:  { fontSize: 15, color: navy, fontWeight: '600' },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: navy,
    textAlign: 'center',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 64,
    justifyContent: 'flex-end',
  },
  bfLogo:  { width: 72, height: 28 },
  homeBtn: { padding: 4 },
  homeTxt: { fontSize: 20 },

  content: { flex: 1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(27,58,92,0.08)',
  },
  footerLogo: { width: 56, height: 20 },
  footerTxt:  { fontSize: 10, color: textSec, fontWeight: '600' },
  footerUrl:  { fontSize: 10, color: '#1A6B5C', fontWeight: '500' },
});
