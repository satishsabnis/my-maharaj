import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Modal, Platform,
  ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { supabase, getSessionUser } from '../lib/supabase';
import { ZONE_CUISINE_MAP } from '../lib/ai';

// ── Types ────────────────────────────────────────────────────────────────────

interface DishItem { dishName: string; isVeg: boolean; note?: string }

interface PartyMenuResult {
  occasion: string;
  summary: string;
  starters: DishItem[];
  mainRiceBread: DishItem[];
  mainCurries: DishItem[];
  mainAccompaniments: DishItem[];
  desserts: DishItem[];
}

type SectionField = 'starters' | 'mainRiceBread' | 'mainCurries' | 'mainAccompaniments' | 'desserts';

// ── API ──────────────────────────────────────────────────────────────────────

async function callClaude(system: string, user: string): Promise<string> {
  const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET } as Record<string, string>,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return (data?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}

// ── Constants ────────────────────────────────────────────────────────────────

const STYLES = [
  'Sit-down dinner', 'Buffet', 'Cocktail and snacks', 'High tea',
  'Thali-style', 'Plated', 'Street food party', 'Family-style',
];

const SECTION_TO_SLOTS: Record<string, string[]> = {
  starters:       ['snack', 'starter'],
  riceAndBread:   ['rice', 'bread'],
  curries:        ['lunch_curry', 'dinner_curry'],
  accompaniments: ['veg_side', 'raita'],
  desserts:       ['dessert', 'sweet'],
};

const SECTION_RESULT_KEY: Record<string, SectionField> = {
  starters:       'starters',
  riceAndBread:   'mainRiceBread',
  curries:        'mainCurries',
  accompaniments: 'mainAccompaniments',
  desserts:       'desserts',
};

const SECTION_DISPLAY: Record<string, string> = {
  starters:       'STARTERS',
  riceAndBread:   'RICE & BREAD',
  curries:        'CURRIES',
  accompaniments: 'ACCOMPANIMENTS',
  desserts:       'DESSERTS',
};

// ── Zone helper (verbatim from review-plan.tsx) ───────────────────────────────

function getZoneForUser(cuisines: string[]): string[] {
  const lower = cuisines.map(c => c.toLowerCase());
  const union = new Set<string>();
  for (const members of Object.values(ZONE_CUISINE_MAP)) {
    if (lower.some(c => members.map(m => m.toLowerCase()).includes(c))) {
      members.forEach(m => union.add(m));
    }
  }
  return union.size > 0 ? [...union] : ZONE_CUISINE_MAP['West'];
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function PartyMenuScreen() {
  const [phase, setPhase] = useState<'input' | 'output'>('input');

  // Form fields
  const [occasion, setOccasion] = useState('');
  const [date, setDate] = useState('');
  const [dateError, setDateError] = useState(false);
  const [adults, setAdults] = useState('');
  const [kids, setKids] = useState('');
  const [style, setStyle] = useState(STYLES[0]);
  const [foodPref, setFoodPref] = useState<'veg' | 'nonveg'>('veg');
  const [starterCount, setStarterCount] = useState(3);
  const [mainVegCount, setMainVegCount] = useState(4);
  const [mainNonVegCount, setMainNonVegCount] = useState(2);
  const [mainVegCountNV, setMainVegCountNV] = useState(2);
  const [sideCount, setSideCount] = useState(3);
  const [dessertCount, setDessertCount] = useState(2);
  const [guestNotes, setGuestNotes] = useState('');
  const [specific, setSpecific] = useState('');

  // User / cuisine
  const [userCuisines, setUserCuisines] = useState<string[]>([]);

  // Output
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<PartyMenuResult | null>(null);

  // Swap sheet
  type SwapDish = { name: string; description: string; isVeg: boolean };
  type SwapState = { visible: boolean; dishName: string; sectionKey: string } | null;
  const [swapSheet, setSwapSheet]           = useState<SwapState>(null);
  const [swapCuisineSugg, setSwapCuisineSugg] = useState<SwapDish[]>([]);
  const [swapZoneSugg, setSwapZoneSugg]       = useState<SwapDish[]>([]);
  const [swapAllSugg, setSwapAllSugg]         = useState<SwapDish[]>([]);
  const [swapExpanded, setSwapExpanded]       = useState(false);

  // Pulsing logo animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Load cuisines at mount ──────────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const user = await getSessionUser();
        if (!user) return;
        const { data } = await supabase
          .from('cuisine_preferences')
          .select('cuisine_name')
          .eq('user_id', user.id)
          .eq('is_excluded', false);
        setUserCuisines((data ?? []).map((r: any) => r.cuisine_name as string).filter(Boolean));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading]);

  useFocusEffect(useCallback(() => {
    setPhase('input'); setMenu(null); setOccasion(''); setDate('');
    setDateError(false);
    setAdults(''); setKids(''); setStyle(STYLES[0]);
    setFoodPref('veg');
    setStarterCount(3); setMainVegCount(4); setMainNonVegCount(2);
    setMainVegCountNV(2); setSideCount(3); setDessertCount(2);
    setGuestNotes(''); setSpecific(''); setError(''); setLoading(false);
    setSwapSheet(null); setSwapCuisineSugg([]); setSwapZoneSugg([]);
    setSwapAllSugg([]); setSwapExpanded(false);
  }, []));

  function handleDateChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4);
    else if (digits.length > 2) masked = digits.slice(0, 2) + '-' + digits.slice(2);
    setDate(masked);
    setDateError(false);
  }

  function validateDate() {
    if (!date || date.length < 10) { setDateError(false); return; }
    const parts = date.split('-');
    if (parts.length !== 3) { setDateError(true); return; }
    const dd = parseInt(parts[0], 10), mm = parseInt(parts[1], 10), yyyy = parseInt(parts[2], 10);
    const entered = new Date(yyyy, mm - 1, dd);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setDateError(entered < today);
  }

  async function generate() {
    if (!occasion.trim()) { setError('Please describe the occasion.'); return; }
    if (dateError) { setError('Please enter a valid future date.'); return; }
    setError(''); setLoading(true); setMenu(null);

    const guestLine = (adults || '0') + ' adults' + (kids && kids !== '0' ? ', ' + kids + ' kids' : '');
    const curryCountDesc = foodPref === 'nonveg'
      ? `${mainNonVegCount} non-veg + ${mainVegCountNV} veg curries`
      : `${mainVegCount} veg curries`;
    const totalCurries = foodPref === 'nonveg' ? mainNonVegCount + mainVegCountNV : mainVegCount;
    const contextLine = [
      occasion,
      date ? 'on ' + date : '',
      guestLine,
      'Style: ' + style,
      'Food preference: ' + (foodPref === 'veg' ? 'Vegetarian only' : 'Vegetarian and Non-vegetarian'),
      guestNotes ? 'Notes: ' + guestNotes : '',
      specific ? 'Special requests: ' + specific : '',
    ].filter(Boolean).join('. ');

    const systemPrompt =
      'You are Maharaj, an expert Indian party menu planner. ' +
      'Return ONLY a valid JSON object — no preamble, no explanation, no markdown fences. ' +
      'Context: ' + contextLine + '. ' +
      'JSON shape: {"occasion":"","summary":"","starters":[{"dishName":"","isVeg":true,"note":""}],' +
      '"mainRiceBread":[{"dishName":"","isVeg":true,"note":""}],' +
      '"mainCurries":[{"dishName":"","isVeg":true,"note":""}],' +
      '"mainAccompaniments":[{"dishName":"","isVeg":true,"note":""}],' +
      '"desserts":[{"dishName":"","isVeg":true,"note":""}]}. ' +
      `starters ${starterCount} items. mainRiceBread 2-3 items. mainCurries ${totalCurries} items (${curryCountDesc}). mainAccompaniments ${sideCount} items. desserts ${dessertCount} items. ` +
      'All dish names must be authentic Indian dishes. Return ONLY the JSON object, nothing else.';

    function tryParse(raw: string): PartyMenuResult | null {
      try {
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const match = cleaned.match(/{[\s\S]*}/);
        const parsed = JSON.parse(match ? match[0] : cleaned) as PartyMenuResult;
        if (!parsed.starters || !parsed.mainCurries || !parsed.desserts) return null;
        return parsed;
      } catch { return null; }
    }

    try {
      const raw = await callClaude(systemPrompt, 'Generate the party menu now.');
      const parsed = tryParse(raw);
      if (parsed) {
        setMenu(parsed);
        setPhase('output');
      } else {
        const retryRaw = await callClaude(
          'Return ONLY valid JSON matching this exact schema. No other text.',
          'Schema: {"occasion":"string","summary":"string","starters":[{"dishName":"string","isVeg":true,"note":"string"}],"mainRiceBread":[{"dishName":"string","isVeg":true,"note":"string"}],"mainCurries":[{"dishName":"string","isVeg":true,"note":"string"}],"mainAccompaniments":[{"dishName":"string","isVeg":true,"note":"string"}],"desserts":[{"dishName":"string","isVeg":true,"note":"string"}]}. Generate for: ' + contextLine
        );
        const retryParsed = tryParse(retryRaw);
        if (retryParsed) {
          setMenu(retryParsed);
          setPhase('output');
        } else {
          Alert.alert('Maharaj had trouble planning', 'Please try again.');
          setPhase('input');
        }
      }
    } catch (err) {
      console.error('[PartyMenu]', err);
      setError('Failed to generate. Please try again.');
    } finally { setLoading(false); }
  }

  async function downloadMenu() {
    if (!menu) return;
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const user = await getSessionUser();
      let familyName = 'My Family';
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_name')
          .eq('id', user.id)
          .single();
        if (profile?.family_name) familyName = profile.family_name;
      }

      const mapSection = (items: DishItem[]) =>
        items.map(d => ({ name: d.dishName, note: d.note ?? '', isVeg: d.isVeg }));

      const payload = {
        type: 'party',
        familyName,
        date,
        occasion: menu.occasion || occasion,
        content: {
          starters:       mapSection(menu.starters ?? []),
          riceAndBread:   mapSection(menu.mainRiceBread ?? []),
          curries:        mapSection(menu.mainCurries ?? []),
          accompaniments: mapSection(menu.mainAccompaniments ?? []),
          desserts:       mapSection(menu.desserts ?? []),
        },
      };

      const resp = await fetch('https://my-maharaj.vercel.app/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET,
        } as Record<string, string>,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) { Alert.alert('Could not generate PDF', 'Please try again.'); return; }

      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const dateStr = date ? date.split('-').join('') : 'menu';
      const a = document.createElement('a');
      a.href = url;
      a.download = `maharaj-party-menu-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PartyMenu] downloadMenu error:', err);
      Alert.alert('Could not download PDF', 'Please try again.');
    }
  }

  // ── Swap ──────────────────────────────────────────────────────────────────

  async function openSwapSheet(dishName: string, sectionKey: string) {
    if (!menu) return;
    const slots = SECTION_TO_SLOTS[sectionKey] ?? [];
    const zoneCuisines = getZoneForUser(userCuisines);
    const allCuisines  = [...new Set([...userCuisines, ...zoneCuisines])];

    const usedDishes = [
      ...menu.starters, ...menu.mainRiceBread, ...menu.mainCurries,
      ...menu.mainAccompaniments, ...menu.desserts,
    ].map(d => d.dishName).filter(Boolean);

    try {
      let q = supabase
        .from('dishes')
        .select('name, description, is_veg, cuisine')
        .eq('is_banned', false)
        .filter('slot', 'ov', `{${slots.join(',')}}`);
      if (foodPref === 'veg') q = q.eq('is_veg', true);
      if (usedDishes.length > 0) {
        q = q.not('name', 'in', `(${usedDishes.map(n => `"${n}"`).join(',')})`);
      }
      const { data: poolData } = await q.limit(50);

      const pool = (poolData ?? []) as { name: string; description: string; is_veg: boolean; cuisine: string[] }[];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const cuisineSugg: SwapDish[] = [];
      const zoneSugg:    SwapDish[] = [];
      const allSugg:     SwapDish[] = [];

      for (const dish of pool) {
        if (allSugg.length >= 20) break;
        const dc = Array.isArray(dish.cuisine) ? dish.cuisine : [];
        const isUserCuisineMatch = userCuisines.length === 0 || dc.some(c => userCuisines.includes(c));
        const item: SwapDish = { name: dish.name, description: dish.description ?? '', isVeg: dish.is_veg };
        if (isUserCuisineMatch && cuisineSugg.length < 2) cuisineSugg.push(item);
        else if (!isUserCuisineMatch && zoneSugg.length < 2) zoneSugg.push(item);
        allSugg.push(item);
      }

      setSwapCuisineSugg(cuisineSugg);
      setSwapZoneSugg(zoneSugg);
      setSwapAllSugg(allSugg);
    } catch {
      setSwapCuisineSugg([]); setSwapZoneSugg([]); setSwapAllSugg([]);
    }

    setSwapExpanded(false);
    setSwapSheet({ visible: true, dishName, sectionKey });
  }

  function applySwap(newDish: SwapDish) {
    if (!swapSheet || !menu) return;
    const resultKey = SECTION_RESULT_KEY[swapSheet.sectionKey];
    if (!resultKey) return;
    setMenu(prev => {
      if (!prev) return prev;
      const section = prev[resultKey] as DishItem[];
      return {
        ...prev,
        [resultKey]: section.map(d =>
          d.dishName === swapSheet.dishName
            ? { dishName: newDish.name, note: newDish.description || undefined, isVeg: newDish.isVeg }
            : d
        ),
      };
    });
    setSwapSheet(null);
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  function DishRow({ item, sectionKey }: { item: DishItem; sectionKey: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 }}>
        <View style={{
          width: 6, height: 6, borderRadius: 3, marginTop: 4, marginRight: 6,
          backgroundColor: item.isVeg ? colors.emerald : colors.danger,
        }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.navy }}>{item.dishName}</Text>
          {item.note ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{item.note}</Text> : null}
        </View>
        <TouchableOpacity
          style={s.swapBtn}
          onPress={() => openSwapSheet(item.dishName, sectionKey)}
          activeOpacity={0.8}
        >
          <Text style={s.swapBtnTxt}>Swap ›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function MenuSection({ title, items, sectionKey }: { title: string; items?: DishItem[]; sectionKey: string }) {
    if (!items?.length) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.card}>
          {items.map((it, i) => <DishRow key={i} item={it} sectionKey={sectionKey} />)}
        </View>
      </View>
    );
  }

  function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <View style={s.stepperRow}>
        <Text style={s.stepperLabel}>{label}</Text>
        <View style={s.stepperControls}>
          <TouchableOpacity style={s.stepperBtn} onPress={() => onChange(Math.max(1, value - 1))}>
            <Text style={s.stepperBtnTxt}>-</Text>
          </TouchableOpacity>
          <Text style={s.stepperVal}>{value}</Text>
          <TouchableOpacity style={s.stepperBtn} onPress={() => onChange(Math.min(8, value + 1))}>
            <Text style={s.stepperBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper title="Party Menu" onBack={() => phase === 'output' ? setPhase('input') : router.back()}>

      {/* Loading overlay */}
      {loading && (
        <View style={s.loadingOverlay}>
          <Animated.Image
            source={require('../assets/logo.png')}
            style={{ width: 140, height: 140, transform: [{ scale: pulseAnim }] }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 17, color: colors.textSecondary, marginTop: 10 }}>
            Maharaj is planning your menu...
          </Text>
        </View>
      )}

      {!loading && phase === 'input' && (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Tip card */}
          <View style={s.tipCard}>
            <Text style={s.tipText}>
              Tell me about the occasion and your guests. I will plan a complete menu — starters, mains,
              desserts — scaled for your party and respectful of every guest's dietary needs.
            </Text>
          </View>

          {/* Occasion */}
          <Text style={s.label}>Occasion</Text>
          <TextInput style={s.input} value={occasion} onChangeText={setOccasion}
            placeholder="e.g. Birthday, Anniversary, Housewarming"
            placeholderTextColor={colors.textHint} />

          {/* Date */}
          <Text style={s.label}>Date (DD-MM-YYYY)</Text>
          <TextInput
            style={[s.input, dateError && { borderColor: colors.danger }]}
            value={date}
            onChangeText={handleDateChange}
            onBlur={validateDate}
            placeholder="DD-MM-YYYY"
            placeholderTextColor={colors.textHint}
            keyboardType="numeric"
            maxLength={10}
          />
          {dateError && <Text style={s.dateErrorTxt}>Date must be today or in the future</Text>}

          {/* Adults + Kids */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Adults</Text>
              <TextInput style={s.input} value={adults} onChangeText={setAdults}
                keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textHint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Kids</Text>
              <TextInput style={s.input} value={kids} onChangeText={setKids}
                keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textHint} />
            </View>
          </View>

          {/* Style grid */}
          <Text style={s.label}>Style</Text>
          <View style={s.styleGrid}>
            {STYLES.map(st => (
              <TouchableOpacity
                key={st}
                style={[s.styleChip, style === st && s.styleChipActive]}
                onPress={() => setStyle(st)}
              >
                <Text style={[s.styleChipTxt, style === st && s.styleChipTxtActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Veg / Non-veg toggle */}
          <Text style={s.label}>Food preference</Text>
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleBtn, foodPref === 'veg' && s.toggleBtnActive]}
              onPress={() => setFoodPref('veg')}
            >
              <Text style={[s.toggleTxt, foodPref === 'veg' && s.toggleTxtActive]}>Veg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, foodPref === 'nonveg' && s.toggleBtnActive]}
              onPress={() => setFoodPref('nonveg')}
            >
              <Text style={[s.toggleTxt, foodPref === 'nonveg' && s.toggleTxtActive]}>Non-veg</Text>
            </TouchableOpacity>
          </View>

          {/* Dish count steppers */}
          <Text style={s.label}>Dish counts</Text>
          <View style={s.card}>
            <Stepper label="Starters" value={starterCount} onChange={setStarterCount} />
            {foodPref === 'veg'
              ? <Stepper label="Mains" value={mainVegCount} onChange={setMainVegCount} />
              : <>
                  <Stepper label="Non-veg mains" value={mainNonVegCount} onChange={setMainNonVegCount} />
                  <Stepper label="Veg mains" value={mainVegCountNV} onChange={setMainVegCountNV} />
                </>
            }
            <Stepper label="Sides" value={sideCount} onChange={setSideCount} />
            <Stepper label="Desserts" value={dessertCount} onChange={setDessertCount} />
          </View>

          {/* Guest dietary notes */}
          <Text style={s.label}>Guest dietary notes</Text>
          <TextInput style={[s.input, { minHeight: 50, textAlignVertical: 'top' }]} value={guestNotes}
            onChangeText={setGuestNotes} multiline placeholder="e.g. 2 guests Jain, 1 gluten-free"
            placeholderTextColor={colors.textHint} />

          {/* Anything specific */}
          <Text style={s.label}>Anything specific</Text>
          <TextInput style={[s.input, { minHeight: 50, textAlignVertical: 'top' }]} value={specific}
            onChangeText={setSpecific} multiline placeholder="e.g. Must have pani puri counter"
            placeholderTextColor={colors.textHint} />

          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* Generate button */}
          <TouchableOpacity
            style={[s.generateBtn, (!occasion.trim() || dateError) && { opacity: 0.5 }]}
            onPress={generate}
            disabled={!occasion.trim() || dateError || loading}
          >
            <Text style={s.generateBtnTxt}>Ask Maharaj to Plan</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {!loading && phase === 'output' && menu && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Gold context banner */}
          <View style={s.goldBanner}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>
              {menu.occasion || occasion}
            </Text>
            {date ? <Text style={{ fontSize: 13, color: colors.textSecondary }}>{date}</Text> : null}
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {adults || '0'} adults, {kids || '0'} kids  --  {style}
            </Text>
            {menu.summary ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 5, lineHeight: 18 }}>
                {menu.summary}
              </Text>
            ) : null}
          </View>

          {/* Sections */}
          <MenuSection title="STARTERS"       items={menu.starters}         sectionKey="starters" />
          <MenuSection title="RICE & BREAD"   items={menu.mainRiceBread}    sectionKey="riceAndBread" />
          <MenuSection title="CURRIES"        items={menu.mainCurries}      sectionKey="curries" />
          <MenuSection title="ACCOMPANIMENTS" items={menu.mainAccompaniments} sectionKey="accompaniments" />
          <MenuSection title="DESSERTS"       items={menu.desserts}         sectionKey="desserts" />

          {/* Bottom buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={s.downloadBtn} onPress={downloadMenu}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.white }}>Download Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.regenerateBtn} onPress={() => {
              setPhase('input'); setMenu(null); setOccasion(''); setDate('');
              setDateError(false);
              setAdults(''); setKids(''); setGuestNotes(''); setSpecific(''); setError('');
            }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.navy }}>Regenerate</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Swap bottom sheet ─────────────────────────────────────────────── */}
      <Modal
        visible={swapSheet?.visible ?? false}
        animationType="slide"
        transparent
        onRequestClose={() => setSwapSheet(null)}
      >
        <TouchableOpacity
          style={s.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSwapSheet(null)}
        >
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <Text style={s.sheetHeader}>
              SWAP {SECTION_DISPLAY[swapSheet?.sectionKey ?? ''] ?? ''}
            </Text>
            <Text style={s.sheetCurrent}>Current: {swapSheet?.dishName}</Text>

            {swapCuisineSugg.length > 0 && (
              <>
                <Text style={s.sheetSection}>FROM YOUR CUISINES</Text>
                {swapCuisineSugg.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.swapOption}
                    onPress={() => applySwap(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.swapOptionName}>{d.name}</Text>
                    {d.description ? <Text style={s.swapOptionDesc}>{d.description}</Text> : null}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {swapZoneSugg.length > 0 && (
              <>
                <Text style={s.sheetSection}>FROM YOUR REGION</Text>
                {swapZoneSugg.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.swapOption}
                    onPress={() => applySwap(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.swapOptionName}>{d.name}</Text>
                    {d.description ? <Text style={s.swapOptionDesc}>{d.description}</Text> : null}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity
              onPress={() => setSwapExpanded(e => !e)}
              activeOpacity={0.8}
              style={{ marginTop: 10 }}
            >
              <Text style={s.seeAllLink}>
                See all options {swapExpanded ? '\u25b2' : '\u203a'}
              </Text>
            </TouchableOpacity>

            {swapExpanded && (
              <ScrollView style={{ maxHeight: 200, marginTop: 8 }}>
                {swapAllSugg.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.swapOption}
                    onPress={() => applySwap(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.swapOptionName}>{d.name}</Text>
                    {d.description ? <Text style={s.swapOptionDesc}>{d.description}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </ScreenWrapper>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 24 },
  tipCard: {
    backgroundColor: 'rgba(30,158,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(30,158,94,0.2)',
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  tipText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateErrorTxt: { fontSize: 12, color: colors.danger, marginTop: 3 },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  styleChip: {
    width: '48%',
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  styleChipActive: {
    backgroundColor: 'rgba(46,84,128,0.08)',
    borderColor: colors.navy,
  },
  styleChipTxt: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  styleChipTxtActive: { color: colors.navy, fontWeight: '700' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.navy },
  toggleTxt: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  toggleTxtActive: { color: colors.white },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stepperLabel: { fontSize: 14, color: colors.textPrimary },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnTxt: { fontSize: 16, fontWeight: '700', color: colors.navy, lineHeight: 20 },
  stepperVal: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  error: { fontSize: 13, color: colors.danger, textAlign: 'center', marginTop: 10 },
  generateBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  generateBtnTxt: { fontSize: 16, fontWeight: '600', color: colors.white },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBanner: {
    backgroundColor: 'rgba(201,162,39,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.emerald,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,158,94,0.2)',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  swapBtn:     { marginLeft: 8, paddingVertical: 2 },
  swapBtnTxt:  { fontSize: 11, fontWeight: '600', color: colors.teal },
  downloadBtn: {
    flex: 2,
    backgroundColor: colors.emerald,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  regenerateBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:          { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHeader:    { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  sheetCurrent:   { fontSize: 15, fontWeight: '600', color: colors.navy, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.12)', paddingBottom: 12 },
  sheetSection:   { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  swapOption:     { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.08)' },
  swapOptionName: { fontSize: 14, color: colors.navy, fontWeight: '600' },
  swapOptionDesc: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  seeAllLink:     { fontSize: 14, color: colors.teal, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },
});
