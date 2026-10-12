/**
 * Firestore Security Rules Unit Tests
 * 
 * Tests run against the Firestore emulator with authenticated client contexts.
 * Uses Admin SDK for test setup, client SDK for rule testing.
 * 
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *   GCLOUD_PROJECT=demo-research-room \
 *   node firestore-rules-tests.js
 */

import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = 'demo-research-room';
const RULES_PATH = join('/workspace/app', 'research-room-app', 'firestore.rules');

async function setupTestData(adminDb) {
  console.log('  Setting up test data...');
  
  // Create workspace
  await adminDb.collection('research_workspaces').doc('ws-1').set({
    id: 'ws-1',
    title: 'Test Workspace',
    research_title: 'Test Research',
    institution: 'Test Institution',
    program: 'Test Program',
    owner_id: 'owner-uid',
    join_code: 'ABC12345',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  // Create owner membership
  await adminDb.collection('research_members').doc('ws-1__owner-uid').set({
    id: 'ws-1__owner-uid',
    workspace_id: 'ws-1',
    user_id: 'owner-uid',
    role: 'owner',
    joined_at: new Date().toISOString(),
    display_name: 'Owner',
    email: 'owner@example.com',
  });
  
  // Create member membership
  await adminDb.collection('research_members').doc('ws-1__member-uid').set({
    id: 'ws-1__member-uid',
    workspace_id: 'ws-1',
    user_id: 'member-uid',
    role: 'member',
    joined_at: new Date().toISOString(),
    display_name: 'Member',
    email: 'member@example.com',
  });
  
  // Create second workspace for non-member test
  await adminDb.collection('research_workspaces').doc('ws-2').set({
    id: 'ws-2',
    title: 'Other Workspace',
    research_title: 'Other Research',
    institution: 'Other Institution',
    program: 'Other Program',
    owner_id: 'other-owner',
    join_code: 'XYZ78901',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  await adminDb.collection('research_members').doc('ws-2__other-owner').set({
    id: 'ws-2__other-owner',
    workspace_id: 'ws-2',
    user_id: 'other-owner',
    role: 'owner',
    joined_at: new Date().toISOString(),
  });
  
  // Create member profiles
  await adminDb.collection('research_member_profiles').doc('ws-1__owner-uid').set({
    id: 'ws-1__owner-uid',
    workspace_id: 'ws-1',
    user_id: 'owner-uid',
    display_name: 'Owner',
    avatar_url: '',
    updated_at: new Date().toISOString(),
  });
  
  await adminDb.collection('research_member_profiles').doc('ws-1__member-uid').set({
    id: 'ws-1__member-uid',
    workspace_id: 'ws-1',
    user_id: 'member-uid',
    display_name: 'Member',
    avatar_url: '',
    updated_at: new Date().toISOString(),
  });
  
  console.log('  Test data setup complete');
}

async function main() {
  console.log('=== Firestore Security Rules Tests ===\n');

  // Set emulator host for Admin SDK
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.GCLOUD_PROJECT = PROJECT_ID;

  // Load rules
  const rules = readFileSync(RULES_PATH, 'utf8');

  // Initialize Admin SDK for test setup (uses emulator)
  const adminApp = getApps().length ? getApps()[0] : initializeApp({ projectId: PROJECT_ID });
  const adminDb = getFirestore(adminApp);

  // Initialize test environment
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });

  // Clean up and setup test data
  await testEnv.clearFirestore();
  await setupTestData(adminDb);

  let passed = 0;
  let failed = 0;

  // Helper to create authenticated context
  const auth = (uid, email = 'test@example.com', provider = 'password') => 
    testEnv.authenticatedContext(uid, { email, provider_id: provider });

  // Test 1: users collection - users can only read/write their own document
  console.log('--- users collection ---');
  
  try {
    const ctx = auth('user-123');
    const db = ctx.firestore();
    const userRef = db.collection('users').doc('user-123');
    
    // Own user - should succeed
    await assertSucceeds(userRef.set({ email: 'user1@example.com', display_name: 'User 1' }));
    await assertSucceeds(userRef.get());
    await assertSucceeds(userRef.update({ display_name: 'Updated' }));
    console.log('  ✅ User can CRUD own document');
    passed++;
  } catch (e) {
    console.log('  ❌ User CRUD own document failed:', e.message);
    failed++;
  }

  try {
    const ctx = auth('user-123');
    const db = ctx.firestore();
    const otherRef = db.collection('users').doc('user-456');
    
    // Other user - should fail
    await assertFails(otherRef.get());
    await assertFails(otherRef.set({ email: 'other@example.com' }));
    console.log('  ✅ User cannot read/write other user document');
    passed++;
  } catch (e) {
    console.log('  ❌ Other user access test failed:', e.message);
    failed++;
  }

  try {
    const ctx = auth('user-123');
    const db = ctx.firestore();
    
    // List - should fail (allow list: if false)
    await assertFails(db.collection('users').get());
    console.log('  ✅ User cannot list users collection');
    passed++;
  } catch (e) {
    console.log('  ❌ List users test failed:', e.message);
    failed++;
  }

  // Test 2: publicProfiles - anyone signed in can read, only owner can write
  console.log('\n--- publicProfiles collection ---');
  
  try {
    const ctx = auth('user-123');
    const db = ctx.firestore();
    const profileRef = db.collection('publicProfiles').doc('user-123');
    
    await assertSucceeds(profileRef.set({ 
      uid: 'user-123', 
      display_name: 'User 1', 
      photo_url: '', 
      updated_at: new Date().toISOString() 
    }));
    await assertSucceeds(profileRef.get());
    console.log('  ✅ User can create/read own profile');
    passed++;
  } catch (e) {
    console.log('  ❌ Own profile test failed:', e.message);
    failed++;
  }

  try {
    const ctx = auth('user-123');
    const db = ctx.firestore();
    const otherProfileRef = db.collection('publicProfiles').doc('user-456');
    
    // Can read other profiles
    await assertSucceeds(otherProfileRef.get());
    console.log('  ✅ User can read other profiles');
    passed++;
  } catch (e) {
    console.log('  ❌ Read other profile test failed:', e.message);
    failed++;
  }

  try {
    const ctx = auth('user-123');
    const db = ctx.firestore();
    const otherProfileRef = db.collection('publicProfiles').doc('user-456');
    
    // Cannot write other profiles
    await assertFails(otherProfileRef.set({ 
      uid: 'user-456', 
      display_name: 'Hacker', 
      photo_url: '', 
      updated_at: new Date().toISOString() 
    }));
    console.log('  ✅ User cannot write other profiles');
    passed++;
  } catch (e) {
    console.log('  ❌ Write other profile test failed:', e.message);
    failed++;
  }

  // Test 3: research_workspaces - members can read, owner can update/delete
  console.log('\n--- research_workspaces collection ---');
  
  try {
    // Member can read workspace they belong to
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    await assertSucceeds(memberDb.collection('research_workspaces').doc('ws-1').get());
    console.log('  ✅ Member can read workspace they belong to');
    passed++;
  } catch (e) {
    console.log('  ❌ Member read workspace test failed:', e.message);
    failed++;
  }

  try {
    // Non-member cannot read workspace
    const outsiderCtx = auth('outsider-uid');
    const outsiderDb = outsiderCtx.firestore();
    await assertFails(outsiderDb.collection('research_workspaces').doc('ws-1').get());
    console.log('  ✅ Non-member cannot read workspace');
    passed++;
  } catch (e) {
    console.log('  ❌ Non-member read test failed:', e.message);
    failed++;
  }

  try {
    // Owner can update workspace
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    await assertSucceeds(ownerDb.collection('research_workspaces').doc('ws-1').update({
      title: 'Updated Title',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Owner can update workspace');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner update workspace test failed:', e.message);
    failed++;
  }

  try {
    // Member cannot update workspace
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertFails(memberDb.collection('research_workspaces').doc('ws-1').update({
      title: 'Hacked Title',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Member cannot update workspace');
    passed++;
  } catch (e) {
    console.log('  ❌ Member update workspace test failed:', e.message);
    failed++;
  }

  // Test 4: research_members - members can read, owner can manage
  console.log('\n--- research_members collection ---');
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    // Member can read own membership
    await assertSucceeds(memberDb.collection('research_members').doc('ws-1__member-uid').get());
    console.log('  ✅ Member can read own membership');
    passed++;
  } catch (e) {
    console.log('  ❌ Member read own membership failed:', e.message);
    failed++;
  }

  try {
    // Owner can read all memberships in workspace
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    await assertSucceeds(ownerDb.collection('research_members').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Owner can list workspace members');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner list members test failed:', e.message);
    failed++;
  }

  // Test 5: research_sections - members can read, creator can update
  console.log('\n--- research_sections collection ---');
  
  // Create a section first via admin
  await adminDb.collection('research_sections').doc('section-1').set({
    id: 'section-1',
    workspace_id: 'ws-1',
    title: 'Test Section',
    content: 'Content',
    chapter: 'Chapter 1',
    order: 0,
    created_by: 'member-uid',
    updated_by: 'member-uid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    // Member can list sections in workspace
    await assertSucceeds(memberDb.collection('research_sections').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Member can list workspace sections');
    passed++;
  } catch (e) {
    console.log('  ❌ Member list sections test failed:', e.message);
    failed++;
  }

  try {
    // Creator can update section
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertSucceeds(memberDb.collection('research_sections').doc('section-1').update({
      content: 'Updated content',
      updated_by: 'member-uid',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Creator can update section');
    passed++;
  } catch (e) {
    console.log('  ❌ Creator update section test failed:', e.message);
    failed++;
  }

  try {
    // Owner CAN update section (isMember + updated_by == request.auth.uid)
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    await assertSucceeds(ownerDb.collection('research_sections').doc('section-1').update({
      content: 'Owner updated content',
      updated_by: 'owner-uid',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Owner (as member) can update section (updated_by = own UID)');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner update section test failed:', e.message);
    failed++;
  }

  // Test 6: research_tasks - members can read, creator can update
  console.log('\n--- research_tasks collection ---');
  
  await adminDb.collection('research_tasks').doc('task-1').set({
    id: 'task-1',
    workspace_id: 'ws-1',
    title: 'Test Task',
    description: 'Description',
    assignee_id: 'member-uid',
    assignee_name: 'Member',
    due_date: '2026-12-31',
    priority: 'High',
    status: 'To do',
    created_by: 'member-uid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    await assertSucceeds(memberDb.collection('research_tasks').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Member can list workspace tasks');
    passed++;
  } catch (e) {
    console.log('  ❌ Member list tasks test failed:', e.message);
    failed++;
  }

  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertSucceeds(memberDb.collection('research_tasks').doc('task-1').update({
      status: 'In progress',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Assignee/creator can update task');
    passed++;
  } catch (e) {
    console.log('  ❌ Task update test failed:', e.message);
    failed++;
  }

  // Test assignee membership validation
  console.log('\n--- research_tasks assignee validation ---');

  try {
    // Positive: Create task with valid member assignee (member-uid is a member of ws-1)
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertSucceeds(memberDb.collection('research_tasks').doc('task-assignee-valid').set({
      id: 'task-assignee-valid',
      workspace_id: 'ws-1',
      title: 'Task with valid assignee',
      description: 'Test',
      assignee_id: 'member-uid',
      assignee_name: 'Member',
      due_date: '2026-12-31',
      priority: 'High',
      status: 'To do',
      created_by: 'member-uid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Create task with valid member assignee succeeds');
    passed++;
  } catch (e) {
    console.log('  ❌ Create task with valid member assignee failed:', e.message);
    failed++;
  }

  try {
    // Positive: Create task with empty assignee (unassigned)
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertSucceeds(memberDb.collection('research_tasks').doc('task-assignee-empty').set({
      id: 'task-assignee-empty',
      workspace_id: 'ws-1',
      title: 'Task with no assignee',
      description: 'Test',
      assignee_id: '',
      assignee_name: '',
      due_date: '2026-12-31',
      priority: 'High',
      status: 'To do',
      created_by: 'member-uid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Create task with empty assignee succeeds');
    passed++;
  } catch (e) {
    console.log('  ❌ Create task with empty assignee failed:', e.message);
    failed++;
  }

  try {
    // Negative: Create task with non-member assignee (outsider-uid is not a member of ws-1)
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertFails(memberDb.collection('research_tasks').doc('task-assignee-invalid').set({
      id: 'task-assignee-invalid',
      workspace_id: 'ws-1',
      title: 'Task with invalid assignee',
      description: 'Test',
      assignee_id: 'outsider-uid',
      assignee_name: 'Outsider',
      due_date: '2026-12-31',
      priority: 'High',
      status: 'To do',
      created_by: 'member-uid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Create task with non-member assignee correctly rejected');
    passed++;
  } catch (e) {
    console.log('  ❌ Create task with non-member assignee not rejected:', e.message);
    failed++;
  }

  try {
    // Negative: Update task to assign to non-member
    // First create a valid task
    await adminDb.collection('research_tasks').doc('task-update-assignee').set({
      id: 'task-update-assignee',
      workspace_id: 'ws-1',
      title: 'Task to update assignee',
      description: 'Test',
      assignee_id: 'member-uid',
      assignee_name: 'Member',
      due_date: '2026-12-31',
      priority: 'High',
      status: 'To do',
      created_by: 'member-uid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertFails(memberDb.collection('research_tasks').doc('task-update-assignee').update({
      assignee_id: 'outsider-uid',
      assignee_name: 'Outsider',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Update task to non-member assignee correctly rejected');
    passed++;
  } catch (e) {
    console.log('  ❌ Update task to non-member assignee not rejected:', e.message);
    failed++;
  }

  try {
    // Positive: Update task assignee to another valid member (owner-uid is also a member of ws-1)
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertSucceeds(memberDb.collection('research_tasks').doc('task-update-assignee').update({
      assignee_id: 'owner-uid',
      assignee_name: 'Owner',
      updated_at: new Date().toISOString(),
    }));
    console.log('  ✅ Update task to another valid member assignee succeeds');
    passed++;
  } catch (e) {
    console.log('  ❌ Update task to another valid member assignee failed:', e.message);
    failed++;
  }

  // Test 7: research_messages - members can create, owner can delete
  console.log('\n--- research_messages collection ---');
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    // Member can send message
    await assertSucceeds(memberDb.collection('research_messages').doc('msg-test-1').set({
      id: 'msg-test-1',
      workspace_id: 'ws-1',
      sender_id: 'member-uid',
      sender_name: 'Member',
      text: 'Hello',
      topic: 'General',
      mentioned_user_ids: [],
      created_at: new Date().toISOString(),
    }));
    console.log('  ✅ Member can send message');
    passed++;
  } catch (e) {
    console.log('  ❌ Member send message test failed:', e.message);
    failed++;
  }

  try {
    // Owner can delete message
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    // Create a message to delete
    const msgRef = await adminDb.collection('research_messages').add({
      workspace_id: 'ws-1',
      sender_id: 'member-uid',
      sender_name: 'Member',
      text: 'To be deleted',
      topic: 'General',
      mentioned_user_ids: [],
      created_at: new Date().toISOString(),
    });
    
    await assertSucceeds(ownerDb.collection('research_messages').doc(msgRef.id).delete());
    console.log('  ✅ Owner can delete message');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner delete message test failed:', e.message);
    failed++;
  }

  // Test 8: research_notifications - recipient and owner can read
  console.log('\n--- research_notifications collection ---');
  
  await adminDb.collection('research_notifications').doc('notif-1').set({
    id: 'notif-1',
    workspace_id: 'ws-1',
    recipient_id: 'member-uid',
    actor_id: 'owner-uid',
    kind: 'message',
    content: 'Test notification',
    metadata: {},
    created_at: new Date().toISOString(),
    read_at: null,
  });
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    // Member can read own notifications
    await assertSucceeds(memberDb.collection('research_notifications').where('recipient_id', '==', 'member-uid').get());
    console.log('  ✅ Member can read own notifications');
    passed++;
  } catch (e) {
    console.log('  ❌ Member read notifications test failed:', e.message);
    failed++;
  }

  try {
    // Owner can read all notifications in workspace
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    await assertSucceeds(ownerDb.collection('research_notifications').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Owner can list workspace notifications');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner list notifications test failed:', e.message);
    failed++;
  }

  // Test 9: research_chapters - members can read, creator can update
  console.log('\n--- research_chapters collection ---');
  
  await adminDb.collection('research_chapters').doc('chapter-1').set({
    id: 'chapter-1',
    workspace_id: 'ws-1',
    title: 'Chapter 1',
    chapter_order: 1,
    created_by: 'member-uid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertSucceeds(memberDb.collection('research_chapters').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Member can list workspace chapters');
    passed++;
  } catch (e) {
    console.log('  ❌ Member list chapters test failed:', e.message);
    failed++;
  }

  // Test 10: research_member_profiles - members can read, user/owner can write
  console.log('\n--- research_member_profiles collection ---');
  
  try {
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    
    // Member can read own profile
    await assertSucceeds(memberDb.collection('research_member_profiles').doc('ws-1__member-uid').get());
    console.log('  ✅ Member can read own profile');
    passed++;
  } catch (e) {
    console.log('  ❌ Member read own profile test failed:', e.message);
    failed++;
  }

  try {
    // Owner can read all profiles
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    await assertSucceeds(ownerDb.collection('research_member_profiles').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Owner can list workspace profiles');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner list profiles test failed:', e.message);
    failed++;
  }

  // Test 11: Unauthenticated access - all should fail
  console.log('\n--- Unauthenticated access ---');
  
  try {
    const unauthCtx = testEnv.unauthenticatedContext();
    const unauthDb = unauthCtx.firestore();
    
    await assertFails(unauthDb.collection('users').doc('user-123').get());
    await assertFails(unauthDb.collection('research_workspaces').doc('ws-1').get());
    await assertFails(unauthDb.collection('research_messages').where('workspace_id', '==', 'ws-1').get());
    console.log('  ✅ Unauthenticated access denied');
    passed++;
  } catch (e) {
    console.log('  ❌ Unauthenticated test failed:', e.message);
    failed++;
  }

  // Test 12: research_invitations - owner can create, get
  console.log('\n--- research_invitations collection ---');
  
  try {
    const ownerCtx = auth('owner-uid');
    const ownerDb = ownerCtx.firestore();
    
    // Owner can create invitation
    await assertSucceeds(ownerDb.collection('research_invitations').doc('NEWINVITE').set({
      id: 'NEWINVITE',
      code: 'NEWINVITE',
      workspace_id: 'ws-1',
      active: true,
      created_by: 'owner-uid',
      created_at: new Date().toISOString(),
      workspace_title: 'Test Workspace',
    }));
    console.log('  ✅ Owner can create invitation');
    passed++;
  } catch (e) {
    console.log('  ❌ Owner create invitation test failed:', e.message);
    failed++;
  }

  try {
    // Non-owner cannot create invitation
    const memberCtx = auth('member-uid');
    const memberDb = memberCtx.firestore();
    await assertFails(memberDb.collection('research_invitations').doc('NEWINVITE2').set({
      id: 'NEWINVITE2',
      code: 'NEWINVITE2',
      workspace_id: 'ws-1',
      active: true,
      created_by: 'member-uid',
      created_at: new Date().toISOString(),
      workspace_title: 'Test Workspace',
    }));
    console.log('  ✅ Non-owner cannot create invitation');
    passed++;
  } catch (e) {
    console.log('  ❌ Non-owner create invitation test failed:', e.message);
    failed++;
  }

  // Cleanup
  await testEnv.cleanup();

  console.log('\n=== TEST SUMMARY ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
  }
}

main().catch(e => {
  console.error('Test setup failed:', e);
  process.exit(1);
});