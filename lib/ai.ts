import { supabase } from './supabase';
import { DISH_DATA } from '../scripts/seed-dishes';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MealOption {
  name: string;
  description?: string;
  isTrending?: boolean;
  vegetarian: boolean;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

export interface MealSlot {
  options: MealOption[];
}

export interface AnatomyComponent {
  dishName: string;
  isVeg?: boolean;
  cuisine?: string;
  ingredients: string[];
  alternatives?: { dishName: string; isVeg?: boolean; cuisine?: string }[];
}

export interface MealAnatomy {
  curry: AnatomyComponent | AnatomyComponent[];
  veg: AnatomyComponent;
  raita: AnatomyComponent;
  bread: AnatomyComponent;
  rice: AnatomyComponent;
}

export interface DayAnatomy {
  breakfast?: AnatomyComponent;
  lunch?: MealAnatomy;
  dinner?: MealAnatomy;
  snack?: AnatomyComponent;
  sweet?: AnatomyComponent;
}

export interface MealPlanDay {
  date: string;
  day: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
  snack?: MealSlot;
  anatomy?: DayAnatomy;
}

export type DishSlot = { dishName: string; cuisine: string; slot: string }

export type MealPlanDayV4 = {
  date: string;
  dayName: string;
  breakfast: DishSlot;
  lunch: { curry: DishSlot; sabzi: DishSlot; bread: DishSlot; raita: DishSlot; rice: DishSlot };
  dinner: { curry: DishSlot; sabzi: DishSlot; bread: DishSlot; raita: DishSlot; rice: DishSlot };
}

export interface GroceryItem {
  name: string;
  qty: string;
  category: string;
}

export interface MealPlanResult {
  days: MealPlanDay[];
  grocery_list?: GroceryItem[];
  fridgeNote?: string;
}

export interface HealthFlags {
  diabetic: boolean;
  bp: boolean;
  pcos: boolean;
  cholesterol: boolean;
  thyroid: boolean;
  kidneyDisease: boolean;
  heartDisease: boolean;
  obesity: boolean;
  anaemia: boolean;
  lactoseIntolerant: boolean;
  glutenIntolerant: boolean;
}

export const emptyHealthFlags = (): HealthFlags => ({
  diabetic: false, bp: false, pcos: false,
  cholesterol: false, thyroid: false, kidneyDisease: false,
  heartDisease: false, obesity: false, anaemia: false,
  lactoseIntolerant: false, glutenIntolerant: false,
});

// ─── Core API calls ──────────────────────────────────────────────────────────

const BASE = 'https://my-maharaj.vercel.app';

async function askClaude(prompt: string): Promise<string> {
  try {
    const text = await askClaudeStream(prompt);
    if (text) return text;
  } catch { /* fall through */ }

  const res = await fetch(`${BASE}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET } as Record<string, string>,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  const text = data?.content?.[0]?.text ?? '{}';
  return text.replace(/```json|```/g, '').trim();
}

async function askClaudeStream(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/api/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET } as Record<string, string>,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok || !res.body) throw new Error('Stream not available');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
  }
  const textParts: string[] = [];
  for (const line of full.split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const evt = JSON.parse(line.slice(6));
      if (evt.type === 'content_block_delta' && evt.delta?.text) textParts.push(evt.delta.text);
    } catch { /* skip */ }
  }
  const text = textParts.join('');
  if (!text) throw new Error('No text in stream');
  return text.replace(/```json|```/g, '').trim();
}

async function askClaudeJson(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(`${BASE}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET } as Record<string, string>,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  const text = data?.content?.[0]?.text ?? '{}';
  return text.replace(/```json|```/g, '').trim();
}

// ─── Fallback slots ───────────────────────────────────────────────────────────

const REAL_DISHES: Record<string, string[][]> = {
  breakfast: [
    ['Pohe', 'Kanda Pohe', 'Batata Pohe'],
    ['Upma', 'Rava Upma', 'Semolina Upma'],
    ['Idli Sambhar', 'Idli with Coconut Chutney', 'Mini Idli'],
    ['Methi Thepla', 'Gujarati Thepla', 'Methi Paratha'],
    ['Sabudana Khichdi', 'Sabudana Vada', 'Sago Khichdi'],
    ['Dosa', 'Masala Dosa', 'Rava Dosa'],
    ['Puri Bhaji', 'Batata Puri', 'Aloo Puri'],
  ],
  lunch: [
    ['Dal Khichdi', 'Moong Dal Khichdi', 'Masala Khichdi'],
    ['Rajma Chawal', 'Kidney Bean Curry with Rice', 'Rajma Rice'],
    ['Chole Bhature', 'Amritsari Chole', 'Punjabi Chole'],
    ['Palak Dal', 'Spinach Toor Dal', 'Dal Palak'],
    ['Jeera Rice with Dal Tadka', 'Tadka Dal Chawal', 'Dal Fry with Rice'],
    ['Bhindi Masala Roti', 'Okra Sabzi with Chapati', 'Bhindi Fry'],
    ['Pav Bhaji', 'Mumbai Pav Bhaji', 'Buttered Pav Bhaji'],
  ],
  dinner: [
    ['Chicken Curry with Rice', 'Konkani Chicken Curry', 'Kali Mirch Chicken'],
    ['Mutton Rogan Josh', 'Kashmiri Rogan Josh', 'Lamb Rogan Josh'],
    ['Paneer Butter Masala', 'Shahi Paneer', 'Paneer Tikka Masala'],
    ['Fish Curry', 'Goan Fish Curry', 'Malvani Fish Curry'],
    ['Dal Makhani', 'Slow Cooked Dal Makhani', 'Black Dal'],
    ['Egg Bhurji with Roti', 'Masala Omelette', 'Anda Bhurji'],
    ['Veg Biryani', 'Hyderabadi Veg Biryani', 'Kacchi Biryani'],
  ],
};

function fallbackSlot(mealType: string, idx: number): MealSlot {
  const key = mealType as keyof typeof REAL_DISHES;
  const arr = REAL_DISHES[key] ?? REAL_DISHES['lunch'];
  const pick = arr[idx % arr.length];
  return {
    options: [
      { name: pick[0], vegetarian: mealType !== 'dinner', tags: [], ingredients: [], steps: [] },
      { name: pick[1] ?? pick[0], vegetarian: mealType !== 'dinner', tags: [], ingredients: [], steps: [] },
      { name: pick[2] ?? pick[0], vegetarian: mealType !== 'dinner', tags: [], ingredients: [], steps: [] },
    ],
  };
}

// ─── Dish Pool (Option C) ─────────────────────────────────────────────────────

interface PoolDish {
  name: string;
  cuisine: string[];
  slot: string[];
  is_veg: boolean;
  is_jain: boolean;
  is_fasting: boolean;
  is_non_veg_type: string | null;
  health_tags: string[];
  allowed_days: string[];
}

// Regional cuisine fallback chain — when pool is thin, expand to nearby cuisines
const CUISINE_FALLBACK: Record<string, string[]> = {
  'Kashmiri':      ['Kashmiri','Punjabi','Awadhi','Mughlai','Delhi'],
  'Sindhi':        ['Sindhi','Punjabi','Awadhi','Mughlai','Delhi'],
  'Rajasthani':    ['Rajasthani','Gujarati','Marwari','Punjabi'],
  'Gujarati':      ['Gujarati','Rajasthani','Marwari'],
  'Marwari':       ['Marwari','Rajasthani','Gujarati'],
  'Punjabi':       ['Punjabi','Awadhi','Haryanvi','Delhi','Mughlai'],
  'Haryanvi':      ['Haryanvi','Punjabi','Awadhi','Delhi'],
  'Delhi':         ['Delhi','Punjabi','Awadhi','Mughlai'],
  'Awadhi':        ['Awadhi','Mughlai','Delhi','Punjabi'],
  'Mughlai':       ['Mughlai','Awadhi','Delhi','Punjabi'],
  'Bihari':        ['Bihari','Awadhi','Bhojpuri','Maithili'],
  'Maithili':      ['Maithili','Bihari','Awadhi'],
  'Bhojpuri':      ['Bhojpuri','Bihari','Awadhi'],
  'Bengali':       ['Bengali','Odia','Bihari'],
  'Odia':          ['Odia','Bengali','Chhattisgarhi'],
  'Chhattisgarhi': ['Chhattisgarhi','Odia','Bihari'],
  'Maharashtrian': ['Maharashtrian','Goan','Konkani','Malvani'],
  'Konkani':       ['Konkani','Goan','Maharashtrian','Malvani'],
  'Goan':          ['Goan','Konkani','Maharashtrian','Malvani'],
  'Malvani':       ['Malvani','Goan','Konkani','Maharashtrian'],
  'Coorgi':        ['Coorgi','Karnataka','South Indian'],
  'Karnataka':     ['Karnataka','South Indian','Coorgi'],
  'Tamil':         ['Tamil','South Indian','Kerala'],
  'Kerala':        ['Kerala','South Indian','Tamil'],
  'Andhra':        ['Andhra','Telugu','South Indian'],
};

function getCurrentSeason(): 'summer' | 'monsoon' | 'winter' {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'summer';
  if (m >= 6 && m <= 9) return 'monsoon';
  return 'winter';
}

async function fetchDishPool(
  cuisines: string[],
  dietaryTags: string[], // e.g. ['veg'], ['nonveg'], ['jain']
): Promise<PoolDish[]> {
  const season = getCurrentSeason();
  const cuisineLower = cuisines.map(c => c.toLowerCase());
  const vegOnly = dietaryTags.includes('veg') || dietaryTags.includes('vegetarian');
  const jain    = dietaryTags.includes('jain');

  // ── 1. Try Supabase ──────────────────────────────────────────────────────
  try {
    // Build fallback cuisine list for broader coverage
    const allCuisines = [
      ...cuisines,
      ...cuisines.flatMap(c => CUISINE_FALLBACK[c] ?? []),
    ];
    const uniqueCuisines = [...new Set(allCuisines)];

    let q = supabase
      .from('dishes')
      .select('name, cuisine, slot, is_veg, is_jain, is_fasting, is_non_veg_type, health_tags, allowed_days')
      .eq('is_banned', false)
      // Overlap filter: any of the requested cuisines must appear in the dish's cuisine array
      .filter('cuisine', 'ov', `{${uniqueCuisines.join(',')}}`);

    if (vegOnly && !jain) q = q.eq('is_veg', true);
    if (jain)  q = q.eq('is_jain', true);
    if (!jain) q = q.eq('is_jain', false);   // exclude Jain-restricted dishes for non-Jain families
    q = q.eq('is_fasting', false);            // exclude fasting dishes unless explicitly a fasting day

    const { data, error } = await q.limit(600);
    if (!error && data && data.length > 0) {
      // Prefer exact cuisine match dishes first
      const exact   = (data as PoolDish[]).filter(d => d.cuisine.some(dc => cuisineLower.includes(dc.toLowerCase())));
      const broader = (data as PoolDish[]).filter(d => !exact.includes(d));
      const filtered = [...exact, ...broader];
      if (filtered.length >= 10) return filtered;
    }
  } catch { /* Supabase unavailable — use DISH_DATA */ }

  console.error('[DISH_DATA FALLBACK] Supabase returned insufficient results, falling back to in-memory data. Pool size:', 0);

  // ── 2. In-memory DISH_DATA fallback ──────────────────────────────────────
  // Map old DISH_DATA shape (meal_type/dietary arrays) → new PoolDish shape (slot/boolean flags)
  const mealTypeToSlot = (mt: string[]): string[] =>
    mt.flatMap(m => {
      if (m === 'lunch')  return ['lunch_curry'];
      if (m === 'dinner') return ['dinner_curry'];
      return [m]; // 'breakfast', 'snack' stay as-is
    });

  const toPoolDish = (d: typeof DISH_DATA[0]): PoolDish => ({
    name: d.name,
    cuisine: d.cuisine,
    slot: mealTypeToSlot(d.meal_type),
    is_veg: !d.dietary.some(x => x.includes('non-vegetarian')),
    is_jain: d.dietary.includes('jain'),
    is_fasting: d.dietary.includes('fasting'),
    is_non_veg_type: null,
    health_tags: d.health_tags ?? [],
    allowed_days: (d as any).allowed_days ?? [],
  });

  const matchesCuisine = (d: typeof DISH_DATA[0]) =>
    d.cuisine.some(dc => cuisineLower.includes(dc.toLowerCase()));

  const matchesDietary = (d: typeof DISH_DATA[0]) => {
    if (d.dietary.includes('fasting')) return false;          // always exclude fasting dishes
    if (jain)    return d.dietary.includes('jain');
    if (!jain && d.dietary.includes('jain')) return false;   // exclude Jain-restricted for non-Jain families
    if (vegOnly) return !d.dietary.some(x => x.includes('non-vegetarian'));
    return true;
  };

  let pool = DISH_DATA.filter(d => matchesCuisine(d) && matchesDietary(d)).map(toPoolDish);

  // Expand with fallback cuisines if pool is thin
  if (pool.length < 30) {
    const fbCuisines = cuisines.flatMap(c => CUISINE_FALLBACK[c] ?? []);
    const fbLower = new Set(fbCuisines.map(c => c.toLowerCase()));
    const existingNames = new Set(pool.map(d => d.name));
    const extra = DISH_DATA
      .filter(d =>
        !existingNames.has(d.name) &&
        d.cuisine.some(dc => fbLower.has(dc.toLowerCase())) &&
        matchesDietary(d)
      )
      .map(toPoolDish);
    pool = [...pool, ...extra];
  }

  return pool;
}

// ─── Slot selection ───────────────────────────────────────────────────────────

const RICE_RE  = /\b(bhat|bhaat|sheeth|tandool|rice|khichdi|pulao|biryani|fried rice)\b/i;
const BREAD_RE = /\b(bhakri|roti|chapati|chapatti|phulka|puri|poori|paratha|naan|kulcha|thepla|luchi|poli|flatbread|rotte|vade|bhature|luchi)\b/i;
const RAITA_RE = /\b(raita|koshimbir|pachadi|sol kadhi|riata|dahi\s+\w+|kakdi)\b/i;

// Per-slot hardcoded fallbacks (used when pool has no matching dish)
const SLOT_FALLBACKS: Record<string, string> = {
  breakfast:      'Pohe',
  lunch_curry_1:  'Varan Bhaat',
  lunch_curry_2:  'Batata Bhaji',
  lunch_veg:      'Bhendi Upkari',
  lunch_raita:    'Sol Kadhi',
  lunch_bread:    'Jowar Bhakri',
  lunch_rice:     'Ukde Sheeth',
  dinner_curry_1: 'Kolhapuri Chicken Rassa',
  dinner_curry_2: 'Pithla',
  dinner_veg:     'Vaangi Bhaji',
  dinner_raita:   'Sol Kadhi',
  dinner_bread:   'Nachni Bhakri',
  dinner_rice:    'Dadhi Bhaat',
  snack:          'Chakli',
};

/**
 * Pick one dish from the pool for a given slot.
 * Mutates `usedNames` to track what has been chosen for deduplication.
 * If `preferredNames` is non-empty, applies 80/20 rule: 80% chance of picking
 * from the preferred (family regular) dishes when a match exists for this slot.
 */
function selectDishFromPool(
  pool: PoolDish[],
  slot: string,
  isNonVeg: boolean,  // true = non-veg curry slot on a non-veg day
  usedNames: Set<string>,
  healthFocus: string[],
  preferredNames?: Set<string>,
  bannedNames?: Set<string>,
  fridgeKeywords?: Set<string>,
): string {
  let candidates: PoolDish[];

  const inMeal = (d: PoolDish) =>
    d.slot.some(s => s.startsWith('lunch') || s.startsWith('dinner'));
  const isVegDish    = (d: PoolDish) => d.is_veg === true;
  const isNonVegDish = (d: PoolDish) => d.is_veg === false;
  const notStarch = (d: PoolDish) =>
    !RICE_RE.test(d.name) && !BREAD_RE.test(d.name) && !RAITA_RE.test(d.name);

  if (slot === 'breakfast') {
    candidates = pool.filter(d => d.slot.includes('breakfast'));
  } else if (slot === 'snack') {
    candidates = pool.filter(d => d.slot.includes('snack'));
  } else if (slot.endsWith('_rice')) {
    candidates = pool.filter(d => d.slot.includes('rice') || (inMeal(d) && RICE_RE.test(d.name) && isVegDish(d)));
  } else if (slot.endsWith('_bread')) {
    candidates = pool.filter(d => d.slot.includes('bread') || ((inMeal(d) || d.slot.includes('breakfast')) && BREAD_RE.test(d.name) && isVegDish(d)));
  } else if (slot.endsWith('_raita')) {
    candidates = pool.filter(d => d.slot.includes('raita') || (RAITA_RE.test(d.name) && isVegDish(d)));
  } else if (slot.endsWith('_curry_1')) {
    // Main curry — non-veg on non-veg days, veg on veg days
    candidates = pool.filter(d =>
      (d.slot.includes('lunch_curry') || d.slot.includes('dinner_curry') || (inMeal(d) && notStarch(d))) &&
      (isNonVeg ? isNonVegDish(d) : isVegDish(d))
    );
  } else {
    // curry_2, veg_side — always vegetarian
    candidates = pool.filter(d =>
      (d.slot.includes('veg_side') || d.slot.includes('lunch_curry') || d.slot.includes('dinner_curry') || (inMeal(d) && notStarch(d))) &&
      isVegDish(d)
    );
  }

  // Prefer unseen dishes; fall back to any candidate if all seen
  const fresh = candidates.filter(d => !usedNames.has(d.name.toLowerCase()) && !bannedNames?.has(d.name.toLowerCase()));
  let pick: PoolDish | undefined;

  if (fresh.length > 0) {
    // 80/20 rule: if preferred (family regular) dishes provided, try them first 80% of the time
    if (preferredNames && preferredNames.size > 0 && Math.random() < 0.8) {
      const preferred = fresh.filter(d => preferredNames.has(d.name));
      if (preferred.length > 0) {
        pick = preferred[Math.floor(Math.random() * preferred.length)];
      }
    }
    // Boost health-tagged dishes if healthFocus is set (and no preferred pick yet)
    if (!pick && healthFocus.length > 0) {
      const boosted = fresh.filter(d =>
        d.health_tags.some(t => healthFocus.some(f => t.toLowerCase().includes(f.toLowerCase())))
      );
      if (boosted.length > 0) {
        pick = boosted[Math.floor(Math.random() * boosted.length)];
      }
    }
    if (!pick && fridgeKeywords && fridgeKeywords.size > 0) {
      const fridgeBoosted = fresh.filter(d =>
        [...fridgeKeywords].some(kw => d.name.toLowerCase().includes(kw))
      );
      if (fridgeBoosted.length > 0) {
        pick = fridgeBoosted[Math.floor(Math.random() * fridgeBoosted.length)];
      }
    }
    if (!pick) pick = fresh[Math.floor(Math.random() * fresh.length)];
  } else if (candidates.length > 0) {
    pick = candidates[Math.floor(Math.random() * candidates.length)];
  }

  if (!pick) return SLOT_FALLBACKS[slot] ?? 'Pohe';
  usedNames.add(pick.name.toLowerCase());
  return pick.name;
}

// ─── Meal structure from Claude (ONE call per plan) ───────────────────────────

interface DayStructure {
  date: string;
  day: string;
  healthFocus: string[];   // maps to health_tags in pool, e.g. ['low-gi','iron-rich']
  festivalNote: string | null;
  lightDay: boolean;       // fasting / unwell days → prefer light dishes
}

async function buildMealStructure(p: {
  dates: string[];
  cuisine: string;
  healthFlags: HealthFlags;
  isNonVeg: boolean;
  communityRules: string;
  festivalContext?: string;
  userContext?: string;
  unwellMembers?: string[];
}): Promise<DayStructure[]> {
  const hf = p.healthFlags;
  const healthParts: string[] = [];
  if (hf.diabetic)          healthParts.push('low-gi');
  if (hf.bp)                healthParts.push('low-sodium');
  if (hf.pcos)              healthParts.push('pcos');
  if (hf.cholesterol)       healthParts.push('no-fried');
  if (hf.thyroid)           healthParts.push('selenium');
  if (hf.kidneyDisease)     healthParts.push('low-potassium');
  if (hf.heartDisease)      healthParts.push('heart');
  if (hf.obesity)           healthParts.push('low-calorie');
  if (hf.anaemia)           healthParts.push('iron-rich');
  if (hf.lactoseIntolerant) healthParts.push('no-dairy');
  if (hf.glutenIntolerant)  healthParts.push('no-gluten');

  const datesLine = p.dates.map(d => {
    const day = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
    return `${day} ${d}`;
  }).join(', ');

  const prompt = `You are planning the STRUCTURE of a ${p.dates.length}-day Indian meal plan. Do NOT name any dishes.

Family: ${p.communityRules}. Cuisine: ${p.cuisine}. Diet: ${p.isNonVeg ? 'Non-vegetarian' : 'Vegetarian'}.
Health needs: ${healthParts.length > 0 ? healthParts.join(', ') : 'Normal healthy'}.
${p.festivalContext ? `Festival context: ${p.festivalContext}` : ''}
${p.userContext ? `User context: ${p.userContext}` : ''}
${p.unwellMembers && p.unwellMembers.length > 0 ? `Unwell members: ${p.unwellMembers.join(', ')} — flag lightDay true` : ''}
Days: ${datesLine}

Return a JSON array (one object per day). healthFocus items should match tags like: low-gi, iron-rich, protein, fibre, light, cooling, comfort, festive, no-dairy, no-gluten.
[
  {
    "date": "YYYY-MM-DD",
    "day": "Monday",
    "healthFocus": ["low-gi"],
    "festivalNote": null,
    "lightDay": false
  }
]
Return JSON only, no markdown.`;

  try {
    const text = await askClaudeJson(prompt, 1000);
    const parsed = JSON.parse(text) as DayStructure[];
    if (Array.isArray(parsed) && parsed.length === p.dates.length) return parsed;
  } catch { /* fallback below */ }

  return p.dates.map(date => ({
    date,
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
    healthFocus: healthParts,
    festivalNote: null,
    lightDay: false,
  }));
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateMealPlanFast(
  params: {
    userId: string;
    dates: string[];
    healthFlags: HealthFlags;
    language: string;
    cuisine: string;
    dishHistory: string[];
    foodPrefs: { type: 'veg' | 'nonveg'; vegType?: 'normal' | 'fasting'; nonVegOptions?: string[] };
    allowedProteins?: string[];
    isMixed?: boolean;
    unwellMembers?: string[];
    nutritionFocus?: string;
    vegDays?: string[];
    cuisinePerDay?: (string | string[])[];
    breakfastPrefs?: string[];
    lunchPrefs?: string[];
    dinnerPrefs?: string[];
    snackPrefs?: string[];
    locationCity?: string;
    locationStores?: string;
    selectedSlots?: string[];
    communityRules?: string;
    familyAvoids?: string[];
    familySize?: number;
    familyRecipes?: { recipe_name: string; cuisine: string }[];
    cookingPattern?: string;
    jainFamily?: boolean;
    mealTemplateCurry?: string;
    mealTemplateVeg?: string;
    mealTemplateRaita?: string;
    mealTemplateBread?: string;
    mealTemplateRice?: string;
    sundayExtraCurry?: string;
    sundaySweet?: string;
    userContext?: string;
    festivalContext?: string;
  },
  onProgress?: (current: number, total: number) => void,
  onDayStart?: (dayName: string) => void,
): Promise<MealPlanResult> {
  const slots = params.selectedSlots ?? ['breakfast', 'lunch', 'dinner'];
  if (slots.length === 0) throw new Error('No meal slots selected.');

  const cuisine       = params.cuisine || 'Konkani';
  const isNonVegPref  = params.foodPrefs.type === 'nonveg';
  const isMixed       = params.isMixed ?? false;
  const communityRules = params.communityRules || 'Indian family';
  const familySize    = params.familySize ?? 4;
  const total         = params.dates.length;
  const weekHistory   = [...(params.dishHistory ?? [])].slice(0, 60);

  // ── Health focus tags for pool filtering ───────────────────────────────────
  const hf = params.healthFlags;
  const healthFocusTags: string[] = [];
  if (hf.diabetic)          healthFocusTags.push('low-gi');
  if (hf.bp)                healthFocusTags.push('low-sodium');
  if (hf.cholesterol)       healthFocusTags.push('no-fried');
  if (hf.anaemia)           healthFocusTags.push('iron-rich');
  if (hf.obesity)           healthFocusTags.push('low-calorie');

  // ── Dietary tags for pool fetching ────────────────────────────────────────
  const dietaryTags: string[] = [];
  if (params.jainFamily) {
    dietaryTags.push('jain');
  } else if (!isNonVegPref) {
    dietaryTags.push('veg');
  }

  // ── Step 1: fetch dish pool (Supabase → DISH_DATA fallback) ───────────────
  const cuisineList = params.cuisinePerDay
    ? [...new Set(params.cuisinePerDay.flat())] as string[]
    : [cuisine];

  const pool = await fetchDishPool(cuisineList, dietaryTags);

  // ── Step 1b: fetch family regular dishes for 80/20 rule ───────────────────
  let regularDishNames: Set<string> = new Set();
  try {
    const { data: regularRows } = await supabase
      .from('family_regular_dishes')
      .select('dish_id, dishes!inner(name)')
      .eq('profile_id', params.userId);
    if (regularRows && regularRows.length > 0) {
      regularRows.forEach((r: any) => {
        if (r.dishes?.name) regularDishNames.add(r.dishes.name as string);
      });
    }
  } catch { /* ignore — fall back to full pool */ }

  // ── Step 1c: fetch banned dishes ──────────────────────────────────────────
  const bannedDishNames: Set<string> = new Set();
  try {
    const { data: bannedRows } = await supabase
      .from('user_banned_dishes')
      .select('dish_id, dishes!inner(name)')
      .eq('profile_id', params.userId);
    if (bannedRows) {
      bannedRows.forEach((r: any) => {
        if (r.dishes?.name) bannedDishNames.add(r.dishes.name.toLowerCase());
      });
    }
  } catch { /* ignore */ }

  // ── Step 1d: build fridge keyword hints ──────────────────────────────────
  const fridgeKeywords: Set<string> = new Set();
  const PROTEIN_KEYWORDS = ['prawn','chicken','mutton','fish','egg','paneer','tofu','dal','potato','aloo','palak',
    'spinach','cauliflower','gobi','peas','matar','mushroom','carrot','crab','lobster','lamb','beef','pork'];
  try {
    const { data: fridgeItems } = await supabase
      .from('fridge_inventory')
      .select('item_name')
      .eq('user_id', params.userId);
    if (fridgeItems) {
      fridgeItems.forEach((item: any) => {
        const name = (item.item_name ?? '').toLowerCase();
        PROTEIN_KEYWORDS.forEach(kw => { if (name.includes(kw)) fridgeKeywords.add(kw); });
      });
    }
  } catch { /* ignore */ }

  // ── Step 2: one Claude call for weekly structure ───────────────────────────
  const dayStructures = await buildMealStructure({
    dates: params.dates,
    cuisine,
    healthFlags: params.healthFlags,
    isNonVeg: isNonVegPref,
    communityRules,
    festivalContext: params.festivalContext,
    userContext: params.userContext,
    unwellMembers: params.unwellMembers,
  });

  // ── Step 3: per-day dish selection ────────────────────────────────────────
  const NON_VEG_KW = ['chicken','mutton','fish','prawn','lamb','beef','pork','egg','crab','lobster','shrimp','meat','keema','mince','gosht','murg','machli','jhinga','tuna','pomfret','rohu','hilsa','surmai','paplet','bangda','tisreo','kingfish','rawas','mandeli','halwa','kolambi','kekda'];
  const isNonVegDish = (dish: string | undefined | null) =>
    !!dish && NON_VEG_KW.some(k => dish.toLowerCase().includes(k));

  // Ingredient lookup: keyword-match dish name to return a practical shopping list.
  // No DB query needed — covers the staple components of every Indian dish category.
  const dishIngredients = (dishName: string | undefined | null): string[] => {
    if (!dishName) return [];
    const d = dishName.toLowerCase();

    // ── Proteins ──────────────────────────────────────────────────────────
    if (d.includes('chicken')) return ['500g chicken', '2 onions', '2 tomatoes', '1 tbsp ginger-garlic paste', '1 tsp turmeric', '1 tsp red chilli powder', '1 tsp garam masala', '2 tbsp oil', 'salt'];
    if (d.includes('mutton') || d.includes('gosht') || d.includes('lamb')) return ['500g mutton', '2 onions', '2 tomatoes', '1 tbsp ginger-garlic paste', '1 tsp turmeric', '1 tsp red chilli powder', '1 tsp garam masala', '2 tbsp oil', 'salt'];
    if (d.includes('fish') || d.includes('pomfret') || d.includes('rohu') || d.includes('surmai') || d.includes('rawas') || d.includes('bangda') || d.includes('hilsa') || d.includes('tuna')) return ['500g fish', '1 onion', '2 tomatoes', '1 tsp turmeric', '1 tsp red chilli powder', '1 tbsp ginger-garlic paste', '2 tbsp oil', 'salt'];
    if (d.includes('prawn') || d.includes('shrimp') || d.includes('jhinga') || d.includes('kolambi')) return ['500g prawns', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp red chilli powder', '1 tbsp coconut milk', '2 tbsp oil', 'salt'];
    if (d.includes('egg') || d.includes('anda')) return ['4 eggs', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp red chilli powder', '1 tbsp oil', 'salt'];
    if (d.includes('keema') || d.includes('mince')) return ['500g minced meat', '2 onions', '2 tomatoes', '1 tbsp ginger-garlic paste', '1 tsp garam masala', '1 tsp turmeric', '2 tbsp oil', 'salt'];
    if (d.includes('crab') || d.includes('kekda')) return ['500g crab', '1 onion', '2 tomatoes', '1 tbsp coconut paste', '1 tsp turmeric', '1 tsp red chilli powder', '2 tbsp oil', 'salt'];

    // ── Paneer / Dairy ────────────────────────────────────────────────────
    if (d.includes('paneer')) return ['250g paneer', '1 onion', '2 tomatoes', '1 tbsp cream', '1 tsp turmeric', '1 tsp garam masala', '1 tbsp oil', 'salt'];

    // ── Dal / Lentils ─────────────────────────────────────────────────────
    if (d.includes('dal') || d.includes('daal') || d.includes('lentil') || d.includes('sambhar') || d.includes('sambar')) return ['1 cup dal', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp mustard seeds', '2 dried red chillies', '1 tbsp ghee', 'salt'];
    if (d.includes('rajma')) return ['1 cup kidney beans', '2 onions', '2 tomatoes', '1 tbsp ginger-garlic paste', '1 tsp garam masala', '1 tbsp oil', 'salt'];
    if (d.includes('chana') || d.includes('chole') || d.includes('chickpea')) return ['1 cup chickpeas', '2 onions', '2 tomatoes', '1 tbsp ginger-garlic paste', '1 tsp garam masala', '1 tbsp oil', 'salt'];
    if (d.includes('moong')) return ['1 cup moong dal', '1 onion', '1 tomato', '1 tsp turmeric', '1 tbsp ghee', 'salt'];

    // ── Vegetable Curries ─────────────────────────────────────────────────
    if (d.includes('aloo') || d.includes('potato')) return ['3 potatoes', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('palak') || d.includes('spinach')) return ['250g spinach', '1 onion', '1 tomato', '1 tsp turmeric', '1 tbsp cream', '1 tbsp oil', 'salt'];
    if (d.includes('baingan') || d.includes('brinjal') || d.includes('eggplant') || d.includes('vangi')) return ['2 medium brinjals', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('gobi') || d.includes('cauliflower')) return ['1 medium cauliflower', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('bhindi') || d.includes('okra') || d.includes('ladyfinger')) return ['250g okra', '1 onion', '1 tsp turmeric', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('lauki') || d.includes('bottle gourd') || d.includes('dudhi')) return ['1 bottle gourd', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('karela') || d.includes('bitter gourd')) return ['250g bitter gourd', '1 onion', '1 tsp turmeric', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('beans') || d.includes('green bean')) return ['250g green beans', '1 onion', '1 tsp mustard seeds', '1 tsp turmeric', '1 tbsp oil', 'salt'];
    if (d.includes('peas') || d.includes('matar')) return ['1 cup peas', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp garam masala', '1 tbsp oil', 'salt'];
    if (d.includes('mushroom')) return ['250g mushrooms', '1 onion', '1 tomato', '1 tsp turmeric', '1 tsp garam masala', '1 tbsp oil', 'salt'];
    if (d.includes('corn') || d.includes('maize') || d.includes('makki')) return ['2 cobs corn', '1 onion', '1 tsp turmeric', '1 tsp cumin', '1 tbsp butter', 'salt'];
    if (d.includes('drumstick') || d.includes('moringa') || d.includes('shevga')) return ['6 drumsticks', '1 onion', '1 tomato', '1 tsp turmeric', '1 tbsp coconut paste', '1 tbsp oil', 'salt'];
    if (d.includes('raw banana') || d.includes('kachha kela') || d.includes('kacha kela')) return ['2 raw bananas', '1 onion', '1 tsp turmeric', '1 tsp mustard seeds', '1 tbsp oil', 'salt'];

    // ── Rice dishes ───────────────────────────────────────────────────────
    if (d.includes('biryani')) return ['1 cup basmati rice', '200g protein (chicken/veg)', '1 onion', '1 tbsp ginger-garlic paste', '1 tsp biryani masala', '2 tbsp oil', '1 tbsp ghee', 'salt'];
    if (d.includes('pulao') || d.includes('pilaf')) return ['1 cup basmati rice', '1 onion', '1 cup mixed vegetables', '1 tsp cumin', '2 tbsp ghee', 'salt'];
    if (d.includes('khichdi') || d.includes('khichri')) return ['0.5 cup rice', '0.5 cup moong dal', '1 tsp turmeric', '1 tsp cumin', '1 tbsp ghee', 'salt'];
    if (d.includes('fried rice')) return ['1 cup cooked rice', '1 egg', '1 cup mixed vegetables', '2 tbsp soy sauce', '1 tbsp oil', 'salt'];
    if (d.includes('rice') || d.includes('chawal') || d.includes('bhat') || d.includes('anna')) return ['1 cup basmati rice', 'salt'];

    // ── Breads ────────────────────────────────────────────────────────────
    if (d.includes('paratha') || d.includes('parantha')) return ['1 cup whole wheat flour', '1 tbsp ghee', 'water', 'salt'];
    if (d.includes('roti') || d.includes('chapati') || d.includes('phulka') || d.includes('poli')) return ['1 cup whole wheat flour', 'water', 'salt'];
    if (d.includes('naan')) return ['1 cup maida', '1 tsp yeast', '1 tbsp yoghurt', '1 tbsp butter', 'salt'];
    if (d.includes('puri') || d.includes('poori')) return ['1 cup whole wheat flour', '1 tbsp oil', 'water', 'salt'];
    if (d.includes('bhatura')) return ['1 cup maida', '1 tsp baking soda', '2 tbsp yoghurt', '1 tbsp oil', 'salt'];
    if (d.includes('dosa') || d.includes('uttapam')) return ['1 cup dosa batter', '1 tbsp oil', 'salt'];
    if (d.includes('idli')) return ['1 cup idli batter', 'salt'];
    if (d.includes('appam')) return ['1 cup appam batter', '1 tbsp coconut milk', 'salt'];
    if (d.includes('akki roti') || d.includes('rice roti')) return ['1 cup rice flour', 'water', 'salt'];
    if (d.includes('bhakri')) return ['1 cup jowar flour', 'water', 'salt'];

    // ── Breakfast dishes ──────────────────────────────────────────────────
    if (d.includes('poha') || d.includes('aval') || d.includes('avalakki')) return ['1 cup flattened rice', '1 onion', '1 tsp mustard seeds', '1 tsp turmeric', '1 tbsp oil', 'salt', 'curry leaves'];
    if (d.includes('upma') || d.includes('uppma')) return ['1 cup semolina', '1 onion', '1 tsp mustard seeds', '2 tbsp oil', 'salt', 'curry leaves'];
    if (d.includes('sheera') || d.includes('halwa') || d.includes('kesari')) return ['0.5 cup semolina', '0.5 cup sugar', '2 tbsp ghee', 'saffron', 'cashews'];
    if (d.includes('pongal') || d.includes('ven pongal')) return ['0.5 cup rice', '0.25 cup moong dal', '1 tbsp ghee', '1 tsp cumin', 'pepper', 'salt'];
    if (d.includes('puttu')) return ['1 cup rice flour', '0.5 cup grated coconut', 'salt'];
    if (d.includes('sabudana') || d.includes('sago')) return ['1 cup sabudana', '2 potatoes', '0.5 cup peanuts', '1 tsp cumin', '1 tbsp oil', 'salt'];
    if (d.includes('pesarattu')) return ['1 cup moong dal', '1 tbsp ginger', '2 green chillies', '1 tbsp oil', 'salt'];
    if (d.includes('vada') || d.includes('wada') || d.includes('medu')) return ['1 cup urad dal', 'salt', 'curry leaves', '1 tbsp oil'];

    // ── Raita / Sides ─────────────────────────────────────────────────────
    if (d.includes('raita')) return ['1 cup yoghurt', '0.5 cucumber', '1 tsp cumin powder', 'salt'];
    if (d.includes('pachadi')) return ['1 cup yoghurt', '1 cup vegetables', '1 tsp mustard seeds', '1 tbsp oil', 'salt'];
    if (d.includes('papad') || d.includes('papadum')) return ['papad'];
    if (d.includes('pickle') || d.includes('achar')) return ['200g pickle'];
    if (d.includes('chutney')) return ['1 cup coriander/coconut', '1 green chilli', '1 tbsp lemon juice', 'salt'];

    // ── Snacks ────────────────────────────────────────────────────────────
    if (d.includes('samosa')) return ['1 cup maida', '2 potatoes', '0.5 cup peas', '1 tsp garam masala', '1 tbsp oil', 'salt'];
    if (d.includes('pakora') || d.includes('bhajia') || d.includes('bajji')) return ['1 cup chickpea flour', '1 onion', '1 tsp red chilli powder', '1 tbsp oil', 'salt'];
    if (d.includes('bhel')) return ['1 cup puffed rice', '0.5 cup sev', '1 onion', '1 tomato', '1 tbsp tamarind chutney', 'salt'];
    if (d.includes('pav bhaji')) return ['4 pav buns', '2 potatoes', '1 onion', '1 tomato', '1 tsp pav bhaji masala', '2 tbsp butter', 'salt'];
    if (d.includes('vada pav')) return ['4 pav buns', '2 potatoes', '1 cup chickpea flour', '1 tsp turmeric', '1 tbsp oil', 'salt'];
    if (d.includes('misal')) return ['1 cup sprouted moth beans', '1 onion', '1 tomato', '1 tsp goda masala', '1 tbsp oil', 'sev', 'pav'];
    if (d.includes('dabeli')) return ['4 pav buns', '2 potatoes', '1 tbsp dabeli masala', 'pomegranate seeds', 'peanuts'];
    if (d.includes('dhokla')) return ['1 cup chickpea flour', '1 tsp baking soda', '1 tbsp lemon juice', '1 tsp mustard seeds', '1 tbsp oil', 'salt'];
    if (d.includes('khandvi')) return ['0.5 cup chickpea flour', '1 cup yoghurt', '1 tsp turmeric', '1 tsp mustard seeds', '1 tbsp oil', 'salt'];
    if (d.includes('pani puri') || d.includes('golgappa') || d.includes('puchka')) return ['20 puris', '1 cup tamarind water', '1 cup sprouted moong', 'chaat masala', 'salt'];
    if (d.includes('dahi puri') || d.includes('sev puri')) return ['20 puris', '1 cup yoghurt', 'sev', '1 tbsp tamarind chutney', 'chaat masala'];

    // ── Sweets / Desserts ─────────────────────────────────────────────────
    if (d.includes('kheer') || d.includes('payasam') || d.includes('payesh')) return ['0.5 cup rice', '1 litre milk', '0.5 cup sugar', 'cardamom', 'cashews', 'raisins'];
    if (d.includes('gulab jamun')) return ['1 cup milk powder', '3 tbsp maida', '1 tbsp ghee', '1 cup sugar', 'cardamom'];
    if (d.includes('rasgulla') || d.includes('rasogolla')) return ['1 litre milk', '2 tbsp vinegar', '1 cup sugar', 'cardamom'];
    if (d.includes('ladoo') || d.includes('laddoo')) return ['1 cup besan/boondi', '0.5 cup sugar', '2 tbsp ghee', 'cardamom'];
    if (d.includes('barfi') || d.includes('burfi')) return ['1 cup milk powder', '0.5 cup sugar', '2 tbsp ghee', 'cardamom'];
    if (d.includes('jalebi')) return ['1 cup maida', '1 tbsp yoghurt', '1 cup sugar', 'saffron', '1 tbsp oil'];
    if (d.includes('modak')) return ['1 cup rice flour', '0.5 cup jaggery', '0.5 cup coconut', 'cardamom'];
    if (d.includes('peda')) return ['1 cup khoya', '0.5 cup sugar', 'cardamom', 'saffron'];
    if (d.includes('mysore pak')) return ['1 cup besan', '1 cup sugar', '0.5 cup ghee'];

    // ── Generic fallback by meal context ──────────────────────────────────
    // If name contains 'curry' or 'sabzi' or 'bhaji' — generic veg curry
    if (d.includes('curry') || d.includes('sabzi') || d.includes('bhaji') || d.includes('masala')) {
      return ['1 onion', '2 tomatoes', '1 tbsp ginger-garlic paste', '1 tsp turmeric', '1 tsp garam masala', '1 tbsp oil', 'salt'];
    }

    // Absolute fallback
    return ['1 onion', '1 tomato', '1 tbsp oil', 'salt', 'spices'];
  };

  const usedNames = new Set<string>(weekHistory.map(n => n.toLowerCase()));
  const dayResults: MealPlanDay[] = [];

  onProgress?.(0, total);

  for (let i = 0; i < params.dates.length; i++) {
    const date    = params.dates[i];
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const struct  = dayStructures[i] ?? { healthFocus: healthFocusTags, festivalNote: null, lightDay: false };

    // Veg day logic
    let isVegDay = params.vegDays?.includes(dayName) ?? false;
    // RULE: Veg Saturday — all meals veg on Saturday regardless of family preference
    if (dayName === 'Saturday') isVegDay = true;
    // Avoidance-text veg-day detection
    const avoidanceText = (params.familyAvoids ?? []).join(' ').toLowerCase();
    const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    DAY_NAMES.forEach(d => {
      if (
        avoidanceText.includes(`no non-veg ${d}`) ||
        avoidanceText.includes(`veg ${d}`) ||
        avoidanceText.includes(`${d} veg`)
      ) {
        if (dayName.toLowerCase() === d) isVegDay = true;
      }
    });

    const isSunday          = new Date(date).getDay() === 0;
    const isEffectivelyNonVeg = isNonVegPref && !isVegDay && !isMixed;
    const dayCuisine        = params.cuisinePerDay?.[i] || cuisine;
    const cuisineStr        = Array.isArray(dayCuisine) ? dayCuisine.join(', ') : dayCuisine;

    // Per-day pool: if cuisinePerDay differs, re-filter global pool
    let dayPool = pool;
    if (params.cuisinePerDay && params.cuisinePerDay[i]) {
      const dayCuisines = (Array.isArray(dayCuisine) ? dayCuisine : [dayCuisine]).map(c => c.toLowerCase());
      const filtered = pool.filter(d => d.cuisine.some(dc => dayCuisines.includes(dc.toLowerCase())));
      if (filtered.length >= 10) dayPool = filtered;
    }

    // Light-day health focus (unwell / fasting)
    const dayHealthFocus = struct.lightDay
      ? [...(struct.healthFocus ?? healthFocusTags), 'light', 'comfort']
      : (struct.healthFocus ?? healthFocusTags);

    onDayStart?.(dayName);

    try {
      // ── Select dishes for all slots from pool ─────────────────────────────
      const pref = regularDishNames; // 80/20 preferred names (empty set = no preference)
      const breakfast    = slots.includes('breakfast')
        ? selectDishFromPool(dayPool, 'breakfast',    false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const lunchCurry1  = slots.includes('lunch')
        ? selectDishFromPool(dayPool, 'lunch_curry_1', isEffectivelyNonVeg, usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const lunchCurry2  = slots.includes('lunch')
        ? selectDishFromPool(dayPool, 'lunch_curry_2', false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const lunchVeg     = slots.includes('lunch')
        ? selectDishFromPool(dayPool, 'lunch_veg',     false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const lunchRaita   = slots.includes('lunch')
        ? selectDishFromPool(dayPool, 'lunch_raita',   false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const lunchBread   = slots.includes('lunch')
        ? selectDishFromPool(dayPool, 'lunch_bread',   false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const lunchRice    = slots.includes('lunch')
        ? selectDishFromPool(dayPool, 'lunch_rice',    false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const dinnerCurry1 = slots.includes('dinner')
        ? selectDishFromPool(dayPool, 'dinner_curry_1', isEffectivelyNonVeg, usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const dinnerCurry2 = slots.includes('dinner')
        ? selectDishFromPool(dayPool, 'dinner_curry_2', false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const dinnerVeg    = slots.includes('dinner')
        ? selectDishFromPool(dayPool, 'dinner_veg',    false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const dinnerRaita  = slots.includes('dinner')
        ? selectDishFromPool(dayPool, 'dinner_raita',  false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const dinnerBread  = slots.includes('dinner')
        ? selectDishFromPool(dayPool, 'dinner_bread',  false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const dinnerRice   = slots.includes('dinner')
        ? selectDishFromPool(dayPool, 'dinner_rice',   false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';
      const snack        = slots.includes('snack')
        ? selectDishFromPool(dayPool, 'snack',         false,              usedNames, dayHealthFocus, pref, bannedDishNames, fridgeKeywords)
        : '';

      // RULE: Sunday special — prioritise dishes tagged allowed_days: ['Sunday'] from pool
      let finalLunchCurry1 = lunchCurry1;
      let sundaySweetComp: AnatomyComponent | null = null;
      if (isSunday) {
        const sundayPoolDishes = dayPool.filter(d =>
          d.allowed_days && d.allowed_days.includes('Sunday') &&
          d.is_veg === false &&
          (d.slot.includes('lunch_curry') || d.slot.includes('dinner_curry')) &&
          !usedNames.has(d.name)
        );
        if (sundayPoolDishes.length > 0) {
          finalLunchCurry1 = sundayPoolDishes[Math.floor(Math.random() * sundayPoolDishes.length)].name;
          usedNames.add(finalLunchCurry1);
        }
        // Secondary: sundayExtraCurry — query Supabase directly, bypassing cuisine pool filter
        if (params.sundayExtraCurry) {
          const sundaySpecials = params.sundayExtraCurry
            .split(',')
            .map((d: string) => d.trim())
            .filter(Boolean);

          const { data: sundayDishes } = await supabase
            .from('dishes')
            .select('name, slot, is_veg, cuisine, allowed_days, is_jain, is_fasting, health_tags')
            .in('name', sundaySpecials)
            .eq('is_banned', false);

          if (sundayDishes && sundayDishes.length > 0) {
            const pick = sundayDishes[Math.floor(Math.random() * sundayDishes.length)];
            finalLunchCurry1 = pick.name;
            usedNames.add(finalLunchCurry1);
          }
        }

        // Sunday sweet — query by exact name, store for anatomy.sweet
        if (params.sundaySweet) {
          try {
            const { data: sweetDish } = await supabase
              .from('dishes')
              .select('name, is_veg')
              .eq('name', params.sundaySweet)
              .eq('is_banned', false)
              .maybeSingle();
            if (sweetDish) {
              sundaySweetComp = {
                dishName: sweetDish.name,
                isVeg: sweetDish.is_veg !== false,
                cuisine: cuisineStr,
                ingredients: dishIngredients(sweetDish.name),
              };
            }
          } catch { /* non-fatal */ }
        }

      }

      // ── Assemble anatomy ──────────────────────────────────────────────────
      const anatomy: DayAnatomy = {};

      if (slots.includes('breakfast')) {
        anatomy.breakfast = {
          dishName: breakfast,
          isVeg: !isNonVegDish(breakfast),
          cuisine: cuisineStr,
          ingredients: dishIngredients(breakfast),
        };
      }

      if (slots.includes('lunch')) {
        anatomy.lunch = {
          curry: [
            { dishName: finalLunchCurry1, isVeg: !isNonVegDish(finalLunchCurry1), cuisine: cuisineStr, ingredients: dishIngredients(finalLunchCurry1) },
            { dishName: lunchCurry2,      isVeg: !isNonVegDish(lunchCurry2),      cuisine: cuisineStr, ingredients: dishIngredients(lunchCurry2) },
          ],
          veg:   { dishName: lunchVeg,   isVeg: true, ingredients: dishIngredients(lunchVeg) },
          raita: { dishName: lunchRaita, isVeg: true, ingredients: dishIngredients(lunchRaita) },
          bread: { dishName: lunchBread, isVeg: true, ingredients: dishIngredients(lunchBread) },
          rice:  { dishName: lunchRice,  isVeg: true, ingredients: dishIngredients(lunchRice) },
        };
      }

      if (slots.includes('dinner')) {
        anatomy.dinner = {
          curry: [
            { dishName: dinnerCurry1, isVeg: !isNonVegDish(dinnerCurry1), cuisine: cuisineStr, ingredients: dishIngredients(dinnerCurry1) },
            { dishName: dinnerCurry2, isVeg: !isNonVegDish(dinnerCurry2), cuisine: cuisineStr, ingredients: dishIngredients(dinnerCurry2) },
          ],
          veg:   { dishName: dinnerVeg,   isVeg: true, ingredients: dishIngredients(dinnerVeg) },
          raita: { dishName: dinnerRaita, isVeg: true, ingredients: dishIngredients(dinnerRaita) },
          bread: { dishName: dinnerBread, isVeg: true, ingredients: dishIngredients(dinnerBread) },
          rice:  { dishName: dinnerRice,  isVeg: true, ingredients: dishIngredients(dinnerRice) },
        };
      }

      if (slots.includes('snack')) {
        anatomy.snack = { dishName: snack, isVeg: !isNonVegDish(snack), cuisine: cuisineStr, ingredients: dishIngredients(snack) };
      }

      if (sundaySweetComp) {
        anatomy.sweet = sundaySweetComp;
      }

      // ── Build MealSlots ───────────────────────────────────────────────────
      const toMealSlot = (
        curry1: string, curry2: string, veg: string, raita: string, bread: string, rice: string,
      ): MealSlot => ({
        options: [{
          name: curry1,
          description: `Curry: ${curry1} | Curry 2: ${curry2} | Veg: ${veg} | Raita: ${raita} | Bread: ${bread} | Rice: ${rice}`,
          vegetarian: !isNonVegDish(curry1),
          tags: [isNonVegDish(curry1) ? 'non-vegetarian' : 'vegetarian'],
          ingredients: [
            ...dishIngredients(curry1),
            ...dishIngredients(curry2),
            ...dishIngredients(veg),
            ...dishIngredients(raita),
            ...dishIngredients(bread),
            ...dishIngredients(rice),
          ],
          steps: [],
        }],
      });

      const breakfastSlot: MealSlot = slots.includes('breakfast')
        ? { options: [{ name: breakfast, vegetarian: !isNonVegDish(breakfast), tags: ['breakfast'], ingredients: dishIngredients(breakfast), steps: [] }] }
        : { options: [] };
      const lunchSlot: MealSlot = slots.includes('lunch')
        ? toMealSlot(finalLunchCurry1, lunchCurry2, lunchVeg, lunchRaita, lunchBread, lunchRice)
        : { options: [] };
      const dinnerSlot: MealSlot = slots.includes('dinner')
        ? toMealSlot(dinnerCurry1, dinnerCurry2, dinnerVeg, dinnerRaita, dinnerBread, dinnerRice)
        : { options: [] };
      const snackSlot: MealSlot | undefined = slots.includes('snack')
        ? { options: [{ name: snack, vegetarian: !isNonVegDish(snack), tags: ['snack'], ingredients: dishIngredients(snack), steps: [] }] }
        : undefined;

      const dayResult: MealPlanDay = { date, day: dayName, breakfast: breakfastSlot, lunch: lunchSlot, dinner: dinnerSlot };
      if (snackSlot) dayResult.snack = snackSlot;
      if (anatomy.lunch || anatomy.dinner) dayResult.anatomy = anatomy;

      dayResults.push(dayResult);

      // Track all selected names for deduplication across days
      [breakfast, finalLunchCurry1, lunchCurry2, lunchVeg, lunchRaita, lunchBread, lunchRice,
       dinnerCurry1, dinnerCurry2, dinnerVeg, dinnerRaita, dinnerBread, dinnerRice, snack]
        .filter(Boolean)
        .forEach(n => weekHistory.push(n));

    } catch (dayErr) {
      console.error(`[DAY FAILED] ${dayName} (${date}):`, dayErr instanceof Error ? dayErr.message : String(dayErr));
      const emptySlot: MealSlot = { options: [] };
      dayResults.push({
        date, day: dayName,
        breakfast: slots.includes('breakfast') ? fallbackSlot('breakfast', i) : emptySlot,
        lunch:     slots.includes('lunch')     ? fallbackSlot('lunch', i)     : emptySlot,
        dinner:    slots.includes('dinner')    ? fallbackSlot('dinner', i)    : emptySlot,
      });
    }

    onProgress?.(i + 1, total);
  }

  // ── Post-processing: swap avoidance violations ────────────────────────────
  const avoidKeywords = (params.familyAvoids ?? [])
    .join(' ').toLowerCase()
    .split(/[\s,]+/)
    .filter(w => w.length > 3);

  if (avoidKeywords.length > 0) {
    const swapNote: string[] = [];

    // Pick a replacement dish from the full pool (cuisine-relaxed), avoiding the violated name
    const swapReplacement = (violatedName: string, slot: string): string => {
      const isNonVegViolation = NON_VEG_KW.some(k => violatedName.toLowerCase().includes(k));

      if (slot === 'breakfast') {
        // Try pool first, fall back to SLOT_FALLBACKS
        const candidates = pool.filter(d =>
          d.slot.includes('breakfast') &&
          d.is_veg === true &&
          !avoidKeywords.some(kw => d.name.toLowerCase().includes(kw))
        );
        if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)].name;
        return SLOT_FALLBACKS['breakfast'];
      }

      if (slot === 'snack') {
        const candidates = pool.filter(d =>
          d.slot.includes('snack') &&
          !avoidKeywords.some(kw => d.name.toLowerCase().includes(kw))
        );
        if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)].name;
        return SLOT_FALLBACKS['snack'];
      }

      // Curry slot — pick from full pool (no cuisine constraint), matching veg/non-veg of original
      const curryCandidates = pool.filter(d =>
        (d.slot.includes('lunch_curry') || d.slot.includes('dinner_curry')) &&
        d.is_veg === !isNonVegViolation &&
        !avoidKeywords.some(kw => d.name.toLowerCase().includes(kw))
      );
      if (curryCandidates.length > 0) return curryCandidates[Math.floor(Math.random() * curryCandidates.length)].name;

      // If still nothing, relax to any veg curry
      const vegFallbackCandidates = pool.filter(d =>
        (d.slot.includes('lunch_curry') || d.slot.includes('dinner_curry')) &&
        d.is_veg === true &&
        !avoidKeywords.some(kw => d.name.toLowerCase().includes(kw))
      );
      if (vegFallbackCandidates.length > 0) return vegFallbackCandidates[Math.floor(Math.random() * vegFallbackCandidates.length)].name;

      return slot.startsWith('lunch') ? SLOT_FALLBACKS['lunch_curry_2'] : SLOT_FALLBACKS['dinner_curry_2'];
    };

    dayResults.forEach(day => {
      const checkViolation = (dishName: string) =>
        avoidKeywords.some(kw => dishName.toLowerCase().includes(kw));

      (['breakfast','lunch','dinner','snack'] as const).forEach(slot => {
        const s = day[slot as keyof MealPlanDay] as any;
        s?.options?.forEach((opt: any) => {
          if (opt.name && checkViolation(opt.name)) {
            const original = opt.name;
            opt.name = swapReplacement(original, slot);
            swapNote.push(`Maharaj swapped "${original}" — avoidance settings`);
          }
        });
      });
    });
    if (swapNote.length > 0) (dayResults as any).__swapNotes = swapNote;
  }

  const fridgeNote = fridgeKeywords.size > 0
    ? `Maharaj checked your fridge and prioritised dishes using ${[...fridgeKeywords].join(', ')}.`
    : undefined;

  return { days: dayResults, grocery_list: [], ...(fridgeNote ? { fridgeNote } : {}) };
}

// ─── Zone mapping ─────────────────────────────────────────────────────────────

export const ZONE_CUISINE_MAP: Record<string, string[]> = {
  West:  ['Maharashtrian', 'Goan', 'Gujarati', 'Malvani', 'Konkani', 'Sindhi'],
  North: ['Punjabi', 'Awadhi', 'Kashmiri', 'Himachali', 'Rajasthani', 'Bihari', 'Uttarakhandi'],
  South: ['Tamil', 'Kerala', 'Karnataka', 'Andhra', 'Hyderabadi', 'Telangana'],
  East:  ['Bengali', 'Odia', 'Assamese', 'Manipuri', 'Chhattisgarhi'],
};

function getZoneForCuisines(cuisines: string[]): string[] {
  const lower = cuisines.map(c => c.toLowerCase());
  const union = new Set<string>();
  for (const members of Object.values(ZONE_CUISINE_MAP)) {
    if (lower.some(c => members.map(m => m.toLowerCase()).includes(c))) {
      members.forEach(m => union.add(m));
    }
  }
  return union.size > 0 ? [...union] : ZONE_CUISINE_MAP['West'];
}

// ─── 3-day sample plan generator (no Claude call) ────────────────────────────

export async function generate3DaySamplePlan(params: {
  userId: string;
  cuisines: string[];
  foodPref: 'veg' | 'nonveg';
  onProgress?: (completed: number) => void;
}): Promise<MealPlanDayV4[]> {
  const { cuisines, foodPref, onProgress } = params;

  // Zone-filtered cuisine list: user selections + all sibling cuisines from matching zones
  const zoneCuisines = getZoneForCuisines(cuisines);
  const allCuisines = [...new Set([...cuisines, ...zoneCuisines])];

  // Helper: query one dish for a slot, excluding already-used names
  async function pickDish(
    slot: string,
    requireNonVeg: boolean,
    usedDishNames: Set<string>,
  ): Promise<DishSlot> {
    let query = supabase
      .from('dishes')
      .select('name, cuisine, is_veg')
      .filter('slot', 'cs', `{${slot}}`)
      .filter('cuisine', 'ov', `{${allCuisines.join(',')}}`)
      .not('name', 'in', `(${[...usedDishNames].map(n => `"${n}"`).join(',') || '""'})`);

    if (requireNonVeg) {
      query = query.eq('is_veg', false);
    } else if (foodPref === 'veg') {
      query = query.eq('is_veg', true);
    }

    const { data } = await query.limit(50);
    if (!data || data.length === 0) {
      // Fallback: same slot, any cuisine, ignore used
      const { data: fallback } = await supabase
        .from('dishes')
        .select('name, cuisine, is_veg')
        .filter('slot', 'cs', `{${slot}}`)
        .limit(20);
      const row = fallback?.[Math.floor(Math.random() * (fallback?.length ?? 1))] ?? { name: slot, cuisine: 'Various' };
      usedDishNames.add(row.name);
      return { dishName: row.name, cuisine: row.cuisine, slot };
    }

    const row = data[Math.floor(Math.random() * data.length)];
    usedDishNames.add(row.name);
    return { dishName: row.name, cuisine: row.cuisine, slot };
  }

  // 3 days starting today
  const today = new Date();
  const usedDishNames = new Set<string>();
  const dayResults: MealPlanDayV4[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const date    = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const isVegDay = dayName === 'Saturday' || foodPref === 'veg';
    const wantNonVeg = foodPref === 'nonveg' && !isVegDay;

    // Sequential picks so usedDishNames is updated between each query (dedup correctness)
    const breakfast   = await pickDish('breakfast',    false,       usedDishNames);
    const lunchCurry  = await pickDish('lunch_curry',  wantNonVeg,  usedDishNames);
    const lunchSabzi  = await pickDish('veg_side',     false,       usedDishNames);
    const lunchBread  = await pickDish('bread',        false,       usedDishNames);
    const lunchRaita  = await pickDish('raita',        false,       usedDishNames);
    const lunchRice   = await pickDish('rice',         false,       usedDishNames);
    const dinnerCurry = await pickDish('dinner_curry', wantNonVeg,  usedDishNames);
    const dinnerSabzi = await pickDish('veg_side',     false,       usedDishNames);
    const dinnerBread = await pickDish('bread',        false,       usedDishNames);
    const dinnerRaita = await pickDish('raita',        false,       usedDishNames);
    const dinnerRice  = await pickDish('rice',         false,       usedDishNames);

    dayResults.push({
      date,
      dayName,
      breakfast,
      lunch:  { curry: lunchCurry,  sabzi: lunchSabzi,  bread: lunchBread,  raita: lunchRaita,  rice: lunchRice  },
      dinner: { curry: dinnerCurry, sabzi: dinnerSabzi, bread: dinnerBread, raita: dinnerRaita, rice: dinnerRice },
    });
    onProgress?.(i + 1);
  }

  return dayResults;
}
