import { createClient } from '@supabase/supabase-js';

// This is a publishable browser key, not a service-role secret.
// All customer data is protected by PostgreSQL RLS policies.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qccbsuxomdqdwfnqoycb.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Qo4sgs9C0Bb63tqobDQT2w_RrH7_6Y5';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
