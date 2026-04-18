import React, { useState } from 'react';
import {
  ImageBackground, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';

const NAVY = '#2E5480';
const GOLD = '#C9A227';
const WHITE_SEMI = 'rgba(255,255,255,0.85)';

const CUISINE_GROUPS = [
  { label: 'WEST',   options: ['Maharashtrian', 'Goan', 'Gujarati'] },
  { label: 'NORTH',  options: ['Punjabi', 'Mughlai', 'Rajasthani'] },
  { label: 'SOUTH',  options: ['Kerala', 'Tamil Nadu', 'Karnataka'] },
  { label: 'EAST',   options: ['Bengali', 'Assamese'] },
  { label: 'STREET', options: ['Street Food'] },
];

// ── Progress Dots ─────────────────────────────────────────────────────────────
function ProgressDots({ active }: { active: 1 | 2 | 3 }) {
  return (
    <View style={s.dotsRow}>
      {[1, 2, 3].map(i => (
        <View
          key={i}
          style={[s.dot, active === i ? s.dotActive : s.dotInactive]}
        />
      ))}
    </View>
  );
}

// ── Circle Tick Button ────────────────────────────────────────────────────────
function TickButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.tickBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.tickText}>{'\u2713'}</Text>
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const [step, setStep]                           = useState<1 | 2 | 3 | 4>(1);
  const [familyName, setFamilyName]               = useState('');
  const [selectedCuisines, setSelectedCuisines]   = useState<string[]>([]);
  const [diet, setDiet]                           = useState<'veg' | 'nonveg' | null>(null);
  const [saving, setSaving]                       = useState(false);

  function toggleCuisine(c: string) {
    setSelectedCuisines(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c);
      if (prev.length >= 3) return prev;
      return [...prev, c];
    });
  }

  async function handleGenerate() {
    setSaving(true);
    try {
      const user = await getSessionUser();
      if (user) {
        const vegDays = diet === 'veg'
          ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          : [];

        await supabase.from('profiles').upsert({
          id: user.id,
          family_name: familyName.trim() || 'My Family',
          veg_days: vegDays,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (selectedCuisines.length > 0) {
          await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);
          await supabase.from('cuisine_preferences').insert(
            selectedCuisines.map(c => ({ user_id: user.id, cuisine_name: c, is_excluded: false }))
          );
        }
      }

      router.replace('/review-plan' as never);
    } catch {
      router.replace('/review-plan' as never);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={s.bg}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── Screen 1: Family Name ──────────────────────────────────── */}
          {step === 1 && (
            <ScrollView
              contentContainerStyle={s.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ProgressDots active={1} />
              <View style={s.tickRow}>
                <TickButton onPress={() => setStep(2)} />
              </View>
              <Text style={s.header}>Welcome to My Maharaj</Text>
              <Text style={s.sub}>Let's set up your family kitchen</Text>
              <Text style={s.label}>What shall Maharaj call your family?</Text>
              <TextInput
                style={s.input}
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="My Family"
                placeholderTextColor="#8AAABB"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => setStep(2)}
              />
              <TouchableOpacity style={s.btnGold} onPress={() => setStep(2)} activeOpacity={0.85}>
                <Text style={s.btnGoldText}>Next</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── Screen 2: Cuisine ──────────────────────────────────────── */}
          {step === 2 && (
            <ScrollView
              contentContainerStyle={s.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ProgressDots active={2} />
              <View style={s.tickRow}>
                <TickButton onPress={() => setStep(3)} />
              </View>
              <Text style={s.header}>Your Family's Cuisine</Text>
              <Text style={s.sub}>Select up to 3</Text>
              {CUISINE_GROUPS.map(group => (
                <View key={group.label} style={{ marginBottom: 16 }}>
                  <Text style={s.groupLabel}>{group.label}</Text>
                  <View style={s.chipRow}>
                    {group.options.map(c => {
                      const selected = selectedCuisines.includes(c);
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[s.chip, selected ? s.chipSelected : s.chipUnselected]}
                          onPress={() => toggleCuisine(c)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.chipText, selected && s.chipTextSelected]}>{c}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[s.btnGold, selectedCuisines.length === 0 && { opacity: 0.4 }]}
                onPress={() => setStep(3)}
                disabled={selectedCuisines.length === 0}
                activeOpacity={0.85}
              >
                <Text style={s.btnGoldText}>Next</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── Screen 3: Diet ─────────────────────────────────────────── */}
          {step === 3 && (
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={s.scrollFlex}
                showsVerticalScrollIndicator={false}
              >
                <View style={s.screen3Top}>
                  <ProgressDots active={3} />
                  <Text style={s.header}>Your Family's Diet</Text>
                  <Text style={s.sub}>Tap one to continue</Text>
                </View>
                <View style={s.screen3Mid}>
                  <TouchableOpacity
                    style={s.dietBtnGold}
                    onPress={() => { setDiet('nonveg'); setStep(4); }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.dietBtnGoldText}>Non-vegetarian</Text>
                  </TouchableOpacity>
                  <View style={{ height: 14 }} />
                  <TouchableOpacity
                    style={s.dietBtnOutline}
                    onPress={() => { setDiet('veg'); setStep(4); }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.dietBtnOutlineText}>Vegetarian</Text>
                  </TouchableOpacity>
                  <Text style={s.dietHint}>Tapping moves to next step</Text>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Screen 4: Summary + Generate ──────────────────────────── */}
          {step === 4 && (
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={s.scrollFlex}
                showsVerticalScrollIndicator={false}
              >
                <View style={s.screen3Top}>
                  <Text style={s.header}>Ready to plan</Text>
                  <Text style={s.sub}>Maharaj will build your 3-day plan</Text>
                </View>
                <View style={s.screen3Mid}>
                  {/* YOUR CHOICES summary card */}
                  <View style={s.summaryCard}>
                    <Text style={s.summaryCardTitle}>YOUR CHOICES</Text>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Family</Text>
                      <Text style={s.summaryValue}>{familyName.trim() || 'My Family'}</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Cuisines</Text>
                      <Text style={s.summaryValue}>
                        {selectedCuisines.length > 0 ? selectedCuisines.join(', ') : 'None selected'}
                      </Text>
                    </View>
                    <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
                      <Text style={s.summaryLabel}>Food preference</Text>
                      <Text style={s.summaryValue}>
                        {diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ height: 24 }} />
                  <TouchableOpacity
                    style={[s.btnGold, saving && { opacity: 0.5 }]}
                    onPress={handleGenerate}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <Text style={s.btnGoldText}>
                      {saving ? 'Preparing...' : 'Generate my 3-day plan'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  bg:                 { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  scroll:             { flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40 },
  scrollFlex:         { flexGrow: 1, paddingHorizontal: 28 },
  // Progress dots
  dotsRow:            { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  dot:                { width: 8, height: 8, borderRadius: 4 },
  dotActive:          { backgroundColor: NAVY },
  dotInactive:        { backgroundColor: 'rgba(255,255,255,0.55)' },
  // Circle tick button
  tickRow:            { alignItems: 'flex-end', marginBottom: 20 },
  tickBtn:            { width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  tickText:           { fontSize: 20, color: '#FFFFFF', fontWeight: '700', lineHeight: 24 },
  // Headings
  header:             { fontSize: 22, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 8 },
  sub:                { fontSize: 14, color: '#5A7A8A', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  label:              { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 10, textAlign: 'center' },
  // Input
  input:              { backgroundColor: WHITE_SEMI, borderRadius: 12, borderWidth: 1.5, borderColor: NAVY, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: NAVY, marginBottom: 24, textAlign: 'center' },
  // Buttons
  btnGold:            { backgroundColor: GOLD, borderRadius: 24, paddingVertical: 15, alignItems: 'center', marginBottom: 4 },
  btnGoldText:        { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  btnOutline:         { borderWidth: 2, borderColor: NAVY, borderRadius: 24, paddingVertical: 14, alignItems: 'center', backgroundColor: WHITE_SEMI },
  btnOutlineText:     { fontSize: 16, fontWeight: '700', color: NAVY },
  // Cuisine chips
  groupLabel:         { fontSize: 10, fontWeight: '700', color: '#6A8A9A', letterSpacing: 1, marginBottom: 8 },
  chipRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:               { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipUnselected:     { borderWidth: 1.5, borderColor: NAVY, backgroundColor: WHITE_SEMI },
  chipSelected:       { backgroundColor: NAVY },
  chipText:           { fontSize: 13, fontWeight: '500', color: NAVY },
  chipTextSelected:   { color: '#FFFFFF' },
  // Screen 3 layout
  screen3Top:         { paddingTop: 48, marginBottom: 8 },
  screen3Mid:         { flex: 1, justifyContent: 'center', paddingVertical: 32 },
  dietBtnGold:        { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 20, alignItems: 'center' },
  dietBtnGoldText:    { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  dietBtnOutline:     { borderWidth: 2, borderColor: NAVY, borderRadius: 14, paddingVertical: 20, alignItems: 'center', backgroundColor: WHITE_SEMI },
  dietBtnOutlineText: { fontSize: 17, fontWeight: '700', color: NAVY },
  dietHint:           { fontSize: 12, color: '#8AAABB', textAlign: 'center', marginTop: 16 },
  // Summary card (step 4)
  summaryCard:        { backgroundColor: WHITE_SEMI, borderRadius: 14, borderWidth: 1.5, borderColor: NAVY, padding: 16 },
  summaryCardTitle:   { fontSize: 11, fontWeight: '700', color: '#6A8A9A', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  summaryRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.12)' },
  summaryLabel:       { fontSize: 13, color: '#5A7A8A', flex: 1 },
  summaryValue:       { fontSize: 13, fontWeight: '700', color: NAVY, flex: 2, textAlign: 'right' },
});
