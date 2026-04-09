-- Batch A: Security + Schema fixes | 2026-04-09

-- 1. Enable RLS on family_members (health data: lipid profiles, medical flags)
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own family members"
  ON family_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Add plan_summary_language to profiles
--    Stores the language for plan summaries (en / hi / ml)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_summary_language TEXT DEFAULT 'en';
