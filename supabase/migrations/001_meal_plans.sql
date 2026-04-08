-- ============================================================================
-- Migration 001: meal_plans, dish_feedback, meal_prep_tasks
-- My Maharaj V3 — Supabase migration for meal plan persistence
-- ============================================================================

-- ─── 1. meal_plans ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_plans (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  date_range    TEXT,                       -- display string e.g. "7 Apr — 13 Apr 2026"
  cuisine       TEXT DEFAULT 'Various',
  food_pref     TEXT DEFAULT 'veg',
  plan_json     JSONB NOT NULL DEFAULT '{}', -- full confirmed plan
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own meal_plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal_plans"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal_plans"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal_plans"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_meal_plans_user_id ON meal_plans (user_id);
CREATE INDEX idx_meal_plans_created ON meal_plans (created_at DESC);

-- ─── 2. dish_feedback ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dish_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name     TEXT NOT NULL,
  rating        TEXT NOT NULL CHECK (rating IN ('loved', 'ok', 'disliked')),
  count         INTEGER DEFAULT 1,
  is_favourite  BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, dish_name)
);

ALTER TABLE dish_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dish_feedback"
  ON dish_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dish_feedback"
  ON dish_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dish_feedback"
  ON dish_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dish_feedback"
  ON dish_feedback FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_dish_feedback_user_id ON dish_feedback (user_id);
CREATE INDEX idx_dish_feedback_dish ON dish_feedback (user_id, dish_name);

-- ─── 3. meal_prep_tasks ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_prep_tasks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  dish          TEXT NOT NULL,
  day           TEXT NOT NULL,
  meal          TEXT NOT NULL,
  prep_type     TEXT NOT NULL,
  instruction   TEXT NOT NULL,
  timing        TEXT NOT NULL,              -- 'tonight' | 'tomorrow' | day name
  urgency       TEXT NOT NULL DEFAULT 'upcoming',
  done          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meal_prep_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own meal_prep_tasks"
  ON meal_prep_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal_prep_tasks"
  ON meal_prep_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal_prep_tasks"
  ON meal_prep_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal_prep_tasks"
  ON meal_prep_tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_meal_prep_tasks_user_id ON meal_prep_tasks (user_id);
CREATE INDEX idx_meal_prep_tasks_plan_id ON meal_prep_tasks (plan_id);
