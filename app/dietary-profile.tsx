import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Platform, Alert, TextInput, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, midGray, errorRed, darkGray, lightGray } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  age: number;
  relationship: string;
  is_diabetic: boolean;
  has_bp: boolean;
  has_pcos: boolean;
  other_conditions: string | null;
  food_likes: string | null;
  food_dislikes: string | null;
  allergies: string | null;
  remarks: string | null;
  lipid_test_date: string | null;
  lipid_expiry_date: string | null;
}

interface MemberForm {
  name: string;
  age: string;
  relationship: string;
  is_diabetic: boolean;
  has_bp: boolean;
  has_pcos: boolean;
  other_conditions: string[];
  food_likes: string;
  food_dislikes: string;
  allergies: string;
  remarks: string;
}

const emptyForm = (): MemberForm => ({
  name: '', age: '', relationship: 'Self',
  is_diabetic: false, has_bp: false, has_pcos: false,
  other_conditions: [],
  food_likes: '', food_dislikes: '', allergies: '', remarks: '',
});

const RELATIONSHIPS = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
const MAIN_CONDITIONS: Array<[string, 'is_diabetic' | 'has_bp' | 'has_pcos']> = [
  ['Diabetic', 'is_diabetic'], ['Blood Pressure', 'has_bp'], ['PCOS/PCOD', 'has_pcos'],
];
const OTHER_CONDS = [
  'Cholesterol', 'Thyroid', 'Kidney Disease', 'Heart Disease',
  'Obesity', 'Anaemia', 'Lactose Intolerant', 'Gluten Intolerant',
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { void loadMembers(); }, []);

  async function loadMembers() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }

  async function saveMember() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.age.trim() || isNaN(parseInt(form.age, 10))) { setFormError('Valid age is required.'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('family_members').insert({
        user_id: user.id,
        name: form.name.trim(),
        age: parseInt(form.age, 10),
        relationship: form.relationship,
        is_diabetic: form.is_diabetic,
        has_bp: form.has_bp,
        has_pcos: form.has_pcos,
        other_conditions: form.other_conditions.length > 0 ? JSON.stringify(form.other_conditions) : null,
        food_likes: form.food_likes || null,
        food_dislikes: form.food_dislikes || null,
        allergies: form.allergies || null,
        remarks: form.remarks || null,
      });
      if (error) throw new Error(error.message);

      setForm(emptyForm());
      setShowForm(false);
      await loadMembers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(id: string) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Remove this family member?')
      : await new Promise<boolean>((res) => Alert.alert('Remove Member', 'Are you sure?', [
          { text: 'Cancel', onPress: () => res(false) },
          { text: 'Remove', style: 'destructive', onPress: () => res(true) },
        ]));
    if (!confirmed) return;
    await supabase.from('family_members').delete().eq('id', id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function parseConditions(raw: string | null): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }

  function updateForm<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleOtherCond(cond: string) {
    setForm((prev) => ({
      ...prev,
      other_conditions: prev.other_conditions.includes(cond)
        ? prev.other_conditions.filter((c) => c !== cond)
        : [...prev.other_conditions, cond],
    }));
  }

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // ── Add Member Form ─────────────────────────────────────────────────────────

  function renderAddForm() {
    return (
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowForm(false); setForm(emptyForm()); setFormError(''); }}
      >
        <SafeAreaView style={f.safe}>
          <View style={f.header}>
            <Text style={f.headerTitle}>Add Family Member</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setForm(emptyForm()); setFormError(''); }}>
              <Text style={f.headerClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={f.scroll} keyboardShouldPersistTaps="handled">
            <FieldLabel>Name *</FieldLabel>
            <TextInput style={f.input} value={form.name} onChangeText={(v) => updateForm('name', v)} placeholder="Full name" placeholderTextColor={midGray} />

            <FieldLabel>Age *</FieldLabel>
            <TextInput style={f.input} value={form.age} onChangeText={(v) => updateForm('age', v)} placeholder="Age" placeholderTextColor={midGray} keyboardType="numeric" />

            <FieldLabel>Relationship</FieldLabel>
            <View style={f.chipRow}>
              {RELATIONSHIPS.map((r) => (
                <TouchableOpacity key={r} style={[f.chip, form.relationship === r && f.chipActive]} onPress={() => updateForm('relationship', r)}>
                  <Text style={[f.chipText, form.relationship === r && f.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel>Health Conditions</FieldLabel>
            <View style={f.chipRow}>
              {MAIN_CONDITIONS.map(([label, key]) => (
                <TouchableOpacity key={key} style={[f.chip, form[key] && f.chipActive]} onPress={() => updateForm(key, !form[key])}>
                  <Text style={[f.chipText, form[key] && f.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={f.chipRow}>
              {OTHER_CONDS.map((cond) => (
                <TouchableOpacity key={cond} style={[f.chip, form.other_conditions.includes(cond) && f.chipActive]} onPress={() => toggleOtherCond(cond)}>
                  <Text style={[f.chipText, form.other_conditions.includes(cond) && f.chipTextActive]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel>Food Likes</FieldLabel>
            <TextInput style={f.input} value={form.food_likes} onChangeText={(v) => updateForm('food_likes', v)} placeholder="e.g. Spicy food, biryani" placeholderTextColor={midGray} />

            <FieldLabel>Food Dislikes</FieldLabel>
            <TextInput style={f.input} value={form.food_dislikes} onChangeText={(v) => updateForm('food_dislikes', v)} placeholder="e.g. Bitter gourd" placeholderTextColor={midGray} />

            <FieldLabel>Allergies</FieldLabel>
            <TextInput style={f.input} value={form.allergies} onChangeText={(v) => updateForm('allergies', v)} placeholder="e.g. Peanuts, shellfish" placeholderTextColor={midGray} />

            <FieldLabel>Remarks</FieldLabel>
            <TextInput style={[f.input, { height: 72, textAlignVertical: 'top' }]} value={form.remarks} onChangeText={(v) => updateForm('remarks', v)} placeholder="Any other notes" placeholderTextColor={midGray} multiline />

            <FieldLabel>Lipid Profile Report — <Text style={{ color: midGray, fontWeight: '400', textTransform: 'none' }}>OPTIONAL</Text></FieldLabel>
            {parseInt(form.age, 10) >= 50 && (
              <Text style={f.lipidNote}>⚠️ Age 50+ — lipid profile is recommended. Please upload when available.</Text>
            )}
            <View style={f.lipidBox}>
              <Text style={f.lipidBoxText}>📄 Upload PDF or image (optional — can be added later in Dietary Profile)</Text>
            </View>

            {formError ? <Text style={f.errorText}>{formError}</Text> : null}

            <View style={f.btnRow}>
              <TouchableOpacity style={f.cancelBtn} onPress={() => { setShowForm(false); setForm(emptyForm()); setFormError(''); }}>
                <Text style={f.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[f.saveBtn, saving && { opacity: 0.6 }]} onPress={saveMember} disabled={saving}>
                {saving ? <ActivityIndicator color={white} /> : <Text style={f.saveBtnText}>Save Member →</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ── Main list ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Dietary Profile</Text>
        <TouchableOpacity onPress={() => router.push('/profile-setup')}><Text style={s.editText}>Edit Profile</Text></TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={navy} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {members.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>👨‍👩‍👧‍👦</Text>
              <Text style={s.emptyTitle}>No family members yet</Text>
              <Text style={s.emptyDesc}>Tap "Add Member" below to get started.</Text>
            </View>
          ) : (
            <>
              <Text style={s.subtitle}>{members.length} family member{members.length > 1 ? 's' : ''}</Text>
              {members.map((m) => {
                const otherConds = parseConditions(m.other_conditions);
                const allConds: string[] = [
                  ...(m.is_diabetic ? ['Diabetic'] : []),
                  ...(m.has_bp ? ['BP'] : []),
                  ...(m.has_pcos ? ['PCOS'] : []),
                  ...otherConds,
                ];
                return (
                  <View key={m.id} style={s.memberCard}>
                    <TouchableOpacity style={s.memberHeader} onPress={() => setExpanded(expanded === m.id ? null : m.id)} activeOpacity={0.85}>
                      <View style={s.memberAvatar}>
                        <Text style={s.memberAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.memberName}>{m.name}</Text>
                        <Text style={s.memberMeta}>{m.age} yrs · {m.relationship}</Text>
                        <View style={s.pillRow}>
                          {allConds.length === 0 ? (
                            <View style={[s.pill, s.pillGreen]}><Text style={[s.pillText, { color: '#065F46' }]}>Healthy</Text></View>
                          ) : allConds.slice(0, 4).map((c) => (
                            <View key={c} style={s.pill}><Text style={s.pillText}>{c}</Text></View>
                          ))}
                          {allConds.length > 4 && (
                            <View style={s.pill}><Text style={s.pillText}>+{allConds.length - 4} more</Text></View>
                          )}
                        </View>
                      </View>
                      <Text style={s.expandIcon}>{expanded === m.id ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {expanded === m.id && (
                      <View style={s.memberDetails}>
                        {m.food_likes && <DetailRow label="Likes" value={m.food_likes} />}
                        {m.food_dislikes && <DetailRow label="Dislikes" value={m.food_dislikes} />}
                        {m.allergies && <DetailRow label="Allergies" value={m.allergies} color={errorRed} />}
                        {m.remarks && <DetailRow label="Remarks" value={m.remarks} />}
                        {m.lipid_test_date && (
                          <View>
                            <DetailRow label="Lipid Test" value={m.lipid_test_date} />
                            {m.lipid_expiry_date && (
                              <DetailRow
                                label="Expires"
                                value={m.lipid_expiry_date}
                                color={isExpired(m.lipid_expiry_date) ? errorRed : '#16A34A'}
                              />
                            )}
                            {isExpired(m.lipid_expiry_date) && (
                              <Text style={s.expiredWarning}>⚠️ Lipid report expired — please renew</Text>
                            )}
                          </View>
                        )}
                        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteMember(m.id)}>
                          <Text style={s.deleteBtnText}>Remove Member</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* Add Member button */}
          <TouchableOpacity style={s.addBtn} onPress={() => { setForm(emptyForm()); setFormError(''); setShowForm(true); }} activeOpacity={0.85}>
            <Text style={s.addBtnText}>+ Add Member</Text>
          </TouchableOpacity>

          {/* Next button — only when at least 1 member exists */}
          {members.length > 0 && (
            <TouchableOpacity style={s.nextBtn} onPress={() => router.push('/cuisine-selection')} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>Next — Cuisine Preferences →</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {renderAddForm()}
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={f.fieldLabel}>{children}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  editText: { color: gold, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { padding: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  subtitle: { fontSize: 13, color: midGray, marginBottom: 16, fontWeight: '500' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: navy, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: midGray, textAlign: 'center', lineHeight: 22 },

  memberCard: { backgroundColor: white, borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: navy, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  memberAvatarText: { color: gold, fontSize: 18, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '700', color: navy },
  memberMeta: { fontSize: 12, color: midGray, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  pill: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillGreen: { backgroundColor: '#D1FAE5' },
  pillText: { color: '#B91C1C', fontSize: 11, fontWeight: '600' },
  expandIcon: { color: midGray, fontSize: 14 },

  memberDetails: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 2 },
  detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 12 },
  detailLabel: { width: 80, fontSize: 12, fontWeight: '600', color: midGray, textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { flex: 1, fontSize: 14, color: darkGray },
  expiredWarning: { fontSize: 12, color: errorRed, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  deleteBtn: { marginTop: 14, borderWidth: 1.5, borderColor: errorRed, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  deleteBtnText: { color: errorRed, fontSize: 13, fontWeight: '600' },

  addBtn: { backgroundColor: gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  addBtnText: { color: white, fontWeight: '700', fontSize: 16 },
  nextBtn: { backgroundColor: navy, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  nextBtnText: { color: white, fontWeight: '700', fontSize: 16 },
});

// Form modal styles
const f = StyleSheet.create({
  safe: { flex: 1, backgroundColor: white },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  headerClose: { color: white, fontSize: 22, fontWeight: '400', padding: 4 },
  scroll: { padding: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: darkGray, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: lightGray },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  chipActive: { backgroundColor: navy, borderColor: navy },
  chipText: { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTextActive: { color: white, fontWeight: '600' },
  errorText: { color: errorRed, fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: darkGray, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: white, fontWeight: '700', fontSize: 15 },
  lipidNote: { fontSize: 12, color: '#B45309', fontWeight: '600', backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 8 },
  lipidBox: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, borderStyle: 'dashed', padding: 16, alignItems: 'center', backgroundColor: lightGray },
  lipidBoxText: { fontSize: 13, color: midGray, textAlign: 'center', lineHeight: 20 },
});
