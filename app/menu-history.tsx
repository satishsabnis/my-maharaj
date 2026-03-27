import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';
import { supabase } from '../lib/supabase';
import { navy, textSec, white, border, surface, gold, textColor } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuRecord {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  cuisine: string;
  food_pref: string;
  dietary_notes: string | null;
  menu_json: { days?: Array<{
    date: string; day: string;
    breakfast: { name: string } | null;
    lunch:     { name: string } | null;
    dinner:    { name: string } | null;
  }> } | null;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MenuHistoryScreen() {
  const [records,  setRecords]  = useState<MenuRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('menu_history')
        .select('id, created_at, period_start, period_end, cuisine, food_pref, dietary_notes, menu_json')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setRecords((data as MenuRecord[]) ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function periodLabel(r: MenuRecord): string {
    if (r.period_start === r.period_end) return fmtDate(r.period_start);
    return `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}`;
  }

  const prefColors: Record<string, { bg: string; fg: string }> = {
    veg:    { bg: '#E8F5E9', fg: '#1A6B3C' },
    nonveg: { bg: '#FFF3E0', fg: '#C2410C' },
    normal: { bg: '#E8F5E9', fg: '#1A6B3C' },
    fasting:{ bg: '#F0F4FF', fg: '#3730A3' },
  };
  function prefStyle(pref: string) {
    const key = Object.keys(prefColors).find((k) => pref.toLowerCase().includes(k)) ?? 'veg';
    return prefColors[key];
  }

  return (
    <ScreenWrapper title="Menu History">

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={s.loadingText}>Loading your meal history...</Text>
        ) : records.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No meal plans yet</Text>
            <Text style={s.emptySub}>Generate your first plan to see it here</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/meal-wizard')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Generate Meal Plan →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          records.map((r) => {
            const isExpanded = expanded[r.id];
            const pc   = prefStyle(r.food_pref);
            const days = r.menu_json?.days ?? [];
            return (
              <TouchableOpacity key={r.id} style={s.card} onPress={() => toggle(r.id)} activeOpacity={0.85}>
                <View style={s.cardHeader}>
                  <View style={s.cardLeft}>
                    <Text style={s.cardPeriod}>{periodLabel(r)}</Text>
                    <View style={s.cardMeta}>
                      <View style={[s.prefPill, { backgroundColor: pc.bg }]}>
                        <Text style={[s.prefPillText, { color: pc.fg }]}>{r.food_pref}</Text>
                      </View>
                      {r.cuisine && r.cuisine !== 'Various' && <Text style={s.cuisineText}>{r.cuisine}</Text>}
                    </View>
                    {r.dietary_notes ? <Text style={s.notesText}>{r.dietary_notes}</Text> : null}
                    <Text style={s.timeText}>
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {isExpanded && days.length > 0 && (
                  <View style={s.expandedBody}>
                    {days.map((day, idx) => (
                      <View key={idx} style={[s.dayRow, idx < days.length - 1 && s.dayRowBorder]}>
                        <Text style={s.dayName}>{day.day}</Text>
                        <View style={s.mealsCol}>
                          {day.breakfast && <Text style={s.mealText}>🌅 {day.breakfast.name}</Text>}
                          {day.lunch     && <Text style={s.mealText}>☀️ {day.lunch.name}</Text>}
                          {day.dinner    && <Text style={s.mealText}>🌙 {day.dinner.name}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: white },
  header:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:  { fontSize: 22, color: navy },
  headerTitle:{ fontSize: 18, fontWeight: '700', color: navy },
  scroll:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, maxWidth: 700, width: '100%', alignSelf: 'center' },
  loadingText:{ textAlign: 'center', color: textSec, marginTop: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: textSec, textAlign: 'center', marginBottom: 24 },
  ctaBtn:     { backgroundColor: gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  ctaBtnText: { color: navy, fontWeight: '700', fontSize: 15 },

  card:        { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft:    { flex: 1 },
  cardPeriod:  { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 6 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  prefPill:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  prefPillText:{ fontSize: 12, fontWeight: '600' },
  cuisineText: { fontSize: 13, color: textSec },
  notesText:   { fontSize: 12, color: textSec, fontStyle: 'italic', marginBottom: 4 },
  timeText:    { fontSize: 12, color: textSec },
  chevron:     { fontSize: 13, color: textSec, paddingLeft: 12 },

  expandedBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: border },
  dayRow:       { paddingVertical: 10 },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: border },
  dayName:      { fontSize: 13, fontWeight: '700', color: navy, marginBottom: 6 },
  mealsCol:     { gap: 3 },
  mealText:     { fontSize: 13, color: textSec },
});
