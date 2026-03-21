import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MealNutrition {
  protein_g: number;
  carbs_g: number;
  fibre_g: number;
  fat_g: number;
  vitamins?: string[];
}

export interface MealOption {
  name: string;
  is_vegetarian: boolean;
  health_tags: string[];
  ingredients: { name: string; qty: string; unit: string }[];
  method: string[];
  prep_night: string[];
  nutrition: MealNutrition;
}

export interface MealSlot {
  options: MealOption[];
}

export interface TiffinItem {
  name: string;
  is_vegetarian: boolean;
  ingredients: { name: string; qty: string; unit: string }[];
  method: string[];
  prep_night: string[];
  nutrition: MealNutrition;
}

export interface DessertItem {
  name: string;
  is_vegetarian: boolean;
  ingredients: { name: string; qty: string; unit: string }[];
  method: string[];
}

export interface MealPlanDay {
  date: string;
  day: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
  tiffin?: { options: TiffinItem[] };
  dessert?: DessertItem;
  nutrition_total?: {
    protein_g: number;
    carbs_g: number;
    fibre_g: number;
    fat_g: number;
  };
}

export interface GroceryItem {
  name: string;
  name_hi?: string;
  name_mr?: string;
  name_gu?: string;
  qty: string;
  unit: string;
  category: string;
  store?: string;
}

export interface MealPlanResult {
  days: MealPlanDay[];
  grocery_list?: GroceryItem[];
}

// Keep for legacy compatibility
export type MealItem = MealOption;

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
    ? `\nTIFFIN / LUNCHBOX (include for EVERY day):
For: ${(params.tiffinMembers ?? ['the family']).join(', ')}
${params.tiffinRestrictions ? `Restrictions: ${params.tiffinRestrictions}` : ''}
Rules: Must be pack-friendly and non-messy. No thin gravies. Must survive 2–3 hours without refrigeration.
Include prep_night steps. Provide 2 options per day as "tiffin": {"options": [...]}`
    : '';

  const dessertSection = params.includeDessert
    ? `\nDESSERT (include for EVERY day):
- Sunday: Elaborate traditional dessert (kheer, halwa, modak, gulab jamun, shrikhand etc.)
- Weekdays: Simple quick sweet (1–2 ingredients, under 15 min) e.g. banana halwa, fruit chaat, jaggery laddoo
- All desserts must comply with health restrictions (use jaggery/dates instead of sugar for diabetic; dairy-free if lactose intolerant; gluten-free alternatives if needed)
Output as "dessert": {"name": "...", "is_vegetarian": true/false, "ingredients": [...], "method": [...]}`
    : '';

  const tiffinJson = params.includeTiffin
    ? ',\n      "tiffin": { "options": [ { "name": "...", "is_vegetarian": true, "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g":0,"carbs_g":0,"fat_g":0,"fibre_g":0} } ] }'
    : '';
  const dessertJson = params.includeDessert
    ? ',\n      "dessert": {"name": "...", "is_vegetarian": true, "ingredients": [], "method": []}'
    : '';

  return `You are Maharaj, an expert Indian regional cuisine chef and nutritionist serving Indian families in Dubai, UAE.

Generate a complete meal plan for these dates: ${params.dates.join(', ')}.

LANGUAGE: Respond with all dish names, ingredients and instructions in ${langMap[params.language] || 'English'}.

CUISINE: ${params.cuisine || 'Konkani'}

HEALTH REQUIREMENTS:
${healthLines.length > 0 ? healthLines.join('\n') : '- None specified. Standard healthy Indian family meals.'}

FOOD PREFERENCE: ${
  params.foodPrefs.type === 'veg'
    ? params.foodPrefs.vegType === 'fasting'
      ? 'STRICT FASTING (upvas): sabudana, rajgira, singhara, sama rice, potatoes, fruits, rock salt only'
      : 'Vegetarian only. No eggs, no meat.'
    : `Non-vegetarian allowed: ${(params.foodPrefs.nonVegOptions ?? []).join(', ')}`
}

SERVING SIZES (${params.appetite} eater):
- Breakfast: ${params.servings.breakfast} people
- Lunch: ${params.servings.lunch} people
- Dinner: ${params.servings.dinner} people

UNWELL MEMBERS: ${
  params.unwellMembers && params.unwellMembers.length > 0
    ? `Generate light/recovery meals for: ${params.unwellMembers.join(', ')}`
    : 'Everyone is well'
}

NUTRITIONAL FOCUS: ${params.nutritionFocus || 'Balanced'}
Strategy: ${nutritionDescs[params.nutritionFocus ?? 'Balanced'] ?? nutritionDescs['Balanced']}
${tiffinSection}
${dessertSection}

STRICT RULES:
1. Monday and Friday must be fully vegetarian
2. Sunday breakfast: elaborate festive Thali (special occasion)
3. All other breakfasts: light and simple
4. Do NOT repeat these dishes: ${params.dishHistory.join(', ') || 'none yet'}
5. ALL ingredients must be available at Carrefour, Spinneys or Lulu Dubai
6. Include prep-night instructions for all dinners
7. Each meal slot must have EXACTLY 3 options for the user to choose from

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day": "Monday",
      "breakfast": {
        "options": [
          {
            "name": "dish name",
            "is_vegetarian": true,
            "health_tags": ["low-gi", "bp-safe"],
            "ingredients": [{"name": "item", "qty": "amount", "unit": "g"}],
            "method": ["step 1", "step 2"],
            "prep_night": ["prep step"],
            "nutrition": {"protein_g": 8, "carbs_g": 30, "fat_g": 4, "fibre_g": 3}
          }
        ]
      },
      "lunch": { "options": [ ] },
      "dinner": { "options": [ ] }${tiffinJson}${dessertJson}
    }
  ],
  "grocery_list": [
    {
      "name": "ingredient",
      "name_hi": "हिंदी नाम",
      "name_mr": "मराठी नाव",
      "name_gu": "ગુજરાતી નામ",
      "qty": "total",
      "unit": "g",
      "category": "vegetables",
      "store": "Carrefour"
    }
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
  const prompt = buildPrompt(params);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text =
    message.content[0].type === 'text' ? message.content[0].text : '';

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as MealPlanResult;
}
