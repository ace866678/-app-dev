#!/usr/bin/env node
/**
 * Data Transformation Script
 * 
 * Transforms Supabase export data for Firebase import using user-mapping.json
 * 
 * Usage:
 *   node transform-data.js
 * 
 * Input: ./supabase-export/, ./user-mapping.json
 * Output: ./firebase-import/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const EXPORT_DIR = './supabase-export';
const IMPORT_DIR = './firebase-import';
const MAPPING_FILE = './user-mapping.json';

function loadJSON(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function saveJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function getFirebaseUid(supabaseUserId, mapping) {
  const match = mapping.supabaseToFirebaseUserMapping.find(m => m.supabaseUserId === supabaseUserId);
  if (match) return match.firebaseUid;
  
  // Check unmatched users - they'll need new Firebase accounts
  const unmatched = mapping.supabaseUsersWithoutFirebaseMatch.find(u => u.supabaseUserId === supabaseUserId);
  if (unmatched) return `NEW_UID_NEEDED:${unmatched.email}`;
  
  return null;
}

function mapUserIds(obj, mapping) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => mapUserIds(item, mapping));
  }
  
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && value.includes('-') && value.length === 36) {
      // Looks like a UUID - check if it's a user ID that needs mapping
      const firebaseUid = getFirebaseUid(value, mapping);
      if (firebaseUid) {
        result[key] = firebaseUid;
        result[`supabase_${key}`] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = mapUserIds(value, mapping);
    }
  }
  return result;
}

function transformWorkspaceMembers(members, mapping) {
  return members.map(member => {
    const firebaseUid = getFirebaseUid(member.user_id, mapping);
    const newDocId = `${member.workspace_id}__${firebaseUid || member.user_id}`;
    return {
      ...member,
      id: newDocId,
      user_id: firebaseUid || member.user_id,
      supabase_user_id: member.user_id,
      supabase_member_id: member.id,
    };
  });
}

function transformMemberProfiles(profiles, mapping) {
  return profiles.map(profile => {
    const firebaseUid = getFirebaseUid(profile.user_id, mapping);
    const newDocId = `${profile.workspace_id}__${firebaseUid || profile.user_id}`;
    return {
      ...profile,
      id: newDocId,
      user_id: firebaseUid || profile.user_id,
      supabase_user_id: profile.user_id,
    };
  });
}

function transformNotifications(notifications, mapping) {
  return notifications.map(notif => ({
    ...notif,
    recipient_id: getFirebaseUid(notif.recipient_id, mapping) || notif.recipient_id,
    actor_id: getFirebaseUid(notif.actor_id, mapping) || notif.actor_id,
    supabase_recipient_id: notif.recipient_id,
    supabase_actor_id: notif.actor_id,
  }));
}

function transformMessages(messages, mapping) {
  return messages.map(msg => ({
    ...msg,
    sender_id: getFirebaseUid(msg.sender_id, mapping) || msg.sender_id,
    mentioned_user_ids: (msg.mentioned_user_ids || []).map(id => getFirebaseUid(id, mapping) || id),
    supabase_sender_id: msg.sender_id,
  }));
}

function transformTasks(tasks, mapping) {
  return tasks.map(task => ({
    ...task,
    assignee_id: getFirebaseUid(task.assignee_id, mapping) || task.assignee_id,
    created_by: getFirebaseUid(task.created_by, mapping) || task.created_by,
    supabase_assignee_id: task.assignee_id,
    supabase_created_by: task.created_by,
  }));
}

function transformMeetings(meetings, mapping) {
  return meetings.map(m => ({
    ...m,
    created_by: getFirebaseUid(m.created_by, mapping) || m.created_by,
    supabase_created_by: m.created_by,
  }));
}

function transformSections(sections, mapping) {
  return sections.map(s => ({
    ...s,
    created_by: getFirebaseUid(s.created_by, mapping) || s.created_by,
    updated_by: getFirebaseUid(s.updated_by, mapping) || s.updated_by,
    supabase_created_by: s.created_by,
    supabase_updated_by: s.updated_by,
  }));
}

function transformChapters(chapters, mapping) {
  return chapters.map(c => ({
    ...c,
    created_by: getFirebaseUid(c.created_by, mapping) || c.created_by,
    supabase_created_by: c.created_by,
  }));
}

function transformWorkspaces(workspaces, mapping) {
  return workspaces.map(w => ({
    ...w,
    owner_id: getFirebaseUid(w.created_by, mapping) || w.created_by,
    supabase_workspace_id: w.id,
    supabase_created_by: w.created_by,
  }));
}

async function main() {
  if (!existsSync(EXPORT_DIR)) {
    console.error('Export directory not found. Run export-supabase-data.js first.');
    process.exit(1);
  }
  if (!existsSync(MAPPING_FILE)) {
    console.error('Mapping file not found. Run inventory scripts first.');
    process.exit(1);
  }

  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, { recursive: true });
  }

  const mapping = loadJSON(MAPPING_FILE);
  
  console.log('Loading export data...');
  const users = loadJSON(join(EXPORT_DIR, 'users.json'));
  const workspaces = loadJSON(join(EXPORT_DIR, 'research_workspaces.json'));
  const members = loadJSON(join(EXPORT_DIR, 'research_members.json'));
  const sections = loadJSON(join(EXPORT_DIR, 'research_sections.json'));
  const tasks = loadJSON(join(EXPORT_DIR, 'research_tasks.json'));
  const meetings = loadJSON(join(EXPORT_DIR, 'research_meetings.json'));
  const messages = loadJSON(join(EXPORT_DIR, 'research_messages.json'));
  const notifications = loadJSON(join(EXPORT_DIR, 'research_notifications.json'));
  const chapters = loadJSON(join(EXPORT_DIR, 'research_chapters.json'));
  const memberProfiles = loadJSON(join(EXPORT_DIR, 'research_member_profiles.json'));

  console.log('Transforming data...');

  // Transform each collection
  const transformed = {
    users: users.map(u => ({
      ...u,
      firebase_uid: getFirebaseUid(u.id, mapping) || `NEW_UID_NEEDED:${u.email}`,
      supabase_user_id: u.id,
    })),
    research_workspaces: transformWorkspaces(workspaces, mapping),
    research_members: transformWorkspaceMembers(members, mapping),
    research_sections: transformSections(sections, mapping),
    research_tasks: transformTasks(tasks, mapping),
    research_meetings: transformMeetings(meetings, mapping),
    research_messages: transformMessages(messages, mapping),
    research_notifications: transformNotifications(notifications, mapping),
    research_chapters: transformChapters(chapters, mapping),
    research_member_profiles: transformMemberProfiles(memberProfiles, mapping),
  };

  // Save transformed data
  for (const [collection, data] of Object.entries(transformed)) {
    saveJSON(join(IMPORT_DIR, `${collection}.json`), data);
    console.log(`  Transformed ${data.length} documents for ${collection}`);
  }

  // Create import manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceExportDir: EXPORT_DIR,
    mappingFile: MAPPING_FILE,
    collections: Object.fromEntries(
      Object.entries(transformed).map(([k, v]) => [k, v.length])
    ),
    usersNeedingFirebaseAccounts: transformed.users
      .filter(u => u.firebase_uid.startsWith('NEW_UID_NEEDED:'))
      .map(u => ({ email: u.email, supabaseUserId: u.supabase_user_id })),
  };
  saveJSON(join(IMPORT_DIR, 'manifest.json'), manifest);

  console.log('\nTransformation complete!');
  console.log(`Output directory: ${IMPORT_DIR}/`);
  console.log('\nUsers needing Firebase Auth accounts:');
  for (const u of manifest.usersNeedingFirebaseAccounts) {
    console.log(`  ${u.email} (Supabase: ${u.supabaseUserId})`);
  }
}

main();