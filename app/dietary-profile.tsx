import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, midGray, darkGray, lightGray, errorRed } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRow {
  name: string;
  age: string;
  health_notes: string;
}

function emptyRow(): MemberRow {
  return { name: '', age: '', health_notes: '' };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  // Screen 1 state
  const [screen, setScreen] = useState<1 | 2>(1);
  const [familyName, setFamilyName] = useState('');
  const [memberCount, setMemberCount] = useState(1);

  // Screen 2 state
  const [members, setMembers] = useState<MemberRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // ── Screen 1 handlers ───────────────────────────────────────────────────────

  function goToScreen2() {
    setError('');
    if (!familyName.trim()) { setError('Please enter your family name.'); return; }
    // Build the exact number of member rows
    setMembers(Array.from({ length: memberCount }, (_, i) => members[i] ?? emptyRow()));
    setScreen(2);
  }

  // ── Screen 2 handlers ───────────────────────────────────────────────────────

  function updateMember<K extends keyof MemberRow>(idx: number, key: K, value: string) {
    setMembers((prev) => prev.map((m, i) => i === idx ? { ...m, [key]: value } : m));
  }

  async function saveAllMembers() {
    setError('');
    const invalid = members.find((m) => !m.name.trim());
    if (invalid) { setError('Please enter a name for every member.'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update family name in profile
      await supabase.from('profiles').upsert({ id: user.id, family_name: familyName.trim() });

      // Replace all existing family members
      await supabase.from('family_members').delete().eq('user_id', user.id);

      const rows = members.map((m) => ({
        user_id: user.id,
        name: m.name.trim(),
        age: parseInt(m.age, 10) || 0,
        health_notes: m.health_notes.trim() || null,
      }));

      const { error: insertErr } = await supabase.from('family_members').insert(rows);
      if (insertErr) throw new Error(insertErr.message);

      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (saved) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Dietary Profile</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.successBox}>
          <Text style={s.successIcon}>✅</Text>
          <Text style={s.successTitle}>Saved!</Text>
          <Text style={s.successSub}>{members.length} family member{members.length > 1 ? 's' : ''} saved for {familyName}</Text>
          <TouchableOpacity style={s.goldBtn} onPress={() => router.replace('/home')} activeOpacity={0.85}>
            <Text style={s.goldBtnText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.outlineBtn} onPress={() => { setSaved(false); setScreen(1); }} activeOpacity={0.85}>
            <Text style={s.outlineBtnText}>Edit Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen 1: Family Setup ───────────────────────────────────────────────────

  if (screen === 1) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Family Setup</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={s.logoRow}>
          <Image source={require('../assets/logo.png')} style={s.logo} />
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Family Name</Text>
          <TextInput
            style={s.input}
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="e.g. The Sharma Family"
            placeholderTextColor={midGray}
          />

          <Text style={s.fieldLabel}>How many members?</Text>
          <View style={s.counterRow}>
            <TouchableOpacity
              style={[s.counterBtn, memberCount <= 1 && s.counterBtnDisabled]}
              onPress={() => setMemberCount((c) => Math.max(1, c - 1))}
              disabled={memberCount <= 1}
            >
              <Text style={s.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.counterValue}>{memberCount}</Text>
            <TouchableOpacity
              style={[s.counterBtn, memberCount >= 10 && s.counterBtnDisabled]}
              onPress={() => setMemberCount((c) => Math.min(10, c + 1))}
              disabled={memberCount >= 10}
            >
              <Text style={s.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.counterHint}>Including yourself · Min 1, Max 10</Text>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity style={s.goldBtn} onPress={goToScreen2} activeOpacity={0.85}>
            <Text style={s.goldBtnText}>Next — Fill in {memberCount} member{memberCount > 1 ? 's' : ''} →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Screen 2: Member Details ─────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setScreen(1)}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Member Details</Text>
        <Text style={s.headerCount}>{members.length} member{members.length > 1 ? 's' : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.stepSub}>Fill in details for each family member</Text>

        {members.map((m, idx) => (
          <View key={idx} style={s.memberRow}>
            {/* Number badge */}
            <View style={s.memberBadge}>
              <Text style={s.memberBadgeText}>{idx + 1}</Text>
            </View>

            {/* Fields */}
            <View style={s.memberFields}>
              <TextInput
                style={s.memberInput}
                value={m.name}
                onChangeText={(v) => updateMember(idx, 'name', v)}
                placeholder="Name *"
                placeholderTextColor={midGray}
              />
              <TextInput
                style={[s.memberInput, s.memberInputAge]}
                value={m.age}
                onChangeText={(v) => updateMember(idx, 'age', v)}
                placeholder="Age"
                placeholderTextColor={midGray}
                keyboardType="numeric"
              />
              <TextInput
                style={[s.memberInput, s.memberInputNotes]}
                value={m.health_notes}
                onChangeText={(v) => updateMember(idx, 'health_notes', v)}
                placeholder="e.g. Diabetic, BP, doctor says low salt"
                placeholderTextColor={midGray}
              />
              <TouchableOpacity style={s.lipidBtn} activeOpacity={0.8}>
                <Text style={s.lipidBtnText}>📄 Lipid Profile (Optional)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.goldBtn, saving && { opacity: 0.6 }]}
          onPress={saveAllMembers}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={white} />
            : <Text style={s.goldBtnText}>Save All Members →</Text>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: {
    backgroundColor: navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 16,
  },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  headerCount: { color: gold, fontSize: 13, fontWeight: '600', width: 60, textAlign: 'right' },

  logoRow: { alignItems: 'center', backgroundColor: navy, paddingBottom: 20 },
  logo: { width: 200, height: 70, resizeMode: 'contain' },

  body: { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  stepSub: { fontSize: 14, color: midGray, marginBottom: 16, lineHeight: 21 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: darkGray, marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827', backgroundColor: white },

  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginVertical: 16 },
  counterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { backgroundColor: '#D1D5DB' },
  counterBtnText: { color: white, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  counterValue: { fontSize: 48, fontWeight: '900', color: navy, minWidth: 60, textAlign: 'center' },
  counterHint: { fontSize: 12, color: midGray, textAlign: 'center', marginBottom: 8 },

  // Member rows
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  memberBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: navy, alignItems: 'center', justifyContent: 'center', marginTop: 4, flexShrink: 0 },
  memberBadgeText: { color: gold, fontSize: 15, fontWeight: '800' },
  memberFields: { flex: 1, gap: 8 },
  memberInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: lightGray },
  memberInputAge: { width: 80 },
  memberInputNotes: {},
  lipidBtn: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderStyle: 'dashed' },
  lipidBtnText: { fontSize: 13, color: midGray, fontWeight: '500' },

  // Buttons
  goldBtn: { backgroundColor: gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  goldBtnText: { color: white, fontWeight: '700', fontSize: 16 },
  outlineBtn: { borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  outlineBtnText: { color: darkGray, fontWeight: '600', fontSize: 15 },

  errorText: { color: errorRed, fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },

  // Success
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '900', color: navy, marginBottom: 8 },
  successSub: { fontSize: 15, color: midGray, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});
