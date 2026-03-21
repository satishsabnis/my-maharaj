import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface TiffinItem {
  name: string;
  vegetarian: boolean;
  ingredients: string[];
  steps: string[];
}

export interface DessertItem {
  name: string;
  vegetarian: boolean;
  ingredients: string[];
  steps: string[];
}

export interface MealPlanDay {
  date: string;
  day: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
  tiffin?: { options: TiffinItem[] };
  dessert?: DessertItem;
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

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(params: {
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
  includeTiffin?: boolean;
  tiffinMembers?: string[];
  tiffinRestrictions?: string;
  includeDessert?: boolean;
}): string {
  const langMap: Record<string, string> = {
    en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati',
  };

  const hf = params.healthFlags;
  const healthLines: string[] = [];
  if (hf.diabetic) healthLines.push('- DIABETIC: Low GI only. Millets, nachni, jowar. No refined sugar. High fibre.');
  if (hf.bp) healthLines.push('- BLOOD PRESSURE: Zero added salt. No packaged masalas. Potassium-rich.');
  if (hf.pcos) healthLines.push('- PCOS: Anti-inflammatory spices. No maida. Include methi, flaxseed.');
  if (hf.cholesterol) healthLines.push('- HIGH CHOLESTEROL: No trans fats. Oats, barley, flaxseed. Avoid deep-fried. Heart-healthy oils only (olive/mustard). No coconut cream.');
  if (hf.thyroid) healthLines.push('- THYROID: Selenium-rich foods (eggs, Brazil nuts, seeds). Limit raw goitrogens (cabbage, broccoli). Iodised salt. Include turmeric.');
  if (hf.kidneyDisease) healthLines.push('- KIDNEY DISEASE: Low potassium, low phosphorus, low sodium. Limit dairy and legumes. Small lean protein portions. No tomato concentrate.');
  if (hf.heartDisease) healthLines.push('- HEART DISEASE: Low saturated fat. Max 1 tsp ghee/day. Omega-3 rich (flaxseed, walnuts, mustard oil). Prefer steamed/baked over fried.');
  if (hf.obesity) healthLines.push('- OBESITY: Low calorie density. Large vegetable portions. Limit oil to 1 tsp per meal. No added sugar. High protein to maintain satiety.');
  if (hf.anaemia) healthLines.push('- ANAEMIA: Iron-rich: green leafy vegetables, beetroot, dates, jaggery, dry fruits. Pair with Vitamin C (lemon, amla) for better absorption. Avoid tea/coffee with meals.');
  if (hf.lactoseIntolerant) healthLines.push('- LACTOSE INTOLERANT: No milk, cream, paneer, butter, ghee. Use coconut milk, almond milk. Tofu instead of paneer. Coconut oil instead of ghee.');
  if (hf.glutenIntolerant) healthLines.push('- GLUTEN INTOLERANT/COELIAC: No wheat, maida, atta, semolina, barley, rye. Use rice, jowar, bajra, nachni, rajgira, sabudana, besan only.');

  const nutritionDescs: Record<string, string> = {
    'Balanced': 'All macros in healthy proportions — standard Indian family nutrition.',
    'Low Calorie': 'Under 1400 kcal/day total. Small portions, high-volume vegetables, minimal oil (½ tsp/meal).',
    'Keto': 'Very low carb (under 50g/day). High healthy fats, moderate protein. No rice, no bread, no sugar, no root vegetables.',
    'High Protein': 'Protein at every single meal. Dal, paneer, eggs, lean chicken, Greek yogurt, seeds. Aim 1.5g protein per kg body weight.',
    'Less Oil / Low Fat': 'Maximum 2 tsp oil for the entire day. Steam, bake or air-fry everything. No deep frying. No ghee.',
    'High Fibre': 'Whole grains, raw vegetables, legumes every meal. Minimum 35g dietary fibre per day. Include psyllium-husk-rich options.',
    'Doctor Recommended': 'Strictly follows ALL health profiles set above — diabetic, BP, PCOS and all other conditions. No exceptions.',
    'Weight Loss': 'Caloric deficit (300–500 kcal below TDEE). Low GI. No refined carbs or sugar. High protein to preserve muscle. No snacking.',
    'Weight Gain / Muscle Building': 'Caloric surplus (300–500 kcal above TDEE). High protein (every meal), complex carbs, healthy fats. 5–6 smaller meals spread through day.',
  };

  const tiffinSection = params.includeTiffin
    ? `TIFFIN: 2 pack-friendly options for ${(params.tiffinMembers ?? ['family']).join(', ')}.${params.tiffinRestrictions ? ` Restrictions: ${params.tiffinRestrictions}.` : ''} No thin gravies.`
    : '';

  const dessertSection = params.includeDessert
    ? `DESSERT: One simple dessert. Sunday: traditional sweet. Weekdays: quick 2-ingredient treat. Comply with health restrictions.`
    : '';

  const tiffinJson = params.includeTiffin
    ? ',\n      "tiffin": {"options": [{"name": "...", "vegetarian": true, "ingredients": ["item qty"], "steps": ["step"]}]}'
    : '';
  const dessertJson = params.includeDessert
    ? ',\n      "dessert": {"name": "...", "vegetarian": true, "ingredients": ["item qty"], "steps": ["step"]}'
    : '';

  return `IMPORTANT: Keep your entire response under 3000 tokens. Be very concise. Short dish names, minimal ingredients, brief steps only.

You are Maharaj, an Indian cuisine chef for families in Dubai, UAE.
Date: ${params.dates.join(', ')} | Cuisine: ${params.cuisine || 'Konkani'} | Language: ${langMap[params.language] || 'English'}

HEALTH: ${healthLines.length > 0 ? healthLines.join(' ') : 'None.'}
FOOD: ${
  params.foodPrefs.type === 'veg'
    ? params.foodPrefs.vegType === 'fasting' ? 'Fasting only (sabudana/rajgira/sama rice/fruits/rock salt)' : 'Vegetarian only'
    : `Non-veg allowed: ${(params.foodPrefs.nonVegOptions ?? []).join(', ')}`
}
SERVINGS: B${params.servings.breakfast}/L${params.servings.lunch}/D${params.servings.dinner} | ${params.appetite} appetite
FOCUS: ${params.nutritionFocus || 'Balanced'} — ${nutritionDescs[params.nutritionFocus ?? 'Balanced'] ?? nutritionDescs['Balanced']}
${params.unwellMembers?.length ? `UNWELL: Light meals for ${params.unwellMembers.join(', ')}` : ''}
${tiffinSection}
${dessertSection}

RULES: Mon/Fri vegetarian. Sun breakfast = festive thali. No repeat of: ${params.dishHistory.slice(0, 5).join(', ') || 'none'}.

OUTPUT: EXACTLY 2 options per meal slot. Max 4 ingredients per dish (as "Item qty" strings). Max 2 steps. Max 2 tags.

Respond ONLY with valid JSON:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day": "Saturday",
      "breakfast": {"options": [
        {"name": "Pohe", "vegetarian": true, "tags": ["light"], "ingredients": ["Poha 1 cup", "Onion 1", "Mustard seeds 1 tsp", "Curry leaves 6"], "steps": ["Soak poha 5 min", "Temper and mix"]},
        {"name": "Upma", "vegetarian": true, "tags": ["quick"], "ingredients": ["Semolina 1 cup", "Mixed veg 1 cup", "Ghee 1 tsp", "Mustard seeds 1 tsp"], "steps": ["Roast semolina", "Add water and cook"]}
      ]},
      "lunch": {"options": [...]},
      "dinner": {"options": [...]}${tiffinJson}${dessertJson}
    }
  ],
  "grocery_list": [
    {"name": "Poha", "qty": "200g", "category": "grains"}
  ]
}`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateMealPlan(params: {
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
  includeTiffin?: boolean;
  tiffinMembers?: string[];
  tiffinRestrictions?: string;
  includeDessert?: boolean;
}): Promise<MealPlanResult> {
  const days: MealPlanDay[] = [];
  const allGrocery: GroceryItem[] = [];

  // One API call per day to avoid token limit truncation
  for (const date of params.dates) {
    const prompt = buildPrompt({ ...params, dates: [date] });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      const dayResult = JSON.parse(clean) as MealPlanResult;
      if (dayResult.days) days.push(...dayResult.days);
      if (dayResult.grocery_list) allGrocery.push(...dayResult.grocery_list);
    } catch (e) {
      console.error(`[ai] Parse error for ${date}:`, e);
      console.error('[ai] Raw response:', clean.slice(0, 300));
      throw new Error(`Failed to parse meal plan for ${date}. Please try again.`);
    }
  }

  // Deduplicate grocery list by name
  const seen = new Set<string>();
  const grocery = allGrocery.filter((item) => {
    const key = item.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { days, grocery_list: grocery };
}
