import React, { useState } from 'react';
import {
  Alert, ImageBackground, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, getSessionUser } from '../../lib/supabase';

const NAVY  = '#2E5480';
const GOLD  = '#C9A227';
const WHITE = '#FFFFFF';
const BORDER = 'rgba(46,84,128,0.2)';

export default function AddRecipeScreen() {
  const params = useLocalSearchParams<{ prefill?: string }>();

  const [name,        setName]        = useState('');
  const [cuisine,     setCuisine]     = useState('');
  const [serves,      setServes]      = useState('4');
  const [ingredients, setIngredients] = useState('');
  const [method,      setMethod]      = useState('');
  const [isVeg,       setIsVeg]       = useState(true);
  const [saving,      setSaving]      = useState(false);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Recipe name required'); return; }
    setSaving(true);
    try {
      const user = await getSessionUser();
      if (!user) { Alert.alert('Please sign in'); return; }

      const ings = ingredients.split('\n').filter(Boolean).map(line => {
        const parts = line.trim().split(/\s+/);
        return { quantity: parts[0] ?? '', unit: parts[1] ?? '', item: parts.slice(2).join(' ') || line.trim() };
      });
      const steps = method.split('\n').filter(Boolean);

      const { error } = await supabase.from('family_recipes').insert({
        user_id:     user.id,
        recipe_name: name.trim(),
        cuisine:     cuisine.trim() || 'Indian',
        serves:      parseInt(serves) || 4,
        prep_time:   '',
        cook_time:   '',
        ingredients: ings,
        method:      steps,
        notes:       '',
        is_veg:      isVeg,
        source:      'Manual',
      });
      if (error) throw error;
      router.back();
    } catch {
      Alert.alert('Save failed', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

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
          <Text style={s.headerTitle}>Add Recipe</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}>
            <Text style={s.homeBtnTxt}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* Back */}
        <View style={s.backRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnTxt}>Back</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.form}>

              <Text style={s.label}>Recipe Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Amma's Prawn Curry"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={s.label}>Cuisine</Text>
              <TextInput
                style={s.input}
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="e.g. Konkani"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={s.label}>Serves</Text>
              <TextInput
                style={[s.input, { width: 100 }]}
                value={serves}
                onChangeText={setServes}
                placeholder="4"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <Text style={s.label}>Ingredients (one per line)</Text>
              <TextInput
                style={[s.input, s.multiline]}
                value={ingredients}
                onChangeText={setIngredients}
                placeholder={'500g prawns\n2 onions chopped\n1 tsp turmeric'}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <Text style={s.label}>Method (one step per line)</Text>
              <TextInput
                style={[s.input, s.multiline]}
                value={method}
                onChangeText={setMethod}
                placeholder={'Marinate prawns for 20 minutes\nSaute onions until golden\nAdd masala and cook'}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <View style={s.toggleRow}>
                <Text style={s.label}>Vegetarian</Text>
                <Switch
                  value={isVeg}
                  onValueChange={setIsVeg}
                  thumbColor={isVeg ? GOLD : '#9CA3AF'}
                  trackColor={{ true: 'rgba(201,162,39,0.4)', false: 'rgba(156,163,175,0.3)' }}
                />
              </View>

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={s.saveBtnTxt}>{saving ? 'Saving...' : 'Save Recipe'}</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: WHITE, textAlign: 'center', flex: 1 },
  homeBtn:     { position: 'absolute', right: 16, top: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 12, justifyContent: 'center', height: '100%' },
  homeBtnTxt:  { fontSize: 13, fontWeight: '700', color: WHITE },
  backRow:     { paddingHorizontal: 16, paddingVertical: 8 },
  backBtn:     { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: NAVY, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16 },
  backBtnTxt:  { fontSize: 13, fontWeight: '600', color: NAVY },
  scroll:      { padding: 16, paddingBottom: 40 },
  form:        { backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 14, padding: 18 },
  label:       { fontSize: 12, fontWeight: '700', color: NAVY, marginBottom: 4, marginTop: 14 },
  input:       { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: NAVY },
  multiline:   { height: 120, textAlignVertical: 'top' },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  saveBtn:     { backgroundColor: GOLD, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnTxt:  { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
});
