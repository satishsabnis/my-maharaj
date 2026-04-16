import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ImageBackground, Modal, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase, getSessionUser } from '../lib/supabase';
import { track } from '../lib/analytics';
import { colors } from '../constants/theme';
import { navy, gold, white, border, textSec } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeIngredient { item: string; quantity: string; unit: string }

export interface FamilyRecipe {
  id?: string;
  recipe_name: string;
  cuisine: string;
  serves: number;
  prep_time: string;
  cook_time: string;
  ingredients: RecipeIngredient[];
  method: string[];
  notes: string;
  is_veg: boolean;
  source: 'photo' | 'pdf' | 'manual';
  created_at?: string;
}

// ─── Claude extraction ────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `Extract this recipe completely. Return JSON only, no markdown:
{
  "recipeName": "string",
  "cuisine": "string (guess from ingredients/name)",
  "serves": 4,
  "prepTime": "string",
  "cookTime": "string",
  "ingredients": [{ "item": "string", "quantity": "string", "unit": "string" }],
  "method": ["step as string"],
  "notes": "string",
  "isVeg": true
}
If you cannot read the recipe clearly, return: { "error": "Could not read recipe" }`;

async function extractRecipe(base64: string, mimeType: string): Promise<FamilyRecipe | { error: string }> {
  const isImage = mimeType.startsWith('image/');
  const mediaContent = isImage
    ? { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };

  const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: [mediaContent, { type: 'text', text: EXTRACTION_PROMPT }] }],
    }),
  });
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '{}';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (parsed.error) return { error: parsed.error };
  return {
    recipe_name: parsed.recipeName ?? 'Unnamed Recipe',
    cuisine:     parsed.cuisine    ?? 'Indian',
    serves:      parsed.serves     ?? 4,
    prep_time:   parsed.prepTime   ?? '',
    cook_time:   parsed.cookTime   ?? '',
    ingredients: parsed.ingredients ?? [],
    method:      parsed.method      ?? [],
    notes:       parsed.notes       ?? '',
    is_veg:      parsed.isVeg       ?? true,
    source:      isImage ? 'photo' : 'pdf',
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FamilyRecipesScreen() {
  const [recipes, setRecipes]           = useState<FamilyRecipe[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadingMsg, setLoadingMsg]     = useState('');
  const [pending, setPending]           = useState<FamilyRecipe | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<FamilyRecipe | null>(null);
  const [showManual, setShowManual]     = useState(false);
  const [saved, setSaved]               = useState(false);

  // Manual form state
  const [manualName, setManualName]           = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
  const [manualMethod, setManualMethod]       = useState('');
  const [manualServes, setManualServes]       = useState('4');
  const [manualCuisine, setManualCuisine]     = useState('');

  useFocusEffect(useCallback(() => {
    loadRecipes();
  }, []));

  async function loadRecipes() {
    // Load local first for instant display
    const raw = await AsyncStorage.getItem('family_recipes');
    const local: FamilyRecipe[] = raw ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
    if (local.length > 0) setRecipes(local);

    // Fetch from Supabase and merge/dedup (Supabase is source of truth for any id that exists)
    const user = await getSessionUser();
    if (!user) return;
    const { data } = await supabase.from('family_recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const remote = (data ?? []) as FamilyRecipe[];
    // Merge: start with remote, then append any local-only entries (no id or id not in remote)
    const remoteIds = new Set(remote.map(r => r.id).filter(Boolean));
    const localOnly = local.filter(r => !r.id || !remoteIds.has(r.id));
    const merged = [...remote, ...localOnly];
    setRecipes(merged);
    await AsyncStorage.setItem('family_recipes', JSON.stringify(merged));
  }

  // ── Upload handlers ───────────────────────────────────────────────────────

  async function handlePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo access to upload recipes.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });
    if (result.canceled || !result.assets[0].base64) return;
    setLoadingMsg('Maharaj is reading your recipe...');
    setLoading(true);
    setPending(null);
    try {
      const mimeType = result.assets[0].mimeType ?? 'image/jpeg';
      const extracted = await extractRecipe(result.assets[0].base64, mimeType);
      if ('error' in extracted) { Alert.alert('Could not read recipe', 'Please try a clearer photo or type it manually.'); }
      else { setPending(extracted); }
    } catch { Alert.alert('Error', 'Failed to read recipe. Please try again.'); }
    finally { setLoading(false); setLoadingMsg(''); }
  }

  async function handlePDF() {
    if (Platform.OS === 'web') {
      Alert.alert('PDF upload', 'PDF upload is not available on web. Please use the mobile app or type the recipe manually.');
      return;
    }
    const DocumentPicker = require('expo-document-picker');
    const FileSystem = require('expo-file-system');
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled || !result.assets?.[0]) return;
    setLoadingMsg('Maharaj is reading your recipe...');
    setLoading(true);
    setPending(null);
    try {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const extracted = await extractRecipe(base64, 'application/pdf');
      if ('error' in extracted) { Alert.alert('Could not read recipe', 'Please try a different file or type it manually.'); }
      else { setPending(extracted); }
    } catch { Alert.alert('Error', 'Failed to read PDF. Please try again.'); }
    finally { setLoading(false); setLoadingMsg(''); }
  }

  function handleManualSave() {
    if (!manualName.trim()) { Alert.alert('Recipe name required'); return; }
    const ings: RecipeIngredient[] = manualIngredients.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/\s+/);
      return { quantity: parts[0] ?? '', unit: parts[1] ?? '', item: parts.slice(2).join(' ') || line.trim() };
    });
    const steps = manualMethod.split('\n').filter(Boolean);
    setPending({
      recipe_name: manualName.trim(),
      cuisine:     manualCuisine.trim() || 'Indian',
      serves:      parseInt(manualServes) || 4,
      prep_time:   '',
      cook_time:   '',
      ingredients: ings,
      method:      steps,
      notes:       '',
      is_veg:      true,
      source:      'manual',
    });
    setShowManual(false);
  }

  // ── Save to Supabase + AsyncStorage ───────────────────────────────────────

  async function saveRecipe() {
    if (!pending) return;
    setLoading(true);
    setLoadingMsg('Saving recipe...');
    try {
      const user = await getSessionUser();
      if (!user) { Alert.alert('Please sign in'); return; }
      const row = { user_id: user.id, recipe_name: pending.recipe_name, cuisine: pending.cuisine, serves: pending.serves, prep_time: pending.prep_time, cook_time: pending.cook_time, ingredients: pending.ingredients, method: pending.method, notes: pending.notes, is_veg: pending.is_veg, source: pending.source };
      const { data, error } = await supabase.from('family_recipes').insert(row).select('id, created_at').single();
      if (error) throw error;
      const saved: FamilyRecipe = { ...pending, id: data.id, created_at: data.created_at };
      const updated = [saved, ...recipes];
      setRecipes(updated);
      await AsyncStorage.setItem('family_recipes', JSON.stringify(updated));
      track('family_recipe_imported', { source: pending.source, cuisine: pending.cuisine, is_veg: pending.is_veg });
      setPending(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadRecipes();
    } catch { Alert.alert('Save failed', 'Please check your connection and try again.'); }
    finally { setLoading(false); setLoadingMsg(''); }
  }

  async function deleteRecipe(id: string) {
    Alert.alert('Delete recipe?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('family_recipes').delete().eq('id', id);
        const updated = recipes.filter(r => r.id !== id);
        setRecipes(updated);
        await AsyncStorage.setItem('family_recipes', JSON.stringify(updated));
      }},
    ]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={require('../assets/background.png')} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}><Text style={s.headerBtnTxt}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>My Family Recipes</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.headerBtn}><Text style={[s.headerBtnTxt, { color: colors.emerald }]}>Home</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Tip card */}
          <View style={s.tipCard}>
            <Text style={s.tipText}>Upload your family recipes — handwritten, typed, or photos of recipe books. Maharaj will read them and remember them. Tap <Text style={{ fontWeight: '700' }}>'Use My Recipes'</Text> in the meal wizard to include them in your weekly plan.</Text>
          </View>

          {/* Upload options */}
          <Text style={s.sectionTitle}>Add a Recipe</Text>
          <View style={s.uploadRow}>
            <TouchableOpacity style={s.uploadCard} onPress={handlePhoto} activeOpacity={0.85}>
              <Text style={s.uploadIcon}>{'\uD83D\uDCF7'}</Text>
              <Text style={s.uploadLabel}>Photo</Text>
              <Text style={s.uploadSub}>Recipe book, handwritten</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.uploadCard} onPress={handlePDF} activeOpacity={0.85}>
              <Text style={s.uploadIcon}>{'\uD83D\uDCC4'}</Text>
              <Text style={s.uploadLabel}>PDF</Text>
              <Text style={s.uploadSub}>Typed or scanned recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.uploadCard} onPress={() => setShowManual(true)} activeOpacity={0.85}>
              <Text style={s.uploadIcon}>{'\u270F\uFE0F'}</Text>
              <Text style={s.uploadLabel}>Type it</Text>
              <Text style={s.uploadSub}>Enter recipe manually</Text>
            </TouchableOpacity>
          </View>

          {/* Loading state */}
          {loading && (
            <View style={s.loadingCard}>
              <Image source={require('../assets/logo.png')} style={{ width: 60, height: 60, marginBottom: 12 }} resizeMode="contain" />
              <Text style={s.loadingMsg}>{loadingMsg || 'Please wait...'}</Text>
              <ActivityIndicator color={colors.navy} style={{ marginTop: 8 }} />
            </View>
          )}

          {/* Pending confirmation */}
          {!loading && pending && (
            <View style={s.pendingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={s.pendingName}>{pending.recipe_name}</Text>
                <View style={[s.tag, { backgroundColor: pending.is_veg ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: pending.is_veg ? '#065F46' : '#991B1B' }}>{pending.is_veg ? 'Veg' : 'Non-veg'}</Text>
                </View>
              </View>
              <Text style={s.pendingMeta}>{pending.cuisine} · Serves {pending.serves} · {pending.ingredients.length} ingredients</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={s.btnEmerald} onPress={saveRecipe} activeOpacity={0.85}>
                  <Text style={s.btnEmeraldTxt}>Save this recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnOutline} onPress={() => setPending(null)} activeOpacity={0.8}>
                  <Text style={s.btnOutlineTxt}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Success banner */}
          {saved && (
            <View style={{ backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#065F46', textAlign: 'center', fontWeight: '600' }}>Recipe saved. Maharaj will remember this.</Text>
            </View>
          )}

          {/* Recipe list */}
          <Text style={s.sectionTitle}>Saved Recipes</Text>
          {recipes.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTxt}>No family recipes yet. Upload your first recipe above.</Text>
            </View>
          ) : (
            recipes.map((recipe, i) => (
              <View key={recipe.id ?? i} style={s.recipeCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={s.recipeName}>{recipe.recipe_name}</Text>
                    <View style={[s.tag, { backgroundColor: recipe.is_veg ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: recipe.is_veg ? '#065F46' : '#991B1B' }}>{recipe.is_veg ? 'Veg' : 'Non-veg'}</Text>
                    </View>
                  </View>
                  <Text style={s.recipeMeta}>{recipe.cuisine} · Serves {recipe.serves}</Text>
                  <Text style={s.recipeIngCount}>{recipe.ingredients.length} ingredients</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <TouchableOpacity onPress={() => setDetailRecipe(recipe)} style={s.viewBtn}>
                    <Text style={s.viewBtnTxt}>View</Text>
                  </TouchableOpacity>
                  {recipe.id && (
                    <TouchableOpacity onPress={() => deleteRecipe(recipe.id!)}>
                      <Text style={{ fontSize: 10, color: '#EF4444' }}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Manual entry modal */}
        <Modal visible={showManual} animationType="slide" onRequestClose={() => setShowManual(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: white }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Type a Recipe</Text>
              <TouchableOpacity onPress={() => setShowManual(false)}><Text style={{ fontSize: 14, color: colors.emerald }}>Cancel</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Recipe Name *</Text>
              <TextInput style={s.textInput} value={manualName} onChangeText={setManualName} placeholder="e.g. Amma's Prawn Curry" placeholderTextColor={colors.textMuted} />
              <Text style={s.fieldLabel}>Cuisine</Text>
              <TextInput style={s.textInput} value={manualCuisine} onChangeText={setManualCuisine} placeholder="e.g. Konkani" placeholderTextColor={colors.textMuted} />
              <Text style={s.fieldLabel}>Serves</Text>
              <TextInput style={s.textInput} value={manualServes} onChangeText={setManualServes} placeholder="4" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
              <Text style={s.fieldLabel}>Ingredients (one per line)</Text>
              <TextInput style={[s.textInput, { height: 120, textAlignVertical: 'top' }]} value={manualIngredients} onChangeText={setManualIngredients} placeholder={'500g prawns\n2 onions\n1 tsp turmeric'} placeholderTextColor={colors.textMuted} multiline />
              <Text style={s.fieldLabel}>Method (one step per line)</Text>
              <TextInput style={[s.textInput, { height: 120, textAlignVertical: 'top' }]} value={manualMethod} onChangeText={setManualMethod} placeholder={'Marinate prawns\nSauté onions until golden\nAdd masala and cook'} placeholderTextColor={colors.textMuted} multiline />
              <TouchableOpacity style={[s.btnEmerald, { marginTop: 16 }]} onPress={handleManualSave} activeOpacity={0.85}>
                <Text style={s.btnEmeraldTxt}>Use this Recipe</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Recipe detail modal */}
        <Modal visible={!!detailRecipe} animationType="slide" onRequestClose={() => setDetailRecipe(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: white }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>{detailRecipe?.recipe_name}</Text>
              <TouchableOpacity onPress={() => setDetailRecipe(null)}><Text style={{ fontSize: 14, color: colors.emerald }}>Close</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {detailRecipe && (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {[detailRecipe.cuisine, `Serves ${detailRecipe.serves}`, detailRecipe.prep_time && `Prep ${detailRecipe.prep_time}`, detailRecipe.cook_time && `Cook ${detailRecipe.cook_time}`].filter(Boolean).map((tag, i) => (
                      <View key={i} style={[s.tag, { backgroundColor: '#EBF3FB' }]}>
                        <Text style={{ fontSize: 10, color: colors.navy, fontWeight: '600' }}>{tag}</Text>
                      </View>
                    ))}
                    <View style={[s.tag, { backgroundColor: detailRecipe.is_veg ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: detailRecipe.is_veg ? '#065F46' : '#991B1B' }}>{detailRecipe.is_veg ? 'Vegetarian' : 'Non-vegetarian'}</Text>
                    </View>
                  </View>

                  <Text style={s.detailSection}>Ingredients</Text>
                  {detailRecipe.ingredients.map((ing, i) => (
                    <View key={i} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: 'rgba(26,58,92,0.08)' }}>
                      <Text style={{ fontSize: 13, color: colors.navy, flex: 1 }}>{ing.item}</Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>{ing.quantity} {ing.unit}</Text>
                    </View>
                  ))}

                  <Text style={[s.detailSection, { marginTop: 16 }]}>Method</Text>
                  {detailRecipe.method.map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        <Text style={{ fontSize: 10, color: white, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.navy, flex: 1, lineHeight: 20 }}>{step}</Text>
                    </View>
                  ))}

                  {detailRecipe.notes ? (
                    <>
                      <Text style={[s.detailSection, { marginTop: 16 }]}>Notes</Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>{detailRecipe.notes}</Text>
                    </>
                  ) : null}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border },
  headerBtn:     { minWidth: 48 },
  headerBtnTxt:  { fontSize: 14, color: navy, fontWeight: '600' },
  headerTitle:   { fontSize: 16, fontWeight: '800', color: navy },
  tipCard:       { backgroundColor: '#EBF3FB', borderRadius: 12, padding: 14, marginBottom: 20 },
  tipText:       { fontSize: 13, color: navy, lineHeight: 19 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: navy, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  uploadRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  uploadCard:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, borderWidth: 1.5, borderColor: border, padding: 12, alignItems: 'center' },
  uploadIcon:    { fontSize: 22, marginBottom: 6 },
  uploadLabel:   { fontSize: 11, fontWeight: '700', color: navy, marginBottom: 2 },
  uploadSub:     { fontSize: 9, color: textSec, textAlign: 'center' },
  loadingCard:   { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 16 },
  loadingMsg:    { fontSize: 13, color: navy, fontWeight: '600', textAlign: 'center' },
  pendingCard:   { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1.5, borderColor: colors.emerald, padding: 16, marginBottom: 16 },
  pendingName:   { fontSize: 15, fontWeight: '800', color: navy, flex: 1 },
  pendingMeta:   { fontSize: 11, color: textSec },
  tag:           { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  btnEmerald:    { backgroundColor: colors.emerald, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' },
  btnEmeraldTxt: { fontSize: 13, fontWeight: '700', color: white },
  btnOutline:    { borderWidth: 1.5, borderColor: colors.navy, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, alignSelf: 'flex-start' },
  btnOutlineTxt: { fontSize: 13, fontWeight: '600', color: navy },
  emptyCard:     { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyTxt:      { fontSize: 13, color: textSec, textAlign: 'center' },
  recipeCard:    { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' },
  recipeName:    { fontSize: 13, fontWeight: '700', color: navy, flexShrink: 1 },
  recipeMeta:    { fontSize: 11, color: textSec, marginTop: 2 },
  recipeIngCount:{ fontSize: 10, color: colors.textMuted, marginTop: 2 },
  viewBtn:       { backgroundColor: colors.navy, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  viewBtnTxt:    { fontSize: 11, fontWeight: '600', color: white },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border },
  modalTitle:    { fontSize: 16, fontWeight: '800', color: navy, flex: 1, marginRight: 12 },
  fieldLabel:    { fontSize: 12, fontWeight: '700', color: navy, marginBottom: 4, marginTop: 14 },
  textInput:     { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1.5, borderColor: border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: navy },
  detailSection: { fontSize: 12, fontWeight: '700', color: navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
});
