import { DISH_DATA } from './seed-dishes';

console.log('═══════════════════════════════════════════════');
console.log('       DISH DATABASE — COMPLETE COUNT');
console.log('═══════════════════════════════════════════════\n');
console.log('TOTAL DISHES:', DISH_DATA.length);

// Cuisine counts
const cc: Record<string, number> = {};
DISH_DATA.forEach(d => d.cuisine.forEach(c => { cc[c] = (cc[c] || 0) + 1; }));
console.log('\n── CUISINE BREAKDOWN ──');
Object.entries(cc).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

// Meal types
const mt: Record<string, number> = {};
DISH_DATA.forEach(d => d.meal_type.forEach(m => { mt[m] = (mt[m] || 0) + 1; }));
console.log('\n── MEAL TYPES ──');
Object.entries(mt).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => console.log(`  ${m}: ${n}`));

// Dietary
const veg = DISH_DATA.filter(d => d.dietary.includes('vegetarian')).length;
const jain = DISH_DATA.filter(d => d.dietary.includes('jain')).length;
const nv = DISH_DATA.filter(d => d.dietary.some(x => x.includes('non-vegetarian'))).length;
const egg = DISH_DATA.filter(d => d.dietary.includes('egg') || d.dietary.includes('eggetarian')).length;
console.log('\n── DIETARY BREAKDOWN ──');
console.log(`  Vegetarian: ${veg}`);
console.log(`  Jain: ${jain}`);
console.log(`  Non-vegetarian: ${nv} (${Math.round(nv / DISH_DATA.length * 100)}%)`);
console.log(`  Egg-based: ${egg}`);

// Jain compliance — ingredients only (not descriptions)
const ROOT_VEG_WORDS = ['onion', 'garlic', 'potato', 'carrot', 'beetroot', 'radish', 'turnip', 'leek', 'shallot'];
const jainDishes = DISH_DATA.filter(d => d.dietary.includes('jain'));
let violations = 0;
const violationList: string[] = [];
jainDishes.forEach(d => {
  d.ingredients_main.forEach(ing => {
    const lower = ing.toLowerCase();
    ROOT_VEG_WORDS.forEach(rv => {
      // Match as standalone word: exact match, or word boundary
      const regex = new RegExp(`\\b${rv}\\b`);
      if (regex.test(lower) && !lower.includes('spring onion top') && !lower.includes('hing')) {
        violations++;
        violationList.push(`  ${d.name}: ingredient "${ing}" contains "${rv}"`);
      }
    });
  });
});

console.log('\n── JAIN COMPLIANCE (ingredients_main scan) ──');
console.log(`  Total Jain dishes: ${jainDishes.length}`);
console.log(`  Root vegetable violations in ingredients: ${violations}`);
if (violationList.length > 0) {
  violationList.slice(0, 20).forEach(v => console.log(v));
  if (violationList.length > 20) console.log(`  ... and ${violationList.length - 20} more`);
}

// Generic names
const BANNED = ['fish curry', 'dal', 'rice dish', 'chicken curry', 'mutton curry', 'vegetable curry', 'paneer dish', 'sweet', 'dessert', 'snack', 'fasting dish'];
const generic = DISH_DATA.filter(d => BANNED.includes(d.name.toLowerCase()));
console.log('\n── GENERIC NAME CHECK ──');
console.log(`  Violations: ${generic.length}`);
generic.forEach(g => console.log(`  BANNED: "${g.name}"`));

// File source counts
console.log('\n── SOURCE FILES ──');
const files = [
  'seed-dishes-jain.ts',
  'seed-dishes-gujarati.ts',
  'seed-dishes-maharashtrian.ts',
  'seed-dishes-coastal.ts (Malvani + Mangalorean + Goan)',
  'seed-dishes-fasting.ts',
  'seed-dishes-punjabi.ts',
  'seed-dishes-rajasthani.ts',
  'seed-dishes-south-indian.ts',
  'seed-dishes-mughlai.ts',
  'seed-dishes-indo-chinese.ts',
  'seed-dishes.ts (NON_JAIN_DISHES base)',
];
files.forEach(f => console.log(`  ${f}`));

console.log('\n═══════════════════════════════════════════════');
