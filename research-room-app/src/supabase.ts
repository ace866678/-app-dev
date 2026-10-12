import { createClient } from '@supabase/supabase-js';

// Temporary deadline-compatibility backend: retain existing Supabase Auth users
// and research records while the Firebase migration is kept isolated in its own branch.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ldsjdsgzqcawuhrnbvkq.supabase.co';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_piZ6DKt2XjdNs76UWR-41w_c9oIWLsi';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
