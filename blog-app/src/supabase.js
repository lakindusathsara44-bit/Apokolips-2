import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://oqyfvvwplvbmmursbpkd.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fA9X_kf1Fz_DNDXa1I97Sg_RKXCojsd';

function createVisitorId() {
  try {
    const saved = localStorage.getItem('apokolips-blog-visitor-v1');
    if (saved) return saved;
  } catch (_) {}
  const value = globalThis.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  try { localStorage.setItem('apokolips-blog-visitor-v1', value); } catch (_) {}
  return value;
}

export const visitorId = createVisitorId();
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { headers: { 'x-blog-visitor': visitorId } },
  auth: { persistSession: false, autoRefreshToken: false }
});
