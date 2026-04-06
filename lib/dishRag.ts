import { supabase } from './supabase';
import { DISH_DATA } from '../scripts/seed-dishes';

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

// Curated trending dishes — updated monthly
const TRENDING_DISHES = [
  'Butter Chicken', 'Pav Bhaji', 'Chole Bhature', 'Masala Dosa',
  'Chicken Biryani', 'Paneer Tikka Masala', 'Vada Pav', 'Misal Pav',
];

/**
 * Returns top N dishes matching the user's profile.
 * Uses in-memory DISH_DATA as primary source (no Supabase table dependency).
 * Falls back gracefully on any error.
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

  console.error('=== RAG QUERY ===');
  console.error('dietaryPref:', dietaryPref);
  console.error('cuisines:', JSON.stringify(cuisines));
  console.error('jainSelected:', cuisines.some(c => c.toLowerCase() === 'jain'));
  console.error('mealType:', mealType);
  console.error('totalDishesInDB:', DISH_DATA.length);
  console.error('=== END RAG ===');

  try {
    // First try Supabase table (if it exists from manual SQL setup)
    const supaResult = await querySupabase(params);
    if (supaResult.length > 0) return supaResult;
  } catch { /* Supabase table doesn't exist yet — use in-memory */ }

  // In-memory search from seed data
  const excludeSet = new Set(excludeDishes.map(d => d.toLowerCase()));
  let results = DISH_DATA.filter(d => !excludeSet.has(d.name.toLowerCase()));

  // FIX 1: Strict dietary filter — Jain dishes EXCLUDED for non-Jain users
  const jainSelected = cuisines.some(c => c.toLowerCase() === 'jain');
  if (dietaryPref === 'veg') {
    results = results.filter(d => {
      if (d.dietary.includes('jain') && !jainSelected) return false; // Exclude Jain unless explicitly selected
      return d.dietary.includes('vegetarian') || d.dietary.includes('vegan') || (d.dietary.includes('jain') && jainSelected);
    });
  } else if (dietaryPref === 'nonveg') {
    results = results.filter(d => !d.dietary.includes('jain')); // Always exclude Jain for non-veg
  } else if (dietaryPref === 'mixed') {
    results = results.filter(d => !d.dietary.includes('jain') || jainSelected);
  }

  console.error('After dietary filter:', results.length, 'dishes remain');

  // HARD FILTER: When cuisines are specified, return ONLY dishes from those cuisines
  if (cuisines.length > 0) {
    const cuisineLower = cuisines.map(c => c.toLowerCase());
    const cuisineFiltered = results.filter(d => d.cuisine.some(dc => cuisineLower.some(c => dc.toLowerCase().includes(c))));
    // Only apply hard filter if it leaves enough dishes (>5), otherwise fall back to scoring
    if (cuisineFiltered.length >= 5) {
      results = cuisineFiltered;
      console.error('After HARD cuisine filter:', results.length, 'dishes remain (only', cuisines.join('+'), ')');
    } else {
      console.error('Hard cuisine filter too restrictive (', cuisineFiltered.length, '), keeping all and using scoring');
    }
  }

  // Filter by meal type
  if (mealType) {
    results = results.filter(d => d.meal_type.includes(mealType));
  }

  console.error('After meal type filter:', results.length, 'dishes remain');

  // Score
  const scored = results.map(dish => {
    let score = 0;
    // +20 for exact selected cuisine match
    if (cuisines.some(c => dish.cuisine.some(dc => dc.toLowerCase() === c.toLowerCase()))) score += 20;
    else if (cuisines.some(c => dish.cuisine.some(dc => dc.toLowerCase().includes(c.toLowerCase())))) score += 10;
    if (healthConditions.length > 0 && dish.health_tags.some(t => healthConditions.some(h => t.toLowerCase().includes(h.toLowerCase())))) score += 5;
    if (mealType && dish.meal_type.includes(mealType)) score += 3;
    const isTrending = TRENDING_DISHES.some(t => dish.name.toLowerCase().includes(t.toLowerCase()));
    if (isTrending) score += 2;
    // BUG 2 FIX: Non-veg users get non-veg dishes boosted in RAG results
    if (dietaryPref === 'nonveg' && dish.dietary.some(d => d.includes('non-vegetarian'))) score += 4;
    return { ...dish, isTrending, score } as DishMatch & { score: number };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

async function querySupabase(params: {
  cuisines: string[];
  dietaryPref: 'veg' | 'nonveg' | 'mixed';
  healthConditions: string[];
  mealType?: string;
  excludeDishes?: string[];
  limit?: number;
}): Promise<DishMatch[]> {
  const { dietaryPref, mealType, excludeDishes = [], limit = 20, cuisines, healthConditions } = params;

  let query = supabase.from('dishes').select('name, name_hindi, cuisine, meal_type, dietary, health_tags, description').eq('is_banned', false);
  if (mealType) query = query.contains('meal_type', [mealType]);
  if (dietaryPref === 'veg') query = query.contains('dietary', ['vegetarian']);
  query = query.limit(limit * 2);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No data');

  const excludeSet = new Set(excludeDishes.map(d => d.toLowerCase()));
  let results = (data as DishMatch[]).filter(d => !excludeSet.has(d.name.toLowerCase()));

  const scored = results.map(dish => {
    let score = 0;
    if (cuisines.some(c => dish.cuisine.includes(c))) score += 10;
    if (healthConditions.length > 0 && dish.health_tags.some(t => healthConditions.some(h => t.toLowerCase().includes(h.toLowerCase())))) score += 5;
    const isTrending = TRENDING_DISHES.some(t => dish.name.toLowerCase().includes(t.toLowerCase()));
    if (isTrending) score += 2;
    return { ...dish, isTrending, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Formats dish matches into a prompt-injectable string.
 */
export function formatDishesForPrompt(dishes: DishMatch[]): string {
  if (dishes.length === 0) return '';
  const list = dishes.map(d => `${d.name}${d.name_hindi ? ` (${d.name_hindi})` : ''} — ${d.cuisine.join('/')}`).join(', ');
  return `DISH REFERENCE LIST — draw primarily from these authentic dishes that match this user's profile: ${list}. Every dish must either be on this list or be an equally authentic Indian dish. No generic English names. No millets unless listed.`;
}
