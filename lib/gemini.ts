const GEMINI_API_KEY = 'AIzaSyDi9MUZ29m4DK1LswIV8cI1EfxGkrkU7fk';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const FALLBACK_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const FALLBACK_URL_2 =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MealNutrition {
  protein_g: number;
  carbs_g: number;
  fibre_g: number;
  fat_g: number;
  vitamins: string[];
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
  nutrition_total: {
    protein_g: number;
    carbs_g: number;
    fibre_g: number;
    fat_g: number;
  };
}

// Keep for legacy compatibility
export type MealItem = MealOption;

// ─── Generator ────────────────────────────────────────────────────────────────

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
}) {
  const langMap: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
    gu: 'Gujarati',
  };

  const foodPrefText =
    params.foodPrefs.type === 'veg' && params.foodPrefs.vegType === 'fasting'
      ? 'Strict fasting food (upvas) only. Use: sabudana, rajgira, singhara flour, sama rice, potatoes, sweet potatoes, fruits, milk, curd, ghee, rock salt (sendha namak). No regular salt, no onion, no garlic.'
      : params.foodPrefs.type === 'veg'
      ? 'All meals strictly vegetarian. No eggs, no meat, no fish. Onion and garlic allowed.'
      : `Non-vegetarian allowed. Include: ${(params.foodPrefs.nonVegOptions ?? []).join(', ')}. Monday and Friday must remain vegetarian regardless.`;

  const unwellText =
    params.unwellMembers && params.unwellMembers.length > 0
      ? `\nUNWELL MEMBERS: ${params.unwellMembers.join(', ')} are feeling unwell. Include a light/recovery meal note in their relevant meal options (khichdi, congee, moong dal, plain rice with curd, or similar easy-to-digest foods as one of the 3 options per slot).`
      : '';

  const nutritionText = params.nutritionFocus && params.nutritionFocus !== 'Balanced'
    ? `\nNUTRITION FOCUS: ${params.nutritionFocus}. Adjust all meal options accordingly.`
    : '';

  const prompt = `You are Maharaj, an expert Indian regional cuisine chef and nutritionist.
Generate a meal plan for the following dates: ${params.dates.join(', ')}.

LANGUAGE: All dish names, ingredients and instructions in ${langMap[params.language] || 'English'}.
CUISINE THIS WEEK: ${params.cuisine}

FOOD PREFERENCES:
${foodPrefText}

HEALTH REQUIREMENTS:
${params.healthFlags.diabetic ? '- DIABETIC: Low GI only. Millets, nachni, jowar. No refined sugar.' : ''}
${params.healthFlags.bp ? '- BLOOD PRESSURE: Zero added salt. No packaged masalas.' : ''}
${params.healthFlags.pcos ? '- PCOS: Anti-inflammatory spices. No maida. Include methi, flaxseed.' : ''}
${unwellText}
${nutritionText}

SERVING SIZES (${params.appetite} eater):
- Breakfast: ${params.servings.breakfast} people
- Lunch: ${params.servings.lunch} people
- Dinner: ${params.servings.dinner} people

RULES:
1. Monday and Friday must be fully vegetarian
2. Breakfast every day must be light EXCEPT Sunday (Sunday = elaborate Thali)
3. Do NOT repeat any of these dishes: ${params.dishHistory.join(', ') || 'none yet'}
4. ALL ingredients must be available at Carrefour, Spinneys or Lulu in Dubai UAE
5. Include prep-night instructions for all dinners
6. Provide EXACTLY 3 options per meal slot (breakfast/lunch/dinner) per day
7. Include accurate nutritional estimates per option

Respond with ONLY valid JSON in this exact format:
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
            "health_tags": ["low-gi"],
            "ingredients": [{"name": "ingredient", "qty": "2", "unit": "cups"}],
            "method": ["step 1", "step 2"],
            "prep_night": ["prep step if any"],
            "nutrition": {"protein_g": 12, "carbs_g": 45, "fibre_g": 4, "fat_g": 8, "vitamins": ["B1", "Iron"]}
          },
          { "name": "option 2 dish", "is_vegetarian": true, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 10, "carbs_g": 40, "fibre_g": 3, "fat_g": 6, "vitamins": []} },
          { "name": "option 3 dish", "is_vegetarian": true, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 8, "carbs_g": 35, "fibre_g": 5, "fat_g": 5, "vitamins": []} }
        ]
      },
      "lunch": {
        "options": [
          { "name": "...", "is_vegetarian": true, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 20, "carbs_g": 60, "fibre_g": 6, "fat_g": 12, "vitamins": []} },
          { "name": "...", "is_vegetarian": true, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 18, "carbs_g": 55, "fibre_g": 5, "fat_g": 10, "vitamins": []} },
          { "name": "...", "is_vegetarian": true, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 22, "carbs_g": 50, "fibre_g": 8, "fat_g": 15, "vitamins": []} }
        ]
      },
      "dinner": {
        "options": [
          { "name": "...", "is_vegetarian": false, "health_tags": [], "ingredients": [], "method": [], "prep_night": ["soak overnight"], "nutrition": {"protein_g": 25, "carbs_g": 40, "fibre_g": 5, "fat_g": 18, "vitamins": []} },
          { "name": "...", "is_vegetarian": false, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 28, "carbs_g": 35, "fibre_g": 4, "fat_g": 20, "vitamins": []} },
          { "name": "...", "is_vegetarian": false, "health_tags": [], "ingredients": [], "method": [], "prep_night": [], "nutrition": {"protein_g": 22, "carbs_g": 42, "fibre_g": 6, "fat_g": 16, "vitamins": []} }
        ]
      },
      "nutrition_total": {"protein_g": 57, "carbs_g": 145, "fibre_g": 15, "fat_g": 38}
    }
  ]
}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
  };

  async function callGemini(url: string): Promise<Response> {
    return fetch(`${url}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  }

  function parseResponse(data: unknown): { days: MealPlanDay[] } {
    const text: string =
      (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        ?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as { days: MealPlanDay[] };
  }

  let response = await callGemini(GEMINI_URL);

  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 45000));
    response = await callGemini(GEMINI_URL);
  }
  if (response.status === 429) response = await callGemini(FALLBACK_URL);
  if (response.status === 429) response = await callGemini(FALLBACK_URL_2);

  if (!response.ok) {
    throw new Error('Maharaj is taking a short break. Please try again in a minute.');
  }

  const data = await response.json();
  return parseResponse(data);
}
