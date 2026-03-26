import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { generateMealPlan, MealOption, MealPlanDay, emptyHealthFlags, HealthFlags } from '../lib/ai';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { navy, gold, peacock, textSec, errorRed, white, border, surface, textColor, successGreen } from '../theme/colors';

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep =
  | 'period' | 'food-pref' | 'meal-prefs' | 'unwell' | 'nutrition'
  | 'generating' | 'generating-error' | 'selection'
  | 'recipes' | 'grocery' | 'feedback';

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner';

interface DBMember { id: string; name: string; age: number; }
interface FeedbackEntry { dishName: string; rating: 1 | -1 | null; comment: string; }

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d: Date) { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toYMD(d: Date) { return d.toISOString().split('T')[0]; }
function getDates(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cur = startOfDay(new Date(from));
  const end = startOfDay(new Date(to));
  while (cur <= end) { dates.push(toYMD(cur)); cur.setDate(cur.getDate() + 1); }
  return dates;
}
function getWeekRange(offset: 0 | 1) {
  const today = new Date();
  const sun = startOfDay(addDays(today, -today.getDay() + offset * 7));
  return { start: sun, end: addDays(sun, 6) };
}
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function fmt(d: Date)  { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function fmtL(d: Date) { return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_L[d.getMonth()]} ${d.getFullYear()}`; }

// ─── Grocery helpers ──────────────────────────────────────────────────────────

const VEGGIE_KW  = ['onion','tomato','potato','spinach','cabbage','carrot','pea','bean','capsicum','brinjal','okra','bhindi','gourd','methi','palak','mushroom','corn','garlic','ginger','chili','chilli','lemon','coriander','curry leave','radish','cauliflower','eggplant','zucchini','pumpkin'];
const PROTEIN_KW = ['chicken','fish','mutton','egg','paneer','tofu','dal','lentil','chickpea','chana','rajma','kidney','moong','toor','urad','soy','prawn','shrimp'];
const SPICE_KW   = ['turmeric','cumin','coriander powder','chili powder','garam masala','pepper','cardamom','clove','cinnamon','bay','mustard','fenugreek','asafoetida','hing','masala','paprika','kasuri','sesame','saffron'];
const DAIRY_KW   = ['milk','curd','yogurt','ghee','butter','cream','cheese','buttermilk','chaas','condensed','paneer'];

type GroceryCat = 'Vegetables' | 'Protein' | 'Spices' | 'Dairy' | 'Pantry';
function categorise(name: string): GroceryCat {
  const n = name.toLowerCase();
  if (PROTEIN_KW.some((k) => n.includes(k))) return 'Protein';
  if (DAIRY_KW.some((k) => n.includes(k)))   return 'Dairy';
  if (VEGGIE_KW.some((k) => n.includes(k)))  return 'Vegetables';
  if (SPICE_KW.some((k) => n.includes(k)))   return 'Spices';
  return 'Pantry';
}
const CAT_ICONS: Record<GroceryCat, string> = { Vegetables: '🥬', Protein: '🥩', Spices: '🌶️', Dairy: '🥛', Pantry: '🌾' };
const CAT_ORDER: GroceryCat[] = ['Vegetables', 'Protein', 'Dairy', 'Spices', 'Pantry'];

// ─── Wizard progress ──────────────────────────────────────────────────────────

const USER_STEPS: WizardStep[] = ['period','food-pref','meal-prefs','unwell','nutrition'];
function stepNum(step: WizardStep): number { return USER_STEPS.indexOf(step) + 1; }
function totalUserSteps(): number { return USER_STEPS.length; }

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function MealWizardScreen() {
  const [step, setStep] = useState<WizardStep>('period');
  const [error, setError] = useState('');

  // Step 1
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(null);
  const [selectedTo,   setSelectedTo]   = useState<Date | null>(null);
  const [pickerFrom, setPickerFrom] = useState(startOfDay(new Date()));
  const [pickerTo,   setPickerTo]   = useState(addDays(startOfDay(new Date()), 1));
  const [showCustom, setShowCustom] = useState(false);

  // Step 2
  const [foodPref, setFoodPref]   = useState<'veg' | 'nonveg' | null>(null);
  const [vegType,  setVegType]    = useState<'normal' | 'fasting' | null>(null);
  const [nonVegOpts, setNonVegOpts] = useState<string[]>([]);
  const [includeDessert, setIncludeDessert] = useState(false);

  // Step 3
  const [bfPrefs, setBfPrefs]   = useState<string[]>([]);
  const [lnPrefs, setLnPrefs]   = useState<string[]>([]);
  const [dnPrefs, setDnPrefs]   = useState<string[]>([]);

  // Step 4
  const [familyMembers, setFamilyMembers] = useState<DBMember[]>([]);
  const [everyoneWell,  setEveryoneWell]  = useState(true);
  const [unwellIds,     setUnwellIds]     = useState<string[]>([]);

  // Step 5
  const [nutritionGoals, setNutritionGoals] = useState<string[]>(['Balanced']);

  // Generation
  const [generatedPlan,     setGeneratedPlan]     = useState<MealPlanDay[] | null>(null);
  const [generatingProgress,setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Selection
  const [selections,      setSelections]      = useState<Record<number, Record<MealSlotKey, number>>>({});
  const [expandedDays,    setExpandedDays]    = useState<Record<number, boolean>>({ 0: true });
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  // Post-selection
  const [recipeDishes, setRecipeDishes] = useState<string[]>([]);
  const [feedbacks,    setFeedbacks]    = useState<FeedbackEntry[]>([]);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [step]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('family_members').select('id, name, age').eq('user_id', user.id);
      setFamilyMembers((data as DBMember[]) ?? []);
    }
    void load();
  }, []);

  // ── Pulse animation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'generating') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [step]);

  // ── Generation ────────────────────────────────────────────────────────────

  const runGeneration = useCallback(async () => {
    if (!selectedFrom || !selectedTo) return;
    if (!foodPref) {
      setError('Please select a food preference before generating.');
      setStep('generating-error');
      return;
    }
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('breakfast_count,lunch_count,dinner_count,appetite_level,app_language,veg_days')
        .eq('id', user.id).maybeSingle();

      const { data: memberRows } = await supabase
        .from('family_members').select('health_notes').eq('user_id', user.id);

      const hf = emptyHealthFlags();
      (memberRows ?? []).forEach((m: { health_notes: string | null }) => {
        const notes = (m.health_notes ?? '').toLowerCase();
        if (notes.includes('diabet'))   hf.diabetic = true;
        if (notes.includes(' bp') || notes.includes('blood pressure')) hf.bp = true;
        if (notes.includes('pcos'))     hf.pcos = true;
        if (notes.includes('cholest'))  hf.cholesterol = true;
        if (notes.includes('thyroid'))  hf.thyroid = true;
        if (notes.includes('kidney'))   hf.kidneyDisease = true;
        if (notes.includes('heart'))    hf.heartDisease = true;
        if (notes.includes('obese') || notes.includes('obesity')) hf.obesity = true;
        if (notes.includes('anaemia') || notes.includes('anemia')) hf.anaemia = true;
        if (notes.includes('lactose'))  hf.lactoseIntolerant = true;
        if (notes.includes('gluten'))   hf.glutenIntolerant = true;
      });

      const { data: cuisineData } = await supabase
        .from('cuisine_preferences').select('cuisine_name')
        .eq('user_id', user.id).eq('is_excluded', false);
      const cuisines = (cuisineData ?? []).map((r: { cuisine_name: string }) => r.cuisine_name);
      const cuisine  = cuisines.length > 0 ? cuisines[Math.floor(Math.random() * cuisines.length)] : 'Konkani';

      const since = toYMD(addDays(new Date(), -14));
      const { data: historyData } = await supabase
        .from('dish_history').select('dish_name')
        .eq('user_id', user.id).gte('served_date', since);
      const dishHistory = (historyData ?? []).map((r: { dish_name: string }) => r.dish_name);

      const unwellNames = familyMembers.filter((m) => unwellIds.includes(m.id)).map((m) => m.name);

      setGeneratingProgress({ current: 0, total: 1 });
      const plan = await generateMealPlan({
        userId: user.id,
        dates:  getDates(selectedFrom, selectedTo),
        healthFlags: hf,
        servings: {
          breakfast: profile?.breakfast_count ?? 2,
          lunch:     profile?.lunch_count     ?? 2,
          dinner:    profile?.dinner_count    ?? 2,
        },
        appetite:  profile?.appetite_level ?? 'Normal',
        language:  profile?.app_language   ?? 'en',
        cuisine,
        dishHistory,
        foodPrefs: {
          type:          effectiveFoodPref,
          vegType:       vegType ?? undefined,
          nonVegOptions: nonVegOpts.length > 0 ? nonVegOpts : undefined,
        },
        unwellMembers:  unwellNames.length > 0 ? unwellNames : undefined,
        nutritionFocus: nutritionGoals.length > 0 ? nutritionGoals.join(', ') : undefined,
        vegDays:        profile?.veg_days ?? [],
        breakfastPrefs: bfPrefs.length > 0 ? bfPrefs : undefined,
        lunchPrefs:     lnPrefs.length > 0 ? lnPrefs : undefined,
        dinnerPrefs:    dnPrefs.length > 0 ? dnPrefs : undefined,
        includeDessert,
      }, (current, total) => setGeneratingProgress({ current, total }));

      const defaultSel: Record<number, Record<MealSlotKey, number>> = {};
      plan.days.forEach((_, i) => { defaultSel[i] = { breakfast: 0, lunch: 0, dinner: 0 }; });
      setGeneratedPlan(plan.days);
      setSelections(defaultSel);
      setStep('selection');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
      setStep('generating-error');
    }
  }, [selectedFrom, selectedTo, foodPref, vegType, nonVegOpts, familyMembers, unwellIds, nutritionGoals, bfPrefs, lnPrefs, dnPrefs, includeDessert]);

  useEffect(() => {
    if (step === 'generating') void runGeneration();
  }, [step, runGeneration]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getOpt(dayIdx: number, slot: MealSlotKey): MealOption | null {
    if (!generatedPlan) return null;
    const optIdx = selections[dayIdx]?.[slot] ?? 0;
    return generatedPlan[dayIdx][slot].options[optIdx] ?? null;
  }

  function allSelected(): boolean {
    if (!generatedPlan) return false;
    return generatedPlan.every((_, i) =>
      (['breakfast','lunch','dinner'] as MealSlotKey[]).every((slot) => selections[i]?.[slot] !== undefined)
    );
  }

  function selectedCount(): number {
    if (!generatedPlan) return 0;
    return generatedPlan.reduce((acc, _, i) =>
      acc + (['breakfast','lunch','dinner'] as MealSlotKey[]).filter((slot) => selections[i]?.[slot] !== undefined).length,
    0);
  }

  function buildGrocery(): Record<GroceryCat, { name: string }[]> {
    const grouped = {} as Record<GroceryCat, { name: string }[]>;
    const seen = new Set<string>();
    if (!generatedPlan) return grouped;
    generatedPlan.forEach((_, dayIdx) => {
      (['breakfast','lunch','dinner'] as MealSlotKey[]).forEach((slot) => {
        getOpt(dayIdx, slot)?.ingredients.forEach((ing) => {
          const key = ing.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            const cat = categorise(ing);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ name: ing });
          }
        });
      });
    });
    return grouped;
  }

  function buildGroceryText(): string {
    const grocery = buildGrocery();
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const lines = ['MY MAHARAJ SHOPPING LIST', 'Date: ' + today, ''];
    CAT_ORDER.forEach((cat) => {
      const items = grocery[cat];
      if (!items?.length) return;
      lines.push(CAT_ICONS[cat] + ' ' + cat.toUpperCase() + ':');
      items.forEach((it) => lines.push(`  - ${it.name}`));
      lines.push('');
    });
    return lines.join('\n');
  }

  function buildFeedbackEntries(): FeedbackEntry[] {
    if (!generatedPlan) return [];
    const entries: FeedbackEntry[] = [];
    generatedPlan.forEach((_, i) =>
      (['breakfast','lunch','dinner'] as MealSlotKey[]).forEach((slot) => {
        const opt = getOpt(i, slot);
        if (opt) entries.push({ dishName: opt.name, rating: null, comment: '' });
      })
    );
    return entries;
  }

  async function saveHistory() {
    if (!generatedPlan || !selectedFrom || !selectedTo) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const slots: MealSlotKey[] = ['breakfast','lunch','dinner'];
    const dishRows = generatedPlan.flatMap((day, i) =>
      slots.map((slot) => {
        const opt = getOpt(i, slot);
        return opt ? { user_id: user.id, dish_name: opt.name, served_date: day.date, meal_type: slot } : null;
      }).filter(Boolean)
    );
    await Promise.all([
      supabase.from('menu_history').insert({
        user_id: user.id,
        period_start: toYMD(selectedFrom), period_end: toYMD(selectedTo),
        cuisine: 'Various', food_pref: effectiveFoodPref,
        menu_json: { days: generatedPlan.map((day, i) => ({
          date: day.date, day: day.day,
          breakfast: getOpt(i, 'breakfast'),
          lunch:     getOpt(i, 'lunch'),
          dinner:    getOpt(i, 'dinner'),
        })) },
      }),
      dishRows.length > 0 ? supabase.from('dish_history').insert(dishRows) : Promise.resolve(),
    ]);
  }

  async function submitFeedback() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = feedbacks.filter((f) => f.rating !== null).map((f) => ({
      user_id: user.id, dish_name: f.dishName, rating: f.rating, comment: f.comment || null,
    }));
    if (rows.length > 0) await supabase.from('meal_feedback').insert(rows);
    setFeedbackDone(true);
  }

  async function shareWhatsApp() {
    const text = buildGroceryText();
    const url = Platform.OS === 'web'
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;
    void Linking.openURL(url);
  }

  async function copyGrocery() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(buildGroceryText());
    }
  }

  async function downloadGrocery() {
    if (Platform.OS !== 'web') return;
    const blob = new Blob([buildGroceryText()], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'MyMaharaj-Shopping-List.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function advance(next: WizardStep) { setError(''); setStep(next); }

  function goBack() {
    setError('');
    const backMap: Partial<Record<WizardStep, WizardStep>> = {
      'food-pref': 'period',
      'meal-prefs': 'food-pref',
      'unwell': 'meal-prefs',
      'nutrition': 'unwell',
      'selection': 'nutrition',
      'recipes': 'selection',
      'grocery': 'recipes',
      'feedback': 'grocery',
    };
    const prev = backMap[step];
    if (prev) setStep(prev);
    else router.back();
  }

  // ── Pill helper ───────────────────────────────────────────────────────────

  function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity style={[chip.base, active && chip.active]} onPress={onPress} activeOpacity={0.75}>
        <Text style={[chip.text, active && chip.textActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function DateRow({ label, date, onDec, onInc, canDec }: {
    label: string; date: Date; onDec: () => void; onInc: () => void; canDec: boolean;
  }) {
    return (
      <View style={s.dateRow}>
        <Text style={s.dateRowLabel}>{label}</Text>
        <View style={s.dateRowCtrl}>
          <TouchableOpacity style={[s.dateBtn, !canDec && s.dateBtnDim]} onPress={onDec} disabled={!canDec}>
            <Text style={s.dateBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.dateVal}>{fmt(date)}</Text>
          <TouchableOpacity style={s.dateBtn} onPress={onInc}>
            <Text style={s.dateBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render steps ──────────────────────────────────────────────────────────

  function renderPeriod() {
    const today = startOfDay(new Date());
    const cards = [
      { label: 'Today',       icon: '📅', fn: () => { setSelectedFrom(today); setSelectedTo(today); setShowCustom(false); advance('food-pref'); } },
      { label: 'Tomorrow',    icon: '📆', fn: () => { const t = addDays(today, 1); setSelectedFrom(t); setSelectedTo(t); advance('food-pref'); } },
      { label: 'This Week',   icon: '🗓️', fn: () => { const { start, end } = getWeekRange(0); setSelectedFrom(start); setSelectedTo(end); advance('food-pref'); } },
      { label: 'Next Week',   icon: '📋', fn: () => { const { start, end } = getWeekRange(1); setSelectedFrom(start); setSelectedTo(end); advance('food-pref'); } },
    ];
    return (
      <View>
        <Text style={s.stepTitle}>When would you like to plan?</Text>
        <View style={s.periodGrid}>
          {cards.map((c) => (
            <TouchableOpacity key={c.label} style={s.periodCard} onPress={c.fn} activeOpacity={0.8}>
              <Text style={s.periodIcon}>{c.icon}</Text>
              <Text style={s.periodLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setShowCustom((v) => !v)} activeOpacity={0.7} style={s.customLink}>
          <Text style={s.customLinkText}>Or choose specific dates ›</Text>
        </TouchableOpacity>
        {showCustom && (
          <View style={s.customCard}>
            <Text style={s.customCardTitle}>Select Date Range</Text>
            <DateRow label="From" date={pickerFrom}
              onDec={() => { const n = addDays(pickerFrom,-1); if (n>=today){setPickerFrom(n);if(pickerTo<=n)setPickerTo(addDays(n,1));} }}
              onInc={() => { const n=addDays(pickerFrom,1); setPickerFrom(n); if(pickerTo<=n)setPickerTo(addDays(n,1)); }}
              canDec={pickerFrom > today} />
            <DateRow label="To" date={pickerTo}
              onDec={() => { const n=addDays(pickerTo,-1); if(n>pickerFrom)setPickerTo(n); }}
              onInc={() => setPickerTo(addDays(pickerTo,1))}
              canDec={addDays(pickerTo,-1) > pickerFrom} />
            <Button title={`Plan ${fmt(pickerFrom)} → ${fmt(pickerTo)}`} onPress={() => {
              setSelectedFrom(pickerFrom); setSelectedTo(pickerTo); advance('food-pref');
            }} />
          </View>
        )}
      </View>
    );
  }

  function renderFoodPref() {
    return (
      <View>
        <Text style={s.stepTitle}>What type of food?</Text>
        {selectedFrom && (
          <Text style={s.stepSub}>{fmtL(selectedFrom)}{selectedTo && selectedTo.getTime() !== selectedFrom.getTime() ? ` – ${fmtL(selectedTo)}` : ''}</Text>
        )}

        {/* Dessert toggle */}
        <TouchableOpacity style={[s.toggleRow, includeDessert && s.toggleRowOn]} onPress={() => setIncludeDessert((v) => !v)} activeOpacity={0.8}>
          <Text style={s.toggleIcon}>🍮</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>Include Desserts</Text>
            <Text style={s.toggleSub}>Sunday sweets · Weekday quick treats</Text>
          </View>
          <View style={[s.switchTrack, includeDessert && s.switchTrackOn]}>
            <View style={[s.switchKnob, includeDessert && s.switchKnobOn]} />
          </View>
        </TouchableOpacity>

        <View style={s.foodCards}>
          <TouchableOpacity
            style={[s.foodCard, foodPref === 'veg' && s.foodCardActive]}
            onPress={() => { setFoodPref('veg'); setVegType(null); }}
            activeOpacity={0.8}
          >
            <Text style={s.foodCardIcon}>🥗</Text>
            <Text style={[s.foodCardLabel, foodPref === 'veg' && s.foodCardLabelActive]}>Vegetarian</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.foodCard, foodPref === 'nonveg' && s.foodCardActive]}
            onPress={() => { setFoodPref('nonveg'); setVegType(null); }}
            activeOpacity={0.8}
          >
            <Text style={s.foodCardIcon}>🍗</Text>
            <Text style={[s.foodCardLabel, foodPref === 'nonveg' && s.foodCardLabelActive]}>Non-Vegetarian</Text>
          </TouchableOpacity>
        </View>

        {foodPref === 'veg' && (
          <View style={s.foodCards}>
            <TouchableOpacity style={[s.foodCard, vegType === 'normal' && s.foodCardActive]}
              onPress={() => setVegType('normal')} activeOpacity={0.8}>
              <Text style={s.foodCardIcon}>🥗</Text>
              <Text style={[s.foodCardLabel, vegType === 'normal' && s.foodCardLabelActive]}>Normal Veg</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.foodCard, vegType === 'fasting' && s.foodCardActive]}
              onPress={() => setVegType('fasting')} activeOpacity={0.8}>
              <Text style={s.foodCardIcon}>🙏</Text>
              <Text style={[s.foodCardLabel, vegType === 'fasting' && s.foodCardLabelActive]}>Fasting/Upvas</Text>
            </TouchableOpacity>
          </View>
        )}

        {foodPref === 'nonveg' && (
          <View>
            <Text style={s.sectionLabel}>SELECT OPTIONS</Text>
            <View style={s.pillRow}>
              {['Eggs 🥚','Fish 🐟','Chicken 🍗','Mutton 🐑'].map((o) => (
                <Chip key={o} label={o} active={nonVegOpts.includes(o)}
                  onPress={() => setNonVegOpts((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])} />
              ))}
            </View>
            {nonVegOpts.length === 0 && <Text style={s.inlineError}>Please select at least one option</Text>}
          </View>
        )}

        {error ? <Text style={s.errorText}>{error}</Text> : null}
        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Continue →" onPress={() => {
              if (!foodPref) { setError('Please select a food preference'); return; }
              if (foodPref === 'nonveg' && nonVegOpts.length === 0) { setError('Please select at least one non-veg option'); return; }
              advance('meal-prefs');
            }} />
          </View>
        </View>
      </View>
    );
  }

  function renderMealPrefs() {
    const BF_OPTS = ['Hot dish (pohe/upma/idli)','Bread/Paratha','Eggs','Fruits','Juice/Smoothie','Light only','Full Thali'];
    const LN_OPTS = ['Rice based','Roti based','Dal','Sabzi','Salad','Raita','Papad','Pickle'];
    const DN_OPTS = ['Rice based','Roti based','Non-veg main','Veg main','Soup','Salad','Dessert','Light only'];

    function toggle(list: string[], set: React.Dispatch<React.SetStateAction<string[]>>, item: string) {
      set((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
    }

    return (
      <View>
        <Text style={s.stepTitle}>What would you like in each meal?</Text>
        <Text style={s.stepSub}>Select all that apply for each meal</Text>

        {[
          { emoji: '🌅', label: 'Breakfast', opts: BF_OPTS, sel: bfPrefs, set: setBfPrefs },
          { emoji: '☀️', label: 'Lunch',     opts: LN_OPTS, sel: lnPrefs, set: setLnPrefs },
          { emoji: '🌙', label: 'Dinner',    opts: DN_OPTS, sel: dnPrefs, set: setDnPrefs },
        ].map(({ emoji, label, opts, sel, set }) => (
          <View key={label} style={s.mealPrefSection}>
            <Text style={s.mealPrefHeader}>{emoji} {label}</Text>
            <View style={s.pillRow}>
              {opts.map((o) => (
                <Chip key={o} label={o} active={sel.includes(o)} onPress={() => toggle(sel, set, o)} />
              ))}
            </View>
          </View>
        ))}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Continue →" onPress={() => advance('unwell')} />
          </View>
        </View>
      </View>
    );
  }

  function renderUnwell() {
    return (
      <View>
        <Text style={s.stepTitle}>Is anyone feeling unwell?</Text>

        <View style={s.foodCards}>
          <TouchableOpacity style={[s.foodCard, everyoneWell && s.foodCardActive]}
            onPress={() => { setEveryoneWell(true); setUnwellIds([]); }} activeOpacity={0.8}>
            <Text style={s.foodCardIcon}>😊</Text>
            <Text style={[s.foodCardLabel, everyoneWell && s.foodCardLabelActive]}>Everyone is fine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.foodCard, !everyoneWell && s.foodCardActive]}
            onPress={() => setEveryoneWell(false)} activeOpacity={0.8}>
            <Text style={s.foodCardIcon}>🤒</Text>
            <Text style={[s.foodCardLabel, !everyoneWell && s.foodCardLabelActive]}>Someone is unwell</Text>
          </TouchableOpacity>
        </View>

        {!everyoneWell && familyMembers.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>WHO IS UNWELL?</Text>
            <View style={s.pillRow}>
              {familyMembers.map((m) => (
                <Chip key={m.id} label={m.name} active={unwellIds.includes(m.id)}
                  onPress={() => setUnwellIds((prev) =>
                    prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                  )} />
              ))}
            </View>
          </View>
        )}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Continue →" onPress={() => advance('nutrition')} />
          </View>
        </View>
      </View>
    );
  }

  function renderNutrition() {
    const GOALS = ['Balanced','Low Calorie','Keto','High Protein','Less Oil','High Fibre','Weight Loss','Doctor Recommended'];
    return (
      <View>
        <Text style={s.stepTitle}>Any nutrition goal?</Text>
        <Text style={s.stepSub}>Select all that apply</Text>
        <View style={s.pillRow}>
          {GOALS.map((g) => (
            <Chip key={g} label={g} active={nutritionGoals.includes(g)}
              onPress={() => setNutritionGoals((prev) =>
                prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
              )} />
          ))}
        </View>

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="🍳 Generate My Meal Plan" onPress={() => advance('generating')} />
          </View>
        </View>
      </View>
    );
  }

  function renderGenerating() {
    return (
      <View style={s.genScreen}>
        <Animated.Image
          source={require('../assets/logo.png')}
          style={{ width: 200, height: 140, resizeMode: 'contain', backgroundColor: 'transparent', opacity: pulseAnim }}
        />
        <Text style={s.genTitle}>Maharaj is preparing your meal plan...</Text>
        <Text style={s.genSub}>
          {generatingProgress
            ? `Generating day ${generatingProgress.current} of ${generatingProgress.total}...`
            : 'Starting up — please wait'
          }
        </Text>
        <View style={s.dotRow}>
          {[0,1,2].map((i) => <View key={i} style={[s.dot, { opacity: 0.3 + i * 0.35 }]} />)}
        </View>
      </View>
    );
  }

  function renderGeneratingError() {
    return (
      <View style={s.genScreen}>
        <Logo size="medium" />
        <Text style={s.genTitle}>One moment — Maharaj is still thinking.</Text>
        <Text style={[s.genSub, { textAlign: 'center', paddingHorizontal: 24, marginTop: 8 }]}>
          {error || 'The meal plan could not be generated.'}
        </Text>
        <View style={{ marginTop: 32, width: '80%', maxWidth: 280 }}>
          <Button title="Try Again" onPress={() => { setError(''); setStep('generating'); }} />
          <View style={{ height: 12 }} />
          <Button title="← Back to Settings" onPress={() => { setError(''); setStep('nutrition'); }} variant="outline" />
        </View>
      </View>
    );
  }

  function renderSelection() {
    if (!generatedPlan) return null;
    const slots: { key: MealSlotKey; icon: string; label: string }[] = [
      { key: 'breakfast', icon: '🌅', label: 'Breakfast' },
      { key: 'lunch',     icon: '☀️', label: 'Lunch'     },
      { key: 'dinner',    icon: '🌙', label: 'Dinner'    },
    ];
    const total = generatedPlan.length * 3;

    return (
      <View>
        <Text style={s.stepTitle}>Your Meal Plan</Text>
        {selectedFrom && selectedTo && (
          <Text style={s.stepSub}>
            {selectedFrom.getTime() === selectedTo.getTime()
              ? fmtL(selectedFrom)
              : `${fmt(selectedFrom)} – ${fmt(selectedTo)}`}
          </Text>
        )}

        {generatedPlan.map((day, dayIdx) => {
          const expanded = expandedDays[dayIdx] ?? false; const setExpanded = (fn) => setExpandedDays((prev) => ({ ...prev, [dayIdx]: fn(prev[dayIdx] ?? false) }));
          return (
            <View key={day.date} style={s.dayCard}>
              <TouchableOpacity style={s.dayCardHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
                <View>
                  <Text style={s.dayCardDay}>{day.day}</Text>
                  <Text style={s.dayCardDate}>{day.date}</Text>
                </View>
                <Text style={s.dayCardArrow}>{expanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded && slots.map(({ key, icon, label }) => (
                <View key={key} style={s.slotBlock}>
                  <Text style={s.slotLabel}>{icon} {label}</Text>
                  {day[key].options.map((opt, optIdx) => {
                    const recKey = `${dayIdx}-${key}-${optIdx}`;
                    const isSel  = selections[dayIdx]?.[key] === optIdx;
                    const isExp  = expandedRecipes[recKey];
                    return (
                      <View key={optIdx} style={[s.optCard, isSel && s.optCardActive]}>
                        <TouchableOpacity
                          style={s.optCardHeader}
                          onPress={() => setSelections((prev) => ({
                            ...prev,
                            [dayIdx]: { ...(prev[dayIdx] ?? { breakfast: 0, lunch: 0, dinner: 0 }), [key]: optIdx },
                          }))}
                          activeOpacity={0.8}
                        >
                          <View style={[s.radio, isSel && s.radioOn]}>
                            {isSel && <View style={s.radioDot} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.optName, isSel && { color: navy, fontWeight: '700' }]}>{opt.name}</Text>
                            {opt.tags.length > 0 && (
                              <View style={s.tagRow}>
                                {opt.tags.slice(0, 3).map((tag) => (
                                  <View key={tag} style={[s.tag, tag.toLowerCase().includes('non-veg') && s.tagRed]}>
                                    <Text style={[s.tagText, tag.toLowerCase().includes('non-veg') && s.tagTextRed]}>{tag}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                          <Text style={s.optNum}>#{optIdx + 1}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.viewRecipeBtn}
                          onPress={() => setExpandedRecipes((prev) => ({ ...prev, [recKey]: !prev[recKey] }))}
                          activeOpacity={0.7}
                        >
                          <Text style={s.viewRecipeText}>{isExp ? '▲ Hide Recipe' : '▼ View Recipe'}</Text>
                        </TouchableOpacity>

                        {isExp && (
                          <View style={s.inlineRecipe}>
                            {opt.ingredients.length > 0 && (
                              <>
                                <Text style={s.recipeSection}>Ingredients</Text>
                                {opt.ingredients.map((ing, ii) => (
                                  <Text key={ii} style={s.recipeItem}>• {ing}</Text>
                                ))}
                              </>
                            )}
                            {opt.steps.length > 0 && (
                              <>
                                <Text style={s.recipeSection}>Method</Text>
                                {opt.steps.map((st, si) => (
                                  <Text key={si} style={s.recipeItem}>{si + 1}. {st}</Text>
                                ))}
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}

        {/* Floating bottom bar */}
        <View style={s.floatBar}>
          <Text style={s.floatCount}>{selectedCount()} of {total} meals selected</Text>
          <Button
            title="Confirm Selections ✓"
            onPress={() => { void saveHistory(); setRecipeDishes([]); advance('recipes'); }}
            disabled={!allSelected()}
          />
        </View>
      </View>
    );
  }

  function renderRecipes() {
    if (!generatedPlan) return null;
    const allDishes: string[] = [];
    generatedPlan.forEach((_, i) =>
      (['breakfast','lunch','dinner'] as MealSlotKey[]).forEach((slot) => {
        const opt = getOpt(i, slot);
        if (opt && !allDishes.includes(opt.name)) allDishes.push(opt.name);
      })
    );
    const selected = allDishes.filter((d) => recipeDishes.includes(d));

    return (
      <View>
        <Text style={s.stepTitle}>Full Recipes</Text>
        <Text style={s.stepSub}>For your selected meals</Text>

        <View style={{ marginBottom: 16 }}>
          {allDishes.map((dish) => (
            <TouchableOpacity
              key={dish}
              style={[s.dishCheckRow, recipeDishes.includes(dish) && s.dishCheckRowActive]}
              onPress={() => setRecipeDishes((prev) => prev.includes(dish) ? prev.filter((d) => d !== dish) : [...prev, dish])}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, recipeDishes.includes(dish) && s.checkboxActive]}>
                {recipeDishes.includes(dish) && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.dishCheckName}>{dish}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected.length > 0 && generatedPlan.flatMap((day, dayIdx) =>
          (['breakfast','lunch','dinner'] as MealSlotKey[]).map((slot) => {
            const opt = getOpt(dayIdx, slot);
            if (!opt || !selected.includes(opt.name)) return null;
            return (
              <View key={`${dayIdx}-${slot}`} style={s.recipeCard}>
                <Text style={s.recipeCardName}>{opt.name}</Text>
                {opt.tags.length > 0 && <Text style={s.recipeCardTags}>{opt.tags.join(' · ')}</Text>}
                <Text style={s.recipeSection}>Ingredients</Text>
                {opt.ingredients.map((ing, i) => <Text key={i} style={s.recipeItem}>• {ing}</Text>)}
                {opt.steps.length > 0 && (
                  <>
                    <Text style={s.recipeSection}>Method</Text>
                    {opt.steps.map((st, i) => <Text key={i} style={s.recipeItem}>{i + 1}. {st}</Text>)}
                  </>
                )}
              </View>
            );
          })
        )}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title={recipeDishes.length > 0 ? 'Save & Continue →' : 'Skip Recipes →'} onPress={() => {
              setFeedbacks(buildFeedbackEntries()); advance('grocery');
            }} />
          </View>
        </View>
      </View>
    );
  }

  function renderGrocery() {
    const grocery = buildGrocery();
    const totalItems = CAT_ORDER.reduce((acc, cat) => acc + (grocery[cat]?.length ?? 0), 0);

    return (
      <View>
        <Text style={s.stepTitle}>🛒 Your Shopping List</Text>
        <Text style={s.stepSub}>{totalItems} items for {selectedFrom && selectedTo
          ? selectedFrom.getTime() === selectedTo.getTime() ? fmtL(selectedFrom) : `${fmt(selectedFrom)} – ${fmt(selectedTo)}`
          : 'your plan'}
        </Text>

        <View style={s.groceryActions}>
          <TouchableOpacity style={s.groceryActionBtn} onPress={() => void copyGrocery()} activeOpacity={0.8}>
            <Text style={s.groceryActionText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.groceryActionBtn} onPress={() => void shareWhatsApp()} activeOpacity={0.8}>
            <Text style={s.groceryActionText}>📱 WhatsApp</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={s.groceryActionBtn} onPress={() => void downloadGrocery()} activeOpacity={0.8}>
              <Text style={s.groceryActionText}>📄 Download</Text>
            </TouchableOpacity>
          )}
        </View>

        {totalItems === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No ingredients found. Please select meals first.</Text>
          </View>
        ) : (
          CAT_ORDER.map((cat) => {
            const items = grocery[cat];
            if (!items?.length) return null;
            return (
              <View key={cat} style={s.groceryCat}>
                <Text style={s.groceryCatTitle}>{CAT_ICONS[cat]} {cat}</Text>
                <View style={s.groceryCatDivider} />
                {items.map((item, i) => (
                  <View key={i} style={[s.groceryRow, i < items.length - 1 && s.groceryRowBorder]}>
                    <Text style={s.groceryName}>{item.name}</Text>
                  </View>
                ))}
              </View>
            );
          })
        )}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Continue →" onPress={() => advance('feedback')} />
          </View>
        </View>
      </View>
    );
  }

  function renderFeedback() {
    if (feedbackDone) {
      return (
        <View style={s.doneScreen}>
          <Text style={s.doneEmoji}>🙏</Text>
          <Text style={s.doneTitle}>Bon Appétit!</Text>
          <Text style={s.doneSub}>Your meal plan is ready. Maharaj wishes your family a delicious week!</Text>
          <View style={{ width: '100%', maxWidth: 320 }}>
            <Button title="Back to Home" onPress={() => router.replace('/home')} />
          </View>
        </View>
      );
    }
    return (
      <View>
        <Text style={s.stepTitle}>Bon Appétit! 🙏</Text>
        <Text style={s.stepSub}>How did you enjoy your meals? Your feedback helps Maharaj improve.</Text>

        {feedbacks.map((fb, idx) => (
          <View key={idx} style={s.feedbackCard}>
            <Text style={s.feedbackDish}>{fb.dishName}</Text>
            <View style={s.feedbackBtns}>
              <TouchableOpacity
                style={[s.thumbBtn, fb.rating === 1 && s.thumbUp]}
                onPress={() => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, rating: 1 } : f))}
              >
                <Text style={s.thumbText}>👍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.thumbBtn, fb.rating === -1 && s.thumbDown]}
                onPress={() => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, rating: -1 } : f))}
              >
                <Text style={s.thumbText}>👎</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="← Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Submit Feedback & Finish" onPress={() => void submitFeedback()} />
          </View>
        </View>
        <TouchableOpacity onPress={() => setFeedbackDone(true)} style={s.skipLink} activeOpacity={0.7}>
          <Text style={s.skipLinkText}>Skip feedback</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  const STEP_RENDER: Record<WizardStep, () => React.ReactNode> = {
    'period':           renderPeriod,
    'food-pref':        renderFoodPref,
    'meal-prefs':       renderMealPrefs,
    'unwell':           renderUnwell,
    'nutrition':        renderNutrition,
    'generating':       renderGenerating,
    'generating-error': renderGeneratingError,
    'selection':        renderSelection,
    'recipes':          renderRecipes,
    'grocery':          renderGrocery,
    'feedback':         renderFeedback,
  };

  const isUserStep = USER_STEPS.includes(step);
  const currentNum = stepNum(step);
  const isFullScreen = ['generating','generating-error'].includes(step);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      {!isFullScreen && (
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.headerBack}>
            <Text style={s.headerBackText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Meal Plan Wizard</Text>
          {isUserStep && (
            <Text style={s.headerStep}>{currentNum} of {totalUserSteps()}</Text>
          )}
          {!isUserStep && <View style={{ width: 50 }} />}
        </View>
      )}

      {/* Progress bar */}
      {isUserStep && (
        <View style={s.progressOuter}>
          <View style={[s.progressFill, { width: `${(currentNum / totalUserSteps()) * 100}%` as const }]} />
        </View>
      )}

      <ScrollView ref={scrollRef} contentContainerStyle={[s.scroll, isFullScreen && s.scrollCenter]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[s.body, isFullScreen && s.bodyCenter]}>
          {STEP_RENDER[step]?.()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Chip styles ─────────────────────────────────────────────────────────────

const chip = StyleSheet.create({
  base:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: white },
  active:    { backgroundColor: gold, borderColor: gold },
  text:      { fontSize: 13, color: navy, fontWeight: '500' },
  textActive:{ color: navy, fontWeight: '700' },
});

// ─── Main styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  headerBack:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBackText:{ fontSize: 22, color: navy },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: navy },
  headerStep:    { fontSize: 13, color: textSec, fontWeight: '600', minWidth: 50, textAlign: 'right' },

  progressOuter: { height: 3, backgroundColor: border },
  progressFill:  { height: 3, backgroundColor: gold },

  scroll:       { paddingBottom: 48 },
  scrollCenter: { flexGrow: 1 },
  body:         { paddingHorizontal: 20, paddingTop: 20, maxWidth: 700, width: '100%', alignSelf: 'center' },
  bodyCenter:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  stepTitle: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  stepSub:   { fontSize: 14, color: textSec, marginBottom: 20, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },

  pillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  btnRow:   { flexDirection: 'row', marginTop: 28 },
  errorText:{ fontSize: 13, color: errorRed, textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 12 },
  inlineError: { fontSize: 12, color: errorRed, marginTop: 4, marginLeft: 2 },

  // Period
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  periodCard: { width: '47%', backgroundColor: surface, borderRadius: 14, borderWidth: 1.5, borderColor: border, padding: 20, alignItems: 'center', gap: 8 },
  periodIcon: { fontSize: 28 },
  periodLabel:{ fontSize: 14, fontWeight: '700', color: navy, textAlign: 'center' },
  customLink: { alignSelf: 'center', paddingVertical: 8 },
  customLinkText: { fontSize: 14, color: gold, fontWeight: '600' },
  customCard: { backgroundColor: surface, borderRadius: 14, borderWidth: 1.5, borderColor: border, padding: 20, gap: 16, marginTop: 8 },
  customCardTitle: { fontSize: 15, fontWeight: '700', color: navy },
  dateRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRowLabel: { fontSize: 13, fontWeight: '600', color: textSec, width: 36 },
  dateRowCtrl:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  dateBtnDim: { backgroundColor: '#D1D5DB' },
  dateBtnText:{ color: white, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  dateVal:    { fontSize: 14, fontWeight: '600', color: navy, minWidth: 120, textAlign: 'center' },

  // Food pref
  toggleRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: surface, borderRadius: 14, padding: 16, gap: 12, marginBottom: 20, borderWidth: 1.5, borderColor: border },
  toggleRowOn:  { borderColor: gold, backgroundColor: '#FFFBEB' },
  toggleIcon:   { fontSize: 22 },
  toggleLabel:  { fontSize: 15, fontWeight: '600', color: textColor },
  toggleSub:    { fontSize: 12, color: textSec, marginTop: 2 },
  switchTrack:  { width: 44, height: 24, borderRadius: 12, backgroundColor: border, padding: 2 },
  switchTrackOn:{ backgroundColor: gold },
  switchKnob:   { width: 20, height: 20, borderRadius: 10, backgroundColor: white },
  switchKnobOn: { transform: [{ translateX: 20 }] },

  foodCards:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  foodCard:      { flex: 1, backgroundColor: surface, borderRadius: 14, borderWidth: 1.5, borderColor: border, height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  foodCardActive:{ backgroundColor: '#EEF2FF', borderColor: navy },
  foodCardIcon:  { fontSize: 28 },
  foodCardLabel: { fontSize: 13, fontWeight: '600', color: textSec, textAlign: 'center', paddingHorizontal: 4 },
  foodCardLabelActive: { color: navy, fontWeight: '700' },

  // Meal prefs
  mealPrefSection:{ marginBottom: 24 },
  mealPrefHeader: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 10 },

  // Generating
  genScreen: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24, flex: 1, width: '100%' },
  genTitle:  { fontSize: 18, fontWeight: '800', color: navy, textAlign: 'center', marginTop: 24 },
  genSub:    { fontSize: 14, color: textSec, textAlign: 'center', marginTop: 8 },
  dotRow:    { flexDirection: 'row', gap: 8, marginTop: 24 },
  dot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: gold },

  // Selection
  dayCard:       { backgroundColor: white, borderRadius: 16, borderWidth: 1.5, borderColor: border, marginBottom: 16, overflow: 'hidden' },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: surface },
  dayCardDay:    { fontSize: 15, fontWeight: '700', color: navy },
  dayCardDate:   { fontSize: 12, color: textSec, marginTop: 2 },
  dayCardArrow:  { fontSize: 13, color: textSec },

  slotBlock:  { padding: 16, borderTopWidth: 1, borderTopColor: border },
  slotLabel:  { fontSize: 13, fontWeight: '700', color: textSec, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  optCard:       { backgroundColor: surface, borderRadius: 12, borderWidth: 1.5, borderColor: border, marginBottom: 10, overflow: 'hidden' },
  optCardActive: { borderColor: navy, backgroundColor: '#EEF2FF' },
  optCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  radioOn:       { borderColor: navy },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: navy },
  optName:       { fontSize: 14, fontWeight: '500', color: textColor },
  optNum:        { fontSize: 12, color: textSec, fontWeight: '600' },

  tagRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag:       { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText:   { fontSize: 10, color: peacock, fontWeight: '600' },
  tagRed:    { backgroundColor: '#FFEBEE' },
  tagTextRed:{ color: '#C62828' },

  viewRecipeBtn: { paddingHorizontal: 12, paddingBottom: 10 },
  viewRecipeText:{ fontSize: 13, color: gold, fontWeight: '600' },

  inlineRecipe: { paddingHorizontal: 12, paddingBottom: 12, backgroundColor: white, borderTopWidth: 1, borderTopColor: border },
  recipeSection:{ fontSize: 12, fontWeight: '700', color: navy, marginTop: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  recipeItem:   { fontSize: 13, color: textSec, lineHeight: 20, marginBottom: 2 },

  floatBar:   { backgroundColor: surface, borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginTop: 8, marginBottom: 16, gap: 12 },
  floatCount: { fontSize: 14, color: textSec, textAlign: 'center', fontWeight: '600' },

  // Recipes
  dishCheckRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: surface, borderRadius: 12, borderWidth: 1.5, borderColor: border, marginBottom: 8, gap: 12 },
  dishCheckRowActive: { borderColor: navy, backgroundColor: '#EEF2FF' },
  checkbox:           { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive:     { backgroundColor: navy, borderColor: navy },
  checkmark:          { color: white, fontSize: 13, fontWeight: '800' },
  dishCheckName:      { fontSize: 14, fontWeight: '500', color: textColor, flex: 1 },

  recipeCard:     { backgroundColor: white, borderRadius: 14, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 16 },
  recipeCardName: { fontSize: 17, fontWeight: '800', color: navy, marginBottom: 4 },
  recipeCardTags: { fontSize: 13, color: textSec, marginBottom: 8, fontStyle: 'italic' },

  // Grocery
  groceryActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  groceryActionBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: surface },
  groceryActionText:{ fontSize: 13, color: navy, fontWeight: '600' },
  groceryCat:      { marginBottom: 20 },
  groceryCatTitle: { fontSize: 14, fontWeight: '700', color: navy, marginBottom: 6 },
  groceryCatDivider:{ height: 1, backgroundColor: border, marginBottom: 8 },
  groceryRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  groceryRowBorder:{ borderBottomWidth: 1, borderBottomColor: border },
  groceryName:     { fontSize: 14, color: textColor },
  emptyBox:        { backgroundColor: surface, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText:       { fontSize: 14, color: textSec, textAlign: 'center' },

  // Feedback
  feedbackCard:  { backgroundColor: surface, borderRadius: 12, borderWidth: 1.5, borderColor: border, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackDish:  { fontSize: 14, color: navy, fontWeight: '600', flex: 1 },
  feedbackBtns:  { flexDirection: 'row', gap: 10 },
  thumbBtn:      { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: white },
  thumbUp:       { backgroundColor: '#E8F5E9', borderColor: successGreen },
  thumbDown:     { backgroundColor: '#FFEBEE', borderColor: errorRed },
  thumbText:     { fontSize: 20 },

  doneScreen: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  doneEmoji:  { fontSize: 64, marginBottom: 16 },
  doneTitle:  { fontSize: 28, fontWeight: '900', color: navy, marginBottom: 8 },
  doneSub:    { fontSize: 15, color: textSec, textAlign: 'center', marginBottom: 32, lineHeight: 22 },

  skipLink:     { alignSelf: 'center', paddingVertical: 12 },
  skipLinkText: { fontSize: 13, color: textSec },

});

