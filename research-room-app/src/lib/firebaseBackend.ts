import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type WhereFilterOp,
} from 'firebase/firestore';
import { auth, firebaseConfigured, googleProvider, requireAuth, requireDb } from './firebase';

type LegacyError = { message: string; code?: string };
type LegacyResult<T = any> = { data: T; error: LegacyError | null };
type Filter = { field: string; operator: '==' | 'in'; value: any };
type SortOrder = { field: string; ascending: boolean };
type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';
type DocRow = { ref: DocumentReference<DocumentData>; row: Record<string, any> };

const nowIso = () => new Date().toISOString();
const memberDocId = (workspaceId: string, userId: string) => workspaceId + '__' + userId;
const inviteAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomInviteCode(): string {
  const bytes = new Uint8Array(10);
  if (!globalThis.crypto?.getRandomValues) throw new Error('This browser cannot securely generate an invitation code.');
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => inviteAlphabet[value & 31]).join('');
}

function clean(value: any): any {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== 'object' || value instanceof Date || value instanceof Timestamp) return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, clean(item)])
  );
}

function legacyUser(user: User | null): any {
  if (!user) return null;
  const displayName = user.displayName || user.email?.split('@')[0] || 'Researcher';
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || '',
    phone: user.phoneNumber || '',
    created_at: user.metadata.creationTime || '',
    updated_at: user.metadata.lastSignInTime || '',
    user_metadata: {
      full_name: displayName,
      name: displayName,
      avatar_url: user.photoURL || '',
      picture: user.photoURL || '',
    },
    app_metadata: {
      provider: user.providerData[0]?.providerId || 'password',
    },
  };
}

function legacySession(user: User | null): any {
  return user ? { user: legacyUser(user), access_token: '', token_type: 'bearer' } : null;
}

const friendlyAuthMessages: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/wrong-password': 'Incorrect email or password. Please try again.',
  'auth/user-not-found': 'No account found for that email. Use "Create an account" to register.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': 'That email already has an account. Try signing in instead.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
  'auth/cancelled-popup-request': 'The Google window was closed before sign-in finished.',
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups and try again.',
  'auth/unauthorized-domain': 'This website address is not authorized for sign-in yet. Ask the project owner to add it in Firebase.',
  'auth/user-disabled': 'This account has been disabled.',
};

function toError(error: unknown): LegacyError {
  const value = error as { message?: string; code?: string };
  const friendly = value?.code ? friendlyAuthMessages[value.code] : undefined;
  return { message: friendly || value?.message || 'Firebase request failed.', code: value?.code };
}

/** Resolve with the promise result, or reject after `ms` so the UI never hangs. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Profile documents are a convenience; never let a slow write block sign-in. */
function syncProfilesInBackground(user: User, displayName?: string, photoURL?: string): void {
  void saveAuthProfiles(user, displayName, photoURL).catch(error => {
    console.warn('Could not sync the Firebase profile documents:', toError(error).message);
  });
}

function result<T>(data: T): LegacyResult<T> {
  return { data, error: null };
}

function failed<T = null>(error: unknown): LegacyResult<T> {
  return { data: null as T, error: toError(error) };
}

async function saveAuthProfiles(user: User, displayName?: string, photoURL?: string): Promise<void> {
  const db = requireDb();
  const name = displayName ?? user.displayName ?? user.email?.split('@')[0] ?? 'Researcher';
  const photo = photoURL ?? user.photoURL ?? '';
  const updatedAt = nowIso();
  await Promise.all([
    setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email || '',
      display_name: name,
      photo_url: photo,
      updated_at: updatedAt,
    }, { merge: true }),
    setDoc(doc(db, 'publicProfiles', user.uid), {
      uid: user.uid,
      display_name: name,
      photo_url: photo,
      updated_at: updatedAt,
    }, { merge: true }),
  ]);
}

const authApi = {
  async getSession(): Promise<LegacyResult<any>> {
    try {
      const currentAuth = requireAuth();
      await currentAuth.authStateReady();
      return result({ session: legacySession(currentAuth.currentUser) });
    } catch (error) {
      return failed(error);
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!firebaseConfigured || !auth) {
      queueMicrotask(() => callback('INITIAL_SESSION', null));
      return { data: { subscription: { unsubscribe: () => undefined } } };
    }
    let first = true;
    const unsubscribe = onAuthStateChanged(auth, user => {
      const event = first ? 'INITIAL_SESSION' : user ? 'SIGNED_IN' : 'SIGNED_OUT';
      first = false;
      if (!user) {
        callback(event, null);
        return;
      }

      // Google sign-in on mobile returns through a redirect. Make sure its
      // private/public profile documents exist before the app loads workspace data.
      void withTimeout(saveAuthProfiles(user), 3000, 'Profile sync is taking longer than expected.')
        .catch(error => {
          console.warn('Could not sync the Firebase profile documents:', toError(error).message);
        })
        .finally(() => callback(event, legacySession(user)));
    });
    return { data: { subscription: { unsubscribe } } };
  },

  async signInWithPassword(input: { email: string; password: string }): Promise<LegacyResult<any>> {
    try {
      const credential = await withTimeout(
        signInWithEmailAndPassword(requireAuth(), input.email.trim(), input.password),
        20000,
        'Sign-in is taking too long. Check your connection and try again.',
      );
      syncProfilesInBackground(credential.user);
      return result({ user: legacyUser(credential.user), session: legacySession(credential.user) });
    } catch (error) {
      return failed(error);
    }
  },

  async signInWithOAuth(input: { provider: string; options?: { redirectTo?: string } }): Promise<LegacyResult<any>> {
    try {
      if (input.provider !== 'google') throw new Error('Only Google sign-in is configured in this Firebase integration.');
      const currentAuth = requireAuth();
      const provider = googleProvider || new GoogleAuthProvider();
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches) {
        await signInWithRedirect(currentAuth, provider);
        return result({ provider: 'google', url: null });
      }
      const credential = await signInWithPopup(currentAuth, provider);
      syncProfilesInBackground(credential.user);
      return result({ provider: 'google', user: legacyUser(credential.user), url: null });
    } catch (error) {
      return failed(error);
    }
  },

  async signUp(input: { email: string; password: string; options?: { data?: Record<string, any> } }): Promise<LegacyResult<any>> {
    try {
      const credential = await withTimeout(
        createUserWithEmailAndPassword(requireAuth(), input.email.trim(), input.password),
        20000,
        'Account creation is taking too long. Check your connection and try again.',
      );
      const suggestedName = String(input.options?.data?.name || input.email.split('@')[0]).trim();
      await updateProfile(credential.user, { displayName: suggestedName });
      syncProfilesInBackground(credential.user, suggestedName, credential.user.photoURL || '');
      return result({ user: legacyUser(credential.user), session: legacySession(credential.user) });
    } catch (error) {
      return failed(error);
    }
  },

  async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }): Promise<LegacyResult<null>> {
    try {
      await sendPasswordResetEmail(requireAuth(), email.trim());
      return result(null);
    } catch (error) {
      return failed(error);
    }
  },

  async signOut(): Promise<LegacyResult<null>> {
    try {
      await signOut(requireAuth());
      return result(null);
    } catch (error) {
      return failed(error);
    }
  },

  async updateUser(input: { data?: { full_name?: string; avatar_url?: string } }): Promise<LegacyResult<any>> {
    try {
      const currentAuth = requireAuth();
      const current = currentAuth.currentUser;
      if (!current) throw new Error('Your session is missing or expired. Please sign in again.');
      const displayName = input.data?.full_name ?? current.displayName ?? current.email?.split('@')[0] ?? 'Researcher';
      const photoURL = input.data?.avatar_url ?? current.photoURL ?? '';
      await updateProfile(current, { displayName, photoURL });
      await saveAuthProfiles(current, displayName, photoURL);
      return result({ user: legacyUser(current) });
    } catch (error) {
      return failed(error);
    }
  },
};

function valueForSort(value: any): any {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (value === null || value === undefined) return '';
  return value;
}

function matchesFilters(row: Record<string, any>, filters: Filter[]): boolean {
  return filters.every(filter => {
    const current = row[filter.field];
    if (filter.operator === 'in') return Array.isArray(filter.value) && filter.value.some(value => value === current);
    return current === filter.value;
  });
}

async function fetchRows(table: string, filters: Filter[], sorts: SortOrder[] = [], maxRows?: number): Promise<DocRow[]> {
  const db = requireDb();
  if (!filters.length) throw new Error('Unfiltered collection reads are disabled. Add a workspace, user, recipient, or document-ID filter.');
  let found: DocRow[] = [];
  const idEquals = filters.find(filter => filter.field === 'id' && filter.operator === '==');
  const idIn = filters.find(filter => filter.field === 'id' && filter.operator === 'in');

  if (idEquals || idIn) {
    const ids = idEquals ? [String(idEquals.value)] : (Array.isArray(idIn?.value) ? idIn!.value.map(String) : []);
    const snapshots = await Promise.all(ids.slice(0, 100).map(id => getDoc(doc(db, table, id))));
    found = snapshots.filter(snapshot => snapshot.exists()).map(snapshot => ({
      ref: snapshot.ref,
      row: { id: snapshot.id, ...snapshot.data() },
    }));
  } else {
    const constraints = filters.map(filter => {
      if (filter.operator === 'in' && (!Array.isArray(filter.value) || filter.value.length === 0 || filter.value.length > 30)) {
        throw new Error('Firestore in-filters require between 1 and 30 values.');
      }
      return where(filter.field, filter.operator as WhereFilterOp, filter.value);
    });
    const snapshot = await getDocs(firestoreQuery(collection(db, table), ...constraints));
    found = snapshot.docs.map((snapshot: QueryDocumentSnapshot<DocumentData>) => ({
      ref: snapshot.ref,
      row: { id: snapshot.id, ...snapshot.data() },
    }));
  }

  found = found.filter(item => matchesFilters(item.row, filters));
  for (const sort of [...sorts].reverse()) {
    found.sort((a, b) => {
      const left = valueForSort(a.row[sort.field]);
      const right = valueForSort(b.row[sort.field]);
      const compared = left < right ? -1 : left > right ? 1 : 0;
      return sort.ascending ? compared : -compared;
    });
  }
  if (typeof maxRows === 'number') found = found.slice(0, Math.max(0, maxRows));
  return found;
}

async function writeNotifications(workspaceId: string, actorId: string, kind: string, content: string, metadata: Record<string, any>, mentionedUserIds: string[] = []): Promise<void> {
  try {
    const db = requireDb();
    const members = await getDocs(firestoreQuery(
      collection(db, 'research_members'),
      where('workspace_id', '==', workspaceId),
    ));
    const recipients = members.docs
      .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
      .filter(member => member.user_id && member.user_id !== actorId);
    if (!recipients.length) return;
    const batch = writeBatch(db);
    const targetIds = new Set(mentionedUserIds);
    for (const member of recipients) {
      const id = doc(collection(db, 'research_notifications')).id;
      const targeted = targetIds.size > 0 && targetIds.has(String(member.user_id));
      batch.set(doc(db, 'research_notifications', id), clean({
        id,
        workspace_id: workspaceId,
        recipient_id: member.user_id,
        actor_id: actorId,
        kind: targeted ? 'mention' : kind,
        content: targeted ? 'You were mentioned in a research discussion.' : content,
        metadata,
        created_at: nowIso(),
        read_at: null,
      }));
    }
    await batch.commit();
  } catch (error) {
    console.warn('Research notification could not be written:', (error as Error)?.message || error);
  }
}

async function notifyAfterWrite(table: string, rows: Record<string, any>[], operation: Operation): Promise<void> {
  if (!['insert', 'update', 'upsert'].includes(operation)) return;
  for (const row of rows) {
    const workspaceId = row.workspace_id;
    const actorId = auth?.currentUser?.uid;
    if (typeof workspaceId !== 'string' || !actorId) continue;

    if (table === 'research_messages') {
      await writeNotifications(workspaceId, actorId, 'message', String(row.sender_name || 'A teammate') + ' sent a message.', { topic: row.topic || 'General', route: 'Chat' }, Array.isArray(row.mentioned_user_ids) ? row.mentioned_user_ids : []);
    } else if (table === 'research_tasks') {
      await writeNotifications(workspaceId, actorId, 'task', 'A research task was created or updated: ' + String(row.title || 'Task'), { route: 'Tasks', task_id: row.id });
    } else if (table === 'research_meetings') {
      await writeNotifications(workspaceId, actorId, 'meeting', 'A research meeting was created or updated: ' + String(row.title || 'Meeting'), { route: 'Meetings', meeting_id: row.id });
    } else if (table === 'research_sections' || table === 'research_chapters') {
      await writeNotifications(workspaceId, actorId, 'document', 'Research documents were updated: ' + String(row.title || 'Document'), { route: 'Document', section_id: table === 'research_sections' ? row.id : '', chapter: row.chapter || row.title || '' });
    }
  }
}

class FirebaseQuery implements PromiseLike<LegacyResult<any>> {
  private operation: Operation = 'select';
  private filters: Filter[] = [];
  private sorts: SortOrder[] = [];
  private maxRows: number | undefined;
  private singleResult = false;
  private returningRows = false;
  private payload: any;

  constructor(private readonly table: string) {}

  select(_fields = '*'): this { this.returningRows = true; return this; }
  eq(field: string, value: any): this { this.filters.push({ field, operator: '==', value }); return this; }
  is(field: string, value: any): this { this.filters.push({ field, operator: '==', value }); return this; }
  in(field: string, values: any[]): this { this.filters.push({ field, operator: 'in', value: Array.isArray(values) ? values : [] }); return this; }
  order(field: string, options?: { ascending?: boolean }): this { this.sorts.push({ field, ascending: options?.ascending !== false }); return this; }
  limit(value: number): this { this.maxRows = value; return this; }
  single(): this { this.singleResult = true; this.returningRows = true; return this; }
  insert(data: any): this { this.operation = 'insert'; this.payload = data; return this; }
  update(data: Record<string, any>): this { this.operation = 'update'; this.payload = data; return this; }
  delete(): this { this.operation = 'delete'; return this; }
  upsert(data: any, _options?: { onConflict?: string }): this { this.operation = 'upsert'; this.payload = data; return this; }

  then<TResult1 = LegacyResult<any>, TResult2 = never>(
    onfulfilled?: ((value: LegacyResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled || undefined, onrejected || undefined);
  }

  private async execute(): Promise<LegacyResult<any>> {
    try {
      if (this.operation === 'select') {
        const rows = await fetchRows(this.table, this.filters, this.sorts, this.maxRows);
        return result(this.shape(rows.map(item => item.row)));
      }
      if (this.operation === 'insert' || this.operation === 'upsert') {
        const rows = await this.insertRows();
        await notifyAfterWrite(this.table, rows, this.operation);
        return result(this.returningRows ? this.shape(rows) : null);
      }
      if (this.operation === 'update') {
        const rows = await this.updateRows();
        await notifyAfterWrite(this.table, rows, this.operation);
        return result(this.returningRows ? this.shape(rows) : null);
      }
      const deleted = this.table === 'research_workspaces'
        ? await deleteWorkspaceCascade(this.filters)
        : await this.deleteRows();
      return result(this.returningRows ? this.shape(deleted) : null);
    } catch (error) {
      return failed(error);
    }
  }

  private shape(rows: any[]): any {
    if (!this.singleResult) return rows;
    if (rows.length !== 1) throw new Error('Expected exactly one document, but found ' + rows.length + '.');
    return rows[0];
  }

  private async insertRows(): Promise<Record<string, any>[]> {
    const db = requireDb();
    const input = Array.isArray(this.payload) ? this.payload : [this.payload];
    const rows: Record<string, any>[] = [];
    const batch = writeBatch(db);
    for (const source of input) {
      const id = source.id || (this.operation === 'upsert' ? this.deterministicId(source) : undefined);
      const ref = id ? doc(db, this.table, String(id)) : doc(collection(db, this.table));
      const prepared: Record<string, any> = { ...source };
      if (!prepared.created_at && !['research_member_profiles', 'research_presence'].includes(this.table)) prepared.created_at = nowIso();
      if (['research_sections', 'research_tasks', 'research_meetings', 'research_chapters'].includes(this.table) && !prepared.updated_at) prepared.updated_at = nowIso();
      if (this.table === 'research_member_profiles' && !prepared.id) prepared.id = ref.id;
      const row = clean({ ...prepared, id: ref.id });
      rows.push(row);
      if (this.operation === 'upsert') batch.set(ref, row, { merge: true });
      else batch.set(ref, row);
    }
    if (rows.length > 0) await batch.commit();
    return rows;
  }

  private deterministicId(source: Record<string, any>): string | undefined {
    if ((this.table === 'research_members' || this.table === 'research_member_profiles') && source.workspace_id && source.user_id) {
      return memberDocId(String(source.workspace_id), String(source.user_id));
    }
    return undefined;
  }

  private async updateRows(): Promise<Record<string, any>[]> {
    const db = requireDb();
    const found = await fetchRows(this.table, this.filters);
    const batch = writeBatch(db);
    const rows: Record<string, any>[] = [];
    for (const item of found) {
      const patch = clean(this.payload || {});
      batch.update(item.ref, patch);
      rows.push({ ...item.row, ...patch });
    }
    if (found.length > 0) await batch.commit();
    return rows;
  }

  private async deleteRows(): Promise<Record<string, any>[]> {
    const db = requireDb();
    const found = await fetchRows(this.table, this.filters);
    const batch = writeBatch(db);
    for (const item of found) batch.delete(item.ref);
    if (found.length > 0) await batch.commit();
    return found.map(item => item.row);
  }
}

async function deleteWorkspaceCascade(filters: Filter[]): Promise<Record<string, any>[]> {
  const db = requireDb();
  const idFilter = filters.find(filter => filter.field === 'id' && filter.operator === '==');
  if (!idFilter) throw new Error('Workspace deletion requires a specific workspace ID.');
  const workspaceId = String(idFilter.value);
  const workspaceRef = doc(db, 'research_workspaces', workspaceId);
  const workspaceSnap = await getDoc(workspaceRef);
  if (!workspaceSnap.exists()) return [];
  const workspace = { id: workspaceSnap.id, ...workspaceSnap.data() };
  const collectionsToCascade = [
    'research_messages', 'research_tasks', 'research_meetings', 'research_sections',
    'research_chapters', 'research_member_profiles', 'research_notifications',
    'research_presence', 'research_invitations',
  ];
  const groups: Array<Array<{ ref: DocumentReference<DocumentData>; row: Record<string, any> }>> = [];
  for (const table of collectionsToCascade) {
    const snapshot = await getDocs(firestoreQuery(collection(db, table), where('workspace_id', '==', workspaceId)));
    groups.push(snapshot.docs.map(item => ({ ref: item.ref, row: { id: item.id, ...item.data() } })));
  }
  for (const group of groups) {
    for (let offset = 0; offset < group.length; offset += 400) {
      const batch = writeBatch(db);
      group.slice(offset, offset + 400).forEach(item => batch.delete(item.ref));
      await batch.commit();
    }
  }

  const membersSnap = await getDocs(firestoreQuery(collection(db, 'research_members'), where('workspace_id', '==', workspaceId)));
  const members = membersSnap.docs.map(item => ({ ref: item.ref, row: item.data() }));
  const ownerId = auth?.currentUser?.uid;
  const ownerMember = members.find(item => item.row.user_id === ownerId);
  const otherMembers = members.filter(item => item.row.user_id !== ownerId);
  for (let offset = 0; offset < otherMembers.length; offset += 400) {
    const batch = writeBatch(db);
    otherMembers.slice(offset, offset + 400).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
  const finalBatch = writeBatch(db);
  if (ownerMember) finalBatch.delete(ownerMember.ref);
  finalBatch.delete(workspaceRef);
  await finalBatch.commit();
  return [workspace];
}

async function rpc(name: string, params: Record<string, any>): Promise<LegacyResult<any>> {
  try {
    const currentAuth = requireAuth();
    const db = requireDb();
    const current = currentAuth.currentUser;
    if (!current) throw new Error('Sign in before performing this action.');

    if (name === 'create_research_workspace') {
      const workspaceRef = doc(collection(db, 'research_workspaces'));
      const memberRef = doc(db, 'research_members', memberDocId(workspaceRef.id, current.uid));
      const code = randomInviteCode();
      const inviteRef = doc(db, 'research_invitations', code);
      const now = nowIso();
      const workspace = clean({
        id: workspaceRef.id,
        title: String(params.p_title || '').trim(),
        research_title: String(params.p_research_title || ''),
        institution: String(params.p_institution || ''),
        program: String(params.p_program || ''),
        owner_id: current.uid,
        join_code: code,
        created_at: now,
        updated_at: now,
      });
      const member = clean({
        id: memberRef.id,
        workspace_id: workspaceRef.id,
        user_id: current.uid,
        role: 'owner',
        joined_at: now,
        display_name: current.displayName || current.email?.split('@')[0] || 'Researcher',
        email: current.email || '',
      });
      const invitation = {
        id: code, code, workspace_id: workspaceRef.id, active: true,
        created_by: current.uid, created_at: now,
        workspace_title: workspace.title,
      };
      await runTransaction(db, async transaction => {
        const existingInvite = await transaction.get(inviteRef);
        if (existingInvite.exists()) throw new Error('Invitation code collision. Please try creating the workspace again.');
        transaction.set(workspaceRef, workspace);
        transaction.set(memberRef, member);
        transaction.set(inviteRef, invitation);
      });
      return result(workspace);
    }

    if (name === 'join_research_workspace') {
      const code = String(params.p_join_code || '').trim().toUpperCase();
      if (!code) throw new Error('Enter a workspace join code.');
      const inviteRef = doc(db, 'research_invitations', code);
      const workspaceId = await runTransaction(db, async transaction => {
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists()) throw new Error('Invalid workspace join code.');
        const invite = inviteSnap.data();
        if (invite.active !== true) throw new Error('This workspace invitation has been revoked.');
        if (invite.expires_at) {
          const expiresAt = invite.expires_at instanceof Timestamp ? invite.expires_at.toMillis() : new Date(invite.expires_at).getTime();
          if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('This workspace invitation has expired.');
        }
        const id = String(invite.workspace_id || '');
        if (!id) throw new Error('This invitation is not linked to a workspace.');
        const memberRef = doc(db, 'research_members', memberDocId(id, current.uid));
        const memberSnap = await transaction.get(memberRef);
        if (memberSnap.exists()) throw new Error('You are already a member of this workspace.');
        transaction.set(memberRef, {
          id: memberRef.id,
          workspace_id: id,
          user_id: current.uid,
          role: 'member',
          joined_at: nowIso(),
          proof_code: code,
          display_name: current.displayName || current.email?.split('@')[0] || 'Researcher',
          email: current.email || '',
        });
        return id;
      });
      const workspaceSnap = await getDoc(doc(db, 'research_workspaces', workspaceId));
      if (!workspaceSnap.exists()) throw new Error('This workspace no longer exists.');
      return result({ id: workspaceSnap.id, ...workspaceSnap.data() });
    }

    if (name === 'transfer_research_workspace_ownership') {
      const workspaceId = String(params.p_workspace_id || '');
      const nextOwnerId = String(params.p_new_owner_id || '');
      if (!workspaceId || !nextOwnerId || nextOwnerId === current.uid) throw new Error('Choose another workspace member as the new owner.');
      const workspaceRef = doc(db, 'research_workspaces', workspaceId);
      const currentMemberRef = doc(db, 'research_members', memberDocId(workspaceId, current.uid));
      const nextMemberRef = doc(db, 'research_members', memberDocId(workspaceId, nextOwnerId));
      const transferred = await runTransaction(db, async transaction => {
        const [workspaceSnap, currentMemberSnap, nextMemberSnap] = await Promise.all([
          transaction.get(workspaceRef),
          transaction.get(currentMemberRef),
          transaction.get(nextMemberRef),
        ]);
        if (!workspaceSnap.exists() || !currentMemberSnap.exists() || !nextMemberSnap.exists()) throw new Error('Workspace or member was not found.');
        if (workspaceSnap.data().owner_id !== current.uid || currentMemberSnap.data().role !== 'owner') throw new Error('Only the current owner can transfer ownership.');
        if (nextMemberSnap.data().role !== 'member') throw new Error('The selected member cannot receive ownership.');
        transaction.update(workspaceRef, { owner_id: nextOwnerId, updated_at: nowIso() });
        transaction.update(nextMemberRef, { role: 'owner' });
        transaction.update(currentMemberRef, { role: 'member' });
        return true;
      });
      return result(transferred);
    }

    throw new Error('Unsupported Firebase operation: ' + name);
  } catch (error) {
    return failed(error);
  }
}

class FirebaseChannel {
  private callbacks: Array<{ type: string; filter: any; callback: (payload?: any) => void }> = [];
  private stop: (() => void) | null = null;
  private presence: Record<string, any[]> = {};
  private joined = false;

  constructor(private readonly name: string, private readonly config?: any) {}

  on(type: string, filter: any, callback: (payload?: any) => void): this {
    this.callbacks.push({ type, filter, callback });
    return this;
  }

  presenceState(): Record<string, any[]> {
    return this.presence;
  }

  async track(payload: Record<string, any>): Promise<void> {
    const db = requireDb();
    const workspaceId = this.name.startsWith('research-room-presence:')
      ? this.name.slice('research-room-presence:'.length)
      : '';
    const userId = String(this.config?.config?.presence?.key || auth?.currentUser?.uid || '');
    if (!workspaceId || !userId) throw new Error('Presence requires an authenticated workspace member.');
    const id = memberDocId(workspaceId, userId);
    await setDoc(doc(db, 'research_presence', id), clean({
      id, workspace_id: workspaceId, user_id: userId, ...payload,
      online: true, updated_at: nowIso(),
    }), { merge: true });
  }

  async untrack(): Promise<void> {
    const db = requireDb();
    const workspaceId = this.name.startsWith('research-room-presence:')
      ? this.name.slice('research-room-presence:'.length)
      : '';
    const userId = String(this.config?.config?.presence?.key || auth?.currentUser?.uid || '');
    if (workspaceId && userId) {
      await deleteDoc(doc(db, 'research_presence', memberDocId(workspaceId, userId))).catch(() => undefined);
    }
  }

  subscribe(statusCallback?: (status: string) => void): this {
    if (this.name.startsWith('research-room-presence:')) this.subscribePresence(statusCallback);
    else this.subscribeNotifications(statusCallback);
    return this;
  }

  private subscribePresence(statusCallback?: (status: string) => void): void {
    try {
      const db = requireDb();
      const workspaceId = this.name.slice('research-room-presence:'.length);
      const source = firestoreQuery(collection(db, 'research_presence'), where('workspace_id', '==', workspaceId));
      this.stop = onSnapshot(source, snapshot => {
        const previous = new Set(Object.keys(this.presence));
        const next: Record<string, any[]> = {};
        snapshot.docs.forEach(item => {
          const row = item.data();
          if (row.user_id && row.online !== false) next[String(row.user_id)] = [row];
        });
        this.presence = next;
        const keys = new Set(Object.keys(next));
        const trigger = (event: string) => this.callbacks.filter(item => item.type === 'presence' && item.filter?.event === event).forEach(item => item.callback());
        if (!this.joined) {
          this.joined = true;
          statusCallback?.('SUBSCRIBED');
          trigger('sync');
        } else {
          for (const key of keys) if (!previous.has(key)) trigger('join');
          for (const key of previous) if (!keys.has(key)) trigger('leave');
          trigger('sync');
        }
      }, error => statusCallback?.('CHANNEL_ERROR: ' + error.message));
    } catch (error) {
      statusCallback?.('CHANNEL_ERROR: ' + toError(error).message);
    }
  }

  private subscribeNotifications(statusCallback?: (status: string) => void): void {
    try {
      const db = requireDb();
      const notificationCallback = this.callbacks.find(item => item.type === 'postgres_changes');
      const config = notificationCallback?.filter || {};
      const match = String(config.filter || '').match(/^recipient_id=eq\.(.+)$/);
      const recipientId = match?.[1] || auth?.currentUser?.uid;
      if (!recipientId) throw new Error('Notification listener requires a recipient ID.');
      const source = firestoreQuery(collection(db, String(config.table || 'research_notifications')), where('recipient_id', '==', recipientId));
      let firstSnapshot = true;
      const seen = new Set<string>();
      this.stop = onSnapshot(source, snapshot => {
        if (firstSnapshot) {
          snapshot.docs.forEach(item => seen.add(item.id));
          firstSnapshot = false;
          statusCallback?.('SUBSCRIBED');
          return;
        }
        for (const change of snapshot.docChanges()) {
          if (change.type !== 'added' || seen.has(change.doc.id)) continue;
          seen.add(change.doc.id);
          notificationCallback?.callback({ new: { id: change.doc.id, ...change.doc.data() }, old: null });
        }
      }, error => statusCallback?.('CHANNEL_ERROR: ' + error.message));
    } catch (error) {
      statusCallback?.('CHANNEL_ERROR: ' + toError(error).message);
    }
  }

  async unsubscribe(): Promise<string> {
    this.stop?.();
    this.stop = null;
    await this.untrack().catch(() => undefined);
    return 'ok';
  }
}

export const firebaseBackend = {
  auth: authApi,
  from(table: string) { return new FirebaseQuery(table); },
  rpc,
  channel(name: string, config?: any) { return new FirebaseChannel(name, config); },
  async removeChannel(channel: FirebaseChannel) { await channel.unsubscribe(); },
};
