import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Platform,
  ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';

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

  // Output
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<PartyMenuResult | null>(null);

  // Pulsing logo animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  function downloadMenu() {
    if (!menu || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sectionHTML = (title: string, items: DishItem[]) => {
      if (!items?.length) return '';
      return `<h2>${title}</h2><table><tr><th>#</th><th>Dish</th><th>Note</th></tr>${items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.isVeg ? '(V)' : '(NV)'} <strong>${it.dishName}</strong></td><td>${it.note || ''}</td></tr>`).join('')}</table>`;
    };
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif}h2{color:${colors.navy};font-size:14px;margin:16px 0 8px;border-bottom:1px solid #E5E7EB;padding-bottom:6px}table{width:100%;border-collapse:collapse}th{background:${colors.navy};color:${colors.white};padding:8px;font-size:11px;text-align:left}td{padding:8px;font-size:11px;border:1px solid #E5E7EB}</style></head><body><h1>${menu.occasion || occasion}</h1><p>${menu.summary || ''}</p>${sectionHTML('Starters', menu.starters)}${sectionHTML('Rice & Bread', menu.mainRiceBread)}${sectionHTML('Curries', menu.mainCurries)}${sectionHTML('Accompaniments', menu.mainAccompaniments)}${sectionHTML('Desserts', menu.desserts)}<script>setTimeout(function(){window.print()},800)</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'maharaj-party-menu.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  function DishRow({ item }: { item: DishItem }) {
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
      </View>
    );
  }

  function MenuSection({ title, items }: { title: string; items?: DishItem[] }) {
    if (!items?.length) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.card}>
          {items.map((it, i) => <DishRow key={i} item={it} />)}
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
          <MenuSection title="STARTERS" items={menu.starters} />
          <MenuSection title="RICE & BREAD" items={menu.mainRiceBread} />
          <MenuSection title="CURRIES" items={menu.mainCurries} />
          <MenuSection title="ACCOMPANIMENTS" items={menu.mainAccompaniments} />
          <MenuSection title="DESSERTS" items={menu.desserts} />

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
});
