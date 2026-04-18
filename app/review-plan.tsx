import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, ImageBackground, Modal, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { buttons } from '../constants/theme';
import {
  generate3DaySamplePlan, ZONE_CUISINE_MAP,
  MealPlanDay, AnatomyComponent,
} from '../lib/ai';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY  = '#2E5480';
const TEAL  = '#1A6B5C';
const MINT  = '#D4EDE5';
const WHITE_SEMI = 'rgba(255,255,255,0.9)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function getZoneForUser(cuisines: string[]): string[] {
  const lower = cuisines.map(c => c.toLowerCase());
  for (const members of Object.values(ZONE_CUISINE_MAP)) {
    if (lower.some(c => members.map(m => m.toLowerCase()).includes(c))) return members;
  }
  return ZONE_CUISINE_MAP['West'];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReviewPlanScreen() {
  const [loading, setLoading]               = useState(true);
  const [plan, setPlan]                     = useState<MealPlanDay[]>([]);
  const [activeDay, setActiveDay]           = useState(0);
  const [confirmedDays, setConfirmedDays]   = useState([false, false, false]);
  const [saving, setSaving]                 = useState(false);

  // User state
  const [userId, setUserId]                 = useState('');
  const [userCuisines, setUserCuisines]     = useState<string[]>([]);
  const [foodPref, setFoodPref]             = useState<'veg' | 'nonveg'>('nonveg');

  // Regenerate state
  const [regenCount, setRegenCount]         = useState(0);
  const [regenCountDate, setRegenCountDate] = useState<string | null>(null);
  const [dietaryProfileCompleted, setDietaryProfileCompleted] = useState(false);

  // Popups
  const [profileGateVisible, setProfileGateVisible]   = useState(false);
  const [regenConfirmVisible, setRegenConfirmVisible] = useState(false);
  const [regenConfirmText, setRegenConfirmText]       = useState('');

  // Swap sheet
  type SwapState = {
    visible: boolean;
    dayIdx: number;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    currentDish: string;
  };
  const [swapSheet, setSwapSheet] = useState<SwapState>({
    visible: false, dayIdx: 0, mealType: 'lunch', currentDish: '',
  });
  const [swapCuisineSugg, setSwapCuisineSugg] = useState<string[]>([]);
  const [swapZoneSugg, setSwapZoneSugg]       = useState<string[]>([]);
  const [swapExpanded, setSwapExpanded]       = useState(false);

  // ── Load on mount ─────────────────────────────────────────────────────────

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getSessionUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      // Profile row
      const { data: profile } = await supabase
        .from('profiles')
        .select('veg_days, dietary_profile_completed, regenerate_count_today, regenerate_count_date')
        .eq('id', user.id)
        .maybeSingle();

      const vegDays: string[] = profile?.veg_days ?? [];
      const fp: 'veg' | 'nonveg' = vegDays.length === 7 ? 'veg' : 'nonveg';
      setFoodPref(fp);
      setDietaryProfileCompleted(profile?.dietary_profile_completed ?? false);

      const today = todayStr();
      const storedDate: string | null = profile?.regenerate_count_date ?? null;
      const count: number = storedDate === today ? (profile?.regenerate_count_today ?? 0) : 0;
      setRegenCount(count);
      setRegenCountDate(storedDate);

      // Cuisine preferences
      const { data: cuisineRows } = await supabase
        .from('cuisine_preferences')
        .select('cuisine_name')
        .eq('user_id', user.id);
      const cuisines = (cuisineRows ?? []).map((r: any) => r.cuisine_name as string);
      setUserCuisines(cuisines);

      // Generate plan
      const days = await generate3DaySamplePlan({
        userId: user.id,
        cuisines: cuisines.length > 0 ? cuisines : ['Maharashtrian'],
        foodPref: fp,
      });
      setPlan(days);
    } catch (e) {
      console.error('[ReviewPlan] loadData error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Dish helpers ──────────────────────────────────────────────────────────

  function getMainDish(day: MealPlanDay, mealType: 'breakfast' | 'lunch' | 'dinner'): string {
    const a = day.anatomy;
    if (!a) return '';
    if (mealType === 'breakfast') return a.breakfast?.dishName ?? '';
    const meal = mealType === 'lunch' ? a.lunch : a.dinner;
    if (!meal) return '';
    const curry = meal.curry;
    if (Array.isArray(curry)) return curry[0]?.dishName ?? '';
    return (curry as AnatomyComponent | undefined)?.dishName ?? '';
  }

  function getSecondaryDishes(day: MealPlanDay, mealType: 'lunch' | 'dinner'): string[] {
    const a = day.anatomy;
    if (!a) return [];
    const meal = mealType === 'lunch' ? a.lunch : a.dinner;
    if (!meal) return [];
    const parts: string[] = [];
    if (Array.isArray(meal.curry) && meal.curry[1]?.dishName) parts.push(meal.curry[1].dishName);
    if (meal.veg?.dishName)   parts.push(meal.veg.dishName);
    if (meal.raita?.dishName) parts.push(meal.raita.dishName);
    if (meal.bread?.dishName) parts.push(meal.bread.dishName);
    if (meal.rice?.dishName)  parts.push(meal.rice.dishName);
    return parts;
  }

  // ── Swap ──────────────────────────────────────────────────────────────────

  async function openSwapSheet(dayIdx: number, mealType: 'breakfast' | 'lunch' | 'dinner') {
    const day = plan[dayIdx];
    if (!day) return;
    const currentDish = getMainDish(day, mealType);
    const slotFilter = mealType === 'breakfast' ? 'breakfast'
      : mealType === 'lunch' ? 'lunch_curry' : 'dinner_curry';
    const dayName = day.day;
    const isVegDay = dayName === 'Saturday' || foodPref === 'veg';
    const zoneCuisines = getZoneForUser(userCuisines);

    try {
      let qBase = supabase
        .from('dishes')
        .select('name')
        .eq('is_banned', false)
        .eq('is_jain', false)
        .eq('is_fasting', false)
        .filter('slot', 'ov', `{${slotFilter}}`);
      if (isVegDay) qBase = qBase.eq('is_veg', true);

      const { data: cuisineDishes } = await qBase
        .filter('cuisine', 'ov', `{${userCuisines.join(',')}}`)
        .limit(10);
      const cuisineSugg = (cuisineDishes ?? [])
        .map((d: any) => d.name as string)
        .filter((n: string) => n !== currentDish)
        .slice(0, 2);

      const { data: zoneDishes } = await qBase
        .filter('cuisine', 'ov', `{${zoneCuisines.join(',')}}`)
        .limit(20);
      const zoneSugg = (zoneDishes ?? [])
        .map((d: any) => d.name as string)
        .filter((n: string) => n !== currentDish && !cuisineSugg.includes(n))
        .slice(0, 2);

      setSwapCuisineSugg(cuisineSugg);
      setSwapZoneSugg(zoneSugg);
    } catch {
      setSwapCuisineSugg([]);
      setSwapZoneSugg([]);
    }

    setSwapExpanded(false);
    setSwapSheet({ visible: true, dayIdx, mealType, currentDish });
  }

  function applySwap(dayIdx: number, mealType: 'breakfast' | 'lunch' | 'dinner', newDish: string) {
    setPlan(prev => prev.map((day, i) => {
      if (i !== dayIdx) return day;
      const anatomy = { ...(day.anatomy ?? {}) };
      if (mealType === 'breakfast' && anatomy.breakfast) {
        anatomy.breakfast = { ...anatomy.breakfast, dishName: newDish };
      } else if (mealType === 'lunch' && anatomy.lunch) {
        const curry = anatomy.lunch.curry;
        const newCurry = Array.isArray(curry)
          ? [{ ...curry[0], dishName: newDish }, ...curry.slice(1)]
          : { ...(curry as AnatomyComponent), dishName: newDish };
        anatomy.lunch = { ...anatomy.lunch, curry: newCurry };
      } else if (mealType === 'dinner' && anatomy.dinner) {
        const curry = anatomy.dinner.curry;
        const newCurry = Array.isArray(curry)
          ? [{ ...curry[0], dishName: newDish }, ...curry.slice(1)]
          : { ...(curry as AnatomyComponent), dishName: newDish };
        anatomy.dinner = { ...anatomy.dinner, curry: newCurry };
      }
      return { ...day, anatomy };
    }));
    setSwapSheet(s => ({ ...s, visible: false }));
  }

  // ── Confirm day / plan ────────────────────────────────────────────────────

  function handleConfirmDay() {
    const next = [...confirmedDays];
    next[activeDay] = true;
    setConfirmedDays(next);
    if (activeDay < 2) setActiveDay(activeDay + 1);
  }

  async function handleConfirmPlan() {
    setSaving(true);
    try {
      const user = await getSessionUser();
      if (!user) return;
      const dates = plan.map(d => d.date);

      // Save plan_json to meal_plans
      await supabase.from('meal_plans').insert({
        user_id: user.id,
        period_start: dates[0],
        period_end:   dates[dates.length - 1],
        date_range:   `${dates[0]} to ${dates[dates.length - 1]}`,
        plan_json:    { days: plan },
        generated_at: new Date().toISOString(),
      });

      // Mark profile_completed = true in Supabase
      await supabase.from('profiles')
        .update({ profile_completed: true })
        .eq('id', user.id);

      router.replace('/home');
    } catch (e) {
      console.error('[ReviewPlan] handleConfirmPlan error:', e);
      router.replace('/home');
    } finally {
      setSaving(false);
    }
  }

  // ── Regenerate ────────────────────────────────────────────────────────────

  function handleRegenTap() {
    if (!dietaryProfileCompleted) {
      setProfileGateVisible(true);
      return;
    }
    const today = todayStr();
    const effective = regenCountDate === today ? regenCount : 0;
    if (effective >= 5) return; // fully disabled

    if (effective === 3) {
      setRegenConfirmText('You can regenerate 2 more times today');
      setRegenConfirmVisible(true);
      return;
    }
    if (effective === 4) {
      setRegenConfirmText('Last regeneration for today');
      setRegenConfirmVisible(true);
      return;
    }
    void performRegen();
  }

  async function performRegen() {
    setRegenConfirmVisible(false);
    setLoading(true);
    setConfirmedDays([false, false, false]);
    setActiveDay(0);
    try {
      const today = todayStr();
      const effective = regenCountDate === today ? regenCount : 0;
      const newCount = effective + 1;

      await supabase.from('profiles').update({
        regenerate_count_today: newCount,
        regenerate_count_date:  today,
      }).eq('id', userId);

      setRegenCount(newCount);
      setRegenCountDate(today);

      const days = await generate3DaySamplePlan({
        userId,
        cuisines: userCuisines.length > 0 ? userCuisines : ['Maharashtrian'],
        foodPref,
      });
      setPlan(days);
    } catch (e) {
      console.error('[ReviewPlan] performRegen error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const today = todayStr();
  const effectiveRegenCount = regenCountDate === today ? regenCount : 0;
  const regenFullyDisabled  = dietaryProfileCompleted && effectiveRegenCount >= 5;
  const regenOpacity        = !dietaryProfileCompleted ? 0.55
    : effectiveRegenCount >= 5 ? 0.4 : 1;
  const showRegenCountHint  = dietaryProfileCompleted && (effectiveRegenCount === 3 || effectiveRegenCount === 4);

  const activeDayData = plan[activeDay];
  const ctaLabel = activeDay === 2
    ? (saving ? 'Saving...' : 'Confirm my plan')
    : `Confirm Day ${activeDay + 1}`;

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <ImageBackground source={require('../assets/background.png')} style={r.bg} resizeMode="cover" />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={NAVY} size="large" />
          <Text style={r.loadingText}>Maharaj is preparing your plan...</Text>
        </SafeAreaView>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={require('../assets/background.png')} style={r.bg} resizeMode="cover" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Back + Home row */}
        <View style={r.navRow}>
          <TouchableOpacity style={buttons.back} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={buttons.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={buttons.home} onPress={() => router.replace('/home')} activeOpacity={0.8}>
            <Text style={buttons.homeText}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* Regen + Day tabs row */}
        <View style={r.controlRow}>
          <View>
            <TouchableOpacity
              style={[r.regenBtn, { opacity: regenOpacity }]}
              onPress={handleRegenTap}
              disabled={regenFullyDisabled}
              activeOpacity={0.8}
            >
              <Text style={r.regenBtnText}>Regenerate</Text>
            </TouchableOpacity>
            {regenFullyDisabled && (
              <Text style={r.regenTooltip}>Come back tomorrow</Text>
            )}
            {showRegenCountHint && (
              <Text style={r.regenCountHint}>
                {effectiveRegenCount === 3 ? '3 of 5 used' : '4 of 5 used'}
              </Text>
            )}
          </View>

          <View style={r.dayTabs}>
            {[0, 1, 2].map(i => (
              <TouchableOpacity
                key={i}
                style={[r.dayTab, activeDay === i && r.dayTabActive]}
                onPress={() => setActiveDay(i)}
                activeOpacity={0.8}
              >
                <Text style={[r.dayTabText, activeDay === i && r.dayTabTextActive]}>
                  {confirmedDays[i] ? `\u2713 Day ${i + 1}` : `Day ${i + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Plan content */}
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {activeDayData && (
            <View style={r.body}>
              <Text style={r.dayHeading}>{formatDate(activeDayData.date)}</Text>
              <Text style={r.daySubText}>Tap any dish to swap</Text>

              {/* BREAKFAST */}
              <View style={r.mealCard}>
                <View style={r.mealCardHeader}>
                  <Text style={r.mealLabel}>BREAKFAST</Text>
                  <TouchableOpacity onPress={() => openSwapSheet(activeDay, 'breakfast')} activeOpacity={0.8}>
                    <Text style={r.swapLink}>Swap ›</Text>
                  </TouchableOpacity>
                </View>
                <Text style={r.mainDish}>{getMainDish(activeDayData, 'breakfast')}</Text>
              </View>

              {/* LUNCH */}
              <View style={r.mealCard}>
                <View style={r.mealCardHeader}>
                  <Text style={r.mealLabel}>LUNCH</Text>
                  <TouchableOpacity onPress={() => openSwapSheet(activeDay, 'lunch')} activeOpacity={0.8}>
                    <Text style={r.swapLink}>Swap ›</Text>
                  </TouchableOpacity>
                </View>
                <Text style={r.mainDish}>{getMainDish(activeDayData, 'lunch')}</Text>
                {getSecondaryDishes(activeDayData, 'lunch').map((d, i) => (
                  <Text key={i} style={r.secondaryDish}>{d}</Text>
                ))}
              </View>

              {/* DINNER */}
              <View style={r.mealCard}>
                <View style={r.mealCardHeader}>
                  <Text style={r.mealLabel}>DINNER</Text>
                  <TouchableOpacity onPress={() => openSwapSheet(activeDay, 'dinner')} activeOpacity={0.8}>
                    <Text style={r.swapLink}>Swap ›</Text>
                  </TouchableOpacity>
                </View>
                <Text style={r.mainDish}>{getMainDish(activeDayData, 'dinner')}</Text>
                {getSecondaryDishes(activeDayData, 'dinner').map((d, i) => (
                  <Text key={i} style={r.secondaryDish}>{d}</Text>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={r.ctaContainer}>
          <TouchableOpacity
            style={[r.ctaBtn, saving && { opacity: 0.6 }]}
            onPress={activeDay === 2 ? handleConfirmPlan : handleConfirmDay}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={r.ctaBtnText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Swap bottom sheet ─────────────────────────────────────────── */}
        <Modal
          visible={swapSheet.visible}
          animationType="slide"
          transparent
          onRequestClose={() => setSwapSheet(s => ({ ...s, visible: false }))}
        >
          <TouchableOpacity
            style={r.sheetOverlay}
            activeOpacity={1}
            onPress={() => setSwapSheet(s => ({ ...s, visible: false }))}
          >
            <TouchableOpacity activeOpacity={1} style={r.sheet}>
              <Text style={r.sheetHeader}>
                SWAP {swapSheet.mealType.toUpperCase()},{' '}
                {activeDayData ? activeDayData.day.toUpperCase() : ''}
              </Text>
              <Text style={r.sheetCurrent}>Current: {swapSheet.currentDish}</Text>

              {swapCuisineSugg.length > 0 && (
                <>
                  <Text style={r.sheetSection}>FROM YOUR CUISINES</Text>
                  {swapCuisineSugg.map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      style={r.swapOption}
                      onPress={() => applySwap(swapSheet.dayIdx, swapSheet.mealType, d)}
                      activeOpacity={0.8}
                    >
                      <Text style={r.swapOptionText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {swapZoneSugg.length > 0 && (
                <>
                  <Text style={r.sheetSection}>FROM YOUR REGIONS</Text>
                  {swapZoneSugg.map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      style={r.swapOption}
                      onPress={() => applySwap(swapSheet.dayIdx, swapSheet.mealType, d)}
                      activeOpacity={0.8}
                    >
                      <Text style={r.swapOptionText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <TouchableOpacity
                onPress={() => setSwapExpanded(e => !e)}
                activeOpacity={0.8}
                style={{ marginTop: 10 }}
              >
                <Text style={r.seeAllLink}>
                  See all {swapSheet.mealType} options {swapExpanded ? '\u25b2' : '\u203a'}
                </Text>
              </TouchableOpacity>

              {swapExpanded && (
                <ScrollView style={{ maxHeight: 200, marginTop: 8 }}>
                  {[...swapCuisineSugg, ...swapZoneSugg].map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      style={r.swapOption}
                      onPress={() => applySwap(swapSheet.dayIdx, swapSheet.mealType, d)}
                      activeOpacity={0.8}
                    >
                      <Text style={r.swapOptionText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Profile gate popup ────────────────────────────────────────── */}
        <Modal
          visible={profileGateVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setProfileGateVisible(false)}
        >
          <View style={r.popupOverlay}>
            <View style={r.popup}>
              <Text style={r.popupTitle}>Complete your profile first</Text>
              <Text style={r.popupBody}>
                Regenerate uses your family's health and dietary details. Add them to unlock this feature.
              </Text>
              <View style={r.popupButtons}>
                <TouchableOpacity
                  style={r.popupBtnOutline}
                  onPress={() => setProfileGateVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={r.popupBtnOutlineText}>Not now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={r.popupBtnFilled}
                  onPress={() => { setProfileGateVisible(false); router.push('/dietary-profile' as never); }}
                  activeOpacity={0.8}
                >
                  <Text style={r.popupBtnFilledText}>Complete profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Regen confirm popup (count 3 or 4) ───────────────────────── */}
        <Modal
          visible={regenConfirmVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setRegenConfirmVisible(false)}
        >
          <View style={r.popupOverlay}>
            <View style={r.popup}>
              <Text style={r.popupTitle}>Regenerate the full plan?</Text>
              <Text style={r.popupBody}>
                This will replace all 3 days, including any days you've already confirmed.
                {'\n\n'}{regenConfirmText}
              </Text>
              <View style={r.popupButtons}>
                <TouchableOpacity
                  style={r.popupBtnOutline}
                  onPress={() => setRegenConfirmVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={r.popupBtnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={r.popupBtnFilled}
                  onPress={performRegen}
                  activeOpacity={0.8}
                >
                  <Text style={r.popupBtnFilledText}>Regenerate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const r = StyleSheet.create({
  bg:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  loadingText:  { marginTop: 16, color: NAVY, fontSize: 15, fontWeight: '500', textAlign: 'center' },

  // Navigation
  navRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },

  // Controls
  controlRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  regenBtn:     { borderWidth: 1.5, borderColor: NAVY, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.85)' },
  regenBtnText: { fontSize: 13, fontWeight: '700', color: NAVY },
  regenTooltip: { fontSize: 10, color: '#8AAABB', marginTop: 2, textAlign: 'center' },
  regenCountHint:{ fontSize: 10, color: TEAL, marginTop: 2, textAlign: 'center' },

  // Day tabs
  dayTabs:      { flexDirection: 'row', gap: 6 },
  dayTab:       { borderWidth: 1.5, borderColor: NAVY, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.75)' },
  dayTabActive: { backgroundColor: NAVY },
  dayTabText:   { fontSize: 13, fontWeight: '600', color: NAVY },
  dayTabTextActive: { color: '#FFFFFF' },

  // Body
  body:         { paddingHorizontal: 16, paddingTop: 8 },
  dayHeading:   { fontSize: 20, fontWeight: '800', color: NAVY, marginBottom: 2 },
  daySubText:   { fontSize: 13, color: '#5A7A8A', marginBottom: 14 },

  // Meal cards
  mealCard:       { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(46,84,128,0.18)', padding: 14, marginBottom: 10 },
  mealCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mealLabel:      { fontSize: 11, fontWeight: '700', color: '#6A8A9A', letterSpacing: 1, textTransform: 'uppercase' },
  swapLink:       { fontSize: 14, fontWeight: '600', color: NAVY },
  mainDish:       { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 4 },
  secondaryDish:  { fontSize: 13, color: '#5A7A8A', marginTop: 2 },

  // Bottom CTA
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, backgroundColor: 'rgba(255,255,255,0.92)' },
  ctaBtn:       { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText:   { fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  // Swap sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHeader:  { fontSize: 13, fontWeight: '700', color: '#6A8A9A', letterSpacing: 1, marginBottom: 4 },
  sheetCurrent: { fontSize: 15, fontWeight: '600', color: NAVY, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.12)', paddingBottom: 12 },
  sheetSection: { fontSize: 11, fontWeight: '700', color: '#6A8A9A', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  swapOption:   { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.08)' },
  swapOptionText:{ fontSize: 15, color: NAVY, fontWeight: '500' },
  seeAllLink:   { fontSize: 14, color: TEAL, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },

  // Popups
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  popup:        { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%' },
  popupTitle:   { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 10 },
  popupBody:    { fontSize: 14, color: '#5A7A8A', lineHeight: 21, marginBottom: 20 },
  popupButtons: { flexDirection: 'row', gap: 10 },
  popupBtnOutline:     { flex: 1, borderWidth: 1.5, borderColor: NAVY, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  popupBtnOutlineText: { fontSize: 15, fontWeight: '700', color: NAVY },
  popupBtnFilled:      { flex: 1, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  popupBtnFilledText:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
