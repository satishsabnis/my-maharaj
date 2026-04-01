import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, gold, white, midGray } from '../theme/colors';

interface Festival {
  name: string;
  date: string;
  region: string;
  icon: string;
  adjustMeals: boolean;
  sattvic?: boolean;
}

// ─── Verified 2026 dates (cross-referenced DrikPanchang, TimeAndDate, IslamicFinder) ──
const INITIAL_FESTIVALS: Festival[] = [
  // PAST (as of March 27, 2026)
  { name: 'Eid al-Fitr',        date: '2026-03-20', region: 'All',                              icon: '', adjustMeals: false },
  { name: 'Ram Navami',         date: '2026-03-26', region: 'All India',                         icon: '', adjustMeals: true,  sattvic: true  },
  // UPCOMING
  { name: 'Baisakhi',          date: '2026-04-14', region: 'Punjab · Haryana',                  icon: '', adjustMeals: false },
  { name: 'Akshaya Tritiya',   date: '2026-04-19', region: 'All India',                         icon: '', adjustMeals: false },
  { name: 'Eid al-Adha',       date: '2026-05-27', region: 'All',                              icon: '', adjustMeals: false },
  { name: 'Guru Purnima',      date: '2026-07-29', region: 'All India',                         icon: '', adjustMeals: false, sattvic: true  },
  { name: 'Independence Day',  date: '2026-08-15', region: 'All India',                         icon: '', adjustMeals: false },
  { name: 'Raksha Bandhan',    date: '2026-08-28', region: 'North India',                       icon: '', adjustMeals: true,  sattvic: true  },
  { name: 'Janmashtami',       date: '2026-09-04', region: 'All India',                         icon: '', adjustMeals: true,  sattvic: true  },
  { name: 'Ganesh Chaturthi',  date: '2026-09-14', region: 'Maharashtra · Goa · Karnataka',    icon: '', adjustMeals: true,  sattvic: true  },
  { name: 'Navratri',          date: '2026-10-11', region: 'All India (9 days)',                icon: '', adjustMeals: true,  sattvic: true  },
  { name: 'Dussehra',          date: '2026-10-20', region: 'All India',                         icon: '', adjustMeals: false },
  { name: 'Diwali',            date: '2026-11-08', region: 'All India',                         icon: '', adjustMeals: true  },
  { name: 'Bhai Dooj',         date: '2026-11-10', region: 'North India',                       icon: '', adjustMeals: false },
  { name: 'Christmas',         date: '2026-12-25', region: 'All',                              icon: '', adjustMeals: false },
  { name: 'New Year',          date: '2027-01-01', region: 'All',                              icon: '', adjustMeals: false },
];

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(s: string): string {
  const d = parseLocalDate(s);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(s: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((parseLocalDate(s).getTime() - today.getTime()) / 86400000);
}

export default function FestivalsScreen() {
  const [festivals, setFestivals] = useState<Festival[]>(INITIAL_FESTIVALS);

  function toggle(idx: number, val: boolean) {
    setFestivals(prev => prev.map((f, i) => i === idx ? { ...f, adjustMeals: val } : f));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = festivals.filter(f => parseLocalDate(f.date) >= today);
  const past     = festivals.filter(f => parseLocalDate(f.date) <  today);

  function FestCard({ f, idx, isPastSection }: { f: Festival; idx: number; isPastSection: boolean }) {
    const days = daysUntil(f.date);
    const isPast   = days < 0;
    const isToday  = days === 0;
    const isSoon   = days > 0 && days <= 7;
    const globalIdx = isPastSection
      ? festivals.findIndex(x => x.name === f.name)
      : festivals.findIndex(x => x.name === f.name);

    return (
      <View style={[s.card, isPast && s.cardPast]}>
        <View style={s.iconWrap}>
          <Text style={s.icon}>{f.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.name, isPast && s.namePast]}>{f.name}</Text>
          <Text style={s.date}>{formatDate(f.date)}</Text>
          <Text style={s.region}>{f.region}</Text>
          {f.sattvic && !isPast && (
            <View style={s.sattvicTag}>
              <Text style={s.sattvicTxt}>Sattvic / fasting meals</Text>
            </View>
          )}
          {isToday && <View style={s.todayBadge}><Text style={s.todayBadgeTxt}>Today!</Text></View>}
          {isSoon  && <View style={s.soonBadge}><Text style={s.soonBadgeTxt}>In {days} day{days === 1 ? '' : 's'}</Text></View>}
        </View>
        {!isPast && (
          <View style={s.toggleWrap}>
            <TouchableOpacity style={s.planBtn} onPress={() => router.push({ pathname: '/meal-wizard', params: { festivalName: f.name, festivalDate: f.date, autoStart: 'true' } } as never)} activeOpacity={0.8}>
              <Text style={s.planBtnTxt}>Plan</Text>
            </TouchableOpacity>
            <Switch
              value={f.adjustMeals}
              onValueChange={v => toggle(globalIdx, v)}
              trackColor={{ false: '#D1D5DB', true: gold }}
              thumbColor={white}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ScreenWrapper title="Festivals & Functions">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionLabel}>UPCOMING</Text>
            {upcoming.map((f, i) => <FestCard key={f.name} f={f} idx={i} isPastSection={false} />)}
          </>
        )}
        {past.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>PAST</Text>
            {past.map((f, i) => <FestCard key={f.name} f={f} idx={i} isPastSection={true} />)}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll:       { padding: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: midGray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card:         { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardPast:     { opacity: 0.45 },
  iconWrap:     { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  icon:         { fontSize: 24 },
  name:         { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 2 },
  namePast:     { color: midGray },
  date:         { fontSize: 12, color: midGray, marginBottom: 2 },
  region:       { fontSize: 11, color: '#9CA3AF' },
  sattvicTag:   { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  sattvicTxt:   { fontSize: 11, color: '#166534', fontWeight: '600' },
  todayBadge:   { backgroundColor: gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  todayBadgeTxt:{ color: white, fontSize: 11, fontWeight: '700' },
  soonBadge:    { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  soonBadgeTxt: { color: navy, fontSize: 11, fontWeight: '600' },
  toggleWrap:   { alignItems: 'center', gap: 4 },
  toggleLabel:  { fontSize: 10, color: midGray, textAlign: 'center' },
  planBtn:      { backgroundColor: gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  planBtnTxt:   { fontSize: 11, fontWeight: '700', color: '#1B2A0C' },
});
