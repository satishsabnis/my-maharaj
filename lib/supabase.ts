import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ljgfvoyloeelnmugysrk.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2Z2b3lsb2VlbG5tdWd5c3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTEyMjgsImV4cCI6MjA4OTU2NzIyOH0.AXBGCzbaDlFLkjM7wcCNWNLGi9bDG054jqqOTkqsXio';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Session helper ──────────────────────────────────────────────────────────
// Use getSession() instead of getUser() to avoid "session expired" errors.
// Automatically refreshes the session if the first attempt returns no user.

export async function getSessionUser() {
  // Attempt 1: getSession - reads from local storage / memory
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (user) return user;

  // Attempt 2: refresh token then retry
  await supabase.auth.refreshSession();
  const { data: retried } = await supabase.auth.getSession();
  return retried?.session?.user ?? null;
}

// ─── Security helper ──────────────────────────────────────────────────────────

export async function getSecureUserData(table: string, userId: string) {
  const user = await getSessionUser();
  if (!user || user.id !== userId) {
    await supabase.auth.signOut();
    throw new Error('Unauthorized access attempt');
  }
  return supabase.from(table).select('*').eq('user_id', userId);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  full_name: string;
  family_name: string | null;
  mobile_number: string | null;
  avatar_url: string | null;
  app_language: string;
  is_diabetic: boolean;
  has_bp: boolean;
  has_pcos: boolean;
  appetite_level: string;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
  store_preference: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  age: number;
  relationship: string | null;
  is_diabetic: boolean;
  has_bp: boolean;
  has_pcos: boolean;
  food_likes: string | null;
  food_dislikes: string | null;
  allergies: string | null;
  remarks: string | null;
  lipid_profile_url: string | null;
  lipid_test_date: string | null;
  lipid_expiry_date: string | null;
  created_at?: string;
};
