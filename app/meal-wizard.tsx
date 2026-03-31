import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { generateMealPlan, MealOption, MealPlanDay, emptyHealthFlags, HealthFlags } from '../lib/ai';
import { loadOrDetectLocation, UserLocation } from '../lib/location';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { navy, gold, peacock, textSec, errorRed, white, border, surface, textColor, successGreen } from '../theme/colors';


// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep =
  | 'period' | 'food-pref' | 'guest-cuisine' | 'meal-prefs' | 'unwell' | 'veg-days' | 'nutrition' | 'cuisine-confirm'
  | 'generating' | 'generating-error' | 'selection' | 'plan-summary'
  | 'cook-or-order' | 'recipes' | 'grocery' | 'delivery-apps' | 'feedback';

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

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
const CAT_ICONS: Record<GroceryCat, string> = { Vegetables: '', Protein: '', Spices: '', Dairy: '', Pantry: '' };
const CAT_ORDER: GroceryCat[] = ['Vegetables', 'Protein', 'Dairy', 'Spices', 'Pantry'];

// ─── Wizard progress ──────────────────────────────────────────────────────────

const USER_STEPS: WizardStep[] = ['period','food-pref','guest-cuisine','meal-prefs','unwell','veg-days','nutrition','cuisine-confirm'];
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
  const [calMonth,    setCalMonth]    = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [rangeStart,  setRangeStart]  = useState<Date | null>(null);
  const [rangeEnd,    setRangeEnd]    = useState<Date | null>(null);

  // Step 2
  const [foodPref, setFoodPref]   = useState<'veg' | 'nonveg' | null>(null);
  const [isMixed,  setIsMixed]    = useState(false);
  const [vegType,  setVegType]    = useState<'normal' | 'fasting' | null>(null);
  const [nonVegOpts, setNonVegOpts] = useState<string[]>([]);
  const [includeDessert, setIncludeDessert] = useState(false);

  // Step 3
  const [bfPrefs, setBfPrefs]   = useState<string[]>([]);
  const [lnPrefs, setLnPrefs]   = useState<string[]>([]);
  const [dnPrefs, setDnPrefs]   = useState<string[]>([]);
  const [snPrefs, setSnPrefs]   = useState<string[]>([]);

  // Step 4
  const [familyMembers, setFamilyMembers] = useState<DBMember[]>([]);
  const [everyoneWell,  setEveryoneWell]  = useState(true);
  const [unwellIds,     setUnwellIds]     = useState<string[]>([]);

  // Step 5
  const [nutritionGoals, setNutritionGoals] = useState<string[]>([]);
  const [hasGuests,      setHasGuests]      = useState(false);
  const [guestCuisine,   setGuestCuisine]   = useState('');
  const [guestDays,      setGuestDays]      = useState(2);
  const [savedCuisines,  setSavedCuisines]  = useState<string[]>([]);
  const [userLocation,   setUserLocation]   = useState<UserLocation>({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });
  const [selectedSlots,  setSelectedSlots]  = useState<string[]>([]);
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [guestCount,     setGuestCount]     = useState(0);
  const [vegFastDays,    setVegFastDays]    = useState<Record<string, string>>({});
  const [extraCuisines,  setExtraCuisines]  = useState<string[]>([]);
  const [removedCuisines, setRemovedCuisines] = useState<string[]>([]);
  const [perDayCuisine,  setPerDayCuisine]  = useState<Record<string, string>>({});

  // Generation
  const [generatedPlan,     setGeneratedPlan]     = useState<MealPlanDay[] | null>(null);
  const [generatingProgress,setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const [servingsCount, setServingsCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Selection
  const [selections,      setSelections]      = useState<Record<number, Record<MealSlotKey, number>>>({});
  const [expandedDays,    setExpandedDays]    = useState<Record<number, boolean>>({ 0: true });
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
  const [activeDay,       setActiveDay]       = useState(0);

  // Post-selection
  const [recipeDishes, setRecipeDishes] = useState<string[]>([]);
  const [feedbacks,    setFeedbacks]    = useState<FeedbackEntry[]>([]);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [step]);

  useEffect(() => {
    async function load() {
      const user = await getSessionUser();
      if (!user) return;
      const [{ data }, { data: cuisineData }] = await Promise.all([
        supabase.from('family_members').select('id, name, age').eq('user_id', user.id),
        supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
      ]);
      setFamilyMembers((data as DBMember[]) ?? []);
      setSavedCuisines((cuisineData ?? []).map((c: any) => c.cuisine_name));
      loadOrDetectLocation().then(setUserLocation);
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
    console.log('[MealWizard] Generation started. selectedFrom:', selectedFrom, 'selectedTo:', selectedTo, 'selectedSlots:', selectedSlots);
    if (!selectedFrom || !selectedTo) return;
    if (!foodPref) {
      setError('Please select a food preference before generating.');
      setStep('generating-error');
      return;
    }
    if (selectedSlots.length === 0) {
      setError('Please select at least one meal slot (Breakfast, Lunch or Dinner).');
      setStep('generating-error');
      return;
    }
    setError('');
    try {
      // Nuclear auth - inline getSession with refresh retry
      const { data: authData } = await supabase.auth.getSession();
      let userId = authData?.session?.user?.id;
      if (!userId) {
        await supabase.auth.refreshSession();
        const { data: retried } = await supabase.auth.getSession();
        userId = retried?.session?.user?.id;
        if (!userId) {
          setError('Please log out and log in again to continue.');
          setStep('generating-error');
          return;
        }
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('breakfast_count,lunch_count,dinner_count,appetite_level,app_language,veg_days')
        .eq('id', userId).maybeSingle();
      if (profileErr) console.error('[MealWizard] profile query error:', profileErr.message);

      const { data: memberRows, error: memberErr } = await supabase
        .from('family_members').select('health_notes').eq('user_id', userId);
      if (memberErr) console.error('[MealWizard] family_members query error:', memberErr.message);

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

      const { data: cuisineData, error: cuisineErr } = await supabase
        .from('cuisine_preferences').select('cuisine_name')
        .eq('user_id', userId).eq('is_excluded', false);
      if (cuisineErr) console.error('[MealWizard] cuisine_preferences query error:', cuisineErr.message);
      const cuisines = (cuisineData ?? []).map((r: { cuisine_name: string }) => r.cuisine_name);
      const cuisine  = cuisines.length > 0 ? cuisines[Math.floor(Math.random() * cuisines.length)] : 'Konkani';

      const since = toYMD(addDays(new Date(), -14));
      const { data: historyData, error: historyErr } = await supabase
        .from('dish_history').select('dish_name')
        .eq('user_id', userId).gte('served_date', since);
      if (historyErr) console.error('[MealWizard] dish_history query error:', historyErr.message);
      const dishHistory = (historyData ?? []).map((r: { dish_name: string }) => r.dish_name);

      const unwellNames = familyMembers.filter((m) => unwellIds.includes(m.id)).map((m) => m.name);

      // Family member count for servings - ensure plain numbers
      const { data: members, error: membersErr } = await supabase.from('family_members')
        .select('id').eq('user_id', userId);
      if (membersErr) console.error('[MealWizard] family_members count error:', membersErr.message);
      const familyCount = members?.length ?? 1;
      const presentCount = presentMembers.length > 0 ? presentMembers.length : familyCount;
      const totalServings = Number(presentCount) + Number(guestCount);
      console.log('[MealWizard] totalServings:', totalServings, typeof totalServings);
      setServingsCount(totalServings);

      // Ensure slots is never empty - default to breakfast/lunch/dinner
      const slotsToUse = selectedSlots.length > 0 ? selectedSlots : ['breakfast', 'lunch', 'dinner'];
      console.log('[MealWizard] slotsToUse:', slotsToUse);

      setGeneratingProgress({ current: 0, total: 1 });
      const plan = await generateMealPlan({
        userId,
        dates:  getDates(selectedFrom, selectedTo),
        healthFlags: hf,
        servings: {
          breakfast: totalServings,
          lunch:     totalServings,
          dinner:    totalServings,
        },
        appetite:  profile?.appetite_level ?? 'Normal',
        language:  profile?.app_language   ?? 'en',
        cuisine,
        dishHistory,
        foodPrefs: {
          type:          foodPref,
          vegType:       vegType ?? undefined,
          nonVegOptions: nonVegOpts.length > 0 ? nonVegOpts : undefined,
        },
        allowedProteins: nonVegOpts.length > 0 ? nonVegOpts : undefined,
        isMixed,
        unwellMembers:  unwellNames.length > 0 ? unwellNames : undefined,
        nutritionFocus: [nutritionGoals.length > 0 ? nutritionGoals.join(', ') : '', `Vary dishes (seed:${Date.now()})`].filter(Boolean).join('. '),
        vegDays:        profile?.veg_days ?? [],
        cuisinePerDay: (() => {
          const dates = getDates(selectedFrom, selectedTo);
          const allCuisines = [...savedCuisines.filter(c => !removedCuisines.includes(c)), ...extraCuisines];
          return dates.map((d, i) => {
            if (perDayCuisine[d]) return perDayCuisine[d];
            if (hasGuests && guestCuisine && i < guestDays) return guestCuisine;
            return allCuisines.length > 0 ? allCuisines[i % allCuisines.length] : cuisine;
          });
        })(),
        breakfastPrefs: bfPrefs.length > 0 ? bfPrefs : undefined,
        lunchPrefs:     lnPrefs.length > 0 ? lnPrefs : undefined,
        dinnerPrefs:    dnPrefs.length > 0 ? dnPrefs : undefined,
        snackPrefs:     snPrefs.length > 0 ? snPrefs : undefined,
        includeDessert,
        locationCity: userLocation.city,
        locationStores: userLocation.stores,
        selectedSlots: slotsToUse,
      }, (current, total) => setGeneratingProgress({ current, total }));

      const defaultSel: Record<number, Record<MealSlotKey, number>> = {};
      plan.days.forEach((d, i) => { defaultSel[i] = { breakfast: 0, lunch: 0, dinner: 0, ...(d.snack ? { snack: 0 } : {}) }; });
      setGeneratedPlan(plan.days);
      setSelections(defaultSel);
      setActiveDay(0);
      setStep('selection');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
      setStep('generating-error');
    }
  }, [selectedFrom, selectedTo, foodPref, vegType, nonVegOpts, familyMembers, unwellIds, nutritionGoals, bfPrefs, lnPrefs, dnPrefs, snPrefs, includeDessert, hasGuests, guestCuisine, guestDays, extraCuisines, perDayCuisine]);

  useEffect(() => {
    if (step === 'generating') void runGeneration();
  }, [step]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getOpt(dayIdx: number, slot: MealSlotKey): MealOption | null {
    if (!generatedPlan) return null;
    const optIdx = selections[dayIdx]?.[slot] ?? 0;
    const slotData = generatedPlan[dayIdx][slot];
    if (!slotData) return null;
    return slotData.options[optIdx] ?? null;
  }

  function allSelected(): boolean {
    if (!generatedPlan) return false;
    const slotsToCheck = (selectedSlots.length > 0 ? selectedSlots.filter(s => ['breakfast','lunch','dinner','snack'].includes(s)) : ['breakfast','lunch','dinner']) as MealSlotKey[];
    return generatedPlan.every((_, i) =>
      slotsToCheck.every((slot) => selections[i]?.[slot] !== undefined)
    );
  }

  function selectedCount(): number {
    if (!generatedPlan) return 0;
    return generatedPlan.reduce((acc, _, i) =>
      acc + (['breakfast','lunch','dinner'] as MealSlotKey[]).filter((slot) => selections[i]?.[slot] !== undefined).length,
    0);
  }

  function buildGrocery(): Record<GroceryCat, { name: string; qty?: number; unit?: string }[]> {
    const itemMap: Record<string, { baseName: string; qty: number; unit: string; cat: GroceryCat }> = {};
    if (!generatedPlan) return {} as any;

    // Parse various ingredient formats: "Rice 200g", "2 cups milk", "Onion 1 medium", "Salt to taste"
    function parseIngredient(ing: string): { name: string; qty: number; unit: string } {
      const s = ing.trim();
      // "200g Rice" or "2 cups Milk" — number at start
      const leadMatch = s.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|L|l|tsp|tbsp|cup|cups|pcs|piece|pieces|medium|large|small|bunch|nos)?\s+(.+)$/i);
      if (leadMatch) return { name: leadMatch[3].trim(), qty: parseFloat(leadMatch[1]), unit: (leadMatch[2] ?? '').replace(/s$/i, '') };
      // "Rice 200g" or "Onion 1 medium" — number at end
      const trailMatch = s.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(g|kg|ml|L|l|tsp|tbsp|cup|cups|pcs|piece|pieces|medium|large|small|bunch|nos)?$/i);
      if (trailMatch) return { name: trailMatch[1].trim(), qty: parseFloat(trailMatch[2]), unit: (trailMatch[3] ?? '').replace(/s$/i, '') };
      return { name: s, qty: 0, unit: '' };
    }

    function normaliseKey(name: string): string {
      return name.toLowerCase().replace(/e?s$/, '').replace(/\s+/g, ' ').trim();
    }

    const slotsToUse = (selectedSlots.length > 0 ? selectedSlots.filter(s => ['breakfast','lunch','dinner','snack'].includes(s)) : ['breakfast','lunch','dinner']) as MealSlotKey[];
    let totalIngs = 0;
    generatedPlan.forEach((day, dayIdx) => {
      slotsToUse.forEach((slot) => {
        // Try selected option first, then fall back to first option directly from plan
        const opt = getOpt(dayIdx, slot) ?? day[slot]?.options?.[0] ?? null;
        opt?.ingredients?.forEach((ing: string) => {
          totalIngs++;
          const { name, qty, unit } = parseIngredient(ing);
          const key = normaliseKey(name);
          if (itemMap[key]) {
            if (unit === itemMap[key].unit) itemMap[key].qty += qty;
            else if (qty > 0 && !itemMap[key].qty) { itemMap[key].qty = qty; itemMap[key].unit = unit; }
          } else {
            itemMap[key] = { baseName: name.charAt(0).toUpperCase() + name.slice(1), qty, unit, cat: categorise(ing) };
          }
        });
      });
    });
    console.log(`[buildGrocery] ${totalIngs} ingredients found across ${slotsToUse.join(',')} slots, ${Object.keys(itemMap).length} unique items`);
    const grouped = {} as Record<GroceryCat, { name: string; qty?: number; unit?: string }[]>;
    Object.values(itemMap).forEach(({ baseName, qty, unit, cat }) => {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ name: baseName, qty: qty > 0 ? Math.round(qty * 10) / 10 : undefined, unit: unit || undefined });
    });
    return grouped;
  }

  function buildGroceryText(): string {
    const grocery = buildGrocery();
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const lines = ['MY MAHARAJ SHOPPING LIST', `Date: ${today}`, ''];
    CAT_ORDER.forEach((cat) => {
      const items = grocery[cat];
      if (!items?.length) return;
      lines.push(`${cat.toUpperCase()}:`);
      items.forEach((it, i) => lines.push(`  ${i+1}. ${it.name}${it.qty ? ` — ${it.qty}${it.unit||''}` : ''}`));
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
    const user = await getSessionUser();
    if (!user) return;
    const slots: MealSlotKey[] = ['breakfast','lunch','dinner'];
    const dishRows = generatedPlan.flatMap((day, i) =>
      slots.map((slot) => {
        const opt = getOpt(i, slot);
        return opt ? { user_id: user.id, dish_name: opt.name, served_date: day.date, meal_type: slot } : null;
      }).filter(Boolean)
    );
    const menuPayload = {
      user_id: user.id,
      period_start: toYMD(selectedFrom), period_end: toYMD(selectedTo),
      cuisine: 'Various', food_pref: foodPref ?? 'veg',
      menu_json: { days: generatedPlan.map((day, i) => ({
        date: day.date, day: day.day,
        breakfast: getOpt(i, 'breakfast'),
        lunch:     getOpt(i, 'lunch'),
        dinner:    getOpt(i, 'dinner'),
      })) },
    };
    console.log('[saveHistory] Saving menu_history:', JSON.stringify(menuPayload).substring(0, 500));
    console.log('[saveHistory] Saving dish_history rows:', dishRows.length);
    const [menuRes, dishRes] = await Promise.all([
      supabase.from('menu_history').insert(menuPayload),
      dishRows.length > 0 ? supabase.from('dish_history').insert(dishRows) : Promise.resolve({ error: null }),
    ]);
    console.log('[saveHistory] menu_history result:', menuRes.error ? `ERROR: ${menuRes.error.message}` : 'SUCCESS');
    console.log('[saveHistory] dish_history result:', dishRes.error ? `ERROR: ${dishRes.error.message}` : 'SUCCESS');
    // Deduct ingredients from fridge
    await deductFromFridge();
  }

  async function deductFromFridge() {
    if (!generatedPlan) return;
    const user = await getSessionUser();
    if (!user) return;

    // Collect all ingredients from selected meals
    const usedIngredients: { name: string; qty: number; unit: string }[] = [];
    const slots: MealSlotKey[] = selectedSlots.length > 0 ? selectedSlots.filter(s => ['breakfast','lunch','dinner'].includes(s)) as MealSlotKey[] : ['breakfast', 'lunch', 'dinner'];
    generatedPlan.forEach((_, dayIdx) => {
      slots.forEach((slot) => {
        const opt = getOpt(dayIdx, slot);
        if (!opt) return;
        opt.ingredients.forEach((ing) => {
          const trailMatch = ing.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(g|kg|ml|L|l|pcs|piece|pieces)?$/i);
          const leadMatch = ing.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|L|l|pcs|piece|pieces)?\s+(.+)$/i);
          if (trailMatch) {
            usedIngredients.push({ name: trailMatch[1].trim(), qty: parseFloat(trailMatch[2]), unit: (trailMatch[3] ?? '').toLowerCase() });
          } else if (leadMatch) {
            usedIngredients.push({ name: leadMatch[3].trim(), qty: parseFloat(leadMatch[1]), unit: (leadMatch[2] ?? '').toLowerCase() });
          }
        });
      });
    });

    if (usedIngredients.length === 0) return;

    // Get fridge inventory
    const { data: fridgeItems } = await supabase
      .from('fridge_inventory')
      .select('id, item_name, quantity, unit')
      .eq('user_id', user.id);
    if (!fridgeItems) return;

    // Match and deduct
    for (const used of usedIngredients) {
      const usedKey = used.name.toLowerCase().replace(/e?s$/, '');
      const match = fridgeItems.find(f => {
        const fridgeKey = f.item_name.toLowerCase().replace(/e?s$/, '');
        return fridgeKey.includes(usedKey) || usedKey.includes(fridgeKey);
      });
      if (match && match.quantity) {
        const currentQty = parseFloat(match.quantity) || 0;
        const newQty = Math.max(0, currentQty - used.qty);
        if (newQty <= 0) {
          await supabase.from('fridge_inventory').delete().eq('id', match.id);
        } else {
          await supabase.from('fridge_inventory').update({
            quantity: String(Math.round(newQty * 10) / 10),
            updated_at: new Date().toISOString()
          }).eq('id', match.id);
        }
      }
    }
  }

  async function submitFeedback() {
    const user = await getSessionUser();
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
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const grocery = buildGrocery();
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    let html = '<html><head><title>Shopping List</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#1B3A5C;font-size:20px}p{color:#666;font-size:12px}h2{color:#1A6B5C;font-size:13px;margin-top:18px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#1B3A5C;color:white;padding:8px;text-align:left;font-size:11px}td{padding:8px;border-bottom:1px solid #E5E7EB;font-size:13px}.qty{text-align:right;color:#1A6B5C;font-weight:600;width:80px}</style></head><body>';
    html += '<h1>My Maharaj Shopping List</h1><p>' + today + '</p>';
    CAT_ORDER.forEach(cat => {
      const items = grocery[cat];
      if (!items || !items.length) return;
      html += '<h2>' + cat + '</h2><table><tr><th>#</th><th>Item</th><th class="qty">Qty</th></tr>';
      items.forEach((it, i) => { html += '<tr><td>' + (i+1) + '</td><td>' + it.name + '</td><td class="qty">' + (it.qty ? it.qty + (it.unit||'') : '—') + '</td></tr>'; });
      html += '</table>';
    });
    html += '<script>window.onload=function(){window.print()};</script></body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function advance(next: WizardStep) { setError(''); setStep(next); }

  function goBack() {
    setError('');
    const isSingleDay = selectedFrom && selectedTo ? getDates(selectedFrom, selectedTo).length <= 1 : true;
    const backMap: Partial<Record<WizardStep, WizardStep>> = {
      'food-pref': 'period',
      'guest-cuisine': 'food-pref',
      'meal-prefs': 'guest-cuisine',
      'unwell': 'meal-prefs',
      'veg-days': 'unwell',
      'nutrition': isSingleDay ? 'unwell' : 'veg-days',
      'cuisine-confirm': 'nutrition',
      'selection': 'cuisine-confirm',
      'plan-summary': 'selection',
      'cook-or-order': 'plan-summary',
      'recipes': 'cook-or-order',
      'grocery': 'recipes',
      'delivery-apps': 'grocery',
      'feedback': 'delivery-apps',
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

    function quickSelect(from: Date, to: Date) {
      setSelectedFrom(from);
      setSelectedTo(to);
      setStep('food-pref');
    }
    const quickCards = [
      { label: 'Today', fn: () => { const d = new Date(); d.setHours(0,0,0,0); quickSelect(d, d); } },
      { label: 'Tomorrow', fn: () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+1); quickSelect(d, d); } },
      { label: 'This Week', fn: () => { const s = new Date(); s.setHours(0,0,0,0); const e = new Date(); e.setHours(0,0,0,0); e.setDate(e.getDate()+6); quickSelect(s, e); } },
    ];

    const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
    const monthName = MONTHS_L[calMonth.getMonth()];
    const canGoPrev = calMonth > new Date(today.getFullYear(), today.getMonth(), 1);

    function tapDate(d: Date) {
      if (d < today) return;
      if (!rangeStart || rangeEnd) { setRangeStart(d); setRangeEnd(null); }
      else if (d >= rangeStart) { setRangeEnd(d); }
      else { setRangeStart(d); setRangeEnd(null); }
    }

    function isInRange(d: Date): boolean {
      if (!rangeStart) return false;
      if (!rangeEnd) return d.getTime() === rangeStart.getTime();
      return d >= rangeStart && d <= rangeEnd;
    }

    return (
      <View>
        <Text style={s.stepTitle}>When would you like to plan?</Text>

        <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
          {quickCards.map(c => (
            <TouchableOpacity key={c.label} style={{flex:1,backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,paddingVertical:12,alignItems:'center',borderWidth:1.5,borderColor:'rgba(27,58,92,0.12)'}} onPress={c.fn} activeOpacity={0.8}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#1B3A5C'}}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,padding:14,borderWidth:1,borderColor:'rgba(27,58,92,0.1)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <TouchableOpacity onPress={() => { if (canGoPrev) setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)); }} style={{padding:8,opacity:canGoPrev?1:0.3}}>
              <Text style={{fontSize:18,color:'#1B3A5C',fontWeight:'700'}}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:'#1B3A5C'}}>{monthName} {calMonth.getFullYear()}</Text>
            <TouchableOpacity onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} style={{padding:8}}>
              <Text style={{fontSize:18,color:'#1B3A5C',fontWeight:'700'}}>{'›'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{flexDirection:'row',marginBottom:4}}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={{flex:1,textAlign:'center',fontSize:11,fontWeight:'600',color:'#9CA3AF'}}>{d}</Text>
            ))}
          </View>

          <View style={{flexDirection:'row',flexWrap:'wrap'}}>
            {Array.from({length: firstDayOfWeek}).map((_, i) => <View key={`e${i}`} style={{width:'14.28%',height:36}} />)}
            {Array.from({length: daysInMonth}).map((_, i) => {
              const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), i + 1);
              const isPast = d < today;
              const inRange = isInRange(d);
              const isStart = rangeStart && d.getTime() === rangeStart.getTime();
              const isEnd = rangeEnd && d.getTime() === rangeEnd.getTime();
              const isToday = d.getTime() === today.getTime();
              return (
                <TouchableOpacity key={i} style={{width:'14.28%',height:36,alignItems:'center',justifyContent:'center',backgroundColor:inRange?'#1B3A5C':isToday?'rgba(27,58,92,0.15)':'transparent',borderRadius: isStart||isEnd||isToday ? 18 : 0,opacity:isPast?0.3:1}} onPress={() => tapDate(d)} disabled={isPast}>
                  <Text style={{fontSize:14,fontWeight:inRange||isToday?'700':'400',color:inRange?'#FFFFFF':'#1B3A5C'}}>{i+1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {rangeStart && (
            <View style={{marginTop:12}}>
              <Text style={{fontSize:13,color:'#5A7A8A',textAlign:'center',marginBottom:8}}>
                {rangeEnd ? `${fmt(rangeStart)} → ${fmt(rangeEnd)}` : `Start: ${fmt(rangeStart)} — tap end date`}
              </Text>
              {(rangeEnd || rangeStart) && (
                <Button title={`Plan ${fmt(rangeStart)}${rangeEnd ? ` → ${fmt(rangeEnd)}` : ''}`} onPress={() => {
                  setSelectedFrom(rangeStart); setSelectedTo(rangeEnd ?? rangeStart); advance('food-pref');
                }} />
              )}
            </View>
          )}
        </View>
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
          <Text style={s.toggleIcon}></Text>
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
            style={[s.foodCard, foodPref === 'veg' && !isMixed && s.foodCardActive]}
            onPress={() => { setFoodPref('veg'); setVegType(null); setIsMixed(false); }}
            activeOpacity={0.8}
          >
            <Text style={s.foodCardIcon}></Text>
            <Text style={[s.foodCardLabel, foodPref === 'veg' && !isMixed && s.foodCardLabelActive]}>Vegetarian</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.foodCard, foodPref === 'nonveg' && !isMixed && s.foodCardActive]}
            onPress={() => { setFoodPref('nonveg'); setVegType(null); setIsMixed(false); }}
            activeOpacity={0.8}
          >
            <Text style={s.foodCardIcon}></Text>
            <Text style={[s.foodCardLabel, foodPref === 'nonveg' && !isMixed && s.foodCardLabelActive]}>Non-Vegetarian</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.foodCard, isMixed && s.foodCardActive]}
            onPress={() => { setFoodPref('nonveg'); setVegType(null); setIsMixed(true); }} activeOpacity={0.85}>
            <Text style={s.foodCardIcon}></Text>
            <Text style={[s.foodCardLabel, isMixed && s.foodCardLabelActive]}>Mixed</Text>
            <Text style={{fontSize:11,color:'#5A7A8A',marginTop:2}}>Veg breakfast + non-veg meals</Text>
          </TouchableOpacity>
        </View>

        {/* Meal slots */}
        <Text style={[s.sectionLabel,{marginTop:16}]}>WHICH MEALS TO PLAN?</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
          {[{k:'breakfast',i:'',l:'Breakfast'},{k:'lunch',i:'',l:'Lunch'},{k:'dinner',i:'',l:'Dinner'},{k:'snack',i:'',l:'Evening Snack'}].map(({k,i,l})=>(
            <TouchableOpacity key={k}
              style={{paddingHorizontal:14,paddingVertical:9,borderRadius:20,borderWidth:1.5,borderColor:selectedSlots.includes(k)?'#1B3A5C':'#D4EDE5',backgroundColor:selectedSlots.includes(k)?'#1B3A5C':'rgba(255,255,255,0.9)'}}
              onPress={()=>setSelectedSlots(prev=>prev.includes(k)?prev.filter(x=>x!==k):[...prev,k])}>
              <Text style={{fontSize:13,fontWeight:'600',color:selectedSlots.includes(k)?'#FFFFFF':'#1B3A5C'}}>{i} {l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Present members - who is home */}
        <View style={{marginBottom:12}}>
          <Text style={s.sectionLabel}>WHO IS HOME FOR MEALS?</Text>
          {familyMembers.length > 0 ? (
            <>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                {familyMembers.map(m=>(
                  <TouchableOpacity key={m.id}
                    style={{paddingHorizontal:14,paddingVertical:9,borderRadius:20,borderWidth:1.5,borderColor:presentMembers.includes(m.id)?'#1B3A5C':'#D4EDE5',backgroundColor:presentMembers.includes(m.id)?'#1B3A5C':'rgba(255,255,255,0.9)'}}
                    onPress={()=>setPresentMembers(prev=>prev.includes(m.id)?prev.filter(x=>x!==m.id):[...prev,m.id])}>
                    <Text style={{fontSize:13,fontWeight:'600',color:presentMembers.includes(m.id)?'#FFFFFF':'#1B3A5C'}}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>Leave all unselected = cook for everyone</Text>
            </>
          ) : (
            <Text style={{fontSize:13,color:'#9CA3AF',fontStyle:'italic',marginTop:4}}>Add family members in Family Profile to use this feature</Text>
          )}
        </View>

        {/* Additional guests */}
        <Text style={s.sectionLabel}>ADDITIONAL GUESTS?</Text>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:4}}>
          {[0,1,2,3,4,5,8,10].map(n=>(
            <TouchableOpacity key={n}
              style={{paddingHorizontal:14,paddingVertical:8,borderRadius:16,borderWidth:1.5,borderColor:guestCount===n?'#1B3A5C':'#D4EDE5',backgroundColor:guestCount===n?'#1B3A5C':'rgba(255,255,255,0.9)'}}
              onPress={()=>setGuestCount(n)}>
              <Text style={{fontSize:13,fontWeight:'600',color:guestCount===n?'#FFFFFF':'#1B3A5C'}}>{n===0?'None':'+'+n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {foodPref === 'veg' && (
          <View style={s.foodCards}>
            <TouchableOpacity style={[s.foodCard, vegType === 'normal' && s.foodCardActive]}
              onPress={() => setVegType('normal')} activeOpacity={0.8}>
              <Text style={s.foodCardIcon}></Text>
              <Text style={[s.foodCardLabel, vegType === 'normal' && s.foodCardLabelActive]}>Normal Veg</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.foodCard, vegType === 'fasting' && s.foodCardActive]}
              onPress={() => setVegType('fasting')} activeOpacity={0.8}>
              <Text style={s.foodCardIcon}></Text>
              <Text style={[s.foodCardLabel, vegType === 'fasting' && s.foodCardLabelActive]}>Fasting/Upvas</Text>
            </TouchableOpacity>
          </View>
        )}

        {foodPref === 'nonveg' && (
          <View>
            <Text style={s.sectionLabel}>SELECT OPTIONS</Text>
            <View style={s.pillRow}>
              {['Eggs','Fish','Chicken','Mutton'].map((o) => (
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
            <Button title="Back" onPress={goBack} variant="outline" />
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
    const BF_OPTS = ['Hot dish (pohe/upma/idli)','Bread/Paratha','Eggs','Fruits','Juice/Smoothie','Light only'];
    const LN_OPTS = ['Full Thali','Rice based','Roti based','Dal','Sabzi','Salad','Raita','Papad','Pickle'];
    const DN_OPTS = ['Full Thali','Rice based','Roti based','Non-veg main','Veg main','Soup','Salad','Dessert','Light only'];
    const SN_OPTS = ['Tea/Coffee & Snack','Fruit/Juice','Chaat','Sandwich','Light only'];

    function toggle(list: string[], set: React.Dispatch<React.SetStateAction<string[]>>, item: string) {
      set((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
    }

    return (
      <View>
        <Text style={s.stepTitle}>What would you like in each meal?</Text>
        <Text style={s.stepSub}>Select all that apply for each meal</Text>

        {[
          { emoji: '', label: 'Breakfast', opts: BF_OPTS, sel: bfPrefs, set: setBfPrefs },
          { emoji: '', label: 'Lunch',     opts: LN_OPTS, sel: lnPrefs, set: setLnPrefs },
          { emoji: '', label: 'Evening Snack', opts: SN_OPTS, sel: snPrefs, set: setSnPrefs },
          { emoji: '', label: 'Dinner',    opts: DN_OPTS, sel: dnPrefs, set: setDnPrefs },
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
            <Button title="Back" onPress={goBack} variant="outline" />
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
            <Text style={s.foodCardIcon}></Text>
            <Text style={[s.foodCardLabel, everyoneWell && s.foodCardLabelActive]}>Everyone is fine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.foodCard, !everyoneWell && s.foodCardActive]}
            onPress={() => setEveryoneWell(false)} activeOpacity={0.8}>
            <Text style={s.foodCardIcon}></Text>
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
            <Button title="Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Continue →" onPress={() => {
              const dates = selectedFrom && selectedTo ? getDates(selectedFrom, selectedTo) : [];
              if (dates.length > 1) advance('veg-days');
              else advance('nutrition');
            }} />
          </View>
        </View>
      </View>
    );
  }

  function renderNutrition() {
    const GOALS = ['Balanced','Blood Sugar Control','Bone Health','Detox','Digestive Health','Doctor Recommended','Energy Boost','Heart Health','High Fibre','High Protein','Immunity Boost','Keto','Kid Friendly','Less Oil','Less Spice','Low Calorie','Low Carb','Low Sodium','Mental Clarity','Muscle Gain','Post-illness Recovery','Pregnancy Safe','Sattvic / Fasting','Senior Friendly','Skin Health','Weight Loss'];
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

        <View style={{gap:10,marginTop:16}}>
          <Button title="Continue →" onPress={() => advance('cuisine-confirm')} />
          <View style={{flexDirection:'row',gap:10}}>
            <View style={{flex:1}}><Button title="Back" onPress={goBack} variant="outline" /></View>
            <View style={{flex:1}}>
              <TouchableOpacity style={{borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:12,paddingVertical:14,alignItems:'center'}} onPress={()=>router.push('/home' as never)}>
                <Text style={{fontSize:14,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
        {servingsCount > 0 && (
          <Text style={[s.genSub, { fontWeight: '600', marginBottom: 4 }]}>Cooking for {servingsCount} people</Text>
        )}
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
          <Button title="Back to Settings" onPress={() => { setError(''); setStep('nutrition'); }} variant="outline" />
        </View>
      </View>
    );
  }

  function ThaliDetails({ description }: { description: string }) {
    if (!description || !description.includes(' | ')) return null;
    const components = description.split(' | ').map(c => c.trim()).filter(Boolean);
    return (
      <View style={{marginTop:4,gap:2}}>
        {components.map((comp, i) => {
          const [label, ...rest] = comp.split(':');
          const value = rest.join(':').trim();
          return (
            <Text key={i} style={{fontSize:11,color:'#374151',lineHeight:16}}>
              <Text style={{fontWeight:'700',color:'#1B3A5C'}}>{label.trim()}</Text>
              {value ? `: ${value}` : ''}
            </Text>
          );
        })}
      </View>
    );
  }

  function renderSelection() {
    if (!generatedPlan) return null;
    const allSlots: { key: MealSlotKey; icon: string; label: string }[] = [
      { key: 'breakfast', icon: '🌅', label: 'Breakfast' },
      { key: 'lunch',     icon: '☀️', label: 'Lunch'     },
      { key: 'snack',     icon: '🍵', label: 'Snack'     },
      { key: 'dinner',    icon: '🌙', label: 'Dinner'    },
    ];
    const visibleSlots = allSlots.filter(sl =>
      (selectedSlots.length === 0 || selectedSlots.includes(sl.key)) &&
      (sl.key !== 'snack' || generatedPlan.some(d => d.snack?.options?.length))
    );
    const total = generatedPlan.length * visibleSlots.length;
    const day = generatedPlan[activeDay];
    if (!day) return null;

    const shortDay = day.day.substring(0, 3);
    const dateNum = day.date.split('-')[2];

    return (
      <View style={{flex:1}}>
        {/* Day tabs - horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:56,marginBottom:12}}>
          <View style={{flexDirection:'row',gap:6,paddingHorizontal:4,paddingVertical:4}}>
            {generatedPlan.map((d, idx) => {
              const dn = d.day.substring(0, 3);
              const dd = d.date.split('-')[2];
              const isActive = idx === activeDay;
              return (
                <TouchableOpacity
                  key={d.date}
                  style={{
                    paddingHorizontal:16,paddingVertical:10,borderRadius:14,
                    backgroundColor: isActive ? navy : 'rgba(255,255,255,0.9)',
                    borderWidth:1.5,borderColor: isActive ? navy : '#D4EDE5',
                    alignItems:'center',minWidth:60,
                  }}
                  onPress={() => setActiveDay(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={{fontSize:12,fontWeight:'700',color: isActive ? white : '#5A7A8A'}}>{dn}</Text>
                  <Text style={{fontSize:16,fontWeight:'800',color: isActive ? white : navy}}>{dd}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Active day's slots */}
        <Text style={{fontSize:16,fontWeight:'800',color:navy,marginBottom:8}}>{day.day}, {day.date}</Text>

        {visibleSlots.map(({ key, icon, label }) => {
          const slotData = day[key];
          if (!slotData || slotData.options.length === 0) return null;
          return (
            <View key={key} style={{marginBottom:14}}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#5A7A8A',marginBottom:6}}>{icon} {label}</Text>
              {slotData.options.map((opt, optIdx) => {
                const isSel = selections[activeDay]?.[key] === optIdx;
                const isThali = opt.name.toLowerCase().includes('thali');
                return (
                  <TouchableOpacity
                    key={optIdx}
                    style={{
                      flexDirection:'row',alignItems:'flex-start',gap:10,
                      backgroundColor: isSel ? 'rgba(27,58,92,0.06)' : 'rgba(255,255,255,0.95)',
                      borderRadius:14,padding:14,marginBottom:8,
                      borderWidth:2,borderColor: isSel ? navy : '#E5E7EB',
                    }}
                    onPress={() => setSelections((prev) => ({
                      ...prev,
                      [activeDay]: { ...(prev[activeDay] ?? {}), [key]: optIdx },
                    }))}
                    activeOpacity={0.8}
                  >
                    <View style={{width:24,height:24,borderRadius:12,borderWidth:2.5,borderColor: isSel ? navy : '#D1D5DB',alignItems:'center',justifyContent:'center',marginTop:2}}>
                      {isSel && <View style={{width:13,height:13,borderRadius:7,backgroundColor:navy}} />}
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:16,fontWeight:'700',color: isSel ? navy : '#1F2937',lineHeight:22}}>{opt.name}</Text>
                      {isThali && opt.description && opt.description.includes(' | ') && (
                        <ThaliDetails description={opt.description} />
                      )}
                      {opt.tags.length > 0 && (
                        <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:4}}>
                          {opt.tags.slice(0,4).map(tag => (
                            <Text key={tag} style={{fontSize:10,fontWeight:'600',color: tag.toLowerCase().includes('non-veg') ? '#DC2626' : '#6B7280',backgroundColor: tag.toLowerCase().includes('non-veg') ? '#FEE2E2' : '#F3F4F6',paddingHorizontal:7,paddingVertical:2,borderRadius:8}}>{tag}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                    <Text style={{fontSize:13,fontWeight:'700',color: isSel ? navy : '#9CA3AF',marginTop:2}}>#{optIdx + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Bottom buttons */}
        <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:16,padding:14,marginTop:8,borderWidth:1,borderColor:'#E5E7EB'}}>
          <Text style={{fontSize:13,fontWeight:'600',color:'#5A7A8A',textAlign:'center',marginBottom:8}}>
            {selectedCount()} of {total} meals selected
          </Text>
          <Button
            title="Confirm Meal Plan"
            onPress={() => { void saveHistory(); setRecipeDishes([]); advance('plan-summary'); }}
            disabled={!allSelected()}
          />
          <View style={{flexDirection:'row',gap:8,marginTop:8}}>
            <TouchableOpacity style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:'rgba(27,58,92,0.3)',backgroundColor:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={()=>{setGeneratedPlan(null);setSelections({});setActiveDay(0);setStep('generating');}}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#1B3A5C'}}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:'#D4EDE5',backgroundColor:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => router.push('/home' as never)}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function renderRecipes() {
    if (!generatedPlan) return null;
    const slotsForRecipes = (selectedSlots.length > 0 ? selectedSlots : ['breakfast','lunch','dinner']) as MealSlotKey[];
    const allDishes: string[] = [];
    generatedPlan.forEach((_, i) =>
      slotsForRecipes.forEach((slot) => {
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
          slotsForRecipes.map((slot) => {
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
            <Button title="Back" onPress={goBack} variant="outline" />
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
        <Text style={s.stepTitle}>Your Shopping List</Text>
        <Text style={s.stepSub}>{totalItems} items for {selectedFrom && selectedTo
          ? selectedFrom.getTime() === selectedTo.getTime() ? fmtL(selectedFrom) : `${fmt(selectedFrom)} – ${fmt(selectedTo)}`
          : 'your plan'}
        </Text>

        <View style={s.groceryActions}>
          <TouchableOpacity style={s.groceryActionBtn} onPress={() => void copyGrocery()} activeOpacity={0.8}>
            <Text style={s.groceryActionText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.groceryActionBtn} onPress={() => void shareWhatsApp()} activeOpacity={0.8}>
            <Text style={s.groceryActionText}>WhatsApp</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={s.groceryActionBtn} onPress={() => void downloadGrocery()} activeOpacity={0.8}>
              <Text style={s.groceryActionText}>Print / PDF</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.groceryActionBtn} onPress={() => setStep('recipes')} activeOpacity={0.8}>
            <Text style={s.groceryActionText}>View Recipes</Text>
          </TouchableOpacity>
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
                <Text style={s.groceryCatTitle}>{cat}</Text>
                <View style={s.groceryCatDivider} />
                <View style={{flexDirection:'row',paddingVertical:4,paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:'#E5E7EB'}}>
                  <Text style={{width:30,fontSize:11,fontWeight:'700',color:'#9CA3AF'}}>#</Text>
                  <Text style={{flex:1,fontSize:11,fontWeight:'700',color:'#9CA3AF'}}>ITEM</Text>
                  <Text style={{width:80,fontSize:11,fontWeight:'700',color:'#9CA3AF',textAlign:'right'}}>QTY</Text>
                </View>
                {items.map((item, i) => (
                  <View key={i} style={{flexDirection:'row',paddingVertical:8,paddingHorizontal:4,borderBottomWidth:i<items.length-1?1:0,borderBottomColor:'#F3F4F6',alignItems:'center'}}>
                    <Text style={{width:30,fontSize:13,color:'#9CA3AF'}}>{i+1}.</Text>
                    <Text style={{flex:1,fontSize:14,color:'#1B3A5C',fontWeight:'500'}}>{item.name}</Text>
                    <Text style={{width:80,fontSize:13,color:'#1A6B5C',fontWeight:'600',textAlign:'right'}}>{item.qty ? `${item.qty}${item.unit||''}` : '—'}</Text>
                  </View>
                ))}
              </View>
            );
          })
        )}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="Back" onPress={goBack} variant="outline" />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Continue →" onPress={() => advance('delivery-apps')} />
          </View>
        </View>
      </View>
    );
  }

  function renderDeliveryApps() {
    const apps = ['Amazon','Careem','Fresh to Home','Noon'];
    const rows: string[][] = [];
    for (let i = 0; i < apps.length; i += 2) rows.push(apps.slice(i, i + 2));

    return (
      <View>
        <Text style={s.stepTitle}>Where would you like to order from?</Text>

        {/* Banner 1: Integration */}
        <View style={{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'rgba(201,162,39,0.12)',borderRadius:12,padding:12,marginTop:12,borderWidth:1,borderColor:'rgba(201,162,39,0.3)',width:'100%'}}>
          <Text style={{fontSize:14}}>🔗</Text>
          <Text style={{flex:1,fontSize:12,color:'#78350F',lineHeight:18}}>Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan</Text>
        </View>

        {/* Banner 2: Smart shopping */}
        <View style={{backgroundColor:navy,borderRadius:12,padding:14,marginTop:10,width:'100%'}}>
          <Text style={{fontSize:12,fontWeight:'600',color:white,lineHeight:18}}>Coming soon. Maharaj is learning the art of smart shopping. Soon, he will compare prices across prominent stores in your area — finding you the best deals, seasonal offers and bulk savings before you step into the store.</Text>
        </View>

        {/* 2-column pill grid */}
        <View style={{gap:10,marginTop:16}}>
          {rows.map((row, ri) => (
            <View key={ri} style={{flexDirection:'row',gap:10}}>
              {row.map(name => (
                <View key={name} style={{flex:1,backgroundColor:'rgba(27,58,92,0.06)',borderWidth:1,borderColor:'rgba(27,58,92,0.2)',borderRadius:20,paddingHorizontal:16,paddingVertical:10,alignItems:'center'}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:navy}}>{name}</Text>
                </View>
              ))}
              {row.length < 2 && <View style={{flex:1}} />}
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <Text style={{fontSize:10,color:'#9CA3AF',textAlign:'center',paddingVertical:12,lineHeight:14}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any of these services.</Text>

        <View style={{gap:10,marginTop:8}}>
          <Button title="Done — Continue" onPress={() => advance('feedback')} />
          <TouchableOpacity style={{paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'rgba(27,58,92,0.3)',alignItems:'center'}} onPress={() => advance('feedback')}>
            <Text style={{fontSize:14,fontWeight:'600',color:navy}}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderFeedback() {
    if (feedbackDone) {
      return (
        <View style={s.doneScreen}>
          <Text style={s.doneEmoji}></Text>
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
        <Text style={s.stepTitle}>Bon Appétit!</Text>
        <Text style={s.stepSub}>How did you enjoy your meals? Your feedback helps Maharaj improve.</Text>

        {feedbacks.map((fb, idx) => (
          <View key={idx} style={s.feedbackCard}>
            <Text style={s.feedbackDish}>{fb.dishName}</Text>
            <View style={s.feedbackBtns}>
              <TouchableOpacity
                style={[s.thumbBtn, fb.rating === 1 && s.thumbUp]}
                onPress={() => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, rating: 1 } : f))}
              >
                <Text style={s.thumbText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.thumbBtn, fb.rating === -1 && s.thumbDown]}
                onPress={() => setFeedbacks((prev) => prev.map((f, i) => i === idx ? { ...f, rating: -1 } : f))}
              >
                <Text style={s.thumbText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.btnRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Button title="Back" onPress={goBack} variant="outline" />
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


  function renderGuestCuisine() {
    const ALL_CUISINES = ['Afghan','American','Andhra','Assamese','Awadhi','Bangladeshi','Bengali','Bihari','Brazilian','Burmese','Cantonese','Chettinad','Chinese','Continental','Coorgi','Egyptian','Emirati','Ethiopian','Filipino','French','German','Goan','Greek','Gujarati','Hyderabadi','Indonesian','Iranian','Israeli','Italian','Japanese','Kashmiri','Kenyan','Konkani','Korean','Kuwaiti','Lebanese','Maharashtrian','Malabar','Malaysian','Mangalorean','Mediterranean','Mexican','Moroccan','Mughlai','Nepali','Nigerian','Odia','Omani','Pakistani','Persian','Peruvian','Punjabi','Rajasthani','Saudi','Singaporean','South African','South Indian','Spanish','Sri Lankan','Szechuan','Tamil','Telugu','Thai','Turkish','Udupi','Vietnamese'].sort();
    return (
      <View>
        <TouchableOpacity onPress={()=>router.push('/home' as never)} style={{borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:12,paddingVertical:12,alignItems:'center',marginBottom:12}}><Text style={{fontSize:14,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text></TouchableOpacity>
        <Text style={s.stepTitle}>Any guests joining?</Text>
        <Text style={s.stepSub}>Add a special cuisine for your guests</Text>
        <View style={s.foodCards}>
          <TouchableOpacity style={[s.foodCard, !hasGuests && s.foodCardActive]} onPress={()=>{setHasGuests(false);setGuestCuisine('');}} activeOpacity={0.8}>
            <Text style={s.foodCardIcon}></Text>
            <Text style={[s.foodCardLabel, !hasGuests && s.foodCardLabelActive]}>Just my family</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.foodCard, hasGuests && s.foodCardActive]} onPress={()=>setHasGuests(true)} activeOpacity={0.8}>
            <Text style={s.foodCardIcon}></Text>
            <Text style={[s.foodCardLabel, hasGuests && s.foodCardLabelActive]}>We have guests</Text>
          </TouchableOpacity>
        </View>
        {hasGuests && (<View>
          <Text style={[s.sectionLabel,{marginTop:12}]}>GUEST CUISINE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{flexDirection:'row',gap:8,paddingVertical:4,paddingBottom:8}}>
              {ALL_CUISINES.map(c=>(<TouchableOpacity key={c} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1.5,borderColor:guestCuisine===c?'#1B3A5C':'#D4EDE5',backgroundColor:guestCuisine===c?'#1B3A5C':'rgba(255,255,255,0.9)'}} onPress={()=>setGuestCuisine(c)}><Text style={{fontSize:13,fontWeight:'600',color:guestCuisine===c?'#FFFFFF':'#1B3A5C'}}>{c}</Text></TouchableOpacity>))}
            </View>
          </ScrollView>
          <Text style={s.sectionLabel}>FOR HOW MANY DAYS?</Text>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:8}}>
            {[1,2,3,4,5,7].map(d=>(<TouchableOpacity key={d} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:16,borderWidth:1.5,borderColor:guestDays===d?'#1B3A5C':'#D4EDE5',backgroundColor:guestDays===d?'#1B3A5C':'rgba(255,255,255,0.9)'}} onPress={()=>setGuestDays(d)}><Text style={{fontSize:13,fontWeight:'600',color:guestDays===d?'#FFFFFF':'#1B3A5C'}}>{d} day{d>1?'s':''}</Text></TouchableOpacity>))}
          </View>
        </View>)}
        <View style={s.btnRow}>
          <View style={{flex:1,marginRight:12}}><Button title="Back" onPress={goBack} variant="outline" /></View>
          <View style={{flex:2}}><Button title="Continue →" onPress={()=>advance('meal-prefs')} /></View>
        </View>
      </View>
    );
  }

  function renderVegDays() {
    const dates = getDates(selectedFrom!, selectedTo!);
    if (dates.length <= 1) return null;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (
      <View>
        <TouchableOpacity onPress={()=>router.push('/home' as never)} style={{borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:12,paddingVertical:12,alignItems:'center',marginBottom:12}}><Text style={{fontSize:14,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text></TouchableOpacity>
        <Text style={s.stepTitle}>Set veg/fasting days</Text>
        <Text style={s.stepSub}>Choose how each day should be planned</Text>
        {dates.map(d=>{
          const dt = new Date(d);
          const label = `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
          const val = vegFastDays[d] ?? 'normal';
          return (
            <View key={d} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'rgba(255,255,255,0.9)',borderRadius:12,padding:14,marginBottom:8}}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#1B3A5C',width:70}}>{label}</Text>
              <View style={{flexDirection:'row',gap:6}}>
                {(['normal','veg','fasting'] as const).map(opt=>(<TouchableOpacity key={opt} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:14,borderWidth:1.5,borderColor:val===opt?'#1B3A5C':'#D4EDE5',backgroundColor:val===opt?'#1B3A5C':'rgba(255,255,255,0.9)'}} onPress={()=>setVegFastDays(p=>({...p,[d]:opt}))}><Text style={{fontSize:12,fontWeight:'600',color:val===opt?'#FFFFFF':'#1B3A5C',textTransform:'capitalize'}}>{opt}</Text></TouchableOpacity>))}
              </View>
            </View>
          );
        })}
        <View style={s.btnRow}>
          <View style={{flex:1,marginRight:12}}><Button title="Back" onPress={goBack} variant="outline" /></View>
          <View style={{flex:2}}><Button title="Continue →" onPress={()=>advance('nutrition')} /></View>
        </View>
      </View>
    );
  }

  function renderPlanSummary() {
    if (!generatedPlan) return null;
    const SLOT_LABELS: { key: MealSlotKey; label: string }[] = [
      { key: 'breakfast', label: 'Breakfast' },
      { key: 'lunch', label: 'Lunch' },
      { key: 'snack', label: 'Evening Snack' },
      { key: 'dinner', label: 'Dinner' },
    ];
    const slotsToShow = SLOT_LABELS.filter(sl =>
      (selectedSlots.length === 0 || selectedSlots.includes(sl.key)) &&
      (sl.key !== 'snack' || generatedPlan.some(d => d.snack?.options?.length))
    );
    const COL_W = 130;
    const BORDER = '#1B3A5C';
    const dateRange = selectedFrom && selectedTo
      ? selectedFrom.getTime() === selectedTo.getTime() ? fmtL(selectedFrom) : `${fmt(selectedFrom)} – ${fmt(selectedTo)}`
      : '';

    function doPrint() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.print();
      }
    }

    return (
      <View style={{maxWidth:794,width:'100%',alignSelf:'center'}}>
        {/* Print-only CSS */}
        {Platform.OS === 'web' && (
          <View>
            <Text style={{display:'none'}}>{`
              <style>@media print { .no-print { display: none !important; } body { margin: 0; } @page { size: A4 landscape; margin: 10mm; } }</style>
            `}</Text>
          </View>
        )}

        {/* Header */}
        <View style={{alignItems:'center',marginBottom:16}}>
          <Text style={{fontSize:22,fontWeight:'800',color:navy}}>My Maharaj — Weekly Meal Plan</Text>
          <Text style={{fontSize:13,color:'#5A7A8A',marginTop:4}}>{dateRange}{servingsCount > 0 ? ` · Cooking for ${servingsCount} people` : ''}</Text>
        </View>

        {/* Print button */}
        {Platform.OS === 'web' && (
          <TouchableOpacity style={{position:'absolute',top:0,right:0,paddingHorizontal:14,paddingVertical:8,borderRadius:8,backgroundColor:'rgba(27,58,92,0.1)'}} onPress={doPrint}>
            <Text style={{fontSize:12,fontWeight:'700',color:navy}}>Print / PDF</Text>
          </TouchableOpacity>
        )}

        {/* Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{borderWidth:1,borderColor:BORDER,borderRadius:4,overflow:'hidden'}}>
            {/* Header row */}
            <View style={{flexDirection:'row'}}>
              <View style={{width:90,padding:10,backgroundColor:BORDER,justifyContent:'center'}}>
                <Text style={{fontSize:12,fontWeight:'800',color:white}}>Meal</Text>
              </View>
              {generatedPlan.map((day) => {
                const d = new Date(day.date);
                const label = `${day.day.substring(0,3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
                return (
                  <View key={day.date} style={{width:COL_W,padding:10,backgroundColor:BORDER,borderLeftWidth:1,borderLeftColor:'rgba(255,255,255,0.2)'}}>
                    <Text style={{fontSize:11,fontWeight:'700',color:white,textAlign:'center'}}>{label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Data rows */}
            {slotsToShow.map(({ key, label }, slotIdx) => (
              <View key={key} style={{flexDirection:'row',borderTopWidth:1,borderTopColor:BORDER}}>
                <View style={{width:90,padding:10,backgroundColor: slotIdx % 2 === 0 ? '#E8F4FF' : white,justifyContent:'center',borderRightWidth:1,borderRightColor:BORDER}}>
                  <Text style={{fontSize:11,fontWeight:'800',color:navy}}>{label}</Text>
                </View>
                {generatedPlan.map((day, dayIdx) => {
                  const opt = getOpt(dayIdx, key);
                  const isThali = opt?.name?.toLowerCase().includes('thali');
                  const thaliSummary = isThali && opt?.description?.includes(' | ')
                    ? opt.description.split(' | ').map(c => c.split(':')[0].trim()).join(' · ')
                    : null;
                  return (
                    <View key={day.date} style={{width:COL_W,padding:8,backgroundColor: slotIdx % 2 === 0 ? '#E8F4FF' : white,borderLeftWidth:1,borderLeftColor:'#D1D5DB'}}>
                      <Text style={{fontSize:11,fontWeight:'700',color:'#1F2937',lineHeight:15}}>{opt?.name ?? '—'}</Text>
                      {thaliSummary && (
                        <Text style={{fontSize:9,color:'#5A7A8A',marginTop:2,lineHeight:12}}>{thaliSummary}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Watermark */}
        <Text style={{textAlign:'center',fontSize:10,color:'#D1D5DB',marginTop:12,fontStyle:'italic'}}>Generated by My Maharaj</Text>

        {/* Action buttons */}
        <View style={{flexDirection:'row',gap:8,marginTop:20}}>
          <TouchableOpacity
            style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'rgba(27,58,92,0.3)',backgroundColor:'rgba(255,255,255,0.9)',alignItems:'center'}}
            onPress={()=>{setGeneratedPlan(null);setSelections({});setActiveDay(0);setStep('generating');}}
          >
            <Text style={{fontSize:13,fontWeight:'600',color:'#1B3A5C'}}>Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:navy,alignItems:'center'}}
            onPress={() => advance('cook-or-order')}
          >
            <Text style={{fontSize:14,fontWeight:'700',color:white}}>Done — Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderCookOrOrder() {
    return (
      <View style={{paddingVertical:8}}>
        <Text style={s.stepTitle}>How would you like to proceed?</Text>
        <Text style={s.stepSub}>Your meal plan is confirmed!</Text>
        <View style={{gap:14,marginVertical:20}}>
          <TouchableOpacity style={{backgroundColor:'white',borderRadius:18,padding:20,borderWidth:1.5,borderColor:'rgba(27,58,92,0.12)',flexDirection:'row',alignItems:'center',gap:16,shadowColor:'#1B3A5C',shadowOffset:{width:0,height:3},shadowOpacity:0.1,shadowRadius:10,elevation:3}} onPress={()=>advance('recipes')} activeOpacity={0.85}>
            <Image source={require('../assets/logo.png')} style={{width:64,height:30}} resizeMode="contain" />
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'800',color:'#1B3A5C',marginBottom:4}}>Cook at Home</Text>
              <Text style={{fontSize:13,color:'#5A7A8A',lineHeight:18}}>Full recipes & step-by-step instructions</Text>
            </View>
            <Text style={{fontSize:24,color:'#9CA3AF',fontWeight:'300'}}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{backgroundColor:'white',borderRadius:18,padding:20,borderWidth:1.5,borderColor:'rgba(27,58,92,0.12)',flexDirection:'row',alignItems:'center',gap:16,shadowColor:'#1B3A5C',shadowOffset:{width:0,height:3},shadowOpacity:0.1,shadowRadius:10,elevation:3}} onPress={()=>router.push('/order-out' as never)} activeOpacity={0.85}>
            <View style={{width:64,height:30,backgroundColor:'#E3F2FD',borderRadius:10,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#1B3A5C'}}>Delivery</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'800',color:'#1B3A5C',marginBottom:4}}>Order Out</Text>
              <Text style={{fontSize:13,color:'#5A7A8A',lineHeight:18}}>Find delivery options near you</Text>
            </View>
            <Text style={{fontSize:24,color:'#9CA3AF',fontWeight:'300'}}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={{borderRadius:14,paddingVertical:14,alignItems:'center',borderWidth:1.5,borderColor:'rgba(27,58,92,0.25)',backgroundColor:'rgba(255,255,255,0.9)',marginTop:16}} onPress={()=>router.push('/home' as never)}>
          <Text style={{fontSize:14,color:'#1B3A5C',fontWeight:'700'}}>Done — Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderCuisineConfirm() {
    const ALL_CUISINES = ['Afghan','American','Andhra','Assamese','Awadhi','Bangladeshi','Bengali','Bihari','Brazilian','Burmese','Cantonese','Chettinad','Chinese','Continental','Coorgi','Egyptian','Emirati','Ethiopian','Filipino','French','German','Goan','Greek','Gujarati','Hyderabadi','Indonesian','Iranian','Israeli','Italian','Japanese','Kashmiri','Kenyan','Konkani','Korean','Kuwaiti','Lebanese','Maharashtrian','Malabar','Malaysian','Mangalorean','Mediterranean','Mexican','Moroccan','Mughlai','Nepali','Nigerian','Odia','Omani','Pakistani','Persian','Peruvian','Punjabi','Rajasthani','Saudi','Singaporean','South African','South Indian','Spanish','Sri Lankan','Szechuan','Tamil','Telugu','Thai','Turkish','Udupi','Vietnamese'].sort();
    const allSaved = savedCuisines.length > 0 ? savedCuisines : ['Konkani'];
    const activeCuisines = allSaved.filter(c => !removedCuisines.includes(c));
    return (
      <View>
        <Text style={s.stepTitle}>Confirm cuisines for this plan</Text>
        <Text style={s.stepSub}>Tap ✕ to exclude a cuisine for this plan only</Text>

        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:14,padding:14,marginBottom:12,borderWidth:1,borderColor:'rgba(27,58,92,0.1)'}}>
          <Text style={{fontSize:12,fontWeight:'700',color:'#5A7A8A',textTransform:'uppercase',letterSpacing:0.4,marginBottom:8}}>Your saved cuisines</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
            {activeCuisines.map(c => (
              <TouchableOpacity key={c} style={{backgroundColor:'#E3F2FD',borderRadius:12,paddingHorizontal:10,paddingVertical:5,flexDirection:'row',gap:4,alignItems:'center'}} onPress={() => setRemovedCuisines(prev => [...prev, c])}>
                <Text style={{fontSize:12,fontWeight:'600',color:'#1B3A5C'}}>{c}</Text>
                <Text style={{fontSize:10,color:'#9CA3AF'}}>✕</Text>
              </TouchableOpacity>
            ))}
            {removedCuisines.length > 0 && (
              <TouchableOpacity style={{paddingHorizontal:10,paddingVertical:5}} onPress={() => setRemovedCuisines([])}>
                <Text style={{fontSize:11,color:'#1A6B5C',fontWeight:'600'}}>Restore all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {extraCuisines.length > 0 && (
          <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:14,padding:14,marginBottom:12,borderWidth:1,borderColor:'rgba(26,107,60,0.2)'}}>
            <Text style={{fontSize:12,fontWeight:'700',color:'#1A6B5C',textTransform:'uppercase',letterSpacing:0.4,marginBottom:8}}>Added for this plan</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
              {extraCuisines.map(c => (
                <TouchableOpacity key={c} style={{backgroundColor:'#D1FAE5',borderRadius:12,paddingHorizontal:10,paddingVertical:5,flexDirection:'row',gap:4,alignItems:'center'}} onPress={() => setExtraCuisines(prev => prev.filter(x => x !== c))}>
                  <Text style={{fontSize:12,fontWeight:'600',color:'#1A6B5C'}}>{c}</Text>
                  <Text style={{fontSize:10,color:'#5A7A8A'}}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={{fontSize:12,fontWeight:'700',color:'#5A7A8A',textTransform:'uppercase',letterSpacing:0.4,marginBottom:8,marginTop:8}}>Add a cuisine for this plan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
          <View style={{flexDirection:'row',gap:6,paddingVertical:4}}>
            {ALL_CUISINES.filter(c => !activeCuisines.includes(c) && !extraCuisines.includes(c)).map(c => (
              <TouchableOpacity key={c} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:16,borderWidth:1.5,borderColor:'#D4EDE5',backgroundColor:'rgba(255,255,255,0.9)'}} onPress={() => setExtraCuisines(prev => [...prev, c])}>
                <Text style={{fontSize:12,fontWeight:'600',color:'#1B3A5C'}}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{gap:12,marginTop:8}}>
          <TouchableOpacity style={{backgroundColor:'#1B3A5C',borderRadius:14,paddingVertical:18,alignItems:'center'}} onPress={() => advance('generating')} activeOpacity={0.85}>
            <Text style={{fontSize:16,fontWeight:'800',color:'white'}}>Generate My Meal Plan</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.25)',borderRadius:14,paddingVertical:14,alignItems:'center'}} onPress={goBack}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#1B3A5C'}}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:14,paddingVertical:14,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const STEP_RENDER: Record<WizardStep, () => React.ReactNode> = {
    'period':           renderPeriod,
    'food-pref':        renderFoodPref,
    'meal-prefs':       renderMealPrefs,
    'unwell':           renderUnwell,
    'nutrition':        renderNutrition,
    'cuisine-confirm':  renderCuisineConfirm,
    'generating':       renderGenerating,
    'generating-error': renderGeneratingError,
    'selection':        renderSelection,
    'plan-summary':     renderPlanSummary,
    'guest-cuisine':    renderGuestCuisine,
    'veg-days':         renderVegDays,
    'cook-or-order':    renderCookOrOrder,
    'recipes':          renderRecipes,
    'grocery':          renderGrocery,
    'delivery-apps':    renderDeliveryApps,
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
          <Text style={s.headerTitle}>Curating Your Meal Plan</Text>
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

