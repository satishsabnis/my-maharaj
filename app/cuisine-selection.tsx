import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, midGray, darkGray, errorRed } from '../theme/colors';

const CUISINES: { name: string; description: string; icon: string }[] = [
  { name: 'Konkani', description: 'Coconut-rich coastal cuisine of the Konkan coast', icon: '🥥' },
  { name: 'Malvani', description: 'Spicy Maharashtrian coastal with bold masalas', icon: '🌶️' },
  { name: 'Mangalorean', description: 'South Canara — seafood, rice and coconut', icon: '🐟' },
  { name: 'Kerala', description: 'Sadya, stews and appam from God\'s Own Country', icon: '🍃' },
  { name: 'Tamil Nadu', description: 'Rice, sambar, rasam and chettinad flavours', icon: '🍚' },
  { name: 'Goan', description: 'Portuguese-influenced vindaloo and bebinca', icon: '🏖️' },
  { name: 'Vidarbha', description: 'Saoji cuisine — bold and fiery Nagpur style', icon: '🔥' },
  { name: 'Madhya Pradesh', description: 'Bhutte ka kees, poha and wheat-based dishes', icon: '🌽' },
  { name: 'Bangalore', description: 'MTR-style breakfasts, bisi bele bath', icon: '☕' },
  { name: 'Sindhudurg', description: 'Authentic Malvani village-style coastal food', icon: '🌊' },
];

export default function CuisineSelectionScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { void loadCuisines(); }, []);

  async function loadCuisines() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('cuisine_preferences')
      .select('cuisine_name')
      .eq('user_id', user.id)
      .eq('is_excluded', false);
    setSelected((data ?? []).map((r: { cuisine_name: string }) => r.cuisine_name));
    setLoading(false);
  }

  function toggle(name: string) {
    setSelected((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setSaving(false); return; }
    await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);
    if (selected.length > 0) {
      const { error: e } = await supabase.from('cuisine_preferences').insert(
        selected.map((c) => ({ user_id: user.id, cuisine_name: c, is_excluded: false, weight: 5 }))
      );
      if (e) { setError(e.message); setSaving(false); return; }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.back(), 1000);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Cuisine Selection</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={navy} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.subtitle}>Select cuisines you enjoy. Your meal plans will rotate between your selections.</Text>
          {CUISINES.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[s.cuisineCard, selected.includes(c.name) && s.cuisineCardActive]}
              onPress={() => toggle(c.name)}
              activeOpacity={0.85}
            >
              <View style={[s.cuisineIcon, selected.includes(c.name) && s.cuisineIconActive]}>
                <Text style={s.cuisineIconText}>{c.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cuisineName, selected.includes(c.name) && s.cuisineNameActive]}>{c.name}</Text>
                <Text style={s.cuisineDesc}>{c.description}</Text>
              </View>
              <View style={[s.checkbox, selected.includes(c.name) && s.checkboxActive]}>
                {selected.includes(c.name) && <Text style={s.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}

          {error ? <Text style={s.errorText}>{error}</Text> : null}
          {saved ? <Text style={s.savedText}>✓ Saved!</Text> : null}

          <TouchableOpacity
            style={[s.saveBtn, (saving || selected.length === 0) && { opacity: 0.5 }]}
            onPress={save}
            disabled={saving || selected.length === 0}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={white} /> : (
              <Text style={s.saveBtnText}>Save {selected.length > 0 ? `(${selected.length} selected)` : ''}</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  subtitle: { fontSize: 14, color: midGray, marginBottom: 20, lineHeight: 21 },
  cuisineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: white, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, borderWidth: 2, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cuisineCardActive: { borderColor: navy, backgroundColor: '#EFF6FF' },
  cuisineIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cuisineIconActive: { backgroundColor: '#DBEAFE' },
  cuisineIconText: { fontSize: 22 },
  cuisineName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  cuisineNameActive: { color: navy },
  cuisineDesc: { fontSize: 12, color: midGray, lineHeight: 17 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: navy, borderColor: navy },
  checkmark: { color: white, fontSize: 13, fontWeight: '700' },
  errorText: { color: errorRed, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  savedText: { color: '#16A34A', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  saveBtn: { backgroundColor: gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: white, fontSize: 16, fontWeight: '700' },
});
