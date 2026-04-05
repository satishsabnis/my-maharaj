/**
 * Run: npx ts-node --skip-project scripts/run-seed.ts
 * Seeds the dishes table with 150+ authentic Indian dishes.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
 */
import { DISH_DATA } from './seed-dishes';

const SUPABASE_URL = 'https://ljgfvoyloeelnmugysrk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function seed() {
  if (!SUPABASE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY env var');
    process.exit(1);
  }

  console.log(`Seeding ${DISH_DATA.length} dishes to ${SUPABASE_URL}...`);

  // Insert in batches of 25
  for (let i = 0; i < DISH_DATA.length; i += 25) {
    const batch = DISH_DATA.slice(i, i + 25);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dishes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Batch ${i / 25 + 1} failed:`, res.status, err);
    } else {
      console.log(`Batch ${i / 25 + 1}: ${batch.length} dishes inserted`);
    }
  }

  console.log('Seed complete!');

  // Verify
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/dishes?select=name,cuisine&limit=5`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  const sample = await verifyRes.json();
  console.log('Sample dishes:', sample);
}

seed().catch(console.error);
