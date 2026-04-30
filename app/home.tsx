import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Image, ImageBackground, Linking, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { colors, cards } from '../constants/theme';
import { FESTIVALS_2026, type FestivalEntry } from '../constants/festivals';
import MyDownloadsModal from './my-downloads';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// ─── Time greeting ───────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getThisWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().split('T')[0];
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
  const [mealFeedback, setMealFeedback] = useState({ breakfast: false, lunch: false, dinner: false });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [upcomingFestivals, setUpcomingFestivals] = useState<FestivalEntry[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<{total:number;active:number;monthsAvailable:number} | null>(null);
  const [referralDrawerOpen, setReferralDrawerOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [ghostPlanReady, setGhostPlanReady] = useState(false);
  const [streakWeeks, setStreakWeeks] = useState(0);
  const [streakBankedWeeks, setStreakBankedWeeks] = useState(0);

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

      const today = new Date().toISOString().split('T')[0];

      // Shared extractors — v4 MealPlanDayV4 shape first, legacy shapes as fallback
      const getBreakfast = (d: any): string =>
        d?.breakfast?.dishName          ||
        d?.anatomy?.breakfast?.dishName ||
        d?.dishes?.breakfast            ||
        d?.breakfast?.name              ||
        d?.breakfast?.options?.[0]?.name || '';
      const getLunchMain = (d: any): string => {
        if (d?.lunch?.curry?.dishName) return d.lunch.curry.dishName;
        const c = d?.anatomy?.lunch?.curry;
        if (Array.isArray(c)) return c[0]?.dishName || '';
        if (c?.dishName) return c.dishName;
        return d?.dishes?.lunch_curry_1 || d?.lunch?.name || d?.lunch?.options?.[0]?.name || '';
      };
      const getDinnerMain = (d: any): string => {
        if (d?.dinner?.curry?.dishName) return d.dinner.curry.dishName;
        const c = d?.anatomy?.dinner?.curry;
        if (Array.isArray(c)) return c[0]?.dishName || '';
        if (c?.dishName) return c.dishName;
        return d?.dishes?.dinner_curry_1 || d?.dinner?.name || d?.dinner?.options?.[0]?.name || '';
      };

      function applyPlanDays(days: any[]) {
        setHasWeekPlan(true);
        const dayIdx = days.findIndex((d: any) => d.date >= today);
        setPlanDayX(dayIdx >= 0 ? dayIdx + 1 : days.length);
        setPlanDayY(days.length);
        const todayPlan = days.find((d: any) => d.date === today);
        if (todayPlan) {
          setTodayMeals({
            breakfast: getBreakfast(todayPlan),
            lunch:     getLunchMain(todayPlan),
            dinner:    getDinnerMain(todayPlan),
          });
          const h = new Date().getHours();
          setMealFeedback({ breakfast: h >= 10, lunch: h >= 14, dinner: h >= 21 });
        }
      }

      // ── Primary: Supabase query for active plan ──────────────────────
      let planLoaded = false;
      if (user) {
        try {
          const { data: activePlan } = await supabase
            .from('meal_plans')
            .select('id, period_start, period_end, date_range, plan_json, generated_at')
            .eq('user_id', user.id)
            .lte('period_start', today)
            .gte('period_end', today)
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const days: any[] = activePlan?.plan_json?.days ?? [];
          if (Array.isArray(days) && days.length > 0) {
            planLoaded = true;
            applyPlanDays(days);
          }
        } catch {}
      }

      // ── Fallback: AsyncStorage (pre-v4 / offline) ────────────────────
      const [md, cwp, occ, prep, ghostRaw, streakResult] = await Promise.all([
        AsyncStorage.getItem('maharaj_day'),
        AsyncStorage.getItem('confirmed_meal_plan'),
        AsyncStorage.getItem('recurring_occasions'),
        AsyncStorage.getItem('meal_prep_tasks'),
        AsyncStorage.getItem('ghost_meal_plan'),
        user
          ? supabase.from('profiles').select('streak_weeks, streak_banked_weeks').eq('id', user.id).maybeSingle()
          : Promise.resolve(null),
      ]);
      if (md) setMaharajDay(md);
      if (!planLoaded && cwp) {
        try {
          const plan = JSON.parse(cwp);
          if (Array.isArray(plan) && plan.length > 0) applyPlanDays(plan);
        } catch {}
      }
      if (occ) try { setOccasions(JSON.parse(occ)); } catch {}
      if (prep) try { const tasks = JSON.parse(prep); setMealPrepCount(Array.isArray(tasks) ? tasks.length : 0); } catch {}
      if (ghostRaw) {
        try {
          const ghost = JSON.parse(ghostRaw);
          if (!ghost.approved && ghost.weekStart === getThisWeekMonday()) {
            setGhostPlanReady(true);
          }
        } catch {}
      }
      if (streakResult && 'data' in streakResult && streakResult.data) {
        setStreakWeeks(streakResult.data.streak_weeks ?? 0);
        setStreakBankedWeeks(streakResult.data.streak_banked_weeks ?? 0);
      }

      // Festival reminder — next 14 days (today inclusive)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(todayStart); windowEnd.setDate(windowEnd.getDate() + 14);
      const nearFestivals = FESTIVALS_2026.filter(f => {
        const fd = new Date(`${f.date} 2026`);
        return fd >= todayStart && fd <= windowEnd;
      });
      setUpcomingFestivals(nearFestivals);
    }
    void load();
    void loadReferralData();
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

  async function doDeleteAccount() {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (e: any) {
      setDeleteError(e.message || 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function loadReferralData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const [codeRes, statsRes] = await Promise.all([
        fetch('/api/referral?action=get_code', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch('/api/referral?action=get_stats', { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      const codeData = await codeRes.json();
      const statsData = await statsRes.json();
      if (codeData.code) setReferralCode(codeData.code);
      if (statsData.total !== undefined) setReferralStats(statsData);
    } catch {}
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

  type FeedCard = { type: string; bg: object; borderColor: string; label: string; labelColor: string; title: string; sub?: string; subtitle?: string; onCardPress?: () => void; buttons: { text: string; style: 'emerald'|'navy'|'outline'; onPress: () => void }[] };
  const feedCards: FeedCard[] = [];

  // Ghost plan card — shown when Maharaj has an unapproved plan for the current week
  if (ghostPlanReady) {
    feedCards.push({
      type: 'ghost-plan',
      bg: { backgroundColor: 'rgba(201,162,39,0.06)', borderLeftWidth: 4, borderLeftColor: '#C9A227' },
      borderColor: '#C9A227',
      label: "Maharaj's suggestion",
      labelColor: '#C9A227',
      title: 'Maharaj has planned your week — tap to review',
      onCardPress: () => router.push('/week-confirm' as never),
      buttons: [],
    });
  }

  // Streak card — shown when user has an active streak
  if (streakWeeks >= 1) {
    feedCards.push({
      type: 'streak',
      bg: { backgroundColor: 'rgba(201,162,39,0.06)', borderLeftWidth: 4, borderLeftColor: '#C9A227' },
      borderColor: '#C9A227',
      label: 'Maharaj streak',
      labelColor: '#C9A227',
      title: `${streakWeeks} week streak — keep planning every week`,
      sub: streakWeeks >= 4 ? `${streakBankedWeeks} free week${streakBankedWeeks !== 1 ? 's' : ''} banked — redeemable when billing goes live` : undefined,
      buttons: [],
    });
  }

  // Card A — Today's Plan (always shown)
  const todayPlanTitle = todayMeals
    ? [todayMeals.breakfast, todayMeals.lunch, todayMeals.dinner].filter(Boolean).join('  ·  ')
    : hasWeekPlan ? 'No meals planned for today' : 'No plan this week — tap to create one';
  const todayPlanSubtitle = mealFeedback.lunch ? 'How was lunch today? Tap to rate.' :
    mealFeedback.breakfast ? 'How was breakfast? Tap to rate.' : '';
  feedCards.push({
    type: 'today-plan', bg: { backgroundColor: colors.frostedNavy, borderLeftWidth: 3, borderLeftColor: colors.navy },
    borderColor: colors.navy, label: "Today's plan", labelColor: colors.navy,
    title: todayPlanTitle,
    subtitle: todayPlanSubtitle,
    onCardPress: async () => {
      if (hasWeekPlan) {
        await AsyncStorage.setItem('menu_history_auto_open_latest', 'true');
        router.push('/menu-history' as never);
      } else {
        router.push('/meal-wizard' as never);
      }
    },
    buttons: [],
  });

  // Card B — Daily Tip (always shown, taps into Ask Maharaj)
  feedCards.push({
    type: 'daily-tip', bg: { backgroundColor: colors.frostedGreen },
    borderColor: colors.emerald, label: 'Maharaj tip', labelColor: colors.teal,
    title: tipOfDay,
    onCardPress: () => router.push({ pathname: '/ask-maharaj', params: { initialMessage: tipOfDay, initialLabel: 'Maharaj tip' } } as never),
    buttons: [],
  });

  // Card F — Festival reminder (next 14 days)
  if (upcomingFestivals.length > 0) {
    const nearest = upcomingFestivals[0];
    const festDate = new Date(`${nearest.date} 2026`);
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.round((festDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    const whenLabel = diffDays === 0 ? 'Today!' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
    const festTitle = upcomingFestivals.length === 1
      ? nearest.name
      : `${nearest.name} & ${upcomingFestivals.length - 1} more`;
    feedCards.push({
      type: 'festival',
      bg: { backgroundColor: 'rgba(201,162,39,0.1)', borderLeftWidth: 3, borderLeftColor: colors.gold },
      borderColor: colors.gold,
      label: 'Festival',
      labelColor: colors.gold,
      title: festTitle,
      sub: `${whenLabel} -- time to start planning`,
      onCardPress: () => router.push('/festivals' as never),
      buttons: [{ text: 'Plan menu', style: 'navy', onPress: () => router.push('/party-menu' as never) }],
    });
  }

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
          <View style={{alignItems:'center',paddingTop:4,maxHeight:Math.round(SCREEN_H*0.36),overflow:'hidden'}}>
            <TouchableOpacity onPress={() => router.push('/ask-maharaj' as never)} activeOpacity={0.85}>
              <Animated.Image
                source={require('../assets/logo.png')}
                style={{width:160,height:160,transform:[{scale:pulseAnim}],marginBottom:0}}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={{fontSize:11,fontWeight:'500',color:colors.gold,fontStyle:'italic',marginTop:0}}>Tap to begin</Text>
            <Text style={{fontSize:20,fontWeight:'700',color:colors.navy,marginTop:2}}>Ask Maharaj</Text>
            <Text style={{fontSize:13,color:colors.textMuted,marginTop:1}}>Your personal meal planner</Text>
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
              card.onCardPress ? (
                <TouchableOpacity key={i} style={[s.feedCard, card.bg]} onPress={card.onCardPress} activeOpacity={0.85}>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight:'500',color:card.labelColor,textTransform:'uppercase',letterSpacing:0.5}}>{card.label}</Text>
                    <Text style={{fontSize:16,fontWeight:'500',color:colors.navy,marginTop:2}}>{card.title}</Text>
                    {card.sub && <Text style={{fontSize:13,color:colors.textMuted,marginTop:1}}>{card.sub}</Text>}
                    {card.subtitle && <Text style={{fontSize:12,color:colors.gold,marginTop:3,fontStyle:'italic'}}>{card.subtitle}</Text>}
                  </View>
                  <View style={{flexDirection:'row',gap:4,flexShrink:0}}>
                    {card.buttons.map((btn, bi) => (
                      <TouchableOpacity key={bi} style={btn.style === 'emerald' ? s.btnEmerald : btn.style === 'navy' ? s.btnNavy : s.btnOutline} onPress={btn.onPress} activeOpacity={0.8}>
                        <Text style={btn.style === 'outline' ? s.btnOutlineTxt : s.btnFilledTxt}>{btn.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              ) : (
                <View key={i} style={[s.feedCard, card.bg]}>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight:'500',color:card.labelColor,textTransform:'uppercase',letterSpacing:0.5}}>{card.label}</Text>
                    <Text style={{fontSize:16,fontWeight:'500',color:colors.navy,marginTop:2}}>{card.title}</Text>
                    {card.sub && <Text style={{fontSize:13,color:colors.textMuted,marginTop:1}}>{card.sub}</Text>}
                    {card.subtitle && <Text style={{fontSize:12,color:colors.gold,marginTop:3,fontStyle:'italic'}}>{card.subtitle}</Text>}
                  </View>
                  <View style={{flexDirection:'row',gap:4,flexShrink:0}}>
                    {card.buttons.map((btn, bi) => (
                      <TouchableOpacity key={bi} style={btn.style === 'emerald' ? s.btnEmerald : btn.style === 'navy' ? s.btnNavy : s.btnOutline} onPress={btn.onPress} activeOpacity={0.8}>
                        <Text style={btn.style === 'outline' ? s.btnOutlineTxt : s.btnFilledTxt}>{btn.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )
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
                  <DrawerRow label="Refer a Friend" onPress={() => { closeDrawer(); setTimeout(() => setReferralDrawerOpen(true), 300); }} />
                  <DrawerRow label="My Fridge" onPress={() => { closeDrawer(); router.push('/my-fridge' as never); }} />
                  <DrawerRow label="Meal Prep" onPress={() => { closeDrawer(); router.push('/meal-prep' as never); }} />
                  <DrawerRow label="Party Menu" onPress={() => { closeDrawer(); router.push('/party-menu' as never); }} />
                  <DrawerRow label="Outdoor Catering" onPress={() => { closeDrawer(); router.push('/outdoor-catering' as never); }} />
                  <DrawerRow label="Menu History" onPress={() => { closeDrawer(); router.push('/menu-history' as never); }} />
                  <DrawerRow label="Confirm your week" onPress={() => { closeDrawer(); router.push('/week-confirm' as never); }} />
                  <DrawerRow label="My Downloads" onPress={() => { closeDrawer(); setTimeout(() => setDownloadsOpen(true), 300); }} />
                  <DrawerRow label="Festivals and Functions" onPress={() => { closeDrawer(); router.push('/festivals' as never); }} />
                  <DrawerRow label="FAQ" onPress={() => { closeDrawer(); router.push('/faq' as never); }} />
                  <DrawerRow label="About My Maharaj" onPress={() => { closeDrawer(); router.push('/about' as never); }} />
                  <DrawerRow label="Sign Out" signOut onPress={doSignOut} />
                  <View style={{ height: 16 }} />
                  <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                    <TouchableOpacity
                      style={{ borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => { closeDrawer(); setTimeout(() => setAccountModalOpen(true), 300); }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#DC2626' }}>Delete Account</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        )}

        <MyDownloadsModal visible={downloadsOpen} onClose={() => setDownloadsOpen(false)} />

        {/* ── REFERRAL MODAL ── */}
        <Modal visible={referralDrawerOpen} transparent animationType="slide" onRequestClose={() => setReferralDrawerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#2E5480', marginBottom: 4 }}>Refer a Friend</Text>
              <Text style={{ fontSize: 12, color: 'rgba(27,58,92,0.5)', marginBottom: 20, lineHeight: 18 }}>
                Share your code. When your friend subscribes, their 4th month is free. You get 1 free month too.
              </Text>

              <View style={{ backgroundColor: 'rgba(46,84,128,0.06)', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: 'rgba(27,58,92,0.5)', marginBottom: 6 }}>Your referral code</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#2E5480', letterSpacing: 2 }}>{referralCode || 'Loading...'}</Text>
              </View>

              {referralStats && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(46,84,128,0.06)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#2E5480' }}>{referralStats.active}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(27,58,92,0.5)', marginTop: 2 }}>Active referrals</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(201,162,39,0.1)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#C9A227' }}>{referralStats.monthsAvailable}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(27,58,92,0.5)', marginTop: 2 }}>Free months banked</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={{ backgroundColor: '#2E5480', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}
                onPress={async () => {
                  if (!referralCode) return;
                  const message = `Join me on My Maharaj — the AI meal planner for Indian families. Use my code ${referralCode} when you sign up and get your 4th month free. Download here: https://app.my-maharaj.com/ref/${referralCode}`;
                  if (Platform.OS === 'web' && navigator.share) {
                    await navigator.share({ title: 'My Maharaj', text: message });
                  } else if (Platform.OS === 'web') {
                    await navigator.clipboard.writeText(message);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: 'white' }}>Share Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ borderWidth: 0.5, borderColor: 'rgba(27,58,92,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' }}
                onPress={() => setReferralDrawerOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, color: 'rgba(27,58,92,0.5)' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── ACCOUNT MODAL ── */}
        <Modal visible={accountModalOpen} transparent animationType="slide" onRequestClose={() => setAccountModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1B3A5C', marginBottom: 4 }}>What would you like to do?</Text>
              <Text style={{ fontSize: 12, color: 'rgba(27,58,92,0.5)', marginBottom: 16 }}>Choose an option below</Text>

              <View style={{ borderWidth: 0.5, borderColor: 'rgba(27,58,92,0.15)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(27,58,92,0.4)', marginBottom: 2 }}>Cancel Subscription</Text>
                <Text style={{ fontSize: 11, color: 'rgba(27,58,92,0.3)' }}>Coming soon</Text>
              </View>

              <TouchableOpacity
                style={{ borderWidth: 1.5, borderColor: '#2E5480', borderRadius: 10, padding: 12, marginBottom: 10 }}
                onPress={async () => {
                  setAccountModalOpen(false);
                  try {
                    const user = await getSessionUser();
                    if (!user) return;
                    await supabase.from('profiles').update({ deactivated: true }).eq('id', user.id);
                    await supabase.auth.signOut();
                    router.replace('/login');
                  } catch {}
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#2E5480', marginBottom: 2 }}>Deactivate Account</Text>
                <Text style={{ fontSize: 11, color: 'rgba(27,58,92,0.5)' }}>Pause your account — reactivate anytime</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 10, padding: 12, marginBottom: 10 }}
                onPress={() => { setAccountModalOpen(false); setTimeout(() => setDeleteConfirmOpen(true), 300); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#DC2626', marginBottom: 2 }}>Delete Account</Text>
                <Text style={{ fontSize: 11, color: 'rgba(27,58,92,0.5)' }}>Permanently delete all your data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ borderWidth: 0.5, borderColor: 'rgba(27,58,92,0.15)', borderRadius: 10, padding: 10, alignItems: 'center' }}
                onPress={() => setAccountModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, color: 'rgba(27,58,92,0.5)' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── DELETE CONFIRM MODAL ── */}
        <Modal visible={deleteConfirmOpen} transparent animationType="slide" onRequestClose={() => { setDeleteConfirmOpen(false); setDeleteInput(''); setDeleteError(''); }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626', marginBottom: 8 }}>Delete your account?</Text>
              <Text style={{ fontSize: 12, color: 'rgba(27,58,92,0.5)', marginBottom: 16, lineHeight: 18 }}>
                This will permanently delete your meal plans, family profile, dish history, and all other data. This cannot be undone.
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(27,58,92,0.5)', marginBottom: 8 }}>
                Type DELETE to confirm
              </Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: 'rgba(27,58,92,0.2)', borderRadius: 10, padding: 12, fontSize: 14, color: '#1B3A5C', marginBottom: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
                value={deleteInput}
                onChangeText={t => { setDeleteInput(t); setDeleteError(''); }}
                placeholder="Type DELETE here"
                placeholderTextColor="rgba(27,58,92,0.3)"
                autoCapitalize="characters"
              />
              {deleteError ? <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 8 }}>{deleteError}</Text> : null}
              <TouchableOpacity
                style={{ backgroundColor: deleteInput === 'DELETE' ? '#DC2626' : '#FEE2E2', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8, opacity: deleting ? 0.7 : 1 }}
                onPress={doDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: deleteInput === 'DELETE' ? 'white' : '#DC2626' }}>
                  {deleting ? 'Deleting...' : 'Delete my account'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderWidth: 0.5, borderColor: 'rgba(27,58,92,0.15)', borderRadius: 10, padding: 10, alignItems: 'center' }}
                onPress={() => { setDeleteConfirmOpen(false); setDeleteInput(''); setDeleteError(''); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, color: 'rgba(27,58,92,0.5)' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
