-- Dishes RAG table — uses tsvector for full-text search (no pgvector dependency)
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

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_dishes_search ON dishes USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_dishes_cuisine ON dishes USING gin(cuisine);
CREATE INDEX IF NOT EXISTS idx_dishes_meal_type ON dishes USING gin(meal_type);
CREATE INDEX IF NOT EXISTS idx_dishes_dietary ON dishes USING gin(dietary);
CREATE INDEX IF NOT EXISTS idx_dishes_banned ON dishes (is_banned) WHERE is_banned = false;

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION dishes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.name_hindi, '') || ' ' ||
    coalesce(NEW.name_regional, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    array_to_string(NEW.cuisine, ' ') || ' ' ||
    array_to_string(NEW.meal_type, ' ') || ' ' ||
    array_to_string(NEW.dietary, ' ') || ' ' ||
    array_to_string(NEW.health_tags, ' ') || ' ' ||
    array_to_string(NEW.ingredients_main, ' ')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dishes_search_trigger ON dishes;
CREATE TRIGGER dishes_search_trigger
  BEFORE INSERT OR UPDATE ON dishes
  FOR EACH ROW EXECUTE FUNCTION dishes_search_vector_update();

-- Dish feedback table
CREATE TABLE IF NOT EXISTS dish_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  dish_name text NOT NULL,
  feedback text NOT NULL CHECK (feedback IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dish_feedback_dish ON dish_feedback (dish_name);
CREATE INDEX IF NOT EXISTS idx_dish_feedback_user ON dish_feedback (user_id);

-- RLS policies
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Dishes are readable by all authenticated users" ON dishes FOR SELECT TO authenticated USING (true);

ALTER TABLE dish_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can insert their own feedback" ON dish_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can read their own feedback" ON dish_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
