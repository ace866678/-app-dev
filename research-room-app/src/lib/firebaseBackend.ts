/**
 * Temporary deadline-compatibility adapter.
 *
 * The current UI expects a Supabase-style auth/data client. Pointing it to
 * the original Supabase project keeps existing user IDs and research data
 * available while the Firestore migration is validated separately.
 *
 * Do not treat this branch as the completed Firebase migration or merge it
 * into the Firebase release branch without reviewing the migration plan.
 */
import { supabase } from '../supabase';

export const firebaseBackend = supabase;
