/**
 * Cook Recipe Detail Screen — /cook/recipe/[dish]
 * Fetches and displays the recipe for a dish name.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Logo from '../../../components/Logo';

const NAVY  = '#1B3A5C';
const GOLD  = '#C9A227';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(27,58,92,0.5)';

type Recipe = {
  title: string;
  serves: number;
  ingredients: string[];
  method: string[];
  maharajNote?: string;
};

function getLocal(key: string): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
}

export default function RecipeDetailScreen() {
  const { dish } = useLocalSearchParams<{ dish: string }>();
  const dishName  = dish ? decodeURIComponent(dish) : '';
  const [recipe,  setRecipe]  = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cookName = getLocal('cook_name') || getLocal('cook_phone');
  const initials = cookName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'MK';

  useEffect(() => {
    if (!dishName) return;
    (async () => {
      try {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 800,
            messages: [{
              role: 'user',
              content: `Give me a recipe for "${dishName}" for an Indian household cook. Respond ONLY with valid JSON in this exact format:
{"title":"${dishName}","serves":4,"ingredients":["qty ingredient",...8-12 items],"method":["Step 1: ...",..."5-8 steps"],"maharajNote":"one warm tip about this dish"}`,
            }],
          }),
        });
        const data = await res.json();
        const raw  = data?.content?.[0]?.text || data?.choices?.[0]?.message?.content || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Invalid response');
        setRecipe(JSON.parse(match[0]));
      } catch (e: any) {
        setError(e.message || 'Could not load recipe.');
      } finally {
        setLoading(false);
      }
    })();
  }, [dishName]);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../../assets/background.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Logo size="small" />
          <View style={{ width: 40 }} />
        </View>

        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={NAVY} size="large" />
            <Text style={{ color: MUTED, marginTop: 12, fontSize: 13 }}>Fetching recipe…</Text>
          </View>
        ) : error || !recipe ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: '#DC2626', textAlign: 'center' }}>{error || 'Recipe not found.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.dishTitle}>{recipe.title}</Text>
            <Text style={s.serves}>Serves {recipe.serves}</Text>

            {/* Ingredients */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>INGREDIENTS</Text>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={s.ingRow}>
                  <View style={s.dot} />
                  <Text style={s.ingTxt}>{ing}</Text>
                </View>
              ))}
            </View>

            {/* Method */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>METHOD</Text>
              {recipe.method.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <Text style={s.stepNum}>{i + 1}</Text>
                  <Text style={s.stepTxt}>{step.replace(/^Step \d+:\s*/i, '')}</Text>
                </View>
              ))}
            </View>

            {/* Maharaj Note */}
            {recipe.maharajNote ? (
              <View style={s.noteCard}>
                <Text style={s.noteLabel}>Maharaj's Tip</Text>
                <Text style={s.noteTxt}>{recipe.maharajNote}</Text>
              </View>
            ) : null}

            <Text style={s.footer}>My Maharaj · Blue Flute Consulting LLC-FZ</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { color: WHITE, fontWeight: '700', fontSize: 14 },
  backBtn:      { marginLeft: 16, marginBottom: 12 },
  backTxt:      { fontSize: 14, color: NAVY, borderWidth: 1, borderColor: NAVY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  scroll:       { paddingHorizontal: 16, paddingBottom: 40 },
  dishTitle:    { fontSize: 26, fontWeight: '800', color: NAVY, marginBottom: 4 },
  serves:       { fontSize: 13, color: MUTED, marginBottom: 20 },
  section:      { backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: GOLD, letterSpacing: 1, marginBottom: 12 },
  ingRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, marginTop: 6, marginRight: 10, flexShrink: 0 },
  ingTxt:       { fontSize: 14, color: NAVY, flex: 1 },
  stepRow:      { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  stepNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: NAVY, color: WHITE, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginRight: 10, flexShrink: 0 },
  stepTxt:      { fontSize: 13, color: NAVY, flex: 1, lineHeight: 20 },
  noteCard:     { backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: GOLD },
  noteLabel:    { fontSize: 11, fontWeight: '700', color: GOLD, marginBottom: 6 },
  noteTxt:      { fontSize: 13, color: NAVY, lineHeight: 20 },
  footer:       { textAlign: 'center', fontSize: 11, color: MUTED, marginTop: 12 },
});
