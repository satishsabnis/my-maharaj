import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Dimensions, Easing, Image, ImageBackground, Linking, Modal, Platform, SafeAreaView, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { generateMealPlan, generateMealPlanFast, MealOption, MealPlanDay, emptyHealthFlags, HealthFlags, AnatomyComponent, MealAnatomy } from '../lib/ai';
import { loadOrDetectLocation, UserLocation } from '../lib/location';
import Button from '../components/Button';
import Logo from '../components/Logo';
import MarqueeTicker from '../components/MarqueeTicker';
import MaharajSpinner from '../components/MaharajSpinner';
import { getCuisineGroups } from '../lib/cuisineGroups';
import { colors, cards, buttons } from '../constants/theme';
import { track } from '../lib/analytics';
import { scheduleSundayReminder } from '../lib/notifications';


// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep =
  | 'wizard' | 'generating' | 'observations' | 'plan-summary'
  | 'what-next' | 'grocery' | 'online-shopping';

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface DBMember { id: string; name: string; age: number; health_notes?: string | null; }
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
  { name: 'Lohri', month: 1, day: 13 },
  { name: 'Makar Sankranti', month: 1, day: 14 },
  { name: 'Maha Shivratri', month: 2, day: 26 },
  { name: 'Holi', month: 3, day: 4 },
  { name: 'Eid ul Fitr', month: 3, day: 20 },
  { name: 'Gudi Padwa', month: 3, day: 21 },
  { name: 'Ram Navami', month: 3, day: 27 },
  { name: 'Hanuman Jayanti', month: 4, day: 10 },
  { name: 'Baisakhi', month: 4, day: 14 },
  { name: 'Akshaya Tritiya', month: 4, day: 29 },
  { name: 'Eid ul Adha', month: 5, day: 27 },
  { name: 'Guru Purnima', month: 7, day: 3 },
  { name: 'Independence Day', month: 8, day: 15 },
  { name: 'Janmashtami', month: 8, day: 17 },
  { name: 'Ganesh Chaturthi', month: 8, day: 24 },
  { name: 'Raksha Bandhan', month: 9, day: 3 },
  { name: 'Navratri', month: 10, day: 12 },
  { name: 'Karwa Chauth', month: 10, day: 16 },
  { name: 'Dussehra', month: 10, day: 21 },
  { name: 'Guru Nanak Jayanti', month: 11, day: 5 },
  { name: 'Diwali', month: 11, day: 8 },
  { name: 'Christmas', month: 12, day: 25 },
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
  const [familyRecipes, setFamilyRecipes] = useState<{recipe_name:string;cuisine:string}[]>([]);
  const [useMyRecipes, setUseMyRecipes] = useState(true);
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
  const [confirmedDays,   setConfirmedDays]   = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Observations
  const [observations, setObservations] = useState<Observation[]>([]);

  // Alternatives
  const [alternativeSlot, setAlternativeSlot] = useState<{ dayIdx: number; slot: MealSlotKey; component: string; dishName: string; anatomyAlts?: { dishName: string; isVeg?: boolean; cuisine?: string }[] } | null>(null);
  const [altModalVisible, setAltModalVisible] = useState(false);
  const [fetchingAlts, setFetchingAlts] = useState(false);
  const [fetchedAlts, setFetchedAlts] = useState<{dishName:string;isVeg:boolean}[]>([]);

  // Recipe modal
  const [recipeModal, setRecipeModal] = useState<{ visible: boolean; dishName: string }>({ visible: false, dishName: '' });
  const [recipeData, setRecipeData] = useState<{ title: string; serves: number; ingredients: string[]; method: string[]; maharajNote: string } | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);

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

  // Fasting members
  const [fastingInfo, setFastingInfo] = useState<{memberName:string;fastingType:string;dayMatch:(dayName:string)=>boolean}[]>([]);

  // Jain
  const [isJainFamily, setIsJainFamily] = useState(false);
  const CUISINE_GROUPS = getCuisineGroups(isJainFamily);

  // FIX 6: Fetch recipe when modal opens
  useEffect(() => {
    if (!recipeModal.visible || !recipeModal.dishName) return;
    const dishName = recipeModal.dishName;
    const cacheKey = `recipe_${dishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    setRecipeData(null);
    setRecipeLoading(true);
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) { setRecipeData(JSON.parse(cached)); setRecipeLoading(false); return; }
        const serves = familySize > 0 ? familySize : 4;
        const prompt = `Write a complete authentic Indian home recipe for the dish named exactly "${dishName}".
This is specifically: ${dishName}. Do NOT write a recipe for any other dish.
If "${dishName}" is a rice dish, write a rice recipe.
If "${dishName}" is a fry or tawa dish, write a fry recipe.
If "${dishName}" is a curry, write a curry recipe.
If "${dishName}" is a bread, write a bread recipe.
If "${dishName}" is a raita or chutney, write a raita or chutney recipe.
Return ONLY valid JSON (no markdown) in this exact format:
{ "title": "${dishName}", "serves": ${serves}, "ingredients": ["qty ingredient", ...8-12 items], "method": ["Step 1: ...", ...5-8 steps], "maharajNote": "one warm family tip about this dish" }`;
        const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
        });
        const data = await res.json();
        const text = (data?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(text);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(parsed));
        setRecipeData(parsed);
      } catch { setRecipeData(null); } finally { setRecipeLoading(false); }
    })();
  }, [recipeModal.visible, recipeModal.dishName]);

  useEffect(() => {
    if (!altModalVisible || !alternativeSlot) { setFetchedAlts([]); return; }
    const hasAnatomyAlts = alternativeSlot.anatomyAlts && alternativeSlot.anatomyAlts.length > 0;
    const day = generatedPlan?.[alternativeSlot.dayIdx];
    const slotData = day?.[alternativeSlot.slot as MealSlotKey];
    const legacyAlts = slotData?.options?.filter((_, i) => i !== (selections[alternativeSlot.dayIdx]?.[alternativeSlot.slot as MealSlotKey] ?? 0)).slice(0, 3) ?? [];
    if (hasAnatomyAlts || legacyAlts.length > 0) return;
    setFetchingAlts(true);
    setFetchedAlts([]);
    const cuisine = selectedCuisines.join(', ') || 'Indian';
    const prompt = `Suggest 3 alternative dishes for "${alternativeSlot.dishName}" from ${cuisine} cuisine. Same meal type. Return ONLY valid JSON array with no markdown: [{"dishName":"name","isVeg":true},{"dishName":"name","isVeg":false},{"dishName":"name","isVeg":false}]`;
    fetch('https://my-maharaj.vercel.app/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
    })
      .then(r => r.json())
      .then(data => {
        const text = (data?.content?.[0]?.text ?? '[]').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) setFetchedAlts(parsed);
      })
      .catch(() => {})
      .finally(() => setFetchingAlts(false));
  }, [altModalVisible]);

  const scrollRef = useRef<ScrollView>(null);
  const planScrollRef = useRef<ScrollView>(null);
  const prevStepRef = useRef<WizardStep | null>(null);
  const scrollYRef = useRef<Record<string, number>>({});
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    prevStepRef.current = step;
  }, [step]);

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

      // Fasting info — parse from members' health_notes and fasting_days_text
      const fastingText = await AsyncStorage.getItem('fasting_days_text') ?? '';
      const fastEntries: {memberName:string;fastingType:string;dayMatch:(dn:string)=>boolean}[] = [];
      // Parse common fasting patterns from fasting_days_text
      const fastLower = fastingText.toLowerCase();
      if (fastLower.includes('monday')) fastEntries.push({ memberName: 'Family', fastingType: 'Monday fast', dayMatch: (dn) => dn === 'Monday' });
      if (fastLower.includes('tuesday')) fastEntries.push({ memberName: 'Family', fastingType: 'Tuesday fast', dayMatch: (dn) => dn === 'Tuesday' });
      if (fastLower.includes('thursday')) fastEntries.push({ memberName: 'Family', fastingType: 'Thursday fast', dayMatch: (dn) => dn === 'Thursday' });
      if (fastLower.includes('saturday')) fastEntries.push({ memberName: 'Family', fastingType: 'Saturday fast', dayMatch: (dn) => dn === 'Saturday' });
      if (fastLower.includes('ekadashi')) fastEntries.push({ memberName: 'Family', fastingType: 'Ekadashi', dayMatch: () => false }); // calendar-based, not day-of-week
      // Also check per-member health_notes for fasting
      members.forEach(m => {
        const notes = (m.health_notes ?? '').toLowerCase();
        if (notes.includes('monday fast')) fastEntries.push({ memberName: m.name, fastingType: 'Monday fast', dayMatch: (dn) => dn === 'Monday' });
        if (notes.includes('fasting')) {
          const dayMatch = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].find(d => notes.includes(d.toLowerCase()));
          if (dayMatch) fastEntries.push({ memberName: m.name, fastingType: `${dayMatch} fast`, dayMatch: (dn) => dn === dayMatch });
        }
      });
      setFastingInfo(fastEntries);

      // Breakfast prefs
      const bp = await AsyncStorage.getItem('breakfast_preferences');
      if (bp) try { setBreakfastPreferences(JSON.parse(bp)); } catch {}

      // Community rules
      const cr = await AsyncStorage.getItem('community_rules');
      if (cr) setCommunityRules(cr);

      // Family avoids
      const fa = await AsyncStorage.getItem('family_avoids');
      if (fa) try { setFamilyAvoids(JSON.parse(fa)); } catch {}

      // Family recipes
      const fr = await AsyncStorage.getItem('family_recipes');
      if (fr) try { const recs = JSON.parse(fr); if (Array.isArray(recs)) setFamilyRecipes(recs.map((r: any) => ({ recipe_name: r.recipe_name ?? '', cuisine: r.cuisine ?? '' }))); } catch {}

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
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
      console.log('[CUISINES FROM DB]', cuisines);
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

      // Read additional family profile fields for generation
      const cookingPatternRaw = await AsyncStorage.getItem('cooking_pattern');
      const cookingPattern = cookingPatternRaw || undefined;
      const jainFamilyRaw = await AsyncStorage.getItem('jain_family');
      const jainFamily = jainFamilyRaw === 'true' ? true : jainFamilyRaw === 'false' ? false : undefined;
      const mealTemplateCurry = await AsyncStorage.getItem('meal_template_curry') || '';
      const mealTemplateVeg = await AsyncStorage.getItem('meal_template_veg') || '';
      const mealTemplateRaita = await AsyncStorage.getItem('meal_template_raita') || '';
      const mealTemplateBread = await AsyncStorage.getItem('meal_template_bread') || '';
      const mealTemplateRice = await AsyncStorage.getItem('meal_template_rice') || '';
      let sundayExtraCurry = await AsyncStorage.getItem('sunday_extra_curry') || '';
      let sundaySweet = await AsyncStorage.getItem('sunday_sweet') || '';
      // Fallback: if AsyncStorage empty, read from Supabase profiles
      if (!sundayExtraCurry || !sundaySweet) {
        try {
          const { data: profileRow } = await supabase.from('profiles').select('sunday_extra_curry, sunday_sweet').eq('id', userId).maybeSingle();
          if (profileRow) {
            if (!sundayExtraCurry && profileRow.sunday_extra_curry) {
              sundayExtraCurry = profileRow.sunday_extra_curry;
              await AsyncStorage.setItem('sunday_extra_curry', sundayExtraCurry);
            }
            if (!sundaySweet && profileRow.sunday_sweet) {
              sundaySweet = profileRow.sunday_sweet;
              await AsyncStorage.setItem('sunday_sweet', sundaySweet);
            }
          }
        } catch { /* non-fatal — generation continues without Sunday special */ }
      }

      const _dayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
      const _today = new Date();
      const _currentDay = _today.getDay();
      const dates = selectedDays
        .map(d => {
          const target = _dayMap[d];
          let diff = target - _currentDay;
          if (diff <= 0) diff += 7;
          const date = new Date(_today);
          date.setDate(_today.getDate() + diff);
          return toYMD(date);
        })
        .sort();
      setGeneratingProgress({ current: 0, total: dates.length });

      const allCuisinesPerDay = (() => {
        const allCuisines = selectedCuisines.length > 0
          ? selectedCuisines
          : [...savedCuisines.filter(c => !removedCuisines.includes(c)), ...extraCuisines];
        const allCuisinesForAllDays = dates.map((d, i) => {
          if (perDayCuisine[d]) return perDayCuisine[d];
          if (hasGuests && guestCuisine && i < guestDays) return guestCuisine;
          return allCuisines.length > 0 ? allCuisines : cuisine;
        });
        return allCuisinesForAllDays;
      })();

      console.log('[CUISINES PER DAY]', allCuisinesPerDay);
      setGeneratingDay('');  // reset before generation starts

      const communityFromProfile = await AsyncStorage.getItem('community') || '';

      const plan = await generateMealPlanFast({
        userId,
        dates,
        healthFlags: hf,
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
        cuisinePerDay: allCuisinesPerDay,
        breakfastPrefs: bfPrefs.length > 0 ? bfPrefs : undefined,
        lunchPrefs:     lnPrefs.length > 0 ? lnPrefs : undefined,
        dinnerPrefs:    dnPrefs.length > 0 ? dnPrefs : undefined,
        snackPrefs:     snPrefs.length > 0 ? snPrefs : undefined,
        locationCity: userLocation.city,
        locationStores: userLocation.stores,
        selectedSlots: slotsToUse,
        communityRules: communityFromProfile || communityRules || '',
        familyAvoids,
        familySize,
        familyRecipes: useMyRecipes ? familyRecipes : [],
        cookingPattern,
        jainFamily,
        mealTemplateCurry,
        mealTemplateVeg,
        mealTemplateRaita,
        mealTemplateBread,
        mealTemplateRice,
        sundayExtraCurry,
        sundaySweet,
      },
      // onProgress — called after each day completes
      (current, total) => {
        setGeneratingProgress({ current, total });
        if (current >= total) setGeneratingDay('Finalising');
      },
      // onDayStart — called BEFORE each day's API call (Fix 6)
      (dayName) => {
        setGeneratingDay(dayName);
      });

      // Brief display of "Plan ready." before advancing
      setGeneratingDay('Ready');
      await new Promise(resolve => setTimeout(resolve, 600));

      const defaultSel: Record<number, Partial<Record<MealSlotKey, number>>> = {};
      plan.days.forEach((d, i) => { defaultSel[i] = { breakfast: 0, lunch: 0, dinner: 0, ...(d.snack ? { snack: 0 } : {}) }; });
      setGeneratedPlan(plan.days);
      const allSwapNotes: string[] = [];
      plan.days.forEach(d => {
        const notes = (d as any).__swapNotes;
        if (Array.isArray(notes)) allSwapNotes.push(...notes);
      });
      if (allSwapNotes.length > 0) {
        Alert.alert('Maharaj made some swaps', allSwapNotes.join('\n'), [{ text: 'OK' }]);
      }
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

    // Check for festivals (parse string components to avoid UTC timezone off-by-one)
    FESTIVALS_2026.forEach(fest => {
      if (dates.some(d => {
        const [, dMonth, dDay] = d.split('-').map(Number);
        return dMonth === fest.month && dDay === fest.day;
      })) {
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
      if (feedback === 'down') {
        const { count } = await supabase.from('dish_feedback').select('id', { count: 'exact', head: true }).eq('dish_name', dishName).eq('feedback', 'down').eq('user_id', user.id);
        if ((count ?? 0) >= 3) {
          console.warn(`[FEEDBACK] "${dishName}" disliked ${count} times by this user — deprioritised for this user only`);
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
    if (!generatedPlan) {
      Alert.alert('No plan found', 'Please generate a meal plan first.');
      setStep('wizard');
      return {} as any;
    }

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

    function addIng(ing: string) {
      totalIngs++;
      const { name, qty, unit } = parseIngredient(ing);
      const key = normaliseKey(name);
      if (itemMap[key]) {
        if (unit === itemMap[key].unit) itemMap[key].qty += qty;
        else if (qty > 0 && !itemMap[key].qty) { itemMap[key].qty = qty; itemMap[key].unit = unit; }
      } else {
        itemMap[key] = { baseName: name.charAt(0).toUpperCase() + name.slice(1), qty, unit, cat: categorise(ing) };
      }
    }

    generatedPlan.forEach((day, dayIdx) => {
      // ── Anatomy path: typed structure with per-component ingredients ──────
      if (day.anatomy) {
        const a = day.anatomy;
        const anatComps: AnatomyComponent[] = [];
        if (slotsToUse.includes('breakfast') && a.breakfast) anatComps.push(a.breakfast);
        if (slotsToUse.includes('lunch') && a.lunch) {
          anatComps.push(a.lunch.curry, a.lunch.veg, a.lunch.raita, a.lunch.bread, a.lunch.rice);
        }
        if (slotsToUse.includes('dinner') && a.dinner) {
          anatComps.push(a.dinner.curry, a.dinner.veg, a.dinner.raita, a.dinner.bread, a.dinner.rice);
        }
        if (slotsToUse.includes('snack') && a.snack) anatComps.push(a.snack);
        anatComps.forEach(comp => comp.ingredients.forEach(addIng));
        return;
      }
      // ── Legacy slot path: ingredients on MealOption ───────────────────────
      slotsToUse.forEach((slot) => {
        const opt = getOpt(dayIdx, slot) ?? day[slot]?.options?.[0] ?? null;
        opt?.ingredients?.forEach((ing: string) => addIng(ing));
        if (!opt?.ingredients?.length && opt?.description?.includes(' | ') && opt?.description?.includes(':')) {
          opt.description.split(' | ').forEach((comp: string) => {
            const dishName = comp.includes(':') ? comp.split(':').slice(1).join(':').trim() : comp.trim();
            if (!dishName) return;
            const key = normaliseKey(dishName);
            if (!itemMap[key]) {
              itemMap[key] = { baseName: dishName.charAt(0).toUpperCase() + dishName.slice(1), qty: 0, unit: '', cat: 'Pantry' };
            }
          });
        }
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

  // ── Save confirmed plan to Supabase (fire-and-forget, never blocks UI) ────

  async function savePlanToSupabase(confirmedPlan: any[]) {
    try {
      const user = await getSessionUser();
      if (!user || !selectedFrom || !selectedTo) return;
      const dateRange = `${selectedFrom.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${selectedTo.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
      const { data, error } = await supabase.from('meal_plans').insert({
        user_id: user.id,
        period_start: toYMD(selectedFrom),
        period_end: toYMD(selectedTo),
        date_range: dateRange,
        cuisine: 'Various',
        food_pref: foodPref ?? 'veg',
        plan_json: { days: confirmedPlan },
      }).select('id').single();
      if (error) { console.error('[MealWizard] savePlanToSupabase error:', error.message); return; }
      // Generate prep tasks linked to this plan
      if (data?.id) await generateMealPrepTasks(confirmedPlan, user.id, data.id);
    } catch (e) { console.error('[MealWizard] savePlanToSupabase catch:', e); }
  }

  // ── Detect dishes needing advance prep and create tasks ────────────────────

  const SOAK_KW = ['chole','chana masala','rajma','kadala curry','sabudana','sago','urad dal','chana dal','whole masoor'];
  const MARINATE_KW = ['chicken','murg','murgh','mutton','lamb','gosht','fish','machli','pomfret','surmai','rawas'];
  const GRIND_KW = ['coconut chutney','fresh chutney','ginger garlic paste'];

  async function generateMealPrepTasks(confirmedPlan: any[], userId: string, planId: string) {
    try {
      const tasks: any[] = [];
      const today = new Date();

      confirmedPlan.forEach((day: any) => {
        const dayName = day.dayName || day.day || '';
        const dayDate = day.date || '';

        (['breakfast','lunch','dinner','snack'] as const).forEach(meal => {
          const dish = day[meal];
          if (!dish) return;
          const dishName = typeof dish === 'string' ? dish : (dish.name ?? '');
          if (!dishName || dishName === '\u2014') return;
          const lower = dishName.toLowerCase();

          let prepType = '';
          let instruction = '';

          if (SOAK_KW.some(kw => lower.includes(kw))) {
            prepType = 'Soak';
            instruction = `Soak ${dishName} overnight (8-10 hours) in water.`;
          } else if (MARINATE_KW.some(kw => lower.includes(kw))) {
            prepType = 'Marinate';
            instruction = `Marinate ${dishName} with spices for at least 2 hours, ideally overnight.`;
          } else if (GRIND_KW.some(kw => lower.includes(kw))) {
            prepType = 'Grind';
            instruction = `Grind fresh paste/chutney for ${dishName} before cooking.`;
          }

          if (!prepType) return;

          // Determine timing & urgency
          let timing = dayName;
          let urgency = 'upcoming';
          if (dayDate) {
            const dDate = new Date(dayDate);
            const diffMs = dDate.getTime() - today.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) { timing = 'tonight'; urgency = 'tonight'; }
            else if (diffDays === 1) { timing = 'tomorrow'; urgency = 'today'; }
          }

          tasks.push({
            user_id: userId,
            plan_id: planId,
            dish: dishName,
            day: dayName,
            meal,
            prep_type: prepType,
            instruction,
            timing,
            urgency,
            done: false,
          });
        });
      });

      if (tasks.length === 0) return;

      // Save to Supabase
      const { error } = await supabase.from('meal_prep_tasks').insert(tasks);
      if (error) console.error('[MealWizard] generateMealPrepTasks error:', error.message);

      // Also save to AsyncStorage for offline access
      const asTasks = tasks.map((t, i) => ({ ...t, id: `${planId}-${i}` }));
      await AsyncStorage.setItem('meal_prep_tasks', JSON.stringify(asTasks));
    } catch (e) { console.error('[MealWizard] generateMealPrepTasks catch:', e); }
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
    track('cook_export_sent', { channel: 'whatsapp' });
    void Linking.openURL(url);
  }

  async function copyGrocery() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(buildGroceryText());
    }
  }

  async function downloadGrocery() {
    const grocery = buildGrocery();
    const categories = CAT_ORDER
      .filter(cat => (grocery[cat]?.length ?? 0) > 0)
      .map(cat => ({
        name: cat,
        items: (grocery[cat] ?? []).map(it => ({
          quantity: it.qty ? String(Math.round(it.qty * 10) / 10) : '',
          unit: it.unit || '',
          name: it.name,
        })),
      }));
    await downloadPDF('Shopping List', { categories }, 'maharaj-shopping-list-DDMMYYYY.pdf');
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
    if (step === 'plan-summary') {
      Alert.alert(
        'Go back?',
        'Going back will lose your generated plan. Are you sure?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Go back', style: 'destructive', onPress: () => setStep('observations') },
        ]
      );
      return;
    }
    const backMap: Partial<Record<WizardStep, WizardStep>> = {
      'generating': 'wizard',
      'observations': 'generating',
      'what-next': 'plan-summary',
      'grocery': 'what-next',
      'online-shopping': 'grocery',
    };
    const prev = backMap[step];
    if (prev) setStep(prev);
    else router.back();
  }

  // ── PDF download helper (web-only) ────────────────────────────────────────

  async function downloadPDF(type: string, content: object, filename: string) {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const familyName = (await AsyncStorage.getItem('family_name')) || 'Your Family';
      const pdfLang = (await AsyncStorage.getItem('plan_summary_language')) || 'en';
      const dateRange = generatedPlan && generatedPlan.length > 0
        ? `${generatedPlan[0].date} to ${generatedPlan[generatedPlan.length - 1].date}`
        : today.toLocaleDateString();
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, familyName, dateRange, content, language: pdfLang }),
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('DDMMYYYY', `${dd}${mm}${yyyy}`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      Alert.alert('Download failed', 'Please try again.');
    }
  }

  // ── Confirm plan helper ───────────────────────────────────────────────────

  function handleConfirmPlan() {
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
          void savePlanToSupabase(confirmedPlan);
          track('plan_generated', { days: generatedPlan.length });
          void scheduleSundayReminder();
        } catch {}
      }
    })();
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setStep('what-next');
    }, 2500);
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
      const dayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
      const todayDow = today.getDay();
      const targetDates = selectedDays.map(d => {
        const targetDow = dayMap[d] ?? 0;
        let diff = targetDow - todayDow;
        if (diff <= 0) diff += 7;
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

        {/* Element 3b: Family Recipes toggle */}
        {familyRecipes.length > 0 && (
          <View style={[cards.frostedGreen, {marginBottom:16,borderLeftWidth:3,borderLeftColor:colors.gold,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,paddingHorizontal:14}]}>
            <View style={{flex:1,marginRight:12}}>
              <Text style={{fontSize:13,fontWeight:'700',color:colors.navy}}>Use My Family Recipes</Text>
              <Text style={{fontSize:11,color:colors.textMuted,marginTop:2}}>{familyRecipes.length} recipe{familyRecipes.length !== 1 ? 's' : ''} saved — Maharaj will include them in the plan</Text>
            </View>
            <Switch
              value={useMyRecipes}
              onValueChange={setUseMyRecipes}
              trackColor={{ false: '#D1D5DB', true: colors.emerald }}
              thumbColor={useMyRecipes ? colors.gold : '#F3F4F6'}
            />
          </View>
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
    const dates = selectedDays.map(d => {
      const targetDow = ({ Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 } as Record<string,number>)[d] ?? 0;
      const todayDow2 = new Date().getDay();
      let diff = targetDow - todayDow2;
      if (diff <= 0) diff += 7;
      return toYMD(addDays(new Date(), diff));
    }).sort();
    const totalDays = dates.length || selectedDays.length;

    const statusText = generatingDay === 'Finalising'
      ? 'Finalising your plan...'
      : generatingDay === 'Ready'
      ? 'Plan ready.'
      : generatingDay
      ? `Planning ${generatingDay}...`
      : 'Maharaj is planning...';

    return (
      <View style={{flex:1,width:'100%'}}>
        {/* Centred generation content */}
        <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:24}}>
          {/* Maharaj logo with pulse */}
          <Animated.View style={{transform:[{scale:pulseAnim}],marginBottom:20}}>
            <Image source={require('../assets/icon.png')} style={{width:200,height:200,borderRadius:100}} resizeMode="contain" />
          </Animated.View>

          <Text style={{fontSize:18,fontWeight:'700',color:colors.navy,marginBottom:8,textAlign:'center'}}>Maharaj is planning...</Text>
          <Text style={{fontSize:14,color:colors.emerald,marginBottom:20,textAlign:'center'}}>
            {statusText}
          </Text>

          {/* Day progress dots */}
          <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
            {selectedDays.map((dayName, i) => {
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

          {/* Bottom row: Back + Pause/Resume */}
          <View style={{flexDirection:'row',gap:12,marginTop:16,alignItems:'center'}}>
            <TouchableOpacity onPress={() => setStep('wizard')} style={{borderWidth:1.5,borderColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
              <Text style={{fontSize:15,fontWeight:'700',color:'#2E5480'}}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{backgroundColor:colors.gold,borderRadius:10,paddingVertical:12,paddingHorizontal:28}} onPress={() => setGenPaused(p => !p)}>
              <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>{genPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    if (!generatedPlan) return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: colors.navy, textAlign: 'center' }}>
          No plan found. Please generate a new plan.
        </Text>
        <TouchableOpacity
          onPress={() => setStep('wizard')}
          style={{ marginTop: 16, backgroundColor: colors.emerald, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 24 }}>
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>Plan My Week</Text>
        </TouchableOpacity>
      </View>
    );

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

    const { width: FULL_WIDTH } = Dimensions.get('window');
    const CARD_HEIGHT = Dimensions.get('window').height * 0.62;

    // Build downloadable plan content for PDF
    const planPDFContent = {
      days: generatedPlan.map((day, idx) => ({
        dayName: day.day,
        date: day.date,
        meals: [
          { label: 'Breakfast', dish: day.anatomy?.breakfast?.dishName || day.breakfast?.options?.[selections[idx]?.breakfast ?? 0]?.name || '' },
          { label: 'Lunch Curry', dish: day.anatomy?.lunch?.curry?.dishName || '' },
          { label: 'Lunch Veg', dish: day.anatomy?.lunch?.veg?.dishName || '' },
          { label: 'Lunch Raita', dish: day.anatomy?.lunch?.raita?.dishName || '' },
          { label: 'Lunch Bread', dish: day.anatomy?.lunch?.bread?.dishName || '' },
          { label: 'Lunch Rice', dish: day.anatomy?.lunch?.rice?.dishName || '' },
          { label: 'Dinner Curry', dish: day.anatomy?.dinner?.curry?.dishName || '' },
          { label: 'Dinner Veg', dish: day.anatomy?.dinner?.veg?.dishName || '' },
          { label: 'Dinner Raita', dish: day.anatomy?.dinner?.raita?.dishName || '' },
          { label: 'Dinner Bread', dish: day.anatomy?.dinner?.bread?.dishName || '' },
          { label: 'Dinner Rice', dish: day.anatomy?.dinner?.rice?.dishName || '' },
          { label: 'Snack', dish: day.anatomy?.snack?.dishName || '' },
        ],
      })),
    };

    return (
      <View style={{marginHorizontal:-20}}>
        {/* Hint */}
        <Text style={{fontSize:9,color:colors.teal,textAlign:'center',marginBottom:6}}>
          Swipe to see each day. Tap dish to view recipe. Tap pencil to change.
        </Text>

        {/* Day tab strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{paddingHorizontal:16,paddingVertical:8}}
          contentContainerStyle={{gap:6}}>
          {generatedPlan.map((day, index) => (
            <TouchableOpacity key={day.date}
              onPress={() => {
                setActiveDay(index);
                planScrollRef.current?.scrollTo({ x: index * FULL_WIDTH, animated: true });
              }}
              style={{paddingHorizontal:14,paddingVertical:6,borderRadius:20,
                backgroundColor: activeDay === index ? colors.navy : 'transparent',
                borderWidth:1.5,borderColor:colors.navy}}>
              <Text style={{fontSize:12,fontWeight:'600',color: activeDay === index ? colors.white : colors.navy}}>
                {day.day.substring(0,3)} {new Date(day.date).getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Horizontal day cards */}
        <ScrollView ref={planScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          style={{height: CARD_HEIGHT}}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / FULL_WIDTH);
            setActiveDay(index);
          }}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / FULL_WIDTH);
            if (index !== activeDay) setActiveDay(index);
          }}
          scrollEventThrottle={16}>
          {generatedPlan.map((day, dayIdx) => {
            const dt = new Date(day.date);
            // FIX 7: Parse string components to avoid UTC timezone off-by-one bug
            const [, festMonth, festDayNum] = day.date.split('-').map(Number);
            const festivalMatch = FESTIVALS_2026.find(f => f.month === festMonth && f.day === festDayNum);
            const isSunday = dt.getDay() === 0;
            const lunchCurry = day.anatomy?.lunch?.curry;
            const lunchCurryDishName = Array.isArray(lunchCurry) ? lunchCurry[0]?.dishName : lunchCurry?.dishName;
            const hasAnatomy = !!(lunchCurryDishName || day.anatomy?.breakfast?.dishName);
            const hasLegacy = !!(day.breakfast?.options?.[0]?.name || day.lunch?.options?.[0]?.name || day.dinner?.options?.[0]?.name);

            return (
              <View key={day.date} style={{width: FULL_WIDTH, paddingHorizontal:16, flex:1}}>
                <ScrollView showsVerticalScrollIndicator={false} style={{flex:1}} contentContainerStyle={{paddingBottom:24}}>
                  {/* Date header */}
                  <Text style={{fontSize:18,fontWeight:'700',color:colors.navy,marginBottom:4,marginTop:8}}>
                    {day.day}, {dt.getDate()} {MONTHS_L[dt.getMonth()]}
                  </Text>
                  {/* Badges */}
                  {(isSunday || festivalMatch) && (
                    <View style={{flexDirection:'row',gap:6,marginBottom:10}}>
                      {isSunday && <View style={{backgroundColor:colors.gold,borderRadius:8,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'700',color:'#1A1A1A'}}>Sunday</Text></View>}
                      {festivalMatch && <View style={{backgroundColor:'#FEF3C7',borderRadius:8,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'700',color:'#92400E'}}>{festivalMatch.name}</Text></View>}
                    </View>
                  )}

              {/* Meal slots */}
              {!hasAnatomy && !hasLegacy ? (
                <View style={{padding:16,alignItems:'center'}}>
                  <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center'}}>Maharaj is still planning this day. Please regenerate.</Text>
                </View>
              ) : slotsToShow.map(({ key, label }) => {
                const slotLabel = <Text style={{fontSize:10,fontWeight:'700',color:colors.textMuted,letterSpacing:0.5,textTransform:'uppercase',marginBottom:4}}>{label}</Text>;
                const rowStyle = {flexDirection:'row' as const,alignItems:'center' as const,paddingVertical:6,paddingHorizontal:8,backgroundColor:'rgba(255,255,255,0.6)',borderRadius:8,marginBottom:2};

                // ── Anatomy path ────────────────────────────────────────────
                if (hasAnatomy) {
                  const nightCarry = key === 'lunch' && dayIdx > 0 && cookingPattern === 'Cook at night — dinner carries to next day lunch';
                  const prevDayName = nightCarry ? generatedPlan[dayIdx - 1].day : '';
                  const prevDinnerAnat = nightCarry ? generatedPlan[dayIdx - 1].anatomy?.dinner : undefined;

                  if ((key === 'lunch' || key === 'dinner') && day.anatomy[key]) {
                    const ms = day.anatomy[key] as MealAnatomy;
                    const curryArr: AnatomyComponent[] = ms.curry
                      ? (Array.isArray(ms.curry) ? ms.curry : [ms.curry]).filter(c => !!c && !!c.dishName)
                      : [];
                    const curryRows: { compLabel: string; comp: AnatomyComponent }[] = curryArr.map((c, ci) => {
                      const dn = (c.dishName || '').toLowerCase();
                      const typeLabel = dn.includes('fry') || dn.includes('fried') ? 'Fry'
                        : dn.includes('tawa') ? 'Tawa'
                        : dn.includes('roast') ? 'Roast'
                        : dn.includes('grill') ? 'Grilled'
                        : dn.includes('sukhem') || dn.includes('sukha') ? 'Dry'
                        : dn.includes('tikka') ? 'Tikka'
                        : curryArr.length > 1 ? `Curry ${ci + 1}` : 'Curry';
                      return { compLabel: typeLabel, comp: c };
                    });
                    const ROWS: { compLabel: string; comp: AnatomyComponent }[] = [
                      ...curryRows,
                      { compLabel: 'Veg',   comp: ms.veg   },
                      { compLabel: 'Raita', comp: ms.raita },
                      { compLabel: 'Bread', comp: ms.bread },
                      { compLabel: 'Rice',  comp: ms.rice  },
                    ];
                    return (
                      <View key={key} style={{marginBottom:8}}>
                        {slotLabel}
                        {ROWS.map(({ compLabel, comp }) => {
                          const isCarry = compLabel === 'Curry' && nightCarry && !!prevDinnerAnat;
                          const prevCurry = prevDinnerAnat?.curry;
                          const prevCurryDish = Array.isArray(prevCurry) ? prevCurry[0]?.dishName : prevCurry?.dishName;
                          const dishName = isCarry ? (prevCurryDish ?? comp.dishName) : comp.dishName;
                          return (
                            <View key={compLabel} style={rowStyle}>
                              <TouchableOpacity style={{flex:1}} onPress={() => setRecipeModal({ visible: true, dishName })} activeOpacity={0.7}>
                                <Text style={{fontSize:9,color:colors.textMuted,fontWeight:'600'}}>{compLabel}</Text>
                                <Text style={{fontSize:13,fontWeight:'600',color:isCarry ? colors.emerald : colors.navy,fontStyle:isCarry ? 'italic' : 'normal'}}>{dishName}</Text>
                                {isCarry && <Text style={{fontSize:10,color:colors.emerald}}>from {prevDayName} dinner</Text>}
                              </TouchableOpacity>
                              <TouchableOpacity style={{paddingLeft:8,paddingVertical:4}} disabled={isCarry}
                                onPress={() => { setAlternativeSlot({ dayIdx, slot: key, component: compLabel, dishName, anatomyAlts: comp.alternatives }); setAltModalVisible(true); }}>
                                <Text style={{fontSize:14,color:colors.navy,opacity:isCarry ? 0 : 1}}>{'\u270E'}</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    );
                  }

                  if ((key === 'breakfast' || key === 'snack') && day.anatomy[key]) {
                    const comp = day.anatomy[key] as AnatomyComponent;
                    return (
                      <View key={key} style={{marginBottom:8}}>
                        {slotLabel}
                        <View style={rowStyle}>
                          <TouchableOpacity style={{flex:1}} onPress={() => setRecipeModal({ visible: true, dishName: comp.dishName })} activeOpacity={0.7}>
                            <Text style={{fontSize:13,fontWeight:'600',color:colors.navy}}>{comp.dishName}</Text>
                            {key === 'snack' && <Text style={{fontSize:10,color:colors.textMuted}}>Fresh · 15 min</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={{paddingLeft:8,paddingVertical:4}}
                            onPress={() => { setAlternativeSlot({ dayIdx, slot: key, component: label, dishName: comp.dishName, anatomyAlts: comp.alternatives }); setAltModalVisible(true); }}>
                            <Text style={{fontSize:14,color:colors.navy}}>{'\u270E'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                }

                // ── Legacy path (slow generator / old plans) ────────────────
                const opt = getOpt(dayIdx, key);
                if (!opt) return null;

                const isCarryForward = key === 'lunch' && dayIdx > 0 && cookingPattern === 'Cook at night — dinner carries to next day lunch';
                const prevDinnerOpt = isCarryForward ? getOpt(dayIdx - 1, 'dinner') : null;
                const prevDayName = isCarryForward && generatedPlan[dayIdx - 1] ? generatedPlan[dayIdx - 1].day : '';

                const displayOpt = isCarryForward && prevDinnerOpt ? prevDinnerOpt : opt;
                const isThali = displayOpt.name.toLowerCase().includes('thali');
                const hasAnatomyDesc = displayOpt.description?.includes(' | ') && displayOpt.description?.includes(':');
                const shouldShowComponents = (isThali || hasAnatomyDesc) && displayOpt.description?.includes(' | ');
                const components = shouldShowComponents
                  ? displayOpt.description!.split(' | ').map(c => c.trim())
                  : [displayOpt.name];

                return (
                  <View key={key} style={{marginBottom:8}}>
                    {slotLabel}
                    {components.map((comp, ci) => {
                      const parts = comp.split(':');
                      const compLabel = parts.length > 1 ? parts[0].trim() : label;
                      const dishName = parts.length > 1 ? parts.slice(1).join(':').trim() : comp;
                      return (
                        <View key={ci} style={rowStyle}>
                          <TouchableOpacity style={{flex:1}} onPress={() => setRecipeModal({ visible: true, dishName })} activeOpacity={0.7}>
                            {(isThali || hasAnatomyDesc) && parts.length > 1 && <Text style={{fontSize:9,color:colors.textMuted,fontWeight:'600'}}>{compLabel}</Text>}
                            <Text style={{fontSize:13,fontWeight:'600',color:isCarryForward ? colors.emerald : colors.navy,fontStyle:isCarryForward ? 'italic' : 'normal'}}>{dishName}</Text>
                            {isCarryForward && <Text style={{fontSize:10,color:colors.emerald}}>from {prevDayName} dinner</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={{paddingLeft:8,paddingVertical:4}} disabled={isCarryForward}
                            onPress={() => { setAlternativeSlot({ dayIdx, slot: key, component: compLabel, dishName }); setAltModalVisible(true); }}>
                            <Text style={{fontSize:14,color:colors.navy,opacity:isCarryForward ? 0 : 1}}>{'\u270E'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {/* Fasting gold strip */}
              {(() => {
                const dayName = day.day;
                const fastingMatches = fastingInfo.filter(f => f.dayMatch(dayName));
                if (fastingMatches.length === 0) return null;
                return (
                  <View style={{backgroundColor:'rgba(201,162,39,0.1)',borderTopWidth:1,borderTopColor:'rgba(201,162,39,0.25)',paddingVertical:6,paddingHorizontal:9,marginTop:4,borderRadius:0}}>
                    {fastingMatches.map((f, fi) => (
                      <View key={fi}>
                        <Text style={{fontSize:11,fontWeight:'700',color:colors.gold}}>{f.memberName} — {f.fastingType}</Text>
                        <Text style={{fontSize:9,color:'#8B6914'}}>Separate fasting meal · ingredients added to shopping list</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              {/* Per-day confirm */}
              {confirmedDays.includes(day.date) ? (
                <View style={{alignItems:'center',paddingVertical:12}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.teal}}>✓ {day.day} confirmed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={{backgroundColor:colors.emerald,borderRadius:12,paddingVertical:12,alignItems:'center',marginTop:12,marginBottom:4}}
                  onPress={() => setConfirmedDays(prev => [...prev, day.date])}>
                  <Text style={{fontSize:14,fontWeight:'700',color:colors.white}}>Confirm {day.day}</Text>
                </TouchableOpacity>
              )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom action row */}
        {confirmedDays.length === generatedPlan.length ? (
          <View style={{paddingHorizontal:16,paddingTop:8,paddingBottom:8,flexDirection:'row',gap:8}}>
            <TouchableOpacity
              style={{flex:1,borderWidth:1.5,borderColor:colors.navy,borderRadius:20,paddingVertical:10,alignItems:'center'}}
              onPress={() => void downloadPDF('Meal Plan', planPDFContent, 'maharaj-meal-plan-DDMMYYYY.pdf')}>
              <Text style={{fontSize:13,fontWeight:'500',color:colors.navy}}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{flex:2,backgroundColor:colors.emerald,borderRadius:20,paddingVertical:10,alignItems:'center'}}
              onPress={handleConfirmPlan}>
              <Text style={{fontSize:15,fontWeight:'700',color:colors.white}}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{paddingHorizontal:16,paddingTop:8,paddingBottom:8}}>
            <TouchableOpacity
              style={{borderWidth:1.5,borderColor:colors.navy,borderRadius:20,paddingVertical:10,alignItems:'center'}}
              onPress={() => void downloadPDF('Meal Plan', planPDFContent, 'maharaj-meal-plan-DDMMYYYY.pdf')}>
              <Text style={{fontSize:13,fontWeight:'500',color:colors.navy}}>Download Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Celebration modal */}
        <Modal visible={showCelebration} transparent animationType="fade">
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.45)',alignItems:'center',justifyContent:'center'}}>
            <View style={{backgroundColor:colors.white,borderRadius:20,padding:32,alignItems:'center',marginHorizontal:32}}>
              <Text style={{fontSize:64,marginBottom:16}}>🎉</Text>
              <Text style={{fontSize:20,fontWeight:'700',color:colors.navy,textAlign:'center',marginBottom:8}}>Your weekly plan is confirmed!</Text>
              <Text style={{fontSize:13,color:colors.teal,textAlign:'center'}}>Maharaj has planned your week. Time to cook!</Text>
            </View>
          </View>
        </Modal>

        {/* Recipe modal */}
        <Modal visible={recipeModal.visible} transparent animationType="slide" onRequestClose={() => setRecipeModal({ visible: false, dishName: '' })}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'flex-end'}}>
            <View style={{backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:Dimensions.get('window').height * 0.85}}>
              <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#D1D5DB',marginBottom:12,alignSelf:'center'}} />
              {recipeLoading ? (
                <View style={{alignItems:'center',paddingVertical:32}}>
                  <Image source={require('../assets/logo.png')} style={{width:56,height:56,marginBottom:12}} resizeMode="contain" />
                  <Text style={{fontSize:13,fontWeight:'600',color:colors.navy,textAlign:'center',marginBottom:4}}>Maharaj is writing the recipe...</Text>
                  <ActivityIndicator size="small" color={colors.emerald} style={{marginTop:8}} />
                </View>
              ) : recipeData ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{fontSize:18,fontWeight:'800',color:colors.navy,textAlign:'center',marginBottom:2}}>{recipeData.title}</Text>
                  <Text style={{fontSize:11,color:colors.textMuted,textAlign:'center',marginBottom:16}}>Serves {recipeData.serves}</Text>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.navy,marginBottom:8}}>Ingredients</Text>
                  {recipeData.ingredients.map((ing, i) => (
                    <Text key={i} style={{fontSize:12,color:colors.textSecondary,marginBottom:3}}>• {ing}</Text>
                  ))}
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.navy,marginTop:16,marginBottom:8}}>Method</Text>
                  {recipeData.method.map((step, i) => (
                    <Text key={i} style={{fontSize:12,color:colors.textSecondary,marginBottom:6,lineHeight:18}}>{step}</Text>
                  ))}
                  {recipeData.maharajNote ? (
                    <View style={{backgroundColor:'rgba(30,158,94,0.08)',borderRadius:12,padding:12,marginTop:16,marginBottom:8}}>
                      <Text style={{fontSize:11,fontWeight:'700',color:colors.emerald,marginBottom:4}}>Maharaj's tip</Text>
                      <Text style={{fontSize:11,color:colors.textSecondary,lineHeight:16}}>{recipeData.maharajNote}</Text>
                    </View>
                  ) : null}
                  {Platform.OS === 'web' && (
                    <TouchableOpacity style={{backgroundColor:colors.navy,borderRadius:12,paddingVertical:12,alignItems:'center',marginTop:8,marginBottom:4}} onPress={() => {
                      if (!recipeData) return;
                      const slug = recipeData.title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
                      void downloadPDF('Recipe', {
                        recipeName: recipeData.title,
                        ingredients: recipeData.ingredients,
                        method: recipeData.method,
                        maharajNote: recipeData.maharajNote,
                      }, `maharaj-recipe-${slug}-DDMMYYYY.pdf`);
                    }}>
                      <Text style={{fontSize:13,fontWeight:'700',color:colors.white}}>Download Recipe</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              ) : (
                <View style={{alignItems:'center',paddingVertical:24}}>
                  <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center'}}>Could not load recipe. Please try again.</Text>
                </View>
              )}
              <TouchableOpacity style={{paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'#D1D5DB',alignItems:'center',marginTop:12}} onPress={() => setRecipeModal({ visible: false, dishName: '' })}>
                <Text style={{fontSize:14,fontWeight:'600',color:colors.navy}}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  function renderAlternatives() {
    if (!generatedPlan || !alternativeSlot) return null;

    const { dayIdx, slot, component, dishName: altDishName, anatomyAlts } = alternativeSlot;
    const day = generatedPlan[dayIdx];
    const currentOpt = getOpt(dayIdx, slot);
    const currentName = altDishName || currentOpt?.name || 'Current dish';

    // Anatomy pre-generated alternatives take priority; fall back to legacy slot options
    const hasAnatomyAlts = anatomyAlts && anatomyAlts.length > 0;
    const slotData = day[slot];
    const legacyAlts = slotData?.options?.filter((_, i) => i !== (selections[dayIdx]?.[slot] ?? 0)).slice(0, 3) ?? [];

    return (
      <View style={{backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:Dimensions.get('window').height * 0.7}}>
          {/* Context */}
          <Text style={{fontSize:12,color:colors.textMuted,textAlign:'center',marginBottom:4}}>{day.day} {'\u00B7'} {slot.charAt(0).toUpperCase() + slot.slice(1)} {'\u00B7'} {component}</Text>

          {/* Current dish struck through */}
          <Text style={{fontSize:15,color:colors.textMuted,textAlign:'center',textDecorationLine:'line-through',marginBottom:16}}>{currentName}</Text>

          {/* Alternative cards */}
          <ScrollView style={{maxHeight:300}}>
            {hasAnatomyAlts ? anatomyAlts!.map((alt, i) => (
              <View key={i} style={[cards.base, {marginBottom:10}]}>
                <Text style={{fontSize:15,fontWeight:'700',color:colors.navy,marginBottom:4}}>{alt.dishName}</Text>
                {alt.cuisine && <Text style={{fontSize:11,color:colors.textMuted,marginBottom:8}}>{alt.cuisine}</Text>}
                <TouchableOpacity style={{backgroundColor:colors.emerald,borderRadius:10,paddingVertical:10,alignItems:'center'}} onPress={() => {
                  // Update anatomy component in place
                  if (day.anatomy) {
                    const slotAnat = day.anatomy[slot];
                    if (slotAnat && typeof slotAnat === 'object' && 'dishName' in slotAnat) {
                      (slotAnat as AnatomyComponent).dishName = alt.dishName;
                    } else if (slotAnat && typeof slotAnat === 'object') {
                      const compKey = component.toLowerCase() as keyof MealAnatomy;
                      if ((slotAnat as MealAnatomy)[compKey]) (slotAnat as MealAnatomy)[compKey].dishName = alt.dishName;
                    }
                    setGeneratedPlan([...generatedPlan]);
                  }
                  setAlternativeSlot(null);
                  setAltModalVisible(false);
                }}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.white}}>Pick this</Text>
                </TouchableOpacity>
              </View>
            )) : legacyAlts.length > 0 ? legacyAlts.map((alt, i) => (
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
                  setAltModalVisible(false);
                }}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.white}}>Pick this</Text>
                </TouchableOpacity>
              </View>
            )) : fetchingAlts ? (
              <View style={{alignItems:'center',paddingVertical:20}}>
                <ActivityIndicator size="small" color={colors.emerald} />
                <Text style={{fontSize:12,color:colors.textMuted,marginTop:8}}>Maharaj is finding alternatives...</Text>
              </View>
            ) : fetchedAlts.length > 0 ? fetchedAlts.map((alt, i) => (
              <View key={i} style={[cards.base, {marginBottom:10}]}>
                <Text style={{fontSize:15,fontWeight:'700',color:colors.navy,marginBottom:4}}>{alt.dishName}</Text>
                <TouchableOpacity style={{backgroundColor:colors.emerald,borderRadius:10,paddingVertical:10,alignItems:'center'}} onPress={() => {
                  if (generatedPlan && alternativeSlot) {
                    const d = generatedPlan[alternativeSlot.dayIdx];
                    if (d?.anatomy) {
                      const slotAnat = d.anatomy[alternativeSlot.slot as MealSlotKey];
                      if (slotAnat && typeof slotAnat === 'object' && 'dishName' in slotAnat) {
                        (slotAnat as AnatomyComponent).dishName = alt.dishName;
                      } else if (slotAnat && typeof slotAnat === 'object') {
                        const compKey = alternativeSlot.component.toLowerCase() as keyof MealAnatomy;
                        if ((slotAnat as MealAnatomy)[compKey]) (slotAnat as MealAnatomy)[compKey].dishName = alt.dishName;
                      }
                      setGeneratedPlan([...generatedPlan]);
                    }
                  }
                  setFetchedAlts([]);
                  setAlternativeSlot(null);
                  setAltModalVisible(false);
                }}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.white}}>Pick this</Text>
                </TouchableOpacity>
              </View>
            )) : (
              <View style={{alignItems:'center',paddingVertical:20}}>
                <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center'}}>Could not find alternatives. Please try again.</Text>
              </View>
            )}
          </ScrollView>

          {/* Keep current button */}
          <TouchableOpacity style={{paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:'#D1D5DB',alignItems:'center',marginTop:8}} onPress={() => {
            setAlternativeSlot(null);
            setAltModalVisible(false);
          }}>
            <Text style={{fontSize:14,fontWeight:'600',color:colors.navy}}>Keep {currentName}</Text>
          </TouchableOpacity>
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

        {/* Card 3: Share My Maharaj */}
        <View style={[cards.frostedGreen, {padding:20,marginBottom:14,borderLeftWidth:3,borderLeftColor:colors.gold}]}>
          <Text style={{fontSize:7,fontWeight:'700',color:colors.gold,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>Share My Maharaj</Text>
          <Text style={{fontSize:10,fontWeight:'700',color:colors.navy,marginBottom:12,lineHeight:15}}>Know an Indian family in the GCC who struggles with meal planning?</Text>
          <TouchableOpacity
            style={{alignSelf:'flex-start',backgroundColor:colors.emerald,borderRadius:20,paddingVertical:4,paddingHorizontal:8}}
            activeOpacity={0.8}
            onPress={() => {
              Share.share({ message: "I have been using My Maharaj to plan my family's meals. It knows Indian food, our community, our fasting days, and even sends the recipe in Hindi to our cook. Try it free: https://my-maharaj.vercel.app" });
              track('referral_shared', { source: 'what_next' });
            }}
          >
            <Text style={{fontSize:9,fontWeight:'700',color:'#FFFFFF'}}>Share</Text>
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity style={{backgroundColor:colors.emerald,borderRadius:10,padding:12,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}} onPress={() => setScanModalOpen(true)} activeOpacity={0.85}>
          <Text style={{fontSize:12,color:colors.white,fontWeight:'500'}}>Scan to Shop</Text>
          <Text style={{fontSize:9,color:'rgba(255,255,255,0.8)'}}>Open camera</Text>
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
              <TouchableOpacity style={{backgroundColor:'white',borderWidth:1.5,borderColor:colors.navy,borderRadius:14,padding:16,marginBottom:12}} onPress={async () => { setScanModalOpen(false); const { status } = await Camera.requestCameraPermissionsAsync(); if (status === 'granted') setBarcodeScannerOpen(true); else Alert.alert('Camera permission required'); }}>
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
            <CameraView onBarcodeScanned={barcodeScannerOpen ? handleBarcodeScan : undefined} barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e','code128','code39','qr']}} style={{flex:1}} />
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

        {/* Done — return to what-next */}
        <TouchableOpacity style={{backgroundColor:colors.gold,borderRadius:8,paddingVertical:14,width:'100%',alignItems:'center',marginTop:16}} onPress={() => setStep('what-next')}>
          <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>Done</Text>
        </TouchableOpacity>

      </View>
    );
  }

  function renderOnlineShopping() {
    const STORES = [
      { name: 'Carrefour', sub: 'Supermarket · Dubai', url: 'https://www.carrefouruae.com' },
      { name: 'Noon Daily', sub: 'Delivery · 2-4 hours', url: 'https://www.noon.com/uae-en/grocery' },
      { name: 'Amazon Fresh', sub: 'Delivery · same day', url: 'https://www.amazon.ae/fresh' },
      { name: 'Talabat Groceries', sub: 'Delivery · 30-60 min', url: 'https://www.talabat.com/uae/groceries' },
    ];
    return (
      <View style={{flex:1}}>
        {/* Header */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:Platform.OS==='web'?16:10,paddingBottom:12,borderBottomWidth:1,borderBottomColor:'rgba(26,58,92,0.1)'}}>
          <TouchableOpacity onPress={() => setStep('what-next')} style={{borderWidth:1.5,borderColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'#2E5480'}}>Back</Text>
          </TouchableOpacity>
          <Text style={{flex:1,fontSize:16,fontWeight:'700',color:colors.navy,textAlign:'center'}}>Order Online</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={{backgroundColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12}}>
            <Text style={{fontSize:15,fontWeight:'700',color:'white'}}>Home</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{padding:16,paddingBottom:24}} showsVerticalScrollIndicator={false}>
          {/* Maharaj tip card */}
          <View style={{backgroundColor:'rgba(30,158,94,0.08)',borderWidth:1,borderColor:'rgba(30,158,94,0.2)',borderRadius:10,padding:10,marginBottom:12}}>
            <Text style={{fontSize:9,color:colors.navy,lineHeight:14}}>Choose your preferred store or delivery app. Your shopping list has been prepared — just pick where you want to order from.</Text>
          </View>

          {/* Store cards — stacked */}
          {STORES.map(store => (
            <View key={store.name} style={{backgroundColor:'rgba(255,255,255,0.85)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(255,255,255,0.6)',marginBottom:6,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <View style={{flex:1}}>
                <Text style={{fontSize:10,fontWeight:'700',color:colors.navy}}>{store.name}</Text>
                <Text style={{fontSize:8,color:colors.textMuted,marginTop:1}}>{store.sub}</Text>
              </View>
              <TouchableOpacity onPress={() => Linking.openURL(store.url)} style={{backgroundColor:colors.emerald,borderRadius:20,paddingVertical:4,paddingHorizontal:10}}>
                <Text style={{fontSize:9,fontWeight:'600',color:colors.white}}>Shop now</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* More stores banner */}
          <View style={{backgroundColor:colors.navy,borderRadius:10,padding:10,marginTop:8}}>
            <Text style={{fontSize:8,color:colors.white,textAlign:'center'}}>More stores coming soon — Lulu, Spinneys, Nesto</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step render map ───────────────────────────────────────────────────────

  const STEP_RENDER: Record<WizardStep, () => React.ReactNode> = {
    'wizard':          renderWizard,
    'generating':      renderGeneratingV3,
    'observations':    renderObservations,
    'plan-summary':    renderPlanSummaryV3,
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

      {!isFullScreen && step !== 'plan-summary' && <MarqueeTicker />}

      <ScrollView ref={scrollRef} contentContainerStyle={[s.scroll, isFullScreen && s.scrollCenter]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={(e) => { scrollYRef.current[step] = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
        <View style={[s.body, isFullScreen && s.bodyCenter]}>
          {STEP_RENDER[step]?.()}
        </View>
      </ScrollView>

      {/* Alternatives modal */}
      <Modal visible={altModalVisible} transparent animationType="slide" onRequestClose={() => setAltModalVisible(false)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}}>
          {renderAlternatives()}
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
}

// ─── Main styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(26,58,92,0.1)',
  },

  scroll:       { paddingBottom: 24 },
  scrollCenter: { flexGrow: 1 },
  body:         { paddingHorizontal: 20, paddingTop: 20, maxWidth: 700, width: '100%', alignSelf: 'center' },
  bodyCenter:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  stepTitle: { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  stepSub:   { fontSize: 14, color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },

  emptyBox:  { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
