import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://oqyfvvwplvbmmursbpkd.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fA9X_kf1Fz_DNDXa1I97Sg_RKXCojsd';

const VISITOR_KEY = 'apokolips-blog-visitor-v1';
const makeVisitorId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
};

let visitorId = localStorage.getItem(VISITOR_KEY);
if (!visitorId) {
  visitorId = makeVisitorId();
  localStorage.setItem(VISITOR_KEY, visitorId);
}

export const blogVisitorId = visitorId;
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { headers: { 'x-blog-visitor': visitorId } },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
