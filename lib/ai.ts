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

// ─── Core API call ────────────────────────────────────────────────────────────

async function askClaude(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  return text.replace(/```json|```/g, '').trim();
}

// ─── Per-meal generator ───────────────────────────────────────────────────────

function fallbackSlot(cuisine: string, mealType: string): MealSlot {
  return {
    options: [
      { name: `${cuisine} ${mealType} 1`, vegetarian: true, tags: [], ingredients: [], steps: [] },
      { name: `${cuisine} ${mealType} 2`, vegetarian: true, tags: [], ingredients: [], steps: [] },
    ],
  };
}

async function generateOneMeal(
  mealType: string,
  date: string,
  day: string,
  cuisine: string,
  healthInfo: string,
  foodPref: string,
  language: string,
  mealPrefs?: string[],
): Promise<MealSlot> {
  const isSundayBreakfast = day === 'Sunday' && mealType === 'breakfast';
  const foodNote = isSundayBreakfast ? 'Elaborate festive thali' : foodPref;
  const prefsNote = mealPrefs && mealPrefs.length > 0 ? `Include: ${mealPrefs.join(', ')}.` : '';

  const prompt = `You are Maharaj, Indian chef in Dubai.
2 ${mealType} options for ${day} ${date}. Cuisine: ${cuisine}.
Health: ${healthInfo}. Food: ${foodNote}. Language: ${language}.${prefsNote ? ` ${prefsNote}` : ''}
Reply ONLY with this JSON, no other text:
{"options":[{"name":"dish1","veg":true,"tags":["tag"],"ing":["item 100g","item2"],"steps":["step1","step2"]},{"name":"dish2","veg":true,"tags":["tag"],"ing":["item 100g","item2"],"steps":["step1","step2"]}]}`;

  try {
    const text = await askClaude(prompt);
    const raw = JSON.parse(text) as {
      options: Array<{ name: string; veg: boolean; tags: string[]; ing: string[]; steps: string[] }>;
    };
    return {
      options: (raw.options ?? []).map((o) => ({
        name: o.name ?? '',
        vegetarian: o.veg ?? true,
        tags: o.tags ?? [],
        ingredients: o.ing ?? [],
        steps: o.steps ?? [],
      })),
    };
  } catch {
    return fallbackSlot(cuisine, mealType);
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
    includeTiffin?: boolean;
    tiffinMembers?: string[];
    tiffinRestrictions?: string;
    includeDessert?: boolean;
    vegDays?: string[];
    breakfastPrefs?: string[];
    lunchPrefs?: string[];
    dinnerPrefs?: string[];
  },
  onProgress?: (current: number, total: number) => void,
): Promise<MealPlanResult> {
  const cuisine = params.cuisine || 'Konkani';
  const language = params.language || 'en';
  const langName: Record<string, string> = {
    en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati',
  };

  const hf = params.healthFlags;
  const healthParts: string[] = [];
  if (hf.diabetic) healthParts.push('Diabetic-Low GI');
  if (hf.bp) healthParts.push('Low sodium');
  if (hf.pcos) healthParts.push('No maida');
  if (hf.cholesterol) healthParts.push('No fried food');
  if (hf.thyroid) healthParts.push('Selenium-rich foods');
  if (hf.kidneyDisease) healthParts.push('Low potassium/phosphorus');
  if (hf.heartDisease) healthParts.push('Low saturated fat');
  if (hf.obesity) healthParts.push('Low calorie density');
  if (hf.anaemia) healthParts.push('Iron-rich foods');
  if (hf.lactoseIntolerant) healthParts.push('No dairy');
  if (hf.glutenIntolerant) healthParts.push('No gluten');
  const healthInfo = healthParts.length > 0 ? healthParts.join(', ') : 'Normal healthy';

  const baseFoodPref =
    params.foodPrefs.type === 'veg'
      ? params.foodPrefs.vegType === 'fasting'
        ? 'Fasting only (sabudana/rajgira/fruits)'
        : 'Vegetarian'
      : `Non-veg: ${params.foodPrefs.nonVegOptions?.join(', ') || 'all'}`;

  const lang = langName[language] || 'English';
  const days: MealPlanDay[] = [];
  const allIngredients: string[] = [];
  const total = params.dates.length;

  for (let i = 0; i < params.dates.length; i++) {
    const date = params.dates[i];
    onProgress?.(i + 1, total);

    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    // Force vegetarian on designated veg days
    const isVegDay = params.vegDays?.includes(dayName) ?? false;
    const foodPref = isVegDay ? `Vegetarian (${dayName} is a designated veg day)` : baseFoodPref;

    // For non-veg: encourage mixing — not every meal needs to be non-veg
    const lunchDinnerPref = params.foodPrefs.type === 'nonveg' && !isVegDay
      ? `${foodPref}. Mix veg and non-veg naturally — not every meal needs meat.`
      : foodPref;

    const [breakfast, lunch, dinner] = await Promise.all([
      generateOneMeal('breakfast', date, dayName, cuisine, healthInfo, foodPref, lang, params.breakfastPrefs),
      generateOneMeal('lunch', date, dayName, cuisine, healthInfo, lunchDinnerPref, lang, params.lunchPrefs),
      generateOneMeal('dinner', date, dayName, cuisine, healthInfo, lunchDinnerPref, lang, params.dinnerPrefs),
    ]);

    days.push({ date, day: dayName, breakfast, lunch, dinner });

    [breakfast, lunch, dinner].forEach((slot) => {
      slot.options.forEach((opt) => {
        opt.ingredients.forEach((ing) => allIngredients.push(ing));
      });
    });
  }

  // Deduplicate grocery list
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
