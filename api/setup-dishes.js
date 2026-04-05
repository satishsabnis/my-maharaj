import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljgfvoyloeelnmugysrk.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const envKeys = Object.keys(process.env).filter(k =>
    k.includes('SUPABASE') || k.includes('POSTGRES') || k.includes('DATABASE')
  );

  if (serviceKey) {
    // With service key, try to create tables via SQL
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Create dishes table
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql_text: `CREATE TABLE IF NOT EXISTS dishes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL, name_hindi text, name_regional text,
        cuisine text[] NOT NULL DEFAULT '{}', meal_type text[] NOT NULL DEFAULT '{}',
        dietary text[] NOT NULL DEFAULT '{}', health_tags text[] NOT NULL DEFAULT '{}',
        occasion text[] NOT NULL DEFAULT '{}', season text[] NOT NULL DEFAULT '{}',
        ingredients_main text[] NOT NULL DEFAULT '{}', description text,
        is_banned boolean NOT NULL DEFAULT false, search_vector tsvector,
        created_at timestamptz NOT NULL DEFAULT now()
      )`
    });

    // Create dish_feedback table
    const { error: e2 } = await supabase.rpc('exec_sql', {
      sql_text: `CREATE TABLE IF NOT EXISTS dish_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL, dish_name text NOT NULL,
        feedback text NOT NULL CHECK (feedback IN ('up', 'down')),
        created_at timestamptz NOT NULL DEFAULT now()
      )`
    });

    // Check tables
    const { error: d1 } = await supabase.from('dishes').select('id').limit(1);
    const { error: d2 } = await supabase.from('dish_feedback').select('id').limit(1);

    res.status(200).json({
      service_key: true,
      dishes_exists: !d1,
      dish_feedback_exists: !d2,
      create_errors: [e1?.message, e2?.message].filter(Boolean),
      env_keys: envKeys,
    });
  } else {
    // No service key — check if tables exist
    const supabase = createClient(supabaseUrl, anonKey || '', { auth: { persistSession: false } });
    const { error: d1 } = await supabase.from('dishes').select('id').limit(1);
    const { error: d2 } = await supabase.from('dish_feedback').select('id').limit(1);

    res.status(200).json({
      service_key: false,
      dishes_exists: !d1,
      dish_feedback_exists: !d2,
      env_keys: envKeys,
      message: 'No service key found. Run scripts/create-tables.sql manually in Supabase SQL Editor.',
      sql_editor_url: `https://supabase.com/dashboard/project/ljgfvoyloeelnmugysrk/sql/new`,
    });
  }
}
