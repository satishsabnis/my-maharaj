import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { generateMealPlan, MealOption, MealPlanDay, emptyHealthFlags, HealthFlags } from '../lib/ai';
import { darkGray, errorRed, gold, midGray, navy, white } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep =
  | 'period' | 'tiffin' | 'food-pref' | 'veg-type' | 'nonveg-options'
  | 'unwell' | 'nutrition' | 'generating' | 'generating-error'
  | 'selection' | 'recipes' | 'grocery' | 'feedback';

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
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function fmt(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function fmtLong(d: Date) { return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`; }

// ─── Grocery helpers ──────────────────────────────────────────────────────────

const VEGGIE_KW = ['onion','tomato','potato','spinach','cabbage','carrot','pea','bean','capsicum','brinjal','okra','bhindi','gourd','methi','palak','mushroom','corn','garlic','ginger','chili','chilli','lemon','coriander leave','curry leave','radish','turnip','cauliflower','eggplant','zucchini','pumpkin'];
const PROTEIN_KW = ['chicken','fish','mutton','egg','paneer','tofu','dal','lentil','chickpea','chana','rajma','kidney','moong','toor','urad','soy','prawn','shrimp','crab'];
const SPICE_KW = ['turmeric','cumin','coriander powder','chili powder','chilli powder','garam masala','pepper','cardamom','clove','cinnamon','bay','mustard seed','fenugreek','asafoetida','hing','masala','paprika','kasuri','sesame','saffron','star anise','nutmeg','mace'];
const DAIRY_KW = ['milk','curd','yogurt','ghee','butter','cream','cheese','buttermilk','chaas','condensed','paneer'];

function categorise(name: string): 'Vegetables' | 'Protein' | 'Spices' | 'Dairy' | 'Pantry' {
  const n = name.toLowerCase();
  if (PROTEIN_KW.some((k) => n.includes(k))) return 'Protein';
  if (DAIRY_KW.some((k) => n.includes(k))) return 'Dairy';
  if (VEGGIE_KW.some((k) => n.includes(k))) return 'Vegetables';
  if (SPICE_KW.some((k) => n.includes(k))) return 'Spices';
  return 'Pantry';
}

const CATEGORY_ICONS: Record<string, string> = {
  Vegetables: '🥦', Protein: '🥩', Spices: '🌶️', Dairy: '🥛', Pantry: '🫙',
};

// ─── Wizard progress steps ────────────────────────────────────────────────────

const PROGRESS_STEPS = ['Period', 'Food', 'Health', 'Generate', 'Select', 'Finish'];
function stepToProgress(step: WizardStep): number {
  if (['period','tiffin'].includes(step)) return 0;
  if (['food-pref','veg-type','nonveg-options'].includes(step)) return 1;
  if (['unwell','nutrition'].includes(step)) return 2;
  if (['generating','generating-error'].includes(step)) return 3;
  if (step === 'selection') return 4;
  return 5;
}


// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function MealWizardScreen() {
  const [step, setStep] = useState<WizardStep>('period');
  const [error, setError] = useState('');

  // Step 1 – Period
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(null);
  const [selectedTo, setSelectedTo] = useState<Date | null>(null);
  const [pickerFrom, setPickerFrom] = useState(startOfDay(new Date()));
  const [pickerTo, setPickerTo] = useState(addDays(startOfDay(new Date()), 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 1b – Tiffin
  const [includeTiffin, setIncludeTiffin] = useState(false);
  const [tiffinMemberIds, setTiffinMemberIds] = useState<string[]>([]);
  const [tiffinRestrictions, setTiffinRestrictions] = useState('');

  // Step 2 – Food preference
  const [foodPref, setFoodPref] = useState<'veg' | 'nonveg' | null>(null);
  const [vegType, setVegType] = useState<'normal' | 'fasting' | null>(null);
  const [nonVegOpts, setNonVegOpts] = useState<string[]>([]);
  const [includeDessert, setIncludeDessert] = useState(false);

  // Step 3 – Unwell
  const [familyMembers, setFamilyMembers] = useState<DBMember[]>([]);
  const [unwellIds, setUnwellIds] = useState<string[]>([]);

  // Step 4 – Nutrition
  const [nutritionFocus, setNutritionFocus] = useState('Balanced');

  // Generation
  const [generatedPlan, setGeneratedPlan] = useState<MealPlanDay[] | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Step 6 – Selection
  // selections[dayIdx][slot] = optionIdx (0/1/2)
  const [selections, setSelections] = useState<Record<number, Record<MealSlotKey, number>>>({});
  // expandedRecipe: key = `${dayIdx}-${slot}-${optIdx}`
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  // Step 7 – Recipes
  const [recipeDishes, setRecipeDishes] = useState<string[]>([]);

  // Step 8 – Grocery + Feedback
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [step]);

  // Load family members for unwell step
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('family_members').select('id, name, age').eq('user_id', user.id);
      setFamilyMembers((data as DBMember[]) ?? []);
    }
    void load();
  }, []);

  // Pulse animation during generation
  useEffect(() => {
    if (step !== 'generating') return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [step]);

  // ── Generation ────────────────────────────────────────────────────────────

  const runGeneration = useCallback(async () => {
    if (!selectedFrom || !selectedTo || !foodPref) return;
    setError('');
    setStep('generating');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_diabetic,has_bp,has_pcos,breakfast_count,lunch_count,dinner_count,appetite_level,app_language')
        .eq('id', user.id)
        .maybeSingle();

      const { data: memberRows } = await supabase
        .from('family_members')
        .select('is_diabetic,has_bp,has_pcos,other_conditions')
        .eq('user_id', user.id);

      const aggFlags = (memberRows ?? []).reduce(
        (acc: HealthFlags, m: { is_diabetic: boolean; has_bp: boolean; has_pcos: boolean; other_conditions: string | null }) => {
          let otherConds: string[] = [];
          try { if (m.other_conditions) otherConds = JSON.parse(m.other_conditions); } catch { /* ignore */ }
          return {
            diabetic: acc.diabetic || m.is_diabetic,
            bp: acc.bp || m.has_bp,
            pcos: acc.pcos || m.has_pcos,
            cholesterol: acc.cholesterol || otherConds.includes('Cholesterol'),
            thyroid: acc.thyroid || otherConds.includes('Thyroid'),
            kidneyDisease: acc.kidneyDisease || otherConds.includes('Kidney Disease'),
            heartDisease: acc.heartDisease || otherConds.includes('Heart Disease'),
            obesity: acc.obesity || otherConds.includes('Obesity'),
            anaemia: acc.anaemia || otherConds.includes('Anaemia'),
            lactoseIntolerant: acc.lactoseIntolerant || otherConds.includes('Lactose Intolerant'),
            glutenIntolerant: acc.glutenIntolerant || otherConds.includes('Gluten Intolerant'),
          };
        },
        {
          ...emptyHealthFlags(),
          diabetic: profile?.is_diabetic ?? false,
          bp: profile?.has_bp ?? false,
          pcos: profile?.has_pcos ?? false,
        }
      );

      const { data: cuisineData } = await supabase
        .from('cuisine_preferences')
        .select('cuisine_name')
        .eq('user_id', user.id)
        .eq('is_excluded', false);
      const cuisines = (cuisineData ?? []).map((r: { cuisine_name: string }) => r.cuisine_name);
      const cuisine = cuisines.length > 0 ? cuisines[Math.floor(Math.random() * cuisines.length)] : 'Konkani';

      const since = toYMD(addDays(new Date(), -14));
      const { data: historyData } = await supabase
        .from('dish_history')
        .select('dish_name')
        .eq('user_id', user.id)
        .gte('served_date', since);
      const dishHistory = (historyData ?? []).map((r: { dish_name: string }) => r.dish_name);

      const unwellNames = familyMembers
        .filter((m) => unwellIds.includes(m.id))
        .map((m) => m.name);

      const tiffinNames = includeTiffin
        ? familyMembers.filter((m) => tiffinMemberIds.includes(m.id)).map((m) => m.name)
        : [];

      setGeneratingProgress(null);
      const plan = await generateMealPlan({
        userId: user.id,
        dates: getDates(selectedFrom, selectedTo),
        healthFlags: aggFlags,
        servings: {
          breakfast: profile?.breakfast_count ?? 2,
          lunch: profile?.lunch_count ?? 2,
          dinner: profile?.dinner_count ?? 2,
        },
        appetite: profile?.appetite_level ?? 'Normal',
        language: profile?.app_language ?? 'en',
        cuisine,
        dishHistory,
        foodPrefs: {
          type: foodPref,
          vegType: vegType ?? undefined,
          nonVegOptions: nonVegOpts.length > 0 ? nonVegOpts : undefined,
        },
        unwellMembers: unwellNames.length > 0 ? unwellNames : undefined,
        nutritionFocus: nutritionFocus !== 'Balanced' ? nutritionFocus : undefined,
        includeTiffin,
        tiffinMembers: tiffinNames.length > 0 ? tiffinNames : undefined,
        tiffinRestrictions: tiffinRestrictions || undefined,
        includeDessert,
      }, (current, total) => setGeneratingProgress({ current, total }));

      // Default: select option 0 for all slots
      const defaultSelections: Record<number, Record<MealSlotKey, number>> = {};
      plan.days.forEach((_, i) => {
        defaultSelections[i] = { breakfast: 0, lunch: 0, dinner: 0 };
      });

      setGeneratedPlan(plan.days);
      setSelections(defaultSelections);
      setStep('selection');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      setError(`One moment — Maharaj is still thinking. ${msg}`);
      setStep('generating-error');
    }
  }, [selectedFrom, selectedTo, foodPref, vegType, nonVegOpts, familyMembers, unwellIds, nutritionFocus, includeTiffin, tiffinMemberIds, tiffinRestrictions, includeDessert]);

  useEffect(() => {
    if (step === 'generating') void runGeneration();
  }, [step]);

  // ── Get selected option ───────────────────────────────────────────────────

  function getSelectedOption(dayIdx: number, slot: MealSlotKey): MealOption | null {
    if (!generatedPlan) return null;
    const day = generatedPlan[dayIdx];
    const optIdx = selections[dayIdx]?.[slot] ?? 0;
    return day[slot].options[optIdx] ?? null;
  }

  // ── Build grocery list ────────────────────────────────────────────────────

  function buildGroceryList(): Record<string, { name: string; qty: string; unit: string }[]> {
    if (!generatedPlan) return {};
    const seen = new Set<string>();
    const slots: MealSlotKey[] = ['breakfast', 'lunch', 'dinner'];
    const grouped: Record<string, { name: string; qty: string; unit: string }[]> = {};
    generatedPlan.forEach((_, dayIdx) => {
      slots.forEach((slot) => {
        const opt = getSelectedOption(dayIdx, slot);
        opt?.ingredients.forEach((ing) => {
          // ingredients are strings like "Poha 1 cup"
          const key = ing.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            const cat = categorise(ing);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ name: ing, qty: '', unit: '' });
          }
        });
      });
    });
    return grouped;
  }

  // ── Build feedback entries from selections ────────────────────────────────

  function buildFeedbackEntries(): FeedbackEntry[] {
    if (!generatedPlan) return [];
    const entries: FeedbackEntry[] = [];
    const slots: MealSlotKey[] = ['breakfast', 'lunch', 'dinner'];
    generatedPlan.forEach((_, dayIdx) => {
      slots.forEach((slot) => {
        const opt = getSelectedOption(dayIdx, slot);
        if (opt) entries.push({ dishName: opt.name, rating: null, comment: '' });
      });
    });
    return entries;
  }

  // ── Save to Supabase ──────────────────────────────────────────────────────

  async function saveToHistory(recipesGenerated: boolean, groceryGenerated: boolean) {
    if (!generatedPlan || !selectedFrom || !selectedTo) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedMenu = generatedPlan.map((day, dayIdx) => ({
      date: day.date,
      day: day.day,
      breakfast: getSelectedOption(dayIdx, 'breakfast'),
      lunch: getSelectedOption(dayIdx, 'lunch'),
      dinner: getSelectedOption(dayIdx, 'dinner'),
    }));

    const dishRows = generatedPlan.flatMap((day, dayIdx) => {
      const slots: MealSlotKey[] = ['breakfast', 'lunch', 'dinner'];
      return slots.map((slot) => {
        const opt = getSelectedOption(dayIdx, slot);
        return opt ? { user_id: user.id, dish_name: opt.name, served_date: day.date, meal_type: slot } : null;
      }).filter(Boolean);
    });

    await Promise.all([
      supabase.from('menu_history').insert({
        user_id: user.id,
        period_type: selectedFrom === selectedTo ? 'single' : 'range',
        period_start: toYMD(selectedFrom),
        period_end: toYMD(selectedTo),
        cuisine: 'Various',
        food_pref: foodPref === 'veg' ? (vegType ?? 'normal') : `nonveg:${nonVegOpts.join(',')}`,
        dietary_notes: unwellIds.length > 0 ? `Unwell: ${familyMembers.filter(m => unwellIds.includes(m.id)).map(m => m.name).join(', ')}` : null,
        menu_json: { days: selectedMenu },
        recipes_generated: recipesGenerated,
        grocery_generated: groceryGenerated,
      }),
      dishRows.length > 0 ? supabase.from('dish_history').insert(dishRows) : Promise.resolve(),
    ]);
  }

  async function submitFeedback() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = feedbacks
      .filter((f) => f.rating !== null)
      .map((f) => ({ user_id: user.id, dish_name: f.dishName, rating: f.rating, comment: f.comment || null }));
    if (rows.length > 0) await supabase.from('meal_feedback').insert(rows);
    setFeedbackSubmitted(true);
  }

  // ── WhatsApp share ────────────────────────────────────────────────────────

  function shareWhatsApp(grocery: Record<string, { name: string; qty: string; unit: string }[]>) {
    const text = buildGroceryText(grocery);
    const url = Platform.OS === 'web'
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;
    void Linking.openURL(url);
  }

  async function copyGrocery(grocery: Record<string, { name: string; qty: string; unit: string }[]>) {
    const text = buildGroceryText(grocery);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* silent */ }
  }

  // ─── Render steps ─────────────────────────────────────────────────────────

  function renderPeriod() {
    const today = startOfDay(new Date());
    const periodCards = [
      { label: 'Today', icon: '📅', fn: () => { setSelectedFrom(today); setSelectedTo(today); setShowDatePicker(false); advance('tiffin'); } },
      { label: 'Tomorrow', icon: '📆', fn: () => { const t = addDays(today, 1); setSelectedFrom(t); setSelectedTo(t); advance('tiffin'); } },
      { label: 'This Week\n(Sun–Sat)', icon: '🗓️', fn: () => { const { start, end } = getWeekRange(0); setSelectedFrom(start); setSelectedTo(end); advance('tiffin'); } },
      { label: 'Next Week', icon: '📋', fn: () => { const { start, end } = getWeekRange(1); setSelectedFrom(start); setSelectedTo(end); advance('tiffin'); } },
      { label: 'Choose Dates', icon: '🔢', fn: () => setShowDatePicker(true) },
    ];
    return (
      <View>
        <Text style={s.stepTitle}>When would you like me to plan?</Text>
        <View style={s.periodGrid}>
          {periodCards.map((card) => (
            <TouchableOpacity key={card.label} style={[s.periodCard, showDatePicker && card.label === 'Choose Dates' && s.periodCardActive]} onPress={card.fn} activeOpacity={0.8}>
              <Text style={s.periodCardIcon}>{card.icon}</Text>
              <Text style={s.periodCardLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showDatePicker && (
          <View style={s.datePickerCard}>
            <Text style={s.datePickerTitle}>Select Date Range</Text>
            <DateRow label="From" date={pickerFrom} onDecrement={() => { const n = addDays(pickerFrom, -1); if (n >= today) { setPickerFrom(n); if (pickerTo <= n) setPickerTo(addDays(n, 1)); } }} onIncrement={() => { const n = addDays(pickerFrom, 1); setPickerFrom(n); if (pickerTo <= n) setPickerTo(addDays(n, 1)); }} canDecrement={pickerFrom > today} />
            <DateRow label="To" date={pickerTo} onDecrement={() => { const n = addDays(pickerTo, -1); if (n > pickerFrom) setPickerTo(n); }} onIncrement={() => setPickerTo(addDays(pickerTo, 1))} canDecrement={addDays(pickerTo, -1) > pickerFrom} />
            <TouchableOpacity style={s.goldBtn} onPress={() => { setSelectedFrom(pickerFrom); setSelectedTo(pickerTo); advance('tiffin'); }}>
              <Text style={s.goldBtnText}>Plan {fmt(pickerFrom)} → {fmt(pickerTo)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function renderTiffin() {
    return (
      <View>
        <Text style={s.stepTitle}>Tiffin / Lunchbox?</Text>
        <Text style={s.stepSub}>Do you need pack-friendly lunchbox meals for school or work?</Text>

        {!includeTiffin ? (
          <View style={s.prefCards}>
            <TouchableOpacity style={s.prefCard} onPress={() => setIncludeTiffin(true)} activeOpacity={0.85}>
              <Text style={s.prefIcon}>🥡</Text>
              <Text style={s.prefLabel}>Yes, include Tiffin</Text>
              <Text style={s.prefDesc}>Pack-friendly meals for school/work</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.prefCard} onPress={() => advance('food-pref')} activeOpacity={0.85}>
              <Text style={s.prefIcon}>🍽️</Text>
              <Text style={s.prefLabel}>No, skip Tiffin</Text>
              <Text style={s.prefDesc}>Only breakfast, lunch & dinner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {familyMembers.length > 0 && (
              <>
                <Text style={s.stepSub}>Who needs tiffin?</Text>
                <View style={s.memberCheckList}>
                  {familyMembers.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[s.memberCheckRow, tiffinMemberIds.includes(m.id) && s.memberCheckRowActive]}
                      onPress={() => setTiffinMemberIds((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id])}
                      activeOpacity={0.8}
                    >
                      <View style={[s.checkbox, tiffinMemberIds.includes(m.id) && s.checkboxActive]}>
                        {tiffinMemberIds.includes(m.id) && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <Text style={s.memberCheckName}>{m.name}</Text>
                      <Text style={s.memberCheckAge}>{m.age} yrs</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <Text style={s.fieldLabel}>Tiffin restrictions (optional)</Text>
            <TextInput
              style={s.tiffinInput}
              value={tiffinRestrictions}
              onChangeText={setTiffinRestrictions}
              placeholder="e.g. No onion garlic, no messy items, nut-free"
              placeholderTextColor={midGray}
            />
            <TouchableOpacity style={s.goldBtn} onPress={() => advance('food-pref')}>
              <Text style={s.goldBtnText}>Continue →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.skipLink} onPress={() => { setIncludeTiffin(false); setTiffinMemberIds([]); setTiffinRestrictions(''); advance('food-pref'); }}>
              <Text style={s.skipLinkText}>Cancel tiffin</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function renderFoodPref() {
    return (
      <View>
        <Text style={s.stepTitle}>What is your food preference?</Text>
        {selectedFrom && <Text style={s.stepSub}>{fmtLong(selectedFrom)}{selectedTo && selectedTo !== selectedFrom ? ` – ${fmtLong(selectedTo)}` : ''}</Text>}

        {/* Dessert toggle */}
        <TouchableOpacity
          style={[s.toggleRow, includeDessert && s.toggleRowActive]}
          onPress={() => setIncludeDessert((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={s.toggleRowIcon}>🍮</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.toggleRowLabel, includeDessert && { color: navy }]}>Include Desserts</Text>
            <Text style={s.toggleRowDesc}>Sunday festive sweets · Weekday quick treats</Text>
          </View>
          <View style={[s.toggleSwitch, includeDessert && s.toggleSwitchOn]}>
            <View style={[s.toggleKnob, includeDessert && s.toggleKnobOn]} />
          </View>
        </TouchableOpacity>

        <View style={s.prefCards}>
          <TouchableOpacity style={s.prefCard} onPress={() => { setFoodPref('veg'); setStep('veg-type'); }} activeOpacity={0.85}>
            <Text style={s.prefIcon}>🥗</Text>
            <Text style={s.prefLabel}>Vegetarian</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.prefCard} onPress={() => { setFoodPref('nonveg'); setNonVegOpts([]); setStep('nonveg-options'); }} activeOpacity={0.85}>
            <Text style={s.prefIcon}>🍗</Text>
            <Text style={s.prefLabel}>Non-Vegetarian</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderVegType() {
    return (
      <View>
        <Text style={s.stepTitle}>What type of vegetarian?</Text>
        <View style={s.prefCards}>
          <TouchableOpacity style={s.prefCard} onPress={() => { setVegType('normal'); advance('unwell'); }} activeOpacity={0.85}>
            <Text style={s.prefIcon}>🥗</Text>
            <Text style={s.prefLabel}>Normal Vegetarian</Text>
            <Text style={s.prefDesc}>Onion & garlic allowed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.prefCard} onPress={() => { setVegType('fasting'); advance('unwell'); }} activeOpacity={0.85}>
            <Text style={s.prefIcon}>🙏</Text>
            <Text style={s.prefLabel}>Fasting / Upvas</Text>
            <Text style={s.prefDesc}>Sabudana, rajgira, sama rice</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderNonVegOptions() {
    const opts = ['Eggs 🥚', 'Fish 🐟', 'Chicken 🍗', 'Mutton 🐑'];
    return (
      <View>
        <Text style={s.stepTitle}>Which options do you eat?</Text>
        <Text style={s.stepSub}>Select all that apply</Text>
        <View style={s.chipRow}>
          {opts.map((o) => (
            <TouchableOpacity key={o} style={[s.chip, nonVegOpts.includes(o) && s.chipActive]} onPress={() => setNonVegOpts((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])} activeOpacity={0.8}>
              <Text style={[s.chipText, nonVegOpts.includes(o) && s.chipTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[s.goldBtn, nonVegOpts.length === 0 && { opacity: 0.4 }]} onPress={() => { if (nonVegOpts.length > 0) advance('unwell'); }} disabled={nonVegOpts.length === 0}>
          <Text style={s.goldBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderUnwell() {
    return (
      <View>
        <Text style={s.stepTitle}>Is anyone feeling unwell?</Text>
        <Text style={s.stepSub}>Maharaj will include light recovery meal options for them</Text>
        {familyMembers.length === 0 ? (
          <Text style={s.emptyNote}>No family members added yet — you can add them in Dietary Profile.</Text>
        ) : (
          <View style={s.memberCheckList}>
            {familyMembers.map((m) => (
              <TouchableOpacity key={m.id} style={[s.memberCheckRow, unwellIds.includes(m.id) && s.memberCheckRowActive]} onPress={() => setUnwellIds((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id])} activeOpacity={0.8}>
                <View style={[s.checkbox, unwellIds.includes(m.id) && s.checkboxActive]}>
                  {unwellIds.includes(m.id) && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.memberCheckName}>{m.name}</Text>
                <Text style={s.memberCheckAge}>{m.age} yrs</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity style={s.goldBtn} onPress={() => advance('nutrition')}>
          <Text style={s.goldBtnText}>{unwellIds.length > 0 ? `Continue (${unwellIds.length} selected)` : 'No, everyone is fine →'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderNutrition() {
    const options = ['Balanced', 'Low Calorie', 'Keto', 'High Protein', 'Less Oil / Low Fat', 'High Fibre', 'Doctor Recommended', 'Weight Loss', 'Weight Gain / Muscle Building'];
    const descs: Record<string, string> = {
      'Balanced': 'Recommended · All macros in healthy proportions',
      'Low Calorie': 'Under 1400 kcal/day · Small portions, high-volume vegetables',
      'Keto': 'Very low carb (< 50g/day) · High fat, moderate protein · No rice/bread',
      'High Protein': 'Protein at every meal · Dal, paneer, eggs, lean meats, seeds',
      'Less Oil / Low Fat': 'Max 2 tsp oil/day · Steam, bake or air-fry everything',
      'High Fibre': 'Whole grains, raw vegetables, legumes · Min 35g fibre/day',
      'Doctor Recommended': 'Strictly follows all your health profiles — diabetic, BP, PCOS and other conditions',
      'Weight Loss': 'Caloric deficit · Low GI · No refined carbs · High protein to preserve muscle',
      'Weight Gain / Muscle Building': 'Caloric surplus · High protein + complex carbs · Healthy fats · 5–6 meals/day',
    };
    return (
      <View>
        <Text style={s.stepTitle}>Nutritional Focus</Text>
        <Text style={s.stepSub}>How would you like your meals balanced?</Text>
        {options.map((opt) => (
          <TouchableOpacity key={opt} style={[s.nutritionCard, nutritionFocus === opt && s.nutritionCardActive]} onPress={() => setNutritionFocus(opt)} activeOpacity={0.85}>
            <View style={[s.radio, nutritionFocus === opt && s.radioActive]}>
              {nutritionFocus === opt && <View style={s.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.nutritionLabel, nutritionFocus === opt && { color: navy, fontWeight: '700' }]}>{opt}</Text>
              <Text style={s.nutritionDesc}>{descs[opt]}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {error ? <Text style={s.errorText}>{error}</Text> : null}
        <TouchableOpacity style={s.goldBtn} onPress={() => { setError(''); setStep('generating'); }}>
          <Text style={s.goldBtnText}>🍳 Generate My Meal Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderGenerating() {
    return (
      <View style={s.generatingScreen}>
        <Animated.View style={[s.pulseLogo, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={s.pulseLogoText}>M</Text>
        </Animated.View>
        <Text style={s.generatingTitle}>Maharaj is cooking up your plan...</Text>
        {generatingProgress ? (
          <Text style={s.generatingSubtitle}>
            Generating day {generatingProgress.current} of {generatingProgress.total}... please wait
          </Text>
        ) : (
          <Text style={s.generatingSubtitle}>Starting up — please wait</Text>
        )}
        <View style={s.dotRow}>
          {[0, 1, 2].map((i) => <View key={i} style={[s.dot, { opacity: 0.3 + i * 0.3 }]} />)}
        </View>
      </View>
    );
  }

  function renderGeneratingError() {
    return (
      <View style={s.generatingScreen}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🍳</Text>
        <Text style={s.generatingTitle}>One moment — Maharaj is still thinking.</Text>
        <Text style={[s.generatingSubtitle, { textAlign: 'center', paddingHorizontal: 32, marginTop: 8 }]}>
          {error || 'The meal plan could not be generated. Please try again.'}
        </Text>
        <TouchableOpacity
          style={[s.goldBtn, { marginTop: 32, paddingHorizontal: 40 }]}
          onPress={() => { setError(''); setStep('generating'); }}
          activeOpacity={0.85}
        >
          <Text style={s.goldBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.skipLink, { marginTop: 8 }]}
          onPress={() => { setError(''); setStep('nutrition'); }}
        >
          <Text style={s.skipLinkText}>← Back to settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSelection() {
    if (!generatedPlan) return null;
    const slots: { key: MealSlotKey; icon: string; label: string }[] = [
      { key: 'breakfast', icon: '🌅', label: 'Breakfast' },
      { key: 'lunch', icon: '☀️', label: 'Lunch' },
      { key: 'dinner', icon: '🌙', label: 'Dinner' },
    ];

    function toggleRecipe(key: string) {
      setExpandedRecipes((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    return (
      <View>
        <Text style={s.stepTitle}>Choose Your Meals</Text>
        <Text style={s.stepSub}>Select one option per meal — tap "View Recipe" to see full details</Text>
        {generatedPlan.map((day, dayIdx) => (
          <View key={day.date} style={s.dayCard}>
            <View style={s.dayCardHeader}>
              <Text style={s.dayCardDay}>{day.day}</Text>
              <Text style={s.dayCardDate}>{day.date}</Text>
            </View>
            {slots.map(({ key, icon, label }) => (
              <View key={key} style={s.slotBlock}>
                <Text style={s.slotLabel}>{icon} {label}</Text>
                {day[key].options.map((opt, optIdx) => {
                  const recipeKey = `${dayIdx}-${key}-${optIdx}`;
                  const isSelected = selections[dayIdx]?.[key] === optIdx;
                  const isExpanded = expandedRecipes[recipeKey];
                  return (
                    <View key={optIdx} style={[s.optionCard, isSelected && s.optionCardActive]}>
                      {/* Header row: radio + name */}
                      <TouchableOpacity
                        style={s.optionCardHeader}
                        onPress={() => setSelections((prev) => ({ ...prev, [dayIdx]: { ...(prev[dayIdx] ?? { breakfast: 0, lunch: 0, dinner: 0 }), [key]: optIdx } }))}
                        activeOpacity={0.8}
                      >
                        <View style={[s.radioSmall, isSelected && s.radioSmallActive]}>
                          {isSelected && <View style={s.radioDotSmall} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.optionName, isSelected && { color: navy, fontWeight: '700' }]}>{opt.name}</Text>
                          {opt.tags.length > 0 && (
                            <View style={s.tagRow}>
                              {opt.tags.slice(0, 2).map((tag) => (
                                <View key={tag} style={s.tagPill}><Text style={s.tagPillText}>{tag}</Text></View>
                              ))}
                            </View>
                          )}
                        </View>
                        <Text style={s.optionNum}>#{optIdx + 1}</Text>
                      </TouchableOpacity>

                      {/* View Recipe toggle */}
                      <TouchableOpacity style={s.viewRecipeBtn} onPress={() => toggleRecipe(recipeKey)} activeOpacity={0.7}>
                        <Text style={s.viewRecipeText}>{isExpanded ? '▲ Hide Recipe' : '▼ View Recipe'}</Text>
                      </TouchableOpacity>

                      {/* Inline recipe */}
                      {isExpanded && (
                        <View style={s.inlineRecipe}>
                          <Text style={s.inlineRecipeSection}>Ingredients</Text>
                          {opt.ingredients.map((ing, i) => (
                            <Text key={i} style={s.inlineRecipeItem}>• {ing}</Text>
                          ))}
                          {opt.steps.length > 0 && (
                            <>
                              <Text style={s.inlineRecipeSection}>Method</Text>
                              {opt.steps.map((step, i) => (
                                <Text key={i} style={s.inlineRecipeItem}>{i + 1}. {step}</Text>
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
        ))}
        <TouchableOpacity style={s.goldBtn} onPress={() => { setRecipeDishes([]); advance('recipes'); }}>
          <Text style={s.goldBtnText}>Confirm My Selections ✓</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderRecipes() {
    if (!generatedPlan) return null;
    const allDishes: string[] = [];
    const slots: MealSlotKey[] = ['breakfast', 'lunch', 'dinner'];
    generatedPlan.forEach((_, dayIdx) => {
      slots.forEach((slot) => {
        const opt = getSelectedOption(dayIdx, slot);
        if (opt && !allDishes.includes(opt.name)) allDishes.push(opt.name);
      });
    });
    const selectedForRecipe = recipeDishes.length > 0
      ? allDishes.filter((d) => recipeDishes.includes(d))
      : [];
    return (
      <View>
        <Text style={s.stepTitle}>Would you like recipes?</Text>
        <Text style={s.stepSub}>Select dishes to get full recipes</Text>
        <View style={{ marginBottom: 16 }}>
          {allDishes.map((dish) => (
            <TouchableOpacity key={dish} style={[s.dishCheckRow, recipeDishes.includes(dish) && s.dishCheckRowActive]} onPress={() => setRecipeDishes((prev) => prev.includes(dish) ? prev.filter((d) => d !== dish) : [...prev, dish])} activeOpacity={0.8}>
              <View style={[s.checkbox, recipeDishes.includes(dish) && s.checkboxActive]}>
                {recipeDishes.includes(dish) && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.dishCheckName}>{dish}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedForRecipe.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            {generatedPlan.flatMap((day, dayIdx) =>
              (['breakfast','lunch','dinner'] as MealSlotKey[]).map((slot) => {
                const opt = getSelectedOption(dayIdx, slot);
                if (!opt || !selectedForRecipe.includes(opt.name)) return null;
                return (
                  <View key={`${dayIdx}-${slot}`} style={s.recipeCard}>
                    <Text style={s.recipeName}>{opt.name}</Text>
                    {opt.tags.length > 0 && <Text style={s.recipeTags}>{opt.tags.join(' · ')}</Text>}
                    <Text style={s.recipeSection}>Ingredients</Text>
                    {opt.ingredients.map((ing, i) => (
                      <Text key={i} style={s.recipeItem}>• {ing}</Text>
                    ))}
                    {opt.steps.length > 0 && (
                      <>
                        <Text style={s.recipeSection}>Method</Text>
                        {opt.steps.map((step, i) => (
                          <Text key={i} style={s.recipeItem}>{i + 1}. {step}</Text>
                        ))}
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        <TouchableOpacity style={s.goldBtn} onPress={() => { void saveToHistory(recipeDishes.length > 0, false); setFeedbacks(buildFeedbackEntries()); advance('grocery'); }}>
          <Text style={s.goldBtnText}>{recipeDishes.length > 0 ? 'Save Recipes & Continue →' : 'Skip Recipes →'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function buildGroceryText(grocery: Record<string, { name: string; qty: string; unit: string }[]>): string {
    const catOrder = ['Vegetables', 'Protein', 'Dairy', 'Spices', 'Pantry'];
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const lines: string[] = ['MY MAHARAJ SHOPPING LIST', `Date: ${today}`, ''];
    catOrder.forEach((cat) => {
      const items = grocery[cat];
      if (!items || items.length === 0) return;
      lines.push(`${CATEGORY_ICONS[cat]} ${cat.toUpperCase()}:`);
      items.forEach((i) => lines.push(`  - ${i.name}`));
      lines.push('');
    });
    return lines.join('\n');
  }

  async function downloadGrocery(grocery: Record<string, { name: string; qty: string; unit: string }[]>) {
    if (Platform.OS !== 'web') return;
    const text = buildGroceryText(grocery);
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MyMaharaj-Shopping-List.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }

  function renderGrocery() {
    const grocery = buildGroceryList();
    const catOrder = ['Vegetables', 'Protein', 'Dairy', 'Spices', 'Pantry'];
    return (
      <View>
        <Text style={s.stepTitle}>🛒 Your Grocery List</Text>
        <Text style={s.stepSub}>All ingredients for your selected meals, grouped by category</Text>

        {/* Action buttons at top */}
        <View style={s.groceryBtns}>
          <TouchableOpacity style={s.copyBtn} onPress={() => void copyGrocery(grocery)} activeOpacity={0.85}>
            <Text style={s.copyBtnText}>📋 Copy List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.waBtn} onPress={() => shareWhatsApp(grocery)} activeOpacity={0.85}>
            <Text style={s.waBtnText}>📱 WhatsApp</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={s.downloadBtn} onPress={() => void downloadGrocery(grocery)} activeOpacity={0.85}>
              <Text style={s.downloadBtnText}>📄 Download</Text>
            </TouchableOpacity>
          )}
        </View>

        {catOrder.map((cat) => {
          const items = grocery[cat];
          if (!items || items.length === 0) return null;
          return (
            <View key={cat} style={s.groceryCat}>
              <Text style={s.groceryCatTitle}>{CATEGORY_ICONS[cat]} {cat}</Text>
              {items.map((item, i) => (
                <View key={i} style={s.groceryRow}>
                  <Text style={s.groceryItem}>{item.name}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* Action buttons at bottom too */}
        <View style={s.groceryBtns}>
          <TouchableOpacity style={s.copyBtn} onPress={() => void copyGrocery(grocery)} activeOpacity={0.85}>
            <Text style={s.copyBtnText}>📋 Copy List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.waBtn} onPress={() => shareWhatsApp(grocery)} activeOpacity={0.85}>
            <Text style={s.waBtnText}>📱 WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.goldBtn} onPress={() => { void saveToHistory(recipeDishes.length > 0, true); advance('feedback'); }}>
          <Text style={s.goldBtnText}>Continue to Feedback →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderFeedback() {
    if (feedbackSubmitted) {
      return (
        <View style={s.bonAppetitWrap}>
          <Text style={s.bonAppetitEmoji}>🙏</Text>
          <Text style={s.bonAppetitTitle}>Bon Appétit!</Text>
          <Text style={s.bonAppetitSub}>Your meal plan is ready. Maharaj wishes your family a delicious week!</Text>
          <TouchableOpacity style={s.goldBtn} onPress={() => router.replace('/home')}>
            <Text style={s.goldBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={s.stepTitle}>How did we do?</Text>
        <Text style={s.stepSub}>Rate each dish — your feedback helps Maharaj improve</Text>
        {feedbacks.map((fb, idx) => (
          <View key={idx} style={s.feedbackRow}>
            <Text style={s.feedbackDish}>{fb.dishName}</Text>
            <View style={s.feedbackRating}>
              <TouchableOpacity style={[s.thumbBtn, fb.rating === 1 && s.thumbBtnUp]} onPress={() => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, rating: 1 } : f))}>
                <Text style={s.thumbText}>👍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.thumbBtn, fb.rating === -1 && s.thumbBtnDown]} onPress={() => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, rating: -1 } : f))}>
                <Text style={s.thumbText}>👎</Text>
              </TouchableOpacity>
            </View>
            {fb.rating !== null && (
              <TextInput
                style={s.feedbackComment}
                value={fb.comment}
                onChangeText={(v) => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, comment: v } : f))}
                placeholder="Optional comment..."
                placeholderTextColor={midGray}
              />
            )}
          </View>
        ))}
        <TouchableOpacity style={s.goldBtn} onPress={() => void submitFeedback()}>
          <Text style={s.goldBtnText}>Submit Feedback & Finish</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipLink} onPress={() => { setFeedbackSubmitted(true); }}>
          <Text style={s.skipLinkText}>Skip feedback</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function advance(next: WizardStep) { setError(''); setStep(next); }

  function goBack() {
    setError('');
    const back: Partial<Record<WizardStep, WizardStep>> = {
      'tiffin': 'period',
      'food-pref': 'tiffin',
      'veg-type': 'food-pref',
      'nonveg-options': 'food-pref',
      'unwell': foodPref === 'veg' ? 'veg-type' : 'nonveg-options',
      'nutrition': 'unwell',
      'selection': 'nutrition',
      'recipes': 'selection',
      'grocery': 'recipes',
      'feedback': 'grocery',
    };
    const prev = back[step];
    if (prev) setStep(prev);
    else router.back();
  }

  const STEP_RENDER: Record<WizardStep, () => React.ReactNode> = {
    'period': renderPeriod,
    'tiffin': renderTiffin,
    'food-pref': renderFoodPref,
    'veg-type': renderVegType,
    'nonveg-options': renderNonVegOptions,
    'unwell': renderUnwell,
    'nutrition': renderNutrition,
    'generating': renderGenerating,
    'generating-error': renderGeneratingError,
    'selection': renderSelection,
    'recipes': renderRecipes,
    'grocery': renderGrocery,
    'feedback': renderFeedback,
  };

  const progIdx = stepToProgress(step);
  const isFullScreen = step === 'generating' || step === 'generating-error';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        {!isFullScreen && (
          <TouchableOpacity onPress={goBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        )}
        <Text style={s.headerTitle}>Meal Plan Wizard</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress */}
      {!isFullScreen && (
        <View style={s.progressBar}>
          {PROGRESS_STEPS.map((label, i) => (
            <View key={label} style={s.progressItem}>
              <View style={[s.progressDot, i < progIdx && s.progressDotDone, i === progIdx && s.progressDotActive]}>
                <Text style={[s.progressDotText, i <= progIdx && s.progressDotTextActive]}>
                  {i < progIdx ? '✓' : String(i + 1)}
                </Text>
              </View>
              <Text style={[s.progressLabel, i === progIdx && s.progressLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {isFullScreen ? (
        <View style={s.flex}>{STEP_RENDER[step]?.()}</View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.container}>
            {STEP_RENDER[step]?.()}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── DateRow helper ───────────────────────────────────────────────────────────

function DateRow({ label, date, onDecrement, onIncrement, canDecrement }: {
  label: string; date: Date;
  onDecrement: () => void; onIncrement: () => void; canDecrement: boolean;
}) {
  return (
    <View style={s.dateRow}>
      <Text style={s.dateRowLabel}>{label}</Text>
      <View style={s.dateStepper}>
        <TouchableOpacity style={[s.stepBtn, !canDecrement && s.stepBtnDisabled]} onPress={onDecrement} disabled={!canDecrement}>
          <Text style={s.stepBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.dateValue}>{fmt(date)}</Text>
        <TouchableOpacity style={s.stepBtn} onPress={onIncrement}>
          <Text style={s.stepBtnText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  flex: { flex: 1 },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 14 },
  backText: { color: white, fontSize: 22, fontWeight: '600', width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },

  progressBar: { flexDirection: 'row', backgroundColor: navy, paddingHorizontal: 8, paddingBottom: 16, justifyContent: 'space-around' },
  progressItem: { alignItems: 'center', gap: 4 },
  progressDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: gold },
  progressDotDone: { backgroundColor: '#16A34A' },
  progressDotText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
  progressDotTextActive: { color: white },
  progressLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  progressLabelActive: { color: white, fontWeight: '700' },

  scroll: { flexGrow: 1 },
  container: { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },

  stepTitle: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 8, marginTop: 8 },
  stepSub: { fontSize: 14, color: midGray, marginBottom: 20, lineHeight: 21 },

  // Period
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  periodCard: { width: '47%', backgroundColor: white, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  periodCardActive: { borderColor: gold },
  periodCardIcon: { fontSize: 28, marginBottom: 8 },
  periodCardLabel: { fontSize: 13, fontWeight: '700', color: navy, textAlign: 'center' },

  // Date picker
  datePickerCard: { backgroundColor: white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  datePickerTitle: { fontSize: 14, fontWeight: '700', color: navy, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateRowLabel: { fontSize: 13, fontWeight: '600', color: darkGray, width: 40 },
  dateStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { backgroundColor: '#D1D5DB' },
  stepBtnText: { color: white, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  dateValue: { fontSize: 13, fontWeight: '600', color: navy, minWidth: 120, textAlign: 'center' },

  // Food pref
  prefCards: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  prefCard: { flex: 1, backgroundColor: white, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  prefIcon: { fontSize: 36, marginBottom: 10 },
  prefLabel: { fontSize: 15, fontWeight: '700', color: navy, textAlign: 'center' },
  prefDesc: { fontSize: 11, color: midGray, textAlign: 'center', marginTop: 4 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  chipActive: { backgroundColor: navy, borderColor: navy },
  chipText: { fontSize: 14, color: darkGray, fontWeight: '500' },
  chipTextActive: { color: white, fontWeight: '600' },

  // Unwell
  memberCheckList: { marginBottom: 16 },
  memberCheckRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: white, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 12 },
  memberCheckRowActive: { borderColor: gold, backgroundColor: '#FFFBEB' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: navy, borderColor: navy },
  checkmark: { color: white, fontSize: 12, fontWeight: '700' },
  memberCheckName: { flex: 1, fontSize: 15, fontWeight: '600', color: navy },
  memberCheckAge: { fontSize: 12, color: midGray },
  emptyNote: { fontSize: 13, color: midGray, textAlign: 'center', marginBottom: 20, lineHeight: 20 },

  // Nutrition
  nutritionCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#E5E7EB', gap: 12 },
  nutritionCardActive: { borderColor: gold, backgroundColor: '#FFFBEB' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioActive: { borderColor: gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: gold },
  nutritionLabel: { fontSize: 14, fontWeight: '600', color: darkGray, marginBottom: 2 },
  nutritionDesc: { fontSize: 12, color: midGray, lineHeight: 18 },

  // Generating
  generatingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB', gap: 20 },
  pulseLogo: { width: 100, height: 100, borderRadius: 50, backgroundColor: gold, alignItems: 'center', justifyContent: 'center', shadowColor: gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
  pulseLogoText: { color: white, fontSize: 48, fontWeight: '900' },
  generatingTitle: { fontSize: 20, fontWeight: '800', color: navy, textAlign: 'center', paddingHorizontal: 32 },
  generatingSubtitle: { fontSize: 14, color: midGray, textAlign: 'center' },
  dotRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: gold },

  // Selection
  dayCard: { backgroundColor: white, borderRadius: 14, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  dayCardHeader: { backgroundColor: navy, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  dayCardDay: { color: white, fontWeight: '700', fontSize: 15 },
  dayCardDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  slotBlock: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  slotLabel: { fontSize: 11, fontWeight: '700', color: midGray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  // Option cards with expandable recipes
  optionCard: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 8, overflow: 'hidden', backgroundColor: '#FAFAFA' },
  optionCardActive: { borderColor: navy, backgroundColor: '#EFF6FF' },
  optionCardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, gap: 8 },
  radioSmall: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  radioSmallActive: { borderColor: navy },
  radioDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: navy },
  optionName: { fontSize: 13, color: darkGray, lineHeight: 19, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  tagPill: { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  tagPillText: { fontSize: 9, color: '#1D4ED8', fontWeight: '600' },
  nutLine: { fontSize: 10, color: midGray, marginTop: 4 },
  optionNum: { fontSize: 11, color: midGray, marginTop: 2 },
  viewRecipeBtn: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#F8FAFC' },
  viewRecipeText: { fontSize: 12, color: navy, fontWeight: '600', textAlign: 'center' },
  inlineRecipe: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, backgroundColor: '#F0F7FF' },
  inlineRecipeSection: { fontSize: 10, fontWeight: '700', color: gold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  inlineRecipeItem: { fontSize: 12, color: darkGray, lineHeight: 20 },

  // Legacy (kept for recipes screen)
  optionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8, marginBottom: 2, gap: 8 },
  optionRowActive: { backgroundColor: '#EFF6FF' },
  optionTags: { fontSize: 10, color: midGray, marginTop: 1 },

  // Recipes
  dishCheckRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: white, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 10 },
  dishCheckRowActive: { borderColor: navy, backgroundColor: '#EFF6FF' },
  dishCheckName: { flex: 1, fontSize: 14, color: darkGray, fontWeight: '500' },
  recipeCard: { backgroundColor: white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  recipeName: { fontSize: 16, fontWeight: '800', color: navy, marginBottom: 4 },
  recipeTags: { fontSize: 11, color: midGray, marginBottom: 12 },
  recipeSection: { fontSize: 11, fontWeight: '700', color: gold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  recipeItem: { fontSize: 13, color: darkGray, lineHeight: 22 },

  // Grocery
  groceryCat: { backgroundColor: white, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  groceryCatTitle: { fontSize: 14, fontWeight: '700', color: navy, marginBottom: 10 },
  groceryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  groceryItem: { fontSize: 13, color: darkGray, flex: 1 },
  groceryQty: { fontSize: 13, color: midGray, fontWeight: '600', textAlign: 'right' },
  groceryBtns: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  waBtn: { flex: 1, backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  waBtnText: { color: white, fontWeight: '700', fontSize: 13 },
  copyBtn: { flex: 1, borderWidth: 1.5, borderColor: navy, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  copyBtnText: { color: navy, fontWeight: '700', fontSize: 13 },
  downloadBtn: { flex: 1, backgroundColor: '#4B5563', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  downloadBtnText: { color: white, fontWeight: '700', fontSize: 13 },

  // Feedback
  feedbackRow: { backgroundColor: white, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  feedbackDish: { fontSize: 14, fontWeight: '600', color: navy, marginBottom: 8 },
  feedbackRating: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  thumbBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: white },
  thumbBtnUp: { backgroundColor: '#D1FAE5', borderColor: '#16A34A' },
  thumbBtnDown: { backgroundColor: '#FEE2E2', borderColor: errorRed },
  thumbText: { fontSize: 20 },
  feedbackComment: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: '#F9FAFB' },

  // Bon appétit
  bonAppetitWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  bonAppetitEmoji: { fontSize: 72, marginBottom: 20 },
  bonAppetitTitle: { fontSize: 30, fontWeight: '900', color: navy, marginBottom: 12 },
  bonAppetitSub: { fontSize: 15, color: midGray, textAlign: 'center', lineHeight: 24, marginBottom: 32 },

  // Tiffin
  tiffinInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', backgroundColor: white, marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: darkGray, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 16, marginBottom: 6 },

  // Dessert toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: white, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 12 },
  toggleRowActive: { borderColor: navy, backgroundColor: '#EFF6FF' },
  toggleRowIcon: { fontSize: 24 },
  toggleRowLabel: { fontSize: 14, fontWeight: '700', color: darkGray, marginBottom: 2 },
  toggleRowDesc: { fontSize: 11, color: midGray },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#D1D5DB', justifyContent: 'center', paddingHorizontal: 2 },
  toggleSwitchOn: { backgroundColor: navy },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: white, alignSelf: 'flex-start' },
  toggleKnobOn: { alignSelf: 'flex-end' },

  // Shared
  goldBtn: { backgroundColor: gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  goldBtnText: { color: white, fontSize: 16, fontWeight: '700' },
  skipLink: { alignItems: 'center', paddingVertical: 12 },
  skipLinkText: { color: midGray, fontSize: 13 },
  errorText: { color: errorRed, fontSize: 13, textAlign: 'center', marginBottom: 12 },
});
