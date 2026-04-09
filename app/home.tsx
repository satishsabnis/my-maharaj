import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Easing, Image, ImageBackground, Linking, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { colors, cards } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

// ─── Time greeting ───────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [firstName, setFirstName] = useState('');
  const [initials, setInitials] = useState('?');
  const [email, setEmail] = useState('');
  const [userCity, setUserCity] = useState('Dubai');
  const [maharajDay, setMaharajDay] = useState('Saturday');
  const [hasWeekPlan, setHasWeekPlan] = useState(false);
  const [planDayX, setPlanDayX] = useState(0);
  const [planDayY, setPlanDayY] = useState(0);
  const [occasions, setOccasions] = useState<{name:string;day:string;people:string}[]>([]);
  const [mealPrepCount, setMealPrepCount] = useState(0);
  const [todayMeals, setTodayMeals] = useState<{breakfast:string;lunch:string;dinner:string}|null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const drawerAnim = useRef(new Animated.Value(-SCREEN_W * 0.75)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollAnim = useRef(new Animated.Value(SCREEN_W)).current;
  const [tickerTextWidth, setTickerTextWidth] = useState(0);

  // Ticker scroll animation — starts after text is measured
  useEffect(() => {
    if (tickerTextWidth === 0) return;
    scrollAnim.setValue(SCREEN_W);
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -tickerTextWidth,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    return () => scrollAnim.stopAnimation();
  }, [tickerTextWidth]);

  // Pulse animation — infinite loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      { iterations: -1 }
    ).start();
  }, []);

  // Load data
  useEffect(() => {
    async function load() {
      const user = await getSessionUser();
      if (user) {
        const name = (user.user_metadata?.full_name ?? user.email ?? '') as string;
        const first = name.split(' ')[0];
        setFirstName(first);
        setInitials(first ? first[0].toUpperCase() : (user.email?.[0]?.toUpperCase() ?? '?'));
        setEmail(user.email ?? '');
      }

      const [md, cwp, occ, prep] = await Promise.all([
        AsyncStorage.getItem('maharaj_day'),
        AsyncStorage.getItem('confirmed_meal_plan'),
        AsyncStorage.getItem('recurring_occasions'),
        AsyncStorage.getItem('meal_prep_tasks'),
      ]);
      if (md) setMaharajDay(md);
      if (cwp) {
        try {
          const plan = JSON.parse(cwp);
          if (Array.isArray(plan) && plan.length > 0) {
            setHasWeekPlan(true);
            const today = new Date().toISOString().split('T')[0];
            const dayIdx = plan.findIndex((d: any) => d.date >= today);
            setPlanDayX(dayIdx >= 0 ? dayIdx + 1 : plan.length);
            setPlanDayY(plan.length);
            const todayPlan = plan.find((d: any) => d.date === today);
            if (todayPlan) {
              setTodayMeals({
                breakfast: todayPlan.breakfast?.name || '',
                lunch: todayPlan.lunch?.name || '',
                dinner: todayPlan.dinner?.name || '',
              });
            }
          }
        } catch {}
      }
      if (occ) try { setOccasions(JSON.parse(occ)); } catch {}
      if (prep) try { const tasks = JSON.parse(prep); setMealPrepCount(Array.isArray(tasks) ? tasks.length : 0); } catch {}
    }
    void load();
  }, []);

  // Drawer
  function openDrawer() {
    setIsDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }
  function closeDrawer() {
    Animated.timing(drawerAnim, { toValue: -SCREEN_W * 0.75, duration: 200, useNativeDriver: true }).start(() => setIsDrawerOpen(false));
  }
  async function doSignOut() {
    closeDrawer();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function DrawerRow({ label, onPress, signOut }: { label: string; onPress: () => void; signOut?: boolean }) {
    return (
      <TouchableOpacity style={s.drawerRow} onPress={onPress} activeOpacity={0.7}>
        <Text style={[s.drawerLabel, signOut && { color: colors.gold }]}>{label}</Text>
        {!signOut && <Text style={s.drawerChevron}>{'\u203A'}</Text>}
      </TouchableOpacity>
    );
  }

  // ── Feed card logic ────────────────────────────────────────────────────────

  const now = new Date();
  const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  const hour = now.getHours();

  const MAHARAJ_TIPS = [
    'Soak your dal overnight — it cooks faster and is easier to digest.',
    'Use the water used to wash rice when kneading dough for softer rotis.',
    'A pinch of hing in dal enhances flavour and aids digestion.',
    'Marinate chicken overnight in curd and spices for deeper flavour.',
    'Add jeera to hot ghee first — it unlocks full flavour before other spices.',
    'Wrap fresh coriander in a damp cloth and refrigerate to keep it fresh for a week.',
    'Dried curry leaves freeze beautifully — add directly to tempering from frozen.',
  ];
  const tipOfDay = MAHARAJ_TIPS[now.getDay()];

  type FeedCard = { type: string; bg: object; borderColor: string; label: string; labelColor: string; title: string; sub?: string; buttons: { text: string; style: 'emerald'|'navy'|'outline'; onPress: () => void }[] };
  const feedCards: FeedCard[] = [];

  // Card A — Today's Plan (always shown)
  const todayPlanTitle = todayMeals
    ? [todayMeals.breakfast, todayMeals.lunch, todayMeals.dinner].filter(Boolean).join('  ·  ')
    : hasWeekPlan ? 'No meals planned for today' : 'No plan this week — tap to create one';
  feedCards.push({
    type: 'today-plan', bg: { backgroundColor: colors.frostedNavy, borderLeftWidth: 3, borderLeftColor: colors.navy },
    borderColor: colors.navy, label: "Today's plan", labelColor: colors.navy,
    title: todayPlanTitle,
    buttons: [{ text: hasWeekPlan ? 'View Plan' : 'Plan Week', style: 'navy', onPress: () => router.push('/meal-wizard' as never) }],
  });

  // Card B — Daily Tip (always shown)
  feedCards.push({
    type: 'daily-tip', bg: { backgroundColor: colors.frostedGreen },
    borderColor: colors.emerald, label: 'Maharaj tip', labelColor: colors.teal,
    title: tipOfDay,
    buttons: [],
  });

  // Card 1 — Saturday grocery
  if (dayOfWeek === 'Saturday' || (dayOfWeek === 'Friday' && hour >= 18 && maharajDay === 'Saturday')) {
    feedCards.push({
      type: 'grocery', bg: { backgroundColor: colors.frostedGreen, borderLeftWidth: 3, borderLeftColor: colors.emerald },
      borderColor: colors.emerald, label: 'Saturday grocery', labelColor: colors.teal,
      title: 'Shopping list ready — emailed to you', sub: `Emailed to ${email}`,
      buttons: [{ text: 'Download', style: 'emerald', onPress: () => router.push('/meal-wizard' as never) }],
    });
  }

  // Card 2 — Sunday prep
  if (dayOfWeek === 'Sunday' && hour >= 17 && mealPrepCount > 0) {
    feedCards.push({
      type: 'prep', bg: { backgroundColor: colors.frostedNavy, borderLeftWidth: 3, borderLeftColor: colors.navy },
      borderColor: colors.navy, label: 'Tonight before you sleep', labelColor: colors.navy,
      title: `${mealPrepCount} prep tasks waiting for this week`,
      buttons: [{ text: 'View prep', style: 'navy', onPress: () => router.push('/meal-prep' as never) }],
    });
  }

  // Card 3 — Occasion reminder
  const tomorrow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][(now.getDay() + 1) % 7];
  const todayOcc = occasions.find(o => o.day === dayOfWeek);
  const tomorrowOcc = occasions.find(o => o.day === tomorrow);
  const activeOcc = todayOcc || tomorrowOcc;
  if (activeOcc) {
    const isToday = !!todayOcc;
    feedCards.push({
      type: 'occasion', bg: { backgroundColor: colors.frostedNavy, borderLeftWidth: 3, borderLeftColor: colors.navy },
      borderColor: colors.navy, label: isToday ? `${dayOfWeek} occasion` : 'Tomorrow occasion', labelColor: colors.navy,
      title: `${activeOcc.name} — shall Maharaj plan it?`,
      sub: activeOcc.people ? `${activeOcc.people}` : undefined,
      buttons: [
        { text: 'Plan it', style: 'emerald', onPress: () => router.push('/meal-wizard' as never) },
        { text: 'Skip this week', style: 'outline', onPress: () => {} },
      ],
    });
  }

  const feedCount = feedCards.length;

  return (
    <View style={{flex:1}}>
      <ImageBackground source={require('../assets/background.png')} style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%'}} resizeMode="cover" />
      <SafeAreaView style={{flex:1,zIndex:1}}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={openDrawer} activeOpacity={0.8}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{initials}</Text></View>
          </TouchableOpacity>
          <View style={{flex:1}} />
          <Image
            source={require('../assets/blueflute-logo.png')}
            style={{width:80,height:32}}
            resizeMode="contain"
          />
        </View>

        {/* ── TICKER ── */}
        <View style={{backgroundColor:colors.amber,paddingVertical:5,overflow:'hidden'}}>
          <Animated.Text
            style={{fontSize:14,color:'#1A1A1A',fontWeight:'500',transform:[{translateX:scrollAnim}]}}
            onLayout={(e) => { if (tickerTextWidth === 0) setTickerTextWidth(e.nativeEvent.layout.width); }}
            numberOfLines={1}
          >
            {'Powered by Blue Flute Consulting LLC-FZ  \u00B7  My Maharaj Beta is a smart meal planning app for Indian families in the GCC  \u00B7  Feedback: info@bluefluteconsulting.com  \u00B7  '}
          </Animated.Text>
        </View>

        <ScrollView contentContainerStyle={{paddingBottom:20}} showsVerticalScrollIndicator={false}>

          {/* ── HERO ── */}
          <View style={{alignItems:'center',paddingTop:4}}>
            <TouchableOpacity onPress={() => router.push('/ask-maharaj' as never)} activeOpacity={0.85}>
              <Animated.Image
                source={require('../assets/logo.png')}
                style={{width:240,height:240,transform:[{scale:pulseAnim}],marginBottom:0}}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={{fontSize:10,color:colors.gold,fontStyle:'italic',marginTop:2}}>Tap to begin</Text>
            <Text style={{fontSize:13,fontWeight:'500',color:colors.navy,marginTop:2}}>Ask Maharaj</Text>
            <Text style={{fontSize:9,color:colors.teal,marginTop:1}}>Your personal meal planner</Text>
          </View>

          {/* ── GREETING ── */}
          <View style={{paddingHorizontal:16,paddingTop:4}}>
            <Text style={{fontSize:16,fontWeight:'500',color:colors.navy}}>{getGreeting()}, {firstName || 'there'}</Text>
            <Text style={{fontSize:13,color:colors.textMuted}}>{dayOfWeek} · {userCity} · {feedCount} thing{feedCount !== 1 ? 's need' : ' needs'} your attention</Text>

            {/* Plan pill */}
            {hasWeekPlan ? (
              <View style={s.planPill}>
                <View style={{width:4,height:4,borderRadius:2,backgroundColor:colors.emerald}} />
                <Text style={{fontSize:13,color:colors.teal}}>This week's plan is active — Day {planDayX} of {planDayY}</Text>
              </View>
            ) : (
              <TouchableOpacity style={[s.planPill, {borderColor:'rgba(201,162,39,0.3)',backgroundColor:'rgba(201,162,39,0.1)'}]} onPress={() => router.push('/meal-wizard' as never)}>
                <Text style={{fontSize:13,color:colors.gold}}>No plan this week — tap to plan</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── DIVIDER ── */}
          <View style={s.divider} />

          {/* ── SECTION LABEL ── */}
          <Text style={s.sectionLabel}>Maharaj suggests</Text>

          {/* ── ANTICIPATION FEED ── */}
          <View style={{paddingHorizontal:14}}>
            {feedCards.map((card, i) => (
              <View key={i} style={[s.feedCard, card.bg]}>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'500',color:card.labelColor,textTransform:'uppercase',letterSpacing:0.5}}>{card.label}</Text>
                  <Text style={{fontSize:16,fontWeight:'500',color:colors.navy,marginTop:2}}>{card.title}</Text>
                  {card.sub && <Text style={{fontSize:13,color:colors.textMuted,marginTop:1}}>{card.sub}</Text>}
                </View>
                <View style={{flexDirection:'row',gap:4,flexShrink:0}}>
                  {card.buttons.map((btn, bi) => (
                    <TouchableOpacity key={bi} style={btn.style === 'emerald' ? s.btnEmerald : btn.style === 'navy' ? s.btnNavy : s.btnOutline} onPress={btn.onPress} activeOpacity={0.8}>
                      <Text style={btn.style === 'outline' ? s.btnOutlineTxt : s.btnFilledTxt}>{btn.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* ── DIVIDER ── */}
          <View style={s.divider} />

          {/* ── QUICK CHIPS ── */}
          <View style={{flexDirection:'row',gap:5,paddingHorizontal:10}}>
            {[
              { label: 'Plan week', onPress: () => router.push('/meal-wizard' as never) },
              { label: 'My fridge', onPress: () => router.push('/my-fridge' as never) },
              { label: 'Party menu', onPress: () => router.push('/party-menu' as never) },
              { label: 'Scan to shop', onPress: () => router.push('/my-fridge' as never) },
            ].map((c, i) => (
              <TouchableOpacity key={i} style={s.quickChip} onPress={c.onPress} activeOpacity={0.8}>
                <Text style={s.quickChipTxt}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <Text style={{fontSize:13,color:colors.emerald}}>Powered by Blue Flute Consulting LLC-FZ</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.bluefluteconsulting.com')}>
            <Text style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginTop:2}}>www.bluefluteconsulting.com</Text>
          </TouchableOpacity>
        </View>

        {/* ── DRAWER OVERLAY ── */}
        {isDrawerOpen && (
          <TouchableOpacity style={s.drawerOverlay} activeOpacity={1} onPress={closeDrawer}>
            <Animated.View style={[s.drawer, {transform:[{translateX:drawerAnim}]}]}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{flex:1}}>
                <View style={s.drawerHeader}>
                  <View style={s.drawerAvatar}><Text style={s.drawerAvatarTxt}>{initials}</Text></View>
                  <Text style={s.drawerName}>{firstName || 'User'}</Text>
                  <Text style={s.drawerEmail}>{email}</Text>
                </View>
                <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{paddingBottom:60}}>
                  <DrawerRow label="Family Profile" onPress={() => { closeDrawer(); router.push('/dietary-profile' as never); }} />
                  <DrawerRow label="My Family Recipes" onPress={() => { closeDrawer(); router.push('/family-recipes' as never); }} />
                  <DrawerRow label="Plan Your Week" onPress={() => { closeDrawer(); router.push('/meal-wizard' as never); }} />
                  <DrawerRow label="My Fridge" onPress={() => { closeDrawer(); router.push('/my-fridge' as never); }} />
                  <DrawerRow label="Meal Prep" onPress={() => { closeDrawer(); router.push('/meal-prep' as never); }} />
                  <DrawerRow label="Party Menu" onPress={() => { closeDrawer(); router.push('/party-menu' as never); }} />
                  <DrawerRow label="Outdoor Catering" onPress={() => { closeDrawer(); router.push('/outdoor-catering' as never); }} />
                  <DrawerRow label="Menu History" onPress={() => { closeDrawer(); router.push('/menu-history' as never); }} />
                  <DrawerRow label="Festivals and Functions" onPress={() => { closeDrawer(); router.push('/festivals' as never); }} />
                  <DrawerRow label="FAQ" onPress={() => { closeDrawer(); router.push('/faq' as never); }} />
                  <DrawerRow label="About My Maharaj" onPress={() => { closeDrawer(); router.push('/about' as never); }} />
                  <DrawerRow label="Sign Out" signOut onPress={doSignOut} />
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        )}

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 8,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.emerald },
  avatarTxt: { color: colors.white, fontSize: 13, fontWeight: '800' },
  planPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(30,158,94,0.15)', borderWidth: 1, borderColor: 'rgba(30,158,94,0.3)', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8, marginTop: 4, alignSelf: 'flex-start' },
  divider: { height: 1, backgroundColor: 'rgba(26,58,92,0.12)', marginVertical: 8, marginHorizontal: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: colors.teal, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 14, paddingBottom: 5 },
  feedCard: { borderRadius: 12, padding: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnEmerald: { backgroundColor: colors.emerald, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8 },
  btnNavy: { backgroundColor: colors.navy, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8 },
  btnOutline: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.navy },
  btnFilledTxt: { fontSize: 16, fontWeight: '500', color: colors.white },
  btnOutlineTxt: { fontSize: 16, fontWeight: '500', color: colors.navy },
  quickChip: { flex: 1, backgroundColor: colors.emerald, borderRadius: 20, paddingVertical: 5, alignItems: 'center' },
  quickChipTxt: { fontSize: 16, color: colors.white, fontWeight: '500' },
  footer: { backgroundColor: colors.navy, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', marginTop: 10 },
  // Drawer
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: SCREEN_W * 0.75, backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  drawerHeader: { backgroundColor: colors.navy, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
  drawerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  drawerAvatarTxt: { fontSize: 20, fontWeight: '800', color: colors.gold },
  drawerName: { fontSize: 15, fontWeight: '700', color: colors.white },
  drawerEmail: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13 },
  drawerLabel: { fontSize: 13, fontWeight: '500', color: colors.navy },
  drawerChevron: { fontSize: 16, color: '#D1D5DB' },
});
