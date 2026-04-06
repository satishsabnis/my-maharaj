import { DISH_DATA } from '../scripts/seed-dishes';

export interface CuisineGroup {
  label: string;
  cuisines: string[];
}

// Region mappings — each cuisine is assigned to exactly one group
const REGION_MAP: Record<string, string> = {
  'Maharashtrian': 'West India', 'Gujarati': 'West India', 'Rajasthani': 'West India',
  'Goan': 'West India', 'Malvani': 'West India', 'Konkani': 'West India', 'Kathiyawadi': 'West India',
  'Kutchi': 'West India', 'Kolhapuri': 'West India', 'Konkan': 'West India', 'Vidarbha': 'West India',
  'Marathwada': 'West India',

  'Punjabi': 'North India', 'Delhi': 'North India', 'Mughlai': 'North India',
  'Awadhi': 'North India', 'Lucknowi': 'North India', 'Kashmiri': 'North India',
  'Haryanvi': 'North India', 'Himachali': 'North India', 'Uttarakhandi': 'North India',
  'UP': 'North India', 'Rampur': 'North India',

  'Tamil Nadu': 'South India', 'Tamil': 'South India', 'Kerala': 'South India',
  'Karnataka': 'South India', 'Andhra Pradesh': 'South India', 'Andhra': 'South India',
  'Telangana': 'South India', 'Chettinad': 'South India', 'Mangalorean': 'South India',
  'South Indian': 'South India', 'Hyderabadi': 'South India', 'Hyderabad': 'South India',
  'Malabar': 'South India', 'Syrian Christian Kerala': 'South India',
  'Coorg': 'South India', 'Udupi': 'South India', 'Telugu': 'South India',
  'GSB': 'South India',

  'Bengali': 'East India', 'Odia': 'East India', 'Assamese': 'East India',
  'Bihari': 'East India', 'Kolkata': 'East India',

  'Indo-Chinese': 'Fusion & Street', 'Kolkata Chinese': 'Fusion & Street',
  'Street Indo-Chinese': 'Fusion & Street', 'Modern Indian': 'Fusion & Street',
  'Street Food': 'Fusion & Street', 'Mumbai': 'Fusion & Street',

  'Jain': 'Dietary', 'Sindhi': 'Community', 'Parsi': 'Community',
};

// Minimum dish count to show as a chip — prevents clutter from very small cuisines
const MIN_DISHES = 5;

/**
 * Returns grouped cuisine chips dynamically derived from the dish database.
 * Adding a new cuisine to seed files automatically makes it appear here.
 */
export function getCuisineGroups(): CuisineGroup[] {
  // Count dishes per cuisine
  const counts: Record<string, number> = {};
  DISH_DATA.forEach(d => d.cuisine.forEach(c => { counts[c] = (counts[c] || 0) + 1; }));

  // Group cuisines by region
  const groups: Record<string, string[]> = {};
  Object.entries(counts)
    .filter(([_, n]) => n >= MIN_DISHES)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cuisine]) => {
      const region = REGION_MAP[cuisine] || 'Other';
      if (!groups[region]) groups[region] = [];
      if (!groups[region].includes(cuisine)) groups[region].push(cuisine);
    });

  // Order the sections
  const ORDER = ['West India', 'North India', 'South India', 'East India', 'Fusion & Street', 'Community', 'Dietary', 'Other'];
  return ORDER
    .filter(label => groups[label]?.length)
    .map(label => ({ label, cuisines: groups[label] }));
}

/**
 * Flat list of all cuisine names with MIN_DISHES threshold.
 */
export function getAllCuisines(): string[] {
  return getCuisineGroups().flatMap(g => g.cuisines);
}
