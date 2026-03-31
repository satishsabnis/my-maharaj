import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Image, ImageBackground, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity,
  useWindowDimensions, View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { loadOrDetectLocation } from '../lib/location';
import { TICKER_TEXT } from '../lib/constants';
import { useLang } from '../lib/LanguageProvider';
import { navy, gold, white, textSec, border, mint } from '../theme/colors';
import { presentMemberIds } from './who-is-home';

// ─── Festival data ────────────────────────────────────────────────────────────

const FESTIVALS = [
  { name: 'Baisakhi',         date: '2026-04-14' },
  { name: 'Akshaya Tritiya',  date: '2026-04-19' },
  { name: 'Eid al-Adha',      date: '2026-05-27' },
  { name: 'Guru Purnima',     date: '2026-07-29' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan',   date: '2026-08-28' },
  { name: 'Janmashtami',      date: '2026-09-04' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14' },
  { name: 'Navratri',         date: '2026-10-11' },
  { name: 'Dussehra',         date: '2026-10-20' },
  { name: 'Diwali',           date: '2026-11-08' },
  { name: 'Bhai Dooj',        date: '2026-11-10' },
  { name: 'Christmas',        date: '2026-12-25' },
  { name: 'New Year',         date: '2027-01-01' },
];

function getNextFestival() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const [y, m, d] = f.date.split('-').map(Number);
    const fd = new Date(y, m - 1, d);
    if (fd >= today) {
      return { name: f.name, daysAway: Math.ceil((fd.getTime() - today.getTime()) / 86400000) };
    }
  }
  return null;
}

// ─── DateTime ─────────────────────────────────────────────────────────────────

const WDAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDate(d: Date): string {
  return `${WDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ─── Quick grid cards ─────────────────────────────────────────────────────────

const QUICK_CARDS = [
  { icon: '\uD83E\uDD58', label: 'Meal Prep',         route: '/meal-prep',         accent: '#1A6B5C' },
  { icon: '\uD83C\uDF89', label: 'Party Menu',        route: '/party-menu',        accent: '#8B1A1A' },
  { icon: '\uD83C\uDFD5\uFE0F', label: 'Outdoor',    route: '/outdoor-catering',  accent: '#1A6B5C' },
  { icon: '\uD83E\uDDCA', label: 'My Fridge',         route: '/my-fridge',         accent: '#0369A1' },
  { icon: '\uD83C\uDF7D\uFE0F', label: 'Dining',     route: '/dining-plating',    accent: '#C9A227' },
  { icon: '\uD83D\uDCCB', label: 'History',           route: '/menu-history',      accent: '#6A1B9A' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FamilyMember { id: string; name: string; }

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { lang, isEnglish, toggleEnglish } = useLang();

  const [firstName,    setFirstName]    = useState('');
  const [initials,     setInitials]     = useState('?');
  const [userCity,     setUserCity]     = useState('');
  const [userCountry,  setUserCountry]  = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [groceryDay,   setGroceryDay]   = useState('Saturday');
  const [labReminder,  setLabReminder]  = useState<{ name: string; date: string } | null>(null);

  const tickerX = useRef(new Animated.Value(-800)).current;

  // Ticker animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(tickerX, { toValue: 0, duration: 15000, useNativeDriver: true })
    );
    tickerX.setValue(-800);
    anim.start();
    return () => anim.stop();
  }, []);

  // Load data on focus (every visit)
  useFocusEffect(
    useCallback(() => {
      async function load() {
        const user = await getSessionUser();
        if (!user) return;

        const name = (user.user_metadata?.full_name ?? user.email ?? '') as string;
        const first = name.split(' ')[0];
        setFirstName(first);
        setInitials(first ? first[0].toUpperCase() : (user.email?.[0]?.toUpperCase() ?? '?'));

        // Family members
        const { data: members } = await supabase.from('family_members').select('id, name').eq('user_id', user.id);
        setFamilyMembers((members as FamilyMember[]) ?? []);

        // Lab reminder
        const { data: membersFull } = await supabase.from('family_members').select('name, health_notes').eq('user_id', user.id);
        if (membersFull) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          for (const m of membersFull) {
            const match = (m.health_notes ?? '').match(/Lab \((\d{4}-\d{2}-\d{2})\)/);
            if (!match) continue;
            const labDate = new Date(match[1]);
            const reminderDate = new Date(labDate);
            reminderDate.setDate(reminderDate.getDate() + 80);
            const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / 86400000);
            if (daysUntil <= 7 && daysUntil >= -7) {
              setLabReminder({ name: m.name, date: reminderDate.toISOString().split('T')[0] });
              break;
            }
          }
        }

        // Grocery day
        const gd = await AsyncStorage.getItem('maharaj_grocery_day');
        if (gd) setGroceryDay(gd);
      }
      void load();
      loadOrDetectLocation().then(loc => { setUserCity(loc.city); setUserCountry(loc.country); });
    }, [])
  );

  const today = new Date();
  const todayDayName = WDAYS[today.getDay()];
  const todayIdx = today.getDay(); // 0=Sun
  const groceryDayIdx = WDAYS.indexOf(groceryDay);
  const nextFest = getNextFestival();

  const cardW = (width - 48 - 16) / 3; // 3 columns, 16px gap between

  return (
    <ImageBackground source={require('../assets/background.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={s.safe}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.push('/settings' as never)} style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Image source={require('../assets/logo.png')} style={s.headerLogo} resizeMode="contain" />
            <Text style={s.headerBf}>Blue Flute Consulting</Text>
          </View>
          <View style={s.headerRight}>
            <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogoHeader} resizeMode="contain" />
            {lang !== 'en' && (
              <TouchableOpacity onPress={toggleEnglish} style={[s.langToggle, isEnglish && s.langToggleActive]}>
                <Text style={[s.langToggleTxt, isEnglish && s.langToggleTxtActive]}>EN</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── GREETING BAR ── */}
        <View style={s.greetBar}>
          <View>
            <Text style={s.greetName}>Namaste, {firstName || 'there'}</Text>
            <Text style={s.greetDate}>{formatDate(today)}</Text>
          </View>
          {userCity ? (
            <Text style={s.greetCity}>{userCity}, {userCountry}</Text>
          ) : null}
        </View>

        {/* ── TICKER ── */}
        <View style={s.ticker}>
          <Animated.Text style={[s.tickerTxt, { transform: [{ translateX: tickerX }] }]}>
            {TICKER_TEXT}
          </Animated.Text>
        </View>

        {/* ── SCROLL CONTENT ── */}
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Lab reminder */}
          {labReminder && (
            <View style={s.labCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.labTitle}>Lab Retest Due</Text>
                <Text style={s.labSub}>{labReminder.name}'s retest due around {labReminder.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setLabReminder(null)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 14, color: '#92400E', fontWeight: '700' }}>X</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 1. TODAY'S MEAL PLAN CARD ── */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>Today's meal plan</Text>
              <View style={s.onDemandBadge}>
                <Text style={s.onDemandText}>On demand</Text>
              </View>
            </View>

            {/* Who's home chips */}
            <View style={s.chipRow}>
              {familyMembers.map(m => {
                const isHome = presentMemberIds.length === 0 || presentMemberIds.includes(m.id);
                return (
                  <View key={m.id} style={[s.memberChip, !isHome && s.memberChipOff]}>
                    <Text style={[s.memberChipTxt, !isHome && s.memberChipTxtOff]}>{m.name}</Text>
                  </View>
                );
              })}
              <TouchableOpacity style={s.whoHomeChip} onPress={() => router.push('/who-is-home' as never)}>
                <Text style={s.whoHomeTxt}>+ who's home?</Text>
              </TouchableOpacity>
            </View>

            {/* Meal slots */}
            <View style={s.slotsRow}>
              {[
                { icon: '\uD83C\uDF05', label: 'Breakfast' },
                { icon: '\u2600\uFE0F', label: 'Lunch' },
                { icon: '\uD83C\uDF19', label: 'Dinner' },
              ].map(slot => (
                <View key={slot.label} style={s.slotBox}>
                  <Text style={s.slotIcon}>{slot.icon}</Text>
                  <Text style={s.slotLabel}>{slot.label}</Text>
                  <Text style={s.slotDish}>Tap to plan</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.generateBtn} onPress={() => router.push('/meal-wizard' as never)} activeOpacity={0.88}>
              <Text style={s.generateBtnTxt}>Generate today's plan  &rarr;</Text>
            </TouchableOpacity>
          </View>

          {/* ── 2. WEEKLY PLAN CARD ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Weekly plan — Sunday to Saturday</Text>
            <Text style={s.cardSub}>Auto-generated before your grocery day</Text>

            {/* Day dots */}
            <View style={s.dotRow}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                const isToday = i === todayIdx;
                const isGrocery = i === groceryDayIdx;
                let dotBg = mint;
                if (isToday) dotBg = navy;
                if (isGrocery) dotBg = gold;
                return (
                  <View key={d} style={s.dotCol}>
                    <View style={[s.dayDot, { backgroundColor: dotBg }]}>
                      {isToday && <Text style={s.dayDotTxt}>T</Text>}
                      {isGrocery && !isToday && <Text style={s.dayDotTxtDark}>G</Text>}
                    </View>
                    <Text style={s.dayDotLabel}>{d}</Text>
                  </View>
                );
              })}
            </View>

            {/* Grocery row */}
            <View style={s.groceryRow}>
              <Text style={s.groceryLabel}>Grocery day: <Text style={{ fontWeight: '700' }}>{groceryDay}</Text></Text>
              <TouchableOpacity
                style={s.emailPdfBtn}
                onPress={() => Alert.alert('Coming soon', 'Weekly email PDF feature is under development.')}
                activeOpacity={0.8}
              >
                <Text style={s.emailPdfTxt}>Email PDF  &rarr;</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 3. FESTIVAL STRIP ── */}
          {nextFest && (
            <TouchableOpacity style={s.festivalStrip} onPress={() => router.push('/festivals' as never)} activeOpacity={0.85}>
              <View style={s.festivalLeft}>
                <Text style={s.festivalIcon}>{'\uD83E\uDE94'}</Text>
                <View>
                  <Text style={s.festivalName}>{nextFest.name}</Text>
                  <Text style={s.festivalDays}>
                    {nextFest.daysAway === 0 ? 'Today!' : nextFest.daysAway === 1 ? 'Tomorrow' : `In ${nextFest.daysAway} days`}
                  </Text>
                </View>
              </View>
              <Text style={s.festivalPlan}>Plan  &rarr;</Text>
            </TouchableOpacity>
          )}

          {/* ── 4. MORE FEATURES LABEL ── */}
          <Text style={s.moreLabel}>MORE FEATURES</Text>

          {/* ── 5. QUICK GRID 2x3 ── */}
          <View style={s.quickGrid}>
            {QUICK_CARDS.map(card => (
              <TouchableOpacity
                key={card.label}
                style={[s.quickCard, { width: cardW }]}
                onPress={() => router.push(card.route as never)}
                activeOpacity={0.82}
              >
                <Text style={s.quickIcon}>{card.icon}</Text>
                <Text style={s.quickLabel}>{card.label}</Text>
                <View style={[s.quickAccent, { backgroundColor: card.accent }]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── 6. ASK MAHARAJ BAR ── */}
          <TouchableOpacity style={s.askBar} onPress={() => router.push('/ask-maharaj' as never)} activeOpacity={0.88}>
            <View style={s.askLogoWrap}>
              <Image source={require('../assets/logo.png')} style={s.askLogo} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.askTitle}>Ask Maharaj</Text>
              <Text style={s.askSub}>Your wise nutrition mentor</Text>
            </View>
            <TouchableOpacity style={s.askMic} onPress={() => router.push('/ask-maharaj' as never)}>
              <Text style={s.askMicTxt}>Mic</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* ── BOTTOM TAB BAR ── */}
        <View style={s.tabBar}>
          {[
            { icon: '\uD83C\uDFE0', label: 'Home',      route: '/home' },
            { icon: '\uD83C\uDF73', label: 'Meal Plan',  route: '/meal-wizard' },
            { icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', label: 'Family', route: '/dietary-profile' },
            { icon: '\uD83D\uDED2', label: 'Groceries',  route: '/order-out' },
            { icon: '\u2699\uFE0F', label: 'Settings',   route: '/settings' },
          ].map((tab, i) => {
            const isActive = i === 0;
            return (
              <TouchableOpacity
                key={tab.label}
                style={s.tabItem}
                onPress={() => { if (!isActive) router.push(tab.route as never); }}
                activeOpacity={0.7}
              >
                <Text style={s.tabIcon}>{tab.icon}</Text>
                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(27,58,92,0.1)',
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: gold, fontSize: 14, fontWeight: '800' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerLogo: { width: 160, height: 52 },
  headerBf: { fontSize: 8, color: textSec, marginTop: -2 },
  headerRight: { minWidth: 80, alignItems: 'flex-end', gap: 4 },
  bfLogoHeader: { width: 80, height: 28 },
  langToggle: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(27,58,92,0.3)', backgroundColor: 'rgba(255,255,255,0.8)' },
  langToggleActive: { backgroundColor: navy, borderColor: navy },
  langToggleTxt: { fontSize: 11, fontWeight: '700', color: navy },
  langToggleTxtActive: { color: white },

  // Greeting bar
  greetBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: navy,
  },
  greetName: { fontSize: 15, fontWeight: '700', color: white },
  greetDate: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  greetCity: { fontSize: 11, color: gold, fontWeight: '500', textAlign: 'right' },

  // Ticker
  ticker: { backgroundColor: '#F59E0B', overflow: 'hidden', paddingVertical: 4 },
  tickerTxt: { fontSize: 11, color: white, fontWeight: '600', width: 1200 },

  // Scroll
  scroll: { padding: 16, paddingBottom: 8 },

  // Lab reminder
  labCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)' },
  labTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  labSub: { fontSize: 12, color: '#78350F', lineHeight: 18 },

  // Cards
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(27,58,92,0.12)' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: navy },
  cardSub: { fontSize: 12, color: textSec, marginBottom: 12, lineHeight: 18 },
  onDemandBadge: { backgroundColor: 'rgba(201,162,39,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  onDemandText: { fontSize: 11, fontWeight: '600', color: gold },

  // Who's home chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  memberChip: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  memberChipOff: { backgroundColor: '#F3F4F6' },
  memberChipTxt: { fontSize: 12, fontWeight: '600', color: '#166534' },
  memberChipTxtOff: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  whoHomeChip: { backgroundColor: 'rgba(27,58,92,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  whoHomeTxt: { fontSize: 12, fontWeight: '600', color: navy },

  // Meal slots
  slotsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  slotBox: { flex: 1, backgroundColor: 'rgba(27,58,92,0.04)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  slotIcon: { fontSize: 20 },
  slotLabel: { fontSize: 11, fontWeight: '700', color: navy },
  slotDish: { fontSize: 10, color: textSec, fontStyle: 'italic' },

  generateBtn: { backgroundColor: navy, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  generateBtnTxt: { color: white, fontSize: 14, fontWeight: '700' },

  // Weekly plan dots
  dotRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dotCol: { alignItems: 'center', gap: 4 },
  dayDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayDotTxt: { fontSize: 11, fontWeight: '800', color: white },
  dayDotTxtDark: { fontSize: 11, fontWeight: '800', color: navy },
  dayDotLabel: { fontSize: 10, color: textSec, fontWeight: '500' },

  groceryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groceryLabel: { fontSize: 13, color: textSec },
  emailPdfBtn: { backgroundColor: gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  emailPdfTxt: { fontSize: 12, fontWeight: '700', color: navy },

  // Festival strip
  festivalStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 14, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: gold,
    borderWidth: 1, borderColor: 'rgba(27,58,92,0.08)',
  },
  festivalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  festivalIcon: { fontSize: 24 },
  festivalName: { fontSize: 14, fontWeight: '700', color: navy },
  festivalDays: { fontSize: 12, color: textSec },
  festivalPlan: { fontSize: 13, fontWeight: '700', color: gold },

  // More label
  moreLabel: { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 1, marginBottom: 10, marginTop: 4 },

  // Quick grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickCard: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(27,58,92,0.1)',
    overflow: 'hidden', minHeight: 80, justifyContent: 'center',
  },
  quickIcon: { fontSize: 22, marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: '700', color: navy, textAlign: 'center' },
  quickAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },

  // Ask Maharaj bar
  askBar: {
    backgroundColor: navy, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  askLogoWrap: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: gold,
    backgroundColor: white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  askLogo: { width: 32, height: 32 },
  askTitle: { fontSize: 15, fontWeight: '800', color: white },
  askSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  askMic: { backgroundColor: gold, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  askMicTxt: { fontSize: 12, fontWeight: '800', color: navy },

  // Bottom tab bar
  tabBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(27,58,92,0.1)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 8 : Platform.OS === 'ios' ? 24 : 8,
  },
  tabItem: { alignItems: 'center', gap: 2, minWidth: 56 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: textSec, fontWeight: '500' },
  tabLabelActive: { color: navy, fontWeight: '700' },
});
