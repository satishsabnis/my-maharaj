import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenWrapper from '../components/ScreenWrapper';
import { SkeletonList } from '../components/Skeleton';
import { navy, textSec, errorRed, white, border, surface, successGreen } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  age: number;
  health_notes: string | null;
}

interface MemberForm {
  name: string;
  age: string;
  healthConditions: string[];
  notes: string;
}

const HEALTH_PILLS = ['Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid', 'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten'];

const INDIAN_CUISINES = [
  'Andhra','Assamese','Bengali','Bihari','Chettinad','Goan','Gujarati',
  'Hyderabadi','Kashmiri','Konkani','Maharashtrian','Malabar','Manipuri',
  'Marwari','Meghalayan','Naga','Odia','Punjabi','Rajasthani','Sindhi',
  'South Indian','Tamil','Telugu','Udupi',
].sort();

const INTERNATIONAL_CUISINES = [
  'American','Arabian','Chinese','Continental','Ethiopian','French','Greek',
  'Indonesian','Italian','Japanese','Korean','Lebanese','Mediterranean',
  'Mexican','Moroccan','Persian','Spanish','Thai','Turkish','Vietnamese',
].sort();

function formToNotes(form: MemberForm): string {
  return [...form.healthConditions, form.notes.trim()].filter(Boolean).join(', ');
}

function emptyForm(): MemberForm {
  return { name: '', age: '', healthConditions: [], notes: '' };
}

function memberToForm(m: Member): MemberForm {
  const notes = m.health_notes ?? '';
  const conds = HEALTH_PILLS.filter((p) => notes.toLowerCase().includes(p.toLowerCase()));
  const others = conds.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), notes).replace(/^,+|,+$/g, '').trim();
  return { name: m.name, age: String(m.age || ''), healthConditions: conds, notes: others };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  const [members,          setMembers]          = useState<Member[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editId,           setEditId]           = useState<string | null>(null);
  const [form,             setForm]             = useState<MemberForm>(emptyForm());
  const [formError,        setFormError]        = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSaving,    setCuisineSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data: membersData }, { data: cuisineData }] = await Promise.all([
      supabase.from('family_members').select('id, name, age, health_notes').eq('user_id', user.id),
      supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
    ]);
    setMembers((membersData as Member[]) ?? []);
    setSelectedCuisines((cuisineData ?? []).map((c: any) => c.cuisine_name));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, []);

  function openAdd() { setEditId(null); setForm(emptyForm()); setFormError(''); setModalOpen(true); }
  function openEdit(m: Member) { setEditId(m.id); setForm(memberToForm(m)); setFormError(''); setModalOpen(true); }

  function toggleHealth(cond: string) {
    setForm((prev) => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter((c) => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  async function saveMember() {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true); setFormError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const payload = { user_id: user.id, name: form.name.trim(), age: parseInt(form.age, 10) || 0, health_notes: formToNotes(form) || null };
      if (editId) {
        const { error: e } = await supabase.from('family_members').update(payload).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('family_members').insert(payload);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function saveCuisines() {
    setCuisineSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);
      if (selectedCuisines.length > 0) {
        await supabase.from('cuisine_preferences').insert(
          selectedCuisines.map((c) => ({ user_id: user.id, cuisine_name: c, is_excluded: false }))
        );
      }
    } catch (e) { console.error(e); } finally { setCuisineSaving(false); }
  }

  async function deleteMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id);
    await load();
  }

  const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
    Diabetic: { bg: '#FEF2F2', fg: '#DC2626' }, BP: { bg: '#FFF7ED', fg: '#C2410C' },
    PCOS: { bg: '#FDF4FF', fg: '#7E22CE' }, Cholesterol: { bg: '#FFF1F2', fg: '#BE123C' },
    Thyroid: { bg: '#ECFDF5', fg: '#059669' }, Heart: { bg: '#FEF2F2', fg: '#DC2626' },
    Kidney: { bg: '#EFF6FF', fg: '#1D4ED8' }, Anaemia: { bg: '#FFF7ED', fg: '#B45309' },
    Lactose: { bg: '#F0FDF4', fg: '#166534' }, Gluten: { bg: '#FFFBEB', fg: '#92400E' },
  };

  return (
    <ScreenWrapper title="Dietary Profile">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Family Members */}
        {loading ? (
          <SkeletonList count={3} />
        ) : members.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={s.emptyTitle}>No family members yet</Text>
            <Text style={s.emptySub}>Add your family members to personalise meal plans</Text>
          </View>
        ) : members.map((m) => {
          const pills = HEALTH_PILLS.filter((p) => (m.health_notes ?? '').toLowerCase().includes(p.toLowerCase()));
          const otherNotes = pills.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), m.health_notes ?? '').replace(/^,+|,+$/g, '').trim();
          return (
            <View key={m.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.memberInfo}>
                  <Text style={s.memberName}>{m.name}</Text>
                  {m.age > 0 && <Text style={s.metaText}>{m.age} yrs</Text>}
                </View>
                <TouchableOpacity onPress={() => openEdit(m)} style={s.editBtn}>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {pills.length > 0 && (
                <View style={s.pillWrap}>
                  {pills.map((p) => (
                    <View key={p} style={[s.healthPill, { backgroundColor: HEALTH_COLORS[p]?.bg ?? '#F3F4F6' }]}>
                      <Text style={[s.healthPillText, { color: HEALTH_COLORS[p]?.fg ?? '#374151' }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {otherNotes ? <Text style={s.notesText}>{otherNotes}</Text> : null}
              <TouchableOpacity onPress={() => deleteMember(m.id)} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>Remove member</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={s.addWrap}>
          <Button title="+ Add Family Member" onPress={openAdd} />
        </View>

        {/* Cuisine Preferences */}
        <View style={s.cuisineSection}>
          <Text style={s.cuisineTitle}>🍽️  Cuisine Preferences</Text>
          <Text style={s.cuisineSub}>Select cuisines to guide your meal plans</Text>

          <Text style={s.groupLabel}>INDIAN CUISINES</Text>
          <View style={s.pillRow}>
            {INDIAN_CUISINES.map((c) => (
              <TouchableOpacity key={c} onPress={() => toggleCuisine(c)} activeOpacity={0.75}
                style={[s.cuisinePill, selectedCuisines.includes(c) && s.cuisinePillActive]}>
                <Text style={[s.cuisinePillTxt, selectedCuisines.includes(c) && s.cuisinePillTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.groupLabel, { marginTop: 16 }]}>INTERNATIONAL CUISINES</Text>
          <View style={s.pillRow}>
            {INTERNATIONAL_CUISINES.map((c) => (
              <TouchableOpacity key={c} onPress={() => toggleCuisine(c)} activeOpacity={0.75}
                style={[s.cuisinePill, selectedCuisines.includes(c) && s.cuisinePillActive]}>
                <Text style={[s.cuisinePillTxt, selectedCuisines.includes(c) && s.cuisinePillTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedCuisines.length > 0 && (
            <Text style={s.cuisineCount}>{selectedCuisines.length} cuisine{selectedCuisines.length > 1 ? 's' : ''} selected</Text>
          )}
          <View style={{ marginTop: 16 }}>
            <Button title={cuisineSaving ? 'Saving...' : '✓ Save Cuisine Preferences'} onPress={() => void saveCuisines()} loading={cuisineSaving} />
          </View>
        </View>

      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Member' : 'Add Member'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={s.modalClose}>
                <Text style={s.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Name *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Full name" />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 2, marginRight: 10 }}>
                  <Input label="Age" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} placeholder="Age" keyboardType="numeric" />
                </View>
              </View>
              <Text style={s.sectionLabel}>HEALTH CONDITIONS</Text>
              <View style={s.pillRow}>
                {HEALTH_PILLS.map((cond) => (
                  <TouchableOpacity key={cond} onPress={() => toggleHealth(cond)} activeOpacity={0.75}
                    style={[s.cuisinePill, form.healthConditions.includes(cond) && s.cuisinePillActive]}>
                    <Text style={[s.cuisinePillTxt, form.healthConditions.includes(cond) && s.cuisinePillTxtActive]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Medical Notes (optional)" value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                placeholder="e.g. Low salt, no fried food..." multiline numberOfLines={3} />
              {formError ? <Text style={s.formError}>{formError}</Text> : null}
              <View style={{ marginTop: 16, gap: 10 }}>
                <Button title="Save Member" onPress={() => void saveMember()} loading={saving} />
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  loadingText: { textAlign: 'center', color: textSec, marginTop: 40 },
  emptyState:  { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: textSec, textAlign: 'center' },
  card:        { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 14 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  memberInfo:  { flex: 1 },
  memberName:  { fontSize: 16, fontWeight: '700', color: navy },
  metaText:    { fontSize: 13, color: textSec, marginTop: 2 },
  editBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: border },
  editBtnText: { fontSize: 13, color: navy, fontWeight: '600' },
  pillWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  healthPill:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  healthPillText: { fontSize: 12, fontWeight: '600' },
  notesText:   { fontSize: 13, color: textSec, fontStyle: 'italic', marginTop: 4 },
  deleteBtn:   { marginTop: 10, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 12, color: errorRed, fontWeight: '500' },
  addWrap:     { marginTop: 8, marginBottom: 24 },
  cuisineSection:  { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 16 },
  cuisineTitle:    { fontSize: 16, fontWeight: '700', color: navy, marginBottom: 4 },
  cuisineSub:      { fontSize: 13, color: textSec, marginBottom: 16, lineHeight: 18 },
  groupLabel:      { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  cuisineCount:    { fontSize: 12, color: successGreen, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  pillRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  cuisinePill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: 'rgba(255,255,255,0.9)' },
  cuisinePillActive:{ backgroundColor: navy, borderColor: navy },
  cuisinePillTxt:  { fontSize: 13, color: navy, fontWeight: '500' },
  cuisinePillTxtActive: { color: white, fontWeight: '600' },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  formError:       { fontSize: 13, color: errorRed, textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: navy },
  modalClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt:   { fontSize: 14, color: textSec, fontWeight: '600' },
  modalScroll:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
});
