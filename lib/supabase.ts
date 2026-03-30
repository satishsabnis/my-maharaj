import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://ljgfvoyloeelnmugysrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2Z2b3lsb2VlbG5tdWd5c3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTEyMjgsImV4cCI6MjA4OTU2NzIyOH0.AXBGCzbaDlFLkjM7wcCNWNLGi9bDG054jqqOTkqsXio';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    storage: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.localStorage : undefined) : undefined,
  },
});

// ─── Session helper ──────────────────────────────────────────────────────────
// Use getSession() instead of getUser() to avoid "session expired" errors.
// Automatically refreshes the session if the first attempt returns no user.

export async function getSessionUser() {
  // Attempt 1: getSession from local storage
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  console.log('[getSessionUser] getSession result:', session ? `user=${session.user?.id}` : 'null', sessErr ? `err=${sessErr.message}` : '');
  if (session?.user) return session.user;

  // Attempt 2: refresh the token
  console.log('[getSessionUser] No session, trying refreshSession...');
  const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
  console.log('[getSessionUser] refreshSession result:', refreshData?.session ? `user=${refreshData.session.user?.id}` : 'null', refreshErr ? `err=${refreshErr.message}` : '');
  if (refreshData?.session?.user) return refreshData.session.user;

  // Attempt 3: getSession again after refresh
  const { data: { session: retrySession } } = await supabase.auth.getSession();
  console.log('[getSessionUser] retry getSession:', retrySession ? `user=${retrySession.user?.id}` : 'null');
  return retrySession?.user ?? null;
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
