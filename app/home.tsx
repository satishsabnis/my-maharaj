import React, { useEffect, useRef, useState } from 'react';
import {
  Platform, SafeAreaView, ScrollView, StyleSheet,
  Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

// ─── Blue Flute Design System ─────────────────────────────────────────────────

const BF = {
  navy:      '#1B3A5C',
  teal:      '#1A6B5C',
  mint:      '#7ED8A4',
  mintLight: '#E8F8F0',
  skyLight:  '#E8F4FA',
  white:     '#FFFFFF',
  offWhite:  '#F7FDFB',
  textSec:   '#5A7A8A',
  border:    '#D4EDE5',
  gold:      '#C9A227',
};

// ─── Correct 2026 festival dates (verified) ───────────────────────────────────

const FESTIVALS = [
  { name: 'Ram Navami',         date: '2026-03-26' },
  { name: 'Baisakhi',           date: '2026-04-13' },
  { name: 'Akshaya Tritiya',    date: '2026-04-19' },
  { name: 'Eid al-Adha',        date: '2026-05-27' },
  { name: 'Independence Day',   date: '2026-08-15' },
  { name: 'Raksha Bandhan',     date: '2026-08-28' },
  { name: 'Janmashtami',        date: '2026-09-04' },
  { name: 'Ganesh Chaturthi',   date: '2026-09-14' },
  { name: 'Navratri',           date: '2026-10-11' },
  { name: 'Dussehra',           date: '2026-10-20' },
  { name: 'Diwali',             date: '2026-11-08' },
  { name: 'Bhai Dooj',          date: '2026-11-11' },
  { name: 'Christmas',          date: '2026-12-25' },
];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getNextFestival(): { name: string; daysAway: number } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const d = parseLocalDate(f.date);
    if (d >= today) {
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { name: f.name, daysAway: diff };
    }
  }
  return null;
}

// ─── DateTime ─────────────────────────────────────────────────────────────────

const WDAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDateTime(d: Date): string {
  const day = WDAYS[d.getDay()];
  const date = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day}, ${date} ${month} ${year}  ·  ${h}:${m} ${ap}`;
}

// ─── Cards — Cuisine HIDDEN, correct order ────────────────────────────────────

interface CardDef {
  id: string; icon: string; title: string;
  iconBg: string; accent: string; route: string;
  descStatic?: string; featured?: boolean;
}

const CARDS: CardDef[] = [
  { id: 'festivals',  icon: '🪔', title: 'Festivals & Functions', iconBg: '#FFF3E0', accent: BF.gold,    route: '/festivals',           featured: true },
  { id: 'dietary',    icon: '🥗', title: 'Dietary Profile',       iconBg: '#E8F5E9', accent: '#2E7D32',  route: '/dietary-profile',     descStatic: 'Family health & food preferences' },
  { id: 'mealplan',   icon: '🍳', title: 'Generate Meal Plan',    iconBg: BF.mintLight, accent: BF.teal, route: '/meal-wizard',         descStatic: 'Plan your meals with Maharaj AI', featured: true },
  { id: 'party',      icon: '🎉', title: 'Party Menu',            iconBg: '#FFEBEE', accent: '#C62828',  route: '/party-menu',          descStatic: 'Plan your next gathering' },
  { id: 'outdoor',    icon: '🏕️', title: 'Outdoor Catering',      iconBg: BF.mintLight, accent: BF.teal, route: '/outdoor-catering',    descStatic: 'Events, picnics & BBQs' },
  { id: 'history',    icon: '📋', title: 'Menu History',          iconBg: '#F3E5F5', accent: '#6A1B9A',  route: '/menu-history',        descStatic: 'Last 3 months of meal plans' },
  { id: 'etiquettes', icon: '🍽️', title: 'Table Etiquettes',      iconBg: '#FFF8E1', accent: '#F9A825',  route: '/table-etiquettes',    descStatic: 'Indian dining traditions' },
  { id: 'plating',    icon: '🎨', title: 'Traditional Plating',   iconBg: '#E8F5E9', accent: '#2E7D32',  route: '/traditional-plating', descStatic: 'Present your food beautifully' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [firstName,   setFirstName]   = useState('');
  const [initials,    setInitials]    = useState('?');
  const [dateTimeStr, setDateTimeStr] = useState(formatDateTime(new Date()));
  const [showLogout,  setShowLogout]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setDateTimeStr(formatDateTime(new Date())), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name  = (user.user_metadata?.full_name ?? user.email ?? '') as string;
      const first = name.split(' ')[0];
      setFirstName(first);
      setInitials(first ? first.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() ?? '?'));
    }
    void load();
  }, []);

  async function handleLogout() {
    // Use inline confirm for web (Alert doesn't work on web)
    if (Platform.OS === 'web') {
      setShowLogout(true);
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ]);
    }
  }

  async function doLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  function getDesc(card: CardDef): string {
    const nf = getNextFestival();
    if (card.id === 'festivals') {
      if (!nf) return 'All festivals for the year';
      if (nf.daysAway === 0) return `${nf.name} — Today! 🎉`;
      if (nf.daysAway === 1) return `${nf.name} — Tomorrow!`;
      return `${nf.name} — ${nf.daysAway} days away`;
    }
    return card.descStatic ?? '';
  }

  const nf = getNextFestival();

  return (
    <SafeAreaView style={s.safe}>

      {/* Logout confirmation overlay (web only) */}
      {showLogout && (
        <View style={s.overlay}>
          <View style={s.overlayBox}>
            <Text style={s.overlayTitle}>Logout</Text>
            <Text style={s.overlaySub}>Are you sure you want to logout?</Text>
            <View style={s.overlayBtns}>
              <TouchableOpacity style={s.overlayCancel} onPress={() => setShowLogout(false)}>
                <Text style={s.overlayCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.overlayConfirm} onPress={doLogout}>
                <Text style={s.overlayConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Logo size="small" style={{ width: 130, height: 44 }} />
        <TouchableOpacity onPress={handleLogout} style={s.exitBtn} activeOpacity={0.7}>
          <Text style={s.exitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Date bar */}
      <View style={s.dateBar}>
        <Text style={s.dateText}>{dateTimeStr}</Text>
        {firstName ? <Text style={s.greetText}>Namaste, {firstName} 🙏</Text> : null}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* AI Brain banner */}
        <TouchableOpacity
          style={s.aiBanner}
          onPress={() => router.push('/meal-wizard' as never)}
          activeOpacity={0.88}
        >
          <View style={s.aiBannerLeft}>
            <Text style={s.aiBannerEmoji}>🧠</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiBannerTitle}>Maharaj AI is ready</Text>
              <Text style={s.aiBannerSub} numberOfLines={2}>
                {nf && nf.daysAway <= 7
                  ? `${nf.name} in ${nf.daysAway} day${nf.daysAway === 1 ? '' : 's'} — plan a special menu!`
                  : 'Tap to generate your personalised weekly meal plan'}
              </Text>
            </View>
          </View>
          <Text style={s.aiBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Card grid */}
        <View style={[s.grid, isWide && s.gridWide]}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                s.card,
                isWide && s.cardWide,
                { borderLeftColor: card.accent },
                card.featured && s.cardFeatured,
              ]}
              onPress={() => router.push(card.route as never)}
              activeOpacity={0.85}
            >
              <View style={[s.iconCircle, { backgroundColor: card.iconBg }]}>
                <Text style={s.iconEmoji}>{card.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, card.featured && { color: card.accent }]}>
                  {card.title}
                </Text>
                <Text style={s.cardDesc} numberOfLines={2}>{getDesc(card)}</Text>
              </View>
              <Text style={[s.chevron, { color: card.accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerDivider} />
          <Logo size="small" style={{ width: 100, height: 34, marginBottom: 6 }} />
          <Text style={s.footerText}>Powered by Blue Flute Consulting</Text>
          <Text style={s.footerSub}>bluefluteconsulting.com</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BF.offWhite },

  // Logout overlay
  overlay:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  overlayBox:     { backgroundColor: BF.white, borderRadius: 20, padding: 28, width: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  overlayTitle:   { fontSize: 18, fontWeight: '800', color: BF.navy, marginBottom: 8 },
  overlaySub:     { fontSize: 14, color: BF.textSec, marginBottom: 24, lineHeight: 20 },
  overlayBtns:    { flexDirection: 'row', gap: 12 },
  overlayCancel:  { flex: 1, borderWidth: 1.5, borderColor: BF.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  overlayCancelText:  { fontSize: 14, color: BF.navy, fontWeight: '600' },
  overlayConfirm: { flex: 1, backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  overlayConfirmText: { fontSize: 14, color: BF.white, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 64, paddingHorizontal: 16, backgroundColor: BF.white,
    borderBottomWidth: 1, borderBottomColor: BF.border,
    paddingTop: Platform.OS === 'web' ? 12 : 0,
  },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: BF.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BF.mint, fontSize: 16, fontWeight: '800' },
  exitBtn:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: BF.border },
  exitText:   { fontSize: 14, color: BF.navy, fontWeight: '600' },

  dateBar: {
    backgroundColor: BF.white, paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: BF.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText:  { fontSize: 13, color: BF.navy, fontWeight: '600' },
  greetText: { fontSize: 13, color: BF.textSec },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, maxWidth: 960, width: '100%', alignSelf: 'center' },

  aiBanner: {
    backgroundColor: BF.navy, borderRadius: 16, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: BF.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  aiBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  aiBannerEmoji: { fontSize: 28 },
  aiBannerTitle: { fontSize: 15, fontWeight: '800', color: BF.white, marginBottom: 3 },
  aiBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 17 },
  aiBannerArrow: { fontSize: 28, color: BF.mint, fontWeight: '300', paddingLeft: 8 },

  grid:     { gap: 10 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BF.white, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: BF.border, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    gap: 12,
  },
  cardWide:     { width: '49.5%' },
  cardFeatured: { backgroundColor: '#FAFFFE' },

  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji:  { fontSize: 22 },
  cardBody:   { flex: 1 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: BF.navy, marginBottom: 2 },
  cardDesc:   { fontSize: 12, color: BF.textSec, lineHeight: 17 },
  chevron:    { fontSize: 22, fontWeight: '300' },

  footer:        { alignItems: 'center', paddingVertical: 24, marginTop: 8 },
  footerDivider: { height: 1, backgroundColor: BF.border, width: '100%', marginBottom: 20 },
  footerText:    { fontSize: 12, color: BF.textSec, fontWeight: '600', letterSpacing: 0.3 },
  footerSub:     { fontSize: 11, color: BF.mint, marginTop: 3, fontWeight: '500' },
});
      { name: 'Raksha Bandhan',     date: '2026-08-09' },
  { name: 'Janmashtami',        date: '2026-08-16' },
  { name: 'Ganesh Chaturthi',   date: '2026-08-25' },
  { name: 'Navratri',           date: '2026-10-13' },
  { name: 'Dussehra',           date: '2026-10-22' },
  { name: 'Diwali',             date: '2026-10-30' },
  { name: 'Christmas',          date: '2026-12-25' },
];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getNextFestival(): { name: string; daysAway: number } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const d = parseLocalDate(f.date);
    if (d >= today) {
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { name: f.name, daysAway: diff };
    }
  }
  return null;
}

// ─── DateTime ─────────────────────────────────────────────────────────────────

const WDAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDateTime(d: Date): string {
  const day = WDAYS[d.getDay()];
  const date = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day}, ${date} ${month} ${year}  ·  ${h}:${m} ${ap}`;
}

// ─── Cards — ordered: Festivals, Meal Plan, Party, Outdoor, then rest ─────────

interface CardDef {
  id: string; icon: string; title: string;
  iconBg: string; accent: string; route: string;
  descStatic?: string; featured?: boolean;
}

const CARDS: CardDef[] = [
  { id: 'festivals',  icon: '🪔', title: 'Festivals & Functions', iconBg: '#FFF3E0', accent: BF.gold,    route: '/festivals',           featured: true },
  { id: 'mealplan',   icon: '🍳', title: 'Generate Meal Plan',    iconBg: BF.mintLight, accent: BF.teal, route: '/meal-wizard',         descStatic: 'Plan your meals with Maharaj AI', featured: true },
  { id: 'party',      icon: '🎉', title: 'Party Menu',            iconBg: '#FFEBEE', accent: '#C62828',  route: '/party-menu',          descStatic: 'Plan your next gathering' },
  { id: 'outdoor',    icon: '🏕️', title: 'Outdoor Catering',      iconBg: BF.mintLight, accent: BF.teal, route: '/outdoor-catering',    descStatic: 'Events, picnics & BBQs' },
  { id: 'dietary',    icon: '🥗', title: 'Dietary Profile',       iconBg: '#E8F5E9', accent: '#2E7D32',  route: '/dietary-profile',     descStatic: 'Family health & food preferences' },
  { id: 'cuisine',    icon: '🗺️', title: 'Cuisine Selection',     iconBg: BF.skyLight,  accent: BF.navy, route: '/cuisine-selection' },
  { id: 'history',    icon: '📋', title: 'Menu History',          iconBg: '#F3E5F5', accent: '#6A1B9A',  route: '/menu-history',        descStatic: 'Last 3 months of meal plans' },
  { id: 'etiquettes', icon: '🍽️', title: 'Table Etiquettes',      iconBg: '#FFF8E1', accent: '#F9A825',  route: '/table-etiquettes',    descStatic: 'Indian dining traditions' },
  { id: 'plating',    icon: '🎨', title: 'Traditional Plating',   iconBg: '#E8F5E9', accent: '#2E7D32',  route: '/traditional-plating', descStatic: 'Present your food beautifully' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [firstName,      setFirstName]      = useState('');
  const [initials,       setInitials]       = useState('?');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([]);
  const [dateTimeStr,    setDateTimeStr]    = useState(formatDateTime(new Date()));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setDateTimeStr(formatDateTime(new Date())), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name  = (user.user_metadata?.full_name ?? user.email ?? '') as string;
      const first = name.split(' ')[0];
      setFirstName(first);
      setInitials(first ? first.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() ?? '?'));
      const { data } = await supabase.from('cuisine_preferences')
        .select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false);
      if (data) setActiveCuisines(data.map((r: { cuisine_name: string }) => r.cuisine_name));
    }
    void load();
  }, []);

  function getDesc(card: CardDef): string {
    const nf = getNextFestival();
    if (card.id === 'festivals') {
      if (!nf) return 'No upcoming festivals';
      if (nf.daysAway === 0) return `${nf.name} — Today! 🎉`;
      if (nf.daysAway === 1) return `${nf.name} — Tomorrow!`;
      return `${nf.name} — ${nf.daysAway} days away`;
    }
    if (card.id === 'cuisine') {
      return activeCuisines.length > 0
        ? `${activeCuisines.slice(0, 2).join(', ')}${activeCuisines.length > 2 ? ` +${activeCuisines.length - 2}` : ''}`
        : 'Select your cuisines';
    }
    return card.descStatic ?? '';
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/');
      }},
    ]);
  }

  const nf = getNextFestival();

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Logo size="small" style={{ width: 130, height: 44 }} />
        <TouchableOpacity onPress={handleLogout} style={s.exitBtn}>
          <Text style={s.exitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Date bar */}
      <View style={s.dateBar}>
        <Text style={s.dateText}>{dateTimeStr}</Text>
        {firstName ? <Text style={s.greetText}>Namaste, {firstName} 🙏</Text> : null}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* AI Brain banner */}
        <TouchableOpacity
          style={s.aiBanner}
          onPress={() => router.push('/meal-wizard' as never)}
          activeOpacity={0.88}
        >
          <View style={s.aiBannerLeft}>
            <Text style={s.aiBannerEmoji}>🧠</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiBannerTitle}>Maharaj AI is ready</Text>
              <Text style={s.aiBannerSub} numberOfLines={2}>
                {nf && nf.daysAway <= 7
                  ? `${nf.name} in ${nf.daysAway} day${nf.daysAway === 1 ? '' : 's'} — plan a special menu!`
                  : 'Tap to generate your personalised weekly meal plan'}
              </Text>
            </View>
          </View>
          <Text style={s.aiBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Cards */}
        <View style={[s.grid, isWide && s.gridWide]}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                s.card,
                isWide && s.cardWide,
                { borderLeftColor: card.accent },
                card.featured && s.cardFeatured,
              ]}
              onPress={() => router.push(card.route as never)}
              activeOpacity={0.85}
            >
              <View style={[s.iconCircle, { backgroundColor: card.iconBg }]}>
                <Text style={s.iconEmoji}>{card.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, card.featured && { color: card.accent }]}>
                  {card.title}
                </Text>
                <Text style={s.cardDesc} numberOfLines={2}>{getDesc(card)}</Text>
              </View>
              <Text style={[s.chevron, { color: card.accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerDivider} />
          <Text style={s.footerText}>Powered by Blue Flute Consulting</Text>
          <Text style={s.footerSub}>bluefluteconsulting.com</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BF.offWhite },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 64, paddingHorizontal: 16,
    backgroundColor: BF.white,
    borderBottomWidth: 1, borderBottomColor: BF.border,
    paddingTop: Platform.OS === 'web' ? 12 : 0,
  },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: BF.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BF.mint, fontSize: 16, fontWeight: '800' },
  exitBtn:    { paddingHorizontal: 8, paddingVertical: 6 },
  exitText:   { fontSize: 14, color: BF.navy, fontWeight: '600' },

  dateBar: {
    backgroundColor: BF.white, paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: BF.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText:  { fontSize: 13, color: BF.navy, fontWeight: '600' },
  greetText: { fontSize: 13, color: BF.textSec },

  scroll: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32,
    maxWidth: 960, width: '100%', alignSelf: 'center',
  },

  // AI Banner
  aiBanner: {
    backgroundColor: BF.navy, borderRadius: 16, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: BF.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  aiBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  aiBannerEmoji: { fontSize: 28 },
  aiBannerTitle: { fontSize: 15, fontWeight: '800', color: BF.white, marginBottom: 3 },
  aiBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 17 },
  aiBannerArrow: { fontSize: 28, color: BF.mint, fontWeight: '300', paddingLeft: 8 },

  // Grid
  grid:     { gap: 10 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BF.white, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: BF.border,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    gap: 12,
  },
  cardWide:     { width: 'calc(50% - 5px)' as unknown as number },
  cardFeatured: { backgroundColor: '#FAFFFE' },

  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji:  { fontSize: 22 },
  cardBody:   { flex: 1 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: BF.navy, marginBottom: 2 },
  cardDesc:   { fontSize: 12, color: BF.textSec, lineHeight: 17 },
  chevron:    { fontSize: 22, fontWeight: '300' },

  // Footer
  footer:       { alignItems: 'center', paddingVertical: 24, marginTop: 8 },
  footerDivider:{ height: 1, backgroundColor: BF.border, width: '100%', marginBottom: 16 },
  footerText:   { fontSize: 12, color: BF.textSec, fontWeight: '600', letterSpacing: 0.3 },
  footerSub:    { fontSize: 11, color: BF.mint, marginTop: 3, fontWeight: '500' },
});
