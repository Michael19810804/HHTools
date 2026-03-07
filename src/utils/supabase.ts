import { createClient } from '@supabase/supabase-js';

// MemFire Cloud Configuration (Hardcoded for stability, but overridable via env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://d6c963og91hgk1gnqgc0.baseapi.memfiredb.com';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0ODQwNjc5OSwiaWF0IjoxNzcxNjA2Nzk5LCJpc3MiOiJzdXBhYmFzZSJ9.nNrbe941GbLsveztkauw1wyKdoAEP_pjZZSPMjpRpKY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_ANON_KEY = supabaseAnonKey;
// Use VITE_API_BASE_URL environment variable if available (e.g. '/api' for Docker deployment), otherwise fallback to MemFire Functions
export const MEMFIRE_FUNCTION_URL = import.meta.env.VITE_API_BASE_URL || 'https://functions2.memfiredb.com/d6c963og91hgk1gnqgc0';
