import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Switch, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { navy, gold, white, midGray, lightGray } from '../theme/colors';

interface Festival {
  name: string;
  date: string;
  region: string;
  icon: string;
  adjustMeals: boolean;
}

const INITIAL_FESTIVALS: Festival[] = [
  { name: 'Ugadi / Gudi Padwa', date: '2026-03-19', region: 'Maharashtra · Karnataka · Andhra Pradesh', icon: '🪔', adjustMeals: true },
  { name: 'Eid al-Fitr',        date: '2026-03-31', region: 'All',                                      icon: '🌙', adjustMeals: false },
  { name: 'Ram Navami',         date: '2026-03-28', region: 'All India',                                icon: '🙏', adjustMeals: true },
  { name: 'Baisakhi',           date: '2026-04-13', region: 'Punjab · Haryana',                         icon: '🌾', adjustMeals: false },
  { name: 'Akshaya Tritiya',    date: '2026-04-28', region: 'All India',                                icon: '✨', adjustMeals: false },
  { name: 'Eid al-Adha',        date: '2026-06-06', region: 'All',                                      icon: '🌙', adjustMeals: false },
  { name: 'Guru Purnima',       date: '2026-07-03', region: 'All India',                                icon: '🙏', adjustMeals: false },
  { name: 'Independence Day',   date: '2026-08-15', region: 'All India',                                icon: '🇮🇳', adjustMeals: false },
  { name: 'Raksha Bandhan',     date: '2026-08-09', region: 'North India',                              icon: '🤝', adjustMeals: true },
  { name: 'Janmashtami',        date: '2026-08-16', region: 'All India',                                icon: '🦚', adjustMeals: true },
  { name: 'Ganesh Chaturthi',   date: '2026-08-25', region: 'Maharashtra · Goa · Karnataka',            icon: '🐘', adjustMeals: true },
  { name: 'Navratri',           date: '2026-10-13', region: 'All India (9 days)',                       icon: '🪔', adjustMeals: true },
  { name: 'Dussehra',           date: '2026-10-22', region: 'All India',                                icon: '🏹', adjustMeals: false },
  { name: 'Diwali',             date: '2026-10-30', region: 'All India',                                icon: '🎆', adjustMeals: true },
  { name: 'Bhai Dooj',          date: '2026-11-01', region: 'North India',                              icon: '🤝', adjustMeals: false },
  { name: 'Christmas',          date: '2026-12-25', region: 'All',                                      icon: '🎄', adjustMeals: false },
];

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatFestivalDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

export default function FestivalsScreen() {
  const [festivals, setFestivals] = useState<Festival[]>(INITIAL_FESTIVALS);

  function toggleAdjust(idx: number, value: boolean) {
    setFestivals((prev) => prev.map((f, i) => i === idx ? { ...f, adjustMeals: value } : f));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = festivals.filter((f) => new Date(f.date) >= today);
  const past = festivals.filter((f) => new Date(f.date) < today);

  function FestivalCard({ f, idx, showPast }: { f: Festival; idx: number; showPast: boolean }) {
    const days = daysUntil(f.date);
    const isPast = days < 0;
    const isToday = days === 0;
    const isSoon = days > 0 && days <= 7;

    return (
      <View style={[s.festCard, isPast && s.festCardPast]}>
        <View style={s.festIconWrap}>
          <Text style={s.festIcon}>{f.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.festName, isPast && s.festNamePast]}>{f.name}</Text>
          <Text style={s.festDate}>{formatFestivalDate(f.date)}</Text>
          <Text style={s.festRegion}>{f.region}</Text>
          {isToday && <View style={s.todayBadge}><Text style={s.todayBadgeText}>Today! 🎉</Text></View>}
          {isSoon && <View style={s.soonBadge}><Text style={s.soonBadgeText}>In {days} day{days === 1 ? '' : 's'}</Text></View>}
        </View>
        {!isPast && (
          <View style={s.toggleWrap}>
            <Text style={s.toggleLabel}>Adjust{'\n'}meals</Text>
            <Switch
              value={f.adjustMeals}
              onValueChange={(v) => toggleAdjust(showPast ? festivals.length - past.length + idx : idx, v)}
              trackColor={{ false: '#D1D5DB', true: gold }}
              thumbColor={white}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Festivals & Functions</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionHeader}>Upcoming</Text>
            {upcoming.map((f, i) => (
              <FestivalCard key={f.name} f={f} idx={i} showPast={false} />
            ))}
          </>
        )}
        {past.length > 0 && (
          <>
            <Text style={[s.sectionHeader, { marginTop: 24 }]}>Past</Text>
            {past.map((f, i) => (
              <FestivalCard key={f.name} f={f} idx={i} showPast />
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  scroll: { padding: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: midGray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  festCard: { backgroundColor: white, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  festCardPast: { opacity: 0.5 },
  festIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  festIcon: { fontSize: 24 },
  festName: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 2 },
  festNamePast: { color: midGray },
  festDate: { fontSize: 12, color: midGray, marginBottom: 2 },
  festRegion: { fontSize: 11, color: '#9CA3AF' },
  todayBadge: { backgroundColor: gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  todayBadgeText: { color: white, fontSize: 11, fontWeight: '700' },
  soonBadge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  soonBadgeText: { color: navy, fontSize: 11, fontWeight: '600' },
  toggleWrap: { alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: 10, color: midGray, textAlign: 'center' },
});
