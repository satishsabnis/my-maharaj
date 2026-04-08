import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { APP_VERSION } from '../constants/version';

const NAVY = '#2E5480';
const GOLD = '#C9A227';
const BODY = '#374151';

function Divider() {
  return <View style={{ height: 1, backgroundColor: GOLD, opacity: 0.3, marginVertical: 20 }} />;
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
      <View style={{ width: 8, height: 8, backgroundColor: NAVY, marginTop: 6 }} />
      <Text style={s.body}>{text}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const today = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const buildDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <ScreenWrapper title="About My Maharaj">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Spacer where logo was */}
        <View style={{ alignItems: 'center', marginBottom: 20 }} />

        {/* Section 1 — The Vision */}
        <Text style={s.heading}>The Vision</Text>
        <Text style={s.body}>
          My Maharaj is the world's first Cultural Health Intelligence Engine. We believe people of Indian origin across 195 countries deserve an AI that understands how they eat — not just what they eat.
        </Text>
        <Text style={[s.body, { marginTop: 10 }]}>
          Every dal in Maharashtra differs from dal in Punjab. Every family has its own health story. My Maharaj is built to understand both.
        </Text>

        <Divider />

        {/* Section 2 — What Maharaj Knows */}
        <Text style={s.heading}>What Maharaj Knows</Text>
        <BulletRow text="1,100+ authentic Indian dishes across 20+ regional cuisines" />
        <BulletRow text="Jain, vegetarian, non-vegetarian and fasting traditions — all respected" />
        <BulletRow text="Health adaptation: diabetic, PCOS, BP, cholesterol built in" />
        <BulletRow text="10 Indian languages supported" />
        <BulletRow text="Festival and fasting calendar intelligence" />
        <BulletRow text="Dubai grocery intelligence: Carrefour, Spinneys, Lulu" />

        <Divider />

        {/* Section 3 — Build Information */}
        <Text style={s.heading}>Build Information</Text>
        <View style={s.infoRow}><Text style={s.infoLabel}>Version</Text><Text style={s.infoValue}>{APP_VERSION}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Build date</Text><Text style={s.infoValue}>{buildDate}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Dish database</Text><Text style={s.infoValue}>1,106 authentic Indian dishes</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Web</Text><Text style={s.infoValue}>my-maharaj.vercel.app</Text></View>

        <Divider />

        {/* Section 4 — Legal */}
        <Text style={s.heading}>Legal</Text>
        <Text style={s.body}>
          My Maharaj meal plans are for informational purposes only and do not constitute medical advice. Always consult a qualified dietician or physician for health-specific dietary requirements.
        </Text>
        <Text style={[s.legal, { marginTop: 20 }]}>
          {'\u00A9'} 2026 Blue Flute Consulting LLC-FZ. All rights reserved.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 },
  heading: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 12 },
  body: { fontSize: 14, color: BODY, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(27,58,92,0.08)' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: NAVY },
  legal: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
});
