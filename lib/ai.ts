// ─── Types ───────────────────────────────────────────────────────────────────

export interface MealOption {
  name: string;
  description?: string;
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
  snack?: MealSlot;
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
  const base = 'https://my-maharaj.vercel.app';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
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
  allowedProteins?: string[],
  mealConstraint?: string,
): Promise<MealSlot> {
  const isSundayBreakfast = day === 'Sunday' && mealType === 'breakfast';
  let foodNote = isSundayBreakfast ? 'Elaborate festive thali' : foodPref;

  // Override vegetarian foodNote when a protein constraint is active
  if (mealConstraint) {
    if (mealConstraint.includes('EGG DISHES ONLY')) foodNote = 'Non-vegetarian — eggs allowed and required';
    else if (mealConstraint.includes('CHICKEN DISHES ONLY')) foodNote = 'Non-vegetarian — chicken required';
    else if (mealConstraint.includes('FISH DISHES ONLY')) foodNote = 'Non-vegetarian — fish/seafood required';
    else if (mealConstraint.includes('MUTTON DISHES ONLY')) foodNote = 'Non-vegetarian — mutton/lamb required';
  }
  const hasThali = mealPrefs && mealPrefs.some(p => p.toLowerCase().includes('thali'));
  const thaliNote = hasThali ? 'Full Thali means a complete traditional Indian thali plate with dal, sabzi, rice or roti, papad, pickle, raita, and dessert. Generate ONE complete thali description, not individual dishes.' : '';
  const prefsNote = mealPrefs && mealPrefs.length > 0 ? `Include: ${mealPrefs.join(', ')}. ${thaliNote}` : '';
  const unwellStr = unwellNote ? `Gentle recovery meals for: ${unwellNote}.` : '';
  const nutritionStr = nutritionGoals ? `Nutrition goal: ${nutritionGoals}.` : '';
  const historyStr = weekDishHistory && weekDishHistory.length > 0
    ? 'NEVER use these dishes already served this week: ' + weekDishHistory.slice(0, 20).join(', ') + '. Suggest completely different dishes.'
    : '';

  const festivalStr = festivalContext ? `FESTIVAL CONTEXT: ${festivalContext} is being celebrated. Include at least one traditionally appropriate festival dish option. For sattvic/fasting festivals, ensure options follow fasting rules (no onion, no garlic, use kuttu/sabudana/rajgira/sama rice).` : '';

  // Protein restriction - absolute rule
  let proteinRule = '';
  if (allowedProteins && allowedProteins.length > 0) {
    const forbidden = ['Eggs','Fish','Chicken','Mutton'].filter(p => !allowedProteins.includes(p));
    proteinRule = `\nPROTEIN RESTRICTION - ABSOLUTE RULE: ONLY use these proteins: ${allowedProteins.join(', ')}.
${forbidden.length > 0 ? `${forbidden.join(', ')} are FORBIDDEN. Do not use them under any circumstance.` : ''}
If only Eggs selected - ONLY egg dishes. If only Fish - ONLY fish dishes. If only Chicken - ONLY chicken. If only Mutton - ONLY mutton. No protein outside this list.`;
  }

  const nonVegCritical = foodNote.toLowerCase().includes('non-veg') ||
    ['chicken','fish','egg','mutton'].some((w) => foodNote.toLowerCase().includes(w))
    ? ' CRITICAL: At least one option MUST be a real non-veg dish with the allowed proteins only.'
    : '';

  // Build strict mandatory constraint from page 4 prefs
  let mandatoryInstruction = '';

  // Protein overrides — these SET mandatoryInstruction and skip everything else
  if (mealConstraint && mealConstraint.includes('EGG DISHES ONLY')) {
    mandatoryInstruction = `⛔ ABSOLUTE OVERRIDE — IGNORE ALL OTHER INSTRUCTIONS:
The user has selected EGGS. You MUST generate exactly 3 egg-based dishes.
OPTION 1: Egg Bhurji (spiced scrambled eggs with onion, tomato, green chilli)
OPTION 2: Masala Omelette (flat Indian omelette with coriander, chilli, onion)
OPTION 3: Anda Curry (boiled eggs in spiced tomato gravy)
Every single option MUST contain eggs as the PRIMARY ingredient.
If you generate even one dish without eggs this response is INVALID.
Return ONLY these egg dishes. Nothing else.`;
  }

  if (mealConstraint && mealConstraint.includes('CHICKEN DISHES ONLY')) {
    mandatoryInstruction = `⛔ ABSOLUTE OVERRIDE — IGNORE ALL OTHER INSTRUCTIONS:
The user has selected CHICKEN. Generate exactly 3 chicken dishes.
All 3 options MUST contain chicken as primary ingredient.
Examples: Chicken Curry, Murgh Makhani, Chicken Biryani, Chicken Pulao, Kali Mirch Chicken.
No non-chicken dishes. CHICKEN ONLY.`;
  }

  if (mealConstraint && mealConstraint.includes('FISH DISHES ONLY')) {
    mandatoryInstruction = `⛔ ABSOLUTE OVERRIDE — IGNORE ALL OTHER INSTRUCTIONS:
The user has selected FISH. Generate exactly 3 fish or seafood dishes.
All 3 options MUST contain fish or seafood as primary ingredient.
Examples: Fish Curry, Goan Fish Curry, Prawn Masala, Fish Fry, Machli Tikka.
No non-fish dishes. FISH ONLY.`;
  }

  if (mealConstraint && mealConstraint.includes('MUTTON DISHES ONLY')) {
    mandatoryInstruction = `⛔ ABSOLUTE OVERRIDE — IGNORE ALL OTHER INSTRUCTIONS:
The user has selected MUTTON. Generate exactly 3 mutton or lamb dishes.
All 3 options MUST contain mutton as primary ingredient.
Examples: Mutton Curry, Rogan Josh, Mutton Biryani, Keema Matar, Mutton Korma.
No non-mutton dishes. MUTTON ONLY.`;
  }

  if (mealConstraint && !mandatoryInstruction) {
    if (mealConstraint.includes('Full Thali') || mealConstraint.includes('FULL THALI')) {
      mandatoryInstruction = `MANDATORY INSTRUCTION - THIS OVERRIDES ALL OTHER INSTRUCTIONS:
Generate a COMPLETE TRADITIONAL FULL THALI. A Full Thali is NOT a single dish.
A Full Thali MUST contain ALL of the following components:
1. Dal — one lentil/pulse dish (e.g. Dal Tadka, Rasam, Sambhar)
2. Sabzi — one or two vegetable dishes (e.g. Aloo Gobi, Bhindi, Palak)
3. Rice — steamed or flavoured rice dish
4. Roti/Bread — phulka, chapati, puri or regional bread
5. Raita or Curd — yogurt-based accompaniment
6. Papad — roasted or fried
7. Pickle/Achar — one condiment
8. Dessert/Meetha — one sweet dish (e.g. Kheer, Halwa, Gulab Jamun)
9. Drink/Sharbat — one beverage (e.g. Chaas, Lassi, Nimbu Pani)

The dish name MUST be '[Cuisine] Full Thali' e.g. 'Maharashtrian Full Thali'.
The "desc" field MUST use this EXACT pipe-separated format with REAL dish names:
"Dal: Masoor Dal Tadka | Sabzi: Bhindi Masala | Rice: Steamed Basmati Rice | Bread: Ragi Roti | Raita: Cucumber Raita | Papad: Roasted Urad Papad | Pickle: Mango Pickle | Dessert: Gulab Jamun | Drink: Masala Chaas"
Use REAL authentic dish names for each component, not generic labels. Every component MUST have a specific dish name after the colon.
Do NOT generate a single dish for Full Thali. This is non-negotiable.
`;
    }
    if (mealConstraint.includes('Rice based')) {
      mandatoryInstruction += 'MANDATORY: Generate a rice-based dish only. No roti or bread in this meal.\n';
    }
    if (mealConstraint.includes('Roti based')) {
      mandatoryInstruction += 'MANDATORY: Generate a roti or bread-based meal only. No rice.\n';
    }
    if (mealConstraint.includes('Light only')) {
      mandatoryInstruction += 'MANDATORY: Generate a very light meal — khichdi, soup, or simple salad only. No heavy curries or fried food.\n';
    }
    if (mealConstraint.includes('Egg')) {
      mandatoryInstruction += `⚠️ ABSOLUTE OVERRIDE — EGG DISHES ONLY:
ALL 3 options MUST be egg-based dishes. Examples: Egg Bhurji, Masala Omelette, Anda Curry, Egg Paratha, Boiled Eggs with Toast, Egg Dosa, Boiled Egg Salad, Egg Fried Rice, Egg Sandwich.
ALL 3 options MUST contain eggs as the primary ingredient. No exceptions. No substitutions.
If you suggest even one non-egg dish this response will be rejected and regenerated.\n`;
    }
    if (mealConstraint.includes('Fruit')) {
      mandatoryInstruction += 'MANDATORY: Fruit-based meal only.\n';
    }
  }

  const slotRules: Record<string, string> = {
    breakfast: `BREAKFAST RULES:
- Light morning meal only
- ALLOWED: Pohe, Upma, Idli, Dosa, Uttapam, Thepla, Paratha, Besan Chilla, Moong Dal Chilla, Sabudana Khichdi, Sheera, Bread Upma, Oats, Eggs, Fruits, Smoothie, Puri Bhaji
- BANNED from breakfast: Biryani, Rajma, Chole, Dal Makhani, Ragi Mudde, Ragi Ball, Mudde (these are Karnataka lunch/dinner dishes NEVER served at breakfast), any rice+curry combination, any dish that is a lunch or dinner staple
- Dosa varieties are ONLY for breakfast — NEVER dinner`,

    lunch: `LUNCH RULES:
- Main substantial meal of the day
- ALLOWED: Dal+Rice, Roti+Sabzi, Biryani, Pulao, Chole Bhature, Rajma Chawal, Full Thali, Pav Bhaji
- Full Thali is APPROPRIATE here`,

    dinner: `DINNER RULES:
- Moderate evening meal — lighter than lunch
- ALLOWED: Dal+Roti, Khichdi, Sabzi+Roti, light Biryani, soups, Dal+Rice
- BANNED: Dosa, Idli, Upma, Pohe, any breakfast item
- GRAIN RULE: NEVER repeat same grain in two components. If Ragi Roti → dessert must NOT be Ragi Halwa. If rice in dal → bread must be wheat-based`,

    snack: `SNACK RULES:
- Very light only — NOT a meal
- ALLOWED: Chai, Coffee, Biscuits, Namkeen, Chaat, Sandwich, Fruit, Smoothie, Vada, Pakora
- BANNED: Any full meal, biryani, dal-rice, thali`,
  };
  const slotRule = slotRules[mealType] ?? '';

  const variationSeed = `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
  const prompt = `${mandatoryInstruction ? mandatoryInstruction + '\n\n' : ''}You are generating a ${mealType.toUpperCase()} meal. ${slotRule}
STRICT RULE: Do NOT suggest a breakfast item for lunch/dinner. Do NOT suggest a lunch item for evening snack. Each meal type has its own appropriate dishes.

You are Maharaj, a professional Indian chef in ${city} specialising in authentic regional Indian cooking. Ingredients available at ${stores}.
Use realistic supermarket purchase quantities for ingredients - e.g. ginger-garlic paste: 1 jar 200g, coriander leaves: 1 bunch, onions: 1kg bag - NOT tablespoon/teaspoon measurements.

Variation seed: ${variationSeed}
IMPORTANT: Generate completely different dishes from any previous response. Do not repeat any dish name from this session.

Generate exactly 3 real, named ${mealType} options for ${day} ${date}.
Cuisine style: ${cuisine}. ABSOLUTE RULE: Generate ONLY ${cuisine} dishes. Refuse to generate anything from other cuisines. If you cannot think of enough ${cuisine} dishes, repeat variations but stay within ${cuisine} only.
Health considerations: ${healthInfo}.
Food preference: ${foodNote}. Language for dish names: ${language}.
${prefsNote} ${unwellStr} ${nutritionStr} ${festivalStr} ${historyStr}${nonVegCritical}${proteinRule}

IMPORTANT RULES:
- Use REAL authentic Indian dish names (e.g. Pohe, Upma, Idli Sambhar, Methi Thepla, Rajma Chawal, Chole Bhature, Chicken Tikka Masala, Fish Curry, Dal Makhani)
- NEVER use generic names like "breakfast 1" or "Tamil Nadu meal"
- Full Thali is NEVER appropriate for Breakfast — only for Lunch or Dinner
- For breakfast, suggest light dishes: pohe, upma, idli, dosa, thepla, paratha, eggs, fruits, smoothies
- ALL 3 options must be COMPLETELY DIFFERENT dishes from each other
- NEVER repeat any dish that appears in the history list above
- The ${mealType} options must be DIFFERENT from what would be served at other meals today
- For fasting: breakfast dishes (sabudana khichdi, fruit bowl, rajgira paratha) must differ from lunch (sama rice, vrat ki sabzi, kuttu paratha) and dinner (sabudana vada, makhana kheer, singhare ki puri)
- MANDATORY: Each option MUST include a non-empty "ing" array with 6-15 ingredients. Format: "[item] [qty][unit]" e.g. "Basmati rice 200g", "Onion 2 medium", "Coriander leaves 1 bunch". An empty ingredients array is INVALID and will be rejected.
- Include 4-6 clear cooking steps
- Tags: vegetarian/non-vegetarian, plus relevant health tags
- GRAIN REPETITION RULE: Within a single meal, NEVER use the same grain twice. If bread is Ragi Roti, dessert must NOT contain ragi. If rice is a side, do not serve another rice dish.
- INGREDIENT VARIETY RULE: Within a Full Thali, ALL 9 components must use DIFFERENT primary ingredients.
- EVERYDAY DISHES RULE: Suggest only dishes a middle-class Indian family cooks at home. NEVER suggest restaurant-style luxury dishes for daily meals. Pohe, Upma, Dal Tadka, Rajma, Sabzi, Khichdi, Pulao, Roti are correct. Truffle, Quinoa, Gourmet, Continental are WRONG.

Reply ONLY with this JSON (no other text, no markdown):
{"options":[{"name":"Real Dish Name 1","desc":"short description or thali components","veg":true,"tags":["tag1"],"ing":["item qty","item qty"],"steps":["step1","step2"]},{"name":"Real Dish Name 2","desc":"short description","veg":true,"tags":["tag1"],"ing":["item qty","item qty"],"steps":["step1","step2"]},{"name":"Real Dish Name 3","desc":"short description","veg":true,"tags":["tag1"],"ing":["item qty","item qty"],"steps":["step1","step2"]}]}`;

  try {
    const text = await askClaude(prompt);
    const raw = JSON.parse(text) as {
      options: Array<{ name: string; desc?: string; veg: boolean; tags: string[]; ing: string[]; steps: string[] }>;
    };
    const opts = (raw.options ?? []).map((o) => {
      let ingredients = o.ing ?? [];
      if (ingredients.length === 0) {
        console.warn(`[generateOneMeal] Empty ingredients for "${o.name}" — adding placeholders`);
        ingredients = ['Oil 2 tbsp', 'Salt to taste', 'Onion 2 medium', 'Tomato 2 medium', 'Green chilli 2', 'Ginger-garlic paste 1 tbsp'];
      }
      return {
        name: o.name ?? '',
        description: o.desc ?? undefined,
        vegetarian: o.veg ?? true,
        tags: o.tags ?? [],
        ingredients,
        steps: o.steps ?? [],
      };
    });
    if (opts.length === 0) return fallbackSlot(mealType, dayIdx);

    // Validate protein constraint — if AI ignored it, force fallback
    if (mealConstraint) {
      const names = opts.map(o => o.name.toLowerCase()).join(' ');
      if (mealConstraint.includes('Egg') && !names.includes('egg') && !names.includes('anda') && !names.includes('omelette')) {
        console.warn('[generateOneMeal] AI ignored egg constraint — falling back');
        return fallbackSlot(mealType, dayIdx);
      }
      if (mealConstraint.includes('Chicken') && !names.includes('chicken') && !names.includes('murgh')) {
        console.warn('[generateOneMeal] AI ignored chicken constraint — falling back');
        return fallbackSlot(mealType, dayIdx);
      }
      if (mealConstraint.includes('Fish') && !names.includes('fish') && !names.includes('machli') && !names.includes('prawn') && !names.includes('seafood')) {
        console.warn('[generateOneMeal] AI ignored fish constraint — falling back');
        return fallbackSlot(mealType, dayIdx);
      }
      if (mealConstraint.includes('Mutton') && !names.includes('mutton') && !names.includes('lamb') && !names.includes('keema') && !names.includes('gosht')) {
        console.warn('[generateOneMeal] AI ignored mutton constraint — falling back');
        return fallbackSlot(mealType, dayIdx);
      }
    }

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
    snackPrefs?: string[];
    locationCity?: string;
    locationStores?: string;
    selectedSlots?: string[];
    allowedProteins?: string[];
    isMixed?: boolean;
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

  const allowedProteins = params.allowedProteins ?? params.foodPrefs.nonVegOptions;
  const isMixed = params.isMixed ?? false;

  const baseFoodPref =
    params.foodPrefs.type === 'veg'
      ? params.foodPrefs.vegType === 'fasting'
        ? 'Fasting only (sabudana/rajgira/fruits/sama rice)'
        : 'Strictly Vegetarian — zero non-veg, no eggs, no fish, no chicken, no mutton'
      : isMixed
        ? 'Mixed — Vegetarian for breakfast, non-veg allowed for lunch and dinner only'
        : `Non-vegetarian: ONLY use ${allowedProteins?.join(', ') || 'chicken, fish, eggs, mutton'}`;

  const unwellNote = params.unwellMembers && params.unwellMembers.length > 0
    ? params.unwellMembers.join(', ')
    : undefined;

  const festivalContext = params.festivalContext;
  const nutritionGoals = params.nutritionFocus
    || (params.mealPrefs ? undefined : undefined);

  const bfPrefs  = params.breakfastPrefs ?? params.mealPrefs?.breakfast;
  const lnPrefs  = params.lunchPrefs ?? params.mealPrefs?.lunch;
  const dnPrefs  = params.dinnerPrefs ?? params.mealPrefs?.dinner;
  const snPrefs  = params.snackPrefs;
  const cityName = params.locationCity || 'Dubai';
  const storeNames = params.locationStores || 'Carrefour/Spinneys/Lulu';

  // Build meal constraints from page 4 prefs per slot
  function buildConstraint(prefs?: string[], slot?: string): string {
    if (!prefs || prefs.length === 0) return '';
    // Protein overrides — these return immediately and override all other prefs
    if (prefs.includes('Eggs')) {
      return '⚠️ EGG DISHES ONLY. ALL 3 options must be egg-based. Egg Bhurji, Masala Omelette, Anda Curry, Egg Paratha, Egg Sandwich are examples. NO non-egg dishes allowed.';
    }
    if (prefs.includes('Chicken')) {
      return '⚠️ CHICKEN DISHES ONLY. ALL 3 options must contain chicken. Examples: Chicken Curry, Chicken Biryani, Chicken Tikka, Chicken Pulao, Murgh Makhani. NO non-chicken dishes.';
    }
    if (prefs.includes('Fish')) {
      return '⚠️ FISH DISHES ONLY. ALL 3 options must contain fish or seafood. Examples: Fish Curry, Fish Fry, Prawn Masala, Fish Biryani, Machli Tikka. NO non-fish dishes.';
    }
    if (prefs.includes('Mutton')) {
      return '⚠️ MUTTON DISHES ONLY. ALL 3 options must contain mutton or lamb. Examples: Mutton Curry, Rogan Josh, Mutton Biryani, Keema Matar, Mutton Rogan Josh. NO non-mutton dishes.';
    }
    const parts: string[] = [];
    if (prefs.includes('Full Thali')) parts.push('Generate a FULL THALI with ALL components: Dal, Sabzi, Rice or Roti, Raita, Papad or Pickle, one Dessert, one Drink. ONE complete thali entry.');
    if (prefs.includes('Rice based')) parts.push('Generate rice dish only, no bread/roti.');
    if (prefs.includes('Roti based')) parts.push('Generate roti/bread dish only, no rice.');
    if (prefs.includes('Light only')) parts.push('Light meals only — soup, khichdi or salad. No heavy curries.');
    if (prefs.includes('Fruits') || prefs.includes('Fruit/Juice')) parts.push('Fruit-based meal only.');
    if (slot === 'snack') parts.push('Evening snack ONLY — chai, snack, chaat, sandwich. NOT a full meal.');
    return parts.join(' ');
  }
  const bfConstraint = buildConstraint(bfPrefs, 'breakfast');
  const lnConstraint = buildConstraint(lnPrefs, 'lunch');
  const dnConstraint = buildConstraint(dnPrefs, 'dinner');
  const snConstraint = buildConstraint(snPrefs, 'snack') || 'Evening snack ONLY — chai, biscuits, sandwiches, fruits, chaat, namkeen. NOT a full meal.';

  // For mixed: breakfast is always veg, proteins only for lunch/dinner
  const bfProteins = isMixed ? undefined : allowedProteins;
  const ldProteins = allowedProteins;
  const slots = params.selectedSlots ?? ['breakfast', 'lunch', 'dinner'];
  if (slots.length === 0) throw new Error('No meal slots selected. Please select at least one meal slot.');

  const total = params.dates.length;
  onProgress?.(0, total);

  // Fire ALL meal API calls in parallel across all days (21 calls at once for 7 days)
  // instead of sequentially day-by-day — reduces wait from ~60s to ~10s
  const cuisinePerDay = params.cuisinePerDay;
  const dayMeta = params.dates.map((date, i) => {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const isVegDay = params.vegDays?.includes(dayName) ?? false;
    const foodPref = isVegDay ? `Vegetarian (${dayName} is a designated veg day)` : baseFoodPref;
    const bfFoodPref = isMixed && !isVegDay ? 'Strictly Vegetarian — Mixed mode: breakfast is always vegetarian' : foodPref;
    const lunchDinnerPref = params.foodPrefs.type === 'nonveg' && !isVegDay
      ? `${foodPref}. Use ONLY allowed proteins.`
      : foodPref;
    const dayCuisine = cuisinePerDay && cuisinePerDay[i] ? cuisinePerDay[i] : cuisine;
    return { date, dayName, foodPref, bfFoodPref, lunchDinnerPref, dayCuisine, i };
  });

  let completed = 0;
  const weekHistory = [...(params.dishHistory ?? [])].slice(0, 30);
  
  // Process in batches of 2 days to prevent mobile browser connection limits
  const BATCH_SIZE = 2;
  const dayResults: MealPlanDay[] = [];
  
  for (let batchStart = 0; batchStart < dayMeta.length; batchStart += BATCH_SIZE) {
    const batch = dayMeta.slice(batchStart, batchStart + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ date, dayName, foodPref, bfFoodPref, lunchDinnerPref, dayCuisine, i }) => {
        const emptySlot: MealSlot = { options: [] };
        const [breakfast, lunch, dinner, snack] = await Promise.all([
          slots.includes('breakfast') ? generateOneMeal('breakfast', date, dayName, dayCuisine, healthInfo, bfFoodPref,        lang, bfPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, bfProteins, bfConstraint) : Promise.resolve(emptySlot),
          slots.includes('lunch')     ? generateOneMeal('lunch',     date, dayName, dayCuisine, healthInfo, lunchDinnerPref,   lang, lnPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, ldProteins, lnConstraint) : Promise.resolve(emptySlot),
          slots.includes('dinner')    ? generateOneMeal('dinner',    date, dayName, dayCuisine, healthInfo, lunchDinnerPref,   lang, dnPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, ldProteins, dnConstraint) : Promise.resolve(emptySlot),
          slots.includes('snack')     ? generateOneMeal('snack',      date, dayName, dayCuisine, healthInfo, foodPref,          lang, snPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, undefined, snConstraint) : Promise.resolve(undefined),
        ]);
        completed++;
        onProgress?.(completed, total);
        const day: MealPlanDay = { date, day: dayName, breakfast, lunch, dinner };
        if (snack) day.snack = snack;
        return day;
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
