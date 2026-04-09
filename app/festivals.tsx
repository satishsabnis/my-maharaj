import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors } from '../constants/theme';

// ─── Festival data ───────────────────────────────────────────────────────────

interface FestivalEntry {
  name: string;
  date: string;   // e.g. '30 Mar'
  food: string;
}

const FESTIVALS_2026: FestivalEntry[] = [
  { name: 'Eid ul Fitr', date: '30 Mar', food: 'Biryani, Sheer Kurma, Seviyan' },
  { name: 'Gudi Padwa', date: '6 Apr', food: 'Puran Poli, Shrikhand, Aam Panha' },
  { name: 'Ram Navami', date: '17 Apr', food: 'Panchamrit, Panjiri, fruits, no non-veg' },
  { name: 'Buddha Purnima', date: '12 May', food: 'Sattvic vegetarian, no non-veg' },
  { name: 'Eid ul Adha', date: '7 Jun', food: 'Mutton dishes, Biryani, Haleem' },
  { name: 'Ganesh Chaturthi', date: '22 Aug', food: 'Modak, Ukadiche Modak, Varan Bhaat' },
  { name: 'Navratri begins', date: '22 Sep', food: 'Vrat food, Sabudana, Kuttu, fruits' },
  { name: 'Dussehra', date: '2 Oct', food: 'Regional sweets, festive meals' },
  { name: 'Diwali', date: '20 Oct', food: 'Mithai, Farsan, Faral, Chakli' },
  { name: 'Guru Nanak Jayanti', date: '5 Nov', food: 'Langar food, dal, rice, kheer' },
  { name: 'Christmas', date: '25 Dec', food: 'Plum cake, roast, festive sweets' },
];

const MONTH_ABBRS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function currentMonthAbbr(): string {
  return MONTH_ABBRS[new Date().getMonth()];
}

// ─── Family occasion type ────────────────────────────────────────────────────

interface FamilyOccasion {
  id: string;
  name: string;
  day: string;       // e.g. '15 Apr' or '3rd Saturday'
  people: number;
  notes: string;
}

const STORAGE_KEY = 'recurring_occasions';

async function loadOccasions(): Promise<FamilyOccasion[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveOccasions(list: FamilyOccasion[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FestivalsScreen() {
  const [occasions, setOccasions] = useState<FamilyOccasion[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDay, setFormDay] = useState('');
  const [formPeople, setFormPeople] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useFocusEffect(useCallback(() => {
    loadOccasions().then(setOccasions);
  }, []));

  const monthAbbr = currentMonthAbbr();

  // Festivals in current month
  const thisMonthFestivals = FESTIVALS_2026.filter(f => f.date.endsWith(monthAbbr));

  // Family occasions matching current month
  const thisMonthOccasions = occasions.filter(o => o.day.includes(monthAbbr));

  // Full calendar display
  const visibleFestivals = showAll ? FESTIVALS_2026 : FESTIVALS_2026.slice(0, 6);

  // ─── Modal helpers ─────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingId(null);
    setFormName(''); setFormDay(''); setFormPeople(''); setFormNotes('');
    setModalVisible(true);
  }

  function openEditModal(occ: FamilyOccasion) {
    setEditingId(occ.id);
    setFormName(occ.name);
    setFormDay(occ.day);
    setFormPeople(String(occ.people));
    setFormNotes(occ.notes);
    setModalVisible(true);
  }

  async function handleSave() {
    const trimmed = formName.trim();
    if (!trimmed) return;
    const entry: FamilyOccasion = {
      id: editingId ?? Date.now().toString(),
      name: trimmed,
      day: formDay.trim(),
      people: parseInt(formPeople, 10) || 0,
      notes: formNotes.trim(),
    };
    let updated: FamilyOccasion[];
    if (editingId) {
      updated = occasions.map(o => o.id === editingId ? entry : o);
    } else {
      updated = [...occasions, entry];
    }
    await saveOccasions(updated);
    setOccasions(updated);
    setModalVisible(false);
  }

  async function handleRemove(id: string) {
    const updated = occasions.filter(o => o.id !== id);
    await saveOccasions(updated);
    setOccasions(updated);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper title="Festivals and Functions">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Maharaj tip */}
        <View style={s.tipCard}>
          <Text style={s.tipText}>
            When a festival falls in your meal plan week, I will ask if you would like a traditional menu suggestion. I never assume -- always your choice.
          </Text>
        </View>

        {/* ── Section 1: Coming up ── */}
        <Text style={s.sectionTitle}>Coming up -- {monthAbbr}</Text>

        {thisMonthFestivals.length === 0 && thisMonthOccasions.length === 0 && (
          <View style={s.card}>
            <Text style={s.mutedText}>No festivals or occasions this month.</Text>
          </View>
        )}

        {thisMonthFestivals.map((f, i) => (
          <View key={`fest-${i}`} style={s.goldCard}>
            <View style={s.festRow}>
              <Text style={s.festName}>{f.name}</Text>
              <Text style={s.festDate}>{f.date}</Text>
            </View>
            <Text style={s.festFood}>{f.food}</Text>
            <View style={s.tagRow}>
              <View style={s.greenPill}><Text style={s.greenPillText}>Universal</Text></View>
              <View style={s.navyPill}><Text style={s.navyPillText}>Maharaj will ask</Text></View>
            </View>
          </View>
        ))}

        {thisMonthOccasions.map((o) => (
          <View key={`occ-${o.id}`} style={s.navyCard}>
            <Text style={s.festName}>{o.name}</Text>
            <Text style={s.mutedText}>{o.day} -- {o.people} people</Text>
            <View style={s.tagRow}>
              <View style={s.navyPill}><Text style={s.navyPillText}>Family occasion</Text></View>
            </View>
          </View>
        ))}

        {/* ── Section 2: Your Family Occasions ── */}
        <Text style={[s.sectionTitle, { marginTop: 14 }]}>Your Family Occasions</Text>

        {occasions.length === 0 && (
          <View style={s.card}>
            <Text style={s.mutedText}>No family occasions added yet.</Text>
          </View>
        )}

        {occasions.map((o) => (
          <View key={o.id} style={s.card}>
            <Text style={s.occasionName}>{o.name}</Text>
            <Text style={s.mutedText}>{o.day}</Text>
            <View style={s.occasionActions}>
              <TouchableOpacity onPress={() => openEditModal(o)} style={s.editPill} activeOpacity={0.7}>
                <Text style={s.editPillText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemove(o.id)} activeOpacity={0.7}>
                <Text style={s.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={openAddModal} style={s.dashedBtn} activeOpacity={0.7}>
          <Text style={s.dashedBtnText}>+ Add family occasion</Text>
        </TouchableOpacity>

        {/* ── Section 3: Full Calendar ── */}
        <Text style={[s.sectionTitle, { marginTop: 14 }]}>Full Calendar -- 2026</Text>

        {visibleFestivals.map((f, i) => (
          <View key={`cal-${i}`} style={s.card}>
            <View style={s.festRow}>
              <Text style={s.calName}>{f.name}</Text>
              <Text style={s.calDate}>{f.date}</Text>
            </View>
            <Text style={s.calFood}>{f.food}</Text>
            <View style={s.tagRow}>
              <View style={s.greenPill}><Text style={s.greenPillText}>Universal</Text></View>
            </View>
          </View>
        ))}

        {!showAll && FESTIVALS_2026.length > 6 && (
          <TouchableOpacity onPress={() => setShowAll(true)} activeOpacity={0.7}>
            <Text style={s.viewAllLink}>View all 2026 festivals</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Add / Edit Occasion Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingId ? 'Edit Occasion' : 'Add Family Occasion'}</Text>

            <Text style={s.fieldLabel}>Name</Text>
            <TextInput
              style={s.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. Anniversary dinner"
              placeholderTextColor={colors.textHint}
            />

            <Text style={s.fieldLabel}>Date / Day</Text>
            <TextInput
              style={s.input}
              value={formDay}
              onChangeText={setFormDay}
              placeholder="e.g. 15 Apr"
              placeholderTextColor={colors.textHint}
            />

            <Text style={s.fieldLabel}>Number of people</Text>
            <TextInput
              style={s.input}
              value={formPeople}
              onChangeText={setFormPeople}
              placeholder="e.g. 8"
              placeholderTextColor={colors.textHint}
              keyboardType="numeric"
            />

            <Text style={s.fieldLabel}>Notes</Text>
            <TextInput
              style={[s.input, { height: 60, textAlignVertical: 'top' }]}
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Special requests, dietary needs..."
              placeholderTextColor={colors.textHint}
              multiline
            />

            <View style={s.modalBtns}>
              <TouchableOpacity onPress={handleSave} style={s.saveBtn} activeOpacity={0.8}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.cancelBtn} activeOpacity={0.8}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Gold-tinted festival card (current month)
  goldCard: {
    backgroundColor: 'rgba(201,162,39,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.25)',
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 11,
    marginBottom: 6,
  },

  // Navy-tinted family occasion card (current month)
  navyCard: {
    backgroundColor: 'rgba(180,200,230,0.38)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.navy,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 11,
    marginBottom: 6,
  },

  festRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  festName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  festDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  festFood: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 5,
  },

  tagRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  greenPill: {
    backgroundColor: 'rgba(30,158,94,0.12)',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  greenPillText: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
  },
  navyPill: {
    backgroundColor: 'rgba(26,58,92,0.1)',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  navyPillText: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: '600',
  },

  mutedText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Family occasions section
  occasionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 2,
  },
  occasionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
  },
  editPill: {
    borderWidth: 1,
    borderColor: colors.emerald,
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  editPillText: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
  },
  removeLink: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
  },

  dashedBtn: {
    borderWidth: 1,
    borderColor: colors.emerald,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: 6,
  },
  dashedBtnText: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
  },

  // Full calendar cards
  calName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  calDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  calFood: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 5,
  },

  viewAllLink: {
    fontSize: 13,
    color: colors.teal,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.emerald,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.white,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.navy,
  },
});
