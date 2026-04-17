import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ImageBackground, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase, getSessionUser } from '../../lib/supabase';
import { buttons } from '../../constants/theme';

const NAVY  = '#2E5480';
const GOLD  = '#C9A227';
const TEAL  = '#1A6B5C';
const WHITE = '#FFFFFF';
const BASE  = 'https://my-maharaj.vercel.app';

// ─── Recipe type ──────────────────────────────────────────────────────────────

interface RecipeIngredient { item: string; quantity: string; unit: string }

interface FamilyRecipe {
  id?: string;
  recipe_name: string;
  cuisine: string;
  serves: number;
  source: string;
  is_veg: boolean;
  ingredients: RecipeIngredient[];
  method: string[];
  notes: string;
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

  const res = await fetch(`${BASE}/api/claude`, {
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
    source:      isImage ? 'Scanned' : 'Uploaded',
    is_veg:      parsed.isVeg      ?? true,
    ingredients: parsed.ingredients ?? [],
    method:      parsed.method      ?? [],
    notes:       parsed.notes       ?? '',
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OurRecipesScreen() {
  const [recipes,      setRecipes]      = useState<FamilyRecipe[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState('');
  const [pending,      setPending]      = useState<FamilyRecipe | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<FamilyRecipe | null>(null);
  const [showSheet,    setShowSheet]    = useState(false);
  const [saved,        setSaved]        = useState(false);

  useFocusEffect(useCallback(() => { loadRecipes(); }, []));

  async function loadRecipes() {
    const user = await getSessionUser();
    if (!user) return;
    const { data } = await supabase
      .from('family_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRecipes((data ?? []) as FamilyRecipe[]);
  }

  // ── Scan (camera) ──────────────────────────────────────────────────────────

  async function handleScan() {
    setShowSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow camera access to scan recipes.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (result.canceled || !result.assets[0].base64) return;
    setLoadingMsg('Maharaj is reading your recipe...');
    setLoading(true);
    setPending(null);
    try {
      const mimeType = result.assets[0].mimeType ?? 'image/jpeg';
      const extracted = await extractRecipe(result.assets[0].base64, mimeType);
      if ('error' in extracted) Alert.alert('Could not read recipe', 'Please try a clearer photo or type it manually.');
      else { extracted.source = 'Scanned'; setPending(extracted); }
    } catch { Alert.alert('Error', 'Failed to read recipe. Please try again.'); }
    finally { setLoading(false); setLoadingMsg(''); }
  }

  // ── Upload (file picker) ───────────────────────────────────────────────────

  async function handleUpload() {
    setShowSheet(false);
    if (Platform.OS === 'web') {
      Alert.alert('Upload', 'Use the mobile app to upload PDFs.'); return;
    }
    const DocumentPicker = require('expo-document-picker');
    const FileSystem = require('expo-file-system');
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled || !result.assets?.[0]) return;
    setLoadingMsg('Maharaj is reading your recipe...');
    setLoading(true);
    setPending(null);
    try {
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime   = asset.mimeType ?? 'application/pdf';
      const extracted = await extractRecipe(base64, mime);
      if ('error' in extracted) Alert.alert('Could not read recipe', 'Please try a different file or type it manually.');
      else { extracted.source = 'Uploaded'; setPending(extracted); }
    } catch { Alert.alert('Error', 'Failed to read file. Please try again.'); }
    finally { setLoading(false); setLoadingMsg(''); }
  }

  // ── Manual entry ───────────────────────────────────────────────────────────

  function handleManual() {
    setShowSheet(false);
    router.push('/family-recipes/add-recipe' as never);
  }

  // ── Save pending recipe ────────────────────────────────────────────────────

  async function saveRecipe() {
    if (!pending) return;
    setLoading(true);
    setLoadingMsg('Saving...');
    try {
      const user = await getSessionUser();
      if (!user) { Alert.alert('Please sign in'); return; }
      const { error } = await supabase.from('family_recipes').insert({
        user_id: user.id, ...pending,
      });
      if (error) throw error;
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
        setRecipes(r => r.filter(x => x.id !== id));
      }},
    ]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Our Recipes</Text>
        </View>

        {/* Nav row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={buttons.back}>
            <Text style={buttons.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={buttons.home}>
            <Text style={buttons.homeText}>Home</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Loading */}
          {loading && (
            <View style={s.loadingCard}>
              <Image source={require('../../assets/logo.png')} style={{ width: 52, height: 52, marginBottom: 10 }} resizeMode="contain" />
              <Text style={s.loadingMsg}>{loadingMsg || 'Please wait...'}</Text>
              <ActivityIndicator color={NAVY} style={{ marginTop: 8 }} />
            </View>
          )}

          {/* Pending confirmation */}
          {!loading && pending && (
            <View style={s.pendingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={s.pendingName}>{pending.recipe_name}</Text>
                <View style={[s.tag, { backgroundColor: pending.is_veg ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: pending.is_veg ? '#065F46' : '#991B1B' }}>
                    {pending.is_veg ? 'Veg' : 'Non-veg'}
                  </Text>
                </View>
              </View>
              <Text style={s.pendingMeta}>{pending.cuisine} · Serves {pending.serves} · {pending.ingredients.length} ingredients</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={s.btnGold} onPress={saveRecipe} activeOpacity={0.85}>
                  <Text style={s.btnGoldTxt}>Save this recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnOutline} onPress={() => setPending(null)} activeOpacity={0.8}>
                  <Text style={s.btnOutlineTxt}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Saved banner */}
          {saved && (
            <View style={s.savedBanner}>
              <Text style={s.savedBannerTxt}>Recipe saved. Maharaj will remember this.</Text>
            </View>
          )}

          {/* Recipe list */}
          {recipes.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTxt}>No family recipes yet. Add your first recipe below.</Text>
            </View>
          ) : (
            recipes.map((recipe, i) => (
              <TouchableOpacity
                key={recipe.id ?? i}
                style={s.recipeRow}
                onPress={() => setDetailRecipe(recipe)}
                activeOpacity={0.85}
              >
                <View style={s.recipeIcon}>
                  <Text style={s.recipeIconTxt}>R</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recipeName}>{recipe.recipe_name}</Text>
                  <Text style={s.recipeMeta}>
                    {recipe.source} · {recipe.cuisine}
                  </Text>
                </View>
                <View style={s.inPlansBadge}><Text style={s.inPlansTxt}>In plans</Text></View>
              </TouchableOpacity>
            ))
          )}

        </ScrollView>

        {/* Add recipe button */}
        <View style={s.footer}>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
            <Text style={s.addBtnTxt}>+ Add a recipe</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom sheet */}
        <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
          <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setShowSheet(false)}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>Add a Recipe</Text>
              <TouchableOpacity style={s.sheetOption} onPress={handleScan} activeOpacity={0.85}>
                <View style={s.sheetOptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetOptionLabel}>Scan</Text>
                  <Text style={s.sheetOptionSub}>Open camera and photograph a recipe book or handwritten card</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetOption} onPress={handleUpload} activeOpacity={0.85}>
                <View style={s.sheetOptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetOptionLabel}>Upload</Text>
                  <Text style={s.sheetOptionSub}>Upload a PDF or image from your device</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetOption} onPress={handleManual} activeOpacity={0.85}>
                <View style={s.sheetOptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetOptionLabel}>Manual entry</Text>
                  <Text style={s.sheetOptionSub}>Type the recipe name, ingredients and method yourself</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetCancel} onPress={() => setShowSheet(false)}>
                <Text style={s.sheetCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Detail modal */}
        <Modal visible={!!detailRecipe} animationType="slide" onRequestClose={() => setDetailRecipe(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>{detailRecipe?.recipe_name}</Text>
              <TouchableOpacity onPress={() => setDetailRecipe(null)}>
                <Text style={{ fontSize: 14, color: TEAL, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {detailRecipe && (
                <>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {[detailRecipe.cuisine, `Serves ${detailRecipe.serves}`, detailRecipe.source].map((t, i) => (
                      <View key={i} style={[s.tag, { backgroundColor: '#EBF3FB' }]}>
                        <Text style={{ fontSize: 10, color: NAVY, fontWeight: '600' }}>{t}</Text>
                      </View>
                    ))}
                    <View style={[s.tag, { backgroundColor: detailRecipe.is_veg ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: detailRecipe.is_veg ? '#065F46' : '#991B1B' }}>
                        {detailRecipe.is_veg ? 'Vegetarian' : 'Non-vegetarian'}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.detailSec}>Ingredients</Text>
                  {detailRecipe.ingredients.map((ing, i) => (
                    <View key={i} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: 'rgba(26,58,92,0.08)' }}>
                      <Text style={{ fontSize: 13, color: NAVY, flex: 1 }}>{ing.item}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>{ing.quantity} {ing.unit}</Text>
                    </View>
                  ))}

                  <Text style={[s.detailSec, { marginTop: 16 }]}>Method</Text>
                  {detailRecipe.method.map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, color: WHITE, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: NAVY, flex: 1, lineHeight: 20 }}>{step}</Text>
                    </View>
                  ))}

                  {detailRecipe.notes ? (
                    <>
                      <Text style={[s.detailSec, { marginTop: 16 }]}>Notes</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20 }}>{detailRecipe.notes}</Text>
                    </>
                  ) : null}

                  {detailRecipe.id && (
                    <TouchableOpacity
                      style={[s.btnOutline, { marginTop: 24, alignSelf: 'flex-start' }]}
                      onPress={() => { setDetailRecipe(null); deleteRecipe(detailRecipe.id!); }}
                    >
                      <Text style={[s.btnOutlineTxt, { color: '#EF4444', borderColor: '#EF4444' }]}>Delete recipe</Text>
                    </TouchableOpacity>
                  )}
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
  header:          { backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 12 },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: WHITE, textAlign: 'center', flex: 1 },
  scroll:          { padding: 16, paddingBottom: 100 },
  loadingCard:     { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 16 },
  loadingMsg:      { fontSize: 13, color: NAVY, fontWeight: '600', textAlign: 'center' },
  pendingCard:     { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 14, borderWidth: 1.5, borderColor: TEAL, padding: 16, marginBottom: 16 },
  pendingName:     { fontSize: 15, fontWeight: '800', color: NAVY, flex: 1 },
  pendingMeta:     { fontSize: 11, color: '#6B7280' },
  savedBanner:     { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 12 },
  savedBannerTxt:  { fontSize: 13, color: '#065F46', textAlign: 'center', fontWeight: '600' },
  emptyCard:       { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyTxt:        { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  recipeRow:       { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recipeIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  recipeIconTxt:   { fontSize: 14, fontWeight: '700', color: WHITE },
  recipeName:      { fontSize: 13, fontWeight: '700', color: NAVY },
  recipeMeta:      { fontSize: 11, color: '#6B7280', marginTop: 2 },
  inPlansBadge:    { backgroundColor: 'rgba(201,162,39,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201,162,39,0.4)' },
  inPlansTxt:      { fontSize: 9, color: '#92600A', fontWeight: '700' },
  tag:             { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  btnGold:         { backgroundColor: GOLD, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 18, alignSelf: 'flex-start' },
  btnGoldTxt:      { fontSize: 13, fontWeight: '500', color: '#1A1A1A' },
  btnOutline:      { borderWidth: 1.5, borderColor: NAVY, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  btnOutlineTxt:   { fontSize: 13, fontWeight: '600', color: NAVY },
  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(46,84,128,0.12)' },
  addBtn:          { backgroundColor: GOLD, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  addBtnTxt:       { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  sheetOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  sheetTitle:      { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 20 },
  sheetOption:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(46,84,128,0.1)' },
  sheetOptionDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL, marginTop: 3 },
  sheetOptionLabel:{ fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 2 },
  sheetOptionSub:  { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  sheetCancel:     { marginTop: 20, alignItems: 'center' },
  sheetCancelTxt:  { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.12)' },
  modalTitle:      { fontSize: 16, fontWeight: '800', color: NAVY, flex: 1, marginRight: 12 },
  detailSec:       { fontSize: 12, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
});
