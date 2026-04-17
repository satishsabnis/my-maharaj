import React, { useCallback, useState } from 'react';
import {
  ImageBackground, SafeAreaView, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { buttons } from '../constants/theme';

const NAVY  = '#2E5480';
const GOLD  = '#C9A227';
const TEAL  = '#1A6B5C';
const MINT  = '#D4EDE5';
const WHITE = '#FFFFFF';

export default function FamilyRecipesScreen() {
  const [recipeCount,  setRecipeCount]  = useState(0);
  const [regularCount, setRegularCount] = useState(0);

  useFocusEffect(useCallback(() => {
    (async () => {
      const user = await getSessionUser();
      if (!user) return;

      const [{ count: rc }, { count: rd }] = await Promise.all([
        supabase.from('family_recipes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('family_regular_dishes').select('dish_id', { count: 'exact', head: true }).eq('profile_id', user.id),
      ]);
      setRecipeCount(rc ?? 0);
      setRegularCount(rd ?? 0);
    })();
  }, []));

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Family Recipes</Text>
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

          {/* Our Recipes card */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Our Recipes</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>{recipeCount}</Text></View>
            </View>
            <Text style={s.cardSub}>
              Your family's own recipes. Upload or scan to add them to Maharaj's plans.
            </Text>
            <View style={s.cardBtns}>
              <TouchableOpacity
                style={s.btnGold}
                onPress={() => router.push('/family-recipes/our-recipes' as never)}
                activeOpacity={0.85}
              >
                <Text style={s.btnGoldTxt}>Add recipe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btnNavyOutline}
                onPress={() => router.push('/family-recipes/our-recipes' as never)}
                activeOpacity={0.85}
              >
                <Text style={s.btnNavyOutlineTxt}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Our Regular Dishes card */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Our Regular Dishes</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>{regularCount}</Text></View>
            </View>
            <Text style={s.cardSub}>
              Tell Maharaj what your family cooks regularly. He will use these 80% of the time.
            </Text>
            <View style={s.cardBtns}>
              <TouchableOpacity
                style={s.btnGold}
                onPress={() => router.push('/family-recipes/regular-dishes' as never)}
                activeOpacity={0.85}
              >
                <Text style={s.btnGoldTxt}>Manage dishes</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: WHITE, textAlign: 'center', flex: 1 },
  scroll:     { padding: 16, paddingBottom: 40 },
  card:       { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: NAVY },
  badge:      { backgroundColor: NAVY, borderRadius: 20, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt:   { fontSize: 11, fontWeight: '700', color: WHITE },
  cardSub:    { fontSize: 13, color: '#4B5563', lineHeight: 19, marginBottom: 14 },
  cardBtns:   { flexDirection: 'row', gap: 10 },
  btnGold:    { backgroundColor: GOLD, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 20 },
  btnGoldTxt: { fontSize: 13, fontWeight: '500', color: '#1A1A1A' },
  btnNavyOutline: { borderWidth: 1.5, borderColor: NAVY, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18 },
  btnNavyOutlineTxt: { fontSize: 13, fontWeight: '500', color: NAVY },
});
