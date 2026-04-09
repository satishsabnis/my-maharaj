import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, ImageBackground, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../constants/theme';

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'select' | 'input' | 'output';
type UseCase = 'group' | 'corporate' | 'canteen';

interface DishItem { dishName: string; isVeg: boolean; note?: string }

interface GroupResult {
  summary: string;
  starters: DishItem[];
  mains: DishItem[];
  accompaniments: DishItem[];
  notes: string[];
}

interface MealSlot { breakfast?: DishItem[]; lunch?: DishItem[]; dinner?: DishItem[]; snacks?: DishItem[] }
interface CanteenResult {
  day1: MealSlot;
  day2: MealSlot;
  notes: string[];
}

// ── API ──────────────────────────────────────────────────────────────────────

async function callClaude(system: string, user: string): Promise<string> {
  const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return (data?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}

// ── Dietary options ──────────────────────────────────────────────────────────

const DIETARY_OPTS = ['Veg only', 'Non-veg', 'Mixed', 'Individual'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// ── Screen ───────────────────────────────────────────────────────────────────

export default function OutdoorCateringScreen() {
  const [phase, setPhase] = useState<Phase>('select');
  const [useCase, setUseCase] = useState<UseCase>('group');

  // Group / Corporate fields
  const [occasion, setOccasion] = useState('');
  const [date, setDate] = useState('');
  const [people, setPeople] = useState('');
  const [dietary, setDietary] = useState(DIETARY_OPTS[0]);
  const [showDietDrop, setShowDietDrop] = useState(false);
  const [restrictions, setRestrictions] = useState('');
  const [specific, setSpecific] = useState('');

  // Canteen fields
  const [coversPerDay, setCoversPerDay] = useState('');
  const [cuisinePref, setCuisinePref] = useState('');
  const [budgetPerCover, setBudgetPerCover] = useState('');
  const [mealTypes, setMealTypes] = useState<string[]>(['Lunch']);

  // Output
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupResult, setGroupResult] = useState<GroupResult | null>(null);
  const [canteenResult, setCanteenResult] = useState<CanteenResult | null>(null);

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
    resetAll();
  }, []));

  function resetAll() {
    setPhase('select'); setGroupResult(null); setCanteenResult(null);
    setOccasion(''); setDate(''); setPeople(''); setDietary(DIETARY_OPTS[0]);
    setRestrictions(''); setSpecific('');
    setCoversPerDay(''); setCuisinePref(''); setBudgetPerCover('');
    setMealTypes(['Lunch']); setError(''); setLoading(false);
  }

  function toggleMealType(mt: string) {
    setMealTypes(prev => prev.includes(mt) ? prev.filter(x => x !== mt) : [...prev, mt]);
  }

  async function generate() {
    setError(''); setLoading(true); setGroupResult(null); setCanteenResult(null);
    try {
      if (useCase === 'canteen') {
        if (!coversPerDay.trim()) { setError('Enter covers per day.'); setLoading(false); return; }
        const sys = `You are Maharaj, an expert Indian canteen/catering menu planner. Plan a 2-day rotating canteen cycle. Day 1 and Day 2 must be completely different.
Covers per day: ${coversPerDay}, Cuisine: ${cuisinePref || 'North & South Indian mix'}, Budget per cover: ${budgetPerCover || 'moderate'}, Meal types: ${mealTypes.join(', ')}.
Return JSON: { day1:{breakfast?:[{dishName,isVeg,note}],lunch?:[...],dinner?:[...],snacks?:[...]}, day2:{...}, notes:["string"] }
Only include the meal types requested.`;
        const raw = await callClaude(sys, 'Generate the 2-day rotating canteen menu now.');
        const match = raw.match(/\{[\s\S]*\}/);
        const parsed: CanteenResult = JSON.parse(match ? match[0] : raw);
        setCanteenResult(parsed);
      } else {
        if (!occasion.trim()) { setError('Please describe the occasion.'); setLoading(false); return; }
        const label = useCase === 'corporate' ? 'corporate event' : 'group outdoor trip';
        const sys = `You are Maharaj, an expert Indian outdoor catering planner. Plan portable outdoor catering for a ${label}. Food must travel well, no reheating needed.
Occasion: ${occasion}, Date: ${date || 'not specified'}, People: ${people || 'not specified'}, Dietary: ${dietary}, Restrictions: ${restrictions || 'none'}, Specific: ${specific || 'none'}.
Return JSON: { summary, starters:[{dishName,isVeg,note}], mains:[{dishName,isVeg,note}], accompaniments:[{dishName,isVeg,note}], notes:["string"] }`;
        const raw = await callClaude(sys, 'Generate the outdoor catering menu now.');
        const match = raw.match(/\{[\s\S]*\}/);
        const parsed: GroupResult = JSON.parse(match ? match[0] : raw);
        setGroupResult(parsed);
      }
      setPhase('output');
    } catch (err) {
      console.error('[OutdoorCatering]', err);
      setError('Failed to generate. Please try again.');
    } finally { setLoading(false); }
  }

  function downloadPDF() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif}h2{color:${colors.navy};font-size:14px;border-bottom:1px solid #E5E7EB;padding-bottom:6px}table{width:100%;border-collapse:collapse}th{background:${colors.navy};color:${colors.white};padding:8px;font-size:11px;text-align:left}td{padding:8px;font-size:11px;border:1px solid #E5E7EB}</style></head><body>`;
    if (groupResult) {
      html += `<h1>Outdoor Catering: ${occasion}</h1><p>${groupResult.summary || ''}</p>`;
      const sec = (t: string, items: DishItem[]) => items?.length ? `<h2>${t}</h2><table><tr><th>#</th><th>Dish</th><th>Note</th></tr>${items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.isVeg ? '(V)' : '(NV)'} ${it.dishName}</td><td>${it.note || ''}</td></tr>`).join('')}</table>` : '';
      html += sec('Starters', groupResult.starters) + sec('Mains', groupResult.mains) + sec('Accompaniments', groupResult.accompaniments);
    } else if (canteenResult) {
      html += '<h1>2-Day Rotating Canteen Menu</h1>';
      [{ label: 'Day 1', data: canteenResult.day1 }, { label: 'Day 2', data: canteenResult.day2 }].forEach(({ label, data }) => {
        html += `<h2>${label}</h2>`;
        (['breakfast', 'lunch', 'dinner', 'snacks'] as const).forEach(slot => {
          const items = data[slot];
          if (items?.length) {
            html += `<h3>${slot.charAt(0).toUpperCase() + slot.slice(1)}</h3><ul>${items.map(it => `<li>${it.isVeg ? '(V)' : '(NV)'} ${it.dishName}${it.note ? ' - ' + it.note : ''}</li>`).join('')}</ul>`;
          }
        });
      });
    }
    html += '<script>setTimeout(function(){window.print()},800)</script></body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'maharaj-outdoor-catering.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── Dish row renderer ──────────────────────────────────────────────────────

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
        <View style={s.card}>
          {items.map((it, i) => <DishRow key={i} item={it} />)}
        </View>
      </View>
    );
  }

  function CanteenMealSection({ title, items }: { title: string; items?: DishItem[] }) {
    if (!items?.length) return null;
    return (
      <View style={{ marginBottom: 6 }}>
        <Text style={{ fontSize: 7, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{title}</Text>
        {items.map((it, i) => <DishRow key={i} item={it} />)}
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
          <TouchableOpacity onPress={() => {
            if (phase === 'output') setPhase('input');
            else if (phase === 'input') setPhase('select');
            else router.back();
          }} style={s.backBtn}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Outdoor Catering</Text>
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
            <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 10 }}>
              Maharaj is planning your menu...
            </Text>
          </View>
        )}

        {/* ─── SELECT phase ─────────────────────────────────────────────── */}
        {!loading && phase === 'select' && (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={s.tipCard}>
              <Text style={s.tipText}>
                What are you planning? I will suggest food that travels well, needs no reheating,
                and suits your group and occasion.
              </Text>
            </View>

            {/* Group Trip */}
            <TouchableOpacity
              style={[s.card, { backgroundColor: 'rgba(30,158,94,0.08)' }]}
              onPress={() => { setUseCase('group'); setPhase('input'); }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>
                Group Trip or Outdoor Event
              </Text>
              <Text style={{ fontSize: 7, color: colors.textSecondary }}>
                Trek, picnic, beach day, road trip, sports event
              </Text>
            </TouchableOpacity>

            {/* Corporate */}
            <TouchableOpacity
              style={[s.card, { backgroundColor: 'rgba(26,58,92,0.07)' }]}
              onPress={() => { setUseCase('corporate'); setPhase('input'); }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>
                Corporate Event
              </Text>
              <Text style={{ fontSize: 7, color: colors.textSecondary }}>
                Office outing, team lunch, client entertainment
              </Text>
            </TouchableOpacity>

            {/* Canteen */}
            <TouchableOpacity
              style={[s.card, { backgroundColor: 'rgba(201,162,39,0.08)' }]}
              onPress={() => { setUseCase('canteen'); setPhase('input'); }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>
                Canteen or Catering Business
              </Text>
              <Text style={{ fontSize: 7, color: colors.textSecondary }}>
                Daily operator, rotating 2-day cycle menu
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ─── INPUT phase ──────────────────────────────────────────────── */}
        {!loading && phase === 'input' && (
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {/* Change use case link */}
            <TouchableOpacity onPress={() => setPhase('select')} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 7.5, color: colors.emerald, fontWeight: '600' }}>
                Change use case
              </Text>
            </TouchableOpacity>

            {useCase !== 'canteen' ? (
              <>
                {/* Group / Corporate form */}
                <Text style={s.label}>Occasion</Text>
                <TextInput style={s.input} value={occasion} onChangeText={setOccasion}
                  placeholder={useCase === 'corporate' ? 'e.g. Team offsite lunch' : 'e.g. Weekend trek to Lonavala'}
                  placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Date</Text>
                <TextInput style={s.input} value={date} onChangeText={setDate}
                  placeholder="e.g. 20 May 2026" placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Number of people</Text>
                <TextInput style={s.input} value={people} onChangeText={setPeople}
                  keyboardType="numeric" placeholder="e.g. 25" placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Dietary</Text>
                <TouchableOpacity style={s.input} onPress={() => setShowDietDrop(!showDietDrop)}>
                  <Text style={{ fontSize: 8, color: colors.textPrimary }}>{dietary}</Text>
                </TouchableOpacity>
                {showDietDrop && (
                  <View style={s.dropdown}>
                    {DIETARY_OPTS.map(opt => (
                      <TouchableOpacity key={opt} style={s.dropItem} onPress={() => { setDietary(opt); setShowDietDrop(false); }}>
                        <Text style={{ fontSize: 7.5, color: opt === dietary ? colors.emerald : colors.textPrimary, fontWeight: opt === dietary ? '700' : '400' }}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={s.label}>Restrictions</Text>
                <TextInput style={[s.input, { minHeight: 50, textAlignVertical: 'top' }]} value={restrictions}
                  onChangeText={setRestrictions} multiline placeholder="e.g. No pork, nut allergy for 2"
                  placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Anything specific</Text>
                <TextInput style={[s.input, { minHeight: 50, textAlignVertical: 'top' }]} value={specific}
                  onChangeText={setSpecific} multiline placeholder="e.g. Need easy to carry finger food"
                  placeholderTextColor={colors.textHint} />
              </>
            ) : (
              <>
                {/* Canteen form */}
                <Text style={s.label}>Covers per day</Text>
                <TextInput style={s.input} value={coversPerDay} onChangeText={setCoversPerDay}
                  keyboardType="numeric" placeholder="e.g. 150" placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Cuisine preference</Text>
                <TextInput style={s.input} value={cuisinePref} onChangeText={setCuisinePref}
                  placeholder="e.g. North Indian, South Indian mix" placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Budget per cover</Text>
                <TextInput style={s.input} value={budgetPerCover} onChangeText={setBudgetPerCover}
                  placeholder="e.g. AED 15" placeholderTextColor={colors.textHint} />

                <Text style={s.label}>Meal types</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {MEAL_TYPES.map(mt => {
                    const active = mealTypes.includes(mt);
                    return (
                      <TouchableOpacity
                        key={mt}
                        onPress={() => toggleMealType(mt)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                          backgroundColor: active ? colors.emerald : 'transparent',
                          borderWidth: 1,
                          borderColor: active ? colors.emerald : colors.navy,
                        }}
                      >
                        <Text style={{ fontSize: 7.5, fontWeight: '500', color: active ? colors.white : colors.navy }}>{mt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.generateBtn, (useCase !== 'canteen' && !occasion.trim()) && { opacity: 0.5 }]}
              onPress={generate}
              disabled={loading || (useCase !== 'canteen' && !occasion.trim())}
            >
              <Text style={s.generateBtnTxt}>Ask Maharaj to Plan</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ─── OUTPUT phase ─────────────────────────────────────────────── */}
        {!loading && phase === 'output' && (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {/* Group / Corporate output */}
            {groupResult && (
              <>
                <View style={s.goldBanner}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: colors.navy, marginBottom: 3 }}>
                    {occasion}
                  </Text>
                  {date ? <Text style={{ fontSize: 7, color: colors.textSecondary }}>{date}</Text> : null}
                  {people ? <Text style={{ fontSize: 7, color: colors.textSecondary }}>{people} people  --  {dietary}</Text> : null}
                  {groupResult.summary ? (
                    <Text style={{ fontSize: 7.5, color: colors.textSecondary, marginTop: 5, lineHeight: 11 }}>
                      {groupResult.summary}
                    </Text>
                  ) : null}
                </View>

                <MenuSection title="STARTERS" items={groupResult.starters} />
                <MenuSection title="MAINS" items={groupResult.mains} />
                <MenuSection title="ACCOMPANIMENTS" items={groupResult.accompaniments} />

                {groupResult.notes?.length > 0 && (
                  <View style={[s.card, { marginBottom: 10 }]}>
                    <Text style={s.sectionTitle}>NOTES</Text>
                    {groupResult.notes.map((n, i) => (
                      <Text key={i} style={{ fontSize: 7, color: colors.textSecondary, lineHeight: 11, marginBottom: 3 }}>
                        {'\u2022'} {n}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Canteen output */}
            {canteenResult && (
              <>
                {/* Gold badge */}
                <View style={[s.goldBanner, { alignItems: 'center', marginBottom: 12 }]}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: colors.gold }}>2-day rotating cycle</Text>
                  <Text style={{ fontSize: 7, color: colors.textSecondary, marginTop: 2 }}>
                    {coversPerDay} covers/day  --  {cuisinePref || 'Mixed cuisine'}
                  </Text>
                </View>

                {/* Day 1 */}
                <View style={[s.card, { marginBottom: 10 }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>Day 1</Text>
                  <CanteenMealSection title="Breakfast" items={canteenResult.day1.breakfast} />
                  <CanteenMealSection title="Lunch" items={canteenResult.day1.lunch} />
                  <CanteenMealSection title="Dinner" items={canteenResult.day1.dinner} />
                  <CanteenMealSection title="Snacks" items={canteenResult.day1.snacks} />
                </View>

                {/* Day 2 */}
                <View style={[s.card, { marginBottom: 10 }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>Day 2</Text>
                  <CanteenMealSection title="Breakfast" items={canteenResult.day2.breakfast} />
                  <CanteenMealSection title="Lunch" items={canteenResult.day2.lunch} />
                  <CanteenMealSection title="Dinner" items={canteenResult.day2.dinner} />
                  <CanteenMealSection title="Snacks" items={canteenResult.day2.snacks} />
                </View>

                {canteenResult.notes?.length > 0 && (
                  <View style={[s.card, { marginBottom: 10 }]}>
                    <Text style={s.sectionTitle}>NOTES</Text>
                    {canteenResult.notes.map((n, i) => (
                      <Text key={i} style={{ fontSize: 7, color: colors.textSecondary, lineHeight: 11, marginBottom: 3 }}>
                        {'\u2022'} {n}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Bottom buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={s.downloadBtn} onPress={downloadPDF}>
                <Text style={{ fontSize: 8, fontWeight: '600', color: colors.white }}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.planAgainBtn} onPress={resetAll}>
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
