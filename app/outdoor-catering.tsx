import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { navy, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const EVENT_TYPES  = ['Picnic', 'Corporate Outing', 'Beach Party', 'Garden Party', 'Sports Day', 'School Trip', 'Family Reunion', 'Camping'];
const FOOD_TYPES   = ['Vegetarian', 'Non-Vegetarian', 'Mixed'];
const SETUP_STYLES = ['Finger Food', 'Buffet', 'Packed Boxes', 'BBQ / Grill', 'Thali Style'];
const WEATHER_OPTS = ['Hot & Sunny', 'Evening / Cooler', 'Indoor Backup'];
const HEADER_COLOR = '#1A6B3C';

interface OutdoorMenu {
  starters:      { name: string; description: string }[];
  main_course:   { name: string; description: string }[];
  desserts:      { name: string; description: string }[];
  drinks:        { name: string; description: string }[];
  packing_tips:  string[];
  shopping_list: string[];
}

async function callClaude(prompt: string): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  return text.replace(/```json|```/g, '').trim();
}

export default function OutdoorCateringScreen() {
  const [step,      setStep]      = useState<'form' | 'result'>('form');
  const [guests,    setGuests]    = useState('15');
  const [eventType, setEventType] = useState('Picnic');
  const [foodType,  setFoodType]  = useState('Vegetarian');
  const [setup,     setSetup]     = useState('Finger Food');
  const [weather,   setWeather]   = useState('Hot & Sunny');
  const [budget,    setBudget]    = useState('25');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [menu,      setMenu]      = useState<OutdoorMenu | null>(null);

  async function generateMenu() {
    setError('');
    const guestNum  = parseInt(guests, 10);
    if (isNaN(guestNum) || guestNum < 1) { setError('Enter a valid number of guests.'); return; }
    const budgetNum = parseInt(budget, 10);
    if (isNaN(budgetNum) || budgetNum < 1) { setError('Enter a valid budget.'); return; }
    setLoading(true);
    const prompt = `You are Maharaj, an expert Indian cuisine chef specialising in outdoor catering.
Generate an outdoor catering menu for:
- Event: ${eventType}
- Guests: ${guestNum} people
- Food type: ${foodType}
- Setup style: ${setup}
- Weather: ${weather}
- Budget: AED ${budgetNum} per head (Total: AED ${guestNum * budgetNum})
- Location: Dubai UAE (ingredients from Carrefour/Spinneys/Lulu)
Focus on food that travels well and stays fresh outdoors.
Respond with ONLY valid JSON:
{"starters":[{"name":"...","description":"..."}],"main_course":[{"name":"...","description":"..."}],"desserts":[{"name":"...","description":"..."}],"drinks":[{"name":"...","description":"..."}],"packing_tips":["tip1"],"shopping_list":["item1"]}
Include 3-5 items per section.`;
    try {
      const text = await callClaude(prompt);
      setMenu(JSON.parse(text) as OutdoorMenu);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate menu. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function MenuSection({ title, icon, items }: { title: string; icon: string; items: { name: string; description: string }[] }) {
    return (
      <View style={s.menuSection}>
        <Text style={s.menuSectionTitle}>{icon} {title}</Text>
        {items.map((item, i) => (
          <View key={i} style={[s.menuItem, i === items.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.menuItemName}>{item.name}</Text>
            <Text style={s.menuItemDesc}>{item.description}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => step === 'result' ? setStep('form') : router.back()}>
          <Text style={s.backText}>← {step === 'result' ? 'New Menu' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Outdoor Catering</Text>
        <View style={{ width: 80 }} />
      </View>

      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.container}>
            <Text style={s.formTitle}>Plan Your Outdoor Event</Text>
            <Text style={s.formSub}>Maharaj will suggest food that travels well and keeps fresh outdoors.</Text>

            <Label>Number of Guests</Label>
            <TextInput style={s.input} value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="e.g. 20" placeholderTextColor={midGray} />

            <Label>Event Type</Label>
            <View style={s.chipRow}>
              {EVENT_TYPES.map((e) => (
                <TouchableOpacity key={e} style={[s.chip, eventType === e && s.chipActive]} onPress={() => setEventType(e)}>
                  <Text style={[s.chipText, eventType === e && s.chipTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>Food Preference</Label>
            <View style={s.chipRow}>
              {FOOD_TYPES.map((ft) => (
                <TouchableOpacity key={ft} style={[s.chip, foodType === ft && s.chipActive]} onPress={() => setFoodType(ft)}>
                  <Text style={[s.chipText, foodType === ft && s.chipTextActive]}>{ft}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>Serving Setup</Label>
            <View style={s.chipRow}>
              {SETUP_STYLES.map((ss) => (
                <TouchableOpacity key={ss} style={[s.chip, setup === ss && s.chipActive]} onPress={() => setSetup(ss)}>
                  <Text style={[s.chipText, setup === ss && s.chipTextActive]}>{ss}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>Weather / Conditions</Label>
            <View style={s.chipRow}>
              {WEATHER_OPTS.map((w) => (
                <TouchableOpacity key={w} style={[s.chip, weather === w && s.chipActive]} onPress={() => setWeather(w)}>
                  <Text style={[s.chipText, weather === w && s.chipTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>Budget per Head (AED)</Label>
            <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="e.g. 25" placeholderTextColor={midGray} />
            {budget && parseInt(budget, 10) > 0 && guests && parseInt(guests, 10) > 0 && (
              <Text style={s.totalBudget}>Total budget: AED {parseInt(guests, 10) * parseInt(budget, 10)}</Text>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <TouchableOpacity style={[s.generateBtn, loading && { opacity: 0.6 }]} onPress={generateMenu} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={white} /> : <Text style={s.generateBtnText}>🏕️ Generate Outdoor Menu</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.container}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>{eventType} Menu</Text>
              <Text style={s.resultMeta}>{guests} guests · {foodType} · {setup} · AED {budget}/head</Text>
              <Text style={s.resultMeta}>☀️ {weather}</Text>
            </View>
            {menu && (
              <>
                <MenuSection title="Starters"   icon="🍢" items={menu.starters}    />
                <MenuSection title="Main Course" icon="🍛" items={menu.main_course} />
                <MenuSection title="Desserts"    icon="🍮" items={menu.desserts}    />
                <MenuSection title="Drinks"      icon="🥤" items={menu.drinks}      />
                {menu.packing_tips.length > 0 && (
                  <View style={s.menuSection}>
                    <Text style={s.menuSectionTitle}>🎒 Packing & Serving Tips</Text>
                    {menu.packing_tips.map((tip, i) => <Text key={i} style={s.tipText}>• {tip}</Text>)}
                  </View>
                )}
                {menu.shopping_list.length > 0 && (
                  <View style={s.menuSection}>
                    <Text style={s.menuSectionTitle}>🛒 Shopping List</Text>
                    <View style={s.shoppingGrid}>
                      {menu.shopping_list.map((item, i) => (
                        <View key={i} style={s.shoppingItem}>
                          <Text style={s.shoppingItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F6FB' },
  header:          { backgroundColor: HEADER_COLOR, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText:        { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500', width: 80 },
  headerTitle:     { fontSize: 17, fontWeight: '800', color: white },
  scroll:          { flexGrow: 1 },
  container:       { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  formTitle:       { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  formSub:         { fontSize: 13, color: midGray, marginBottom: 8, lineHeight: 20 },
  label:           { fontSize: 12, fontWeight: '600', color: darkGray, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:           { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: lightGray },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  chipActive:      { backgroundColor: HEADER_COLOR, borderColor: HEADER_COLOR },
  chipText:        { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTextActive:  { color: white, fontWeight: '600' },
  totalBudget:     { fontSize: 13, color: '#16A34A', fontWeight: '600', marginTop: 6 },
  generateBtn:     { backgroundColor: HEADER_COLOR, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  generateBtnText: { color: white, fontSize: 16, fontWeight: '700' },
  errorText:       { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader:    { backgroundColor: HEADER_COLOR, borderRadius: 14, padding: 20, marginBottom: 16 },
  resultTitle:     { fontSize: 22, fontWeight: '800', color: white },
  resultMeta:      { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  menuSection:     { backgroundColor: white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  menuSectionTitle:{ fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 },
  menuItem:        { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuItemName:    { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  menuItemDesc:    { fontSize: 12, color: midGray, marginTop: 2, lineHeight: 18 },
  tipText:         { fontSize: 14, color: darkGray, lineHeight: 22, paddingVertical: 3 },
  shoppingGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shoppingItem:    { backgroundColor: lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  shoppingItemText:{ fontSize: 13, color: darkGray },
});
