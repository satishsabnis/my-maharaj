import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Image, ImageBackground, Linking, Modal,
  Platform, SafeAreaView, ScrollView, StyleSheet, Switch,
  Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { loadOrDetectLocation } from '../lib/location';
import { navy, gold, white, textSec, border } from '../theme/colors';

// ─── Festival data ────────────────────────────────────────────────────────────

const FESTIVALS = [
  { name: 'Baisakhi',         date: '2026-04-14', icon: '\uD83C\uDF3E' },
  { name: 'Akshaya Tritiya',  date: '2026-04-19', icon: '\uD83E\uDE94' },
  { name: 'Eid al-Adha',      date: '2026-05-27', icon: '\uD83C\uDF19' },
  { name: 'Guru Purnima',     date: '2026-07-29', icon: '\uD83D\uDE4F' },
  { name: 'Independence Day', date: '2026-08-15', icon: '\uD83C\uDDEE\uD83C\uDDF3' },
  { name: 'Raksha Bandhan',   date: '2026-08-28', icon: '\uD83E\uDDF6' },
  { name: 'Janmashtami',      date: '2026-09-04', icon: '\uD83C\uDF6F' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14', icon: '\uD83D\uDC18' },
  { name: 'Navratri',         date: '2026-10-11', icon: '\uD83E\uDE94' },
  { name: 'Dussehra',         date: '2026-10-20', icon: '\uD83C\uDFF9' },
  { name: 'Diwali',           date: '2026-11-08', icon: '\uD83E\uDE94' },
  { name: 'Bhai Dooj',        date: '2026-11-10', icon: '\uD83D\uDC90' },
  { name: 'Christmas',        date: '2026-12-25', icon: '\uD83C\uDF84' },
  { name: 'New Year',         date: '2027-01-01', icon: '\uD83C\uDF89' },
];

function getNextFestival() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const [y, m, d] = f.date.split('-').map(Number);
    const fd = new Date(y, m - 1, d);
    const daysAway = Math.ceil((fd.getTime() - today.getTime()) / 86400000);
    if (daysAway >= 0 && daysAway <= 30) {
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return { ...f, daysAway, dateLabel: `${fd.getDate()} ${mon[fd.getMonth()]}` };
    }
  }
  return null;
}

// ─── DateTime ─────────────────────────────────────────────────────────────────

const WDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatInfoBar(d: Date): string {
  let h = d.getHours(); const mi = String(d.getMinutes()).padStart(2,'0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${WDAYS[d.getDay()]} ${d.getDate()} ${MONS[d.getMonth()]} ${d.getFullYear()} \u00B7 ${h}:${mi} ${ap}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const cardW = (width - 48) / 2;

  const [firstName, setFirstName] = useState('');
  const [initials,  setInitials]  = useState('?');
  const [email,     setEmail]     = useState('');
  const [userCity,  setUserCity]  = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [dateTimeStr, setDateTimeStr] = useState(formatInfoBar(new Date()));
  const [labReminder, setLabReminder] = useState<{name:string;date:string}|null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [planReminder, setPlanReminder] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const drawerAnim = useRef(new Animated.Value(-width * 0.75)).current;

  // Clock update
  useEffect(() => {
    const t = setInterval(() => setDateTimeStr(formatInfoBar(new Date())), 60000);
    return () => clearInterval(t);
  }, []);

  // Load user data
  useEffect(() => {
    async function load() {
      const user = await getSessionUser();
      if (!user) return;
      const name = (user.user_metadata?.full_name ?? user.email ?? '') as string;
      const first = name.split(' ')[0];
      setFirstName(first);
      setInitials(first ? first[0].toUpperCase() : (user.email?.[0]?.toUpperCase() ?? '?'));
      setEmail(user.email ?? '');

      // Lab reminder
      const { data: members } = await supabase.from('family_members').select('name, health_notes').eq('user_id', user.id);
      if (members) {
        const today = new Date(); today.setHours(0,0,0,0);
        for (const m of members) {
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

      // Check plan ready
      const pr = await AsyncStorage.getItem('maharaj_plan_ready');
      if (pr) setPlanReady(true);
    }
    void load();
    loadOrDetectLocation().then(loc => { setUserCity(loc.city); setUserCountry(loc.country); });
  }, []);

  // Drawer animation
  function openDrawer() {
    setIsDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }
  function closeDrawer() {
    Animated.timing(drawerAnim, { toValue: -width * 0.75, duration: 200, useNativeDriver: true }).start(() => setIsDrawerOpen(false));
  }

  async function doSignOut() {
    closeDrawer();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const nextFest = getNextFestival();

  // ─── Drawer Row component ──────────────────────────────────────────────────
  function DrawerRow({ icon, label, onPress, badge, signOut }: { icon: string; label: string; onPress: () => void; badge?: string; signOut?: boolean }) {
    return (
      <TouchableOpacity style={s.drawerRow} onPress={onPress} activeOpacity={0.7}>
        <View style={s.drawerIconBox}><Text style={s.drawerIcon}>{icon}</Text></View>
        <Text style={[s.drawerLabel, signOut && { color: gold }]}>{label}</Text>
        {badge ? <View style={s.drawerBadge}><Text style={s.drawerBadgeTxt}>{badge}</Text></View> : null}
        {!signOut && <Text style={s.drawerChevron}>{'\u203A'}</Text>}
      </TouchableOpacity>
    );
  }

  // ─── Grid Card component ───────────────────────────────────────────────────
  function GridCard({ label, sub, onPress, goldBorder, badge }: { label: string; sub?: string; onPress: () => void; goldBorder?: boolean; badge?: string }) {
    return (
      <TouchableOpacity style={[s.gridCard, { width: cardW }, goldBorder && s.gridCardGold]} onPress={onPress} activeOpacity={0.85}>
        <Text style={s.gridCardLabel}>{label}</Text>
        {sub ? <Text style={s.gridCardSub}>{sub}</Text> : null}
        {badge ? <View style={s.gridBadge}><Text style={s.gridBadgeTxt}>{badge}</Text></View> : null}
      </TouchableOpacity>
    );
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={{flex:1,width:'100%'}} resizeMode="cover">
      <SafeAreaView style={s.safe}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={openDrawer} style={s.avatarWrap}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{initials}</Text></View>
            <Text style={s.avatarChevron}>{'\u25BE'}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Image source={require('../assets/logo.png')} style={s.headerLogo} resizeMode="contain" />
            <Text style={s.headerAppName}>My Maharaj</Text>
            <Text style={s.headerHindi}>{'\u092E\u0947\u0930\u093E \u092E\u0939\u093E\u0930\u093E\u091C'}</Text>
          </View>
          <View style={s.headerRight}>
            <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogo} resizeMode="contain" />
            <Text style={s.bfSub}>consulting</Text>
          </View>
        </View>

        {/* ── INFO BAR ── */}
        <View style={s.infoBar}>
          <Text style={s.infoLeft} numberOfLines={1}>{userCity ? `${userCity}, ${userCountry} \u00B7 ` : ''}{dateTimeStr}</Text>
          <Text style={s.infoRight}>Namaste, {firstName || 'there'}</Text>
        </View>

        {/* ── TICKER ── */}
        <View style={s.ticker}>
          <Text style={s.tickerTxt} numberOfLines={1}>My Maharaj by Blue Flute Consulting \u00B7 Beta \u00B7 Feedback: info@bluefluteconsulting.com</Text>
        </View>

        {/* ── SCROLL CONTENT ── */}
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Lab reminder */}
          {labReminder && (
            <View style={s.labCard}>
              <View style={{flex:1}}>
                <Text style={s.labTitle}>Lab Retest Due</Text>
                <Text style={s.labSub}>{labReminder.name}'s retest due around {labReminder.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setLabReminder(null)} style={{padding:4}}>
                <Text style={{fontSize:14,color:'#92400E',fontWeight:'700'}}>X</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Plan ready card */}
          {planReady && (
            <TouchableOpacity style={s.planReadyCard} onPress={() => router.push('/meal-wizard' as never)} activeOpacity={0.85}>
              <View style={{flex:1}}>
                <Text style={s.planReadyTitle}>This week's plan is ready</Text>
                <Text style={s.planReadySub}>Tap to view your plan</Text>
              </View>
              <TouchableOpacity onPress={() => { setPlanReady(false); AsyncStorage.removeItem('maharaj_plan_ready'); }} style={{padding:4}}>
                <Text style={{fontSize:16,color:'white',fontWeight:'700'}}>X</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Festival banner */}
          {nextFest && (
            <View style={s.festCard}>
              <Text style={s.festIcon}>{nextFest.icon}</Text>
              <View style={{flex:1}}>
                <Text style={s.festName}>{nextFest.name}</Text>
                <Text style={s.festDays}>In {nextFest.daysAway} day{nextFest.daysAway !== 1 ? 's' : ''} \u00B7 {nextFest.dateLabel}</Text>
              </View>
              <View style={{alignItems:'center'}}>
                <Text style={{fontSize:9,color:textSec}}>Plan reminder</Text>
                <Switch value={planReminder} onValueChange={setPlanReminder} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
                {planReminder && <Text style={{fontSize:8,color:gold,fontWeight:'600'}}>48h alert on</Text>}
              </View>
            </View>
          )}

          {/* Hero card */}
          <TouchableOpacity style={s.heroCard} onPress={() => router.push('/meal-wizard' as never)} activeOpacity={0.88}>
            <Text style={s.heroTitle}>Generate Meal Plan</Text>
            <Text style={s.heroSub}>Smart weekly planning for your family</Text>
          </TouchableOpacity>

          {/* Grid Row 1 */}
          <View style={s.gridRow}>
            <GridCard label="Meal Prep" onPress={() => router.push('/meal-prep' as never)} />
            <GridCard label="My Fridge" onPress={() => router.push('/my-fridge' as never)} />
          </View>

          {/* Grid Row 2 */}
          <View style={s.gridRow}>
            <GridCard label="Party Menu" onPress={() => router.push('/party-menu' as never)} goldBorder />
            <GridCard label="Outdoor Catering" onPress={() => router.push('/outdoor-catering' as never)} goldBorder />
          </View>

          {/* Grid Row 3 */}
          <View style={s.gridRow}>
            <GridCard label="Trending Recipes" sub="YouTube picks" badge="Coming Soon" onPress={() => Alert.alert('Coming Soon', 'Maharaj is learning and will connect you soon')} />
            <GridCard label="Consult Specialist" sub="Book a referral" badge="Coming Soon" onPress={() => Alert.alert('Coming Soon', 'Maharaj is learning and will connect you soon')} />
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerLine1}>Powered by Blue Flute Consulting LLC-FZ</Text>
            <Text style={s.footerLine2}>www.bluefluteconsulting.com \u00B7 info@bluefluteconsulting.com</Text>
          </View>
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity style={s.fab} onPress={() => router.push('/ask-maharaj' as never)} activeOpacity={0.88}>
          <View style={s.fabLabelWrap}><Text style={s.fabLabel}>Ask Maharaj</Text></View>
          <View style={s.fabCircle}>
            <Image source={require('../assets/logo.png')} style={s.fabIcon} resizeMode="contain" />
          </View>
        </TouchableOpacity>

        {/* ── DRAWER OVERLAY ── */}
        {isDrawerOpen && (
          <TouchableOpacity style={s.drawerOverlay} activeOpacity={1} onPress={closeDrawer}>
            <Animated.View style={[s.drawer, { transform: [{ translateX: drawerAnim }] }]}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                {/* Drawer header */}
                <View style={s.drawerHeader}>
                  <View style={s.drawerAvatar}><Text style={s.drawerAvatarTxt}>{initials}</Text></View>
                  <Text style={s.drawerName}>{firstName || 'User'}</Text>
                  <Text style={s.drawerEmail}>{email}</Text>
                </View>

                <ScrollView style={{maxHeight:'80%'}}>
                  <Text style={s.drawerSection}>PROFILE</Text>
                  <DrawerRow icon={'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67'} label="Family Profile" onPress={() => { closeDrawer(); router.push('/dietary-profile' as never); }} />
                  <DrawerRow icon={'\u2699\uFE0F'} label="Settings" onPress={() => { closeDrawer(); Alert.alert('Coming soon'); }} />

                  <Text style={s.drawerSection}>MY PLANS</Text>
                  <DrawerRow icon={'\uD83D\uDCCB'} label="Menu History" onPress={() => { closeDrawer(); router.push('/menu-history' as never); }} />

                  <Text style={s.drawerSection}>EXPLORE</Text>
                  <DrawerRow icon={'\uD83C\uDF7D\uFE0F'} label="Table Etiquettes" badge="Soon" onPress={() => { closeDrawer(); router.push('/table-etiquettes' as never); }} />
                  <DrawerRow icon={'\uD83C\uDFA8'} label="Traditional Plating" badge="Soon" onPress={() => { closeDrawer(); router.push('/traditional-plating' as never); }} />

                  <Text style={s.drawerSection}>SUPPORT</Text>
                  <DrawerRow icon={'\uD83D\uDCE7'} label="Feedback" onPress={() => { closeDrawer(); Linking.openURL('mailto:info@bluefluteconsulting.com'); }} />
                  <DrawerRow icon={'\u2139\uFE0F'} label="About My Maharaj" onPress={() => { closeDrawer(); Alert.alert('My Maharaj', 'AI-powered family meal planner by Blue Flute Consulting LLC-FZ, Dubai, UAE.\n\nVersion 1.0\nwww.bluefluteconsulting.com'); }} />
                  <DrawerRow icon={'\uD83D\uDD12'} label="Privacy Policy" onPress={() => { closeDrawer(); setPrivacyVisible(true); }} />
                  <DrawerRow icon={'\uD83D\uDEAA'} label="Sign Out" signOut onPress={doSignOut} />
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* ── PRIVACY MODAL ── */}
        <Modal visible={privacyVisible} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>Privacy Policy</Text>
              <ScrollView style={{maxHeight:400}}>
                <Text style={s.modalBody}>
                  Maharaj collects your family profile, health conditions, dietary preferences and lab report data solely to personalise your meal plans. Your data is stored securely and encrypted. We do not sell, share or transfer your personal data to third parties. Health data is processed in accordance with UAE Personal Data Protection Law (PDPL). You may request a full export or deletion of your data at any time by writing to info@bluefluteconsulting.com. AI-generated meal plans are recommendations only and do not constitute medical advice.{'\n\n'}Blue Flute Consulting LLC-FZ, Dubai, UAE
                </Text>
              </ScrollView>
              <TouchableOpacity style={s.modalClose} onPress={() => setPrivacyVisible(false)}>
                <Text style={s.modalCloseTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;

const s = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(27,58,92,0.1)',
  },
  avatarWrap: { alignItems: 'center', width: 44 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: gold, fontSize: 15, fontWeight: '800' },
  avatarChevron: { fontSize: 10, color: textSec, marginTop: 1 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerLogo: { width: 120, height: 40 },
  headerAppName: { fontSize: 10, fontWeight: '700', color: navy, marginTop: -2 },
  headerHindi: { fontSize: 8, color: textSec },
  headerRight: { alignItems: 'center', width: 80 },
  bfLogo: { width: 72, height: 24 },
  bfSub: { fontSize: 7, color: textSec, marginTop: 1 },

  // Info bar
  infoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.7)' },
  infoLeft: { fontSize: 10, color: textSec, flex: 1 },
  infoRight: { fontSize: 12, fontWeight: '700', color: navy },

  // Ticker
  ticker: { backgroundColor: navy, paddingVertical: 4, paddingHorizontal: 14 },
  tickerTxt: { fontSize: 11, color: gold, fontWeight: '600' },

  // Scroll
  scroll: { padding: 14, paddingBottom: 90 },

  // Lab reminder
  labCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)' },
  labTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  labSub: { fontSize: 12, color: '#78350F', lineHeight: 18 },

  // Plan ready
  planReadyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', borderRadius: 12, padding: 14, marginBottom: 10 },
  planReadyTitle: { fontSize: 14, fontWeight: '700', color: white },
  planReadySub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Festival
  festCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: gold, gap: 10 },
  festIcon: { fontSize: 28 },
  festName: { fontSize: 14, fontWeight: '700', color: navy },
  festDays: { fontSize: 12, color: textSec },

  // Hero
  heroCard: { backgroundColor: navy, borderRadius: 16, padding: 20, marginBottom: 12 },
  heroTitle: { fontSize: 16, fontWeight: '700', color: white, marginBottom: 4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  // Grid
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  gridCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(27,58,92,0.08)', minHeight: 70, justifyContent: 'center' },
  gridCardGold: { borderLeftWidth: 2, borderLeftColor: gold },
  gridCardLabel: { fontSize: 13, fontWeight: '700', color: navy },
  gridCardSub: { fontSize: 11, color: textSec, marginTop: 2 },
  gridBadge: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  gridBadgeTxt: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },

  // Footer
  footer: { backgroundColor: navy, borderRadius: 12, padding: 14, marginTop: 8, alignItems: 'center' },
  footerLine1: { fontSize: 10, color: gold, fontWeight: '600', textAlign: 'center' },
  footerLine2: { fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 3 },

  // FAB
  fab: { position: 'absolute', bottom: 20, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fabLabelWrap: { backgroundColor: 'rgba(27,58,92,0.9)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  fabLabel: { fontSize: 11, fontWeight: '700', color: white },
  fabCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: navy, alignItems: 'center', justifyContent: 'center', shadowColor: navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabIcon: { width: 28, height: 28 },

  // Drawer overlay
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: SCREEN_W * 0.75, backgroundColor: white, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  drawerHeader: { backgroundColor: navy, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
  drawerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  drawerAvatarTxt: { fontSize: 22, fontWeight: '800', color: gold },
  drawerName: { fontSize: 16, fontWeight: '700', color: white },
  drawerEmail: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  drawerSection: { fontSize: 10, fontWeight: '700', color: textSec, letterSpacing: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, gap: 12 },
  drawerIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  drawerIcon: { fontSize: 14 },
  drawerLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: navy },
  drawerChevron: { fontSize: 16, color: '#D1D5DB' },
  drawerBadge: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  drawerBadgeTxt: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },

  // Privacy modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: white, borderRadius: 16, padding: 24, width: '88%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: navy, marginBottom: 12 },
  modalBody: { fontSize: 13, color: '#374151', lineHeight: 22 },
  modalClose: { backgroundColor: navy, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  modalCloseTxt: { color: white, fontWeight: '700', fontSize: 14 },
});
