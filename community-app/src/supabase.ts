import { createClient } from '@supabase/supabase-js';

// This is a browser-safe publishable key. Row Level Security protects all community tables.
const supabaseUrl = 'https://oqyfvvwplvbmmursbpkd.supabase.co';
const supabasePublishableKey = 'sb_publishable_fA9X_kf1Fz_DNDXa1I97Sg_RKXCojsd';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
