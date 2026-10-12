#!/usr/bin/env node
/**
 * Supabase Data Export Script
 * 
 * Exports all data from Supabase for migration to Firebase.
 * Requires Supabase Service Role Key (not publishable key) for full access.
 * 
 * Usage:
 *   SUPABASE_URL=https://ldsjdsgzqcawuhrnbvkq.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node export-supabase-data.js
 * 
 * Output: ./supabase-export/
 *   - users.json (auth.users)
 *   - research_workspaces.json
 *   - research_members.json
 *   - research_sections.json
 *   - research_tasks.json
 *   - research_meetings.json
 *   - research_messages.json
 *   - research_notifications.json
 *   - research_chapters.json
 *   - research_member_profiles.json
 *   - research_invitations.json
 *   - research_presence.json
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ldsjdsgzqcawuhrnbvkq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Get it from Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const OUTPUT_DIR = './supabase-export';

const TABLES = [
  'research_workspaces',
  'research_members',
  'research_sections',
  'research_tasks',
  'research_meetings',
  'research_messages',
  'research_notifications',
  'research_chapters',
  'research_member_profiles',
  'research_invitations',
  'research_presence',
];

async function exportAuthUsers() {
  console.log('Exporting auth users...');
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.map(u => ({
    id: u.id,
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    phone: u.phone,
    created_at: u.created_at,
    updated_at: u.updated_at,
    last_sign_in_at: u.last_sign_in_at,
    user_metadata: u.user_metadata,
    app_metadata: u.app_metadata,
    identities: u.identities,
  }));
}

async function exportTable(table) {
  console.log(`Exporting ${table}...`);
  const allRows = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      if (error.message.includes('Could not find the table') || error.message.includes('does not exist')) {
        console.log(`  Table ${table} does not exist, skipping`);
        return [];
      }
      throw error;
    }
    if (!data || data.length === 0) break;
    
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  
  return allRows;
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Starting Supabase export...');
  console.log(`Output directory: ${OUTPUT_DIR}`);

  try {
    const users = await exportAuthUsers();
    writeFileSync(`${OUTPUT_DIR}/users.json`, JSON.stringify(users, null, 2));
    console.log(`Exported ${users.length} users`);

    for (const table of TABLES) {
      const rows = await exportTable(table);
      writeFileSync(`${OUTPUT_DIR}/${table}.json`, JSON.stringify(rows, null, 2));
      console.log(`Exported ${rows.length} rows from ${table}`);
    }

    console.log('\nExport complete!');
    console.log(`Files written to ${OUTPUT_DIR}/`);
  } catch (error) {
    console.error('Export failed:', error.message);
    process.exit(1);
  }
}

main();