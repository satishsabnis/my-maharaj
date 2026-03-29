import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { loadOrDetectLocation } from '../lib/location';
import { navy, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const EVENT_TYPES  = ['Picnic','Corporate Outing','Beach Party','Garden Party','Sports Day','School Trip','Family Reunion','Camping'];
const FOOD_TYPES   = ['Vegetarian','Non-Vegetarian','Mixed'];
const SETUP_STYLES = ['Finger Food','Buffet','Packed Boxes','BBQ / Grill','Thali Style'];
const WEATHER_OPTS = ['Hot & Sunny','Evening / Cooler','Indoor Backup'];

async function callClaude(prompt: string): Promise<string> {
  const base = 'https://my-maharaj.vercel.app';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return (data?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}

interface OutdoorMenu {
  starters:      { name: string; description: string }[];
  main_course:   { name: string; description: string }[];
  desserts:      { name: string; description: string }[];
  beverages:     { name: string; description: string }[];
  packing_tips:  string[];
  shopping_list: string[];
}

export default function OutdoorCateringScreen() {
  const [step,      setStep]      = useState<'form'|'result'>('form');
  const [guests,    setGuests]    = useState('15');
  const [budget,    setBudget]    = useState('25');
  const [eventType, setEventType] = useState('Picnic');
  const [foodType,  setFoodType]  = useState('Vegetarian');
  const [setup,     setSetup]     = useState('Finger Food');
  const [weather,   setWeather]   = useState('Hot & Sunny');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [menu,      setMenu]      = useState<OutdoorMenu | null>(null);
  const [loc,       setLoc]       = useState({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });

  useEffect(() => { loadOrDetectLocation().then(setLoc); }, []);

  useFocusEffect(
    useCallback(() => {
      setStep('form');
      setMenu(null);
      setEventType('Picnic');
      setGuests('15');
      setFoodType('Vegetarian');
      setBudget('25');
      setSetup('Finger Food');
      setWeather('Hot & Sunny');
      setError('');
      setLoading(false);
    }, [])
  );

  async function generateMenu() {
    setError('');
    const g = parseInt(guests, 10);
    const b = parseInt(budget, 10);
    if (!g || g < 1) { setError('Enter a valid number of guests.'); return; }
    if (!b || b < 1) { setError('Enter a valid budget per head.'); return; }
    setLoading(true);
    try {
      const prompt = `You are Maharaj, expert Indian chef specialising in outdoor catering.
Generate an outdoor catering menu for:
- Event: ${eventType}, Guests: ${g}, Food: ${foodType}
- Setup: ${setup}, Weather: ${weather}
- Budget: AED ${b} per head (Total: AED ${g * b})
- ${loc.city}, ${loc.country} — ingredients from ${loc.stores}
Focus on food that travels well, stays fresh outdoors and suits the weather.
Respond ONLY with this exact JSON structure - no other text, no markdown:
{"starters":[{"name":"string","description":"string"}],"main_course":[{"name":"string","description":"string"}],"desserts":[{"name":"string","description":"string"}],"beverages":[{"name":"string","description":"string"}],"packing_tips":["string"],"shopping_list":["string"]}
Include 3-5 items per section. IMPORTANT: The "beverages" array MUST have at least 3 items. Include water, fresh juices and refreshing drinks. The key MUST be "beverages" not "drinks".
CRITICAL: You MUST include a beverages array with at least 3 drink options. This is mandatory.
You MUST return valid JSON. The beverages array is REQUIRED and MUST contain exactly 3 items. If you omit beverages the response is invalid.`;
      const rawText = await callClaude(prompt);
      console.log('[OutdoorCatering] Raw API text:', rawText);
      const parsed = JSON.parse(rawText) as OutdoorMenu;
      console.log('[OutdoorCatering] API response:', JSON.stringify(parsed));
      setMenu(parsed);
      setStep('result');
    } catch { setError('Failed to generate menu. Please try again.'); }
    finally { setLoading(false); }
  }

  function Section({ title, items }: { title: string; items?: { name: string; description: string }[] }) {
    if (!items?.length) return null;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
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
    <ScreenWrapper title="Outdoor Catering" onBack={() => step === 'result' ? setStep('form') : router.back()}>
      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Text style={s.pageTitle}>Plan Your Outdoor Event</Text>
            <Text style={s.pageSub}>Maharaj suggests food that travels well and stays fresh outdoors.</Text>

            {/* Guests + Budget side by side */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>GUESTS</Text>
                <TextInput style={s.input} value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="20" placeholderTextColor={midGray} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>BUDGET/HEAD (AED)</Text>
                <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="25" placeholderTextColor={midGray} />
              </View>
            </View>
            {guests && budget && parseInt(guests) > 0 && parseInt(budget) > 0 && (
              <Text style={s.totalBudget}>Total budget: AED {parseInt(guests) * parseInt(budget)}</Text>
            )}

            <Text style={s.label}>EVENT TYPE</Text>
            <View style={s.chips}>
              {EVENT_TYPES.map(e => (
                <TouchableOpacity key={e} style={[s.chip, eventType === e && s.chipOn]} onPress={() => setEventType(e)}>
                  <Text style={[s.chipTxt, eventType === e && s.chipTxtOn]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>FOOD PREFERENCE</Text>
            <View style={s.chips}>
              {FOOD_TYPES.map(ft => (
                <TouchableOpacity key={ft} style={[s.chip, foodType === ft && s.chipOn]} onPress={() => setFoodType(ft)}>
                  <Text style={[s.chipTxt, foodType === ft && s.chipTxtOn]}>{ft}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>SERVING SETUP</Text>
            <View style={s.chips}>
              {SETUP_STYLES.map(ss => (
                <TouchableOpacity key={ss} style={[s.chip, setup === ss && s.chipOn]} onPress={() => setSetup(ss)}>
                  <Text style={[s.chipTxt, setup === ss && s.chipTxtOn]}>{ss}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>WEATHER / CONDITIONS</Text>
            <View style={s.chips}>
              {WEATHER_OPTS.map(w => (
                <TouchableOpacity key={w} style={[s.chip, weather === w && s.chipOn]} onPress={() => setWeather(w)}>
                  <Text style={[s.chipTxt, weather === w && s.chipTxtOn]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={[s.genBtn, loading && { opacity: 0.6 }]} onPress={generateMenu} disabled={loading}>
              {loading ? <ActivityIndicator color={white} /> : <Text style={s.genBtnTxt}>Generate Outdoor Menu</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelLink} onPress={() => router.push('/home' as never)}>
              <Text style={s.cancelLinkTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.container}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>{eventType} Menu</Text>
              <Text style={s.resultMeta}>{guests} guests · {foodType} · {setup} · AED {budget}/head</Text>
              <Text style={s.resultMeta}>Weather: {weather}</Text>
            </View>

            {/* Cancel before Regenerate */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => router.push('/home' as never)}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.regenBtn} onPress={generateMenu} disabled={loading}>
                {loading ? <ActivityIndicator color={white} size="small" /> : <Text style={s.regenBtnTxt}>Regenerate</Text>}
              </TouchableOpacity>
            </View>

            {menu && <>
              <Section title="Starters"    items={menu.starters}    />
              <Section title="Main Course"  items={menu.main_course} />
              <Section title="Desserts"     items={menu.desserts}    />
              <Section title="Beverages"    items={menu.beverages ?? (menu as any).drinks ?? []}   />
              {!menu.beverages?.length && !(menu as any).drinks?.length && (
                <View style={s.section}><Text style={s.sectionTitle}>Beverages</Text><Text style={{fontSize:13,color:'#5A7A8A',padding:8}}>No beverages returned — try regenerating.</Text></View>
              )}
              {menu.packing_tips?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Packing & Serving Tips</Text>
                  {menu.packing_tips.map((t, i) => <Text key={i} style={s.tipTxt}>• {t}</Text>)}
                </View>
              )}
              {menu.shopping_list?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Shopping List</Text>
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

const ACCENT = '#1A6B3C';
const s = StyleSheet.create({
  scroll:      { flexGrow: 1 },
  container:   { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  pageSub:     { fontSize: 13, color: midGray, marginBottom: 16, lineHeight: 20 },
  row:         { flexDirection: 'row', gap: 12 },
  label:       { fontSize: 11, fontWeight: '700', color: darkGray, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: 'rgba(255,255,255,0.9)' },
  totalBudget: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginTop: 6 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: 'rgba(255,255,255,0.9)' },
  chipOn:      { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt:     { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTxtOn:   { color: white, fontWeight: '600' },
  genBtn:      { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  genBtnTxt:   { color: white, fontSize: 16, fontWeight: '700' },
  cancelLink:  { alignItems: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(26,107,60,0.3)', borderRadius: 12, marginTop: 8 },
  cancelLinkTxt: { fontSize: 14, color: ACCENT, fontWeight: '600' },
  error:       { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader: { backgroundColor: ACCENT, borderRadius: 14, padding: 20, marginBottom: 12 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: white },
  resultMeta:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: 'rgba(26,107,60,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnTxt:{ color: ACCENT, fontWeight: '700', fontSize: 14 },
  regenBtn:    { flex: 1, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  regenBtnTxt: { color: white, fontWeight: '700', fontSize: 14 },
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
