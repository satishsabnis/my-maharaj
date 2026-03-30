import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, ImageBackground, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { loadOrDetectLocation } from '../lib/location';
import { navy, gold, white, textSec, border } from '../theme/colors';

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

function formatDateTime(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${WDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}  ·  ${h}:${m} ${ap}`;
}

// ─── Card definitions ─────────────────────────────────────────────────────────

// Special card - full width
const HERO_CARD = { id:'mealplan', icon:'🍳', title:'Generate Meal Plan', desc:'Smart weekly meal planning for your family', route:'/meal-wizard', accent:'#1B3A5C', iconBg:'#E3F2FD' };

const CARDS = [
  { id:'festivals',  icon:'🪔', title:'Festivals',          desc:'Upcoming celebrations',    route:'/festivals',           accent:'#B8860B', iconBg:'#FFF8E1' },
  { id:'mealprep',   icon:'🥘', title:'Meal Prep',          desc:'Prep guide & batch cook',   route:'/meal-prep',           accent:'#1A6B5C', iconBg:'#E8F5E9' },
  { id:'party',      icon:'🎉', title:'Party Menu',         desc:'Plan your gathering',       route:'/party-menu',          accent:'#8B1A1A', iconBg:'#FFEBEE' },
  { id:'outdoor',    icon:'🏕️', title:'Outdoor Catering',   desc:'Events & picnics',          route:'/outdoor-catering',    accent:'#1A6B5C', iconBg:'#E8F5E9' },
  { id:'fridge',     icon:'🧊', title:'My Fridge',          desc:'Inventory & bill scanning', route:'/my-fridge',           accent:'#0369A1', iconBg:'#E0F2FE' },
  { id:'etiquettes', icon:'🍽️', title:'Table Etiquettes',   desc:'Dining traditions',         route:'/table-etiquettes',    accent:'#C9A227', iconBg:'#FFF8E1' },
  { id:'plating',    icon:'🎨', title:'Traditional Plating',desc:'Present food beautifully',  route:'/traditional-plating', accent:'#2E7D32', iconBg:'#E8F5E9' },
  { id:'history',    icon:'📋', title:'Menu History',       desc:'Past meal plans',           route:'/menu-history',        accent:'#6A1B9A', iconBg:'#F3E5F5' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const cols  = width >= 768 ? 4 : 2;
  const gap   = 12;
  const cardW = (width - 32 - gap * (cols - 1)) / cols;

  const [firstName,   setFirstName]   = useState('');
  const [initials,    setInitials]    = useState('?');
  const [dateTimeStr, setDateTimeStr] = useState(formatDateTime(new Date()));
  const [showExit,    setShowExit]    = useState(false);
  const [userCity,    setUserCity]    = useState('');
  const [labReminder, setLabReminder] = useState<{name:string;date:string}|null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickerX = useRef(new Animated.Value(-800)).current;

  useEffect(() => {
    timerRef.current = setInterval(() => setDateTimeStr(formatDateTime(new Date())), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(tickerX, {
        toValue: 0,
        duration: 15000,
        useNativeDriver: true,
      })
    );
    tickerX.setValue(-800);
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    async function load() {
      const user = await getSessionUser();
      if (!user) return;
      const name = (user.user_metadata?.full_name ?? user.email ?? '') as string;
      const first = name.split(' ')[0];
      setFirstName(first);
      setInitials(first ? first[0].toUpperCase() : (user.email?.[0]?.toUpperCase() ?? '?'));

      // Check lab report reminders
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
    }
    void load();
    loadOrDetectLocation().then(loc => setUserCity(`${loc.city}, ${loc.country}`));
  }, []);

  async function doLogout() {
    setShowExit(false);
    await supabase.auth.signOut();
    router.replace('/');
  }

  function getCardDesc(id: string, staticDesc: string): string {
    if (id === 'festivals') {
      const nf = getNextFestival();
      if (!nf) return 'All festivals';
      if (nf.daysAway === 0) return 'Today! 🎉';
      if (nf.daysAway === 1) return nf.name + ' tomorrow';
      return nf.name + ' in ' + nf.daysAway + 'd';
    }
    return staticDesc;
  }

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={s.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={s.safe}>

        {/* Exit overlay */}
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

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setShowMenu(v => !v)} style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </TouchableOpacity>

          <Image
            source={require('../assets/logo.png')}
            style={s.mmLogo}
            resizeMode="contain"
          />

          <View style={s.headerRight}>
            <Image
              source={require('../assets/blueflute-logo.png')}
              style={s.bfLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {showMenu && (
          <TouchableOpacity style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:998}} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={{position:'absolute',top: 70,left:16,backgroundColor:'white',borderRadius:14,paddingVertical:8,width:220,zIndex:999,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.15,shadowRadius:12,elevation:10,borderWidth:1,borderColor:'rgba(27,58,92,0.1)'}}>
              {[
                {label:'Edit Profile',route:'/profile-setup'},
                {label:'Family Profile',route:'/dietary-profile'},
                {label:'Lab Reports',route:'/lab-report'},
                {label:'Cuisine Preferences',route:'/cuisine-selection'},
                {label:'Legal & Privacy',route:'/disclaimer'},
              ].map(item => (
                <TouchableOpacity key={item.label} style={{paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={() => { setShowMenu(false); router.push(item.route as never); }}>
                  <Text style={{fontSize:14,color:navy,fontWeight:'500'}}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{paddingHorizontal:16,paddingVertical:12}} onPress={() => { setShowMenu(false); setShowExit(true); }}>
                <Text style={{fontSize:14,color:'#DC2626',fontWeight:'600'}}>Exit / Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Date bar */}
        <View style={s.dateBar}>
          <Text style={s.dateTxt}>{userCity ? `${userCity}  ·  ` : ''}{dateTimeStr}</Text>
          {firstName ? <Text style={s.greetTxt}>Namaste, {firstName} 🙏</Text> : null}
        </View>

        {labReminder && (
          <View style={{flexDirection:'row',alignItems:'center',marginHorizontal:16,marginTop:8,backgroundColor:'rgba(217,119,6,0.1)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(217,119,6,0.3)'}}>
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#92400E'}}>Lab Retest Due</Text>
              <Text style={{fontSize:12,color:'#78350F',lineHeight:18}}>{labReminder.name}'s retest due around {labReminder.date}</Text>
            </View>
            <TouchableOpacity onPress={() => setLabReminder(null)} style={{padding:4}}>
              <Text style={{fontSize:14,color:'#92400E',fontWeight:'700'}}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{backgroundColor:'#F59E0B',overflow:'hidden',paddingVertical:4}}>
          <Animated.Text style={{fontSize:11,color:'#FFFFFF',fontWeight:'600',width:1200,transform:[{translateX:tickerX}]}}>
            {'  This prototype is under testing phase · My Maharaj by Blue Flute Consulting · Feedback: info@bluefluteconsulting.com · Feedback welcome ·  This prototype is under testing phase · My Maharaj by Blue Flute Consulting · Feedback: info@bluefluteconsulting.com · Feedback welcome ·  '}
          </Animated.Text>
        </View>

        {/* Card grid */}
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card - Generate Meal Plan - full width, stands out */}
          <TouchableOpacity
            style={s.heroCard}
            onPress={() => router.push(HERO_CARD.route as never)}
            activeOpacity={0.88}
          >
            <View style={s.heroCardLeft}>
              <Text style={s.heroCardIcon}>{HERO_CARD.icon}</Text>
              <View>
                <Text style={s.heroCardTitle}>{HERO_CARD.title}</Text>
                <Text style={s.heroCardDesc}>{HERO_CARD.desc}</Text>
              </View>
            </View>
            <Text style={s.heroCardArrow}>›</Text>
          </TouchableOpacity>

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
                  {card.title}
                </Text>
                <Text style={s.cardDesc} numberOfLines={2}>
                  {getCardDesc(card.id, card.desc)}
                </Text>
                <View style={[s.accentBar, { backgroundColor: card.accent }]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer - compact single row */}
          <View style={s.footer}>
            <Image source={require('../assets/blueflute-logo.png')} style={s.footerLogo} resizeMode="contain" />
            <Text style={s.footerName}>Blue Flute Consulting LLC-FZ  ·  www.bluefluteconsulting.com</Text>
          </View>
        </ScrollView>

        {/* Ask Maharaj FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/ask-maharaj' as never)}
          activeOpacity={0.88}
        >
          <Image source={require('../assets/logo.png')} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="contain" />
          <Text style={s.fabLabel}>Ask Maharaj AI</Text>
          <Text style={s.fabMic}>Mic</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bg:   { flex: 1 },
  safe: { flex: 1 },

  overlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.45)', zIndex:999, alignItems:'center', justifyContent:'center' },
  overlayBox: { backgroundColor:white, borderRadius:20, padding:28, width:300, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:20, elevation:10 },
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
    paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 12 : 6,
    paddingBottom:10,
    backgroundColor:'rgba(255,255,255,0.80)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.1)',
  },
  avatar:    { width:38, height:38, borderRadius:19, backgroundColor:navy, alignItems:'center', justifyContent:'center' },
  avatarTxt: { color:gold, fontSize:15, fontWeight:'800' },
  mmLogo:    { width:180, height:62 },
  headerRight:{ flexDirection:'row', alignItems:'center', gap:8 },
  bfLogo:    { width:130, height:44 },
  dateBar: {
    flexDirection:'row', justifyContent:'space-between', alignItems:'center',
    paddingHorizontal:16, paddingVertical:8,
    backgroundColor:'rgba(255,255,255,0.65)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.08)',
  },
  dateTxt:  { fontSize:12, color:navy, fontWeight:'600' },
  greetTxt: { fontSize:12, color:'#1A6B5C', fontWeight:'500' },

  scroll: { padding:16 },
  heroCard:      { backgroundColor:'#1B3A5C', borderRadius:20, padding:14, maxHeight:80, marginBottom:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between', shadowColor:'#1B3A5C', shadowOffset:{width:0,height:6}, shadowOpacity:0.4, shadowRadius:16, elevation:8 },
  heroCardLeft:  { flexDirection:'row', alignItems:'center', gap:16, flex:1 },
  heroCardIcon:  { fontSize:28 },
  heroCardTitle: { fontSize:15, fontWeight:'800', color:'#FFFFFF', marginBottom:4 },
  heroCardDesc:  { fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:18 },
  heroCardArrow: { fontSize:28, color:'rgba(255,255,255,0.6)', fontWeight:'300' },

  grid:   { flexDirection:'row', flexWrap:'wrap' },

  card: {
    backgroundColor:'rgba(255,255,255,0.88)',
    borderRadius:18, padding:10, maxHeight:100, marginBottom:12,
    shadowColor:'#1B3A5C', shadowOffset:{width:0,height:3},
    shadowOpacity:0.09, shadowRadius:10, elevation:3,
    overflow:'hidden', borderWidth:1, borderColor:'rgba(180,220,220,0.45)',
  },
  iconWrap:  { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center', marginBottom:6 },
  iconEmoji: { fontSize:18 },
  cardTitle: { fontSize:12, fontWeight:'800', marginBottom:4, lineHeight:18 },
  cardDesc:  { fontSize:10, color:textSec, lineHeight:16 },
  accentBar: { position:'absolute', bottom:0, left:0, right:0, height:3 },

  footer:      { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, paddingVertical:10, marginTop:4, borderTopWidth:1, borderTopColor:'rgba(27,58,92,0.08)', backgroundColor:'rgba(255,255,255,0.6)' },
  footerLine:  { display:'none' } as any,
  footerLogo:  { width:70, height:24 },
  footerName:  { fontSize:10, color:textSec, fontWeight:'600' },
  footerUrl:   { fontSize:10, color:'#1A6B5C', fontWeight:'500' },

  fab: {
    position:'absolute', bottom: Platform.OS === 'web' ? 20 : 28,
    left:16, right:16, backgroundColor:navy, borderRadius:30,
    flexDirection:'row', alignItems:'center',
    paddingVertical:15, paddingHorizontal:20, gap:10,
    shadowColor:navy, shadowOffset:{width:0,height:6},
    shadowOpacity:0.4, shadowRadius:16, elevation:8,
  },
  fabIcon:  { width:36, height:36 },
  fabLabel: { flex:1, fontSize:15, fontWeight:'800', color:white, textAlign:'center' },
  fabMic:   { fontSize:20 },
});
