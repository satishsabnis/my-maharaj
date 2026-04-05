import { DISH_DATA } from './seed-dishes';

console.log('=== DISH DATABASE VERIFICATION ===\n');
console.log(`Total dishes: ${DISH_DATA.length}`);

// 1. Cuisine counts
const cuisineCounts: Record<string, number> = {};
DISH_DATA.forEach(d => d.cuisine.forEach(c => { cuisineCounts[c] = (cuisineCounts[c] || 0) + 1; }));
console.log('\nCuisine coverage:');
Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

// 2. Meal type breakdown
const mealCounts: Record<string, number> = {};
DISH_DATA.forEach(d => d.meal_type.forEach(m => { mealCounts[m] = (mealCounts[m] || 0) + 1; }));
console.log('\nMeal types:');
Object.entries(mealCounts).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => console.log(`  ${m}: ${n}`));

// 3. Dietary balance
const veg = DISH_DATA.filter(d => d.dietary.includes('vegetarian') || d.dietary.includes('jain') || d.dietary.includes('vegan')).length;
const nv = DISH_DATA.filter(d => d.dietary.some(x => x.includes('non-vegetarian'))).length;
const jainCount = DISH_DATA.filter(d => d.dietary.includes('jain')).length;
console.log(`\nDietary: Veg=${veg}, Non-veg=${nv} (${Math.round(nv / DISH_DATA.length * 100)}%), Jain=${jainCount}`);

// 4. Jain root vegetable check
const ROOT_VEG = ['onion', 'garlic', 'potato', 'carrot', 'beetroot', 'radish', 'turnip', 'leek', 'spring onion', 'shallot'];
const jainDishes = DISH_DATA.filter(d => d.dietary.includes('jain'));
const violations = jainDishes.filter(d =>
  d.ingredients_main.some(i => ROOT_VEG.some(r => i.toLowerCase().includes(r))) ||
  d.description.toLowerCase().split(' ').some(w => ROOT_VEG.includes(w))
);
console.log(`\nJain root veg violations: ${violations.length}`);
violations.forEach(v => {
  const bad = v.ingredients_main.filter(i => ROOT_VEG.some(r => i.toLowerCase().includes(r)));
  console.log(`  VIOLATION: ${v.name} — ${bad.join(', ')}`);
});

// 5. Generic name check
const BANNED_NAMES = ['fish curry', 'dal', 'rice dish', 'chicken curry', 'mutton curry', 'vegetable curry', 'paneer dish', 'sweet', 'dessert', 'snack'];
const generic = DISH_DATA.filter(d => BANNED_NAMES.some(b => d.name.toLowerCase() === b));
console.log(`\nGeneric name violations: ${generic.length}`);
generic.forEach(g => console.log(`  GENERIC: ${g.name}`));

// 6. Description check — must be specific
const shortDesc = DISH_DATA.filter(d => d.description.length < 30);
console.log(`\nShort descriptions (<30 chars): ${shortDesc.length}`);
shortDesc.forEach(d => console.log(`  SHORT: ${d.name}: "${d.description}"`));

console.log('\n=== VERIFICATION COMPLETE ===');
console.log(`Status: ${violations.length === 0 && generic.length === 0 ? 'PASS' : 'NEEDS FIXES'}`);
