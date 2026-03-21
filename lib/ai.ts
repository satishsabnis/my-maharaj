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

export interface MealPlanDay {
  date: string;
  day: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
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

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(params: {
  userId: string;
  dates: string[];
  healthFlags: { diabetic: boolean; bp: boolean; pcos: boolean };
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
}): string {
  const langMap: Record<string, string> = {
    en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati',
  };

  return `You are Maharaj, an expert Indian regional cuisine chef and nutritionist serving Indian families in Dubai, UAE.

Generate a complete meal plan for these dates: ${params.dates.join(', ')}.

LANGUAGE: Respond with all dish names, ingredients and instructions in ${langMap[params.language] || 'English'}.

CUISINE: ${params.cuisine || 'Konkani'}

HEALTH REQUIREMENTS:
${params.healthFlags.diabetic ? '- DIABETIC: Low GI only. Millets, nachni, jowar. No refined sugar. High fibre.' : ''}
${params.healthFlags.bp ? '- BLOOD PRESSURE: Zero added salt. No packaged masalas. Potassium-rich.' : ''}
${params.healthFlags.pcos ? '- PCOS: Anti-inflammatory spices. No maida. Include methi, flaxseed.' : ''}

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
      "dinner": { "options": [ ] }
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
  healthFlags: { diabetic: boolean; bp: boolean; pcos: boolean };
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
