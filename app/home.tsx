import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, textSec, border, mint } from '../theme/colors';
import { useLang } from '../lib/LanguageProvider';

// ─── Festival data (verified 2026 dates) ─────────────────────────────────────

const FESTIVALS = [
  { name: 'Ram Navami',       date: '2026-03-26' },
  { name: 'Baisakhi',         date: '2026-04-13' },
  { name: 'Akshaya Tritiya',  date: '2026-04-19' },
  { name: 'Eid al-Adha',      date: '2026-05-27' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan',   date: '2026-08-28' },
  { name: 'Janmashtami',      date: '2026-09-04' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14' },
  { name: 'Navratri',         date: '2026-10-11' },
  { name: 'Dussehra',         date: '2026-10-20' },
  { name: 'Diwali',           date: '2026-11-08' },
  { name: 'Bhai Dooj',        date: '2026-11-11' },
  { name: 'Christmas',        date: '2026-12-25' },
];

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getNextFestival() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const f of FESTIVALS) {
    const d = parseLocalDate(f.date);
    if (d >= today) {
      return { name: f.name, daysAway: Math.ceil((d.getTime() - today.getTime()) / 86400000) };
    }
  }
  return null;
}

// ─── DateTime ─────────────────────────────────────────────────────────────────

const WDAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDateTime(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${WDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}  ·  ${h}:${m} ${ap}`;
}

// ─── Card definitions ─────────────────────────────────────────────────────────

const CARDS = [
  { id:'festivals',  icon:'🪔', titleKey:'festivals' as const,        route:'/festivals',           accent:'#B8860B', iconBg:'#FFF8E1' },
  { id:'dietary',    icon:'🥗', title:'Dietary Profile',    route:'/dietary-profile',     accent:'#1A6B5C', iconBg:'#E8F5E9' },
  { id:'mealplan',   icon:'🍳', title:'Generate Meal Plan', route:'/meal-wizard',         accent:'#1B3A5C', iconBg:'#E3F2FD' },
  { id:'party',      icon:'🎉', title:'Party Menu',         route:'/party-menu',          accent:'#8B1A1A', iconBg:'#FFEBEE' },
  { id:'outdoor',    icon:'🏕️', title:'Outdoor Catering',   route:'/outdoor-catering',    accent:'#1A6B5C', iconBg:'#E8F5E9' },
  { id:'history',    icon:'📋', title:'Menu History',       route:'/menu-history',        accent:'#6A1B9A', iconBg:'#F3E5F5' },
  { id:'etiquettes', icon:'🍽️', title:'Table Etiquettes',   route:'/table-etiquettes',    accent:'#C9A227', iconBg:'#FFF8E1' },
  { id:'plating',    icon:'🎨', title:'Traditional Plating',route:'/traditional-plating', accent:'#2E7D32', iconBg:'#E8F5E9' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t, lang, toggleEnglish, isEnglish } = useLang();
  const { width } = useWindowDimensions();
  const isWide    = width >= 768;
  // On wide screens 4-col, on narrow 2-col
  const cols      = isWide ? 4 : 2;
  const gap       = 12;
  const cardW     = (width - 32 - gap * (cols - 1)) / cols;

  const [firstName,   setFirstName]   = useState('');
  const [initials,    setInitials]    = useState('?');
  const [dateTimeStr, setDateTimeStr] = useState(formatDateTime(new Date()));
  const [showExit,    setShowExit]    = useState(false);

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
      setInitials(first ? first[0].toUpperCase() : (user.email?.[0]?.toUpperCase() ?? '?'));
    }
    void load();
  }, []);

  async function doLogout() {
    setShowExit(false);
    await supabase.auth.signOut();
    router.replace('/');
  }

  function getCardDesc(id: string): string {
    if (id === 'festivals') {
      const nf = getNextFestival();
      if (!nf) return t.upcomingCelebrations;
      if (nf.daysAway === 0) return 'Today! 🎉';
      if (nf.daysAway === 1) return nf.name + ' tomorrow';
      return nf.name + ' in ' + nf.daysAway + 'd';
    }
    const descs: Record<string, string> = {
      dietary:    t.healthAndCuisines,
      mealplan:   t.aiPoweredWeeklyPlan,
      party:      t.planYourGathering,
      outdoor:    t.eventsAndPicnics,
      history:    t.pastMealPlans,
      etiquettes: t.diningTraditions,
      plating:    t.presentFoodBeautifully,
      fridge:     'My Fridge',
      labreport:  'Lab Report',
    };
    return descs[id] ?? '';
  }

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={s.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={s.safe}>

        {/* ── Logout overlay ── */}
        {showExit && (
          <View style={s.overlay}>
            <View style={s.overlayBox}>
              <Text style={s.overlayTitle}>Logout</Text>
              <Text style={s.overlaySub}>Are you sure you want to logout?</Text>
              <View style={s.overlayBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setShowExit(false)}>
                  <Text style={s.btnCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={doLogout}>
                  <Text style={s.btnConfirmTxt}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>

          <Image
            source={require('../assets/logo.png')}
            style={s.mmLogo}
            resizeMode="contain"
          />

          <View style={s.headerRight}>
            {lang !== 'en' && (
              <TouchableOpacity onPress={toggleEnglish}
                style={[s.langBtn, isEnglish && s.langBtnActive]}>
                <Text style={[s.langBtnTxt, isEnglish && s.langBtnTxtActive]}>EN</Text>
              </TouchableOpacity>
            )}
            <Image
              source={require('../assets/blueflute-logo.png')}
              style={s.bfLogo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={() => setShowExit(true)} style={s.exitBtn}>
              <Text style={s.exitTxt}>{t.exit}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Date bar ── */}
        <View style={s.dateBar}>
          <Text style={s.dateTxt}>{dateTimeStr}</Text>
          {firstName ? <Text style={s.greetTxt}>{t.namaste}, {firstName} 🙏</Text> : null}
        </View>

        {/* ── Card grid ── */}
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.grid, { gap }]}>
            {CARDS.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[s.card, { width: cardW }]}
                onPress={() => router.push(card.route as never)}
                activeOpacity={0.82}
              >
                <View style={[s.iconWrap, { backgroundColor: card.iconBg }]}>
                  <Text style={s.iconEmoji}>{card.icon}</Text>
                </View>
                <Text style={[s.cardTitle, { color: card.accent }]} numberOfLines={2}>
                  {(t as any)[card.id] ?? card.id}
                </Text>
                <Text style={s.cardDesc} numberOfLines={2}>{getCardDesc(card.id)}</Text>
                <View style={[s.accentBar, { backgroundColor: card.accent }]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <View style={s.footerLine} />
            <Image
              source={require('../assets/blueflute-logo.png')}
              style={s.footerLogo}
              resizeMode="contain"
            />
            <Text style={s.footerName}>Powered by Blue Flute Consulting LLC-FZ</Text>
            <Text style={s.footerUrl}>www.bluefluteconsulting.com</Text>
          </View>
        </ScrollView>

        {/* ── Ask Maharaj FAB ── */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/ask-maharaj' as never)}
          activeOpacity={0.88}
        >
          <Text style={s.fabIcon}>🧠</Text>
          <Text style={s.fabLabel}>{t.askMaharajAI}</Text>
          <Text style={s.fabMic}>🎙️</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bg:   { flex: 1 },
  safe: { flex: 1 },

  overlay: {
    position:'absolute', top:0, left:0, right:0, bottom:0,
    backgroundColor:'rgba(0,0,0,0.45)', zIndex:999,
    alignItems:'center', justifyContent:'center',
  },
  overlayBox: {
    backgroundColor:white, borderRadius:20, padding:28, width:300,
    shadowColor:'#000', shadowOffset:{width:0,height:8},
    shadowOpacity:0.15, shadowRadius:20, elevation:10,
  },
  overlayTitle: { fontSize:18, fontWeight:'800', color:navy, marginBottom:8 },
  overlaySub:   { fontSize:14, color:textSec, marginBottom:24, lineHeight:20 },
  overlayBtns:  { flexDirection:'row', gap:12 },
  btnCancel:    { flex:1, borderWidth:1.5, borderColor:border, borderRadius:12, paddingVertical:12, alignItems:'center' },
  btnCancelTxt: { fontSize:14, color:navy, fontWeight:'600' },
  btnConfirm:   { flex:1, backgroundColor:'#DC2626', borderRadius:12, paddingVertical:12, alignItems:'center' },
  btnConfirmTxt:{ fontSize:14, color:white, fontWeight:'700' },

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:16,
    paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom:10,
    backgroundColor:'rgba(255,255,255,0.80)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.1)',
  },
  avatar:    { width:38, height:38, borderRadius:19, backgroundColor:navy, alignItems:'center', justifyContent:'center' },
  avatarTxt: { color:gold, fontSize:15, fontWeight:'800' },
  mmLogo:    { width:120, height:40 },
  headerRight:{ flexDirection:'row', alignItems:'center', gap:8 },
  bfLogo:    { width:110, height:42 },
  langBtn:        { paddingHorizontal:8, paddingVertical:4, borderRadius:8, borderWidth:1.5, borderColor:'rgba(27,58,92,0.3)', backgroundColor:'rgba(255,255,255,0.8)' },
  langBtnActive:  { backgroundColor:'#1B3A5C', borderColor:'#1B3A5C' },
  langBtnTxt:     { fontSize:11, fontWeight:'700', color:'#1B3A5C' },
  langBtnTxtActive: { color:'#FFFFFF' },
  exitBtn:   { paddingHorizontal:10, paddingVertical:6, borderRadius:8, borderWidth:1.5, borderColor:'rgba(27,58,92,0.25)' },
  exitTxt:   { fontSize:13, color:navy, fontWeight:'600' },

  dateBar: {
    flexDirection:'row', justifyContent:'space-between', alignItems:'center',
    paddingHorizontal:16, paddingVertical:8,
    backgroundColor:'rgba(255,255,255,0.65)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.08)',
  },
  dateTxt:  { fontSize:12, color:navy, fontWeight:'600' },
  greetTxt: { fontSize:12, color:'#1A6B5C', fontWeight:'500' },

  scroll: { padding:16 },

  grid: { flexDirection:'row', flexWrap:'wrap' },

  card: {
    backgroundColor:'rgba(255,255,255,0.88)',
    borderRadius:18, padding:14, marginBottom:12,
    shadowColor:'#1B3A5C',
    shadowOffset:{width:0,height:3},
    shadowOpacity:0.09,
    shadowRadius:10,
    elevation:3,
    overflow:'hidden',
    borderWidth:1,
    borderColor:'rgba(180,220,220,0.45)',
  },
  iconWrap:  { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center', marginBottom:10 },
  iconEmoji: { fontSize:24 },
  cardTitle: { fontSize:13, fontWeight:'800', marginBottom:4, lineHeight:18 },
  cardDesc:  { fontSize:11, color:textSec, lineHeight:16 },
  accentBar: { position:'absolute', bottom:0, left:0, right:0, height:3 },

  footer:      { alignItems:'center', paddingVertical:20, marginTop:4 },
  footerLine:  { height:1, backgroundColor:'rgba(27,58,92,0.12)', width:'100%', marginBottom:14 },
  footerLogo:  { width:88, height:28, marginBottom:6 },
  footerName:  { fontSize:11, color:textSec, fontWeight:'600', letterSpacing:0.2 },
  footerUrl:   { fontSize:10, color:'#1A6B5C', marginTop:2, fontWeight:'500' },

  fab: {
    position:'absolute',
    bottom: Platform.OS === 'web' ? 20 : 28,
    left:16, right:16,
    backgroundColor:navy,
    borderRadius:30,
    flexDirection:'row',
    alignItems:'center',
    paddingVertical:15,
    paddingHorizontal:20,
    gap:10,
    shadowColor:navy,
    shadowOffset:{width:0,height:6},
    shadowOpacity:0.4,
    shadowRadius:16,
    elevation:8,
  },
  fabIcon:  { fontSize:20 },
  fabLabel: { flex:1, fontSize:15, fontWeight:'800', color:white, textAlign:'center', textAlignVertical:'center' },
  fabMic:   { fontSize:20 },
});
