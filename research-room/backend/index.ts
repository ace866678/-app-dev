import { router, json, error, requireAuth, db } from '@appdeploy/sdk';
type R = Record<string, any>;
const W = 'research_workspaces',
  M = 'research_members',
  S = 'research_sections',
  T = 'research_tasks',
  MT = 'research_meetings';
const text = (v: unknown, n = 20000) =>
  typeof v === 'string' ? v.trim().slice(0, n) : '';
const member = async (userId: string, workspaceId: string) => {
  const r = await db.list<R>(M, {
    limit: 200,
    filter: { userId, workspaceId },
  });
  return r.items[0] || null;
};
const access = async (userId: string, workspaceId: string) =>
  !!(await member(userId, workspaceId));
const list = async (table: string, workspaceId: string) => {
  const r = await db.list<R>(table, { limit: 200, filter: { workspaceId } });
  return r.items;
};
const requireWorkspace = async (userId: string, id: string) => {
  if (!(await access(userId, id))) throw new Error('Workspace access denied.');
};
export const handler = router({
  'GET /api/workspaces': [
    requireAuth(),
    async ({ user }) => {
      const ms = await db.list<R>(M, {
        limit: 200,
        filter: { userId: user!.userId },
      });
      const ws = await db.list<R>(W, { limit: 200 });
      const ids = new Set(ms.items.map(x => x.workspaceId));
      return json({ workspaces: ws.items.filter(x => ids.has(x.id)) });
    },
  ],
  'POST /api/workspaces': [
    requireAuth(),
    async ({ user, body }) => {
      const b = (body || {}) as R;
      const title = text(b.title, 180);
      if (!title) return error('Workspace title is required.', 400);
      const rec = {
        title,
        researchTitle: text(b.researchTitle, 500),
        institution: text(b.institution, 180),
        program: text(b.program, 180),
        createdBy: user!.userId,
        joinCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      const [id] = await db.add(W, [rec]);
      if (!id) return error('Could not create workspace.', 500);
      const [mid] = await db.add(M, [
        {
          workspaceId: id,
          userId: user!.userId,
          name: text(user!.name, 120) || text(user!.email, 120) || 'Researcher',
          email: user!.email || '',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ]);
      if (!mid) {
        await db.delete(W, [id]);
        return error('Could not add owner.', 500);
      }
      return json({ workspace: { ...rec, id } }, 201);
    },
  ],
  'POST /api/workspaces/join': [
    requireAuth(),
    async ({ user, body }) => {
      const c = text(((body as R) || {}).joinCode, 12).toUpperCase();
      const r = await db.list<R>(W, { limit: 200, filter: { joinCode: c } });
      const w = r.items[0];
      if (!w) return error('That join code was not found.', 404);
      if (await access(user!.userId, w.id)) return json({ workspace: w });
      const [id] = await db.add(M, [
        {
          workspaceId: w.id,
          userId: user!.userId,
          name: text(user!.name, 120) || text(user!.email, 120) || 'Researcher',
          email: user!.email || '',
          role: 'member',
          joinedAt: new Date().toISOString(),
        },
      ]);
      return id
        ? json({ workspace: w }, 201)
        : error('Could not join workspace.', 500);
    },
  ],
  'GET /api/workspaces/:id': [
    requireAuth(),
    async ({ user, params }) => {
      try {
        await requireWorkspace(user!.userId, params.id);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const [w] = await db.get<R>(W, [params.id]);
      if (!w) return error('Workspace not found.', 404);
      const [members, sections, tasks, meetings] = await Promise.all([
        list(M, params.id),
        list(S, params.id),
        list(T, params.id),
        list(MT, params.id),
      ]);
      return json({
        workspace: { ...w, id: params.id },
        members,
        sections,
        tasks,
        meetings,
      });
    },
  ],
  'PUT /api/workspaces/:id': [
    requireAuth(),
    async ({ user, params, body }) => {
      const m = await member(user!.userId, params.id);
      if (!m || m.role !== 'owner')
        return error('Only the workspace owner can edit settings.', 403);
      const [old] = await db.get<R>(W, [params.id]);
      if (!old) return error('Workspace not found.', 404);
      const b = (body || {}) as R;
      const rec = {
        ...old,
        title: text(b.title, 180) || old.title,
        researchTitle: text(b.researchTitle, 500),
        institution: text(b.institution, 180),
        program: text(b.program, 180),
      };
      const [ok] = await db.update(W, [{ id: params.id, record: rec }]);
      return ok
        ? json({ workspace: { ...rec, id: params.id } })
        : error('Could not save settings.', 500);
    },
  ],
  'POST /api/sections': [
    requireAuth(),
    async ({ user, body }) => {
      const b = (body || {}) as R,
        id = text(b.workspaceId, 100);
      try {
        await requireWorkspace(user!.userId, id);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const title = text(b.title, 180);
      if (!title) return error('Section title is required.', 400);
      const rec = {
        workspaceId: id,
        title,
        content: text(b.content, 180000),
        order: Number(b.order) || 0,
        updatedBy: user!.userId,
        updatedAt: new Date().toISOString(),
      };
      const [sid] = await db.add(S, [rec]);
      return sid
        ? json({ section: { ...rec, id: sid } }, 201)
        : error('Could not save section.', 500);
    },
  ],
  'PUT /api/sections/:id': [
    requireAuth(),
    async ({ user, params, body }) => {
      const [old] = await db.get<R>(S, [params.id]);
      if (!old) return error('Section not found.', 404);
      try {
        await requireWorkspace(user!.userId, old.workspaceId);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const b = (body || {}) as R;
      const rec = {
        ...old,
        title: text(b.title, 180) || old.title,
        content: text(b.content, 180000),
        order: Number(b.order) || 0,
        updatedBy: user!.userId,
        updatedAt: new Date().toISOString(),
      };
      const [ok] = await db.update(S, [{ id: params.id, record: rec }]);
      return ok
        ? json({ section: { ...rec, id: params.id } })
        : error('Could not save section.', 500);
    },
  ],
  'DELETE /api/sections/:id': [
    requireAuth(),
    async ({ user, params }) => {
      const [r] = await db.get<R>(S, [params.id]);
      if (!r) return error('Section not found.', 404);
      try {
        await requireWorkspace(user!.userId, r.workspaceId);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const [ok] = await db.delete(S, [params.id]);
      return ok
        ? json({ deleted: true })
        : error('Could not delete section.', 500);
    },
  ],
  'POST /api/tasks': [
    requireAuth(),
    async ({ user, body }) => {
      const b = (body || {}) as R,
        id = text(b.workspaceId, 100);
      try {
        await requireWorkspace(user!.userId, id);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const title = text(b.title, 180);
      if (!title) return error('Task title is required.', 400);
      const rec = {
        workspaceId: id,
        title,
        description: text(b.description, 3000),
        assigneeId: text(b.assigneeId, 100),
        assigneeName: text(b.assigneeName, 120),
        dueDate: text(b.dueDate, 20),
        priority: ['Low', 'Medium', 'High'].includes(b.priority)
          ? b.priority
          : 'Medium',
        status: ['To do', 'In progress', 'Done'].includes(b.status)
          ? b.status
          : 'To do',
        createdBy: user!.userId,
        createdAt: new Date().toISOString(),
      };
      const [id2] = await db.add(T, [rec]);
      return id2
        ? json({ task: { ...rec, id: id2 } }, 201)
        : error('Could not create task.', 500);
    },
  ],
  'PUT /api/tasks/:id': [
    requireAuth(),
    async ({ user, params, body }) => {
      const [old] = await db.get<R>(T, [params.id]);
      if (!old) return error('Task not found.', 404);
      try {
        await requireWorkspace(user!.userId, old.workspaceId);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const b = (body || {}) as R;
      const rec = {
        ...old,
        title: text(b.title, 180) || old.title,
        description: text(b.description, 3000),
        assigneeId: text(b.assigneeId, 100),
        assigneeName: text(b.assigneeName, 120),
        dueDate: text(b.dueDate, 20),
        priority: ['Low', 'Medium', 'High'].includes(b.priority)
          ? b.priority
          : old.priority,
        status: ['To do', 'In progress', 'Done'].includes(b.status)
          ? b.status
          : old.status,
        updatedAt: new Date().toISOString(),
      };
      const [ok] = await db.update(T, [{ id: params.id, record: rec }]);
      return ok
        ? json({ task: { ...rec, id: params.id } })
        : error('Could not update task.', 500);
    },
  ],
  'DELETE /api/tasks/:id': [
    requireAuth(),
    async ({ user, params }) => {
      const [r] = await db.get<R>(T, [params.id]);
      if (!r) return error('Task not found.', 404);
      try {
        await requireWorkspace(user!.userId, r.workspaceId);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const [ok] = await db.delete(T, [params.id]);
      return ok
        ? json({ deleted: true })
        : error('Could not delete task.', 500);
    },
  ],
  'POST /api/meetings': [
    requireAuth(),
    async ({ user, body }) => {
      const b = (body || {}) as R,
        id = text(b.workspaceId, 100);
      try {
        await requireWorkspace(user!.userId, id);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const title = text(b.title, 180);
      if (!title) return error('Meeting title is required.', 400);
      const rec = {
        workspaceId: id,
        title,
        date: text(b.date, 30),
        agenda: Array.isArray(b.agenda)
          ? b.agenda.slice(0, 30).map((x: unknown) => text(x, 300))
          : [],
        notes: text(b.notes, 12000),
        createdBy: user!.userId,
        createdAt: new Date().toISOString(),
      };
      const [id2] = await db.add(MT, [rec]);
      return id2
        ? json({ meeting: { ...rec, id: id2 } }, 201)
        : error('Could not create meeting.', 500);
    },
  ],
  'PUT /api/meetings/:id': [
    requireAuth(),
    async ({ user, params, body }) => {
      const [old] = await db.get<R>(MT, [params.id]);
      if (!old) return error('Meeting not found.', 404);
      try {
        await requireWorkspace(user!.userId, old.workspaceId);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const b = (body || {}) as R;
      const rec = {
        ...old,
        title: text(b.title, 180) || old.title,
        date: text(b.date, 30),
        agenda: Array.isArray(b.agenda)
          ? b.agenda.slice(0, 30).map((x: unknown) => text(x, 300))
          : old.agenda,
        notes: text(b.notes, 12000),
      };
      const [ok] = await db.update(MT, [{ id: params.id, record: rec }]);
      return ok
        ? json({ meeting: { ...rec, id: params.id } })
        : error('Could not save meeting.', 500);
    },
  ],
  'DELETE /api/meetings/:id': [
    requireAuth(),
    async ({ user, params }) => {
      const [r] = await db.get<R>(MT, [params.id]);
      if (!r) return error('Meeting not found.', 404);
      try {
        await requireWorkspace(user!.userId, r.workspaceId);
      } catch {
        return error('Workspace access denied.', 403);
      }
      const [ok] = await db.delete(MT, [params.id]);
      return ok
        ? json({ deleted: true })
        : error('Could not delete meeting.', 500);
    },
  ],
});
