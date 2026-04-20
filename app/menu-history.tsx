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

  useFocusEffect(useCallback(() => {
    (async () => {
      const loaded = await loadPlans();
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

  // ─── Detail view ───────────────────────────────────────────────────────────

  if (selectedPlan) {
    return (
      <ScreenWrapper title="Menu History">
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setSelectedPlan(null)} activeOpacity={0.7}>
            <Text style={s.backLink}>Back to history</Text>
          </TouchableOpacity>

          <Text style={s.detailRange}>{selectedPlan.dateRange}</Text>
          {selectedPlan.cuisines && selectedPlan.cuisines.length > 0 && (
            <Text style={s.cuisineSub}>{formatCuisines(selectedPlan.cuisines)}</Text>
          )}

          {(selectedPlan.days ?? []).map((day, idx) => {
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
                  </View>
                ) : null}
                {ln ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Lunch</Text>
                    <TouchableOpacity onPress={() => openFeedback(ln)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{ln}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {dn ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Dinner</Text>
                    <TouchableOpacity onPress={() => openFeedback(dn)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{dn}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {sn ? (
                  <View style={s.mealRow}>
                    <Text style={s.mealLabel}>Snack</Text>
                    <TouchableOpacity onPress={() => openFeedback(sn)} activeOpacity={0.7}>
                      <Text style={s.mealDish}>{sn}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>

        {renderFeedbackSheet()}
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
});
