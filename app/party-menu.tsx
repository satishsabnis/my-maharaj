import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const OCCASIONS = ['Birthday','Anniversary','Festival','Get-together','Dinner Party','Baby Shower','Wedding','Office Party'];
const FOOD_TYPES = ['Vegetarian','Non-Vegetarian','Mixed'];

async function callClaude(prompt: string): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  });
  return ((await res.json())?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}

interface PartyMenu {
  starters: { name: string; description: string }[];
  main_course: { name: string; description: string }[];
  desserts: { name: string; description: string }[];
  beverages: { name: string; description: string }[];
  serving_tips: string[];
  shopping_list: string[];
}

export default function PartyMenuScreen() {
  const [step,     setStep]     = useState<'form'|'result'>('form');
  const [guests,   setGuests]   = useState('10');
  const [occasion, setOccasion] = useState('Birthday');
  const [foodType, setFoodType] = useState('Vegetarian');
  const [budget,   setBudget]   = useState('500');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [menu,     setMenu]     = useState<PartyMenu | null>(null);

  async function generateMenu() {
    setError('');
    const g = parseInt(guests, 10);
    const b = parseInt(budget, 10);
    if (!g || g < 1) { setError('Enter a valid number of guests.'); return; }
    if (!b || b < 1) { setError('Enter a valid budget.'); return; }
    setLoading(true);
    try {
      const prompt = `You are Maharaj, expert Indian chef. Generate a party menu for:
- Occasion: ${occasion}, Guests: ${g}, Food: ${foodType}, Total Budget: AED ${b}
- Location: Dubai UAE (Carrefour/Spinneys/Lulu)
Respond ONLY with valid JSON (no markdown):
{"starters":[{"name":"...","description":"..."}],"main_course":[{"name":"...","description":"..."}],"desserts":[{"name":"...","description":"..."}],"beverages":[{"name":"...","description":"..."}],"serving_tips":["..."],"shopping_list":["..."]}
Include 3-5 items in each section. Beverages must always be included with 3+ options.`;
      setMenu(JSON.parse(await callClaude(prompt)) as PartyMenu);
      setStep('result');
    } catch { setError('Failed to generate. Please try again.'); }
    finally { setLoading(false); }
  }

  function Section({ title, icon, items }: { title: string; icon: string; items?: { name: string; description: string }[] }) {
    if (!items?.length) return null;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{icon} {title}</Text>
        {items.map((item, i) => (
          <View key={i} style={[s.item, i === items.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.itemName}>{item.name}</Text>
            <Text style={s.itemDesc}>{item.description}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScreenWrapper title="Party Menu" onBack={() => step === 'result' ? setStep('form') : router.back()}>
      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Text style={s.pageTitle}>Plan Your Gathering</Text>

            {/* Guests + Budget side by side */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>GUESTS</Text>
                <TextInput style={s.input} value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="20" placeholderTextColor={midGray} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>TOTAL BUDGET (AED)</Text>
                <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="500" placeholderTextColor={midGray} />
              </View>
            </View>

            <Text style={s.label}>OCCASION</Text>
            <View style={s.chips}>
              {OCCASIONS.map((o) => (
                <TouchableOpacity key={o} style={[s.chip, occasion === o && s.chipOn]} onPress={() => setOccasion(o)}>
                  <Text style={[s.chipTxt, occasion === o && s.chipTxtOn]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>FOOD TYPE</Text>
            <View style={s.chips}>
              {FOOD_TYPES.map((ft) => (
                <TouchableOpacity key={ft} style={[s.chip, foodType === ft && s.chipOn]} onPress={() => setFoodType(ft)}>
                  <Text style={[s.chipTxt, foodType === ft && s.chipTxtOn]}>{ft}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={[s.genBtn, loading && { opacity: 0.6 }]} onPress={generateMenu} disabled={loading}>
              {loading ? <ActivityIndicator color={white} /> : <Text style={s.genBtnTxt}>🎉 Generate Party Menu</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelLink} onPress={() => router.push('/home' as never)}>
              <Text style={s.cancelLinkTxt}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.container}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>{occasion} Menu</Text>
              <Text style={s.resultMeta}>{guests} guests · {foodType} · AED {budget} total</Text>
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity style={s.doneBtn} onPress={() => router.push('/home' as never)}>
                <Text style={s.doneBtnTxt}>✕ Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.regenBtn} onPress={generateMenu} disabled={loading}>
                {loading ? <ActivityIndicator color={white} size="small" /> : <Text style={s.regenBtnTxt}>🔄 Regenerate</Text>}
              </TouchableOpacity>
            </View>

            {menu && <>
              <Section title="Starters"   icon="🍢" items={menu.starters}    />
              <Section title="Main Course" icon="🍛" items={menu.main_course} />
              <Section title="Desserts"    icon="🍮" items={menu.desserts}    />
              <Section title="Beverages"   icon="🥤" items={menu.beverages}   />
              {menu.serving_tips?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>💡 Serving Tips</Text>
                  {menu.serving_tips.map((t, i) => <Text key={i} style={s.tipTxt}>• {t}</Text>)}
                </View>
              )}
              {menu.shopping_list?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>🛒 Shopping List</Text>
                  <View style={s.shopGrid}>
                    {menu.shopping_list.map((item, i) => (
                      <View key={i} style={s.shopChip}><Text style={s.shopChipTxt}>{item}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </>}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const ACCENT = '#8B1A1A';
const s = StyleSheet.create({
  scroll:      { flexGrow: 1 },
  container:   { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 16 },
  row:         { flexDirection: 'row', gap: 12 },
  label:       { fontSize: 11, fontWeight: '700', color: darkGray, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: 'rgba(255,255,255,0.9)' },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: 'rgba(255,255,255,0.9)' },
  chipOn:      { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt:     { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTxtOn:   { color: white, fontWeight: '600' },
  genBtn:      { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  genBtnTxt:   { color: white, fontSize: 16, fontWeight: '700' },
  cancelLink:  { alignItems: 'center', paddingVertical: 14 },
  cancelLinkTxt:{ fontSize: 13, color: midGray },
  error:       { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader:{ backgroundColor: ACCENT, borderRadius: 14, padding: 20, marginBottom: 12 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: white },
  resultMeta:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  regenBtn:    { flex: 1, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  regenBtnTxt: { color: white, fontWeight: '700', fontSize: 14 },
  doneBtn:     { flex: 1, borderWidth: 1.5, borderColor: 'rgba(139,26,26,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnTxt:  { color: ACCENT, fontWeight: '700', fontSize: 14 },
  section:     { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 },
  item:        { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName:    { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemDesc:    { fontSize: 12, color: midGray, marginTop: 2, lineHeight: 18 },
  tipTxt:      { fontSize: 14, color: darkGray, lineHeight: 22, paddingVertical: 3 },
  shopGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopChip:    { backgroundColor: lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  shopChipTxt: { fontSize: 13, color: darkGray },
});
