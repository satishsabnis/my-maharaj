import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, textSec, errorRed, white, border, surface, textColor, successGreen } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  age: number;
  relationship: string | null;
  health_notes: string | null;
}

interface MemberForm {
  name: string;
  age: string;
  relationship: string;
  healthConditions: string[];
  notes: string;
}

const RELS         = ['Self', 'Spouse', 'Child', 'Parent', 'Other'];
const HEALTH_PILLS = ['Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid', 'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten'];

function formToNotes(form: MemberForm): string {
  return [...form.healthConditions, form.notes.trim()].filter(Boolean).join(', ');
}

function emptyForm(): MemberForm {
  return { name: '', age: '', relationship: 'Self', healthConditions: [], notes: '' };
}

function memberToForm(m: Member): MemberForm {
  const notes  = m.health_notes ?? '';
  const conds  = HEALTH_PILLS.filter((p) => notes.toLowerCase().includes(p.toLowerCase()));
  const others = conds.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), notes).replace(/^,+|,+$/g, '').trim();
  return {
    name: m.name, age: String(m.age || ''),
    relationship: m.relationship ?? 'Self',
    healthConditions: conds, notes: others,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  const [members, setMembers]       = useState<Member[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<MemberForm>(emptyForm());
  const [formError, setFormError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('family_members').select('id, name, age, relationship, health_notes').eq('user_id', user.id);
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(m: Member) {
    setEditId(m.id);
    setForm(memberToForm(m));
    setFormError('');
    setModalOpen(true);
  }

  function toggleHealth(cond: string) {
    setForm((prev) => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter((c) => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  }

  async function saveMember() {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        age: parseInt(form.age, 10) || 0,
        relationship: form.relationship,
        health_notes: formToNotes(form) || null,
      };
      if (editId) {
        const { error: updateErr } = await supabase.from('family_members').update(payload).eq('id', editId);
        if (updateErr) throw new Error(updateErr.message);
      } else {
        const { error: insertErr } = await supabase.from('family_members').insert(payload);
        if (insertErr) throw new Error(insertErr.message);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id);
    await load();
  }

  function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity style={[ps.pill, active && ps.pillActive]} onPress={onPress} activeOpacity={0.75}>
        <Text style={[ps.pillText, active && ps.pillTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
    Diabetic:    { bg: '#FEF2F2', fg: '#DC2626' },
    BP:          { bg: '#FFF7ED', fg: '#C2410C' },
    PCOS:        { bg: '#FDF4FF', fg: '#7E22CE' },
    Cholesterol: { bg: '#FFF1F2', fg: '#BE123C' },
    Thyroid:     { bg: '#ECFDF5', fg: '#059669' },
    Heart:       { bg: '#FEF2F2', fg: '#DC2626' },
    Kidney:      { bg: '#EFF6FF', fg: '#1D4ED8' },
    Anaemia:     { bg: '#FFF7ED', fg: '#B45309' },
    Lactose:     { bg: '#F0FDF4', fg: '#166534' },
    Gluten:      { bg: '#FFFBEB', fg: '#92400E' },
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dietary Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={s.loadingText}>Loading...</Text>
        ) : members.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={s.emptyTitle}>No family members yet</Text>
            <Text style={s.emptySub}>Add your family members to personalise meal plans</Text>
          </View>
        ) : (
          members.map((m) => {
            const pills = HEALTH_PILLS.filter((p) => (m.health_notes ?? '').toLowerCase().includes(p.toLowerCase()));
            const otherNotes = pills.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), m.health_notes ?? '').replace(/^,+|,+$/g, '').trim();
            return (
              <View key={m.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{m.name}</Text>
                    <View style={s.metaRow}>
                      {m.age > 0 && <Text style={s.metaText}>{m.age} yrs</Text>}
                      {m.relationship && <Text style={s.metaDot}>·</Text>}
                      {m.relationship && <Text style={s.metaText}>{m.relationship}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(m)} style={s.editBtn} activeOpacity={0.7}>
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

                {otherNotes ? (
                  <Text style={s.notesText}>{otherNotes}</Text>
                ) : null}

                <TouchableOpacity onPress={() => deleteMember(m.id)} style={s.deleteBtn} activeOpacity={0.7}>
                  <Text style={s.deleteBtnText}>Remove member</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={s.addWrap}>
          <Button title="+ Add Family Member" onPress={openAdd} />
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Member' : 'Add Member'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={s.modalClose}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Name *" value={form.name} onChangeText={(v) => setForm((prev) => ({ ...prev, name: v }))} placeholder="Full name" />

              <View style={s.twoCol}>
                <View style={{ flex: 2, marginRight: 10 }}>
                  <Input label="Age" value={form.age} onChangeText={(v) => setForm((prev) => ({ ...prev, age: v }))} placeholder="Age" keyboardType="numeric" />
                </View>
              </View>

              <Text style={s.sectionLabel}>RELATIONSHIP</Text>
              <View style={s.pillRow}>
                {RELS.map((r) => (
                  <Pill key={r} label={r} active={form.relationship === r} onPress={() => setForm((prev) => ({ ...prev, relationship: r }))} />
                ))}
              </View>

              <Text style={s.sectionLabel}>HEALTH CONDITIONS</Text>
              <View style={s.pillRow}>
                {HEALTH_PILLS.map((cond) => (
                  <Pill key={cond} label={cond} active={form.healthConditions.includes(cond)} onPress={() => toggleHealth(cond)} />
                ))}
              </View>

              <Input label="Medical Notes (optional)" value={form.notes} onChangeText={(v) => setForm((prev) => ({ ...prev, notes: v }))}
                placeholder="e.g. Low salt, no fried food, doctor says..." multiline numberOfLines={3} />

              <TouchableOpacity style={s.lipidBtn} activeOpacity={0.8}>
                <Text style={s.lipidBtnText}>📄 Lipid Report — OPTIONAL</Text>
              </TouchableOpacity>

              {formError ? <Text style={s.formError}>{formError}</Text> : null}

              <View style={{ marginTop: 16, gap: 10 }}>
                <Button title="Save Member" onPress={() => void saveMember()} loading={saving} />
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

const ps = StyleSheet.create({
  pill:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: white },
  pillActive:    { backgroundColor: navy, borderColor: navy },
  pillText:      { fontSize: 13, color: navy, fontWeight: '500' },
  pillTextActive:{ color: white, fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:   { fontSize: 22, color: navy },
  headerTitle: { fontSize: 18, fontWeight: '700', color: navy },

  scroll:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, maxWidth: 700, width: '100%', alignSelf: 'center' },
  loadingText: { textAlign: 'center', color: textSec, marginTop: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: textSec, textAlign: 'center' },

  card:       { backgroundColor: white, borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '700', color: navy },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText:   { fontSize: 13, color: textSec },
  metaDot:    { fontSize: 13, color: textSec },
  editBtn:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: border },
  editBtnText:{ fontSize: 13, color: navy, fontWeight: '600' },
  pillWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  healthPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  healthPillText: { fontSize: 12, fontWeight: '600' },
  notesText:  { fontSize: 13, color: textSec, fontStyle: 'italic', marginTop: 4 },
  deleteBtn:  { marginTop: 10, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 12, color: errorRed, fontWeight: '500' },

  addWrap: { marginTop: 8, marginBottom: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: navy },
  modalClose:   { width: 32, height: 32, borderRadius: 16, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' },
  modalCloseText:{ fontSize: 14, color: textSec, fontWeight: '600' },
  modalScroll:  { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  twoCol:      { flexDirection: 'row' },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },

  lipidBtn:    { borderWidth: 1.5, borderColor: border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', borderStyle: 'dashed', marginTop: 8 },
  lipidBtnText:{ fontSize: 13, color: textSec, fontWeight: '500' },

  formError: { fontSize: 13, color: errorRed, textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8 },
});
