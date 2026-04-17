import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, ImageBackground, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';

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
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET },
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

// ── Dropdown helpers ─────────────────────────────────────────────────────────

const STYLES = ['Sit-down dinner', 'Buffet', 'Cocktail and snacks', 'High tea'];

// ── Screen ───────────────────────────────────────────────────────────────────

export default function PartyMenuScreen() {
  const [phase, setPhase] = useState<'input' | 'output'>('input');

  // Form fields
  const [occasion, setOccasion] = useState('');
  const [date, setDate] = useState('');
  const [adults, setAdults] = useState('');
  const [kids, setKids] = useState('');
  const [style, setStyle] = useState(STYLES[0]);
  const [showStyleDrop, setShowStyleDrop] = useState(false);
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
    setAdults(''); setKids(''); setStyle(STYLES[0]);
    setGuestNotes(''); setSpecific(''); setError(''); setLoading(false);
  }, []));

  async function generate() {
    if (!occasion.trim()) { setError('Please describe the occasion.'); return; }
    setError(''); setLoading(true); setMenu(null);

    const guestLine = (adults || '0') + ' adults' + (kids && kids !== '0' ? ', ' + kids + ' kids' : '');
    const contextLine = [
      occasion,
      date ? 'on ' + date : '',
      guestLine,
      'Style: ' + style,
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
      'starters 3-4 items. mainRiceBread 2-3 items. mainCurries 3-4 items. mainAccompaniments 3-4 items. desserts 2-3 items. ' +
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
        // One retry with ultra-strict instruction
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

  // ── Dish row renderer ────────────────────────────────────────────────────────

  function DishRow({ item }: { item: DishItem }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 }}>
        <View style={{
          width: 6, height: 6, borderRadius: 3, marginTop: 2, marginRight: 6,
          backgroundColor: item.isVeg ? colors.emerald : colors.danger,
        }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7.5, fontWeight: '700', color: colors.navy }}>{item.dishName}</Text>
          {item.note ? <Text style={{ fontSize: 6.5, color: colors.textMuted, marginTop: 1 }}>{item.note}</Text> : null}
        </View>
      </View>
    );
  }

  function MenuSection({ title, items }: { title: string; items?: DishItem[] }) {
    if (!items?.length) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.sectionDivider} />
        <View style={s.card}>
          {items.map((it, i) => <DishRow key={i} item={it} />)}
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => phase === 'output' ? setPhase('input') : router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Party Menu</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}>
            <Text style={s.homeTxt}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* Loading overlay */}
        {loading && (
          <View style={s.loadingOverlay}>
            <Animated.Image
              source={require('../assets/logo.png')}
              style={{ width: 80, height: 80, transform: [{ scale: pulseAnim }] }}
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
            <Text style={s.label}>Date</Text>
            <TextInput style={s.input} value={date} onChangeText={setDate}
              placeholder="e.g. 15 May 2026"
              placeholderTextColor={colors.textHint} />

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

            {/* Style dropdown */}
            <Text style={s.label}>Style</Text>
            <TouchableOpacity style={s.input} onPress={() => setShowStyleDrop(!showStyleDrop)}>
              <Text style={{ fontSize: 15, color: colors.textPrimary }}>{style}</Text>
            </TouchableOpacity>
            {showStyleDrop && (
              <View style={s.dropdown}>
                {STYLES.map(st => (
                  <TouchableOpacity key={st} style={s.dropItem} onPress={() => { setStyle(st); setShowStyleDrop(false); }}>
                    <Text style={{ fontSize: 15, color: st === style ? colors.emerald : colors.textPrimary, fontWeight: st === style ? '700' : '400' }}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
              style={[s.generateBtn, !occasion.trim() && { opacity: 0.5 }]}
              onPress={generate}
              disabled={!occasion.trim() || loading}
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
              <Text style={{ fontSize: 8, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>
                {menu.occasion || occasion}
              </Text>
              {date ? <Text style={{ fontSize: 7, color: colors.textSecondary }}>{date}</Text> : null}
              <Text style={{ fontSize: 7, color: colors.textSecondary }}>
                {adults || '0'} adults, {kids || '0'} kids  --  {style}
              </Text>
              {menu.summary ? (
                <Text style={{ fontSize: 7.5, color: colors.textSecondary, marginTop: 5, lineHeight: 11 }}>
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
                <Text style={{ fontSize: 8, fontWeight: '600', color: colors.white }}>Download Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.planAgainBtn} onPress={() => {
                setPhase('input'); setMenu(null); setOccasion(''); setDate('');
                setAdults(''); setKids(''); setGuestNotes(''); setSpecific(''); setError('');
              }}>
                <Text style={{ fontSize: 8, fontWeight: '600', color: colors.navy }}>Plan Again</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#2E5480',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backTxt: { fontSize: 15, fontWeight: '700', color: '#2E5480' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.navy, textAlign: 'center', flex: 1 },
  homeBtn: {
    backgroundColor: '#2E5480',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  homeTxt: { fontSize: 15, fontWeight: '700', color: colors.white },
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
  dropdown: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    marginTop: 2,
    overflow: 'hidden',
  },
  dropItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
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
  sectionDivider: {},
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
  planAgainBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
