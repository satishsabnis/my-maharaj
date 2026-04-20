import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, ImageBackground, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../../lib/supabase';
import { buttons } from '../../constants/theme';

const NAVY  = '#2E5480';
const GOLD  = '#C9A227';
const TEAL  = '#1A6B5C';
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
  const [cuisines,      setCuisines]      = useState<string[]>([]);
  const [activeCuisine, setActiveCuisine] = useState('');
  const [dishes,        setDishes]        = useState<Dish[]>([]);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [banned,        setBanned]        = useState<Set<string>>(new Set());
  const [activeTab,     setActiveTab]     = useState<'favourites' | 'banned'>('favourites');
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [profileId,     setProfileId]     = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const user = await getSessionUser();
        if (!user) return;
        setProfileId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('cuisine_preferences, cuisines')
          .eq('id', user.id)
          .single();

        const raw: string[] =
          profile?.cuisine_preferences ||
          profile?.cuisines ||
          [];

        let cuisineList = Array.isArray(raw) ? raw : [];
        if (cuisineList.length === 0) {
          const stored = await AsyncStorage.getItem('selected_cuisines');
          if (stored) {
            try { cuisineList = JSON.parse(stored); } catch {}
          }
        }
        if (cuisineList.length === 0) cuisineList = ['Indian'];

        setCuisines(cuisineList);
        setActiveCuisine(cuisineList[0] ?? '');

        const { data: selRows } = await supabase
          .from('family_regular_dishes')
          .select('dish_id')
          .eq('profile_id', user.id);
        setSelected(new Set<string>((selRows ?? []).map((r: any) => r.dish_id as string)));

        const { data: bannedRows } = await supabase
          .from('user_banned_dishes')
          .select('dish_id')
          .eq('profile_id', user.id);
        setBanned(new Set<string>((bannedRows ?? []).map((r: any) => r.dish_id as string)));
      } finally {
        setLoading(false);
      }
    })();
  }, []));

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
      next.delete(dishId);
      setSelected(next);
      await supabase.from('family_regular_dishes').delete().eq('profile_id', profileId).eq('dish_id', dishId);
    } else {
      next.add(dishId);
      setSelected(next);
      await supabase.from('family_regular_dishes').insert({ profile_id: profileId, dish_id: dishId });
    }
  }

  async function toggleBan(dishId: string) {
    if (!profileId) return;
    const next = new Set(banned);
    if (next.has(dishId)) {
      next.delete(dishId);
      setBanned(next);
      await supabase.from('user_banned_dishes').delete().eq('profile_id', profileId).eq('dish_id', dishId);
    } else {
      next.add(dishId);
      setBanned(next);
      await supabase.from('user_banned_dishes').insert({ profile_id: profileId, dish_id: dishId });
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

        {/* Favourites / Banned tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.mainTab, activeTab === 'favourites' && s.mainTabActive]}
            onPress={() => setActiveTab('favourites')}
            activeOpacity={0.8}
          >
            <Text style={[s.mainTabTxt, activeTab === 'favourites' && s.mainTabTxtActive]}>Favourites</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mainTab, activeTab === 'banned' && s.mainTabBanned]}
            onPress={() => setActiveTab('banned')}
            activeOpacity={0.8}
          >
            <Text style={[s.mainTabTxt, activeTab === 'banned' && s.mainTabTxtBanned]}>Banned</Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <View style={s.subtitleBox}>
          <Text style={s.subtitle}>
            {activeTab === 'favourites'
              ? 'Select dishes your family cooks regularly. Maharaj will use these 80% of the time.'
              : 'Mark dishes to never appear in your meal plans.'}
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
          contentContainerStyle={s.cuisineTabs}
        >
          {cuisines.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.cuisineTab, activeCuisine === c && s.cuisineTabActive]}
              onPress={() => setActiveCuisine(c)}
              activeOpacity={0.8}
            >
              <Text style={[s.cuisineTabTxt, activeCuisine === c && s.cuisineTabTxtActive]}>{c}</Text>
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
                const isFav     = selected.has(dish.id);
                const isBanned  = banned.has(dish.id);
                const isChecked = activeTab === 'favourites' ? isFav : isBanned;
                return (
                  <TouchableOpacity
                    key={dish.id}
                    style={[s.dishRow, activeTab === 'favourites' && isFav && s.dishRowSelected]}
                    onPress={() => activeTab === 'favourites' ? toggleDish(dish.id) : toggleBan(dish.id)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.dishName, activeTab === 'favourites' && isFav && s.dishNameSelected]}>{dish.name}</Text>
                      <Text style={s.dishSlot}>{slotLabel(dish.slot)}</Text>
                    </View>
                    <View style={[
                      s.checkbox,
                      activeTab === 'favourites' && isFav    && s.checkboxSelected,
                      activeTab === 'banned'     && isBanned && s.checkboxBanned,
                    ]}>
                      {isChecked && <Text style={s.checkmark}>✓</Text>}
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
          <View style={[s.pill, activeTab === 'banned' && s.pillBanned]}>
            <Text style={[s.pillTxt, activeTab === 'banned' && { color: WHITE }]}>
              {activeTab === 'favourites'
                ? `${selected.size} dishes selected`
                : `${banned.size} dishes banned`}
            </Text>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:             { backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 28 : Platform.OS === 'web' ? 12 : 6, paddingBottom: 12 },
  headerTitle:        { fontSize: 17, fontWeight: '700', color: WHITE, textAlign: 'center', flex: 1 },
  tabRow:             { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  mainTab:            { flex: 1, borderRadius: 20, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: 'rgba(46,84,128,0.2)' },
  mainTabActive:      { backgroundColor: NAVY, borderColor: NAVY },
  mainTabBanned:      { backgroundColor: NAVY, borderColor: NAVY },
  mainTabTxt:         { fontSize: 13, fontWeight: '600', color: NAVY },
  mainTabTxtActive:   { color: WHITE },
  mainTabTxtBanned:   { color: WHITE },
  subtitleBox:        { paddingHorizontal: 16, paddingBottom: 8 },
  subtitle:           { fontSize: 12, color: '#4B5563', lineHeight: 17 },
  searchBox:          { paddingHorizontal: 16, paddingBottom: 6 },
  searchInput:        { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(46,84,128,0.2)', paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: NAVY },
  cuisineTabs:        { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  cuisineTab:         { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(46,84,128,0.2)' },
  cuisineTabActive:   { backgroundColor: NAVY },
  cuisineTabTxt:      { fontSize: 12, fontWeight: '600', color: NAVY },
  cuisineTabTxtActive:{ color: WHITE },
  scroll:             { paddingHorizontal: 16, paddingTop: 4 },
  emptyCard:          { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 16 },
  emptyTxt:           { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  dishRow:            { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  dishRowSelected:    { backgroundColor: '#D4EDE5' },
  dishName:           { fontSize: 13, fontWeight: '600', color: NAVY },
  dishNameSelected:   { color: '#1A6B5C' },
  dishSlot:           { fontSize: 11, color: '#6B7280', marginTop: 1 },
  checkbox:           { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(46,84,128,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected:   { backgroundColor: NAVY, borderColor: NAVY },
  checkboxBanned:     { backgroundColor: NAVY, borderColor: NAVY },
  checkmark:          { fontSize: 13, color: WHITE, fontWeight: '700' },
  footerPill:         { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' },
  pill:               { backgroundColor: GOLD, borderRadius: 24, paddingVertical: 8, paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  pillBanned:         { backgroundColor: TEAL },
  pillTxt:            { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
});
