import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Dimensions, Easing, Image, ImageBackground, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { generateMealPlan, MealOption, MealPlanDay, emptyHealthFlags, HealthFlags } from '../lib/ai';
import { loadOrDetectLocation, UserLocation } from '../lib/location';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { navy, gold, peacock, textSec, errorRed, white, border, surface, textColor, successGreen } from '../theme/colors';
import MarqueeTicker from '../components/MarqueeTicker';
import MaharajSpinner from '../components/MaharajSpinner';
import { getCuisineGroups } from '../lib/cuisineGroups';


// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep =
  | 'members' | 'days-meals' | 'nutrition'
  | 'period' | 'food-pref' | 'guest-cuisine' | 'meal-prefs' | 'unwell' | 'veg-days' | 'cuisine-confirm'
  | 'generating' | 'generating-error' | 'selection' | 'confirmed-menu' | 'plan-summary'
  | 'cook-or-order' | 'cook-at-home' | 'recipes' | 'grocery' | 'delivery-apps' | 'online-shopping' | 'feedback'
  | 'plan-detail';

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface DBMember { id: string; name: string; age: number; }
interface FeedbackEntry { dishName: string; rating: 1 | -1 | null; comment: string; }

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d: Date) { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
// BUG 3 FIX: Use local timezone, NOT UTC — prevents "yesterday" bug for Dubai (UTC+4)
function toYMD(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
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

const USER_STEPS: WizardStep[] = ['members','days-meals','nutrition'];
function stepNum(step: WizardStep): number { return USER_STEPS.indexOf(step) + 1; }
function totalUserSteps(): number { return USER_STEPS.length; }

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function MealWizardScreen() {
  const [step, setStep] = useState<WizardStep>('members');
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
  const [selections,      setSelections]      = useState<Record<number, Partial<Record<MealSlotKey, number>>>>({});
  const [expandedDays,    setExpandedDays]    = useState<Record<number, boolean>>({ 0: true });
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
  const [activeDay,       setActiveDay]       = useState(0);

  // Post-selection
  const [recipeDishes, setRecipeDishes] = useState<string[]>([]);
  const [feedbacks,    setFeedbacks]    = useState<FeedbackEntry[]>([]);
  const [feedbackDone, setFeedbackDone] = useState(false);

  // Fridge cross-reference
  const [fridgeItems, setFridgeItems] = useState<any[]>([]);
  const [tableModalVisible, setTableModalVisible] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'idle'|'trolley-loading'|'barcode'|'review'>('idle');
  const [scannedItems, setScannedItems] = useState<{name:string;quantity:string;category:string}[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [step]);

  // Intercept hardware back button — route through internal wizard navigation
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        goBack();
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [step])
  );

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

  // New wizard states
  const [checkedMembers, setCheckedMembers] = useState<Record<string, boolean>>({});
  const [hasGuestsWiz, setHasGuestsWiz] = useState(false);
  const [guestCountWiz, setGuestCountWiz] = useState('');
  const [guestCuisineMode, setGuestCuisineMode] = useState<'same'|'different'>('same');
  const [guestCuisines, setGuestCuisines] = useState<string[]>([]);
  const [numDaysWiz, setNumDaysWiz] = useState(3);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['breakfast','lunch','dinner']);
  const [weekExtras, setWeekExtras] = useState<string[]>([]);
  const [weekFoodPref, setWeekFoodPref] = useState('As per family profile');
  const [selectedCuisinesWiz, setSelectedCuisinesWiz] = useState<string[]>([]);
  const [nutritionGoalsWiz, setNutritionGoalsWiz] = useState<string[]>([]);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const [isJainFamily, setIsJainFamily] = useState(false);
  const CUISINE_GROUPS = getCuisineGroups(isJainFamily);

  // Load members + cuisines on mount
  useEffect(() => {
    async function loadWiz() {
      const user = await getSessionUser();
      if (!user) return;
      const { data } = await supabase.from('family_members').select('id, name, age, health_notes').eq('user_id', user.id);
      const members = (data ?? []) as DBMember[];
      setFamilyMembers(members);
      const checked: Record<string, boolean> = {};
      members.forEach(m => { checked[m.id] = true; });
      setCheckedMembers(checked);
      // Load saved cuisines
      const { data: cuisineData } = await supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false);
      const saved = (cuisineData ?? []).map((c: any) => c.cuisine_name);
      setSelectedCuisinesWiz(saved);
      setSavedCuisines(saved);
      // Load fridge inventory for cross-reference
      const { data: fridgeData } = await supabase.from('fridge_inventory').select('id, item_name, quantity, unit').eq('user_id', user.id);
      setFridgeItems(fridgeData ?? []);
      // FIX 3: Load saved dietary preference from AsyncStorage
      const savedFoodPref = await AsyncStorage.getItem('dietary_food_pref');
      const savedNonVegOpts = await AsyncStorage.getItem('dietary_nonveg_opts');
      const savedIsMixed = await AsyncStorage.getItem('dietary_is_mixed');
      if (savedFoodPref) setFoodPref(savedFoodPref as 'veg' | 'nonveg');
      if (savedNonVegOpts) try { setNonVegOpts(JSON.parse(savedNonVegOpts)); } catch {}
      if (savedIsMixed === 'true') setIsMixed(true);
      const jf = await AsyncStorage.getItem('jain_family');
      if (jf === 'true') setIsJainFamily(true);
    }
    void loadWiz();
    loadOrDetectLocation().then(setUserLocation);
  }, []);

  // ── Pulse animation ──────────────────────────────────────────────────────

  // Spinner animation now handled by isolated MaharajSpinner component — see components/MaharajSpinner.tsx

  // ── Generation ────────────────────────────────────────────────────────────

  const runGeneration = useCallback(async () => {
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
      setServingsCount(totalServings);

      // Ensure slots is never empty - default to breakfast/lunch/dinner
      const slotsToUse = selectedSlots.length > 0 ? selectedSlots : ['breakfast', 'lunch', 'dinner'];

      // FIX 4: Make weekFoodPref functional — override foodPref if user changed it this week
      let effectiveFoodPref: 'veg' | 'nonveg' | null = foodPref;
      let effectiveIsMixed = isMixed;
      if (weekFoodPref === 'Non-vegetarian') { effectiveFoodPref = 'nonveg'; effectiveIsMixed = false; }
      else if (weekFoodPref === 'Vegetarian this week' || weekFoodPref === 'Vegetarian') { effectiveFoodPref = 'veg'; effectiveIsMixed = false; }
      else if (weekFoodPref === 'Eggetarian') { effectiveFoodPref = 'nonveg'; effectiveIsMixed = false; }
      else if (weekFoodPref === 'Mixed') { effectiveFoodPref = 'nonveg'; effectiveIsMixed = true; }
      // FIX 5: Null default → vegetarian (safe default)
      if (!effectiveFoodPref) effectiveFoodPref = 'veg';

      // FIX 2: Save dietary to AsyncStorage for persistence
      await AsyncStorage.setItem('dietary_food_pref', effectiveFoodPref);
      await AsyncStorage.setItem('dietary_nonveg_opts', JSON.stringify(nonVegOpts));
      await AsyncStorage.setItem('dietary_is_mixed', String(effectiveIsMixed));

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
          type:          effectiveFoodPref,
          vegType:       vegType ?? undefined,
          nonVegOptions: nonVegOpts.length > 0 ? nonVegOpts : undefined,
        },
        allowedProteins: nonVegOpts.length > 0 ? nonVegOpts : undefined,
        isMixed: effectiveIsMixed,
        unwellMembers:  unwellNames.length > 0 ? unwellNames : undefined,
        nutritionFocus: [nutritionGoals.length > 0 ? nutritionGoals.join(', ') : '', `Vary dishes (seed:${Date.now()})`].filter(Boolean).join('. '),
        vegDays:        profile?.veg_days ?? [],
        cuisinePerDay: (() => {
          const dates = getDates(selectedFrom, selectedTo);
          // FIX 2: Use selectedCuisinesWiz (days-meals step) as primary, fall back to saved/extra
          const wizCuisines = selectedCuisinesWiz.length > 0 ? selectedCuisinesWiz : [];
          const allCuisines = wizCuisines.length > 0
            ? wizCuisines
            : [...savedCuisines.filter(c => !removedCuisines.includes(c)), ...extraCuisines];
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

      const defaultSel: Record<number, Partial<Record<MealSlotKey, number>>> = {};
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

  async function saveDishFeedback(dishName: string, feedback: 'up' | 'down') {
    try {
      const user = await getSessionUser();
      if (!user) return;
      await supabase.from('dish_feedback').insert({ user_id: user.id, dish_name: dishName, feedback });
      console.log(`[Feedback] ${feedback} for "${dishName}"`);
      // Auto-ban: if 10+ thumbs down across all users
      if (feedback === 'down') {
        const { count } = await supabase.from('dish_feedback').select('id', { count: 'exact', head: true }).eq('dish_name', dishName).eq('feedback', 'down');
        if ((count ?? 0) >= 10) {
          await supabase.from('dishes').update({ is_banned: true }).eq('name', dishName);
          console.log(`[Feedback] "${dishName}" auto-banned (10+ thumbs down)`);
        }
      }
    } catch (e) { console.log('[Feedback] save failed:', e); }
  }

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
    const [menuRes, dishRes] = await Promise.all([
      supabase.from('menu_history').insert(menuPayload),
      dishRows.length > 0 ? supabase.from('dish_history').insert(dishRows) : Promise.resolve({ error: null }),
    ]);
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
    let html = '<html><head><title>Shopping List</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#2E5480;font-size:20px}p{color:#666;font-size:12px}h2{color:#1A6B5C;font-size:13px;margin-top:18px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#2E5480;color:white;padding:8px;text-align:left;font-size:11px}td{padding:8px;border-bottom:1px solid #E5E7EB;font-size:13px}.qty{text-align:right;color:#1A6B5C;font-weight:600;width:80px}</style></head><body>';
    html += '<h1>My Maharaj Shopping List</h1><p>' + today + '</p>';
    CAT_ORDER.forEach(cat => {
      const items = grocery[cat];
      if (!items || !items.length) return;
      html += '<h2>' + cat + '</h2><table><tr><th>#</th><th>Item</th><th class="qty">Qty</th></tr>';
      items.forEach((it, i) => { html += '<tr><td>' + (i+1) + '</td><td>' + it.name + '</td><td class="qty">' + (it.qty ? it.qty + (it.unit||'') : '—') + '</td></tr>'; });
      html += '</table>';
    });
    html += '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'maharaj-shopping-list.html'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
      'plan-detail': 'plan-summary',
      'cook-or-order': 'plan-summary',
      'recipes': 'cook-or-order',
      'grocery': 'recipes',
      'delivery-apps': 'grocery',
      'online-shopping': 'grocery',
      'feedback': 'delivery-apps',
    };
    const prev = backMap[step];
    if (prev) setStep(prev);
    else router.back();
  }

  // ── NEW STEP RENDERS ──────────────────────────────────────────────────────

  function renderMembers() {
    return (
      <View>
        <Text style={s.stepTitle}>Who's eating this week?</Text>
        <Text style={s.stepSub}>Select family members for the meal plan</Text>
        {familyMembers.length === 0 ? (
          <View style={{alignItems:'center',paddingVertical:30}}>
            <Text style={{fontSize:14,color:textSec,textAlign:'center',marginBottom:16}}>No family members added yet.{'\n'}Please set up your Family Profile first.</Text>
            <TouchableOpacity style={{backgroundColor:gold,borderRadius:12,paddingVertical:12,paddingHorizontal:24}} onPress={() => router.push('/dietary-profile' as never)}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Go to Family Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          familyMembers.map(m => (
            <TouchableOpacity key={m.id} style={{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:12,marginBottom:8,borderWidth:1,borderColor:'rgba(27,58,92,0.08)'}} onPress={() => setCheckedMembers(prev => ({...prev,[m.id]:!prev[m.id]}))} activeOpacity={0.8}>
              <View style={{width:32,height:32,borderRadius:16,backgroundColor:navy,alignItems:'center',justifyContent:'center',marginRight:10}}>
                <Text style={{fontSize:13,fontWeight:'800',color:gold}}>{m.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:navy}}>{m.name}</Text>
                {m.age > 0 && <Text style={{fontSize:10,color:textSec}}>{m.age} yrs</Text>}
              </View>
              <View style={{width:22,height:22,borderRadius:6,borderWidth:2,borderColor:checkedMembers[m.id]?navy:'#D1D5DB',backgroundColor:checkedMembers[m.id]?navy:white,alignItems:'center',justifyContent:'center'}}>
                {checkedMembers[m.id] && <Text style={{fontSize:13,color:white,fontWeight:'800'}}>{'\u2713'}</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
        {familyMembers.length > 0 && (
          <>
            <Text style={{fontSize:11,fontWeight:'700',color:navy,marginTop:16,marginBottom:8}}>Any guests this week?</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
              <TouchableOpacity style={{paddingHorizontal:16,paddingVertical:9,borderRadius:20,borderWidth:1.5,borderColor:!hasGuestsWiz?navy:'#D1D5DB',backgroundColor:!hasGuestsWiz?navy:'rgba(255,255,255,0.9)'}} onPress={() => setHasGuestsWiz(false)}>
                <Text style={{fontSize:13,fontWeight:'600',color:!hasGuestsWiz?white:'#6B7280'}}>Just family</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{paddingHorizontal:16,paddingVertical:9,borderRadius:20,borderWidth:1.5,borderColor:hasGuestsWiz?navy:'#D1D5DB',backgroundColor:hasGuestsWiz?navy:'rgba(255,255,255,0.9)'}} onPress={() => setHasGuestsWiz(true)}>
                <Text style={{fontSize:13,fontWeight:'600',color:hasGuestsWiz?white:'#6B7280'}}>+ Guests</Text>
              </TouchableOpacity>
            </View>
            {hasGuestsWiz && (
              <View style={{marginBottom:8}}>
                <TextInput style={{borderWidth:1.5,borderColor:border,borderRadius:10,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:navy,backgroundColor:'rgba(255,255,255,0.9)',width:140}} keyboardType="numeric" placeholder="Number of guests" placeholderTextColor={textSec} value={guestCountWiz} onChangeText={setGuestCountWiz} />
                <View style={{flexDirection:'row',gap:8,marginTop:8}}>
                  <TouchableOpacity style={{paddingHorizontal:12,paddingVertical:7,borderRadius:16,borderWidth:1.5,borderColor:guestCuisineMode==='same'?navy:'#D1D5DB',backgroundColor:guestCuisineMode==='same'?navy:'rgba(255,255,255,0.9)'}} onPress={() => setGuestCuisineMode('same')}>
                    <Text style={{fontSize:12,fontWeight:'600',color:guestCuisineMode==='same'?white:'#6B7280'}}>Same cuisine as family</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{paddingHorizontal:12,paddingVertical:7,borderRadius:16,borderWidth:1.5,borderColor:guestCuisineMode==='different'?navy:'#D1D5DB',backgroundColor:guestCuisineMode==='different'?navy:'rgba(255,255,255,0.9)'}} onPress={() => setGuestCuisineMode('different')}>
                    <Text style={{fontSize:12,fontWeight:'600',color:guestCuisineMode==='different'?white:'#6B7280'}}>Different cuisine</Text>
                  </TouchableOpacity>
                </View>
                {guestCuisineMode === 'different' && (
                  <View style={{marginTop:8}}>
                    <Text style={{fontSize:10,color:textSec,marginBottom:6}}>Guest cuisine preference</Text>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                      {['North Indian','South Indian','Punjabi','Bengali','Gujarati','Continental','Chinese','Arabic'].map(c => (
                        <TouchableOpacity key={c} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,borderWidth:1.5,borderColor:guestCuisines.includes(c)?gold:'#D1D5DB',backgroundColor:guestCuisines.includes(c)?gold:'rgba(255,255,255,0.9)'}} onPress={() => setGuestCuisines(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c])}>
                          <Text style={{fontSize:11,fontWeight:'600',color:guestCuisines.includes(c)?'#1B2A0C':navy}}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}
        <View style={{flexDirection:'row',gap:10,marginTop:20}}>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:navy,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
            <Text style={{fontSize:14,fontWeight:'600',color:navy}}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}} onPress={() => setStep('days-meals')}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  function renderDaysMeals() {
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const toggleDay = (d: string) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : prev.length < 7 ? [...prev, d] : prev);
    // Sync numDaysWiz with selectedDays
    const effectiveDays = selectedDays.length || numDaysWiz;
    return (
      <View>
        <Text style={s.stepTitle}>Plan your week</Text>
        <Text style={[s.sectionLabel,{marginTop:8}]}>SELECT DAYS</Text>
        <View style={{flexDirection:'row',gap:4,marginBottom:6}}>
          {dayNames.map(d => {
            const active = selectedDays.includes(d);
            return (
              <TouchableOpacity key={d} style={{flex:1,height:36,borderRadius:8,backgroundColor:active?navy:'#E5E7EB',alignItems:'center',justifyContent:'center'}} onPress={() => toggleDay(d)}>
                <Text style={{fontSize:10,fontWeight:'700',color:active?white:'#9CA3AF'}}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{fontSize:9,color:textSec,marginBottom:12}}>{selectedDays.length > 0 ? `${selectedDays.length} day${selectedDays.length>1?'s':''} selected` : 'Tap days to select, or use counter below'}</Text>
        {selectedDays.length === 0 && (
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:16,marginBottom:12}}>
            <TouchableOpacity style={{width:32,height:32,borderRadius:16,borderWidth:2,borderColor:navy,alignItems:'center',justifyContent:'center'}} onPress={() => setNumDaysWiz(Math.max(1,numDaysWiz-1))} disabled={numDaysWiz<=1}>
              <Text style={{fontSize:18,color:navy,fontWeight:'700'}}>-</Text>
            </TouchableOpacity>
            <Text style={{fontSize:14,color:navy,minWidth:60,textAlign:'center'}}>{numDaysWiz} day{numDaysWiz>1?'s':''}</Text>
            <TouchableOpacity style={{width:32,height:32,borderRadius:16,backgroundColor:navy,alignItems:'center',justifyContent:'center'}} onPress={() => setNumDaysWiz(Math.min(7,numDaysWiz+1))} disabled={numDaysWiz>=7}>
              <Text style={{fontSize:18,color:gold,fontWeight:'700'}}>+</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={s.sectionLabel}>WHICH MEALS?</Text>
        <View style={{flexDirection:'row',gap:6,marginBottom:16}}>
          {[{k:'breakfast',l:'Breakfast'},{k:'lunch',l:'Lunch'},{k:'snack',l:'Snack'},{k:'dinner',l:'Dinner'}].map(({k,l}) => (
            <TouchableOpacity key={k} style={{flex:1,paddingVertical:9,borderRadius:16,borderWidth:1.5,borderColor:selectedMeals.includes(k)?navy:'#D1D5DB',backgroundColor:selectedMeals.includes(k)?navy:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => setSelectedMeals(prev => prev.includes(k)?prev.filter(x=>x!==k):[...prev,k])}>
              <Text style={{fontSize:11,fontWeight:'600',color:selectedMeals.includes(k)?white:navy}}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.sectionLabel}>ANYTHING DIFFERENT THIS WEEK?</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:16}}>
          {['Veg days','Someone unwell','Festival','Chaat'].map(e => (
            <TouchableOpacity key={e} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:16,borderWidth:1.5,borderColor:weekExtras.includes(e)?navy:'#D1D5DB',backgroundColor:weekExtras.includes(e)?navy:'rgba(255,255,255,0.9)'}} onPress={() => setWeekExtras(prev => prev.includes(e)?prev.filter(x=>x!==e):[...prev,e])}>
              <Text style={{fontSize:12,fontWeight:'600',color:weekExtras.includes(e)?white:navy}}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* P11: Veg days selector */}
        {weekExtras.includes('Veg days') && (
          <View style={{marginBottom:12}}>
            <Text style={{fontSize:10,fontWeight:'600',color:textSec,marginBottom:6}}>Which days are vegetarian?</Text>
            <View style={{flexDirection:'row',gap:4}}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                const active = vegFastDays[d] === 'veg';
                return (
                  <TouchableOpacity key={d} style={{flex:1,paddingVertical:8,borderRadius:8,borderWidth:1.5,borderColor:active?'#1A6B3C':'#D1D5DB',backgroundColor:active?'#E8F5E9':'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => setVegFastDays(prev => ({...prev, [d]: active ? '' : 'veg'}))}>
                    <Text style={{fontSize:10,fontWeight:'700',color:active?'#1A6B3C':navy}}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        <Text style={s.sectionLabel}>FOOD PREFERENCE THIS WEEK</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:16}}>
          {['As per family profile','Vegetarian this week','Non-vegetarian','Eggetarian','Mixed'].map(fp => (
            <TouchableOpacity key={fp} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,borderWidth:1.5,borderColor:weekFoodPref===fp?navy:'#D1D5DB',backgroundColor:weekFoodPref===fp?navy:'rgba(255,255,255,0.9)'}} onPress={() => setWeekFoodPref(fp)}>
              <Text style={{fontSize:11,fontWeight:'500',color:weekFoodPref===fp?white:navy}}>{fp}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.sectionLabel}>CUISINE</Text>
        {CUISINE_GROUPS.map(group => (
          <View key={group.label} style={{marginBottom:10}}>
            <Text style={{fontSize:9,fontWeight:'700',color:textSec,letterSpacing:0.5,marginBottom:4,textTransform:'uppercase'}}>{group.label}</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
              {group.cuisines.map(c => (
                <TouchableOpacity key={c} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,borderWidth:1.5,borderColor:selectedCuisinesWiz.includes(c)?navy:'#D4EDE5',backgroundColor:selectedCuisinesWiz.includes(c)?navy:'rgba(255,255,255,0.9)'}} onPress={() => setSelectedCuisinesWiz(prev => prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])}>
                  <Text style={{fontSize:11,fontWeight:'500',color:selectedCuisinesWiz.includes(c)?white:navy}}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{flexDirection:'row',gap:8,marginTop:8}}>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:navy,alignItems:'center'}} onPress={() => setStep('members')}>
            <Text style={{fontSize:14,fontWeight:'600',color:navy}}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{paddingVertical:14,paddingHorizontal:20,borderRadius:12,backgroundColor:navy,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
            <Text style={{fontSize:14,fontWeight:'700',color:white}}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}} onPress={() => setStep('nutrition')}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderNutritionNew() {
    const groups: {label:string;items:string[]}[] = [
      {label:'WEIGHT & BODY',items:['Weight loss','Weight gain','Muscle gain','Maintain weight']},
      {label:'CARBS & ENERGY',items:['Keto','Low carb','High carb','Low GI']},
      {label:'PROTEIN & FAT',items:['High protein','Low fat','Healthy fats']},
      {label:'FIBRE & GUT',items:['High fibre','Low fibre','Gut friendly']},
      {label:'HEALTH CONDITIONS',items:['Diabetic-friendly','Heart healthy','Low sodium','PCOS support','Anti-inflammatory','Thyroid support']},
      {label:'VITAMINS & MINERALS',items:['Iron-rich','Calcium','Vitamin D','B12','Omega-3','Zinc']},
      {label:'NO SPECIFIC GOAL',items:['Everyday balanced']},
    ];
    function toggleGoal(g: string) {
      if (g === 'Everyday balanced') { setNutritionGoalsWiz(['Everyday balanced']); return; }
      setNutritionGoalsWiz(prev => {
        const next = prev.filter(x => x !== 'Everyday balanced');
        return next.includes(g) ? next.filter(x => x !== g) : [...next, g];
      });
    }
    // Wire up generation: compute dates and set from/to, then start
    function startGeneration() {
      const today = startOfDay(new Date());
      const dayMap: Record<string, number> = { 'Sun':0,'Mon':1,'Tue':2,'Wed':3,'Thu':4,'Fri':5,'Sat':6 };

      if (selectedDays.length > 0) {
        // FIX 3: Convert selected day names to actual calendar dates
        const todayDow = today.getDay(); // 0=Sun
        const targetDates = selectedDays.map(d => {
          const targetDow = dayMap[d] ?? 0;
          let diff = targetDow - todayDow;
          if (diff < 0) diff += 7; // Next week if day has passed
          return addDays(today, diff);
        }).sort((a, b) => a.getTime() - b.getTime());
        setSelectedFrom(targetDates[0]);
        setSelectedTo(targetDates[targetDates.length - 1]);
      } else {
        setSelectedFrom(today);
        setSelectedTo(addDays(today, numDaysWiz - 1));
      }
      setSelectedSlots(selectedMeals);
      if (!foodPref) setFoodPref('veg');
      setStep('generating');
    }
    return (
      <View>
        <Text style={s.stepTitle}>Nutrition & diet goals</Text>
        <Text style={s.stepSub}>Select all that apply. Maharaj will tailor every dish accordingly.</Text>
        {groups.map(g => (
          <View key={g.label} style={{marginBottom:12}}>
            <Text style={{fontSize:9,fontWeight:'700',color:textSec,letterSpacing:1,marginBottom:6}}>{g.label}</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
              {g.items.map(item => {
                const active = nutritionGoalsWiz.includes(item);
                return (
                  <TouchableOpacity key={item} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:16,borderWidth:1.5,borderColor:active?navy:'#D1D5DB',backgroundColor:active?navy:'rgba(255,255,255,0.9)'}} onPress={() => toggleGoal(item)}>
                    <Text style={{fontSize:11,fontWeight:'600',color:active?white:navy}}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{flexDirection:'row',gap:8,marginTop:12}}>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:navy,alignItems:'center'}} onPress={() => setStep('days-meals')}>
            <Text style={{fontSize:14,fontWeight:'600',color:navy}}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{paddingVertical:14,paddingHorizontal:20,borderRadius:12,backgroundColor:navy,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
            <Text style={{fontSize:14,fontWeight:'700',color:white}}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}} onPress={startGeneration}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Generate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderCookOrOrderNew() {
    return (
      <View>
        {/* Banner */}
        <View style={{backgroundColor:'#2E5480',borderRadius:12,padding:14,marginBottom:16}}>
          <Text style={{fontSize:12,fontWeight:'500',color:'white',textAlign:'center'}}>Choose how you would like to proceed with your meal plan</Text>
        </View>

        {/* Card 1 — Cook at Home */}
        <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:'#C9A227',borderRadius:14,padding:16,marginBottom:12}} onPress={() => setStep('cook-at-home')} activeOpacity={0.85}>
          <Text style={{fontSize:16,fontWeight:'700',color:'#2E5480'}}>Cook at Home</Text>
          <Text style={{fontSize:12,color:'#1A6B5C',marginTop:4}}>Meal prep and shopping list</Text>
        </TouchableOpacity>

        {/* Card 2 — Order Out */}
        <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:'#2E5480',borderRadius:14,padding:16,marginBottom:12}} onPress={() => router.push('/order-out' as never)} activeOpacity={0.85}>
          <Text style={{fontSize:16,fontWeight:'700',color:'#2E5480'}}>Order Out</Text>
          <Text style={{fontSize:12,color:'#1A6B5C',marginTop:4}}>Order from your favourite restaurants</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={{fontSize:10,color:'#9CA3AF',textAlign:'center',paddingVertical:12,lineHeight:14}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any of these services.</Text>
      </View>
    );
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
              <Text style={{fontSize:13,fontWeight:'700',color:'#2E5480'}}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,padding:14,borderWidth:1,borderColor:'rgba(27,58,92,0.1)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <TouchableOpacity onPress={() => { if (canGoPrev) setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)); }} style={{padding:8,opacity:canGoPrev?1:0.3}}>
              <Text style={{fontSize:18,color:'#2E5480',fontWeight:'700'}}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:'#2E5480'}}>{monthName} {calMonth.getFullYear()}</Text>
            <TouchableOpacity onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} style={{padding:8}}>
              <Text style={{fontSize:18,color:'#2E5480',fontWeight:'700'}}>{'›'}</Text>
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
                <TouchableOpacity key={i} style={{width:'14.28%',height:36,alignItems:'center',justifyContent:'center',backgroundColor:inRange?'#2E5480':isToday?'rgba(27,58,92,0.15)':'transparent',borderRadius: isStart||isEnd||isToday ? 18 : 0,opacity:isPast?0.3:1}} onPress={() => tapDate(d)} disabled={isPast}>
                  <Text style={{fontSize:14,fontWeight:inRange||isToday?'700':'400',color:inRange?'#FFFFFF':'#2E5480'}}>{i+1}</Text>
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
          <TouchableOpacity
            style={[s.foodCard, foodPref === 'nonveg' && !isMixed && weekFoodPref === 'Eggetarian' && s.foodCardActive]}
            onPress={() => { setFoodPref('nonveg'); setVegType(null); setIsMixed(false); setNonVegOpts(['Eggs']); setWeekFoodPref('Eggetarian'); }} activeOpacity={0.85}>
            <Text style={s.foodCardIcon}>🥚</Text>
            <Text style={[s.foodCardLabel, foodPref === 'nonveg' && !isMixed && weekFoodPref === 'Eggetarian' && s.foodCardLabelActive]}>Eggetarian</Text>
            <Text style={{fontSize:11,color:'#5A7A8A',marginTop:2}}>Veg + eggs only</Text>
          </TouchableOpacity>
        </View>

        {/* Meal slots */}
        <Text style={[s.sectionLabel,{marginTop:16}]}>WHICH MEALS TO PLAN?</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
          {[{k:'breakfast',i:'',l:'Breakfast'},{k:'lunch',i:'',l:'Lunch'},{k:'dinner',i:'',l:'Dinner'},{k:'snack',i:'',l:'Evening Snack'}].map(({k,i,l})=>(
            <TouchableOpacity key={k}
              style={{paddingHorizontal:14,paddingVertical:9,borderRadius:20,borderWidth:1.5,borderColor:selectedSlots.includes(k)?'#2E5480':'#D4EDE5',backgroundColor:selectedSlots.includes(k)?'#2E5480':'rgba(255,255,255,0.9)'}}
              onPress={()=>setSelectedSlots(prev=>prev.includes(k)?prev.filter(x=>x!==k):[...prev,k])}>
              <Text style={{fontSize:13,fontWeight:'600',color:selectedSlots.includes(k)?'#FFFFFF':'#2E5480'}}>{i} {l}</Text>
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
                    style={{paddingHorizontal:14,paddingVertical:9,borderRadius:20,borderWidth:1.5,borderColor:presentMembers.includes(m.id)?'#2E5480':'#D4EDE5',backgroundColor:presentMembers.includes(m.id)?'#2E5480':'rgba(255,255,255,0.9)'}}
                    onPress={()=>setPresentMembers(prev=>prev.includes(m.id)?prev.filter(x=>x!==m.id):[...prev,m.id])}>
                    <Text style={{fontSize:13,fontWeight:'600',color:presentMembers.includes(m.id)?'#FFFFFF':'#2E5480'}}>{m.name}</Text>
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
              style={{paddingHorizontal:14,paddingVertical:8,borderRadius:16,borderWidth:1.5,borderColor:guestCount===n?'#2E5480':'#D4EDE5',backgroundColor:guestCount===n?'#2E5480':'rgba(255,255,255,0.9)'}}
              onPress={()=>setGuestCount(n)}>
              <Text style={{fontSize:13,fontWeight:'600',color:guestCount===n?'#FFFFFF':'#2E5480'}}>{n===0?'None':'+'+n}</Text>
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

  const [genPaused, setGenPaused] = useState(false);

  function renderGenerating() {
    const completedDays = generatingProgress?.current || 0;
    const totalDays = selectedFrom && selectedTo ? getDates(selectedFrom, selectedTo).length : (selectedDays.length || numDaysWiz);
    return (
      <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:24}}>
        <MaharajSpinner />
        <Text style={{fontSize:14,fontWeight:'700',color:navy,marginBottom:8}}>Maharaj is planning your {totalDays}-day meal plan...</Text>
        <Text style={{fontSize:11,color:textSec,marginBottom:20}}>
          {completedDays > 0 ? `Working on Day ${completedDays} of ${totalDays}` : 'Starting up'}
        </Text>
        <View style={{flexDirection:'row',gap:8,marginBottom:6}}>
          {Array.from({length: totalDays}, (_, i) => {
            const isDone = i < completedDays;
            const isCurrent = i === completedDays;
            return (
              <View key={i} style={{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:isDone?gold:isCurrent?gold:'#D1D5DB',backgroundColor:isDone?gold:'transparent',alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:10,fontWeight:'700',color:isDone?'#1B2A0C':isCurrent?gold:'#9CA3AF'}}>{i+1}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{fontSize:10,color:textSec}}>Days completed</Text>
        <TouchableOpacity style={{marginTop:24,backgroundColor:'#C9A227',borderRadius:8,paddingVertical:12,paddingHorizontal:24}} onPress={() => setGenPaused(p => !p)}>
          <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>{genPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
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
              <Text style={{fontWeight:'700',color:'#2E5480'}}>{label.trim()}</Text>
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
                      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                        <Text style={{fontSize:16,fontWeight:'700',color: isSel ? navy : '#1F2937',lineHeight:22,flex:1}}>{opt.name}</Text>
                        {opt.isTrending && <Text style={{fontSize:9,color:'#DC2626',backgroundColor:'#FEE2E2',paddingHorizontal:6,paddingVertical:1,borderRadius:6,fontWeight:'700'}}>{'\uD83D\uDD25'} Trending</Text>}
                      </View>
                      {isThali && opt.description && opt.description.includes(' | ') && (
                        <ThaliDetails description={opt.description} />
                      )}
                      {opt.description && !opt.description.includes(' | ') && (
                        <Text style={{fontSize:10,color:'#6B7280',marginTop:3,lineHeight:14}}>{opt.description}</Text>
                      )}
                      {opt.tags.length > 0 && (
                        <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:4}}>
                          {opt.tags.slice(0,4).map(tag => (
                            <Text key={tag} style={{fontSize:10,fontWeight:'600',color: tag.toLowerCase().includes('non-veg') ? '#DC2626' : tag.toLowerCase().includes('superfood') || tag.toLowerCase().includes('iron') || tag.toLowerCase().includes('protein') || tag.toLowerCase().includes('fibre') || tag.toLowerCase().includes('calcium') ? '#059669' : '#6B7280',backgroundColor: tag.toLowerCase().includes('non-veg') ? '#FEE2E2' : tag.toLowerCase().includes('superfood') || tag.toLowerCase().includes('iron') || tag.toLowerCase().includes('protein') || tag.toLowerCase().includes('fibre') || tag.toLowerCase().includes('calcium') ? '#ECFDF5' : '#F3F4F6',paddingHorizontal:7,paddingVertical:2,borderRadius:8}}>{tag}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={{alignItems:'center',gap:4}}>
                      <Text style={{fontSize:13,fontWeight:'700',color: isSel ? navy : '#9CA3AF'}}>#{optIdx + 1}</Text>
                      <View style={{flexDirection:'row',gap:4}}>
                        <TouchableOpacity style={{padding:2}} onPress={(e) => { e.stopPropagation?.(); saveDishFeedback(opt.name, 'up'); }}>
                          <Text style={{fontSize:14}}>{'\uD83D\uDC4D'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{padding:2}} onPress={(e) => { e.stopPropagation?.(); saveDishFeedback(opt.name, 'down'); }}>
                          <Text style={{fontSize:14}}>{'\uD83D\uDC4E'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
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
            <TouchableOpacity style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:'#2E5480',backgroundColor:'transparent',alignItems:'center'}} onPress={()=>{setGeneratedPlan(null);setSelections({});setActiveDay(0);setStep('generating');}}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#2E5480'}}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:'#D4EDE5',backgroundColor:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => router.push('/home' as never)}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const [recipeDay, setRecipeDay] = useState(0);
  const [cookDishIdx, setCookDishIdx] = useState(0);

  // P7: Cook at Home — two options: Shopping List or Meal Prep
  const [mealPrepGuide, setMealPrepGuide] = useState<string | null>(null);
  const [mealPrepLoading, setMealPrepLoading] = useState(false);

  async function generateMealPrep() {
    if (!generatedPlan || mealPrepLoading) return;
    setMealPrepLoading(true);
    try {
      const dishes = generatedPlan.flatMap((day, i) => {
        const slots = (selectedSlots.length > 0 ? selectedSlots : ['breakfast','lunch','dinner']) as MealSlotKey[];
        return slots.map(slot => {
          const opt = getOpt(i, slot);
          return opt ? `${day.day} ${slot}: ${opt.name}` : null;
        }).filter(Boolean);
      });
      const base = 'https://my-maharaj.vercel.app';
      const res = await fetch(`${base}/api/claude`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: `You are a meal prep assistant. Here is the week's meal plan:\n${dishes.join('\n')}\n\nCreate a meal prep guide structured by day. Use this EXACT format — no markdown, no bullets, no extra formatting:\nDAY: Sunday\nSoak dal and rajma overnight\nChop vegetables for Monday and Tuesday\nPrepare ginger-garlic paste in bulk\nDAY: Monday\nMarinate chicken for Tuesday dinner\nBatch cook rice for 2 days\n\nEvery line must start with either "DAY: [dayname]" or be a plain task sentence. No asterisks, no dashes, no numbers.` }] }),
      });
      const data = await res.json();
      const text = data?.content?.[0]?.text ?? 'Could not generate prep guide.';
      setMealPrepGuide(text);
      await AsyncStorage.setItem('meal_prep_guide', text);
    } catch { setMealPrepGuide('Could not generate prep guide. Please try again.'); }
    finally { setMealPrepLoading(false); }
  }

  function renderCookAtHome() {
    return (
      <View style={{paddingVertical:16}}>
        <Text style={s.stepTitle}>Cook at Home</Text>
        <Text style={s.stepSub}>Your meal plan is confirmed</Text>

        {/* Shopping List */}
        <TouchableOpacity style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:14,padding:18,flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:'rgba(27,58,92,0.1)',marginTop:16}} onPress={() => { setFeedbacks(buildFeedbackEntries()); setStep('grocery'); }}>
          <Text style={{fontSize:24}}>🛒</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:14,fontWeight:'700',color:navy}}>Shopping List</Text>
            <Text style={{fontSize:11,color:textSec}}>Consolidated ingredients for your plan</Text>
          </View>
        </TouchableOpacity>

        {/* Meal Prep — inline, no navigation */}
        <TouchableOpacity style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:14,padding:18,flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:'rgba(27,58,92,0.1)',marginTop:10}} onPress={generateMealPrep} disabled={mealPrepLoading}>
          <Text style={{fontSize:24}}>👨‍🍳</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:14,fontWeight:'700',color:navy}}>Meal Prep Guide</Text>
            <Text style={{fontSize:11,color:textSec}}>{mealPrepLoading ? 'Generating...' : 'Tap to generate prep instructions'}</Text>
          </View>
        </TouchableOpacity>

        {/* Meal Prep Guide — renders inline when ready */}
        {mealPrepGuide && (
          <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,padding:16,marginTop:12,borderWidth:1,borderColor:'rgba(201,162,39,0.2)'}}>
            {mealPrepGuide.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('DAY:')) {
                return (
                  <View key={i} style={{backgroundColor:'#2E5480',borderRadius:8,paddingHorizontal:14,paddingVertical:10,marginVertical:8}}>
                    <Text style={{color:'#C9A227',fontSize:14,fontWeight:'700'}}>{trimmed}</Text>
                  </View>
                );
              }
              return <Text key={i} style={{color:'#2E5480',fontSize:13,lineHeight:20,paddingLeft:16,marginVertical:3}}>{trimmed}</Text>;
            })}
          </View>
        )}

      </View>
    );
  }

  function renderRecipes() {
    if (!generatedPlan) {
      return (
        <View style={{alignItems:'center',paddingVertical:40}}>
          <Text style={{fontSize:14,color:textSec,textAlign:'center',marginBottom:16}}>No meal plan data available.{'\n'}Please generate a plan first.</Text>
          <TouchableOpacity style={{backgroundColor:gold,borderRadius:12,paddingVertical:12,paddingHorizontal:24}} onPress={() => setStep('members')}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Start New Plan</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const slotsForRecipes = (selectedSlots.length > 0 ? selectedSlots : ['breakfast','lunch','dinner']) as MealSlotKey[];
    const day = generatedPlan[recipeDay];
    if (!day) return null;

    return (
      <View>
        <Text style={s.stepTitle}>Full Recipes</Text>
        <Text style={s.stepSub}>Tap a day to see recipes</Text>

        {/* Day tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:56,marginBottom:12}}>
          <View style={{flexDirection:'row',gap:6,paddingHorizontal:4,paddingVertical:4}}>
            {generatedPlan.map((d, idx) => {
              const dn = d.day.substring(0, 3);
              const dd = d.date.split('-')[2];
              const isActive = idx === recipeDay;
              return (
                <TouchableOpacity key={d.date} style={{paddingHorizontal:16,paddingVertical:10,borderRadius:14,backgroundColor:isActive?navy:'rgba(255,255,255,0.9)',borderWidth:1.5,borderColor:isActive?navy:'#D4EDE5',alignItems:'center',minWidth:60}} onPress={() => setRecipeDay(idx)} activeOpacity={0.8}>
                  <Text style={{fontSize:12,fontWeight:'700',color:isActive?white:'#5A7A8A'}}>{dn}</Text>
                  <Text style={{fontSize:16,fontWeight:'800',color:isActive?white:navy}}>{dd}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Recipes for active day */}
        {slotsForRecipes.map((slot) => {
            const opt = getOpt(recipeDay, slot);
            if (!opt) return null;
            return (
              <View key={`${recipeDay}-${slot}`} style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:12,borderWidth:1,borderColor:'rgba(27,58,92,0.12)',marginBottom:14,overflow:'hidden'}}>
                {/* Dish header */}
                <View style={{backgroundColor:navy,paddingHorizontal:14,paddingVertical:12}}>
                  <Text style={{fontSize:10,color:gold,textTransform:'uppercase',letterSpacing:0.8,marginBottom:2}}>{slot}</Text>
                  <Text style={{fontSize:16,fontWeight:'700',color:white}}>{opt.name}</Text>
                  {opt.description && !opt.description.includes(' | ') && (
                    <Text style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:3}}>{opt.description}</Text>
                  )}
                </View>
                {/* Ingredients */}
                <View style={{paddingHorizontal:14,paddingTop:10,paddingBottom:6}}>
                  <Text style={{fontSize:12,fontWeight:'700',color:navy,marginBottom:6}}>Ingredients</Text>
                  {opt.ingredients.map((ing: any, i: number) => {
                    const isStr = typeof ing === 'string';
                    const nm = isStr ? ing : (ing.item || ing.name || '');
                    const qt = isStr ? '' : `${ing.qty || ''} ${ing.unit || ''}`.trim();
                    return (
                      <View key={i} style={{flexDirection:'row',paddingVertical:4,borderBottomWidth:i<opt.ingredients.length-1?0.5:0,borderBottomColor:'rgba(27,58,92,0.06)'}}>
                        <Text style={{fontSize:12,color:navy,marginRight:8}}>{'\u2022'}</Text>
                        <Text style={{flex:1,fontSize:12,color:'#2E5480'}}>{nm}</Text>
                        {qt ? <Text style={{fontSize:12,color:'#6B7280'}}>{qt}</Text> : null}
                      </View>
                    );
                  })}
                </View>
                {/* Method */}
                {opt.steps.length > 0 && (
                  <View style={{paddingHorizontal:14,paddingTop:4,paddingBottom:10}}>
                    <Text style={{fontSize:12,fontWeight:'700',color:navy,marginBottom:6}}>Method</Text>
                    {opt.steps.map((st: any, i: number) => (
                      <View key={i} style={{flexDirection:'row',gap:8,paddingVertical:4}}>
                        <View style={{width:20,height:20,borderRadius:10,backgroundColor:navy,alignItems:'center',justifyContent:'center',marginTop:1}}><Text style={{fontSize:9,color:white,fontWeight:'700'}}>{i+1}</Text></View>
                        <Text style={{flex:1,fontSize:12,color:'#374151',lineHeight:18}}>{typeof st === 'string' ? st : st}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Health note — shown in header now, skip duplicate */}
              </View>
            );
          })}

        <View style={{flexDirection:'row',gap:8,marginTop:16}}>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:navy,alignItems:'center'}} onPress={() => setStep('plan-summary')}>
            <Text style={{fontSize:14,fontWeight:'600',color:navy}}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}} onPress={() => { setFeedbacks(buildFeedbackEntries()); advance('grocery'); }}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Shopping List</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function scanTrolley() {
    setScanModalOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission required'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setScanLoading(true); setScanMode('trolley-loading');
    try {
      const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, system: 'You are Maharaj, an expert in Indian cuisine and grocery shopping. Analyse this supermarket trolley image and identify all visible food products and ingredients. Return ONLY a JSON array. Each object: { name: string (product or ingredient name), quantity: string (estimated quantity e.g. "1 pack", "2 pieces", "500g"), category: string (one of: Vegetables, Meat, Dairy, Dry Groceries, Frozen, Fruits, Condiments, Beverages) }. No preamble, no explanation, only the JSON array.', messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: result.assets[0].base64 } }, { type: 'text', text: 'Identify all food items in this trolley photo.' }] }] }),
      });
      const data = await res.json();
      const text = (data?.content?.[0]?.text ?? '[]').replace(/```json|```/g, '').trim();
      const items = JSON.parse(text) as {name:string;quantity:string;category:string}[];
      setScannedItems(items);
      setScanMode('review');
    } catch (e) { Alert.alert('Scan failed', 'Could not analyse the image. Please try again.'); setScanMode('idle'); }
    finally { setScanLoading(false); }
  }

  async function handleBarcodeScan({ data: barcodeValue }: { type: string; data: string }) {
    setBarcodeScannerOpen(false);
    setScanLoading(true); setScanMode('trolley-loading');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcodeValue}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        setScannedItems([{ name: p.product_name || 'Unknown Product', quantity: p.quantity || '1', category: 'Dry Groceries' }]);
        setScanMode('review');
      } else { Alert.alert('Product not found', 'Add it manually to your shopping list.'); setScanMode('idle'); }
    } catch { Alert.alert('Lookup failed', 'Could not look up the barcode.'); setScanMode('idle'); }
    finally { setScanLoading(false); }
  }

  async function addScannedToList() {
    try {
      const existing = JSON.parse(await AsyncStorage.getItem('shopping_list_items') || '[]');
      await AsyncStorage.setItem('shopping_list_items', JSON.stringify([...existing, ...scannedItems]));
    } catch {}
    setScannedItems([]); setScanMode('idle');
    Alert.alert('Added', `${scannedItems.length} item${scannedItems.length !== 1 ? 's' : ''} added to your shopping list.`);
  }

  const isInFridge = (itemName: string): boolean => {
    if (!fridgeItems.length) return false;
    const searchTerm = itemName.toLowerCase().split(' ')[0];
    return fridgeItems.some((fi: any) =>
      fi.item_name?.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(fi.item_name?.toLowerCase().split(' ')[0] || '')
    );
  };

  function renderGrocery() {
    const grocery = buildGrocery();
    const totalItems = CAT_ORDER.reduce((acc, cat) => acc + (grocery[cat]?.length ?? 0), 0);
    const allItems = CAT_ORDER.flatMap(cat => grocery[cat] ?? []);
    const fridgeMatchCount = allItems.filter(item => isInFridge(item.name)).length;

    return (
      <View>
        <Text style={s.stepTitle}>Your Shopping List</Text>
        <Text style={s.stepSub}>{totalItems} items for {selectedFrom && selectedTo ? selectedFrom.getTime() === selectedTo.getTime() ? fmtL(selectedFrom) : `${fmt(selectedFrom)} – ${fmt(selectedTo)}` : 'your plan'}</Text>

        {/* Scan to Shop */}
        <TouchableOpacity style={{backgroundColor:'#2E5480',borderRadius:8,paddingHorizontal:16,paddingVertical:10,alignItems:'center',marginBottom:12}} onPress={() => setScanModalOpen(true)}>
          <Text style={{color:'white',fontWeight:'700',fontSize:15}}>Scan to Shop</Text>
        </TouchableOpacity>

        {/* Scan Modal — choose mode */}
        <Modal visible={scanModalOpen} transparent animationType="fade" onRequestClose={() => setScanModalOpen(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'}}>
            <View style={{backgroundColor:'white',borderRadius:16,margin:24,padding:20,width:Dimensions.get('window').width-48}}>
              <Text style={{fontSize:18,fontWeight:'700',color:'#2E5480',marginBottom:16,textAlign:'center'}}>Scan to Shop</Text>
              <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:'#C9A227',borderRadius:14,padding:16,marginBottom:12}} onPress={scanTrolley}>
                <Text style={{fontSize:16,fontWeight:'700',color:'#2E5480'}}>Scan My Trolley</Text>
                <Text style={{fontSize:13,color:'#5A7A8A',marginTop:4}}>Take a photo of your supermarket trolley — Maharaj will identify what you have picked up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:'#2E5480',borderRadius:14,padding:16,marginBottom:12}} onPress={async () => { setScanModalOpen(false); const { status } = await BarCodeScanner.requestPermissionsAsync(); if (status === 'granted') setBarcodeScannerOpen(true); else Alert.alert('Camera permission required'); }}>
                <Text style={{fontSize:16,fontWeight:'700',color:'#2E5480'}}>Scan a Barcode</Text>
                <Text style={{fontSize:13,color:'#5A7A8A',marginTop:4}}>Point your camera at any product barcode — Maharaj will add it to your list</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScanModalOpen(false)} style={{alignItems:'center',paddingTop:8}}>
                <Text style={{fontSize:14,color:'#9CA3AF'}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Barcode scanner full-screen */}
        <Modal visible={barcodeScannerOpen} animationType="slide" onRequestClose={() => setBarcodeScannerOpen(false)}>
          <View style={{flex:1}}>
            <BarCodeScanner onBarCodeScanned={barcodeScannerOpen ? handleBarcodeScan : undefined} style={{flex:1}} />
            <TouchableOpacity style={{position:'absolute',top:50,right:20,backgroundColor:'rgba(0,0,0,0.6)',borderRadius:8,paddingHorizontal:16,paddingVertical:8}} onPress={() => setBarcodeScannerOpen(false)}>
              <Text style={{color:'white',fontWeight:'700'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Scan loading */}
        {scanLoading && (
          <View style={{alignItems:'center',paddingVertical:16}}>
            <ActivityIndicator color={'#2E5480'} />
            <Text style={{fontSize:13,color:'#2E5480',marginTop:8}}>Maharaj is scanning your trolley...</Text>
          </View>
        )}

        {/* Review scanned items */}
        {scanMode === 'review' && scannedItems.length > 0 && (
          <View style={{marginBottom:16}}>
            <Text style={{fontSize:16,fontWeight:'700',color:'#2E5480',marginBottom:4}}>Review Scanned Items</Text>
            <Text style={{fontSize:13,color:'#1A6B5C',textAlign:'center',marginBottom:12}}>Review and edit before adding to your shopping list.</Text>
            {scannedItems.map((item, i) => (
              <View key={i} style={{backgroundColor:'white',borderWidth:1.5,borderColor:'#C9A227',borderRadius:14,padding:16,marginBottom:10}}>
                <TextInput style={{fontSize:15,color:'#2E5480',fontWeight:'600',marginBottom:4}} value={item.name} onChangeText={v => setScannedItems(prev => prev.map((it,j) => j===i ? {...it,name:v} : it))} />
                <TextInput style={{fontSize:13,color:'#5A7A8A'}} value={item.quantity} onChangeText={v => setScannedItems(prev => prev.map((it,j) => j===i ? {...it,quantity:v} : it))} />
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                  <Text style={{fontSize:12,color:'#1A6B5C'}}>{item.category}</Text>
                  <TouchableOpacity onPress={() => setScannedItems(prev => prev.filter((_,j) => j!==i))}>
                    <Text style={{fontSize:12,color:'#E24B4A'}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={{backgroundColor:'#C9A227',borderRadius:8,paddingVertical:12,alignItems:'center',marginTop:8}} onPress={addScannedToList}>
              <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>Add to Shopping List</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fridge info card */}
        <View style={{backgroundColor:'#E8F4F8',borderRadius:8,paddingHorizontal:10,paddingVertical:8,marginBottom:8,flexDirection:'row',gap:6,alignItems:'flex-start'}}>
          <Text style={{fontSize:12}}>{'\u2139\uFE0F'}</Text>
          <Text style={{fontSize:9,color:'#0C447C',flex:1,lineHeight:14}}>Items already in your fridge are marked green and do not need to be purchased.</Text>
        </View>
        {fridgeMatchCount > 0 && (
          <Text style={{fontSize:9,color:'#059669',marginBottom:6}}>{fridgeMatchCount} item{fridgeMatchCount !== 1 ? 's' : ''} already in your fridge</Text>
        )}

        {totalItems === 0 ? (
          <View style={s.emptyBox}><Text style={s.emptyText}>No ingredients found. Please select meals first.</Text></View>
        ) : (
          CAT_ORDER.map((cat) => {
            const items = grocery[cat];
            if (!items?.length) return null;
            return (
              <View key={cat} style={{marginBottom:14}}>
                <Text style={{fontSize:11,fontWeight:'700',color:gold,letterSpacing:0.5,paddingBottom:4,marginBottom:6,borderBottomWidth:1.5,borderBottomColor:gold}}>{cat}</Text>
                {items.map((item, i) => {
                  const inFridge = isInFridge(item.name);
                  return inFridge ? (
                    <View key={i} style={{flexDirection:'row',alignItems:'center',backgroundColor:'#F0FFF4',borderRadius:4,paddingHorizontal:6,paddingVertical:3,marginVertical:1}}>
                      <Text style={{fontSize:10,color:'#059669',marginRight:6}}>{'\u2713'}</Text>
                      <Text style={{fontSize:10,color:'#9CA3AF',flex:1,textDecorationLine:'line-through'}}>{item.name}</Text>
                      <Text style={{fontSize:9,color:'#059669'}}>In fridge</Text>
                    </View>
                  ) : (
                    <View key={i} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:5,borderBottomWidth:i<items.length-1?0.5:0,borderBottomColor:'rgba(27,58,92,0.08)'}}>
                      <Text style={{fontSize:10,color:'#2E5480',flex:1}}>{item.name}</Text>
                      <Text style={{fontSize:10,color:'#6B7280'}}>{item.qty ? `${item.qty}${item.unit||''}` : ''}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {/* Download PDF */}
        <TouchableOpacity style={{backgroundColor:'#2E5480',borderRadius:12,paddingVertical:14,alignItems:'center',marginTop:8,marginBottom:8}} onPress={() => void downloadGrocery()}>
          <Text style={{fontSize:13,fontWeight:'500',color:'white'}}>Download Shopping List</Text>
        </TouchableOpacity>

        {/* Next — Online Shopping */}
        <TouchableOpacity style={{backgroundColor:'#C9A227',borderRadius:8,paddingVertical:14,width:'100%',alignItems:'center',marginTop:16}} onPress={() => setStep('online-shopping')}>
          <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>Next</Text>
        </TouchableOpacity>

      </View>
    );
  }

  function renderOnlineShopping() {
    const stores = ['Carrefour','Noon Daily','Amazon Fresh','Talabat Groceries'];
    return (
      <View style={{flex:1}}>
        {/* Header */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:Platform.OS === 'web' ? 16 : 10,paddingBottom:14,borderBottomWidth:1,borderBottomColor:border}}>
          <TouchableOpacity onPress={() => setStep('grocery')} style={{borderWidth:1.5,borderColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'#2E5480'}}>Back</Text>
          </TouchableOpacity>
          <Text style={{flex:1,fontSize:16,fontWeight:'700',color:'#2E5480',textAlign:'center'}}>Order Online</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={{backgroundColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'white'}}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Text style={{color:'#5A7A8A',fontSize:13,textAlign:'center',marginBottom:16,marginTop:12,paddingHorizontal:20}}>Choose your preferred store or delivery app</Text>

        {/* 2x2 Grid */}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,paddingHorizontal:20}}>
          {stores.map(name => (
            <View key={name} style={{width:'47%',backgroundColor:'white',borderWidth:1.5,borderColor:'#2E5480',borderRadius:14,padding:20,alignItems:'center',opacity:0.75}}>
              <Text style={{color:'#2E5480',fontWeight:'700',fontSize:15,textAlign:'center'}}>{name}</Text>
              <Text style={{color:'#C9A227',fontSize:12,fontWeight:'500',textAlign:'center',marginTop:6}}>Coming Soon</Text>
            </View>
          ))}
        </View>

        {/* Navy banner */}
        <View style={{backgroundColor:'#2E5480',borderRadius:12,padding:14,marginTop:20,marginHorizontal:20}}>
          <Text style={{color:'white',fontSize:13,textAlign:'center'}}>Integrations coming soon. Maharaj will connect directly to your favourite store.</Text>
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
              {ALL_CUISINES.map(c=>(<TouchableOpacity key={c} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1.5,borderColor:guestCuisine===c?'#2E5480':'#D4EDE5',backgroundColor:guestCuisine===c?'#2E5480':'rgba(255,255,255,0.9)'}} onPress={()=>setGuestCuisine(c)}><Text style={{fontSize:13,fontWeight:'600',color:guestCuisine===c?'#FFFFFF':'#2E5480'}}>{c}</Text></TouchableOpacity>))}
            </View>
          </ScrollView>
          <Text style={s.sectionLabel}>FOR HOW MANY DAYS?</Text>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:8}}>
            {[1,2,3,4,5,7].map(d=>(<TouchableOpacity key={d} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:16,borderWidth:1.5,borderColor:guestDays===d?'#2E5480':'#D4EDE5',backgroundColor:guestDays===d?'#2E5480':'rgba(255,255,255,0.9)'}} onPress={()=>setGuestDays(d)}><Text style={{fontSize:13,fontWeight:'600',color:guestDays===d?'#FFFFFF':'#2E5480'}}>{d} day{d>1?'s':''}</Text></TouchableOpacity>))}
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
        <Text style={s.stepTitle}>Set veg/fasting days</Text>
        <Text style={s.stepSub}>Choose how each day should be planned</Text>
        {dates.map(d=>{
          const dt = new Date(d);
          const label = `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
          const val = vegFastDays[d] ?? 'normal';
          return (
            <View key={d} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'rgba(255,255,255,0.9)',borderRadius:12,padding:14,marginBottom:8}}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#2E5480',width:70}}>{label}</Text>
              <View style={{flexDirection:'row',gap:6}}>
                {(['normal','veg','fasting'] as const).map(opt=>(<TouchableOpacity key={opt} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:14,borderWidth:1.5,borderColor:val===opt?'#2E5480':'#D4EDE5',backgroundColor:val===opt?'#2E5480':'rgba(255,255,255,0.9)'}} onPress={()=>setVegFastDays(p=>({...p,[d]:opt}))}><Text style={{fontSize:12,fontWeight:'600',color:val===opt?'#FFFFFF':'#2E5480',textTransform:'capitalize'}}>{opt}</Text></TouchableOpacity>))}
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
    const BORDER = '#2E5480';
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
          <Text style={{fontSize:22,fontWeight:'800',color:navy}}>My Maharaj Meal Plan for You</Text>
          <Text style={{fontSize:13,color:'#5A7A8A',marginTop:4}}>{dateRange}{servingsCount > 0 ? ` · Cooking for ${servingsCount} people` : ''}</Text>
        </View>


        {/* Table — tap to expand */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => setStep('plan-detail')}>
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
        </TouchableOpacity>
        <Text style={{fontSize:11,color:'#1A6B5C',textAlign:'center',marginTop:4}}>Tap table to view full plan</Text>

        {/* Table Modal — full screen expanded view */}
        <Modal visible={tableModalVisible} transparent animationType="fade" onRequestClose={() => setTableModalVisible(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'}}>
            <View style={{backgroundColor:'white',borderRadius:16,margin:16,padding:16,maxHeight:Dimensions.get('window').height*0.8,width:Dimensions.get('window').width-32}}>
              <TouchableOpacity onPress={() => setTableModalVisible(false)} style={{alignSelf:'flex-end',marginBottom:8}}>
                <Text style={{color:'#2E5480',fontWeight:'700',fontSize:15}}>Close</Text>
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <ScrollView showsVerticalScrollIndicator={true}>
                  <View style={{borderWidth:1,borderColor:BORDER,borderRadius:4,overflow:'hidden'}}>
                    <View style={{flexDirection:'row'}}>
                      <View style={{width:90,padding:10,backgroundColor:BORDER,justifyContent:'center'}}>
                        <Text style={{fontSize:12,fontWeight:'800',color:'white'}}>Meal</Text>
                      </View>
                      {generatedPlan.map((day) => {
                        const d = new Date(day.date);
                        const label = `${day.day.substring(0,3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
                        return (
                          <View key={day.date} style={{width:COL_W,padding:10,backgroundColor:BORDER,borderLeftWidth:1,borderLeftColor:'rgba(255,255,255,0.2)'}}>
                            <Text style={{fontSize:11,fontWeight:'700',color:'white',textAlign:'center'}}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                    {slotsToShow.map(({ key, label }, slotIdx) => (
                      <View key={key} style={{flexDirection:'row',borderTopWidth:1,borderTopColor:BORDER}}>
                        <View style={{width:90,padding:10,backgroundColor: slotIdx % 2 === 0 ? '#E8F4FF' : 'white',justifyContent:'center',borderRightWidth:1,borderRightColor:BORDER}}>
                          <Text style={{fontSize:11,fontWeight:'800',color:'#2E5480'}}>{label}</Text>
                        </View>
                        {generatedPlan.map((day, dayIdx) => {
                          const opt = getOpt(dayIdx, key);
                          return (
                            <View key={day.date} style={{width:COL_W,padding:8,backgroundColor: slotIdx % 2 === 0 ? '#E8F4FF' : 'white',borderLeftWidth:1,borderLeftColor:'#D1D5DB'}}>
                              <Text style={{fontSize:11,fontWeight:'700',color:'#1F2937',lineHeight:15}}>{opt?.name ?? '—'}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Watermark */}
        <Text style={{textAlign:'center',fontSize:10,color:'#D1D5DB',marginTop:12,fontStyle:'italic'}}>Generated by My Maharaj</Text>

        {/* Download Meal Plan */}
        <TouchableOpacity style={{backgroundColor:'#2E5480',borderRadius:12,paddingVertical:12,alignItems:'center',marginTop:12}} onPress={() => {
          if (!generatedPlan || Platform.OS !== 'web') return;
          const dateRange = selectedFrom && selectedTo ? `${fmt(selectedFrom)} – ${fmt(selectedTo)}` : '';
          const slots: MealSlotKey[] = ['breakfast','lunch','snack','dinner'];
          const dayHeaders = generatedPlan.map(d => `<th>${d.day?.substring(0,3)}<br>${new Date(d.date).getDate()}-${MONTHS[new Date(d.date).getMonth()]}</th>`).join('');
          const mealRows = slots.filter(sl => selectedSlots.length === 0 || selectedSlots.includes(sl)).map(sl => {
            const label = sl.charAt(0).toUpperCase() + sl.slice(1);
            const cells = generatedPlan.map((day, idx) => `<td>${day[sl]?.options?.[selections[idx]?.[sl] ?? 0]?.name ?? '\u2014'}</td>`).join('');
            return `<tr><td class="sl">${label}</td>${cells}</tr>`;
          }).join('');
          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4 landscape;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;-webkit-print-color-adjust:exact}.hd{background:#2E5480;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.hd-l{color:white;font-size:18px;font-weight:bold}.hd-h{color:#C9A227;font-size:11px;margin-top:3px}.hd-r{color:#C9A227;font-size:11px;text-align:right}.gb{background:#C9A227;padding:10px 20px;text-align:center}.gb-t{font-size:14px;font-weight:bold;color:#1B2A0C}.gb-s{font-size:11px;color:#412402;margin-top:3px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#2E5480;color:white;padding:8px;font-size:11px;text-align:center;border:1px solid #2E5480}td{padding:8px;font-size:10px;border:1px solid #E5E7EB;text-align:center}tr:nth-child(even) td{background:#F9FAFB}.sl{font-weight:bold;color:#2E5480;text-align:left;width:80px}.ft{margin-top:20px;border-top:1px solid #E5E7EB;padding-top:10px;text-align:center;font-size:9px;color:#6B7280}.disc{margin-top:10px;background:#F5F7FA;border-radius:6px;padding:8px 12px;font-size:9px;color:#6B7280;text-align:center}</style></head><body><div class="hd"><div><div class="hd-l">My Maharaj</div><div class="hd-h">\u092E\u0947\u0930\u093E \u092E\u0939\u093E\u0930\u093E\u091C</div></div><div class="hd-r">blue flute<br>consulting</div></div><div class="gb"><div class="gb-t">Weekly Meal Plan</div><div class="gb-s">${dateRange} \u00B7 ${servingsCount} family members</div></div><table><tr><th class="sl">Meal</th>${dayHeaders}</tr>${mealRows}</table><div class="disc">Maharaj meal plans are recommendations only. Please consult your doctor or nutritionist.</div><div class="ft">Powered by Blue Flute Consulting LLC-FZ \u00B7 www.bluefluteconsulting.com</div><script>setTimeout(function(){window.print()},800)</script></body></html>`;
          const blob = new Blob([html], { type: 'text/html' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'maharaj-meal-plan.html'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }}>
          <Text style={{fontSize:13,fontWeight:'500',color:'white'}}>Download Meal Plan</Text>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={{flexDirection:'row',gap:8,marginTop:12}}>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'#2E5480',backgroundColor:'transparent',alignItems:'center'}} onPress={()=>{setGeneratedPlan(null);setSelections({});setActiveDay(0);setStep('generating');}}>
            <Text style={{fontSize:13,fontWeight:'600',color:'#2E5480'}}>Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}} onPress={() => setStep('cook-or-order')}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1A1A1A'}}>Next</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row',gap:8,marginTop:8}}>
          <TouchableOpacity style={{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:navy,alignItems:'center'}} onPress={async () => {
            // Auto-save confirmed plan + menu history + dish history
            if (generatedPlan) {
              try {
                const confirmedPlan = generatedPlan.map((day, idx) => ({ date: day.date, dayName: day.day, breakfast: day.breakfast?.options[selections[idx]?.breakfast ?? 0], lunch: day.lunch?.options[selections[idx]?.lunch ?? 0], snack: day.snack?.options[selections[idx]?.snack ?? 0], dinner: day.dinner?.options[selections[idx]?.dinner ?? 0] }));
                await AsyncStorage.setItem('confirmed_meal_plan', JSON.stringify(confirmedPlan));
                await AsyncStorage.setItem('meal_plan_date', new Date().toISOString());
                const existing = JSON.parse(await AsyncStorage.getItem('menu_history') || '[]');
                const dateRange = `${selectedFrom?.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${selectedTo?.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
                const newEntry = { id: Date.now().toString(), createdAt: new Date().toISOString(), dateRange, days: confirmedPlan.map(d => ({ date: d.date, dayName: d.dayName, breakfast: d.breakfast?.name || '\u2014', lunch: d.lunch?.name || '\u2014', snack: d.snack?.name || '\u2014', dinner: d.dinner?.name || '\u2014' })) };
                await AsyncStorage.setItem('menu_history', JSON.stringify([newEntry, ...existing].slice(0, 20)));
                await AsyncStorage.setItem('maharaj_plan_ready', 'true');
                // Save dish names to history for no-repeat across runs
                const dishNames = confirmedPlan.flatMap(d => [d.breakfast?.name, d.lunch?.name, d.snack?.name, d.dinner?.name].filter(Boolean));
                const oldDishHist = JSON.parse(await AsyncStorage.getItem('dish_history') || '[]');
                await AsyncStorage.setItem('dish_history', JSON.stringify([...dishNames, ...oldDishHist].slice(0, 60)));
              } catch {}
            }
            advance('recipes');
          }}>
            <Text style={{fontSize:14,fontWeight:'500',color:white}}>View Recipes</Text>
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
          <TouchableOpacity style={{backgroundColor:'white',borderRadius:18,padding:20,borderWidth:1.5,borderColor:'rgba(27,58,92,0.12)',flexDirection:'row',alignItems:'center',gap:16,shadowColor:'#2E5480',shadowOffset:{width:0,height:3},shadowOpacity:0.1,shadowRadius:10,elevation:3}} onPress={()=>advance('recipes')} activeOpacity={0.85}>
            <View style={{width:64,height:30,backgroundColor:'#FFFBEB',borderRadius:10,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#2E5480'}}>Cook</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'800',color:'#2E5480',marginBottom:4}}>Cook at Home</Text>
              <Text style={{fontSize:13,color:'#5A7A8A',lineHeight:18}}>Full recipes & step-by-step instructions</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{backgroundColor:'white',borderRadius:18,padding:20,borderWidth:1.5,borderColor:'rgba(27,58,92,0.12)',flexDirection:'row',alignItems:'center',gap:16,shadowColor:'#2E5480',shadowOffset:{width:0,height:3},shadowOpacity:0.1,shadowRadius:10,elevation:3}} onPress={()=>router.push('/order-out' as never)} activeOpacity={0.85}>
            <View style={{width:64,height:30,backgroundColor:'#E3F2FD',borderRadius:10,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#2E5480'}}>Delivery</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'800',color:'#2E5480',marginBottom:4}}>Order Out</Text>
              <Text style={{fontSize:13,color:'#5A7A8A',lineHeight:18}}>Find delivery options near you</Text>
            </View>
          </TouchableOpacity>
        </View>
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
                <Text style={{fontSize:12,fontWeight:'600',color:'#2E5480'}}>{c}</Text>
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
                <Text style={{fontSize:12,fontWeight:'600',color:'#2E5480'}}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{gap:12,marginTop:8}}>
          <TouchableOpacity style={{backgroundColor:'#2E5480',borderRadius:14,paddingVertical:18,alignItems:'center'}} onPress={() => advance('generating')} activeOpacity={0.85}>
            <Text style={{fontSize:16,fontWeight:'500',color:'white'}}>Generate My Meal Plan</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.25)',borderRadius:14,paddingVertical:14,alignItems:'center'}} onPress={goBack}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#2E5480'}}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:14,paddingVertical:14,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#5A7A8A'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function renderPlanDetail() {
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
    const BORDER = '#2E5480';
    return (
      <View style={{flex:1}}>
        {/* Plan detail header */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,backgroundColor:'rgba(255,255,255,0.85)',borderBottomWidth:1,borderBottomColor:'rgba(27,58,92,0.1)'}}>
          <TouchableOpacity onPress={() => setStep('plan-summary')} style={{borderWidth:1.5,borderColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'#2E5480'}}>Back</Text>
          </TouchableOpacity>
          <Text style={{flex:1,fontSize:18,fontWeight:'700',color:'#2E5480',textAlign:'center'}}>My Meal Plan</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={{backgroundColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'white'}}>Home</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <ScrollView showsVerticalScrollIndicator={true}>
            <View style={{borderWidth:1,borderColor:BORDER,borderRadius:4,overflow:'hidden'}}>
              <View style={{flexDirection:'row'}}>
                <View style={{width:90,padding:10,backgroundColor:BORDER,justifyContent:'center'}}>
                  <Text style={{fontSize:12,fontWeight:'800',color:'white'}}>Meal</Text>
                </View>
                {generatedPlan.map((day) => {
                  const d = new Date(day.date);
                  const label = `${day.day.substring(0,3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
                  return (
                    <View key={day.date} style={{width:COL_W,padding:10,backgroundColor:BORDER,borderLeftWidth:1,borderLeftColor:'rgba(255,255,255,0.2)'}}>
                      <Text style={{fontSize:11,fontWeight:'700',color:'white',textAlign:'center'}}>{label}</Text>
                    </View>
                  );
                })}
              </View>
              {slotsToShow.map(({ key, label }, slotIdx) => (
                <View key={key} style={{flexDirection:'row',borderTopWidth:1,borderTopColor:BORDER}}>
                  <View style={{width:90,padding:10,backgroundColor: slotIdx % 2 === 0 ? '#E8F4FF' : white,justifyContent:'center',borderRightWidth:1,borderRightColor:BORDER}}>
                    <Text style={{fontSize:11,fontWeight:'800',color:navy}}>{label}</Text>
                  </View>
                  {generatedPlan.map((day, dayIdx) => {
                    const opt = getOpt(dayIdx, key);
                    return (
                      <View key={day.date} style={{width:COL_W,padding:8,backgroundColor: slotIdx % 2 === 0 ? '#E8F4FF' : white,borderLeftWidth:1,borderLeftColor:'#D1D5DB'}}>
                        <Text style={{fontSize:11,fontWeight:'700',color:'#1F2937',lineHeight:15}}>{opt?.name ?? '\u2014'}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    );
  }

  const STEP_RENDER: Record<WizardStep, () => React.ReactNode> = {
    'members':          renderMembers,
    'days-meals':       renderDaysMeals,
    'nutrition':        renderNutritionNew,
    'period':           renderPeriod,
    'food-pref':        renderFoodPref,
    'meal-prefs':       renderMealPrefs,
    'unwell':           renderUnwell,
    'cuisine-confirm':  renderCuisineConfirm,
    'generating':       renderGenerating,
    'generating-error': renderGeneratingError,
    'selection':        renderSelection,
    'confirmed-menu':   renderPlanSummary,
    'plan-summary':     renderPlanSummary,
    'guest-cuisine':    renderGuestCuisine,
    'veg-days':         renderVegDays,
    'cook-or-order':    renderCookOrOrderNew,
    'cook-at-home':     renderCookAtHome,
    'recipes':          renderRecipes,
    'grocery':          renderGrocery,
    'delivery-apps':    renderDeliveryApps,
    'online-shopping':  renderOnlineShopping,
    'feedback':         renderFeedback,
    'plan-detail':      renderPlanDetail,
  };

  const isUserStep = USER_STEPS.includes(step);
  const currentNum = stepNum(step);
  const isFullScreen = ['generating','generating-error','plan-detail','online-shopping'].includes(step);

  return (
    <ImageBackground source={require('../assets/background.png')} style={{flex:1,width:'100%'}} resizeMode="cover">
    <SafeAreaView style={s.safe}>
      {/* Header */}
      {!isFullScreen && (
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={{borderWidth:1.5,borderColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'#2E5480'}}>Back</Text>
          </TouchableOpacity>
          <Text style={{flex:1,fontSize:16,fontWeight:'700',color:'#2E5480',textAlign:'center'}}>Curating Your Meal Plan</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={{backgroundColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'white'}}>Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isFullScreen && <MarqueeTicker />}

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
    </ImageBackground>
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

