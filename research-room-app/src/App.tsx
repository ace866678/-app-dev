import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  ListTodo,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  Plus,
  Save,
  Trash2,
  Copy,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
  RefreshCw,
} from 'lucide-react';
type W = {
  id: string;
  title: string;
  researchTitle: string;
  institution: string;
  program: string;
  joinCode: string;
};
type M = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
};
type S = { id: string; title: string; content: string; order: number };
type T = {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  priority: string;
  status: string;
};
type Mt = {
  id: string;
  title: string;
  date: string;
  agenda: string[];
  notes: string;
};
type ChatMessage = {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};
const template = [
  [
    'Introduction',
    'Write the study introduction here. Establish the context, problem, purpose, and direction of the research.',
  ],
  [
    'Background of the Problem',
    'Explain the need for the study, why it matters, the research gap, target population, potential beneficiaries, and supporting statistics.',
  ],
  [
    'Overview of the Current State of Technology',
    'Discuss existing solutions and technologies, compare their strengths and limitations, use contemporary sources, and lead toward the problem your system addresses.',
  ],
  [
    'Objectives of the Study',
    'General Objective\nState the overall goal in one clear sentence.\n\nSpecific Objectives\n1. To identify…\n2. To design and develop…\n3. To evaluate…',
  ],
  [
    'Scope and Limitations of the Study',
    'Scope\nDescribe purpose, target users, setting, study period, and features.\n\nLimitations\nState practical constraints beyond the researchers’ control.',
  ],
  [
    'Review of Related Literature/Studies/Systems',
    'Group sources by theme. Compare methods, findings, limitations, and gaps. End with a synthesis explaining how your study differs from previous work.',
  ],
  [
    'Methodology',
    'Describe the research and development approach, design process, data collection, implementation, and evaluation methods.',
  ],
  [
    'Hardware/Software',
    'Hardware\nList physical components and their purpose.\n\nSoftware\nList development tools, platforms, libraries, and their purpose.',
  ],
  [
    'Calendar of Activities',
    'List activities chronologically, with purpose, assigned people, target dates, and required resources.',
  ],
  [
    'Budgetary Estimate',
    'List resource, quantity, specifics, estimated cost, and total project budget.',
  ],
  [
    'Human Resources',
    'Add each researcher’s curriculum vitae and the adviser acceptance form as required by your institution.',
  ],
  [
    'References',
    'List all sources cited in the manuscript. Follow the institution’s required citation style and check consistency.',
  ],
];
const agenda = [
  'Agree on the working thesis title and target users',
  'Review Chapter 1 structure and missing evidence',
  'Divide the Introduction and Background of the Problem',
  'Divide Chapter 2 literature themes and source-finding',
  'Set deadlines and agree how progress will be reported',
];
const date = (s?: string) => (s ? s.slice(0, 10) : 'No due date');
const userView = (u: any) => ({
  userId: u.id,
  email: u.email || '',
  name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Researcher',
});
function App() {
  const [user, U] = useState<any>(null),
    [spaces, SP] = useState<W[]>([]),
    [w, W] = useState<W | null>(null),
    [members, M] = useState<M[]>([]),
    [sections, S] = useState<S[]>([]),
    [tasks, T] = useState<T[]>([]),
    [meetings, MT] = useState<Mt[]>([]);
  const [chatMessages, CM] = useState<ChatMessage[]>([]);
  const [chatDraft, CD] = useState('');
  const [authEmail, AEMAIL] = useState('');
  const [authPassword, APASSWORD] = useState('');
  const [authMode, AMODE] = useState<'signin' | 'signup'>('signin');
  const [page, P] = useState('Overview'),
    [loading, L] = useState(true),
    [busy, B] = useState(false),
    [msg, MSG] = useState(''),
    [err, E] = useState(''),
    [modal, MOD] = useState(''),
    [mobile, MOB] = useState(false);
  const [wf, WF] = useState({
      title: 'Research workspace',
      researchTitle: '',
      institution: '',
      program: 'Bachelor of Science in Information Technology',
    }),
    [code, CODE] = useState('');
  const [title, ST] = useState(''),
    [content, SC] = useState(''),
    [sid, SID] = useState(''),
    [tf, TF] = useState({
      title: '',
      description: '',
      assigneeId: '',
      dueDate: '',
      priority: 'Medium',
      status: 'To do',
    }),
    [mf, MF] = useState({
      title: 'Research group meeting',
      date: '',
      notes: '',
    }),
    [search, SEARCH] = useState(''),
    [confirm, CONF] = useState('');
  const unwrap = (result: any) => {
    if (result.error) throw new Error(result.error.message || 'Supabase request failed.');
    return result.data;
  };
  const currentUser = async () => {
    const result = await supabase.auth.getUser();
    if (result.error) throw result.error;
    if (!result.data.user) throw new Error('Your session has expired. Please sign in again.');
    return result.data.user;
  };
  const camelize = (value: any): any => {
    if (Array.isArray(value)) return value.map(camelize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase()),
        camelize(val),
      ])
    );
  };
  const call = async (
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any
  ): Promise<any> => {
    if (method === 'get' && url === '/api/workspaces') {
      const user = await currentUser();
      const memberRows = unwrap(await supabase.from('research_members').select('workspace_id').eq('user_id', user.id)) || [];
      const ids = [...new Set(memberRows.map((row: any) => row.workspace_id))];
      if (!ids.length) return { workspaces: [] };
      const rows = unwrap(await supabase.from('research_workspaces').select('*').in('id', ids).order('created_at', { ascending: false })) || [];
      return { workspaces: camelize(rows) };
    }

    if (method === 'post' && url === '/api/workspaces') {
      const row = unwrap(await supabase.rpc('create_research_workspace', {
        p_title: data.title,
        p_research_title: data.researchTitle || '',
        p_institution: data.institution || '',
        p_program: data.program || '',
      }));
      return { workspace: camelize(row) };
    }

    if (method === 'post' && url === '/api/workspaces/join') {
      const row = unwrap(await supabase.rpc('join_research_workspace', { p_join_code: data.joinCode }));
      return { workspace: camelize(row) };
    }

    const messagesPath = url.match(/^\/api\/workspaces\/([^/]+)\/messages$/);
    if (method === 'get' && messagesPath) {
      const rows = unwrap(await supabase.from('research_messages').select('*').eq('workspace_id', messagesPath[1]).order('created_at', { ascending: true }).limit(200)) || [];
      return { messages: camelize(rows) };
    }

    if (method === 'post' && url === '/api/messages') {
      const user = await currentUser();
      const row = unwrap(await supabase.from('research_messages').insert({
        workspace_id: data.workspaceId,
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Researcher',
        text: String(data.text || '').trim(),
      }).select('*').single());
      return { message: camelize(row) };
    }

    const workspacePath = url.match(/^\/api\/workspaces\/([^/]+)$/);
    if (method === 'get' && workspacePath) {
      const id = workspacePath[1];
      const [workspace, members, sections, tasks, meetings] = await Promise.all([
        supabase.from('research_workspaces').select('*').eq('id', id).single(),
        supabase.from('research_members').select('*').eq('workspace_id', id).order('joined_at', { ascending: true }),
        supabase.from('research_sections').select('*').eq('workspace_id', id).order('order', { ascending: true }),
        supabase.from('research_tasks').select('*').eq('workspace_id', id).order('created_at', { ascending: false }),
        supabase.from('research_meetings').select('*').eq('workspace_id', id).order('created_at', { ascending: false }),
      ]);
      return {
        workspace: camelize(unwrap(workspace)),
        members: camelize(unwrap(members) || []),
        sections: camelize(unwrap(sections) || []),
        tasks: camelize(unwrap(tasks) || []),
        meetings: camelize(unwrap(meetings) || []),
      };
    }

    if (method === 'put' && workspacePath) {
      const row = unwrap(await supabase.from('research_workspaces').update({
        title: data.title,
        research_title: data.researchTitle || '',
        institution: data.institution || '',
        program: data.program || '',
      }).eq('id', workspacePath[1]).select('*').single());
      return { workspace: camelize(row) };
    }

    const sectionPath = url.match(/^\/api\/sections\/([^/]+)$/);
    if (method === 'post' && url === '/api/sections') {
      const user = await currentUser();
      const row = unwrap(await supabase.from('research_sections').insert({
        workspace_id: data.workspaceId,
        title: String(data.title || '').trim(),
        content: data.content || '',
        order: Number(data.order) || 0,
        updated_by: user.id,
      }).select('*').single());
      return { section: camelize(row) };
    }
    if (method === 'put' && sectionPath) {
      const user = await currentUser();
      const row = unwrap(await supabase.from('research_sections').update({
        title: data.title,
        content: data.content || '',
        order: Number(data.order) || 0,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', sectionPath[1]).select('*').single());
      return { section: camelize(row) };
    }
    if (method === 'delete' && sectionPath) {
      const result = await supabase.from('research_sections').delete().eq('id', sectionPath[1]);
      if (result.error) throw new Error(result.error.message);
      return { deleted: true };
    }

    const taskPath = url.match(/^\/api\/tasks\/([^/]+)$/);
    if (method === 'post' && url === '/api/tasks') {
      const user = await currentUser();
      const row = unwrap(await supabase.from('research_tasks').insert({
        workspace_id: data.workspaceId,
        title: String(data.title || '').trim(),
        description: data.description || '',
        assignee_id: data.assigneeId || null,
        assignee_name: data.assigneeName || '',
        due_date: data.dueDate || '',
        priority: data.priority || 'Medium',
        status: data.status || 'To do',
        created_by: user.id,
      }).select('*').single());
      return { task: camelize(row) };
    }
    if (method === 'put' && taskPath) {
      const row = unwrap(await supabase.from('research_tasks').update({
        title: data.title,
        description: data.description || '',
        assignee_id: data.assigneeId || null,
        assignee_name: data.assigneeName || '',
        due_date: data.dueDate || '',
        priority: data.priority || 'Medium',
        status: data.status || 'To do',
        updated_at: new Date().toISOString(),
      }).eq('id', taskPath[1]).select('*').single());
      return { task: camelize(row) };
    }
    if (method === 'delete' && taskPath) {
      const result = await supabase.from('research_tasks').delete().eq('id', taskPath[1]);
      if (result.error) throw new Error(result.error.message);
      return { deleted: true };
    }

    const meetingPath = url.match(/^\/api\/meetings\/([^/]+)$/);
    if (method === 'post' && url === '/api/meetings') {
      const user = await currentUser();
      const row = unwrap(await supabase.from('research_meetings').insert({
        workspace_id: data.workspaceId,
        title: String(data.title || '').trim(),
        date: data.date || '',
        agenda: Array.isArray(data.agenda) ? data.agenda : [],
        notes: data.notes || '',
        created_by: user.id,
      }).select('*').single());
      return { meeting: camelize(row) };
    }
    if (method === 'put' && meetingPath) {
      const row = unwrap(await supabase.from('research_meetings').update({
        title: data.title,
        date: data.date || '',
        agenda: Array.isArray(data.agenda) ? data.agenda : [],
        notes: data.notes || '',
      }).eq('id', meetingPath[1]).select('*').single());
      return { meeting: camelize(row) };
    }
    if (method === 'delete' && meetingPath) {
      const result = await supabase.from('research_meetings').delete().eq('id', meetingPath[1]);
      if (result.error) throw new Error(result.error.message);
      return { deleted: true };
    }

    throw new Error('Unsupported research data request: ' + method.toUpperCase() + ' ' + url);
  };
  const reloadSpaces = async () => {
    const d = await call('get', '/api/workspaces');
    SP(d.workspaces || []);
  };
  const load = async (x: W) => {
    const d = await call('get', '/api/workspaces/' + x.id);
    W(d.workspace);
    M(d.members || []);
    S((d.sections || []).sort((a: S, b: S) => a.order - b.order));
    T(d.tasks || []);
    MT(d.meetings || []);
  };
  useEffect(() => {
    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user;
      U(nextUser ? userView(nextUser) : null);
      if (nextUser) {
        void Promise.resolve().then(() => reloadSpaces()).catch(e => {
          if (active) E(e instanceof Error ? e.message : 'Could not load workspaces.');
        });
      } else {
        SP([]);
        W(null);
      }
    });
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data.user && active) {
          U(userView(data.user));
          await reloadSpaces();
        }
      } catch (e) {
        if (active) E(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) L(false);
      }
    })();
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  const run = async (fn: () => Promise<void>, ok?: string) => {
    B(true);
    E('');
    try {
      await fn();
      if (ok) MSG(ok);
    } catch (e) {
      E(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      B(false);
    }
  };
  const signin = () =>
    run(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign-in did not return a user.');
      U(userView(data.user));
      await reloadSpaces();
    });
  const signup = () =>
    run(async () => {
      if (authPassword.length < 6) throw new Error('Use a password with at least 6 characters.');
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: { name: authEmail.trim().split('@')[0] },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      if (!data.session || !data.user) {
        AMODE('signin');
        MSG('Account created. Check your email to confirm it, then sign in.');
        return;
      }
      U(userView(data.user));
      await reloadSpaces();
    }, 'Account created.');
  const signout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) E(error.message);
    U(null);
    W(null);
    SP([]);
  };
  const create = () =>
    run(async () => {
      const d = await call('post', '/api/workspaces', wf);
      SP(a => [...a, d.workspace]);
      await load(d.workspace);
      MOD('');
      P('Overview');
    }, 'Workspace created.');
  const join = () =>
    run(async () => {
      const d = await call('post', '/api/workspaces/join', { joinCode: code });
      await reloadSpaces();
      await load(d.workspace);
      MOD('');
      CODE('');
    }, 'Joined workspace.');
  const open = (s: S) => {
    SID(s.id);
    ST(s.title);
    SC(s.content);
    P('Document');
  };
  const addTemplate = () =>
    run(async () => {
      for (let i = 0; i < template.length; i++) {
        const [t, c] = template[i];
        if (!sections.some(s => s.title === t))
          await call('post', '/api/sections', {
            workspaceId: w!.id,
            title: t,
            content: c,
            order: i,
          });
      }
      await load(w!);
    }, 'Template sections added.');
  const saveSection = () =>
    run(async () => {
      if (!title.trim()) throw Error('Section title is required.');
      if (sid)
        await call('put', '/api/sections/' + sid, {
          title,
          content,
          order: sections.find(s => s.id === sid)?.order || 0,
        });
      else {
        const d = await call('post', '/api/sections', {
          workspaceId: w!.id,
          title,
          content,
          order: sections.length,
        });
        SID(d.section.id);
      }
      await load(w!);
    }, 'Section saved.');
  const addTask = () =>
    run(async () => {
      if (!tf.title.trim()) throw Error('Task title is required.');
      const m = members.find(m => m.userId === tf.assigneeId);
      const d = await call('post', '/api/tasks', {
        ...tf,
        workspaceId: w!.id,
        assigneeName: m?.name || '',
      });
      T(a => [d.task, ...a]);
      TF({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
        priority: 'Medium',
        status: 'To do',
      });
    }, 'Task created.');
  const changeTask = (t: T, p: any) =>
    run(async () => {
      const n = { ...t, ...p };
      await call('put', '/api/tasks/' + t.id, n);
      T(a => a.map(x => (x.id === t.id ? n : x)));
    }, 'Task updated.');
  const addMeeting = () =>
    run(async () => {
      if (!mf.title.trim()) throw Error('Meeting title is required.');
      const d = await call('post', '/api/meetings', {
        ...mf,
        workspaceId: w!.id,
        agenda,
      });
      MT(a => [d.meeting, ...a]);
      MF({ title: 'Research group meeting', date: '', notes: '' });
    }, 'Meeting created.');
  const saveSettings = (e: any) => {
    e.preventDefault();
    return run(async () => {
      const d = await call('put', '/api/workspaces/' + w!.id, w);
      W(d.workspace);
      SP(a => a.map(x => (x.id === w!.id ? d.workspace : x)));
    }, 'Settings saved.');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(w!.joinCode);
      MSG('Join code copied.');
    } catch {
      MSG('Share this join code: ' + w!.joinCode);
    }
  };
  const refreshChat = async () => {
    if (!w) return;
    const d = await call('get', '/api/workspaces/' + w.id + '/messages');
    CM(d.messages || []);
  };
  const sendChat = () =>
    run(async () => {
      const messageText = chatDraft.trim();
      if (!messageText) throw Error('Write a message first.');
      const d = await call('post', '/api/messages', {
        workspaceId: w!.id,
        text: messageText,
      });
      CM(old => [...old, d.message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      CD('');
    }, 'Message sent.');
  useEffect(() => {
    if (page !== 'Chat' || !w) return;
    let active = true;
    const refresh = async () => {
      try {
        const d = await call('get', '/api/workspaces/' + w.id + '/messages');
        if (active) CM(d.messages || []);
      } catch (e) {
        if (active) E(e instanceof Error ? e.message : 'Could not refresh team chat.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [page, w?.id]);
  const completed = tasks.filter(t => t.status === 'Done').length,
    progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const nav = [
    ['Overview', LayoutDashboard],
    ['Document', BookOpen],
    ['Tasks', ListTodo],
    ['Meetings', CalendarDays],
    ['Chat', MessageCircle],
    ['Team', Users],
    ['Settings', Settings],
  ] as const;
  if (loading) return <div className="center">Opening your research room…</div>;
  if (!user)
    return (
      <main className="auth">
        <section className="auth-left">
          <div className="brand">
            <span className="mark">
              <BookOpen />
            </span>{' '}
            Research Room
          </div>
          <div>
            <small>YOUR RESEARCH, IN ONE PLACE</small>
            <h1>
              Good research is built <em>together.</em>
            </h1>
            <p>
              One shared home for your thesis document, team tasks, meeting
              notes, and proposal milestones.
            </p>
          </div>
          <small>Made for small research teams · Keep the work moving</small>
        </section>
        <section className="auth-right">
          <div className="auth-box">
            <span className="mark">
              <BookOpen />
            </span>
            <h2>Welcome to your research room</h2>
            <p>
              Sign in to open your group's workspace or create one for your
              proposal.
            </p>
            <form className="auth-form" onSubmit={e => { e.preventDefault(); void (authMode === 'signin' ? signin() : signup()); }}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={authEmail}
                  onChange={e => AEMAIL(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                  value={authPassword}
                  onChange={e => APASSWORD(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>
              <button className="primary wide" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                <ChevronRight size={16} />
              </button>
              <button className="secondary wide" type="button" disabled={busy} onClick={() => { AMODE(authMode === 'signin' ? 'signup' : 'signin'); E(''); MSG(''); }}>
                {authMode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}
              </button>
            </form>
            {err && <p className="error">{err}</p>}
            {msg && <p className="muted">{msg}</p>}
            <small>
              Each member signs in separately. Your team’s names and content are
              entered by your team.
            </small>
          </div>
        </section>
      </main>
    );
  if (!w)
    return (
      <main className="welcome">
        <header>
          <div className="brand">
            <span className="mark">
              <BookOpen />
            </span>{' '}
            Research Room
          </div>
          <button className="secondary" onClick={signout}>
            {user.name || user.email} · Sign out
          </button>
        </header>
        <section className="welcome-inner">
          <small>LET’S SET UP YOUR TEAM</small>
          <h1>
            Make room for <em>good research.</em>
          </h1>
          <p>
            Create the shared home for your thesis proposal, or join your
            teammates with their workspace code.
          </p>
          <div className="setup">
            <article>
              <span className="mark pale">
                <Plus />
              </span>
              <h3>Create a workspace</h3>
              <p>Set thesis details and invite your group.</p>
              <button className="primary" onClick={() => MOD('create')}>
                Create workspace <ChevronRight size={16} />
              </button>
            </article>
            <article>
              <span className="mark pale">
                <Users />
              </span>
              <h3>Join your team</h3>
              <p>Already have a code from a groupmate?</p>
              <button className="secondary" onClick={() => MOD('join')}>
                Enter join code <ChevronRight size={16} />
              </button>
            </article>
          </div>
        </section>
        {modal && (
          <div className="shade">
            <form
              className="modal"
              onSubmit={e => {
                e.preventDefault();
                modal === 'create' ? create() : join();
              }}
            >
              <button type="button" className="close" onClick={() => MOD('')}>
                <X />
              </button>
              <h2>
                {modal === 'create'
                  ? 'Create your workspace'
                  : 'Join a workspace'}
              </h2>
              {modal === 'create' ? (
                <>
                  {[
                    ['Workspace name', 'title'],
                    ['Thesis title', 'researchTitle'],
                    ['School / institution', 'institution'],
                    ['Degree program', 'program'],
                  ].map(([label, key]) => (
                    <label key={key}>
                      {label}
                      <input
                        required={key === 'title'}
                        value={(wf as any)[key]}
                        onChange={e => WF({ ...wf, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </>
              ) : (
                <label>
                  Workspace join code
                  <input
                    required
                    value={code}
                    onChange={e => CODE(e.target.value.toUpperCase())}
                    maxLength={12}
                    placeholder="Ask your owner for the code"
                  />
                </label>
              )}
              <button className="primary wide" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : modal === 'create'
                    ? 'Create workspace'
                    : 'Join workspace'}
              </button>
              {err && <p className="error">{err}</p>}
            </form>
          </div>
        )}
        {msg && <div className="toast">{msg}</div>}
      </main>
    );
  return (
    <div className="shell">
      <aside className={'sidebar ' + (mobile ? 'shown' : '')}>
        <div className="brand">
          <span className="mark">
            <BookOpen />
          </span>
          <div>
            <b>Research Room</b>
            <small>THESIS WORKSPACE</small>
          </div>
          <button className="mobile-close" onClick={() => MOB(false)}>
            <X />
          </button>
        </div>
        <div className="space-label">
          <small>WORKSPACE</small>
          <b>{w.title}</b>
        </div>
        <nav>
          {nav.map(([n, Icon]) => (
            <button
              key={n}
              className={page === n ? 'active' : ''}
              onClick={() => {
                P(n);
                MOB(false);
              }}
            >
              <Icon size={17} />
              {n}
              {n === 'Tasks' && tasks.some(t => t.status !== 'Done') && (
                <i>{tasks.filter(t => t.status !== 'Done').length}</i>
              )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <small>PROGRESS</small>
          <div className="bar">
            <span style={{ width: progress + '%' }} />
          </div>
          <p>
            {completed} of {tasks.length} tasks completed
          </p>
          <button className="profile" onClick={signout}>
            <span className="avatar">
              {(user.name || user.email || 'R').slice(0, 1).toUpperCase()}
            </span>
            <span>
              {user.name || user.email || 'Researcher'}
              <small>Sign out</small>
            </span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      {mobile && <button className="scrim" onClick={() => MOB(false)} />}
      <main className="main">
        <header className="top">
          <button className="hamb" onClick={() => MOB(true)}>
            <Menu />
          </button>
          <span>
            Workspace <ChevronRight size={14} /> <b>{page}</b>
          </span>
          <button className="secondary invite" onClick={copy}>
            <Users size={15} /> Invite team
          </button>
        </header>
        <div className="content">
          {msg && (
            <div className="notice">
              {msg}
              <button onClick={() => MSG('')}>×</button>
            </div>
          )}
          {err && (
            <div className="error notice">
              {err}
              <button onClick={() => E('')}>×</button>
            </div>
          )}
          {page === 'Overview' && (
            <>
              <div className="heading">
                <div>
                  <small>RESEARCH AT A GLANCE</small>
                  <h1>Welcome, {(user.name || 'researcher').split(' ')[0]}.</h1>
                  <p>Small steps, clear ownership, one shared proposal.</p>
                </div>
                <button className="primary" onClick={() => P('Tasks')}>
                  <Plus size={16} /> Add a task
                </button>
              </div>
              <section className="hero">
                <small>CURRENT RESEARCH</small>
                <h2>{w.researchTitle || 'Your thesis title goes here'}</h2>
                <p>
                  {w.institution || 'Add your school in settings'}
                  {w.program ? ' · ' + w.program : ''}
                </p>
                <button onClick={() => P('Settings')}>
                  Edit research details ↗
                </button>
              </section>
              <div className="stats">
                <article>
                  <small>Total tasks</small>
                  <b>{tasks.length}</b>
                  <p>
                    {tasks.filter(t => t.status === 'In progress').length} in
                    progress
                  </p>
                </article>
                <article>
                  <small>Completed</small>
                  <b>
                    {completed} / {tasks.length}
                  </b>
                  <p>Keep the momentum going</p>
                </article>
                <article>
                  <small>Team members</small>
                  <b>{members.length}</b>
                  <p>Collaborating in this space</p>
                </article>
                <article>
                  <small>Document sections</small>
                  <b>{sections.length}</b>
                  <p>Of the proposal template</p>
                </article>
              </div>
              <div className="cols">
                <section className="panel">
                  <div className="panel-head">
                    <h3>Recent tasks</h3>
                    <button onClick={() => P('Tasks')}>View all →</button>
                  </div>
                  {tasks.slice(0, 5).map(t => (
                    <div className="row" key={t.id}>
                      <CheckCircle2
                        size={17}
                        color={t.status === 'Done' ? '#3b9a67' : '#b9bbca'}
                      />
                      <span>
                        <b>{t.title}</b>
                        <small>
                          {t.assigneeName || 'Unassigned'} · {date(t.dueDate)}
                        </small>
                      </span>
                      <em className={'status ' + t.status.replace(' ', '-')}>
                        {t.status}
                      </em>
                    </div>
                  ))}
                  {!tasks.length && (
                    <p className="muted">
                      No tasks yet. Add the first task and assign clear
                      ownership.
                    </p>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <h3>Proposal sections</h3>
                    <button onClick={() => P('Document')}>Open →</button>
                  </div>
                  {sections.slice(0, 6).map((s, i) => (
                    <button
                      className="section-row"
                      key={s.id}
                      onClick={() => open(s)}
                    >
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <b>{s.title}</b>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  {!sections.length && (
                    <>
                      <p className="muted">Your document starts here.</p>
                      <button className="secondary" onClick={addTemplate}>
                        Add proposal template
                      </button>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
          {page === 'Document' && (
            <>
              <div className="heading">
                <div>
                  <small>THESIS PROPOSAL</small>
                  <h1>Document workspace</h1>
                  <p>Editable sections are saved for all workspace members.</p>
                </div>
                <button className="primary" onClick={addTemplate}>
                  <Plus size={16} /> Add template sections
                </button>
              </div>
              <div className="doc-layout">
                <section className="panel index">
                  <h3>Contents · {sections.length}</h3>
                  <input
                    placeholder="Search sections…"
                    value={search}
                    onChange={e => SEARCH(e.target.value)}
                  />
                  {sections
                    .filter(s =>
                      s.title.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((s, i) => (
                      <button
                        className={sid === s.id ? 'selected' : ''}
                        key={s.id}
                        onClick={() => open(s)}
                      >
                        {String(i + 1).padStart(2, '0')} · {s.title}
                      </button>
                    ))}
                  <button
                    className="secondary"
                    onClick={() => {
                      SID('');
                      ST('');
                      SC('');
                    }}
                  >
                    + Custom section
                  </button>
                </section>
                <section className="panel editor">
                  <div className="panel-head">
                    <div>
                      <h3>Edit section</h3>
                      <small>Changes are shared with the team</small>
                    </div>
                    <button
                      className="primary"
                      onClick={saveSection}
                      disabled={busy}
                    >
                      <Save size={15} /> Save
                    </button>
                  </div>
                  <label>
                    Section title
                    <input
                      value={title}
                      onChange={e => ST(e.target.value)}
                      placeholder="Enter section title"
                    />
                  </label>
                  <label>
                    Content
                    <textarea
                      rows={20}
                      value={content}
                      onChange={e => SC(e.target.value)}
                      placeholder="Write your research content here…"
                    />
                  </label>
                  <div className="editor-foot">
                    {content.trim().split(/\s+/).filter(Boolean).length} words{' '}
                    {sid && (
                      <button className="danger" onClick={() => CONF(sid)}>
                        Delete section
                      </button>
                    )}
                  </div>
                  <p className="tip">
                    Writing tip: support claims with citations and explain how
                    your study differs from previous work. Your school’s
                    official format takes precedence.
                  </p>
                </section>
              </div>
            </>
          )}
          {page === 'Tasks' && (
            <>
              <div className="heading">
                <div>
                  <small>TEAM EXECUTION</small>
                  <h1>Tasks & deadlines</h1>
                  <p>Make every next step clear: what, who, and by when.</p>
                </div>
              </div>
              <div className="task-layout">
                <section className="panel">
                  <h3>Create a task</h3>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      addTask();
                    }}
                  >
                    <label>
                      Task title
                      <input
                        required
                        value={tf.title}
                        onChange={e => TF({ ...tf, title: e.target.value })}
                        placeholder="e.g. Find three recent studies"
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        rows={3}
                        value={tf.description}
                        onChange={e =>
                          TF({ ...tf, description: e.target.value })
                        }
                      />
                    </label>
                    <div className="two">
                      <label>
                        Assign to
                        <select
                          value={tf.assigneeId}
                          onChange={e =>
                            TF({ ...tf, assigneeId: e.target.value })
                          }
                        >
                          <option value="">Unassigned</option>
                          {members.map(m => (
                            <option key={m.userId} value={m.userId}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Due date
                        <input
                          type="date"
                          value={tf.dueDate}
                          onChange={e => TF({ ...tf, dueDate: e.target.value })}
                        />
                      </label>
                    </div>
                    <div className="two">
                      <label>
                        Priority
                        <select
                          value={tf.priority}
                          onChange={e =>
                            TF({ ...tf, priority: e.target.value })
                          }
                        >
                          {['Low', 'Medium', 'High'].map(x => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={tf.status}
                          onChange={e => TF({ ...tf, status: e.target.value })}
                        >
                          {['To do', 'In progress', 'Done'].map(x => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button className="primary wide">
                      <Plus size={15} /> Create task
                    </button>
                  </form>
                </section>
                <section className="panel">
                  <h3>Team task list · {tasks.length}</h3>
                  {tasks.map(t => (
                    <article className="task-card" key={t.id}>
                      <div className="panel-head">
                        <small>{t.priority} priority</small>
                        <button className="danger" onClick={() => CONF(t.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <b>{t.title}</b>
                      {t.description && <p>{t.description}</p>}
                      <p className="muted">
                        {t.assigneeName || 'Unassigned'} · {date(t.dueDate)}
                      </p>
                      <div className="two">
                        <label>
                          Status
                          <select
                            value={t.status}
                            onChange={e =>
                              changeTask(t, { status: e.target.value })
                            }
                          >
                            {['To do', 'In progress', 'Done'].map(x => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Assignee
                          <select
                            value={t.assigneeId || ''}
                            onChange={e => {
                              const m = members.find(
                                m => m.userId === e.target.value
                              );
                              changeTask(t, {
                                assigneeId: e.target.value,
                                assigneeName: m?.name || '',
                              });
                            }}
                          >
                            <option value="">Unassigned</option>
                            {members.map(m => (
                              <option key={m.userId} value={m.userId}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </article>
                  ))}
                  {!tasks.length && (
                    <p className="muted">
                      Your task list is clear. Add a task to start.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
          {page === 'Meetings' && (
            <>
              <div className="heading">
                <div>
                  <small>TEAM CHECK-IN</small>
                  <h1>Meetings & notes</h1>
                  <p>
                    Leave every meeting with decisions, owners, and next steps.
                  </p>
                </div>
              </div>
              <div className="task-layout">
                <section className="panel">
                  <h3>Plan a meeting</h3>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      addMeeting();
                    }}
                  >
                    <label>
                      Meeting name
                      <input
                        required
                        value={mf.title}
                        onChange={e => MF({ ...mf, title: e.target.value })}
                      />
                    </label>
                    <label>
                      Date & time
                      <input
                        type="datetime-local"
                        value={mf.date}
                        onChange={e => MF({ ...mf, date: e.target.value })}
                      />
                    </label>
                    <label>
                      Initial notes
                      <textarea
                        rows={4}
                        value={mf.notes}
                        onChange={e => MF({ ...mf, notes: e.target.value })}
                      />
                    </label>
                    <button className="primary wide">
                      <Plus size={15} /> Create meeting
                    </button>
                  </form>
                </section>
                <section className="panel">
                  <h3>Suggested agenda</h3>
                  {agenda.map((a, i) => (
                    <div className="agenda-row" key={a}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {a}
                    </div>
                  ))}
                </section>
              </div>
              {meetings.map(m => (
                <section className="panel" key={m.id}>
                  <div className="panel-head">
                    <h3>{m.title}</h3>
                    <button className="danger" onClick={() => CONF(m.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="muted">
                    {m.date
                      ? new Date(m.date).toLocaleString()
                      : 'Date not set'}
                  </p>
                  {(m.agenda || []).map((a, i) => (
                    <p key={a}>
                      {i + 1}. {a}
                    </p>
                  ))}
                  <label>
                    Shared notes
                    <textarea
                      rows={4}
                      defaultValue={m.notes}
                      onBlur={e =>
                        run(async () => {
                          const n = { ...m, notes: e.target.value };
                          await call('put', '/api/meetings/' + m.id, n);
                          MT(a => a.map(x => (x.id === m.id ? n : x)));
                        }, 'Notes saved.')
                      }
                    />
                  </label>
                </section>
              ))}
            </>
          )}
          {page === 'Chat' && (
            <>
              <div className="heading">
                <div>
                  <small>TEAM CHAT</small>
                  <h1>Group conversation</h1>
                  <p>Talk through research questions, share quick updates, and coordinate your next steps.</p>
                </div>
                <button className="secondary" onClick={() => void refreshChat()}>
                  <RefreshCw size={15} /> Refresh messages
                </button>
              </div>
              <section className="panel chat-panel">
                <div className="chat-header">
                  <div className="chat-room-icon"><MessageCircle size={19} /></div>
                  <div>
                    <strong>{w.title}</strong>
                    <small>{members.length} workspace member{members.length === 1 ? '' : 's'}</small>
                  </div>
                  <span className="chat-refresh-label"><span /> Updates about every 5 seconds</span>
                </div>
                <div className="chat-messages" aria-live="polite">
                  {chatMessages.map(m => (
                    <article className={'chat-message ' + (m.senderId === user.userId ? 'mine' : 'theirs')} key={m.id}>
                      <div className="chat-message-meta">
                        <strong>{m.senderId === user.userId ? 'You' : m.senderName}</strong>
                        <time>{new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                      </div>
                      <p>{m.text}</p>
                    </article>
                  ))}
                  {!chatMessages.length && (
                    <div className="chat-empty">
                      <MessageCircle size={30} />
                      <strong>Start your group conversation</strong>
                      <p>Messages you send here are shared with everyone who has joined this workspace.</p>
                    </div>
                  )}
                </div>
                <form className="chat-composer" onSubmit={e => { e.preventDefault(); void sendChat(); }}>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={chatDraft}
                    onChange={e => CD(e.target.value)}
                    placeholder="Message your research group…"
                    aria-label="Message your research group"
                  />
                  <div className="chat-composer-footer">
                    <small>{chatDraft.length}/2000 characters · Be specific and respectful.</small>
                    <button className="primary" type="submit" disabled={busy || !chatDraft.trim()}>
                      <Send size={15} /> Send message
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
          {page === 'Team' && (
            <>
              <div className="heading">
                <div>
                  <small>COLLABORATION</small>
                  <h1>Your research team</h1>
                  <p>
                    Invite groupmates using the code. Each person signs in with
                    their own account.
                  </p>
                </div>
                <button className="primary" onClick={copy}>
                  <Copy size={15} /> Copy join code
                </button>
              </div>
              <section className="panel invite-panel">
                <small>WORKSPACE JOIN CODE</small>
                <strong>{w.joinCode}</strong>
                <p>Share this code privately with your groupmates.</p>
                <button className="secondary" onClick={copy}>
                  <Copy size={15} /> Copy code
                </button>
              </section>
              <section className="panel">
                <h3>Members · {members.length}</h3>
                {members.map((m, i) => (
                  <div className="member" key={m.id}>
                    <span className="avatar">
                      {(m.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <b>{m.name}</b>
                      <small>{m.email || 'Signed-in member'}</small>
                    </span>
                    <em>{m.role}</em>
                    {m.userId === user.userId && <small>You</small>}
                  </div>
                ))}
              </section>
            </>
          )}
          {page === 'Settings' && (
            <>
              <div className="heading">
                <div>
                  <small>WORKSPACE DETAILS</small>
                  <h1>Research settings</h1>
                  <p>Keep your institution and thesis title consistent.</p>
                </div>
              </div>
              <section className="panel settings">
                <h3>Institution & thesis details</h3>
                <form onSubmit={saveSettings}>
                  <label>
                    Workspace name
                    <input
                      required
                      value={w.title}
                      onChange={e => W({ ...w, title: e.target.value })}
                    />
                  </label>
                  <label>
                    Research title
                    <input
                      value={w.researchTitle || ''}
                      onChange={e => W({ ...w, researchTitle: e.target.value })}
                    />
                  </label>
                  <label>
                    School / institution
                    <input
                      value={w.institution || ''}
                      onChange={e => W({ ...w, institution: e.target.value })}
                    />
                  </label>
                  <label>
                    Degree program
                    <input
                      value={w.program || ''}
                      onChange={e => W({ ...w, program: e.target.value })}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    <Save size={15} /> Save settings
                  </button>
                </form>
                <p className="tip">
                  The supplied template is a writing structure. Verify page
                  layout, signatures, CVs, and citation style against your
                  institution’s latest official requirements.
                </p>
              </section>
            </>
          )}
        </div>
      </main>
      {confirm && (
        <div className="shade">
          <div className="modal">
            <h2>Delete this item?</h2>
            <p>This cannot be undone.</p>
            <div className="actions">
              <button className="secondary" onClick={() => CONF('')}>
                Cancel
              </button>
              <button
                className="primary red"
                onClick={() =>
                  run(async () => {
                    if (page === 'Document') {
                      await call('delete', '/api/sections/' + confirm);
                      S(a => a.filter(s => s.id !== confirm));
                      if (sid === confirm) {
                        SID('');
                        ST('');
                        SC('');
                      }
                    } else if (page === 'Tasks') {
                      await call('delete', '/api/tasks/' + confirm);
                      T(a => a.filter(t => t.id !== confirm));
                    } else {
                      await call('delete', '/api/meetings/' + confirm);
                      MT(a => a.filter(m => m.id !== confirm));
                    }
                    CONF('');
                  }, 'Item deleted.')
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
