import React, { useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, textSec, errorRed, white, border, surface, successGreen } from '../theme/colors';

// ─── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES  = [{ code: 'en', label: 'EN' }, { code: 'hi', label: 'हिंदी' }, { code: 'mr', label: 'मराठी' }, { code: 'gu', label: 'ગુજ' }];
const STORES     = ['Carrefour', 'Spinneys', 'Lulu', 'All'];
const RELS       = ['Self', 'Spouse', 'Child', 'Parent', 'Other'];
const HEALTH_PILLS = ['Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid', 'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten'];
const CUISINES   = ['Konkani','Malvani','Mangalorean','Kerala','Tamil Nadu','Goan','Vidarbha','Madhya Pradesh','Bangalore','Sindhudurg','Gujarati','North Indian','Rajasthani','Mughlai','Lucknowi/Awadhi','Himachali','Uttarakhandi'];
const DAYS       = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_FULL   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Member {
  name: string;
  age: string;
  relationship: string;
  healthConditions: string[];
  notes: string;
}

function emptyMember(rel = 'Self'): Member {
  return { name: '', age: '', relationship: rel, healthConditions: [], notes: '' };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [familyName, setFamilyName]   = useState('');
  const [mobile, setMobile]           = useState('');
  const [language, setLanguage]       = useState('en');
  const [store, setStore]             = useState('All');

  // Step 2
  const [memberCount, setMemberCount] = useState(1);
  const [members, setMembers]         = useState<Member[]>([emptyMember('Self')]);

  // Step 3
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [vegDays, setVegDays]   = useState<string[]>([]);

  // ── Member helpers ──────────────────────────────────────────────────────

  function setCount(n: number) {
    const c = Math.min(8, Math.max(1, n));
    setMemberCount(c);
    setMembers((prev) => {
      const next: Member[] = [];
      for (let i = 0; i < c; i++) next.push(prev[i] ?? emptyMember(i === 0 ? 'Self' : 'Spouse'));
      return next;
    });
  }

  function updateMember<K extends keyof Member>(idx: number, key: K, val: Member[K]) {
    setMembers((prev) => prev.map((m, i) => i === idx ? { ...m, [key]: val } : m));
  }

  function toggleHealth(idx: number, cond: string) {
    setMembers((prev) => prev.map((m, i) => {
      if (i !== idx) return m;
      const hc = m.healthConditions.includes(cond)
        ? m.healthConditions.filter((c) => c !== cond)
        : [...m.healthConditions, cond];
      return { ...m, healthConditions: hc };
    }));
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  function next() {
    setError('');
    if (step === 1) {
      if (!familyName.trim()) { setError('Please enter your family name'); return; }
    }
    if (step === 2) {
      const invalid = members.find((m) => !m.name.trim());
      if (invalid) { setError('Please enter a name for all members'); return; }
    }
    if (step < 4) setStep((s) => s + 1);
    else void handleSave();
  }

  function back() {
    setError('');
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? '',
        family_name: familyName.trim(),
        mobile_number: mobile.trim() ? `+971${mobile.trim()}` : null,
        app_language: language,
        store_preference: store,
        veg_days: vegDays,
      });

      await supabase.from('family_members').delete().eq('user_id', user.id);
      const validMembers = members.filter((m) => m.name.trim());
      if (validMembers.length > 0) {
        await supabase.from('family_members').insert(
          validMembers.map((m) => ({
            user_id: user.id,
            name: m.name.trim(),
            age: parseInt(m.age, 10) || 0,
            relationship: m.relationship,
            health_notes: [
              ...m.healthConditions,
              m.notes.trim(),
            ].filter(Boolean).join(', ') || null,
          }))
        );
      }

      await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);
      if (cuisines.length > 0) {
        await supabase.from('cuisine_preferences').insert(
          cuisines.map((c) => ({ user_id: user.id, cuisine_name: c, is_excluded: false, weight: 5 }))
        );
      }

      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Pill helper ──────────────────────────────────────────────────────────

  function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity
        style={[ps.pill, active && ps.pillActive]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text style={[ps.pillText, active && ps.pillTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // ── Step renders ─────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <View>
        <Text style={s.stepTitle}>Tell us about your family</Text>
        <Text style={s.stepSub}>This helps us plan meals for everyone</Text>

        <Input label="Family Name" value={familyName} onChangeText={setFamilyName}
          placeholder="e.g. The Sabnis Family" />
        <Input label="Mobile Number (UAE)" value={mobile} onChangeText={setMobile}
          placeholder="+971 50 123 4567" keyboardType="phone-pad" />

        <Text style={s.sectionLabel}>PREFERRED LANGUAGE</Text>
        <View style={s.pillRow}>
          {LANGUAGES.map((l) => (
            <Pill key={l.code} label={l.label} active={language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>

        <Text style={s.sectionLabel}>PREFERRED SUPERMARKET</Text>
        <View style={s.pillRow}>
          {STORES.map((st) => (
            <Pill key={st} label={st} active={store === st} onPress={() => setStore(st)} />
          ))}
        </View>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View>
        <Text style={s.stepTitle}>Who is in your family?</Text>
        <Text style={s.stepSub}>Add each member so we can personalise their meals</Text>

        {/* Counter */}
        <View style={s.counterCard}>
          <TouchableOpacity
            style={[s.counterBtn, memberCount <= 1 && s.counterBtnDim]}
            onPress={() => setCount(memberCount - 1)}
            disabled={memberCount <= 1}
          >
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <View style={s.counterCenter}>
            <Text style={s.counterNum}>{memberCount}</Text>
            <Text style={s.counterLabel}>family member{memberCount > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={[s.counterBtn, memberCount >= 8 && s.counterBtnDim]}
            onPress={() => setCount(memberCount + 1)}
            disabled={memberCount >= 8}
          >
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Member cards */}
        {members.map((m, idx) => {
          const ageNum = parseInt(m.age, 10);
          const isOlder = !isNaN(ageNum) && ageNum >= 50;
          return (
            <View key={idx} style={s.memberCard}>
              <Text style={s.memberCardTitle}>Member {idx + 1}</Text>
              <View style={s.memberNameRow}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Input label="Name *" value={m.name} onChangeText={(v) => updateMember(idx, 'name', v)}
                    placeholder="Full name" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Age" value={m.age} onChangeText={(v) => updateMember(idx, 'age', v)}
                    placeholder="Age" keyboardType="numeric" />
                </View>
              </View>

              <Text style={s.sectionLabel}>RELATIONSHIP</Text>
              <View style={s.pillRow}>
                {RELS.map((r) => (
                  <Pill key={r} label={r} active={m.relationship === r}
                    onPress={() => updateMember(idx, 'relationship', r)} />
                ))}
              </View>

              <Text style={s.sectionLabel}>HEALTH CONDITIONS</Text>
              <View style={s.pillRow}>
                {HEALTH_PILLS.map((cond) => (
                  <Pill key={cond} label={cond} active={m.healthConditions.includes(cond)}
                    onPress={() => toggleHealth(idx, cond)} />
                ))}
              </View>

              <Input label="Medical notes or doctor recommendations" value={m.notes}
                onChangeText={(v) => updateMember(idx, 'notes', v)}
                placeholder="e.g. Low salt, no fried food, doctor says..."
                multiline numberOfLines={3} />

              {isOlder && (
                <View style={s.lipidHintBox}>
                  <Text style={s.lipidHintText}>Lipid profile recommended for age 50+</Text>
                  <TouchableOpacity style={s.lipidBtn} activeOpacity={0.8}>
                    <Text style={s.lipidBtnText}>Upload Lipid Report (Optional)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  function renderStep3() {
    return (
      <View>
        <Text style={s.stepTitle}>Your Food Preferences</Text>

        <Text style={s.sectionTitle}>Favourite Cuisines</Text>
        <Text style={s.stepSub}>Select all you enjoy</Text>
        <View style={s.pillRow}>
          {CUISINES.map((c) => (
            <Pill key={c} label={c} active={cuisines.includes(c)}
              onPress={() => setCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />
          ))}
        </View>

        <Text style={[s.sectionTitle, { marginTop: 28 }]}>Vegetarian Days</Text>
        <Text style={s.stepSub}>Optional — can be none</Text>
        <View style={s.pillRow}>
          {DAYS.map((d, i) => (
            <Pill key={d} label={d} active={vegDays.includes(DAY_FULL[i])}
              onPress={() => setVegDays((prev) =>
                prev.includes(DAY_FULL[i]) ? prev.filter((x) => x !== DAY_FULL[i]) : [...prev, DAY_FULL[i]]
              )} />
          ))}
        </View>
      </View>
    );
  }

  function renderStep4() {
    const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati' };
    return (
      <View>
        <Text style={s.stepTitle}>You are all set!</Text>
        <Text style={s.stepSub}>Here is a summary of your profile</Text>

        <View style={s.summaryCard}>
          <SummaryRow icon="" label="Family Name" value={familyName || '—'} />
          <SummaryRow icon="" label="Members" value={`${members.filter((m) => m.name.trim()).length} member${members.length > 1 ? 's' : ''}`} />
          <SummaryRow icon="" label="Cuisines" value={cuisines.length > 0 ? `${cuisines.length} selected` : 'Not selected'} />
          <SummaryRow icon="" label="Language" value={langMap[language] || language} />
          <SummaryRow icon="" label="Supermarket" value={store} />
          {vegDays.length > 0 && (
            <SummaryRow icon="" label="Veg Days" value={vegDays.map((d) => d.slice(0, 3)).join(', ')} />
          )}
        </View>
      </View>
    );
  }

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4][step - 1];
  const stepLabels  = ['Family Info', 'Members', 'Cuisine', 'Summary'];

  return (
    <SafeAreaView style={s.safe}>
      {/* Progress */}
      <View style={s.progressBar}>
        {stepLabels.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={s.progressStep}
            onPress={() => { if (i + 1 < step) setStep(i + 1); }}
          >
            <View style={[s.dot, step > i + 1 && s.dotDone, step === i + 1 && s.dotActive]}>
              <Text style={[s.dotText, step >= i + 1 && s.dotTextActive]}>
                {step > i + 1 ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[s.dotLabel, step === i + 1 && s.dotLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.body}>
          {stepContent?.()}

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          {/* Navigation */}
          <View style={[s.navRow, step === 1 && { justifyContent: 'flex-end' }]}>
            {step > 1 && (
              <View style={{ flex: 1, marginRight: 12 }}>
                <Button title="← Back" onPress={back} variant="outline" />
              </View>
            )}
            <View style={{ flex: step === 1 ? undefined : 2, width: step === 1 ? '100%' : undefined }}>
              <Button
                title={step === 4 ? 'Start Planning with Maharaj' : 'Continue →'}
                onPress={next}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Summary Row Sub-component ───────────────────────────────────────────────

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={sr.row}>
      <Text style={sr.icon}>{icon}</Text>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border },
  icon:  { fontSize: 18, marginRight: 12, width: 28 },
  label: { flex: 1, fontSize: 14, color: textSec },
  value: { fontSize: 14, fontWeight: '700', color: navy },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: white },
  scroll:{ paddingBottom: 48 },
  body:  { paddingHorizontal: 20, paddingTop: 8, maxWidth: 640, width: '100%', alignSelf: 'center' },

  progressBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start',
    backgroundColor: navy, paddingHorizontal: 12,
    paddingTop: Platform.OS === 'web' ? 24 : 14, paddingBottom: 18,
  },
  progressStep: { flex: 1, alignItems: 'center', gap: 4 },
  dot:          { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dotActive:    { backgroundColor: gold },
  dotDone:      { backgroundColor: successGreen },
  dotText:      { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  dotTextActive:{ color: white },
  dotLabel:     { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  dotLabelActive:{ color: white, fontWeight: '600' },

  stepTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginTop: 20, marginBottom: 4 },
  stepSub:     { fontSize: 14, color: textSec, marginBottom: 20, lineHeight: 20 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: navy, marginBottom: 4, marginTop: 8 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },

  navRow:    { flexDirection: 'row', marginTop: 28, marginBottom: 12 },
  errorText: { fontSize: 13, color: errorRed, textAlign: 'center', marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },

  counterCard:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: surface, borderRadius: 16, padding: 20, marginBottom: 20, gap: 32 },
  counterBtn:    { width: 48, height: 48, borderRadius: 24, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  counterBtnDim: { backgroundColor: '#D1D5DB' },
  counterBtnText:{ color: white, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  counterCenter: { alignItems: 'center', minWidth: 80 },
  counterNum:    { fontSize: 52, fontWeight: '900', color: navy, lineHeight: 60 },
  counterLabel:  { fontSize: 12, color: textSec, marginTop: 2 },

  memberCard:      { backgroundColor: white, borderWidth: 1.5, borderColor: border, borderRadius: 12, padding: 16, marginBottom: 16, gap: 0 },
  memberCardTitle: { fontSize: 14, fontWeight: '800', color: navy, marginBottom: 12 },
  memberNameRow:   { flexDirection: 'row', alignItems: 'flex-start' },

  lipidHintBox: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginTop: 4 },
  lipidHintText:{ fontSize: 13, color: '#92400E', marginBottom: 8 },
  lipidBtn:     { borderWidth: 1.5, borderColor: '#92400E', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  lipidBtnText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  summaryCard: { backgroundColor: surface, borderRadius: 16, padding: 16, marginTop: 8 },
});

// Pill style (outside main StyleSheet for reuse)
const ps = StyleSheet.create({
  pill:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: white },
  pillActive:   { backgroundColor: navy, borderColor: navy },
  pillText:     { fontSize: 13, color: navy, fontWeight: '500' },
  pillTextActive:{ color: white, fontWeight: '600' },
});
