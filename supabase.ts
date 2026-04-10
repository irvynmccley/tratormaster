import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debugging (only in development)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing!');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Defined' : 'MISSING');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Defined' : 'MISSING');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
