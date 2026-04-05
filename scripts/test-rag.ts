import { DISH_DATA } from './seed-dishes';

console.log('Total dishes:', DISH_DATA.length);

const bf = DISH_DATA.filter(d => d.meal_type.includes('breakfast')).length;
const ln = DISH_DATA.filter(d => d.meal_type.includes('lunch')).length;
const dn = DISH_DATA.filter(d => d.meal_type.includes('dinner')).length;
const sn = DISH_DATA.filter(d => d.meal_type.includes('snack')).length;
const ds = DISH_DATA.filter(d => d.meal_type.includes('dessert')).length;
const veg = DISH_DATA.filter(d => d.dietary.includes('vegetarian')).length;
const nv = DISH_DATA.filter(d => d.dietary.some(x => x.includes('non-vegetarian'))).length;
console.log(`Breakdown: ${bf} breakfast, ${ln} lunch, ${dn} dinner, ${sn} snack, ${ds} dessert`);
console.log(`Veg: ${veg} | Non-veg: ${nv}`);

// Test: Punjabi, nonveg, diabetic, lunch
let results = DISH_DATA.filter(d => d.meal_type.includes('lunch'));
const scored = results.map(d => {
  let score = 0;
  if (d.cuisine.some(c => c.toLowerCase().includes('punjabi'))) score += 10;
  if (d.health_tags.some(t => t.toLowerCase().includes('diabetic'))) score += 5;
  return { name: d.name, score };
}).sort((a, b) => b.score - a.score);
console.log('\nTop 10 for Punjabi/nonveg/diabetic/lunch:');
scored.slice(0, 10).forEach((d, i) => console.log(`${i+1}. ${d.name} (score:${d.score})`));
