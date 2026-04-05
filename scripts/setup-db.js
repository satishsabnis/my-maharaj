/**
 * Creates the dishes and dish_feedback tables via Supabase REST SQL endpoint.
 * Uses the anon key — requires the SQL endpoint to be accessible.
 * Run: node scripts/setup-db.js
 */

const SUPABASE_URL = 'https://ljgfvoyloeelnmugysrk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2Z2b3lsb2VlbG5tdWd5c3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTEyMjgsImV4cCI6MjA4OTU2NzIyOH0.AXBGCzbaDlFLkjM7wcCNWNLGi9bDG054jqqOTkqsXio';

const SQL = `
-- Dishes RAG table
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_hindi text,
  name_regional text,
  cuisine text[] NOT NULL DEFAULT '{}',
  meal_type text[] NOT NULL DEFAULT '{}',
  dietary text[] NOT NULL DEFAULT '{}',
  health_tags text[] NOT NULL DEFAULT '{}',
  occasion text[] NOT NULL DEFAULT '{}',
  season text[] NOT NULL DEFAULT '{}',
  ingredients_main text[] NOT NULL DEFAULT '{}',
  description text,
  is_banned boolean NOT NULL DEFAULT false,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dishes_search ON dishes USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_dishes_cuisine ON dishes USING gin(cuisine);
CREATE INDEX IF NOT EXISTS idx_dishes_meal_type ON dishes USING gin(meal_type);
CREATE INDEX IF NOT EXISTS idx_dishes_dietary ON dishes USING gin(dietary);
CREATE INDEX IF NOT EXISTS idx_dishes_banned ON dishes (is_banned) WHERE is_banned = false;

-- Dish feedback table
CREATE TABLE IF NOT EXISTS dish_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dish_name text NOT NULL,
  feedback text NOT NULL CHECK (feedback IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dish_feedback_dish ON dish_feedback (dish_name);
CREATE INDEX IF NOT EXISTS idx_dish_feedback_user ON dish_feedback (user_id);
`;

async function run() {
  console.log('Attempting to create tables via Supabase SQL...');

  // Try the pg-meta SQL endpoint (available on Supabase)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query: SQL }),
  });

  if (res.ok) {
    console.log('Tables created via RPC!');
    return;
  }

  // Fallback: try inserting a test row to see if tables exist
  console.log('RPC not available. Testing if dishes table exists...');

  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/dishes?select=id&limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (testRes.ok) {
    console.log('dishes table already exists!');
  } else {
    const errText = await testRes.text();
    if (errText.includes('does not exist') || errText.includes('42P01')) {
      console.log('\n=== TABLES DO NOT EXIST ===');
      console.log('The anon key cannot create tables. Please run this SQL in the Supabase Dashboard SQL Editor:');
      console.log('Dashboard URL: https://supabase.com/dashboard/project/ljgfvoyloeelnmugysrk/sql/new');
      console.log('\n--- Copy everything below this line ---\n');
      console.log(SQL);
      console.log('\n--- End of SQL ---\n');
      console.log('After running the SQL, re-run this script to verify.');
      process.exit(1);
    } else {
      console.log('Unexpected error:', testRes.status, errText);
    }
  }

  // Check dish_feedback table
  const fbRes = await fetch(`${SUPABASE_URL}/rest/v1/dish_feedback?select=id&limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (fbRes.ok) {
    console.log('dish_feedback table already exists!');
  } else {
    console.log('dish_feedback table status:', fbRes.status);
  }
}

run().catch(console.error);
