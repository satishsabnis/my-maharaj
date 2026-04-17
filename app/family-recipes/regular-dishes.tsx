import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, ImageBackground, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../../lib/supabase';

const NAVY  = '#2E5480';
const GOLD  = '#C9A227';
const TEAL  = '#1A6B5C';
const MINT  = '#D4EDE5';
const WHITE = '#FFFFFF';

interface Dish {
  id: string;
  name: string;
  slot: string[];
  cuisine: string[];
  is_veg: boolean;
}

const SLOT_LABEL: Record<string, string> = {
  breakfast:    'Breakfast',
  lunch_curry:  'Lunch',
  dinner_curry: 'Dinner',
  veg_side:     'Side',
  rice:         'Rice',
  bread:        'Bread',
  raita:        'Raita',
  snack:        'Snack',
};

function slotLabel(slots: string[]): string {
  if (!slots || slots.length === 0) return '';
  return SLOT_LABEL[slots[0]] ?? slots[0];
}

export default function RegularDishesScreen() {
  const [cuisines,    setCuisines]    = useState<string[]>([]);
  const [activeCuisine, setActiveCuisine] = useState('');
  const [dishes,      setDishes]      = useState<Dish[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [profileId,   setProfileId]   = useState<string | null>(null);

  // Load user, cuisines and existing selections
  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const user = await getSessionUser();
        if (!user) return;
        setProfileId(user.id);

        // Load cuisine preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('cuisine_preferences, cuisines')
          .eq('id', user.id)
          .single();

        const raw: string[] =
          profile?.cuisine_preferences ||
          profile?.cuisines ||
          [];

        // Also try AsyncStorage fallback
        let cuisineList = Array.isArray(raw) ? raw : [];
        if (cuisineList.length === 0) {
          const stored = await AsyncStorage.getItem('selected_cuisines');
          if (stored) {
            try { cuisineList = JSON.parse(stored); } catch {}
          }
        }
        // Final fallback
        if (cuisineList.length === 0) cuisineList = ['Indian'];

        setCuisines(cuisineList);
        setActiveCuisine(cuisineList[0] ?? '');

        // Load existing selections
        const { data: selRows } = await supabase
          .from('family_regular_dishes')
          .select('dish_id')
          .eq('profile_id', user.id);
        const ids = new Set<string>((selRows ?? []).map((r: any) => r.dish_id as string));
        setSelected(ids);
      } finally {
        setLoading(false);
      }
    })();
  }, []));

  // Load dishes when active cuisine changes
  useEffect(() => {
    if (!activeCuisine) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('dishes')
          .select('id, name, slot, cuisine, is_veg')
          .contains('cuisine', [activeCuisine])
          .eq('is_banned', false)
          .order('name');
        setDishes((data ?? []) as Dish[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCuisine]);

  async function toggleDish(dishId: string) {
    if (!profileId) return;
    const next = new Set(selected);
    if (next.has(dishId)) {
      // Deselect
      next.delete(dishId);
      setSelected(next);
      await supabase
        .from('family_regular_dishes')
        .delete()
        .eq('profile_id', profileId)
        .eq('dish_id', dishId);
    } else {
      // Select
      next.add(dishId);
      setSelected(next);
      await supabase
        .from('family_regular_dishes')
        .insert({ profile_id: profileId, dish_id: dishId });
    }
  }

  const filteredDishes = dishes.filter(d =>
    search.trim() === '' || d.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <Text style={s.headerTitle}>Our Regular Dishes</Text>
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

        {/* Subtitle */}
        <View style={s.subtitleBox}>
          <Text style={s.subtitle}>
            Select dishes your family cooks regularly. Maharaj will use these 80% of the time.
          </Text>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search dishes..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Cuisine tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
        >
          {cuisines.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.tab, activeCuisine === c && s.tabActive]}
              onPress={() => setActiveCuisine(c)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, activeCuisine === c && s.tabTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dish list */}
        {loading ? (
          <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {filteredDishes.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyTxt}>No dishes found for {activeCuisine}.</Text>
              </View>
            ) : (
              filteredDishes.map(dish => {
                const isSelected = selected.has(dish.id);
                return (
                  <TouchableOpacity
                    key={dish.id}
                    style={s.dishRow}
                    onPress={() => toggleDish(dish.id)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.dishName}>{dish.name}</Text>
                      <Text style={s.dishSlot}>{slotLabel(dish.slot)}</Text>
                    </View>
                    <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                      {isSelected && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Footer pill */}
        <View style={s.footerPill} pointerEvents="none">
          <View style={s.pill}>
            <Text style={s.pillTxt}>{selected.size} dishes selected</Text>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:          { backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 12 },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: WHITE, textAlign: 'center', flex: 1 },
  homeBtn:         { position: 'absolute', right: 16, top: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 12, justifyContent: 'center', height: '100%' },
  homeBtnTxt:      { fontSize: 13, fontWeight: '700', color: WHITE },
  backRow:         { paddingHorizontal: 16, paddingVertical: 8 },
  backBtn:         { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: NAVY, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16 },
  backBtnTxt:      { fontSize: 13, fontWeight: '600', color: NAVY },
  subtitleBox:     { paddingHorizontal: 16, paddingBottom: 8 },
  subtitle:        { fontSize: 12, color: '#4B5563', lineHeight: 17 },
  searchBox:       { paddingHorizontal: 16, paddingBottom: 6 },
  searchInput:     { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(46,84,128,0.2)', paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: NAVY },
  tabs:            { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  tab:             { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(46,84,128,0.2)' },
  tabActive:       { backgroundColor: NAVY },
  tabTxt:          { fontSize: 12, fontWeight: '600', color: NAVY },
  tabTxtActive:    { color: WHITE },
  scroll:          { paddingHorizontal: 16, paddingTop: 4 },
  emptyCard:       { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 16 },
  emptyTxt:        { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  dishRow:         { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  dishName:        { fontSize: 13, fontWeight: '600', color: NAVY },
  dishSlot:        { fontSize: 11, color: '#6B7280', marginTop: 1 },
  checkbox:        { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(46,84,128,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected:{ backgroundColor: NAVY, borderColor: NAVY },
  checkmark:       { fontSize: 13, color: WHITE, fontWeight: '700' },
  footerPill:      { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' },
  pill:            { backgroundColor: GOLD, borderRadius: 24, paddingVertical: 8, paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  pillTxt:         { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
});
