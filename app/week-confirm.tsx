import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { scheduleStreakMilestoneNotification } from '../lib/notifications';
import { colors } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeekPlan {
  id: string;
  periodStart: string;
  periodEnd: string;
  days: any[];
  isGhost: boolean;
  confirmedDays: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getThisWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().split('T')[0];
}

function getMealNames(day: any): { breakfast: string; lunch: string; dinner: string } {
  const bf =
    day?.breakfast?.dishName ||
    day?.anatomy?.breakfast?.dishName ||
    day?.breakfast?.name ||
    (typeof day?.breakfast === 'string' ? day.breakfast : '') || '';

  const lc = day?.lunch?.curry ?? day?.anatomy?.lunch?.curry;
  const ln = Array.isArray(lc)
    ? (lc[0]?.dishName ?? '')
    : (lc?.dishName ?? day?.lunch?.name ?? (typeof day?.lunch === 'string' ? day.lunch : '') ?? '');

  const dc = day?.dinner?.curry ?? day?.anatomy?.dinner?.curry;
  const dn = Array.isArray(dc)
    ? (dc[0]?.dishName ?? '')
    : (dc?.dishName ?? day?.dinner?.name ?? (typeof day?.dinner === 'string' ? day.dinner : '') ?? '');

  return { breakfast: bf, lunch: ln, dinner: dn };
}

function formatRange(from: string, to: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmt = (ymd: string) => {
    const [, m, d] = ymd.split('-');
    return `${d} ${MONTHS[Number(m) - 1]}`;
  };
  return from === to ? fmt(from) : `${fmt(from)} — ${fmt(to)}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WeekConfirmScreen() {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [confirmedDays, setConfirmedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    void load();
  }, []));

  async function load() {
    setLoading(true);
    try {
      const user = await getSessionUser();
      if (!user) { setLoading(false); return; }

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, period_start, period_end, plan_json, is_ghost, confirmed_days')
        .eq('user_id', user.id)
        .lte('period_start', today)
        .gte('period_end', today)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const row: WeekPlan = {
          id: data.id,
          periodStart: data.period_start,
          periodEnd: data.period_end,
          days: data.plan_json?.days ?? [],
          isGhost: data.is_ghost === true,
          confirmedDays: Array.isArray(data.confirmed_days) ? data.confirmed_days : [],
        };
        setPlan(row);
        setConfirmedDays(row.confirmedDays);
      }
    } catch {}
    setLoading(false);
  }

  async function updateStreak() {
    try {
      const user = await getSessionUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_weeks, streak_last_confirmed, streak_banked_weeks')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile) return;

      const thisWeekMonday = getThisWeekMonday();
      const lastWeekDate = new Date(thisWeekMonday);
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      const lastWeekMonday = lastWeekDate.toISOString().split('T')[0];

      const lastConfirmed: string | null = profile.streak_last_confirmed ?? null;
      if (lastConfirmed === thisWeekMonday) return;

      let newStreak: number;
      if (lastConfirmed === lastWeekMonday) {
        newStreak = (profile.streak_weeks ?? 0) + 1;
      } else {
        newStreak = 1;
      }

      const currentBanked = profile.streak_banked_weeks ?? 0;
      const newBankedWeeks = newStreak % 4 === 0 ? currentBanked + 1 : currentBanked;

      await supabase.from('profiles').update({
        streak_weeks: newStreak,
        streak_last_confirmed: thisWeekMonday,
        streak_banked_weeks: newBankedWeeks,
      }).eq('id', user.id);

      if (newStreak % 4 === 0) {
        void scheduleStreakMilestoneNotification(newStreak, newBankedWeeks);
      }
    } catch {}
  }

  async function toggleDay(date: string) {
    if (!plan || saving || !date) return;
    const next = confirmedDays.includes(date)
      ? confirmedDays.filter(d => d !== date)
      : [...confirmedDays, date];
    setConfirmedDays(next); // optimistic
    setSaving(true);
    try {
      const allNowConfirmed = plan.days.every(d => d.date && next.includes(d.date));
      await supabase
        .from('meal_plans')
        .update({ confirmed_days: next, ...(allNowConfirmed ? { is_approved: true } : {}) })
        .eq('id', plan.id);
      if (allNowConfirmed) void updateStreak();
    } catch {}
    setSaving(false);
  }

  if (loading) {
    return (
      <ScreenWrapper title="Confirm Your Week">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!plan || plan.days.length === 0) {
    return (
      <ScreenWrapper title="Confirm Your Week">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={s.emptyTitle}>No plan for this week yet</Text>
          <Text style={s.emptySub}>
            Generate a plan from the home screen and come back here to confirm each day.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const allConfirmed = plan.days.every(d => d.date && confirmedDays.includes(d.date));

  return (
    <ScreenWrapper title="Confirm Your Week">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Week range */}
        <Text style={s.weekRange}>
          {formatRange(plan.periodStart, plan.periodEnd)}
        </Text>

        {/* Ghost plan banner */}
        {plan.isGhost && (
          <View style={s.ghostBanner}>
            <Text style={s.ghostBannerText}>
              Maharaj has planned this week — tap each day to confirm
            </Text>
          </View>
        )}

        {/* All-confirmed summary */}
        {allConfirmed && (
          <View style={s.allDoneBanner}>
            <Text style={s.allDoneText}>All days confirmed for this week</Text>
          </View>
        )}

        {/* Day cards */}
        {plan.days.map((day, idx) => {
          const date: string = day.date ?? '';
          const isConfirmed = date ? confirmedDays.includes(date) : false;
          const dateLabel = date
            ? new Date(date).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'short',
              })
            : `Day ${idx + 1}`;
          const { breakfast, lunch, dinner } = getMealNames(day);

          return (
            <TouchableOpacity
              key={idx}
              style={[s.dayCard, isConfirmed && s.dayCardConfirmed]}
              onPress={() => toggleDay(date)}
              activeOpacity={date ? 0.8 : 1}
            >
              <View style={s.cardHeader}>
                <Text style={[s.dayName, isConfirmed && s.dayNameConfirmed]}>
                  {dateLabel}
                </Text>
                <View style={s.tagRow}>
                  {plan.isGhost && (
                    <View style={s.maharajTag}>
                      <Text style={s.maharajTagTxt}>Maharaj</Text>
                    </View>
                  )}
                  {isConfirmed && (
                    <View style={s.confirmedTag}>
                      <Text style={s.confirmedTagTxt}>Confirmed</Text>
                    </View>
                  )}
                </View>
              </View>

              {breakfast ? (
                <View style={s.mealRow}>
                  <Text style={s.mealLabel}>Breakfast</Text>
                  <Text style={s.mealDish}>{breakfast}</Text>
                </View>
              ) : null}
              {lunch ? (
                <View style={s.mealRow}>
                  <Text style={s.mealLabel}>Lunch</Text>
                  <Text style={s.mealDish}>{lunch}</Text>
                </View>
              ) : null}
              {dinner ? (
                <View style={s.mealRow}>
                  <Text style={s.mealLabel}>Dinner</Text>
                  <Text style={s.mealDish}>{dinner}</Text>
                </View>
              ) : null}

              {!date && (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  Tap to confirm
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
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

  weekRange: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E5480',
    marginBottom: 8,
  },

  ghostBanner: {
    backgroundColor: 'rgba(201,162,39,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#C9A227',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  ghostBannerText: {
    fontSize: 13,
    color: '#8B6914',
    lineHeight: 18,
  },

  allDoneBanner: {
    backgroundColor: 'rgba(26,107,92,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#1A6B5C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  allDoneText: {
    fontSize: 13,
    color: '#1A6B5C',
    fontWeight: '600',
  },

  dayCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  dayCardConfirmed: {
    backgroundColor: 'rgba(212,237,229,0.75)',
    borderColor: 'rgba(26,107,92,0.25)',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E5480',
    flex: 1,
  },
  dayNameConfirmed: {
    color: '#1A6B5C',
  },

  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  maharajTag: {
    backgroundColor: 'rgba(201,162,39,0.15)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  maharajTagTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B6914',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  confirmedTag: {
    backgroundColor: 'rgba(26,107,92,0.12)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  confirmedTagTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A6B5C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
    gap: 6,
  },
  mealLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5A7A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    width: 70,
    paddingTop: 1,
  },
  mealDish: {
    fontSize: 13,
    color: '#2E5480',
    flex: 1,
    lineHeight: 18,
  },

  emptyTitle: {
    fontSize: 15,
    color: '#2E5480',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#5A7A8A',
    textAlign: 'center',
    lineHeight: 20,
  },
});
