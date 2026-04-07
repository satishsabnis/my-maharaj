import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import ScreenWrapper from '../components/ScreenWrapper';
import Button from '../components/Button';
import { navy, white, textSec, border, errorRed } from '../theme/colors';

const base = 'https://my-maharaj.vercel.app';

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return (data?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}

interface PrepResult {
  missing_ingredients: { name: string; qty: string }[];
  batch_cooking: string[];
  storage_guide: { item: string; duration: string }[];
  marinade_timings: { item: string; timing: string }[];
  weekly_plan: string;
  prep_sequence: string[];
}

export default function MealPrepScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrepResult | null>(null);
  const [error, setError] = useState('');

  async function generatePrep() {
    setLoading(true); setError(''); setResult(null);
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Not authenticated');

      // Check three sources in order: AsyncStorage → Supabase menu_history → error
      let mealPlan: any = null;

      // Source 1: AsyncStorage confirmed_meal_plan
      const localPlan = await AsyncStorage.getItem('confirmed_meal_plan');
      if (localPlan) { try { mealPlan = JSON.parse(localPlan); } catch {} }

      // Source 2: Supabase menu_history
      if (!mealPlan) {
        const { data: historyData } = await supabase.from('menu_history').select('menu_json').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        mealPlan = historyData?.[0]?.menu_json ?? null;
      }

      // Source 3: AsyncStorage menu_history (local fallback)
      if (!mealPlan) {
        const localHistory = await AsyncStorage.getItem('menu_history');
        if (localHistory) { try { const arr = JSON.parse(localHistory); if (arr.length > 0) mealPlan = arr[0]; } catch {} }
      }

      const { data: fridgeData } = await supabase.from('fridge_inventory').select('item_name, quantity, unit').eq('user_id', user.id);
      const fridge = (fridgeData ?? []).map((f: any) => `${f.item_name} ${f.quantity ?? ''}${f.unit ?? ''}`).join(', ');

      if (!mealPlan) { setError('No meal plan found. Please generate a plan first.'); setLoading(false); return; }

      const raw = await callClaude(`You are Maharaj, a kitchen prep expert. Given this meal plan and fridge inventory, create a prep guide.

MEAL PLAN: ${JSON.stringify(mealPlan).slice(0, 3000)}
FRIDGE INVENTORY: ${fridge || 'Empty'}

Respond ONLY with valid JSON:
{"missing_ingredients":[{"name":"Onions","qty":"2 kg"}],"batch_cooking":["Make dal base for 3 days","Prepare ginger-garlic paste in bulk"],"storage_guide":[{"item":"Dal base","duration":"3 days in fridge"}],"marinade_timings":[{"item":"Chicken tikka","timing":"Overnight minimum, 2 hours if rushed"}],"weekly_plan":"Sunday: 2 hours prep saves 45 mins daily. Prep dal, chop vegetables, make masala paste.","prep_sequence":["1. Soak dal and rice","2. Chop all vegetables","3. Prepare masala paste","4. Marinate proteins","5. Batch cook base gravies"]}`);

      let parsed: PrepResult;
      try { parsed = JSON.parse(raw); } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Invalid response');
      }
      setResult(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate prep guide.');
    } finally { setLoading(false); }
  }

  return (
    <ScreenWrapper title="Meal Prep">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Meal Prep Guide</Text>
        <Text style={s.sub}>Based on your latest meal plan and fridge inventory</Text>

        <Button title={loading ? 'Generating...' : 'Generate Prep Guide'} onPress={generatePrep} loading={loading} />

        {error ? <Text style={s.error}>{error}</Text> : null}

        {result && (
          <View style={{marginTop:16}}>
            {result.weekly_plan && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Weekly Prep Plan</Text>
                <Text style={s.cardText}>{result.weekly_plan}</Text>
              </View>
            )}

            {result.missing_ingredients?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Shopping List (Not in Fridge)</Text>
                {result.missing_ingredients.map((item, i) => (
                  <View key={i} style={s.row}>
                    <Text style={s.rowName}>{item.name}</Text>
                    <Text style={s.rowQty}>{item.qty}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.prep_sequence?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Prep Sequence</Text>
                {result.prep_sequence.map((step, i) => (
                  <Text key={i} style={s.stepText}>{step}</Text>
                ))}
              </View>
            )}

            {result.batch_cooking?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Batch Cooking</Text>
                {result.batch_cooking.map((tip, i) => (
                  <Text key={i} style={s.stepText}>• {tip}</Text>
                ))}
              </View>
            )}

            {result.storage_guide?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Storage Guide</Text>
                {result.storage_guide.map((item, i) => (
                  <View key={i} style={s.row}>
                    <Text style={s.rowName}>{item.item}</Text>
                    <Text style={s.rowQty}>{item.duration}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.marinade_timings?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Marinade Timings</Text>
                {result.marinade_timings.map((item, i) => (
                  <View key={i} style={s.row}>
                    <Text style={s.rowName}>{item.item}</Text>
                    <Text style={s.rowQty}>{item.timing}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{height:40}} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  sub: { fontSize: 13, color: textSec, marginBottom: 16, lineHeight: 20 },
  error: { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 12 },
  card: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 10 },
  cardText: { fontSize: 14, color: textSec, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowName: { fontSize: 14, color: navy, fontWeight: '500', flex: 1 },
  rowQty: { fontSize: 13, color: '#1A6B5C', fontWeight: '600', textAlign: 'right' },
  stepText: { fontSize: 14, color: textSec, lineHeight: 22, marginBottom: 4 },
});
