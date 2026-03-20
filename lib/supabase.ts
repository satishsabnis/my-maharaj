import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://ljgfvoyloeelnmugysrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2Z2b3lsb2VlbG5tdWd5c3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTEyMjgsImV4cCI6MjA4OTU2NzIyOH0.AXBGCzbaDlFLkjM7wcCNWNLGi9bDG054jqqOTkqsXio';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export type Profile = {
  id: string;
  full_name: string;
  health_conditions: string[];
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
  appetite: string;
  cuisine_preferences: string[];
  language: string;
  store_preference: string;
  created_at?: string;
  updated_at?: string;
};
