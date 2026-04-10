-- Migration 006: Fix profiles primary key, create missing tables, add missing columns

-- ISSUE 1: Ensure profiles.id is a proper primary key so PostgREST recognises it for upsert on_conflict
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- ISSUE 2: menu_history table (was stored in AsyncStorage only, not in Supabase)
CREATE TABLE IF NOT EXISTS menu_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data  JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE menu_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own menu history"
  ON menu_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ISSUE 3: dish_history table (queried in runGeneration but never created)
CREATE TABLE IF NOT EXISTS dish_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name  TEXT NOT NULL,
  served_date DATE NOT NULL,
  meal_type  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE dish_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own dish history"
  ON dish_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ISSUE 4: meal_plans missing cuisine columns
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS cuisine  TEXT;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS cuisines TEXT[];
