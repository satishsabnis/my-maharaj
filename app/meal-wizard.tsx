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
import MarqueeTicker from '../components/MarqueeTicker';
import MaharajSpinner from '../components/MaharajSpinner';
import { getCuisineGroups } from '../lib/cuisineGroups';
import { colors, cards, buttons } from '../constants/theme';


// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep =
  | 'wizard' | 'generating' | 'observations' | 'plan-summary' | 'alternatives'
  | 'what-next' | 'grocery' | 'online-shopping';

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface DBMember { id: string; name: string; age: number; }
interface FeedbackEntry { dishName: string; rating: 1 | -1 | null; comment: string; }

interface Observation {
  id: string;
  label: string;
  text: string;
  answered: boolean;
  answer: 'yes' | 'no' | null;
}

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

// ─── Festivals ────────────────────────────────────────────────────────────────

const FESTIVALS_2026 = [
  { name: 'Baisakhi', date: '2026-04-14' },
  { name: 'Akshaya Tritiya', date: '2026-04-19' },
  { name: 'Eid al-Adha', date: '2026-05-27' },
  { name: 'Guru Purnima', date: '2026-07-29' },
  { name: 'Raksha Bandhan', date: '2026-08-28' },
  { name: 'Janmashtami', date: '2026-09-04' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14' },
  { name: 'Navratri', date: '2026-10-11' },
  { name: 'Dussehra', date: '2026-10-20' },
  { name: 'Diwali', date: '2026-11-08' },
  { name: 'Christmas', date: '2026-12-25' },
];

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function MealWizardScreen() {
  const [step, setStep] = useState<WizardStep>('wizard');
  const [error, setError] = useState('');

  // Wizard step 1 state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [foodPreference, setFoodPreference] = useState<string>('');
  const [cookingPattern, setCookingPattern] = useState<string>('');
  const [breakfastPreferences, setBreakfastPreferences] = useState<string[]>([]);
  const [communityRules, setCommunityRules] = useState<string>('');
  const [familyAvoids, setFamilyAvoids] = useState<string[]>([]);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [expandedCuisineGroups, setExpandedCuisineGroups] = useState<Record<string, boolean>>({});
  const [familySize, setFamilySize] = useState(0);

  // Date range (computed from selectedDays)
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(null);
  const [selectedTo,   setSelectedTo]   = useState<Date | null>(null);

  // Food pref (used by generation)
  const [foodPref, setFoodPref]   = useState<'veg' | 'nonveg' | null>(null);
  const [isMixed,  setIsMixed]    = useState(false);
  const [vegType,  setVegType]    = useState<'normal' | 'fasting' | null>(null);
  const [nonVegOpts, setNonVegOpts] = useState<string[]>([]);
  const [includeDessert, setIncludeDessert] = useState(false);
  const [selectedSlots,  setSelectedSlots]  = useState<string[]>(['breakfast', 'lunch', 'dinner']);

  // Meal prefs
  const [bfPrefs, setBfPrefs]   = useState<string[]>([]);
  const [lnPrefs, setLnPrefs]   = useState<string[]>([]);
  const [dnPrefs, setDnPrefs]   = useState<string[]>([]);
  const [snPrefs, setSnPrefs]   = useState<string[]>([]);

  // Family
  const [familyMembers, setFamilyMembers] = useState<DBMember[]>([]);
  const [everyoneWell,  setEveryoneWell]  = useState(true);
  const [unwellIds,     setUnwellIds]     = useState<string[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<string[]>([]);
  const [savedCuisines,  setSavedCuisines]  = useState<string[]>([]);
  const [userLocation,   setUserLocation]   = useState<UserLocation>({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [guestCount,     setGuestCount]     = useState(0);
  const [hasGuests,      setHasGuests]      = useState(false);
  const [guestCuisine,   setGuestCuisine]   = useState('');
  const [guestDays,      setGuestDays]      = useState(2);
  const [vegFastDays,    setVegFastDays]    = useState<Record<string, string>>({});
  const [extraCuisines,  setExtraCuisines]  = useState<string[]>([]);
  const [removedCuisines, setRemovedCuisines] = useState<string[]>([]);
  const [perDayCuisine,  setPerDayCuisine]  = useState<Record<string, string>>({});
  const [weekFoodPref, setWeekFoodPref] = useState('As per family profile');

  // Generation
  const [generatedPlan,     setGeneratedPlan]     = useState<MealPlanDay[] | null>(null);
  const [generatingProgress,setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const [servingsCount, setServingsCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [genPaused, setGenPaused] = useState(false);
  const [generatingDay, setGeneratingDay] = useState('');

  // Selection
  const [selections,      setSelections]      = useState<Record<number, Partial<Record<MealSlotKey, number>>>>({});
  const [expandedDays,    setExpandedDays]    = useState<Record<number, boolean>>({ 0: true });
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
  const [activeDay,       setActiveDay]       = useState(0);

  // Observations
  const [observations, setObservations] = useState<Observation[]>([]);

  // Alternatives
  const [alternativeSlot, setAlternativeSlot] = useState<{ dayIdx: number; slot: MealSlotKey; component: string } | null>(null);

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

  // Jain
  const [isJainFamily, setIsJainFamily] = useState(false);
  const CUISINE_GROUPS = getCuisineGroups(isJainFamily);

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

  // Load data on mount
  useEffect(() => {
    async function loadWiz() {
      const user = await getSessionUser();
      if (!user) return;

      // Family members
      const { data } = await supabase.from('family_members').select('id, name, age, health_notes').eq('user_id', user.id);
      const members = (data ?? []) as DBMember[];
      setFamilyMembers(members);
      setFamilySize(members.length);

      // Saved cuisines
      const { data: cuisineData } = await supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false);
      const saved = (cuisineData ?? []).map((c: any) => c.cuisine_name);
      setSelectedCuisines(saved);
      setSavedCuisines(saved);

      // Fridge inventory
      const { data: fridgeData } = await supabase.from('fridge_inventory').select('id, item_name, quantity, unit').eq('user_id', user.id);
      setFridgeItems(fridgeData ?? []);

      // Load saved dietary preference
      const savedFoodPref = await AsyncStorage.getItem('dietary_food_pref');
      const savedNonVegOpts = await AsyncStorage.getItem('dietary_nonveg_opts');
      const savedIsMixed = await AsyncStorage.getItem('dietary_is_mixed');
      if (savedFoodPref) { setFoodPref(savedFoodPref as 'veg' | 'nonveg'); setFoodPreference(savedFoodPref === 'veg' ? 'Vegetarian' : 'Non-vegetarian'); }
      if (savedNonVegOpts) try { setNonVegOpts(JSON.parse(savedNonVegOpts)); } catch {}
      if (savedIsMixed === 'true') { setIsMixed(true); setFoodPreference('Mixed'); }

      // Jain
      const jf = await AsyncStorage.getItem('jain_family');
      if (jf === 'true') setIsJainFamily(true);

      // Cooking pattern
      const cp = await AsyncStorage.getItem('cooking_pattern');
      if (cp) setCookingPattern(cp);

      // Breakfast prefs
      const bp = await AsyncStorage.getItem('breakfast_preferences');
      if (bp) try { setBreakfastPreferences(JSON.parse(bp)); } catch {}

      // Community rules
      const cr = await AsyncStorage.getItem('community_rules');
      if (cr) setCommunityRules(cr);

      // Family avoids
      const fa = await AsyncStorage.getItem('family_avoids');
      if (fa) try { setFamilyAvoids(JSON.parse(fa)); } catch {}

      // Determine first-time user
      const isFirst = saved.length === 0 || !savedFoodPref;
      setIsFirstTimeUser(isFirst);
    }
    void loadWiz();
    loadOrDetectLocation().then(setUserLocation);
  }, []);

  // ── Pulse animation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'generating') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [step]);

  // ── Generation ────────────────────────────────────────────────────────────

  const runGeneration = useCallback(async () => {
    if (!selectedFrom || !selectedTo) return;
    if (!foodPref) {
      setError('Please select a food preference before generating.');
      setStep('wizard');
      return;
    }
    if (selectedSlots.length === 0) {
      setError('Please select at least one meal slot (Breakfast, Lunch or Dinner).');
      setStep('wizard');
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
          setStep('wizard');
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

      // Family member count for servings
      const { data: members, error: membersErr } = await supabase.from('family_members')
        .select('id').eq('user_id', userId);
      if (membersErr) console.error('[MealWizard] family_members count error:', membersErr.message);
      const familyCount = members?.length ?? 1;
      const presentCount = presentMembers.length > 0 ? presentMembers.length : familyCount;
      const totalServings = Number(presentCount) + Number(guestCount);
      setServingsCount(totalServings);

      const slotsToUse = selectedSlots.length > 0 ? selectedSlots : ['breakfast', 'lunch', 'dinner'];

      // Map food preference
      let effectiveFoodPref: 'veg' | 'nonveg' | null = foodPref;
      let effectiveIsMixed = isMixed;
      if (foodPreference === 'Non-vegetarian' || foodPreference === 'Non-veg') { effectiveFoodPref = 'nonveg'; effectiveIsMixed = false; }
      else if (foodPreference === 'Vegetarian' || foodPreference === 'Veg') { effectiveFoodPref = 'veg'; effectiveIsMixed = false; }
      else if (foodPreference === 'Eggetarian') { effectiveFoodPref = 'nonveg'; effectiveIsMixed = false; }
      else if (foodPreference === 'Mixed') { effectiveFoodPref = 'nonveg'; effectiveIsMixed = true; }
      if (!effectiveFoodPref) effectiveFoodPref = 'veg';

      await AsyncStorage.setItem('dietary_food_pref', effectiveFoodPref);
      await AsyncStorage.setItem('dietary_nonveg_opts', JSON.stringify(nonVegOpts));
      await AsyncStorage.setItem('dietary_is_mixed', String(effectiveIsMixed));

      const dates = getDates(selectedFrom, selectedTo);
      setGeneratingProgress({ current: 0, total: dates.length });

      const plan = await generateMealPlan({
        userId,
        dates,
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
        nutritionFocus: [nutritionGoals.length > 0 ? nutritionGoals.join(', ') : '', freeText, `Vary dishes (seed:${Date.now()})`].filter(Boolean).join('. '),
        vegDays:        profile?.veg_days ?? [],
        cuisinePerDay: (() => {
          const allCuisines = selectedCuisines.length > 0
            ? selectedCuisines
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
      }, (current, total) => {
        setGeneratingProgress({ current, total });
        // Update generating day text
        if (current > 0 && current <= dates.length) {
          const dateStr = dates[current - 1];
          const dt = new Date(dateStr);
          setGeneratingDay(WEEKDAYS[dt.getDay()]);
        }
      });

      const defaultSel: Record<number, Partial<Record<MealSlotKey, number>>> = {};
      plan.days.forEach((d, i) => { defaultSel[i] = { breakfast: 0, lunch: 0, dinner: 0, ...(d.snack ? { snack: 0 } : {}) }; });
      setGeneratedPlan(plan.days);
      setSelections(defaultSel);
      setActiveDay(0);

      // Build observations before showing
      buildObservations(dates);

      setStep('observations');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
      setStep('wizard');
    }
  }, [selectedFrom, selectedTo, foodPref, foodPreference, vegType, nonVegOpts, familyMembers, unwellIds, nutritionGoals, bfPrefs, lnPrefs, dnPrefs, snPrefs, includeDessert, hasGuests, guestCuisine, guestDays, extraCuisines, perDayCuisine, freeText, selectedCuisines, selectedSlots]);

  useEffect(() => {
    if (step === 'generating') void runGeneration();
  }, [step]);

  // ── Build observations from context ──────────────────────────────────────

  function buildObservations(dates: string[]) {
    const obs: Observation[] = [];
    let obsId = 0;

    // Check for Sundays
    const hasSunday = dates.some(d => new Date(d).getDay() === 0);
    if (hasSunday) {
      obs.push({
        id: String(++obsId),
        label: 'Sunday Special',
        text: 'Maharaj noticed a Sunday in your plan. Would you like a special or elaborate Sunday meal?',
        answered: false,
        answer: null,
      });
    }

    // Check for festivals
    FESTIVALS_2026.forEach(fest => {
      if (dates.includes(fest.date)) {
        obs.push({
          id: String(++obsId),
          label: fest.name,
          text: `${fest.name} falls during your plan week. Would you like a festive menu for this day?`,
          answered: false,
          answer: null,
        });
      }
    });

    // Check freeText for fasting keywords
    const lowerFree = freeText.toLowerCase();
    if (lowerFree.includes('fast') || lowerFree.includes('upvas') || lowerFree.includes('vrat')) {
      obs.push({
        id: String(++obsId),
        label: 'Fasting Detected',
        text: 'You mentioned fasting. Would you like Maharaj to plan fasting-friendly meals on specific days?',
        answered: false,
        answer: null,
      });
    }

    // Check freeText for guest mentions
    if (lowerFree.includes('guest') || lowerFree.includes('visitor') || lowerFree.includes('party')) {
      obs.push({
        id: String(++obsId),
        label: 'Guests Expected',
        text: 'You mentioned guests. Would you like Maharaj to plan extra portions or special dishes?',
        answered: false,
        answer: null,
      });
    }

    // Check for light/diet mentions
    if (lowerFree.includes('light') || lowerFree.includes('diet') || lowerFree.includes('low calorie')) {
      obs.push({
        id: String(++obsId),
        label: 'Light Meals',
        text: 'You mentioned lighter meals. Would you like Maharaj to reduce portion sizes and use lighter ingredients?',
        answered: false,
        answer: null,
      });
    }

    // Always add a default observation if none were generated
    if (obs.length === 0) {
      obs.push({
        id: String(++obsId),
        label: 'Balanced Week',
        text: 'Maharaj will plan a balanced variety of meals across your selected days. Shall Maharaj ensure no dish repeats within the week?',
        answered: false,
        answer: null,
      });
    }

    setObservations(obs);
  }

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

    function parseIngredient(ing: string): { name: string; qty: number; unit: string } {
      const s = ing.trim();
      const leadMatch = s.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|L|l|tsp|tbsp|cup|cups|pcs|piece|pieces|medium|large|small|bunch|nos)?\s+(.+)$/i);
      if (leadMatch) return { name: leadMatch[3].trim(), qty: parseFloat(leadMatch[1]), unit: (leadMatch[2] ?? '').replace(/s$/i, '') };
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
    let html = '<html><head><title>Shopping List</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#1A3A5C;font-size:20px}p{color:#666;font-size:12px}h2{color:#1A6B5C;font-size:13px;margin-top:18px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#1A3A5C;color:white;padding:8px;text-align:left;font-size:11px}td{padding:8px;border-bottom:1px solid #E5E7EB;font-size:13px}.qty{text-align:right;color:#1A6B5C;font-weight:600;width:80px}</style></head><body>';
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

  // ── Scan functions ───────────────────────────────────────────────────────

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

  // ── Navigation ────────────────────────────────────────────────────────────

  function goBack() {
    setError('');
    const backMap: Partial<Record<WizardStep, WizardStep>> = {
      'generating': 'wizard',
      'observations': 'generating',
      'plan-summary': 'observations',
      'alternatives': 'plan-summary',
      'what-next': 'plan-summary',
      'grocery': 'what-next',
      'online-shopping': 'grocery',
    };
    const prev = backMap[step];
    if (prev) setStep(prev);
    else router.back();
  }

  // ── Step Renders ──────────────────────────────────────────────────────────

  function renderWizard() {
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const toggleDay = (d: string) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

    const profileCuisinesDisplay = selectedCuisines.length > 0
      ? selectedCuisines.length <= 3
        ? selectedCuisines
        : [...selectedCuisines.slice(0, 3), `+${selectedCuisines.length - 3} more`]
      : [];

    const profileComplete = selectedCuisines.length > 0 && foodPreference.length > 0;

    function handleGenerate() {
      if (selectedDays.length === 0) { setError('Please select at least one day'); return; }
      // Compute dates from selected days
      const today = startOfDay(new Date());
      const dayMap: Record<string, number> = { 'Mon':1,'Tue':2,'Wed':3,'Thu':4,'Fri':5,'Sat':6,'Sun':0 };
      const todayDow = today.getDay();
      const targetDates = selectedDays.map(d => {
        const targetDow = dayMap[d] ?? 0;
        let diff = targetDow - todayDow;
        if (diff < 0) diff += 7;
        return addDays(today, diff);
      }).sort((a, b) => a.getTime() - b.getTime());
      setSelectedFrom(targetDates[0]);
      setSelectedTo(targetDates[targetDates.length - 1]);
      if (!foodPref) setFoodPref('veg');
      setStep('generating');
    }

    return (
      <View>
        {/* Element 1: Day selection */}
        <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginBottom:10}}>Which days shall Maharaj plan?</Text>
        <View style={{flexDirection:'row',gap:6,marginBottom:6}}>
          {dayNames.map(d => {
            const active = selectedDays.includes(d);
            return (
              <TouchableOpacity key={d} style={{flex:1,height:42,borderRadius:10,backgroundColor:active ? colors.emerald : 'rgba(255,255,255,0.9)',borderWidth:1.5,borderColor:active ? colors.emerald : '#D1D5DB',alignItems:'center',justifyContent:'center'}} onPress={() => toggleDay(d)}>
                <Text style={{fontSize:11,fontWeight:'700',color:active ? colors.white : colors.navy}}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:16}}>{selectedDays.length > 0 ? `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected` : 'Tap days to select'}</Text>

        {/* Element 2: Free text */}
        <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginBottom:8}}>Anything specific this week?</Text>
        <TextInput
          style={{borderWidth:1.5,borderColor:'#D1D5DB',borderRadius:12,padding:14,fontSize:14,color:colors.navy,backgroundColor:'rgba(255,255,255,0.9)',minHeight:80,textAlignVertical:'top',marginBottom:16}}
          placeholder="e.g. light meals this week, someone is fasting on Tuesday, guests coming on Saturday..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={freeText}
          onChangeText={setFreeText}
        />

        {/* Element 3: Maharaj already knows */}
        <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginBottom:8}}>Maharaj already knows</Text>
        {profileComplete ? (
          <View style={[cards.frostedGreen, {marginBottom:16}]}>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {profileCuisinesDisplay.map((c, i) => (
                <View key={i} style={{backgroundColor:'rgba(30,158,94,0.15)',borderRadius:16,paddingHorizontal:10,paddingVertical:4}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:colors.emerald}}>{c}</Text>
                </View>
              ))}
            </View>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
              {foodPreference ? (
                <View style={{backgroundColor:'rgba(26,58,92,0.1)',borderRadius:16,paddingHorizontal:10,paddingVertical:4}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:colors.navy}}>{foodPreference}</Text>
                </View>
              ) : null}
              {cookingPattern ? (
                <View style={{backgroundColor:'rgba(26,58,92,0.1)',borderRadius:16,paddingHorizontal:10,paddingVertical:4}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:colors.navy}}>{cookingPattern}</Text>
                </View>
              ) : null}
              {familySize > 0 ? (
                <View style={{backgroundColor:'rgba(26,58,92,0.1)',borderRadius:16,paddingHorizontal:10,paddingVertical:4}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:colors.navy}}>{familySize} members</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[cards.frostedGreen, {marginBottom:16,alignItems:'center',paddingVertical:16}]} onPress={() => router.push('/dietary-profile' as never)}>
            <Text style={{fontSize:14,fontWeight:'700',color:colors.emerald}}>Complete your Family Profile</Text>
            <Text style={{fontSize:11,color:colors.textMuted,marginTop:4}}>Help Maharaj plan better meals for your family</Text>
          </TouchableOpacity>
        )}

        {/* Element 4: Cuisine chips (first time user only) */}
        {isFirstTimeUser && (
          <View style={{marginBottom:16}}>
            <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginBottom:8}}>Select your cuisines</Text>
            {CUISINE_GROUPS.map(group => {
              const isExpanded = expandedCuisineGroups[group.label] ?? false;
              const visibleCuisines = isExpanded ? group.cuisines : group.cuisines.slice(0, 5);
              return (
                <View key={group.label} style={{marginBottom:10}}>
                  <TouchableOpacity onPress={() => setExpandedCuisineGroups(prev => ({...prev, [group.label]: !prev[group.label]}))} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:colors.textSecondary,letterSpacing:0.5,textTransform:'uppercase'}}>{group.label}</Text>
                    <Text style={{fontSize:10,color:colors.textMuted}}>{isExpanded ? 'Show less' : `+${Math.max(0, group.cuisines.length - 5)} more`}</Text>
                  </TouchableOpacity>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                    {visibleCuisines.map(c => (
                      <TouchableOpacity key={c} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,borderWidth:1.5,borderColor:selectedCuisines.includes(c) ? colors.emerald : '#D4EDE5',backgroundColor:selectedCuisines.includes(c) ? colors.emerald : 'rgba(255,255,255,0.9)'}} onPress={() => setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}>
                        <Text style={{fontSize:11,fontWeight:'500',color:selectedCuisines.includes(c) ? colors.white : colors.navy}}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Element 5: Food preference chips (first time user only) */}
        {isFirstTimeUser && (
          <View style={{marginBottom:16}}>
            <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginBottom:8}}>Food preference</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
              {['Veg','Non-veg','Mixed','Eggetarian'].map(fp => {
                const active = foodPreference === fp;
                return (
                  <TouchableOpacity key={fp} style={{paddingHorizontal:16,paddingVertical:10,borderRadius:20,borderWidth:1.5,borderColor:active ? colors.emerald : '#D1D5DB',backgroundColor:active ? colors.emerald : 'rgba(255,255,255,0.9)'}} onPress={() => {
                    setFoodPreference(fp);
                    if (fp === 'Veg') { setFoodPref('veg'); setIsMixed(false); }
                    else if (fp === 'Non-veg') { setFoodPref('nonveg'); setIsMixed(false); }
                    else if (fp === 'Mixed') { setFoodPref('nonveg'); setIsMixed(true); }
                    else if (fp === 'Eggetarian') { setFoodPref('nonveg'); setIsMixed(false); setNonVegOpts(['Eggs']); }
                  }}>
                    <Text style={{fontSize:13,fontWeight:'600',color:active ? colors.white : colors.navy}}>{fp}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {error ? <Text style={{fontSize:13,color:colors.danger,textAlign:'center',backgroundColor:'#FEF2F2',borderRadius:10,padding:12,marginBottom:12}}>{error}</Text> : null}

        {/* Generate button */}
        <TouchableOpacity
          style={{backgroundColor: selectedDays.length === 0 ? '#9CA3AF' : colors.emerald, borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:8}}
          onPress={handleGenerate}
          disabled={selectedDays.length === 0}
          activeOpacity={0.85}
        >
          <Text style={{fontSize:16,fontWeight:'700',color:colors.white}}>Generate My Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderGeneratingV3() {
    const completedDays = generatingProgress?.current || 0;
    const dates = selectedFrom && selectedTo ? getDates(selectedFrom, selectedTo) : [];
    const totalDays = dates.length || selectedDays.length;

    return (
      <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:24}}>
        {/* Maharaj logo with pulse */}
        <Animated.View style={{transform:[{scale:pulseAnim}],marginBottom:20}}>
          <Image source={require('../assets/icon.png')} style={{width:80,height:80,borderRadius:40}} resizeMode="contain" />
        </Animated.View>

        <Text style={{fontSize:18,fontWeight:'700',color:colors.navy,marginBottom:8,textAlign:'center'}}>Maharaj is planning...</Text>
        <Text style={{fontSize:14,color:colors.emerald,marginBottom:20,textAlign:'center'}}>
          {generatingDay ? `Working on ${generatingDay}...` : 'Starting up...'}
        </Text>

        {/* Day progress dots */}
        <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
          {Array.from({length: totalDays}, (_, i) => {
            const isDone = i < completedDays;
            const isCurrent = i === completedDays;
            return (
              <View key={i} style={{width:28,height:28,borderRadius:14,backgroundColor:isDone ? colors.emerald : 'transparent',borderWidth:2,borderColor:isDone ? colors.emerald : isCurrent ? colors.navy : '#D1D5DB',alignItems:'center',justifyContent:'center'}}>
                {isDone ? (
                  <Text style={{fontSize:12,color:colors.white,fontWeight:'700'}}>{'\u2713'}</Text>
                ) : (
                  <Text style={{fontSize:10,fontWeight:'700',color:isCurrent ? colors.navy : '#9CA3AF'}}>{i+1}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Pause/Resume */}
        <TouchableOpacity style={{marginTop:16,backgroundColor:colors.gold,borderRadius:10,paddingVertical:12,paddingHorizontal:28}} onPress={() => setGenPaused(p => !p)}>
          <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>{genPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderObservations() {
    const answeredCount = observations.filter(o => o.answered).length;
    const totalObs = observations.length;
    const allAnswered = answeredCount === totalObs;

    function answerObservation(id: string, answer: 'yes' | 'no') {
      setObservations(prev => prev.map(o => o.id === id ? {...o, answered: true, answer} : o));
    }

    return (
      <View>
        {/* Maharaj avatar + speech bubble */}
        <View style={{flexDirection:'row',alignItems:'flex-start',marginBottom:16,gap:12}}>
          <Image source={require('../assets/icon.png')} style={{width:48,height:48,borderRadius:24}} resizeMode="contain" />
          <View style={{flex:1,backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,borderTopLeftRadius:4,padding:14,borderWidth:1,borderColor:'rgba(255,255,255,0.6)'}}>
            <Text style={{fontSize:14,color:colors.navy,lineHeight:20}}>I have a few observations about your week. Please confirm so I can fine-tune your plan.</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{marginBottom:16}}>
          <Text style={{fontSize:12,fontWeight:'600',color:colors.textSecondary,marginBottom:6}}>{answeredCount} of {totalObs} answered</Text>
          <View style={{height:4,backgroundColor:'#E5E7EB',borderRadius:2}}>
            <View style={{height:4,backgroundColor:colors.emerald,borderRadius:2,width: totalObs > 0 ? `${(answeredCount / totalObs) * 100}%` as any : '0%'}} />
          </View>
        </View>

        {/* Observation cards */}
        {observations.map(obs => (
          <View key={obs.id} style={[cards.base, {marginBottom:10}]}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
              {obs.answered && <Text style={{fontSize:14,color:colors.emerald}}>{'\u2713'}</Text>}
              <Text style={{fontSize:13,fontWeight:'700',color:colors.navy}}>{obs.label}</Text>
            </View>
            <Text style={{fontSize:13,color:colors.textSecondary,lineHeight:19,marginBottom:10}}>{obs.text}</Text>
            {!obs.answered ? (
              <View style={{flexDirection:'row',gap:10}}>
                <TouchableOpacity style={{flex:1,paddingVertical:10,borderRadius:10,backgroundColor:colors.emerald,alignItems:'center'}} onPress={() => answerObservation(obs.id, 'yes')}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.white}}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flex:1,paddingVertical:10,borderRadius:10,backgroundColor:'rgba(255,255,255,0.9)',borderWidth:1.5,borderColor:'#D1D5DB',alignItems:'center'}} onPress={() => answerObservation(obs.id, 'no')}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.navy}}>No</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Text style={{fontSize:12,color:colors.emerald,fontWeight:'600'}}>Answered: {obs.answer === 'yes' ? 'Yes' : 'No'}</Text>
              </View>
            )}
          </View>
        ))}

        {/* View My Plan button */}
        <TouchableOpacity
          style={{backgroundColor: allAnswered ? colors.emerald : '#9CA3AF', borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:16}}
          onPress={() => {
            if (allAnswered) {
              void saveHistory();
              setStep('plan-summary');
            }
          }}
          disabled={!allAnswered}
          activeOpacity={0.85}
        >
          <Text style={{fontSize:16,fontWeight:'700',color:colors.white}}>View My Plan</Text>
        </TouchableOpacity>
        {!allAnswered && <Text style={{fontSize:11,color:colors.textMuted,textAlign:'center',marginTop:6}}>Answer all observations to continue</Text>}
      </View>
    );
  }

  function renderPlanSummaryV3() {
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

    return (
      <View>
        {/* Hint */}
        <View style={{backgroundColor:'rgba(30,158,94,0.08)',borderRadius:10,padding:10,marginBottom:14}}>
          <Text style={{fontSize:12,color:colors.emerald,textAlign:'center',fontWeight:'600'}}>Tap any dish to see 3 alternatives</Text>
        </View>

        {/* Day cards */}
        {generatedPlan.map((day, dayIdx) => {
          const dt = new Date(day.date);
          const dayLabel = `${day.day}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
          // Check for festivals
          const festivalMatch = FESTIVALS_2026.find(f => f.date === day.date);
          const isSunday = dt.getDay() === 0;

          return (
            <View key={day.date} style={[cards.base, {marginBottom:12}]}>
              {/* Day header */}
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                  <Text style={{fontSize:15,fontWeight:'800',color:colors.navy}}>{dayLabel}</Text>
                  {isSunday && <View style={{backgroundColor:colors.gold,borderRadius:8,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'700',color:'#1A1A1A'}}>Sunday</Text></View>}
                  {festivalMatch && <View style={{backgroundColor:'#FEF3C7',borderRadius:8,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'700',color:'#92400E'}}>{festivalMatch.name}</Text></View>}
                </View>
              </View>

              {/* Meal slots */}
              {slotsToShow.map(({ key, label }) => {
                const opt = getOpt(dayIdx, key);
                if (!opt) return null;

                // Parse thali components
                const isThali = opt.name.toLowerCase().includes('thali');
                const components = isThali && opt.description?.includes(' | ')
                  ? opt.description.split(' | ').map(c => c.trim())
                  : [opt.name];

                return (
                  <View key={key} style={{marginBottom:8}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:colors.textMuted,letterSpacing:0.5,textTransform:'uppercase',marginBottom:4}}>{label}</Text>
                    {components.map((comp, ci) => {
                      const parts = comp.split(':');
                      const compLabel = parts.length > 1 ? parts[0].trim() : label;
                      const dishName = parts.length > 1 ? parts.slice(1).join(':').trim() : comp;
                      return (
                        <TouchableOpacity
                          key={ci}
                          style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:6,paddingHorizontal:8,backgroundColor:'rgba(255,255,255,0.6)',borderRadius:8,marginBottom:2}}
                          onPress={() => {
                            setAlternativeSlot({ dayIdx, slot: key, component: compLabel });
                            setStep('alternatives');
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{flex:1}}>
                            {isThali && <Text style={{fontSize:9,color:colors.textMuted,fontWeight:'600'}}>{compLabel}</Text>}
                            <Text style={{fontSize:13,fontWeight:'600',color:colors.navy}}>{dishName}</Text>
                          </View>
                          <Text style={{fontSize:14,color:colors.textMuted,marginLeft:8}}>{'\u270E'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Bottom actions */}
        <TouchableOpacity style={{backgroundColor:colors.emerald,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:8}} onPress={() => {
          // Auto-save confirmed plan
          (async () => {
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
                const dishNames = confirmedPlan.flatMap(d => [d.breakfast?.name, d.lunch?.name, d.snack?.name, d.dinner?.name].filter(Boolean));
                const oldDishHist = JSON.parse(await AsyncStorage.getItem('dish_history') || '[]');
                await AsyncStorage.setItem('dish_history', JSON.stringify([...dishNames, ...oldDishHist].slice(0, 60)));
              } catch {}
            }
          })();
          setStep('what-next');
        }} activeOpacity={0.85}>
          <Text style={{fontSize:16,fontWeight:'700',color:colors.white}}>Confirm My Week</Text>
        </TouchableOpacity>

        <View style={{flexDirection:'row',gap:8,marginTop:10}}>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:colors.navy,alignItems:'center'}} onPress={() => {
            if (!generatedPlan || Platform.OS !== 'web') return;
            const dateRange = selectedFrom && selectedTo ? `${fmt(selectedFrom)} – ${fmt(selectedTo)}` : '';
            const slots: MealSlotKey[] = ['breakfast','lunch','snack','dinner'];
            const dayHeaders = generatedPlan.map(d => `<th>${d.day?.substring(0,3)}<br>${new Date(d.date).getDate()}-${MONTHS[new Date(d.date).getMonth()]}</th>`).join('');
            const mealRows = slots.filter(sl => selectedSlots.length === 0 || selectedSlots.includes(sl)).map(sl => {
              const label = sl.charAt(0).toUpperCase() + sl.slice(1);
              const cells = generatedPlan.map((day, idx) => `<td>${day[sl]?.options?.[selections[idx]?.[sl] ?? 0]?.name ?? '\u2014'}</td>`).join('');
              return `<tr><td class="sl">${label}</td>${cells}</tr>`;
            }).join('');
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4 landscape;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;-webkit-print-color-adjust:exact}.hd{background:#1A3A5C;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.hd-l{color:white;font-size:18px;font-weight:bold}.hd-h{color:#C9A227;font-size:11px;margin-top:3px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1A3A5C;color:white;padding:8px;font-size:11px;text-align:center;border:1px solid #1A3A5C}td{padding:8px;font-size:10px;border:1px solid #E5E7EB;text-align:center}tr:nth-child(even) td{background:#F9FAFB}.sl{font-weight:bold;color:#1A3A5C;text-align:left;width:80px}.ft{margin-top:20px;text-align:center;font-size:9px;color:#6B7280}</style></head><body><div class="hd"><div><div class="hd-l">My Maharaj</div><div class="hd-h">Weekly Meal Plan</div></div></div><table><tr><th class="sl">Meal</th>${dayHeaders}</tr>${mealRows}</table><div class="ft">Powered by My Maharaj</div><script>setTimeout(function(){window.print()},800)</script></body></html>`;
            const blob = new Blob([html], { type: 'text/html' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'maharaj-meal-plan.html'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }}>
            <Text style={{fontSize:13,fontWeight:'600',color:colors.navy}}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'#D1D5DB',alignItems:'center'}} onPress={() => {
            setGeneratedPlan(null);
            setSelections({});
            setActiveDay(0);
            setStep('generating');
          }}>
            <Text style={{fontSize:13,fontWeight:'600',color:colors.textMuted}}>Redo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderAlternatives() {
    if (!generatedPlan || !alternativeSlot) return null;

    const { dayIdx, slot, component } = alternativeSlot;
    const day = generatedPlan[dayIdx];
    const dt = new Date(day.date);
    const currentOpt = getOpt(dayIdx, slot);
    const currentName = currentOpt?.name ?? 'Current dish';

    // Get alternative options from the plan
    const slotData = day[slot];
    const alternatives = slotData?.options?.filter((_, i) => i !== (selections[dayIdx]?.[slot] ?? 0)).slice(0, 3) ?? [];

    return (
      <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end',zIndex:100}}>
        <View style={{backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:Dimensions.get('window').height * 0.7}}>
          {/* Context */}
          <Text style={{fontSize:12,color:colors.textMuted,textAlign:'center',marginBottom:4}}>{day.day} {'\u00B7'} {slot.charAt(0).toUpperCase() + slot.slice(1)} {'\u00B7'} {component}</Text>

          {/* Current dish struck through */}
          <Text style={{fontSize:15,color:colors.textMuted,textAlign:'center',textDecorationLine:'line-through',marginBottom:16}}>{currentName}</Text>

          {/* Alternative cards */}
          <ScrollView style={{maxHeight:300}}>
            {alternatives.length > 0 ? alternatives.map((alt, i) => (
              <View key={i} style={[cards.base, {marginBottom:10}]}>
                <Text style={{fontSize:15,fontWeight:'700',color:colors.navy,marginBottom:4}}>{alt.name}</Text>
                {alt.description && <Text style={{fontSize:12,color:colors.textSecondary,marginBottom:8,lineHeight:17}}>{alt.description}</Text>}
                {alt.tags?.length > 0 && (
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:8}}>
                    {alt.tags.slice(0, 3).map(tag => (
                      <Text key={tag} style={{fontSize:9,fontWeight:'600',color:colors.emerald,backgroundColor:'rgba(30,158,94,0.1)',paddingHorizontal:6,paddingVertical:2,borderRadius:6}}>{tag}</Text>
                    ))}
                  </View>
                )}
                <TouchableOpacity style={{backgroundColor:colors.emerald,borderRadius:10,paddingVertical:10,alignItems:'center'}} onPress={() => {
                  const altIdx = slotData?.options?.indexOf(alt) ?? -1;
                  if (altIdx >= 0) {
                    setSelections(prev => ({...prev, [dayIdx]: {...(prev[dayIdx] ?? {}), [slot]: altIdx}}));
                  }
                  setAlternativeSlot(null);
                  setStep('plan-summary');
                }}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.white}}>Pick this</Text>
                </TouchableOpacity>
              </View>
            )) : (
              <View style={{alignItems:'center',paddingVertical:20}}>
                <Text style={{fontSize:14,color:colors.textMuted}}>No alternatives available for this slot.</Text>
              </View>
            )}
          </ScrollView>

          {/* Keep current button */}
          <TouchableOpacity style={{paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'#D1D5DB',alignItems:'center',marginTop:8}} onPress={() => {
            setAlternativeSlot(null);
            setStep('plan-summary');
          }}>
            <Text style={{fontSize:14,fontWeight:'600',color:colors.navy}}>Keep {currentName}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderWhatNext() {
    const numDays = generatedPlan?.length ?? 0;
    return (
      <View>
        <Text style={{fontSize:14,color:colors.textSecondary,textAlign:'center',marginBottom:24}}>Your {numDays}-day plan is confirmed</Text>

        {/* Card 1: Cook at Home */}
        <TouchableOpacity style={[cards.frostedGreen, {padding:20,marginBottom:14}]} onPress={() => { setFeedbacks(buildFeedbackEntries()); setStep('grocery'); }} activeOpacity={0.85}>
          <Text style={{fontSize:18,fontWeight:'700',color:colors.navy,marginBottom:4}}>Cook at Home</Text>
          <Text style={{fontSize:13,color:colors.textSecondary,lineHeight:19}}>Get your consolidated shopping list, check what you already have in your fridge, and order groceries online.</Text>
        </TouchableOpacity>

        {/* Card 2: Order Online */}
        <TouchableOpacity style={[cards.frostedNavy, {padding:20,marginBottom:14}]} onPress={() => setStep('online-shopping')} activeOpacity={0.85}>
          <Text style={{fontSize:18,fontWeight:'700',color:colors.navy,marginBottom:4}}>Order Online</Text>
          <Text style={{fontSize:13,color:colors.textSecondary,lineHeight:19}}>Order ingredients from your favourite delivery service. Integrations coming soon.</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <TouchableOpacity style={{backgroundColor:colors.navy,borderRadius:8,paddingHorizontal:16,paddingVertical:10,alignItems:'center',marginBottom:12}} onPress={() => setScanModalOpen(true)}>
          <Text style={{color:colors.white,fontWeight:'700',fontSize:15}}>Scan to Shop</Text>
        </TouchableOpacity>

        {/* Scan Modal — choose mode */}
        <Modal visible={scanModalOpen} transparent animationType="fade" onRequestClose={() => setScanModalOpen(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'}}>
            <View style={{backgroundColor:'white',borderRadius:16,margin:24,padding:20,width:Dimensions.get('window').width-48}}>
              <Text style={{fontSize:18,fontWeight:'700',color:colors.navy,marginBottom:16,textAlign:'center'}}>Scan to Shop</Text>
              <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:colors.gold,borderRadius:14,padding:16,marginBottom:12}} onPress={scanTrolley}>
                <Text style={{fontSize:16,fontWeight:'700',color:colors.navy}}>Scan My Trolley</Text>
                <Text style={{fontSize:13,color:colors.textMuted,marginTop:4}}>Take a photo of your supermarket trolley — Maharaj will identify what you have picked up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:colors.navy,borderRadius:14,padding:16,marginBottom:12}} onPress={async () => { setScanModalOpen(false); const { status } = await BarCodeScanner.requestPermissionsAsync(); if (status === 'granted') setBarcodeScannerOpen(true); else Alert.alert('Camera permission required'); }}>
                <Text style={{fontSize:16,fontWeight:'700',color:colors.navy}}>Scan a Barcode</Text>
                <Text style={{fontSize:13,color:colors.textMuted,marginTop:4}}>Point your camera at any product barcode — Maharaj will add it to your list</Text>
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
            <ActivityIndicator color={colors.navy} />
            <Text style={{fontSize:13,color:colors.navy,marginTop:8}}>Maharaj is scanning your trolley...</Text>
          </View>
        )}

        {/* Review scanned items */}
        {scanMode === 'review' && scannedItems.length > 0 && (
          <View style={{marginBottom:16}}>
            <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginBottom:4}}>Review Scanned Items</Text>
            <Text style={{fontSize:13,color:colors.teal,textAlign:'center',marginBottom:12}}>Review and edit before adding to your shopping list.</Text>
            {scannedItems.map((item, i) => (
              <View key={i} style={{backgroundColor:'white',borderWidth:1.5,borderColor:colors.gold,borderRadius:14,padding:16,marginBottom:10}}>
                <TextInput style={{fontSize:15,color:colors.navy,fontWeight:'600',marginBottom:4}} value={item.name} onChangeText={v => setScannedItems(prev => prev.map((it,j) => j===i ? {...it,name:v} : it))} />
                <TextInput style={{fontSize:13,color:colors.textMuted}} value={item.quantity} onChangeText={v => setScannedItems(prev => prev.map((it,j) => j===i ? {...it,quantity:v} : it))} />
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                  <Text style={{fontSize:12,color:colors.teal}}>{item.category}</Text>
                  <TouchableOpacity onPress={() => setScannedItems(prev => prev.filter((_,j) => j!==i))}>
                    <Text style={{fontSize:12,color:colors.danger}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={{backgroundColor:colors.gold,borderRadius:8,paddingVertical:12,alignItems:'center',marginTop:8}} onPress={addScannedToList}>
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
                <Text style={{fontSize:11,fontWeight:'700',color:colors.gold,letterSpacing:0.5,paddingBottom:4,marginBottom:6,borderBottomWidth:1.5,borderBottomColor:colors.gold}}>{cat}</Text>
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
                      <Text style={{fontSize:10,color:colors.navy,flex:1}}>{item.name}</Text>
                      <Text style={{fontSize:10,color:'#6B7280'}}>{item.qty ? `${item.qty}${item.unit||''}` : ''}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {/* Download PDF */}
        <TouchableOpacity style={{backgroundColor:colors.navy,borderRadius:12,paddingVertical:14,alignItems:'center',marginTop:8,marginBottom:8}} onPress={() => void downloadGrocery()}>
          <Text style={{fontSize:13,fontWeight:'500',color:colors.white}}>Download Shopping List</Text>
        </TouchableOpacity>

        {/* Next — Online Shopping */}
        <TouchableOpacity style={{backgroundColor:colors.gold,borderRadius:8,paddingVertical:14,width:'100%',alignItems:'center',marginTop:16}} onPress={() => setStep('online-shopping')}>
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
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:Platform.OS === 'web' ? 16 : 10,paddingBottom:14,borderBottomWidth:1,borderBottomColor:'rgba(26,58,92,0.1)'}}>
          <TouchableOpacity onPress={() => setStep('grocery')} style={buttons.back}>
            <Text style={buttons.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={{flex:1,fontSize:16,fontWeight:'700',color:colors.navy,textAlign:'center'}}>Order Online</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={buttons.home}>
            <Text style={buttons.homeText}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Text style={{color:colors.textMuted,fontSize:13,textAlign:'center',marginBottom:16,marginTop:12,paddingHorizontal:20}}>Choose your preferred store or delivery app</Text>

        {/* 2x2 Grid */}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,paddingHorizontal:20}}>
          {stores.map(name => (
            <View key={name} style={{width:'47%',backgroundColor:'white',borderWidth:1.5,borderColor:colors.navy,borderRadius:14,padding:20,alignItems:'center',opacity:0.75}}>
              <Text style={{color:colors.navy,fontWeight:'700',fontSize:15,textAlign:'center'}}>{name}</Text>
              <Text style={{color:colors.gold,fontSize:12,fontWeight:'500',textAlign:'center',marginTop:6}}>Coming Soon</Text>
            </View>
          ))}
        </View>

        {/* Navy banner */}
        <View style={{backgroundColor:colors.navy,borderRadius:12,padding:14,marginTop:20,marginHorizontal:20}}>
          <Text style={{color:colors.white,fontSize:13,textAlign:'center'}}>Integrations coming soon. Maharaj will connect directly to your favourite store.</Text>
        </View>
      </View>
    );
  }

  // ── Step render map ───────────────────────────────────────────────────────

  const STEP_RENDER: Record<WizardStep, () => React.ReactNode> = {
    'wizard':          renderWizard,
    'generating':      renderGeneratingV3,
    'observations':    renderObservations,
    'plan-summary':    renderPlanSummaryV3,
    'alternatives':    renderPlanSummaryV3,
    'what-next':       renderWhatNext,
    'grocery':         renderGrocery,
    'online-shopping': renderOnlineShopping,
  };

  const isFullScreen = ['generating', 'online-shopping'].includes(step);

  // ── Header titles ─────────────────────────────────────────────────────────

  const headerTitles: Record<WizardStep, string> = {
    'wizard': 'Plan My Week',
    'generating': 'Planning Your Week',
    'observations': "Maharaj's Observations",
    'plan-summary': 'My Maharaj Meal Plan',
    'alternatives': 'My Maharaj Meal Plan',
    'what-next': 'What Would You Like to Do?',
    'grocery': 'Shopping List',
    'online-shopping': 'Order Online',
  };

  return (
    <View style={{flex:1}}>
    <ImageBackground source={require('../assets/background.png')} style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%'}} resizeMode="cover" />
    <SafeAreaView style={s.safe}>
      {/* Header */}
      {!isFullScreen && (
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={buttons.back}>
            <Text style={buttons.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={{flex:1,fontSize:16,fontWeight:'700',color:colors.navy,textAlign:'center'}}>{headerTitles[step] || 'Meal Wizard'}</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={buttons.home}>
            <Text style={buttons.homeText}>Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isFullScreen && <MarqueeTicker />}

      <ScrollView ref={scrollRef} contentContainerStyle={[s.scroll, isFullScreen && s.scrollCenter]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[s.body, isFullScreen && s.bodyCenter]}>
          {STEP_RENDER[step]?.()}
        </View>
      </ScrollView>

      {/* Alternatives overlay */}
      {step === 'alternatives' && renderAlternatives()}
    </SafeAreaView>
    </View>
  );
}

// ─── Main styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(26,58,92,0.1)',
  },

  scroll:       { paddingBottom: 48 },
  scrollCenter: { flexGrow: 1 },
  body:         { paddingHorizontal: 20, paddingTop: 20, maxWidth: 700, width: '100%', alignSelf: 'center' },
  bodyCenter:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  stepTitle: { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  stepSub:   { fontSize: 14, color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },

  emptyBox:  { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
