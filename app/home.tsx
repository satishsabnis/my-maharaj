import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getLipidStatus, LipidStatus } from '../lib/notifications';
import { gold, navy, white } from '../theme/colors';
import AnimatedLogo from '../components/AnimatedLogo';

// ── Festival data ─────────────────────────────────────────────────────────────

const FESTIVALS: { name: string; date: string }[] = [
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
  { name: 'Bhai Dooj', date: '2026-11-05' },
  { name: 'Christmas', date: '2026-12-25' },
];

function getNextFestival(): { name: string; daysAway: number } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const d = new Date(f.date);
    if (d >= today) {
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { name: f.name, daysAway: diff };
    }
  }
  return null;
}

// ── DateTime ──────────────────────────────────────────────────────────────────

const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateTime(d: Date): string {
  const weekday = WEEKDAYS_LONG[d.getDay()];
  const date = d.getDate();
  const month = MONTHS_LONG[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${weekday}, ${date} ${month} ${year} · ${hours}:${minutes} ${ampm}`;
}

// ── Card definitions ──────────────────────────────────────────────────────────

interface CardDef {
  id: string;
  icon: string;
  title: string;
  color: string;
  route: string;
  descStatic?: string;
}

const CARDS: CardDef[] = [
  { id: 'dietary', icon: '🥗', title: 'Dietary Profile', color: '#1A6B3C', route: '/dietary-profile', descStatic: 'Family health & food preferences' },
  { id: 'festivals', icon: '🪔', title: 'Festivals & Functions', color: '#FF9933', route: '/festivals' },
  { id: 'party', icon: '🎉', title: 'Party Menu Generator', color: '#8B1A1A', route: '/party-menu', descStatic: 'Plan your next gathering' },
  { id: 'cuisine', icon: '🗺️', title: 'Cuisine Selection', color: navy, route: '/cuisine-selection' },
  { id: 'etiquettes', icon: '🍽️', title: 'Table Etiquettes', color: '#C9A227', route: '/table-etiquettes', descStatic: 'Learn dining traditions' },
  { id: 'plating', icon: '🎨', title: 'Traditional Plating', color: '#1A6B3C', route: '/traditional-plating', descStatic: 'Present your food beautifully' },
  { id: 'mealplan', icon: '🍳', title: 'Generate Meal Plan', color: navy, route: '/meal-wizard', descStatic: 'Plan your week\'s meals' },
  { id: 'history', icon: '📋', title: 'Menu History', color: '#2C4A6E', route: '/menu-history', descStatic: 'Last 3 months of meal plans' },
];

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [firstName, setFirstName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeCuisines, setActiveCuisines] = useState<string[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [dateTimeStr, setDateTimeStr] = useState(formatDateTime(new Date()));
  const [lipidStatus, setLipidStatus] = useState<LipidStatus | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Update time every minute
    timerRef.current = setInterval(() => {
      setDateTimeStr(formatDateTime(new Date()));
    }, 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name: string = user.user_metadata?.full_name ?? user.email ?? '';
      setFirstName(name.split(' ')[0]);

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);

      const { data: cuisineData } = await supabase
        .from('cuisine_preferences')
        .select('cuisine_name')
        .eq('user_id', user.id)
        .eq('is_excluded', false);
      if (cuisineData) setActiveCuisines(cuisineData.map((r: { cuisine_name: string }) => r.cuisine_name));

      const status = await getLipidStatus(user.id);
      setLipidStatus(status);
    }
    void loadProfile();
  }, []);

  async function handleLogout() {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.replace('/');
  }

  const nextFestival = getNextFestival();

  function getCardDescription(card: CardDef): string {
    if (card.id === 'festivals') {
      if (!nextFestival) return 'No upcoming festivals';
      return nextFestival.daysAway === 0
        ? `${nextFestival.name} — Today! 🎉`
        : `${nextFestival.name} — ${nextFestival.daysAway} day${nextFestival.daysAway === 1 ? '' : 's'} away`;
    }
    if (card.id === 'cuisine') {
      return activeCuisines.length > 0
        ? `Currently: ${activeCuisines.slice(0, 2).join(', ')}${activeCuisines.length > 2 ? ` +${activeCuisines.length - 2}` : ''}`
        : 'No cuisines selected';
    }
    return card.descStatic ?? '';
  }

  const initials = firstName ? firstName.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        {/* Avatar */}
        <TouchableOpacity onPress={() => router.push('/profile-setup')} activeOpacity={0.8}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.headerAvatar} />
          ) : (
            <View style={s.headerInitials}>
              <Text style={s.headerInitialsText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Logo — bounces in on mount */}
        <AnimatedLogo animation="bounce" width={240} height={80} />

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogoutModal(true)} activeOpacity={0.7}>
          <Text style={s.logoutIcon}>⏻</Text>
        </TouchableOpacity>
      </View>

      {/* Date/Time bar */}
      <View style={s.dateBar}>
        <Text style={s.dateText}>{dateTimeStr}</Text>
        {firstName ? <Text style={s.greetText}>Welcome, {firstName} 🙏</Text> : null}
      </View>

      {/* Card grid */}
      <ScrollView contentContainerStyle={[s.grid, isWide && s.gridWide]} showsVerticalScrollIndicator={false}>
        {CARDS.map((card) => {
          const showRedBadge = card.id === 'dietary' && lipidStatus?.hasExpired;
          const showOrangeBadge = card.id === 'dietary' && !lipidStatus?.hasExpired && lipidStatus?.hasExpiringSoon;
          return (
          <TouchableOpacity
            key={card.id}
            style={[s.card, isWide && s.cardWide, { borderLeftColor: card.color }]}
            onPress={() => router.push(card.route as never)}
            activeOpacity={0.85}
          >
            <View style={{ position: 'relative' }}>
              <View style={[s.iconCircle, { backgroundColor: card.color + '18' }]}>
                <Text style={s.iconText}>{card.icon}</Text>
              </View>
              {showRedBadge && <View style={[s.alertDot, { backgroundColor: '#DC2626' }]} />}
              {showOrangeBadge && <View style={[s.alertDot, { backgroundColor: '#F97316' }]} />}
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{card.title}</Text>
              <Text style={s.cardDesc}>{getCardDescription(card)}</Text>
              {showRedBadge && <Text style={s.alertText}>⚠️ Lipid report expired</Text>}
              {showOrangeBadge && <Text style={[s.alertText, { color: '#F97316' }]}>🔔 Lipid report expiring soon</Text>}
            </View>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Logout modal */}
      <Modal transparent visible={showLogoutModal} animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Logout</Text>
            <Text style={s.modalBody}>Are you sure you want to logout?</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowLogoutModal(false)} activeOpacity={0.8}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalLogout} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={s.modalLogoutText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },

  header: {
    backgroundColor: navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 16,
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: gold },
  headerInitials: { width: 40, height: 40, borderRadius: 20, backgroundColor: gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  headerInitialsText: { color: white, fontSize: 17, fontWeight: '800' },
  headerLogo: { width: 240, height: 80, resizeMode: 'contain' },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  logoutIcon: { color: white, fontSize: 18 },

  dateBar: {
    backgroundColor: white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateText: { fontSize: 13, color: navy, fontWeight: '600' },
  greetText: { fontSize: 13, color: '#7B93B8', fontWeight: '500' },

  grid: { paddingHorizontal: 16, paddingTop: 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: white,
    borderRadius: 14,
    marginBottom: 12,
    marginHorizontal: 0,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  cardWide: { width: '50%' as const, paddingHorizontal: 14, marginBottom: 12 },

  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 26 },

  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  cardArrow: { fontSize: 22, color: '#CBD5E1', fontWeight: '300' },
  alertDot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: white },
  alertText: { fontSize: 11, color: '#DC2626', fontWeight: '600', marginTop: 3 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: white, borderRadius: 18, padding: 28, width: 300, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: navy, marginBottom: 10 },
  modalBody: { fontSize: 15, color: '#4B5563', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalCancelText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  modalLogout: { flex: 1, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalLogoutText: { color: white, fontWeight: '700', fontSize: 15 },
});
