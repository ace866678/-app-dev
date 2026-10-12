const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { loadFirestoreRules, assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment, RulesTestContext } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'research-room-test';

let testEnv;
let adminDb;

beforeAll(async () => {
  // Initialize Admin SDK for test setup (bypasses rules)
  if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = getFirestore();
  adminDb.settings({
    host: 'localhost:8080',
    ssl: false,
  });

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: require('fs').readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  try {
    if (testEnv) await testEnv.cleanup();
  } finally {
    if (adminDb) await adminDb.terminate();
    await Promise.all(getApps().map(app => app.delete()));
  }
});

const workspaceId = 'ws_test';
const ownerUid = 'user_owner';
const memberUid = 'user_member';
const nonMemberUid = 'user_nonmember';

async function setupWorkspace() {
  const batch = adminDb.batch();
  
  const workspaceRef = adminDb.collection('research_workspaces').doc(workspaceId);
  batch.set(workspaceRef, {
    id: workspaceId,
    title: 'Test Workspace',
    research_title: 'Research Title',
    institution: 'Institution',
    program: 'Program',
    owner_id: ownerUid,
    join_code: 'ABCDEF12',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });
  
  const memberRef = adminDb.collection('research_members').doc(`${workspaceId}__${ownerUid}`);
  batch.set(memberRef, {
    id: `${workspaceId}__${ownerUid}`,
    workspace_id: workspaceId,
    user_id: ownerUid,
    role: 'owner',
    joined_at: '2024-01-01T00:00:00Z',
  });
  
  const inviteRef = adminDb.collection('research_invitations').doc('ABCDEF12');
  batch.set(inviteRef, {
    id: 'ABCDEF12',
    code: 'ABCDEF12',
    workspace_id: workspaceId,
    active: true,
    created_by: ownerUid,
    created_at: '2024-01-01T00:00:00Z',
  });
  
  await batch.commit();
  
  // Add member after workspace is created (separate write)
  await adminDb.collection('research_members').doc(`${workspaceId}__${memberUid}`).set({
    id: `${workspaceId}__${memberUid}`,
    workspace_id: workspaceId,
    user_id: memberUid,
    role: 'member',
    joined_at: '2024-01-01T00:00:00Z',
  });
}

describe('Firestore Security Rules', () => {
  let ownerCtx;
  let memberCtx;
  let nonMemberCtx;

  beforeEach(async () => {
    ownerCtx = testEnv.authenticatedContext(ownerUid);
    memberCtx = testEnv.authenticatedContext(memberUid);
    nonMemberCtx = testEnv.authenticatedContext(nonMemberUid);
    await testEnv.clearFirestore();
    await setupWorkspace();
  });

  describe('Workspace membership', () => {
    test('Owner can read workspace', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_workspaces').doc(workspaceId).get());
    });

    test('Member can read workspace', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_workspaces').doc(workspaceId).get());
    });

    test('Non-member cannot read workspace', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_workspaces').doc(workspaceId).get());
    });
  });

  describe('research_tasks create', () => {
    const validTask = (createdBy, assigneeId = memberUid, assigneeName = 'Test Member') => ({
      id: 'task_1',
      workspace_id: workspaceId,
      title: 'Test Task',
      description: 'Description',
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      due_date: '2024-12-31',
      priority: 'High',
      status: 'To do',
      created_by: createdBy,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    test('Owner can create task with valid member assignee', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(ownerUid)));
    });

    test('Member can create task with valid member assignee', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(memberUid, memberUid, 'Test Member')));
    });

    test('Owner can create task with null assignee_id', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(ownerUid, null, '')));
    });

    test('Owner can create task with empty string assignee_id', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(ownerUid, '', '')));
    });

    test('Owner cannot create task with non-member assignee', async () => {
      await assertFails(ownerCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(ownerUid, nonMemberUid, 'Non Member')));
    });

    test('Member cannot create task with non-member assignee', async () => {
      await assertFails(memberCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(memberUid, nonMemberUid, 'Non Member')));
    });

    test('Non-member cannot create task', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_tasks').doc('task_1').set(validTask(nonMemberUid)));
    });
  });

  describe('research_tasks update', () => {
    const baseTask = {
      id: 'task_1',
      workspace_id: workspaceId,
      title: 'Original Title',
      description: 'Original Description',
      assignee_id: memberUid,
      assignee_name: 'Test Member',
      due_date: '2024-12-31',
      priority: 'Medium',
      status: 'To do',
      created_by: ownerUid,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(async () => {
      await adminDb.collection('research_tasks').doc('task_1').set(baseTask);
    });

    test('Owner can update task with valid member assignee', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').update({
        title: 'Updated Title',
        assignee_id: memberUid,
        assignee_name: 'Test Member',
        updated_at: '2024-01-02T00:00:00Z',
      }));
    });

    test('Owner can update task to null assignee_id', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').update({
        assignee_id: null,
        assignee_name: '',
        updated_at: '2024-01-02T00:00:00Z',
      }));
    });

    test('Owner can update task to empty string assignee_id', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').update({
        assignee_id: '',
        assignee_name: '',
        updated_at: '2024-01-02T00:00:00Z',
      }));
    });

    test('Owner cannot update task to non-member assignee', async () => {
      await assertFails(ownerCtx.firestore().collection('research_tasks').doc('task_1').update({
        assignee_id: nonMemberUid,
        assignee_name: 'Non Member',
        updated_at: '2024-01-02T00:00:00Z',
      }));
    });

    test('Member cannot update task to non-member assignee', async () => {
      await assertFails(memberCtx.firestore().collection('research_tasks').doc('task_1').update({
        assignee_id: nonMemberUid,
        assignee_name: 'Non Member',
        updated_at: '2024-01-02T00:00:00Z',
      }));
    });

    test('Non-member cannot update task', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_tasks').doc('task_1').update({
        title: 'Hacked',
        updated_at: '2024-01-02T00:00:00Z',
      }));
    });
  });

  describe('research_tasks read', () => {
    beforeEach(async () => {
      await adminDb.collection('research_tasks').doc('task_1').set({
        id: 'task_1',
        workspace_id: workspaceId,
        title: 'Test Task',
        description: 'Description',
        assignee_id: memberUid,
        assignee_name: 'Test Member',
        due_date: '2024-12-31',
        priority: 'High',
        status: 'To do',
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
    });

    test('Owner can read task', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').get());
    });

    test('Member can read task', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_tasks').doc('task_1').get());
    });

    test('Non-member cannot read task', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_tasks').doc('task_1').get());
    });
  });

  describe('research_tasks list', () => {
    beforeEach(async () => {
      await adminDb.collection('research_tasks').doc('task_1').set({
        id: 'task_1',
        workspace_id: workspaceId,
        title: 'Test Task 1',
        description: 'Description',
        assignee_id: memberUid,
        assignee_name: 'Test Member',
        due_date: '2024-12-31',
        priority: 'High',
        status: 'To do',
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      await adminDb.collection('research_tasks').doc('task_2').set({
        id: 'task_2',
        workspace_id: workspaceId,
        title: 'Test Task 2',
        description: 'Description',
        assignee_id: null,
        assignee_name: '',
        due_date: '2024-12-31',
        priority: 'Low',
        status: 'Done',
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
    });

    test('Owner can list tasks', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').where('workspace_id', '==', workspaceId).get());
    });

    test('Member can list tasks', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_tasks').where('workspace_id', '==', workspaceId).get());
    });

    test('Non-member cannot list tasks', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_tasks').where('workspace_id', '==', workspaceId).get());
    });
  });

  describe('research_tasks delete', () => {
    beforeEach(async () => {
      await adminDb.collection('research_tasks').doc('task_1').set({
        id: 'task_1',
        workspace_id: workspaceId,
        title: 'Test Task',
        description: 'Description',
        assignee_id: memberUid,
        assignee_name: 'Test Member',
        due_date: '2024-12-31',
        priority: 'High',
        status: 'To do',
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
    });

    test('Owner can delete task', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_tasks').doc('task_1').delete());
    });

    test('Member can delete task', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_tasks').doc('task_1').delete());
    });

    test('Non-member cannot delete task', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_tasks').doc('task_1').delete());
    });
  });

  describe('research_chapters', () => {
    beforeEach(async () => {
      await adminDb.collection('research_chapters').doc('chapter_1').set({
        id: 'chapter_1',
        workspace_id: workspaceId,
        title: 'Chapter 1',
        chapter_order: 1,
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
      });
    });

    test('Owner can create chapter', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_chapters').doc('chapter_2').set({
        id: 'chapter_2',
        workspace_id: workspaceId,
        title: 'Chapter 2',
        chapter_order: 2,
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
      }));
    });

    test('Member can create chapter', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_chapters').doc('chapter_2').set({
        id: 'chapter_2',
        workspace_id: workspaceId,
        title: 'Chapter 2',
        chapter_order: 2,
        created_by: memberUid,
        created_at: '2024-01-01T00:00:00Z',
      }));
    });

    test('Non-member cannot create chapter', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_chapters').doc('chapter_2').set({
        id: 'chapter_2',
        workspace_id: workspaceId,
        title: 'Chapter 2',
        chapter_order: 2,
        created_by: nonMemberUid,
        created_at: '2024-01-01T00:00:00Z',
      }));
    });

    test('Owner can read chapter', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_chapters').doc('chapter_1').get());
    });

    test('Member can read chapter', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_chapters').doc('chapter_1').get());
    });

    test('Non-member cannot read chapter', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_chapters').doc('chapter_1').get());
    });
  });

  describe('research_sections', () => {
    beforeEach(async () => {
      await adminDb.collection('research_chapters').doc('chapter_1').set({
        id: 'chapter_1',
        workspace_id: workspaceId,
        title: 'Chapter 1',
        chapter_order: 1,
        created_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
      });
      await adminDb.collection('research_sections').doc('section_1').set({
        id: 'section_1',
        workspace_id: workspaceId,
        title: 'Section 1',
        content: 'Content',
        chapter: 'chapter_1',
        order: 1,
        created_by: ownerUid,
        updated_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
    });

    test('Owner can create section', async () => {
      await assertSucceeds(ownerCtx.firestore().collection('research_sections').doc('section_2').set({
        id: 'section_2',
        workspace_id: workspaceId,
        title: 'Section 2',
        content: 'Content',
        chapter: 'chapter_1',
        order: 2,
        created_by: ownerUid,
        updated_by: ownerUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));
    });

    test('Member can create section', async () => {
      await assertSucceeds(memberCtx.firestore().collection('research_sections').doc('section_2').set({
        id: 'section_2',
        workspace_id: workspaceId,
        title: 'Section 2',
        content: 'Content',
        chapter: 'chapter_1',
        order: 2,
        created_by: memberUid,
        updated_by: memberUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));
    });

    test('Non-member cannot create section', async () => {
      await assertFails(nonMemberCtx.firestore().collection('research_sections').doc('section_2').set({
        id: 'section_2',
        workspace_id: workspaceId,
        title: 'Section 2',
        content: 'Content',
        chapter: 'chapter_1',
        order: 2,
        created_by: nonMemberUid,
        updated_by: nonMemberUid,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));
    });
  });
});