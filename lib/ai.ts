// ─── Types ───────────────────────────────────────────────────────────────────

export interface MealOption {
  name: string;
  vegetarian: boolean;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

export interface MealSlot {
  options: MealOption[];
}

export interface MealPlanDay {
  date: string;
  day: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
}

export interface GroceryItem {
  name: string;
  qty: string;
  category: string;
}

export interface MealPlanResult {
  days: MealPlanDay[];
  grocery_list?: GroceryItem[];
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

// ─── Core API call — uses /api/claude proxy (works on Vercel, no browser key needed) ──

async function askClaude(prompt: string): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '{}';
  return text.replace(/```json|```/g, '').trim();
}

// ─── Fallback ────────────────────────────────────────────────────────────────

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

// ─── Per-meal generator ───────────────────────────────────────────────────────

async function generateOneMeal(
  mealType: string,
  date: string,
  day: string,
  cuisine: string,
  healthInfo: string,
  foodPref: string,
  language: string,
  mealPrefs?: string[],
  unwellNote?: string,
  nutritionGoals?: string,
  dayIdx = 0,
  festivalContext?: string,
  weekDishHistory?: string[],
  city = 'Dubai',
  stores = 'Carrefour/Spinneys/Lulu',
): Promise<MealSlot> {
  const isSundayBreakfast = day === 'Sunday' && mealType === 'breakfast';
  const foodNote = isSundayBreakfast ? 'Elaborate festive thali' : foodPref;
  const prefsNote = mealPrefs && mealPrefs.length > 0 ? `Include: ${mealPrefs.join(', ')}.` : '';
  const unwellStr = unwellNote ? `Gentle recovery meals for: ${unwellNote}.` : '';
  const nutritionStr = nutritionGoals ? `Nutrition goal: ${nutritionGoals}.` : '';
  const historyStr = weekDishHistory && weekDishHistory.length > 0
    ? 'NEVER use these dishes already served this week: ' + weekDishHistory.slice(0, 20).join(', ') + '. Suggest completely different dishes.'
    : '';

  const festivalStr = festivalContext ? `FESTIVAL CONTEXT: ${festivalContext} is being celebrated. Include at least one traditionally appropriate festival dish option. For sattvic/fasting festivals, ensure options follow fasting rules (no onion, no garlic, use kuttu/sabudana/rajgira/sama rice).` : '';

  const nonVegCritical = foodNote.toLowerCase().includes('non-veg') ||
    ['chicken','fish','egg','mutton'].some((w) => foodNote.toLowerCase().includes(w))
    ? ' CRITICAL: At least one option MUST be a real non-veg dish with chicken/fish/eggs/mutton.'
    : '';

  const prompt = `You are Maharaj, a professional Indian chef in ${city} specialising in authentic regional Indian cooking. Ingredients available at ${stores}.

Generate exactly 3 real, named ${mealType} options for ${day} ${date}.
Cuisine style: ${cuisine}. Health considerations: ${healthInfo}.
Food preference: ${foodNote}. Language for dish names: ${language}.
${prefsNote} ${unwellStr} ${nutritionStr} ${festivalStr} ${historyStr}${nonVegCritical}

IMPORTANT RULES:
- Use REAL authentic Indian dish names (e.g. Pohe, Upma, Idli Sambhar, Methi Thepla, Rajma Chawal, Chole Bhature, Chicken Tikka Masala, Fish Curry, Dal Makhani)
- NEVER use generic names like "breakfast 1" or "Tamil Nadu meal"
- Full Thali is NEVER appropriate for Breakfast — only for Lunch or Dinner
- For breakfast, suggest light dishes: pohe, upma, idli, dosa, thepla, paratha, eggs, fruits, smoothies
- ALL 3 options must be COMPLETELY DIFFERENT dishes from each other
- NEVER repeat any dish that appears in the history list above
- The ${mealType} options must be DIFFERENT from what would be served at other meals today
- For fasting: breakfast dishes (sabudana khichdi, fruit bowl, rajgira paratha) must differ from lunch (sama rice, vrat ki sabzi, kuttu paratha) and dinner (sabudana vada, makhana kheer, singhare ki puri)
- Include 5-8 real ingredients with quantities (e.g. "Flattened rice 200g", "Onion 1 medium")
- Include 4-6 clear cooking steps
- Tags: vegetarian/non-vegetarian, plus relevant health tags

Reply ONLY with this JSON (no other text, no markdown):
{"options":[{"name":"Real Dish Name 1","veg":true,"tags":["tag1"],"ing":["item qty","item qty"],"steps":["step1","step2"]},{"name":"Real Dish Name 2","veg":true,"tags":["tag1"],"ing":["item qty","item qty"],"steps":["step1","step2"]},{"name":"Real Dish Name 3","veg":true,"tags":["tag1"],"ing":["item qty","item qty"],"steps":["step1","step2"]}]}`;

  try {
    const text = await askClaude(prompt);
    const raw = JSON.parse(text) as {
      options: Array<{ name: string; veg: boolean; tags: string[]; ing: string[]; steps: string[] }>;
    };
    const opts = (raw.options ?? []).map((o) => ({
      name: o.name ?? '',
      vegetarian: o.veg ?? true,
      tags: o.tags ?? [],
      ingredients: o.ing ?? [],
      steps: o.steps ?? [],
    }));
    if (opts.length === 0) return fallbackSlot(mealType, dayIdx);
    return { options: opts };
  } catch {
    return fallbackSlot(mealType, dayIdx);
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateMealPlan(
  params: {
    userId: string;
    dates: string[];
    healthFlags: HealthFlags;
    servings: { breakfast: number; lunch: number; dinner: number };
    appetite: string;
    language: string;
    cuisine: string;
    dishHistory: string[];
    foodPrefs: {
      type: 'veg' | 'nonveg';
      vegType?: 'normal' | 'fasting';
      nonVegOptions?: string[];
    };
    unwellMembers?: string[];
    nutritionFocus?: string;
    mealPrefs?: { breakfast?: string[]; lunch?: string[]; dinner?: string[] };
    includeTiffin?: boolean;
    tiffinMembers?: string[];
    tiffinRestrictions?: string;
    includeDessert?: boolean;
    vegDays?: string[];
    cuisinePerDay?: string[];
    festivalContext?: string;
    breakfastPrefs?: string[];
    lunchPrefs?: string[];
    dinnerPrefs?: string[];
    locationCity?: string;
    locationStores?: string;
    selectedSlots?: string[];
  },
  onProgress?: (current: number, total: number) => void,
): Promise<MealPlanResult> {
  const cuisine  = params.cuisine || 'Konkani';
  const language = params.language || 'en';
  const langName: Record<string, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati' };
  const lang     = langName[language] || 'English';

  const hf = params.healthFlags;
  const healthParts: string[] = [];
  if (hf.diabetic)         healthParts.push('Diabetic — Low GI foods');
  if (hf.bp)               healthParts.push('Low sodium');
  if (hf.pcos)             healthParts.push('No maida, PCOS-friendly');
  if (hf.cholesterol)      healthParts.push('No fried food, low cholesterol');
  if (hf.thyroid)          healthParts.push('Selenium-rich foods');
  if (hf.kidneyDisease)    healthParts.push('Low potassium & phosphorus');
  if (hf.heartDisease)     healthParts.push('Low saturated fat, heart-healthy');
  if (hf.obesity)          healthParts.push('Low calorie density');
  if (hf.anaemia)          healthParts.push('Iron-rich foods');
  if (hf.lactoseIntolerant)healthParts.push('No dairy');
  if (hf.glutenIntolerant) healthParts.push('No gluten');
  const healthInfo = healthParts.length > 0 ? healthParts.join('; ') : 'Normal healthy';

  const baseFoodPref =
    params.foodPrefs.type === 'veg'
      ? params.foodPrefs.vegType === 'fasting'
        ? 'Fasting only (sabudana/rajgira/fruits/sama rice)'
        : 'Vegetarian'
      : `Non-vegetarian: include ${params.foodPrefs.nonVegOptions?.join(', ') || 'chicken, fish, eggs, mutton'}`;

  const unwellNote = params.unwellMembers && params.unwellMembers.length > 0
    ? params.unwellMembers.join(', ')
    : undefined;

  const festivalContext = params.festivalContext;
  const nutritionGoals = params.nutritionFocus
    || (params.mealPrefs ? undefined : undefined);

  const bfPrefs  = params.breakfastPrefs ?? params.mealPrefs?.breakfast;
  const lnPrefs  = params.lunchPrefs ?? params.mealPrefs?.lunch;
  const dnPrefs  = params.dinnerPrefs ?? params.mealPrefs?.dinner;
  const cityName = params.locationCity || 'Dubai';
  const storeNames = params.locationStores || 'Carrefour/Spinneys/Lulu';
  const slots = params.selectedSlots && params.selectedSlots.length > 0
    ? params.selectedSlots
    : ['breakfast', 'lunch', 'dinner'];

  const total = params.dates.length;
  onProgress?.(0, total);

  // Fire ALL meal API calls in parallel across all days (21 calls at once for 7 days)
  // instead of sequentially day-by-day — reduces wait from ~60s to ~10s
  const cuisinePerDay = params.cuisinePerDay;
  const dayMeta = params.dates.map((date, i) => {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const isVegDay = params.vegDays?.includes(dayName) ?? false;
    const foodPref = isVegDay ? `Vegetarian (${dayName} is a designated veg day)` : baseFoodPref;
    const lunchDinnerPref = params.foodPrefs.type === 'nonveg' && !isVegDay
      ? `${foodPref}. Mix veg and non-veg naturally across the week.`
      : foodPref;
    const dayCuisine = cuisinePerDay && cuisinePerDay[i] ? cuisinePerDay[i] : cuisine;
    return { date, dayName, foodPref, lunchDinnerPref, dayCuisine, i };
  });

  let completed = 0;
  const weekHistory = [...(params.dishHistory ?? [])].slice(0, 30);
  
  // Process in batches of 2 days to prevent mobile browser connection limits
  const BATCH_SIZE = 2;
  const dayResults: MealPlanDay[] = [];
  
  for (let batchStart = 0; batchStart < dayMeta.length; batchStart += BATCH_SIZE) {
    const batch = dayMeta.slice(batchStart, batchStart + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ date, dayName, foodPref, lunchDinnerPref, dayCuisine, i }) => {
        const [breakfast, lunch, dinner] = await Promise.all([
          slots.includes('breakfast') ? generateOneMeal('breakfast', date, dayName, dayCuisine, healthInfo, foodPref,          lang, bfPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames) : Promise.resolve(fallbackSlot('breakfast', i)),
          slots.includes('lunch')     ? generateOneMeal('lunch',     date, dayName, dayCuisine, healthInfo, lunchDinnerPref,   lang, lnPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames) : Promise.resolve(fallbackSlot('lunch', i)),
          slots.includes('dinner')    ? generateOneMeal('dinner',    date, dayName, dayCuisine, healthInfo, lunchDinnerPref,   lang, dnPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames) : Promise.resolve(fallbackSlot('dinner', i)),
        ]);
        completed++;
        onProgress?.(completed, total);
        return { date, day: dayName, breakfast, lunch, dinner };
      })
    );
    dayResults.push(...batchResults);
  }

  const days: MealPlanDay[] = dayResults;  // batched results
  const allIngredients: string[] = [];
  days.forEach(({ breakfast, lunch, dinner }) => {
    [breakfast, lunch, dinner].forEach((slot) =>
      slot.options.forEach((opt) =>
        opt.ingredients.forEach((ing) => allIngredients.push(ing))
      )
    );
  });

  // Build grocery list
  const seen = new Set<string>();
  const grocery_list: GroceryItem[] = [];
  allIngredients.forEach((ing) => {
    const key = ing.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      grocery_list.push({ name: ing, qty: '', category: 'general' });
    }
  });

  return { days, grocery_list };
}
