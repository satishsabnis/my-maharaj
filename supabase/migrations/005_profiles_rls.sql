-- Migration 005: Add RLS policy for profiles table
-- Without this, authenticated users cannot upsert their own profile row —
-- the write is silently blocked and the catch{} in dietary-profile.tsx swallowed the error.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
