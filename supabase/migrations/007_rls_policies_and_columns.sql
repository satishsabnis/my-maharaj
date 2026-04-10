-- Migration 007: RLS policies for menu_history and dish_history, missing meal_plans column

-- menu_history policies
CREATE POLICY "Users can insert own menu history"
  ON menu_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own menu history"
  ON menu_history FOR SELECT
  USING (auth.uid() = user_id);

-- dish_history policies
CREATE POLICY "Users can insert own dish history"
  ON dish_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own dish history"
  ON dish_history FOR SELECT
  USING (auth.uid() = user_id);

-- meal_plans: add missing date_range column
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS date_range TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
