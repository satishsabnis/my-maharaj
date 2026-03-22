import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { navy, gold, textSec, white, border, surface, textColor } from '../theme/colors';

// ─── Festival data ──────────────────────────────────────────────────────────

const FESTIVALS = [
  { name: 'Ugadi / Gudi Padwa', date: '2026-03-30' },
  { name: 'Eid al-Fitr', date: '2026-03-31' },
  { name: 'Ram Navami', date: '2026-04-05' },
  { name: 'Baisakhi', date: '2026-04-14' },
  { name: 'Akshaya Tritiya', date: '2026-04-21' },
  { name: 'Eid al-Adha', date: '2026-06-07' },
  { name: 'Guru Purnima', date: '2026-07-19' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan', date: '2026-08-22' },
  { name: 'Janmashtami', date: '2026-08-29' },
  { name: 'Ganesh Chaturthi', date: '2026-09-16' },
  { name: 'Navratri', date: '2026-10-05' },
  { name: 'Dussehra', date: '2026-10-14' },
  { name: 'Diwali', date: '2026-11-03' },
  { name: 'Christmas', date: '2026-12-25' },
];

function getNextFestival(): { name: string; daysAway: number } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const d = new Date(f.date);
    if (d >= today) {
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { name: f.name, daysAway: diff };
    }
  }
  return null;
}

// ─── DateTime ───────────────────────────────────────────────────────────────

const WDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
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

// ─── Card data ───────────────────────────────────────────────────────────────

interface CardDef {
  id: string; icon: string; title: string;
  iconBg: string; leftBorder: string; route: string; descStatic?: string;
}

const CARDS: CardDef[] = [
  { id: 'dietary',    icon: '🥗', title: 'Dietary Profile',     iconBg: '#E8F5E9', leftBorder: '#1A6B3C', route: '/dietary-profile',    descStatic: 'Family health and food preferences' },
  { id: 'festivals',  icon: '🪔', title: 'Festivals & Functions',iconBg: '#FFF3E0', leftBorder: '#FF9933', route: '/festivals' },
  { id: 'party',      icon: '🎉', title: 'Party Menu',           iconBg: '#FFEBEE', leftBorder: '#C62828', route: '/party-menu',         descStatic: 'Plan your next gathering' },
  { id: 'cuisine',    icon: '🗺️', title: 'Cuisine Selection',    iconBg: '#E3F2FD', leftBorder: '#1565C0', route: '/cuisine-selection' },
  { id: 'etiquettes', icon: '🍽️', title: 'Table Etiquettes',     iconBg: '#FFF8E1', leftBorder: '#F9A825', route: '/table-etiquettes',   descStatic: 'Learn dining traditions' },
  { id: 'plating',    icon: '🎨', title: 'Traditional Plating',  iconBg: '#E8F5E9', leftBorder: '#2E7D32', route: '/traditional-plating',descStatic: 'Present your food beautifully' },
  { id: 'mealplan',   icon: '🍳', title: 'Generate Meal Plan',   iconBg: '#E3F2FD', leftBorder: '#1B3A6B', route: '/meal-wizard',        descStatic: 'Plan your meals with AI' },
  { id: 'history',    icon: '📋', title: 'Menu History',         iconBg: '#F3E5F5', leftBorder: '#6A1B9A', route: '/menu-history',       descStatic: 'Last 3 months of plans' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [firstName, setFirstName]     = useState('');
  const [initials, setInitials]       = useState('?');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([]);
  const [dateTimeStr, setDateTimeStr] = useState(formatDateTime(new Date()));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setDateTimeStr(formatDateTime(new Date())), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name: string = user.user_metadata?.full_name ?? user.email ?? '';
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
      return nf.daysAway === 0 ? `${nf.name} — Today! 🎉` : `${nf.name} — ${nf.daysAway} day${nf.daysAway === 1 ? '' : 's'} away`;
    }
    if (card.id === 'cuisine') {
      return activeCuisines.length > 0
        ? `Currently: ${activeCuisines.slice(0, 2).join(', ')}${activeCuisines.length > 2 ? ` +${activeCuisines.length - 2}` : ''}`
        : 'No cuisines selected';
    }
    return card.descStatic ?? '';
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Logout', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/');
      }},
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Logo size="small" style={{ width: 120, height: 50 }} />
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={s.exitBtn}>
          <Text style={s.exitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Date bar */}
      <View style={s.dateBar}>
        <Text style={s.dateText}>{dateTimeStr}</Text>
        {firstName ? <Text style={s.greetText}>Welcome, {firstName} 🙏</Text> : null}
      </View>

      {/* Card grid */}
      <ScrollView
        contentContainerStyle={[s.grid, isWide && s.gridWide]}
        showsVerticalScrollIndicator={false}
      >
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[s.card, isWide && s.cardWide, { borderLeftColor: card.leftBorder }]}
            onPress={() => router.push(card.route as never)}
            activeOpacity={0.85}
          >
            <View style={[s.iconCircle, { backgroundColor: card.iconBg }]}>
              <Text style={s.iconEmoji}>{card.icon}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{card.title}</Text>
              <Text style={s.cardDesc} numberOfLines={2}>{getDesc(card)}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 64, paddingHorizontal: 16,
    backgroundColor: white, borderBottomWidth: 1, borderBottomColor: border,
    paddingTop: Platform.OS === 'web' ? 12 : 0,
  },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: gold, fontSize: 16, fontWeight: '800' },
  exitBtn:    { paddingHorizontal: 8, paddingVertical: 6 },
  exitText:   { fontSize: 14, color: navy, fontWeight: '600' },

  dateBar:   { backgroundColor: surface, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  dateText:  { fontSize: 13, color: navy, fontWeight: '600' },
  greetText: { fontSize: 13, color: textSec },

  grid:     { paddingHorizontal: 16, paddingTop: 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: white, borderRadius: 16, marginBottom: 12,
    padding: 16, borderWidth: 1, borderColor: border,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 14,
  },
  cardWide: { width: '48.5%', marginHorizontal: '0.75%' },

  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji:  { fontSize: 22 },

  cardBody:  { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 3 },
  cardDesc:  { fontSize: 13, color: textSec, lineHeight: 18 },
  chevron:   { fontSize: 22, color: '#CBD5E1', fontWeight: '300' },
});
