import { getRelevantDishes, formatDishesForPrompt } from './dishRag';

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

const BASE = 'https://my-maharaj.vercel.app';

async function askClaude(prompt: string): Promise<string> {
  // Try streaming first for faster TTFB, fall back to non-streaming
  try {
    const text = await askClaudeStream(prompt);
    if (text) return text;
  } catch { /* fall through to non-streaming */ }

  const res = await fetch(`${BASE}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
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
  // Parse SSE events to extract text
  const textParts: string[] = [];
  for (const line of full.split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const evt = JSON.parse(line.slice(6));
      if (evt.type === 'content_block_delta' && evt.delta?.text) textParts.push(evt.delta.text);
    } catch { /* skip unparseable lines */ }
  }
  const text = textParts.join('');
  if (!text) throw new Error('No text in stream');
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
  ragContext?: string,
): Promise<MealSlot> {
  const isSundayBreakfast = day === 'Sunday' && mealType === 'breakfast';
  const foodNote = isSundayBreakfast ? 'Elaborate festive thali' : foodPref;
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

  const isNonVeg = foodNote.toLowerCase().includes('non-veg') ||
    ['chicken','fish','egg','mutton'].some((w) => foodNote.toLowerCase().includes(w));
  const nonVegCritical = isNonVeg
    ? ' CRITICAL: User is NON-VEGETARIAN. You MUST include meat/fish/eggs in at least one option. Never generate an all-vegetarian set for a non-vegetarian user. Use ONLY allowed proteins.'
    : '';

  // Build strict mandatory constraint from page 4 prefs
  let mandatoryInstruction = '';
  if (mealConstraint) {
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
      mandatoryInstruction += 'MANDATORY: Egg-based dishes only for this meal.\n';
    }
    if (mealConstraint.includes('Fruit')) {
      mandatoryInstruction += 'MANDATORY: Fruit-based meal only.\n';
    }
  }

  const slotRules: Record<string, string> = {
    breakfast: 'BREAKFAST: Light morning meal. Examples: Pohe, Upma, Idli, Thepla, Paratha, Eggs, Fruits, Smoothie. NEVER suggest rice-based lunch dishes or heavy curries.',
    lunch: 'LUNCH: Main meal of the day. Can be substantial. Full Thali is appropriate here.',
    dinner: 'DINNER: Moderate evening meal. Lighter than lunch but not as light as snack. Dal-rice, roti-sabzi, biryani etc.',
    snack: 'EVENING SNACK: Very light. Tea, coffee, biscuits, chaat, sandwich, fruit only. NOT a meal.',
  };
  const slotRule = slotRules[mealType] ?? '';

  const variationSeed = `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;

  // FIX 6: Updated ABSOLUTE RULE 1 with realistic non-veg description
  const fp = foodPref.toLowerCase();
  const isNonVegPref = fp.includes('non-veg') || fp.includes('chicken') || fp.includes('mutton') || fp.includes('fish') || fp.includes('egg');
  const dietaryAbsoluteRule = isNonVegPref
    ? `ABSOLUTE RULE 1 — DIETARY: This user is NON-VEGETARIAN.
Every day must include AT LEAST ONE non-vegetarian dish (chicken, mutton, fish, eggs or seafood).
Remaining meals may be vegetarian — dal, sabzi, roti, rice alongside non-veg is natural and correct.
NEVER suggest Jain dishes. This user eats onion, garlic and root vegetables normally.`
    : fp.includes('jain')
    ? `ABSOLUTE RULE 1 — DIETARY: This user is JAIN. No meat, fish, eggs, onion, garlic, potato, carrot, beetroot, radish or turnip in any dish under any circumstances.`
    : `ABSOLUTE RULE 1 — DIETARY: This user is VEGETARIAN. No meat, fish or eggs in any dish.
NEVER suggest Jain dishes unless the user has explicitly selected Jain cuisine. This user eats onion, garlic and root vegetables normally.`;

  // BUG 4 FIX: No-repeat rule is SECOND line — immediately after dietary
  const uniquenessAbsoluteRule = weekDishHistory && weekDishHistory.length > 0
    ? `ABSOLUTE RULE 2 — UNIQUENESS: These dishes are ALREADY USED. You MUST NOT use any of them: ${weekDishHistory.join(', ')}. Using a repeated dish is a FAILURE.`
    : '';

  // FIX 2: ABSOLUTE RULE 3 — Cuisine enforcement
  const cuisineEnforcement = cuisine && cuisine !== 'Various'
    ? `ABSOLUTE RULE 3 — CUISINE: User selected ${cuisine} cuisine. You MUST generate ${cuisine} dishes ONLY. Do not generate dishes from other cuisines. Stick strictly to what the user asked for.`
    : '';

  // Cuisine-specific examples for hard gate
  const cuisineExamples: Record<string, string> = {
    'Punjabi': 'Punjabi examples: Dal Makhani, Butter Chicken, Sarson da Saag, Makki di Roti, Rajma Chawal, Amritsari Kulcha, Chole Bhature, Kadhi Pakora, Aloo Paratha, Palak Paneer.',
    'Delhi': 'Delhi examples: Chole Kulche, Paranthe Wali Gali, Dahi Bhalle, Aloo Tikki, Ram Ladoo, Nihari, Jalebi.',
    'Lucknowi': 'Lucknowi examples: Galouti Kebab, Dum Biryani, Nihari, Sheermal, Kakori Kebab, Shami Kebab.',
    'Awadhi': 'Awadhi examples: Shami Kebab, Korma, Yakhni Pulao, Warqi Paratha, Dum ka Murgh.',
    'Mughlai': 'Mughlai examples: Butter Chicken, Biryani, Seekh Kebab, Korma, Shahi Paneer, Roomali Roti.',
    'Maharashtrian': 'Maharashtrian examples: Varan Bhaat, Pithla Bhakri, Misal Pav, Puran Poli, Bharli Vangi, Sabudana Khichdi.',
    'Gujarati': 'Gujarati examples: Dhokla, Thepla, Undhiyu, Fafda, Khakhra, Gujarati Kadhi, Dal Dhokli.',
    'Bengali': 'Bengali examples: Shorshe Ilish, Kosha Mangsho, Macher Jhol, Luchi Alur Dom, Chingri Malaikari.',
    'Rajasthani': 'Rajasthani examples: Dal Baati Churma, Laal Maas, Gatte ki Sabzi, Ker Sangri, Pyaaz Kachori.',
    'South Indian': 'South Indian examples: Idli Sambhar, Masala Dosa, Rasam Rice, Ven Pongal, Avial, Appam.',
    'Tamil Nadu': 'Tamil Nadu examples: Sambhar, Rasam, Pongal, Dosa, Idli, Chettinad Chicken, Kootu.',
    'Kerala': 'Kerala examples: Appam Stew, Puttu Kadala, Fish Moilee, Avial, Erissery, Prawn Gassi.',
    'Indo-Chinese': 'Indo-Chinese examples: Chilli Chicken, Hakka Noodles, Gobi Manchurian, Fried Rice, Schezwan Noodles.',
    'Kashmiri': 'Kashmiri examples: Rogan Josh, Dum Aloo, Yakhni, Gushtaba, Modur Pulao, Haak.',
  };
  const cuisineHints = cuisineExamples[cuisine] || '';

  const prompt = `You are My Maharaj, an Indian meal planning assistant.

STOP. Before generating anything, read these three rules completely.

RULE 1 — DIETARY [MANDATORY]: ${dietaryAbsoluteRule}
Violation = plan rejected.

RULE 2 — NO REPEATS [MANDATORY]: ${uniquenessAbsoluteRule || 'No history yet.'}
Violation = plan rejected.

RULE 3 — CUISINE [MANDATORY]: You must ONLY use dishes from: ${cuisine}.
Not a single dish from any other cuisine is permitted.
${cuisineHints}
If you suggest even one dish from outside ${cuisine}, the entire plan is rejected.

Now generate the meal plan. Every dish must satisfy all three rules above.

You are generating a ${mealType.toUpperCase()} meal for ${day} ${date}. ${slotRule}
${mandatoryInstruction}
Location: ${city}. Ingredients available at ${stores}.
Health considerations: ${healthInfo}.
Food preference: ${foodNote}. Language for dish names: ${language}.
${prefsNote} ${unwellStr} ${nutritionStr} ${festivalStr} ${historyStr}${nonVegCritical}${proteinRule}

CRITICAL COOKING RULES:
- ALL dishes must be EVERYDAY HOME COOKING — dal, sabzi, roti, rice, paratha, khichdi, curd rice. Think of what a normal Indian family cooks on a weekday. NEVER suggest restaurant/party/fancy food like biryani every day, butter chicken daily, paneer tikka masala etc.
- Option 1: Very simple quick everyday dish (e.g. dal chawal, aloo gobhi roti, pohe, upma).
- Option 2: Different simple everyday dish, different primary ingredient from option 1 (e.g. moong dal, bhindi sabzi, methi thepla).
- Option 3: Slightly different home dish — still simple but a different cuisine style. NOT restaurant style, NOT expensive ingredients.
- Biryani, pulao, paneer dishes, and rich curries should appear at most 1-2 times per week, not daily.
- ZERO dish repetition across the entire week. Every dish name must be unique across all days.
- Naturally mention 1-2 superfoods or health benefits in the dish description.
- Family health conditions OVERRIDE all other preferences. Apply strictly.
- Jain members: NO onion, NO garlic, NO root vegetables (potato, carrot, beetroot, radish).
- Scale all ingredient quantities to exact number of people eating. This plan is for the full household including any guests.
${nutritionGoals ? `NUTRITION GOALS FOR THIS PLAN: ${nutritionGoals}. Every dish must support these goals where possible.` : ''}

ZERO REPETITION — MANDATORY (last 7 days):
DO NOT repeat any dish that appeared in the last 7 days: ${weekDishHistory?.slice(0, 30).join(', ') || 'none yet'}.
Every single dish across ALL days must have a UNIQUE name. No dish can appear more than once in the entire plan. If a dish name from the list above appears in your response, it will be REJECTED.

IMPORTANT RULES:
- DISH NAME RULE: Every dish must have its authentic Indian regional name as the PRIMARY name. Examples: 'Dal Makhani' not 'Black Lentil Curry', 'Poha' not 'Flattened Rice', 'Chole Bhature' not 'Chickpea with Fried Bread', 'Appam with Stew' not 'Rice Pancake with Vegetable Stew', 'Kosha Mangsho' not 'Bengali Spiced Mutton'. If a dish has no authentic Indian name, it should not be in this app. Generic English translations are BANNED.
- MILLETS ARE BANNED. Do not suggest Ragi, Jowar, Bajra, or any millet-based dish unless explicitly requested. Most families do not eat millets daily.
- Do NOT over-index on 'health foods'. A family that wants Butter Chicken and Pav Bhaji should get it. Balance health with what real families enjoy.
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
${ragContext || ''}

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
      let steps = o.steps ?? [];
      if (steps.length === 0) {
        steps = ['Prep and chop all ingredients.', 'Heat oil in a pan, add spices and saut\u00e9.', 'Add main ingredients, cook until done.', 'Season to taste and serve hot.'];
      }
      return {
        name: o.name ?? '',
        description: o.desc ?? undefined,
        vegetarian: o.veg ?? true,
        tags: o.tags ?? [],
        ingredients,
        steps,
      };
    });
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

  // FIX 5: Null-safe dietary with correct default (vegetarian, not non-veg)
  let baseFoodPref: string;
  if (!params.foodPrefs.type || params.foodPrefs.type === 'veg') {
    baseFoodPref = params.foodPrefs.vegType === 'fasting'
      ? 'Fasting only (sabudana/rajgira/fruits/sama rice)'
      : 'Strictly Vegetarian — no meat, fish or eggs in any dish';
  } else if (isMixed) {
    baseFoodPref = 'Mixed — Vegetarian for breakfast, non-veg allowed for lunch and dinner only';
  } else if (params.foodPrefs.type === 'nonveg') {
    baseFoodPref = `Non-vegetarian — include at least one non-veg dish (${allowedProteins?.join(', ') || 'chicken, fish, eggs, mutton'}) per day. Remaining meals can be vegetarian — dal, sabzi, roti, rice alongside non-veg is natural and correct.`;
  } else {
    baseFoodPref = 'Strictly Vegetarian'; // safe default
  }


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
    const parts: string[] = [];
    if (prefs.includes('Full Thali')) parts.push('Generate a FULL THALI with ALL components: Dal, Sabzi, Rice or Roti, Raita, Papad or Pickle, one Dessert, one Drink. ONE complete thali entry.');
    if (prefs.includes('Rice based')) parts.push('Generate rice dish only, no bread/roti.');
    if (prefs.includes('Roti based')) parts.push('Generate roti/bread dish only, no rice.');
    if (prefs.includes('Light only')) parts.push('Light meals only — soup, khichdi or salad. No heavy curries.');
    if (prefs.includes('Eggs')) parts.push('Egg-based dishes only for this meal.');
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

  // RAG: fetch relevant dishes from database
  const ragHealthConditions: string[] = [];
  if (hf.diabetic) ragHealthConditions.push('diabetic');
  if (hf.bp) ragHealthConditions.push('low sodium');
  if (hf.pcos) ragHealthConditions.push('pcos');
  if (hf.cholesterol) ragHealthConditions.push('low cholesterol');
  let ragDishPrompt = '';
  try {
    // Use ALL selected cuisines for RAG, not just the random single one
    const allRagCuisines = [...new Set([...(params.cuisinePerDay ?? []), cuisine].filter(Boolean))];
    const ragDishes = await getRelevantDishes({
      cuisines: allRagCuisines,
      dietaryPref: params.foodPrefs.type === 'veg' ? 'veg' : isMixed ? 'mixed' : 'nonveg',
      healthConditions: ragHealthConditions,
      excludeDishes: params.dishHistory ?? [],
      limit: 20,
    });
    ragDishPrompt = formatDishesForPrompt(ragDishes);
  } catch { /* RAG unavailable — proceed without */ }

  const total = params.dates.length;
  onProgress?.(0, total);

  // Process days sequentially so each day sees previous dishes
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
  const weekHistory = [...(params.dishHistory ?? [])].slice(0, 60);

  // Process days SEQUENTIALLY so each day sees all previous dishes — prevents repeats
  // Within each day, meals run in parallel for speed
  const dayResults: MealPlanDay[] = [];

  for (const { date, dayName, foodPref, bfFoodPref, lunchDinnerPref, dayCuisine, i } of dayMeta) {
    const emptySlot: MealSlot = { options: [] };
    const [breakfast, lunch, dinner, snack] = await Promise.all([
      slots.includes('breakfast') ? generateOneMeal('breakfast', date, dayName, dayCuisine, healthInfo, bfFoodPref,        lang, bfPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, bfProteins, bfConstraint, ragDishPrompt) : Promise.resolve(emptySlot),
      slots.includes('lunch')     ? generateOneMeal('lunch',     date, dayName, dayCuisine, healthInfo, lunchDinnerPref,   lang, lnPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, ldProteins, lnConstraint, ragDishPrompt) : Promise.resolve(emptySlot),
      slots.includes('dinner')    ? generateOneMeal('dinner',    date, dayName, dayCuisine, healthInfo, lunchDinnerPref,   lang, dnPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, ldProteins, dnConstraint, ragDishPrompt) : Promise.resolve(emptySlot),
      slots.includes('snack')     ? generateOneMeal('snack',      date, dayName, dayCuisine, healthInfo, foodPref,          lang, snPrefs, unwellNote, nutritionGoals, i, festivalContext, weekHistory, cityName, storeNames, undefined, snConstraint, ragDishPrompt) : Promise.resolve(undefined),
    ]);
    // Accumulate all dish names from this day into history for next day
    [breakfast, lunch, dinner, snack].forEach(slot => {
      if (slot) slot.options.forEach(opt => { if (opt.name) weekHistory.push(opt.name); });
    });
    completed++;
    onProgress?.(completed, total);
    const day: MealPlanDay = { date, day: dayName, breakfast, lunch, dinner };
    if (snack) day.snack = snack;
    dayResults.push(day);
  }

  const days: MealPlanDay[] = dayResults;

  // BUG 4 FIX: Post-generation duplicate check
  const allDishNames: string[] = [];
  days.forEach(day => {
    ['breakfast','lunch','dinner','snack'].forEach(slot => {
      const s = day[slot as keyof MealPlanDay] as MealSlot | undefined;
      if (s?.options) s.options.forEach(opt => { if (opt.name) allDishNames.push(opt.name); });
    });
  });
  const seenDishes = new Set<string>();
  const duplicates: string[] = [];
  allDishNames.forEach(name => {
    const key = name.toLowerCase().trim();
    if (seenDishes.has(key)) duplicates.push(name);
    else seenDishes.add(key);
  });
  if (duplicates.length > 0) {
    console.error(`[MealPlan] DUPLICATE DISHES DETECTED: ${duplicates.join(', ')}`);
  }

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
