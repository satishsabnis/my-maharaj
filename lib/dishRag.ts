import { supabase } from './supabase';

export interface DishMatch {
  name: string;
  name_hindi?: string;
  cuisine: string[];
  meal_type: string[];
  dietary: string[];
  health_tags: string[];
  description?: string;
  isTrending?: boolean;
}

// Curated trending dishes — updated monthly. More reliable than web scraping.
const TRENDING_DISHES = [
  'Butter Chicken', 'Pav Bhaji', 'Chole Bhature', 'Masala Dosa',
  'Chicken Biryani', 'Paneer Tikka Masala', 'Vada Pav', 'Misal Pav',
];

/**
 * Queries the dishes table for the top N dishes matching the user's profile.
 * Uses Supabase tsvector full-text search + array filters.
 * Falls back gracefully if the table doesn't exist yet.
 */
export async function getRelevantDishes(params: {
  cuisines: string[];
  dietaryPref: 'veg' | 'nonveg' | 'mixed';
  healthConditions: string[];
  mealType?: string;
  excludeDishes?: string[];
  limit?: number;
}): Promise<DishMatch[]> {
  const { cuisines, dietaryPref, healthConditions, mealType, excludeDishes = [], limit = 20 } = params;

  try {
    // Build search query from user profile
    const searchTerms = [
      ...cuisines,
      ...(mealType ? [mealType] : []),
      ...(dietaryPref === 'veg' ? ['vegetarian'] : dietaryPref === 'nonveg' ? ['non-vegetarian'] : []),
      ...healthConditions.map(h => h.toLowerCase()),
    ].filter(Boolean);

    const searchQuery = searchTerms.join(' | '); // OR query for tsvector

    let query = supabase
      .from('dishes')
      .select('name, name_hindi, cuisine, meal_type, dietary, health_tags, description')
      .eq('is_banned', false);

    // Filter by meal type if specified
    if (mealType) {
      query = query.contains('meal_type', [mealType]);
    }

    // Filter by dietary preference
    if (dietaryPref === 'veg') {
      query = query.contains('dietary', ['vegetarian']);
    }

    // Use text search if we have terms
    if (searchQuery) {
      query = query.textSearch('search_vector', searchQuery, { type: 'plain' });
    }

    query = query.limit(limit * 2); // Fetch more, filter client-side

    const { data, error } = await query;
    if (error) {
      console.log('[dishRag] Query error, falling back to simple fetch:', error.message);
      // Fallback: just fetch dishes matching cuisine
      const { data: fallback } = await supabase
        .from('dishes')
        .select('name, name_hindi, cuisine, meal_type, dietary, health_tags, description')
        .eq('is_banned', false)
        .limit(limit);
      return (fallback ?? []) as DishMatch[];
    }

    let results = (data ?? []) as DishMatch[];

    // Client-side scoring and filtering
    // Exclude dishes already in the plan
    const excludeSet = new Set(excludeDishes.map(d => d.toLowerCase()));
    results = results.filter(d => !excludeSet.has(d.name.toLowerCase()));

    // Score by relevance
    const scored = results.map(dish => {
      let score = 0;
      // Cuisine match
      if (cuisines.some(c => dish.cuisine.includes(c))) score += 10;
      // Health tag match
      if (healthConditions.length > 0 && dish.health_tags.some(t => healthConditions.some(h => t.toLowerCase().includes(h.toLowerCase())))) score += 5;
      // Meal type match
      if (mealType && dish.meal_type.includes(mealType)) score += 3;
      // Trending bonus
      const isTrending = TRENDING_DISHES.some(t => dish.name.toLowerCase().includes(t.toLowerCase()));
      if (isTrending) score += 2;
      return { ...dish, isTrending, score };
    });

    // Sort by score desc, take top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  } catch (e) {
    console.log('[dishRag] Failed to query dishes table:', e);
    return []; // Graceful fallback — prompt still works without RAG
  }
}

/**
 * Formats dish matches into a prompt-injectable string.
 */
export function formatDishesForPrompt(dishes: DishMatch[]): string {
  if (dishes.length === 0) return '';
  const list = dishes.map(d => `${d.name}${d.name_hindi ? ` (${d.name_hindi})` : ''} — ${d.cuisine.join('/')}`).join(', ');
  return `DISH REFERENCE LIST — draw primarily from these authentic dishes that match this user's profile: ${list}. Every dish must either be on this list or be an equally authentic Indian dish. No generic English names. No millets unless listed.`;
}
