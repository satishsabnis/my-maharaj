const GEMINI_API_KEY = 'AIzaSyDi9MUZ29m4DK1LswIV8cI1EfxGkrkU7fk';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
}) {
  const langMap: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
    gu: 'Gujarati',
  };

  const prompt = `You are Maharaj, an expert Indian regional cuisine chef and nutritionist.
Generate a meal plan for the following dates: ${params.dates.join(', ')}.

LANGUAGE: Respond with all dish names, ingredients and instructions in ${langMap[params.language] || 'English'}.

CUISINE THIS WEEK: ${params.cuisine}

FOOD PREFERENCES:
${
  params.foodPrefs.type === 'veg' && params.foodPrefs.vegType === 'fasting'
    ? '- Strict fasting food (upvas) only. Use: sabudana, rajgira, singhara flour, sama rice, potatoes, sweet potatoes, fruits, milk, curd, ghee, rock salt (sendha namak). No regular salt, no onion, no garlic.'
    : params.foodPrefs.type === 'veg'
    ? '- All meals strictly vegetarian. No eggs, no meat, no fish. Onion and garlic allowed.'
    : `- Non-vegetarian allowed. Include these options: ${(params.foodPrefs.nonVegOptions ?? []).join(', ')}. Monday and Friday must remain vegetarian regardless.`
}

HEALTH REQUIREMENTS:
${params.healthFlags.diabetic ? '- DIABETIC: Low GI only. Millets, nachni, jowar. No refined sugar.' : ''}
${params.healthFlags.bp ? '- BLOOD PRESSURE: Zero added salt. No packaged masalas.' : ''}
${params.healthFlags.pcos ? '- PCOS: Anti-inflammatory spices. No maida. Include methi, flaxseed.' : ''}

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

Respond with ONLY valid JSON in this exact format:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day": "Monday",
      "breakfast": {
        "name": "dish name",
        "is_vegetarian": true,
        "health_tags": ["low-gi"],
        "ingredients": [{"name": "ingredient", "qty": "amount", "unit": "g"}],
        "method": ["step 1", "step 2"],
        "prep_night": ["prep step if any"]
      },
      "lunch": { "name": "dish name", "is_vegetarian": true, "health_tags": [], "ingredients": [], "method": [], "prep_night": [] },
      "dinner": { "name": "dish name", "is_vegetarian": false, "health_tags": [], "ingredients": [], "method": [], "prep_night": [] }
    }
  ]
}`;

  const FALLBACK_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const FALLBACK_URL_2 =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent';

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
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

  // First attempt
  let response = await callGemini(GEMINI_URL);

  // 429 → wait 45 s and retry same model
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 45000));
    response = await callGemini(GEMINI_URL);
  }

  // Still 429 → try gemini-1.5-flash fallback
  if (response.status === 429) {
    response = await callGemini(FALLBACK_URL);
  }

  // Still 429 → try gemini-1.5-flash-8b fallback
  if (response.status === 429) {
    response = await callGemini(FALLBACK_URL_2);
  }

  // Any other non-OK
  if (!response.ok) {
    throw new Error('Maharaj is taking a short break. Please try again in a minute.');
  }

  const data = await response.json();
  return parseResponse(data);
}

// ─── Shared types (also imported by home.tsx) ─────────────────────────────────

export interface MealItem {
  name: string;
  is_vegetarian: boolean;
  health_tags: string[];
  ingredients: { name: string; qty: string; unit: string }[];
  method: string[];
  prep_night: string[];
}

export interface MealPlanDay {
  date: string;
  day: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
}
