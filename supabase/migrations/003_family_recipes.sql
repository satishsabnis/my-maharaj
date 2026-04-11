-- Batch F: Family Recipe Import | 2026-04-09

CREATE TABLE IF NOT EXISTS family_recipes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_name TEXT         NOT NULL,
  cuisine     TEXT,
  serves      INTEGER,
  prep_time   TEXT,
  cook_time   TEXT,
  ingredients JSONB        NOT NULL DEFAULT '[]',
  method      JSONB        NOT NULL DEFAULT '[]',
  notes       TEXT,
  is_veg      BOOLEAN      NOT NULL DEFAULT true,
  source      TEXT         NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE family_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own family recipes"
  ON family_recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_family_recipes_user_id ON family_recipes(user_id);
