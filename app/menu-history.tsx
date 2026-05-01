import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { track } from '../lib/analytics';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors } from '../constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MealEntry {
  name: string;
}

interface DayPlan {
  date?: string;
  day?: string;
  dayName?: string;
  breakfast?: MealEntry | string | null;
  lunch?: MealEntry | string | null;
  dinner?: MealEntry | string | null;
  snack?: MealEntry | string | null;
}

interface MenuPlan {
  id: string;
  createdAt: string;
  dateRange: string;
  cuisines?: string[];
  days: DayPlan[];
  periodStart?: string;
}

interface GhostPlan {
  days: any[];
  weekStart: string;
  approved: boolean;
}

interface DishFeedback {
  rating: string;     // 'loved' | 'ok' | 'disliked'
  count: number;
  isFavourite: boolean;
}

const MONTHS_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function monthFromISO(iso: string): string {
  try {
    const d = new Date(iso);
    return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return 'Unknown'; }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS_ABBR[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return ''; }
}

function formatDateRange(from?: string | null, to?: string | null): string {
  if (!from && !to) return '—';
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split('-');
    return `${d}-${m}-${y}`;
  };
  if (!from) return fmt(to!);
  if (!to)   return fmt(from);
  if (from === to) return fmt(from);
  return `${fmt(from)} — ${fmt(to)}`;
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

function formatCuisines(cuisines?: string[]): string {
  if (!cuisines || cuisines.length === 0) return '—';
  if (cuisines.length === 1) return cuisines[0];
  if (cuisines.length <= 3) return cuisines.join(', ');
  return 'Pan-Indian';
}

function dishName(entry: MealEntry | string | null | undefined): string {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.name ?? '';
}

function dayCount(plan: MenuPlan): number {
  return plan.days?.length ?? 0;
}

// ─── Group plans by month ────────────────────────────────────────────────────

function groupByMonth(plans: MenuPlan[]): { month: string; plans: MenuPlan[] }[] {
  const map: Record<string, MenuPlan[]> = {};
  const order: string[] = [];
  for (const p of plans) {
    const m = monthFromISO(p.createdAt);
    if (!map[m]) { map[m] = []; order.push(m); }
    map[m].push(p);
  }
  return order.map(m => ({ month: m, plans: map[m] }));
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MenuHistoryScreen() {
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MenuPlan | null>(null);

  // Feedback sheet state
  const [feedbackDish, setFeedbackDish] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [ghostPlan, setGhostPlan] = useState<GhostPlan | null>(null);
  const [viewingGhost, setViewingGhost] = useState(false);

  // Swap modal state
  const [swapModal, setSwapModal] = useState<{
    visible: boolean;
    dayIndex: number;
    slotKey: 'breakfast' | 'lunch' | 'dinner' | 'snack' | '';
    currentDish: string;
    options: string[];
  }>({ visible: false, dayIndex: -1, slotKey: '', currentDish: '', options: [] });
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSaving, setSwapSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const loaded = await loadPlans();

      const ghostFlag = await AsyncStorage.getItem('menu_history_open_ghost');
      if (ghostFlag === 'true') {
        await AsyncStorage.removeItem('menu_history_open_ghost');
        const ghostRaw = await AsyncStorage.getItem('ghost_meal_plan');
        if (ghostRaw) {
          try {
            const ghost: GhostPlan = JSON.parse(ghostRaw);
            if (loaded && loaded.length > 0) {
              // User has a plan — show it with the ghost tab active
              setSelectedPlan(loaded[0]);
              setViewingGhost(true);
            } else {
              // No user plan — create a synthetic entry from the ghost data
              setSelectedPlan({
                id: 'ghost',
                createdAt: new Date().toISOString(),
                dateRange: 'This week',
                cuisines: [],
                days: ghost.days,
                periodStart: ghost.weekStart,
              });
              setViewingGhost(true);
            }
          } catch {}
        }
        return;
      }

      const flag = await AsyncStorage.getItem('menu_history_auto_open_latest');
      if (flag === 'true') {
        await AsyncStorage.removeItem('menu_history_auto_open_latest');
        if (loaded && loaded.length > 0) {
          setSelectedPlan(loaded[0]);
        }
      }
    })();
  }, []));

  async function loadPlans(): Promise<MenuPlan[]> {
    setLoading(true);
    // Load ghost plan from AsyncStorage in parallel
    AsyncStorage.getItem('ghost_meal_plan').then(raw => {
      if (!raw) { setGhostPlan(null); return; }
      try { setGhostPlan(JSON.parse(raw)); } catch { setGhostPlan(null); }
    });
    try {
      // Try Supabase first
      const user = await getSessionUser();
      if (user) {
        try {
          const { data, error } = await supabase
            .from('meal_plans')
            .select('id, period_start, period_end, cuisines, plan_json, generated_at')
            .eq('user_id', user.id)
            .order('generated_at', { ascending: false })
            .limit(20);
          if (!error && data && data.length > 0) {
            const mapped: MenuPlan[] = data.map((row: any) => ({
              id: row.id,
              createdAt: row.generated_at,
              dateRange: formatDateRange(row.period_start, row.period_end),
              cuisines: row.cuisines || [],
              days: row.plan_json?.days ?? [],
              periodStart: row.period_start ?? undefined,
            }));
            setPlans(mapped);
            setLoading(false);
            return mapped;
          }
        } catch { /* fall through to AsyncStorage */ }
      }
      // Fallback: AsyncStorage
      const raw = await AsyncStorage.getItem('menu_history');
      let arr: MenuPlan[] = [];
      try {
        arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) arr = [];
      } catch (e) {
        console.error('[Menu History] corrupted AsyncStorage:', e);
        arr = [];
      }
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPlans(arr);
      setLoading(false);
      return arr;
    } catch {
      setPlans([]);
      setLoading(false);
      return [];
    }
  }

  // ─── Feedback handling ─────────────────────────────────────────────────────

  function openFeedback(name: string) {
    setFeedbackDish(name);
    setFeedbackVisible(true);
  }

  async function submitFeedback(rating: 'loved' | 'ok' | 'disliked') {
    if (!feedbackDish) return;
    track('dish_feedback_given', { dish: feedbackDish, rating });
    try {
      // Always write to AsyncStorage first
      const raw = await AsyncStorage.getItem('dish_feedback');
      const all: Record<string, DishFeedback> = raw ? JSON.parse(raw) : {};
      const existing = all[feedbackDish] ?? { rating: '', count: 0, isFavourite: false };

      existing.rating = rating;
      existing.count = existing.count + 1;

      // Mark as favourite if loved 3 or more times
      const lovedCount = rating === 'loved' ? existing.count : (existing.rating === 'loved' ? existing.count : 0);
      if (rating === 'loved' && lovedCount >= 3) {
        existing.isFavourite = true;
      }

      all[feedbackDish] = existing;
      await AsyncStorage.setItem('dish_feedback', JSON.stringify(all));

      // Fire-and-forget Supabase upsert
      const user = await getSessionUser();
      if (user) {
        supabase.from('dish_feedback').upsert({
          user_id: user.id,
          dish_name: feedbackDish,
          rating,
          count: existing.count,
          is_favourite: existing.isFavourite,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,dish_name' }).then(({ error }) => {
          if (error) console.error('[MenuHistory] dish_feedback upsert error:', error.message);
        });
      }
    } catch { /* silent */ }
    setFeedbackVisible(false);
    setFeedbackDish(null);
  }

  // ─── Swap handling ─────────────────────────────────────────────────────────

  function collectUsedDishNames(days: DayPlan[]): string[] {
    const names = new Set<string>();
    for (const d of days) {
      const b = dishName(d.breakfast); if (b) names.add(b);
      const l = dishName(d.lunch);     if (l) names.add(l);
      const dn = dishName(d.dinner);   if (dn) names.add(dn);
      const s = dishName(d.snack);     if (s) names.add(s);
    }
    return Array.from(names);
  }

  async function openSwapModal(
    dayIndex: number,
    slotKey: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    currentDishName: string,
  ) {
    if (!selectedPlan) return;
    const cuisines = selectedPlan.cuisines ?? [];
    const usedDishNames = collectUsedDishNames(selectedPlan.days ?? []);
    setSwapModal({ visible: true, dayIndex, slotKey, currentDish: currentDishName, options: [] });
    setSwapLoading(true);
    try {
      const opts = await fetchSwapOptions(slotKey, cuisines, currentDishName, usedDishNames);
      setSwapModal(prev => ({ ...prev, options: opts }));
    } finally {
      setSwapLoading(false);
    }
  }

  async function fetchSwapOptions(
    slot: string,
    cuisines: string[],
    currentDishName: string,
    usedDishNames: string[],
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('dishes')
        .select('name, cuisine')
        .contains('meal_type', [slot])
        .neq('name', currentDishName)
        .eq('is_banned', false)
        .limit(20);
      if (error || !data) return [];
      const usedSet = new Set(usedDishNames.map(n => n.toLowerCase()));
      let pool = (data as { name: string; cuisine: string[] }[])
        .filter(d => !usedSet.has(d.name.toLowerCase()));
      if (cuisines.length > 0) {
        const cuisineLower = cuisines.map(c => c.toLowerCase());
        const filtered = pool.filter(d =>
          (d.cuisine ?? []).some(dc => cuisineLower.some(c => dc.toLowerCase().includes(c))),
        );
        if (filtered.length >= 3) pool = filtered;
      }
      // Random 3
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3).map(d => d.name);
    } catch (e) {
      console.error('[MenuHistory] fetchSwapOptions error:', e);
      return [];
    }
  }

  async function confirmSwap(newDishName: string) {
    if (!selectedPlan || swapModal.dayIndex < 0 || !swapModal.slotKey) return;
    setSwapSaving(true);
    try {
      const dayIndex = swapModal.dayIndex;
      const slotKey = swapModal.slotKey;
      const originalDish = swapModal.currentDish;

      // Update plan in memory — preserve shape (string vs {name})
      const updatedDays: DayPlan[] = (selectedPlan.days ?? []).map((d, i) => {
        if (i !== dayIndex) return d;
        const existing = (d as any)[slotKey];
        const replacement =
          existing && typeof existing === 'object' && 'name' in existing
            ? { ...existing, name: newDishName }
            : newDishName;
        return { ...d, [slotKey]: replacement };
      });

      const updatedPlan: MenuPlan = { ...selectedPlan, days: updatedDays };

      // Compute swap_date
      const targetDay = updatedDays[dayIndex];
      let swapDate: string | null = targetDay?.date ?? null;
      if (!swapDate && selectedPlan.periodStart) {
        const base = new Date(selectedPlan.periodStart);
        base.setDate(base.getDate() + dayIndex);
        swapDate = base.toISOString().split('T')[0];
      }

      // Update Supabase meal_plans.plan_json (only for real plans, not ghost)
      if (selectedPlan.id && selectedPlan.id !== 'ghost') {
        const user = await getSessionUser();
        if (user) {
          const { error: updErr } = await supabase
            .from('meal_plans')
            .update({ plan_json: { days: updatedDays } })
            .eq('id', selectedPlan.id)
            .eq('user_id', user.id);
          if (updErr) console.error('[MenuHistory] meal_plans update error:', updErr.message);

          // Insert swap row
          supabase.from('meal_swaps').insert({
            user_id: user.id,
            plan_id: selectedPlan.id,
            swap_date: swapDate,
            slot: slotKey,
            original_dish: originalDish,
            swapped_dish: newDishName,
          }).then(({ error: insErr }) => {
            if (insErr) console.error('[MenuHistory] meal_swaps insert error:', insErr.message);
          });
        }
      }

      // Update AsyncStorage current_week_plan
      try {
        await AsyncStorage.setItem(
          'current_week_plan',
          JSON.stringify({ days: updatedDays }),
        );
      } catch (e) {
        console.error('[MenuHistory] AsyncStorage current_week_plan write error:', e);
      }

      // Refresh local state
      setPlans(prev => prev.map(p => (p.id === selectedPlan.id ? updatedPlan : p)));
      setSelectedPlan(updatedPlan);
      track('meal_swapped', { slot: slotKey, original: originalDish, swapped: newDishName });
    } finally {
      setSwapSaving(false);
      setSwapModal({ visible: false, dayIndex: -1, slotKey: '', currentDish: '', options: [] });
    }
  }

  function closeSwapModal() {
    if (swapSaving) return;
    setSwapModal({ visible: false, dayIndex: -1, slotKey: '', currentDish: '', options: [] });
  }

  // ─── Detail view ───────────────────────────────────────────────────────────

  if (selectedPlan) {
    const thisMonday = getThisWeekMonday();
    const showTabs = !!ghostPlan && !ghostPlan.approved &&
      ghostPlan.weekStart === thisMonday &&
      selectedPlan.id !== 'ghost' &&
      !!selectedPlan.periodStart &&
      selectedPlan.periodStart >= thisMonday;
    const displayDays: DayPlan[] = (viewingGhost && ghostPlan) ? ghostPlan.days : (selectedPlan.days ?? []);
    const displayRange = viewingGhost ? "This week (Maharaj's Suggestion)" : selectedPlan.dateRange;

    return (
      <ScreenWrapper title="Menu History">
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => { setSelectedPlan(null); setViewingGhost(false); }} activeOpacity={0.7}>
            <Text style={s.backLink}>Back to history</Text>
          </TouchableOpacity>

          {showTabs && (
            <View style={{ flexDirection: 'row', marginBottom: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2E5480' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: !viewingGhost ? '#2E5480' : 'transparent' }}
                onPress={() => setViewingGhost(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: !viewingGhost ? 'white' : '#2E5480' }}>Your Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: viewingGhost ? '#C9A227' : 'transparent' }}
                onPress={() => setViewingGhost(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: viewingGhost ? '#1A1A1A' : '#C9A227' }}>Maharaj's Suggestion</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.detailRange}>{displayRange}</Text>
          {!viewingGhost && selectedPlan.cuisines && selectedPlan.cuisines.length > 0 && (
            <Text style={s.cuisineSub}>{formatCuisines(selectedPlan.cuisines)}</Text>
          )}

          {displayDays.map((day, idx) => {
            const dateLabel = day.date ? new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : '';
            const label = dateLabel || day.day || day.dayName || `Day ${idx + 1}`;
            const bf = dishName(day.breakfast);
            const ln = dishName(day.lunch);
            const dn = dishName(day.dinner);
            const sn = dishName(day.snack);
            return (
              <View key={idx} style={s.dayCard}>
                <Text style={s.dayName}>{label}</Text>
                {bf ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Breakfast</Text>
                    <TouchableOpacity onPress={() => openFeedback(bf)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{bf}</Text>
                    </TouchableOpacity>
                    {!viewingGhost && (
                      <TouchableOpacity onPress={() => openSwapModal(idx, 'breakfast', bf)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.swapBtn}>Swap</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
                {ln ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Lunch</Text>
                    <TouchableOpacity onPress={() => openFeedback(ln)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{ln}</Text>
                    </TouchableOpacity>
                    {!viewingGhost && (
                      <TouchableOpacity onPress={() => openSwapModal(idx, 'lunch', ln)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.swapBtn}>Swap</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
                {dn ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Dinner</Text>
                    <TouchableOpacity onPress={() => openFeedback(dn)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{dn}</Text>
                    </TouchableOpacity>
                    {!viewingGhost && (
                      <TouchableOpacity onPress={() => openSwapModal(idx, 'dinner', dn)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.swapBtn}>Swap</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
                {sn ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Snack</Text>
                    <TouchableOpacity onPress={() => openFeedback(sn)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{sn}</Text>
                    </TouchableOpacity>
                    {!viewingGhost && (
                      <TouchableOpacity onPress={() => openSwapModal(idx, 'snack', sn)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.swapBtn}>Swap</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>

        {renderFeedbackSheet()}
        {renderSwapModal()}
      </ScreenWrapper>
    );
  }

  // ─── List view ─────────────────────────────────────────────────────────────

  const grouped = groupByMonth(plans);

  function renderFeedbackSheet() {
    return (
      <Modal visible={feedbackVisible} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={s.sheetContent}>
            {/* Navy M circle + label */}
            <View style={s.sheetHeader}>
              <View style={s.maharajCircle}>
                <Text style={s.maharajLetter}>M</Text>
              </View>
              <Text style={s.maharajLabel}>Maharaj</Text>
            </View>

            <Text style={s.sheetQuestion}>
              You had {feedbackDish}. Did you enjoy it?
            </Text>

            <TouchableOpacity
              style={s.feedbackBtnLoved}
              onPress={() => submitFeedback('loved')}
              activeOpacity={0.8}
            >
              <Text style={s.feedbackBtnLovedText}>Loved it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.feedbackBtnOk}
              onPress={() => submitFeedback('ok')}
              activeOpacity={0.8}
            >
              <Text style={s.feedbackBtnOkText}>It was ok</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.feedbackBtnDislike}
              onPress={() => submitFeedback('disliked')}
              activeOpacity={0.8}
            >
              <Text style={s.feedbackBtnDislikeText}>Did not like it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setFeedbackVisible(false); setFeedbackDish(null); }}
              activeOpacity={0.7}
              style={{ marginTop: 10, alignItems: 'center' }}
            >
              <Text style={s.askLater}>Ask me later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderSwapModal() {
    return (
      <Modal visible={swapModal.visible} transparent animationType="slide" onRequestClose={closeSwapModal}>
        <View style={s.swapOverlay}>
          <View style={s.swapSheet}>
            <Text style={s.swapTitle}>Swap this meal</Text>
            <Text style={s.swapCurrentDish}>{swapModal.currentDish}</Text>

            {swapLoading ? (
              <Text style={s.swapEmpty}>Finding alternatives…</Text>
            ) : swapModal.options.length === 0 ? (
              <Text style={s.swapEmpty}>No alternatives found.</Text>
            ) : (
              swapModal.options.map((opt, i) => (
                <TouchableOpacity
                  key={`${opt}-${i}`}
                  style={s.swapOption}
                  onPress={() => confirmSwap(opt)}
                  activeOpacity={0.8}
                  disabled={swapSaving}
                >
                  <Text style={s.swapOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              onPress={closeSwapModal}
              activeOpacity={0.7}
              style={s.swapCancel}
              disabled={swapSaving}
            >
              <Text style={s.swapCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <ScreenWrapper title="Menu History">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Maharaj tip */}
        <View style={s.tipCard}>
          <Text style={s.tipText}>
            All your past meal plans are saved here. Tap any plan to view the full summary. Tap any dish in a past plan and I will ask if you enjoyed it.
          </Text>
        </View>

        {/* Empty state */}
        {!loading && plans.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No plans generated yet.</Text>
            <Text style={s.emptySub}>Plan your first week with Maharaj.</Text>
            <TouchableOpacity
              style={s.planBtn}
              onPress={() => router.push('/meal-wizard' as never)}
              activeOpacity={0.8}
            >
              <Text style={s.planBtnText}>Plan My Week</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Grouped plans */}
        {grouped.map((group) => (
          <View key={group.month}>
            <Text style={s.sectionTitle}>{group.month}</Text>
            {group.plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={s.card}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.8}
              >
                <View style={s.cardTopRow}>
                  <Text style={s.cardRange}>{plan.dateRange}</Text>
                  <View style={s.dayCountPill}>
                    <Text style={s.dayCountText}>{dayCount(plan)} days</Text>
                  </View>
                </View>
                <Text style={s.cuisineSub}>{formatCuisines(plan.cuisines)}</Text>
                <View style={s.cardBottomRow}>
                  <Text style={s.timestampText}>{formatTimestamp(plan.createdAt)}</Text>
                  <Text style={s.chevron}>{'>'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderFeedbackSheet()}
    </ScreenWrapper>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  // Maharaj tip
  tipCard: {
    backgroundColor: 'rgba(30,158,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(30,158,94,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: colors.teal,
    lineHeight: 20,
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.emerald,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,158,94,0.2)',
  },

  // Base card
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  // Plan card list view
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardRange: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    flex: 1,
  },
  dayCountPill: {
    backgroundColor: 'rgba(30,158,94,0.12)',
    borderRadius: 20,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  dayCountText: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
  },
  cuisineSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 12,
    color: colors.emerald,
    fontWeight: '600',
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  planBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  planBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },

  // Detail view
  backLink: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
    marginBottom: 10,
  },
  detailRange: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  dayCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 5,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  mealLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    width: 50,
  },
  mealDish: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textDecorationColor: colors.emerald,
  },

  // Feedback bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  maharajCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maharajLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  maharajLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  sheetQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 14,
    lineHeight: 22,
  },
  feedbackBtnLoved: {
    backgroundColor: colors.emerald,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackBtnLovedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  feedbackBtnOk: {
    backgroundColor: 'rgba(90,122,138,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackBtnOkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  feedbackBtnDislike: {
    backgroundColor: 'rgba(226,75,74,0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackBtnDislikeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  askLater: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Swap button + modal
  swapBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C9A227',
    marginLeft: 8,
  },
  swapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  swapSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  swapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E5480',
    marginBottom: 6,
  },
  swapCurrentDish: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E5480',
    marginBottom: 14,
  },
  swapEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 14,
    textAlign: 'center',
  },
  swapOption: {
    borderWidth: 1.5,
    borderColor: '#2E5480',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  swapOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E5480',
  },
  swapCancel: {
    marginTop: 6,
    alignItems: 'center',
    paddingVertical: 10,
  },
  swapCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
