import { createClient } from '@supabase/supabase-js';

// This is a publishable browser key, not a service-role secret.
// All customer data is protected by PostgreSQL RLS policies.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oqyfvvwplvbmmursbpkd.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fA9X_kf1Fz_DNDXa1I97Sg_RKXCojsd';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
