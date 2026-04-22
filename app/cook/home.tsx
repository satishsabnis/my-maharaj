/**
 * Cook Home Screen — /cook/home
 * 2-column family grid. Shows today's meals translated to cook's language.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Logo from '../../components/Logo';

const NAVY  = '#1B3A5C';
const GOLD  = '#C9A227';
const TEAL  = '#1A6B5C';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(27,58,92,0.5)';

type Meal = { breakfast: string; lunch: string; dinner: string };
type FamilyCard = {
  id: string;
  familyName: string;
  location: string;
  visitTime: string;
  memberCount: number;
  language: string;
  confirmed: boolean;
  meals: Meal;
  translatedMeals?: Meal;
};

function getLocal(key: string): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
}

function logout() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem('cook_phone');
    window.localStorage.removeItem('cook_name');
    window.localStorage.removeItem('cook_lang');
  }
  router.replace('/cook' as never);
}

async function translateMeal(meal: Meal, lang: string): Promise<Meal> {
  if (!lang || lang === 'en-IN') return meal;
  async function tr(text: string): Promise<string> {
    if (!text) return text;
    try {
      const res = await fetch('/api/sarvam-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: lang }),
      });
      const d = await res.json();
      return d.translatedText || text;
    } catch { return text; }
  }
  const [breakfast, lunch, dinner] = await Promise.all([tr(meal.breakfast), tr(meal.lunch), tr(meal.dinner)]);
  return { breakfast, lunch, dinner };
}

export default function CookHomeScreen() {
  const [families,    setFamilies]    = useState<FamilyCard[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState('');

  const cookPhone = getLocal('cook_phone');
  const cookName  = getLocal('cook_name') || cookPhone;
  const cookLang  = getLocal('cook_lang') || 'hi-IN';
  const initials  = cookName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'MK';

  const today     = new Date();
  const dateStr   = today.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const load = useCallback(async () => {
    setError('');
    try {
      console.log('[CookHome] fetching families for cook_phone:', cookPhone);
      const res = await fetch(`/api/cook-families?phone=${encodeURIComponent(cookPhone)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load families');
      const cards: FamilyCard[] = data.families || [];
      console.log('[CookHome] families returned:', JSON.stringify(cards.map(c => ({ id: c.id, familyName: c.familyName, confirmed: c.confirmed }))));
      // Translate meals for each confirmed family
      const translated = await Promise.all(
        cards.map(async (f) => {
          if (!f.confirmed) return f;
          const translatedMeals = await translateMeal(f.meals, cookLang);
          return { ...f, translatedMeals };
        })
      );
      setFamilies(translated);
    } catch (e: any) {
      setError(e.message || 'Could not load families.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cookPhone, cookLang]);

  useEffect(() => {
    if (!cookPhone) { router.replace('/cook' as never); return; }
    void load();
  }, []);

  function onRefresh() { setRefreshing(true); void load(); }

  function renderCard({ item, index }: { item: FamilyCard; index: number }) {
    const meals     = item.translatedMeals || item.meals;
    const isFirst   = index === 0;
    const borderClr = !item.confirmed ? '#B0BEC5' : isFirst ? GOLD : TEAL;
    const opacity   = item.confirmed ? 1 : 0.55;

    return (
      <TouchableOpacity
        style={[s.card, { borderTopColor: borderClr, opacity }]}
        onPress={() => router.push(`/cook/family/${item.id}` as never)}
        activeOpacity={0.8}
      >
        {/* Visit time badge */}
        <View style={[s.timeBadge, { backgroundColor: isFirst ? GOLD : TEAL }]}>
          <Text style={s.timeTxt}>{item.visitTime || '—'}</Text>
        </View>

        <Text style={s.cardName} numberOfLines={1}>{item.familyName}</Text>
        <Text style={s.cardLoc}  numberOfLines={1}>{item.location}</Text>

        {!item.confirmed && (
          <Text style={s.unconfirmed}>Plan not confirmed</Text>
        )}

        {/* Footer badges */}
        <View style={s.cardFooter}>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{item.memberCount} members</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          {/* Cook avatar */}
          <TouchableOpacity style={s.avatar} onPress={logout}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </TouchableOpacity>

          {/* Logo centre */}
          <Logo size="small" />

          {/* BFC logo placeholder — right slot */}
          <View style={{ width: 40 }} />
        </View>

        <View style={s.greetRow}>
          <Text style={s.greet}>नमस्ते, {cookName}</Text>
          <Text style={s.dateTxt}>{dateStr} · {families.length} families</Text>
        </View>

        {loading && !refreshing ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={NAVY} size="large" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: '#DC2626', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); void load(); }}>
              <Text style={{ color: WHITE, fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={families}
            keyExtractor={i => i.id}
            numColumns={2}
            renderItem={renderCard}
            contentContainerStyle={s.grid}
            columnWrapperStyle={{ gap: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: MUTED, marginTop: 48 }}>No families scheduled for today.</Text>
            }
          />
        )}

        <Text style={s.footer}>Powered by SarvamAI · My Maharaj</Text>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  avatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: WHITE, fontWeight: '700', fontSize: 14 },
  greetRow:  { paddingHorizontal: 16, paddingBottom: 12 },
  greet:     { fontSize: 18, fontWeight: '700', color: NAVY },
  dateTxt:   { fontSize: 12, color: MUTED, marginTop: 2 },
  grid:      { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 4 },
  card: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 12, padding: 12, marginBottom: 12,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  timeBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  timeTxt:   { fontSize: 11, fontWeight: '700', color: WHITE },
  cardName:  { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 2 },
  cardLoc:   { fontSize: 11, color: MUTED, marginBottom: 8 },
  mealList:  { marginBottom: 8 },
  mealRow:   { fontSize: 11, color: NAVY, marginBottom: 3, lineHeight: 16 },
  unconfirmed: { fontSize: 11, color: '#B0BEC5', fontStyle: 'italic', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge:     { backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:  { fontSize: 10, color: NAVY, fontWeight: '500' },
  retryBtn:  { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  footer:    { textAlign: 'center', fontSize: 11, color: MUTED, paddingBottom: 12, paddingTop: 4 },
});
