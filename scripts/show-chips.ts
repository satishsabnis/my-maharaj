import { getCuisineGroups } from '../lib/cuisineGroups';
const groups = getCuisineGroups();
console.log('=== CUISINE CHIPS IN MEAL WIZARD ===\n');
groups.forEach(g => {
  console.log(g.label + ':');
  g.cuisines.forEach(c => console.log('  - ' + c));
});
console.log('\nTotal chips:', groups.reduce((a, g) => a + g.cuisines.length, 0));
