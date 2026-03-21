import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { navy, gold, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const OCCASIONS = ['Birthday', 'Anniversary', 'Festival', 'Get-together', 'Dinner Party', 'Baby Shower', 'Wedding', 'Office Party'];
const FOOD_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Mixed'];
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyDi9MUZ29m4DK1LswIV8cI1EfxGkrkU7fk';

interface PartyMenu {
  starters: { name: string; description: string }[];
  main_course: { name: string; description: string }[];
  desserts: { name: string; description: string }[];
  drinks: { name: string; description: string }[];
  serving_tips: string[];
  shopping_list: string[];
}

export default function PartyMenuScreen() {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [guests, setGuests] = useState('10');
  const [occasion, setOccasion] = useState('Birthday');
  const [foodType, setFoodType] = useState('Vegetarian');
  const [budget, setBudget] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<PartyMenu | null>(null);

  async function generateMenu() {
    setError('');
    const guestNum = parseInt(guests, 10);
    if (isNaN(guestNum) || guestNum < 1) { setError('Enter a valid number of guests.'); return; }
    const budgetNum = parseInt(budget, 10);
    if (isNaN(budgetNum) || budgetNum < 1) { setError('Enter a valid budget.'); return; }

    setLoading(true);
    const prompt = `You are Maharaj, an expert Indian regional cuisine chef.
Generate a party menu for:
- Guests: ${guestNum} people
- Occasion: ${occasion}
- Food type: ${foodType}
- Budget: AED ${budgetNum} per head (Total: AED ${guestNum * budgetNum})
- Location: Dubai UAE (ingredients available at Carrefour/Spinneys/Lulu)

Respond with ONLY valid JSON:
{
  "starters": [{"name": "...", "description": "..."}],
  "main_course": [{"name": "...", "description": "..."}],
  "desserts": [{"name": "...", "description": "..."}],
  "drinks": [{"name": "...", "description": "..."}],
  "serving_tips": ["tip 1", "tip 2"],
  "shopping_list": ["item 1", "item 2"]
}
Include 3-5 items per section.`;

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
      });
      if (!res.ok) throw new Error('Generation failed. Please try again.');
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const clean = text.replace(/```json|```/g, '').trim();
      setMenu(JSON.parse(clean) as PartyMenu);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate menu.');
    } finally {
      setLoading(false);
    }
  }

  function MenuSection({ title, icon, items }: { title: string; icon: string; items: { name: string; description: string }[] }) {
    return (
      <View style={s.menuSection}>
        <Text style={s.menuSectionTitle}>{icon} {title}</Text>
        {items.map((item, i) => (
          <View key={i} style={s.menuItem}>
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
        <Text style={s.headerTitle}>Party Menu Generator</Text>
        <View style={{ width: 80 }} />
      </View>

      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Text style={s.formTitle}>Plan Your Gathering</Text>

            <Label>Number of Guests</Label>
            <TextInput style={s.input} value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="e.g. 20" placeholderTextColor={midGray} />

            <Label>Occasion</Label>
            <View style={s.chipRow}>
              {OCCASIONS.map((o) => (
                <TouchableOpacity key={o} style={[s.chip, occasion === o && s.chipActive]} onPress={() => setOccasion(o)}>
                  <Text style={[s.chipText, occasion === o && s.chipTextActive]}>{o}</Text>
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

            <Label>Budget per Head (AED)</Label>
            <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="e.g. 30" placeholderTextColor={midGray} />
            {budget && parseInt(budget, 10) > 0 && guests && parseInt(guests, 10) > 0 && (
              <Text style={s.totalBudget}>Total budget: AED {parseInt(guests, 10) * parseInt(budget, 10)}</Text>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <TouchableOpacity style={[s.generateBtn, loading && { opacity: 0.6 }]} onPress={generateMenu} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={white} /> : <Text style={s.generateBtnText}>🎉 Generate Party Menu</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.container}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>{occasion} Menu</Text>
              <Text style={s.resultMeta}>{guests} guests · {foodType} · AED {budget}/head</Text>
            </View>

            {menu && (
              <>
                <MenuSection title="Starters" icon="🍢" items={menu.starters} />
                <MenuSection title="Main Course" icon="🍛" items={menu.main_course} />
                <MenuSection title="Desserts" icon="🍮" items={menu.desserts} />
                <MenuSection title="Drinks" icon="🥤" items={menu.drinks} />

                {menu.serving_tips.length > 0 && (
                  <View style={s.menuSection}>
                    <Text style={s.menuSectionTitle}>💡 Serving Tips</Text>
                    {menu.serving_tips.map((tip, i) => <Text key={i} style={s.tipText}>• {tip}</Text>)}
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
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: '#8B1A1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500', width: 80 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: white },
  scroll: { flexGrow: 1 },
  container: { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  formTitle: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: darkGray, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: lightGray },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  chipActive: { backgroundColor: '#8B1A1A', borderColor: '#8B1A1A' },
  chipText: { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTextActive: { color: white, fontWeight: '600' },
  totalBudget: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginTop: 6 },
  generateBtn: { backgroundColor: '#8B1A1A', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  generateBtnText: { color: white, fontSize: 16, fontWeight: '700' },
  errorText: { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader: { backgroundColor: '#8B1A1A', borderRadius: 14, padding: 20, marginBottom: 16 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: white },
  resultMeta: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  menuSection: { backgroundColor: white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  menuSectionTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 },
  menuItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuItemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  menuItemDesc: { fontSize: 12, color: midGray, marginTop: 2, lineHeight: 18 },
  tipText: { fontSize: 14, color: darkGray, lineHeight: 22, paddingVertical: 3 },
  shoppingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shoppingItem: { backgroundColor: lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  shoppingItemText: { fontSize: 13, color: darkGray },
});
