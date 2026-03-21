import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Modal, Platform, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, midGray, darkGray, lightGray } from '../theme/colors';

interface HistoryRow {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  cuisine: string;
  food_pref: string;
  dietary_notes: string | null;
  menu_json: { days?: DayMenu[] } | null;
  recipes_generated: boolean;
  created_at: string;
}

interface DayMenu {
  date: string;
  day: string;
  breakfast: { name: string };
  lunch: { name: string };
  dinner: { name: string };
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${formatShort(dateStr)} · ${h}:${m} ${ampm}`;
}

export default function MenuHistoryScreen() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryRow | null>(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => { void loadHistory(); }, []);

  async function loadHistory() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from('menu_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filterFrom) query = query.gte('period_start', filterFrom);
    if (filterTo) query = query.lte('period_end', filterTo);

    const { data } = await query;
    setRows((data as HistoryRow[]) ?? []);
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Menu History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Filters */}
      <View style={s.filterBar}>
        <View style={s.filterRow}>
          <View style={s.filterInput}>
            <Text style={s.filterLabel}>From</Text>
            <TextInput
              style={s.filterField}
              value={filterFrom}
              onChangeText={setFilterFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={midGray}
            />
          </View>
          <View style={s.filterInput}>
            <Text style={s.filterLabel}>To</Text>
            <TextInput
              style={s.filterField}
              value={filterTo}
              onChangeText={setFilterTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={midGray}
            />
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => void loadHistory()}>
            <Text style={s.filterBtnText}>Filter</Text>
          </TouchableOpacity>
          {(filterFrom || filterTo) && (
            <TouchableOpacity style={s.clearBtn} onPress={() => { setFilterFrom(''); setFilterTo(''); void loadHistory(); }}>
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={navy} size="large" /></View>
      ) : rows.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>No meal history yet</Text>
          <Text style={s.emptyDesc}>Generate a meal plan to see it appear here. Plans are retained for 3 months.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 2 }]}>Date</Text>
            <Text style={[s.th, { flex: 2 }]}>Period</Text>
            <Text style={[s.th, { flex: 1.5 }]}>Cuisine</Text>
            <Text style={[s.th, { flex: 1 }]}>Meals</Text>
          </View>

          {rows.map((row) => (
            <TouchableOpacity key={row.id} style={s.tableRow} onPress={() => setSelected(row)} activeOpacity={0.8}>
              <Text style={[s.td, { flex: 2 }]}>{formatDateTime(row.created_at)}</Text>
              <Text style={[s.td, { flex: 2 }]}>
                {formatShort(row.period_start)}
                {row.period_end !== row.period_start ? `\n→ ${formatShort(row.period_end)}` : ''}
              </Text>
              <Text style={[s.td, { flex: 1.5 }]}>{row.cuisine ?? '—'}</Text>
              <Text style={[s.td, { flex: 1 }]}>{row.menu_json?.days?.length ?? 0} days</Text>
            </TouchableOpacity>
          ))}

          <Text style={s.retentionNote}>Plans are automatically removed after 3 months.</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal transparent visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {selected ? `${selected.cuisine ?? 'Meal'} Plan` : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
            </View>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.modalMeta}>
                  {formatShort(selected.period_start)}
                  {selected.period_end !== selected.period_start ? ` – ${formatShort(selected.period_end)}` : ''}
                  {selected.food_pref ? ` · ${selected.food_pref}` : ''}
                </Text>
                {selected.dietary_notes && <Text style={s.modalNotes}>{selected.dietary_notes}</Text>}

                {selected.menu_json?.days && selected.menu_json.days.length > 0 && (
                  selected.menu_json.days.map((day, i) => (
                    <View key={i} style={s.dayBlock}>
                      <View style={s.dayBlockHeader}>
                        <Text style={s.dayBlockDay}>{day.day}</Text>
                        <Text style={s.dayBlockDate}>{day.date}</Text>
                      </View>
                      <DayMealRow icon="🌅" label="Breakfast" name={day.breakfast?.name} />
                      <DayMealRow icon="☀️" label="Lunch" name={day.lunch?.name} />
                      <DayMealRow icon="🌙" label="Dinner" name={day.dinner?.name} />
                    </View>
                  ))
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DayMealRow({ icon, label, name }: { icon: string; label: string; name?: string }) {
  return (
    <View style={s.mealRow}>
      <Text style={s.mealIcon}>{icon}</Text>
      <View>
        <Text style={s.mealLabel}>{label}</Text>
        <Text style={s.mealName}>{name ?? '—'}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: '#2C4A6E', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  filterBar: { backgroundColor: white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  filterInput: { flex: 1, minWidth: 120 },
  filterLabel: { fontSize: 11, color: midGray, fontWeight: '600', marginBottom: 4 },
  filterField: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: lightGray },
  filterBtn: { backgroundColor: navy, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterBtnText: { color: white, fontSize: 13, fontWeight: '600' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  clearBtnText: { color: midGray, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: midGray, textAlign: 'center', lineHeight: 22 },
  scroll: { padding: 12, maxWidth: 900, width: '100%', alignSelf: 'center' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#EFF6FF', borderRadius: 8, marginBottom: 4 },
  th: { fontSize: 11, fontWeight: '700', color: navy, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', backgroundColor: white, borderRadius: 10, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  td: { fontSize: 12, color: darkGray, lineHeight: 18 },
  retentionNote: { fontSize: 11, color: midGray, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: navy },
  modalClose: { fontSize: 20, color: midGray },
  modalMeta: { fontSize: 13, color: midGray, marginBottom: 8 },
  modalNotes: { fontSize: 13, color: darkGray, backgroundColor: lightGray, borderRadius: 8, padding: 10, marginBottom: 12 },
  dayBlock: { backgroundColor: '#F9FAFB', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  dayBlockHeader: { backgroundColor: '#2C4A6E', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  dayBlockDay: { color: white, fontWeight: '700', fontSize: 14 },
  dayBlockDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  mealIcon: { fontSize: 16 },
  mealLabel: { fontSize: 10, fontWeight: '600', color: midGray, textTransform: 'uppercase' },
  mealName: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginTop: 1 },
});
