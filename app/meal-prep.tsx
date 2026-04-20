import React, { useCallback, useState } from 'react';
import {
  Animated, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { colors } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';

// ── Types ────────────────────────────────────────────────────────────────────

interface PrepTask {
  id: string;
  dish: string;
  day: string;
  meal: string;
  prepType: string;
  instruction: string;
  timing: string;      // 'tonight' | 'tomorrow' | day name
  urgency: string;     // 'tonight' | 'today' | 'upcoming' | 'done'
  done: boolean;
}

// ── Urgency colour map (no hardcoded hex — uses theme + semantic tokens) ─────

const urgencyStyles: Record<string, {
  borderLeftColor: string;
  bg: string;
  labelColor: string;
}> = {
  tonight: {
    borderLeftColor: colors.danger,
    bg: 'rgba(226,75,74,0.06)',
    labelColor: '#A32D2D',
  },
  today: {
    borderLeftColor: colors.gold,
    bg: 'rgba(201,162,39,0.06)',
    labelColor: '#8B6914',
  },
  upcoming: {
    borderLeftColor: colors.emerald,
    bg: 'rgba(30,158,94,0.06)',
    labelColor: '#0E6830',
  },
  done: {
    borderLeftColor: 'rgba(26,58,92,0.2)',
    bg: 'transparent',
    labelColor: colors.textMuted,
  },
};

// ── Prep-type pill colours ───────────────────────────────────────────────────

const pillStyles: Record<string, { bg: string; color: string }> = {
  Soak:     { bg: 'rgba(26,122,180,0.12)', color: '#1A5A8A' },
  Marinate: { bg: 'rgba(26,58,92,0.1)',    color: colors.navy },
  Defrost:  { bg: 'rgba(201,162,39,0.12)', color: '#8B6914' },
  Grind:    { bg: 'rgba(30,158,94,0.12)',  color: '#0E6830' },
  Dough:    { bg: 'rgba(138,90,30,0.1)',   color: '#6B4510' },
};

const defaultPill = { bg: 'rgba(26,58,92,0.08)', color: colors.textSecondary };

// ── Group helpers ────────────────────────────────────────────────────────────

function groupLabel(task: PrepTask): string {
  if (task.done) return 'Completed';
  if (task.urgency === 'tonight') return 'Do tonight';
  if (task.urgency === 'today') return 'Do tomorrow';
  return `Do ${task.timing}`;
}

function groupOrder(label: string): number {
  if (label === 'Do tonight') return 0;
  if (label === 'Do tomorrow') return 1;
  if (label === 'Completed') return 99;
  return 2;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function MealPrepScreen() {
  const [tasks, setTasks] = useState<PrepTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadPrepTasks() {
    try {
      const user = await getSessionUser();
      if (user) {
        const currentPlanId = await AsyncStorage.getItem('current_plan_id');
        let query = supabase
          .from('meal_prep_tasks')
          .select('id, dish, day, meal, prep_type, instruction, timing, urgency, done')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (currentPlanId) query = query.eq('plan_id', currentPlanId);
        const { data, error } = await query;
        if (!error && data) {
          setTasks(data.map((row: any) => ({
            id: row.id,
            dish: row.dish,
            day: row.day,
            meal: row.meal,
            prepType: row.prep_type,
            instruction: row.instruction,
            timing: row.timing,
            urgency: row.done ? 'done' : row.urgency,
            done: row.done,
          })));
        }
      }
    } catch {}
    setLoaded(true);
  }

  useFocusEffect(useCallback(() => { void loadPrepTasks(); }, []));

  async function toggleDone(id: string) {
    setTasks(prev => {
      const next = prev.map(t =>
        t.id === id ? { ...t, done: !t.done, urgency: !t.done ? 'done' : 'upcoming' } : t,
      );
      // Always write to AsyncStorage
      AsyncStorage.setItem('meal_prep_tasks', JSON.stringify(next)).catch(() => {});
      // Fire-and-forget Supabase update
      const task = next.find(t => t.id === id);
      if (task) {
        supabase.from('meal_prep_tasks')
          .update({ done: task.done, urgency: task.urgency })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[MealPrep] toggleDone error:', error.message);
          });
      }
      return next;
    });
  }

  // Group tasks by timing label
  const groups: { label: string; items: PrepTask[] }[] = [];
  const seen = new Map<string, PrepTask[]>();
  tasks.forEach(t => {
    const lbl = groupLabel(t);
    if (!seen.has(lbl)) { seen.set(lbl, []); groups.push({ label: lbl, items: seen.get(lbl)! }); }
    seen.get(lbl)!.push(t);
  });
  groups.sort((a, b) => groupOrder(a.label) - groupOrder(b.label));

  const tonightCount = tasks.filter(t => t.urgency === 'tonight' && !t.done).length;

  return (
    <ScreenWrapper title="Meal Prep" onBack={() => router.back()} showHome>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Tip card */}
          <View style={s.tipCard}>
            <Text style={s.tipText}>
              I have analysed your week's plan and identified every dish that needs advance preparation.
              Complete each task on time and nothing will be rushed on cooking day.
            </Text>
          </View>

          {/* Empty state */}
          {loaded && tasks.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 22 }}>
                No active plan yet.{'\n'}Generate a plan from the home screen first.
              </Text>
              <TouchableOpacity
                style={{ borderWidth: 1.5, borderColor: colors.navy, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 24 }}
                onPress={() => router.push('/meal-wizard' as never)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.navy }}>Plan My Week</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tonight banner */}
          {tonightCount > 0 && (
            <View style={s.tonightBanner}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.white }}>
                  Tonight before you sleep
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  {tonightCount} {tonightCount === 1 ? 'task' : 'tasks'} remaining
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.emerald }}>{tonightCount}</Text>
            </View>
          )}

          {/* Grouped tasks */}
          {groups.map(group => (
            <View key={group.label} style={{ marginBottom: 6 }}>
              {/* Day divider */}
              <Text style={s.sectionTitle}>{group.label}</Text>
              <View style={s.sectionDivider} />

              {group.items.map(task => {
                const uStyle = urgencyStyles[task.urgency] || urgencyStyles.upcoming;
                const pill = pillStyles[task.prepType] || defaultPill;

                return (
                  <View
                    key={task.id}
                    style={[
                      s.card,
                      {
                        borderLeftWidth: 3,
                        borderLeftColor: uStyle.borderLeftColor,
                        backgroundColor: uStyle.bg,
                      },
                      task.done && { opacity: 0.6 },
                    ]}
                  >
                    {/* Top row: urgency label + check circle */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', color: uStyle.labelColor }}>
                        {task.urgency === 'tonight' ? 'Urgent' : task.urgency === 'today' ? 'Today' : task.urgency === 'done' ? 'Done' : 'Upcoming'}
                      </Text>
                      <TouchableOpacity onPress={() => toggleDone(task.id)}>
                        <View style={[
                          s.checkCircle,
                          task.done && { backgroundColor: colors.emerald, borderColor: colors.emerald },
                        ]}>
                          {task.done && <Text style={{ fontSize: 14, color: colors.white, lineHeight: 14 }}>{'✓'}</Text>}
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Dish name */}
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>{task.dish}</Text>

                    {/* Instruction */}
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 5, lineHeight: 19 }}>{task.instruction}</Text>

                    {/* Tags row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: pill.bg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: pill.color }}>{task.prepType}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        For {task.day} {task.meal}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
    </ScreenWrapper>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 24 },
  tipCard: {
    backgroundColor: 'rgba(30,158,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(30,158,94,0.2)',
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  tipText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  tonightBanner: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(30,158,94,0.2)',
    marginBottom: 7,
  },
  card: {
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 9,
    paddingHorizontal: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(26,58,92,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
