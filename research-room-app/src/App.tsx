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
  MapPin,
  FileDown,
  GripVertical,
  Search,
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
  topic: string;
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
const deadlineLabel = (s?: string) => {
  if (!s) return 'No deadline';
  const due = new Date(s.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(due.getTime())) return s;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
};
const CHAT_TOPICS = ['General', 'Chapter 1', 'Chapter 2', 'Literature Review', 'Methodology', 'Meetings & Planning'];
const xmlEscape = (value: string) => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const zipCrc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const zipStoredFiles = (files: { name: string; content: string }[]) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  let centralSize = 0;
  const dosDate = ((2024 - 1980) << 9) | (1 << 5) | 1;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = zipCrc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); lv.setUint16(10, 0, true); lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true); local.set(name, 30);
    localParts.push(local, data);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, localOffset, true);
    central.set(name, 46); centralParts.push(central);
    localOffset += 30 + name.length + data.length; centralSize += central.length;
  }
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, localOffset, true); ev.setUint16(20, 0, true);
  const output = new Uint8Array(localOffset + centralSize + end.length); let pos = 0;
  for (const part of localParts) { output.set(part, pos); pos += part.length; }
  for (const part of centralParts) { output.set(part, pos); pos += part.length; }
  output.set(end, pos);
  return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};
const createDocxBlob = (workspace: W, documentSections: S[]) => {
  const para = (text: string, style?: string) => '<w:p>' + (style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '') + '<w:r><w:t xml:space="preserve">' + xmlEscape(text) + '</w:t></w:r></w:p>';
  const body: string[] = [para(workspace.researchTitle || workspace.title, 'Title'), workspace.institution ? para(workspace.institution) : '', workspace.program ? para(workspace.program) : '', ''];
  [...documentSections].sort((a, b) => a.order - b.order).forEach(section => {
    body.push(para(section.title, 'Heading1'));
    (section.content || '').split(/\r?\n/).forEach(line => body.push(para(line)));
    body.push('');
  });
  body.push('<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>');
  const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body.join('') + '</w:body></w:document>';
  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="32"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/></w:rPr></w:style></w:styles>';
  return zipStoredFiles([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/document.xml', content: documentXml },
    { name: 'word/styles.xml', content: stylesXml },
    { name: 'word/_rels/document.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' }
  ]);
};
const userView = (u: any) => ({
  userId: u.id,
  email: u.email || '',
  name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Researcher',
});
const getAuthRedirectUrl = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'https://research-room-sable.vercel.app';
  }
  return window.location.origin;
};
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
  const [chatTopic, CTopic] = useState('General');
  const [chatFilter, CFILTER] = useState('All topics');
  const [chatSearch, CSEARCH] = useState('');
  const [draggedSectionId, DSI] = useState('');
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
  const [mapQuery, MAPQ] = useState('Philippines');
  const [activeMapQuery, AMQ] = useState('Philippines');
  const isOwner = members.some(member => member.userId === user?.userId && member.role === 'owner');
  const visibleChatMessages = chatMessages.filter(message =>
    (chatFilter === 'All topics' || (message.topic || 'General') === chatFilter) &&
    message.text.toLowerCase().includes(chatSearch.toLowerCase().trim())
  );
  const unwrap = (result: any) => {
    if (result.error) throw new Error(result.error.message || 'Supabase request failed.');
    return result.data;
  };
  const currentUser = async () => {
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    const sessionUser = result.data.session?.user;
    if (!sessionUser) throw new Error('Your session is missing or expired. Please sign in again.');
    return sessionUser;
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
        topic: CHAT_TOPICS.includes(data.topic) ? data.topic : 'General',
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
    const availableSpaces = d.workspaces || [];
    SP(availableSpaces);
    if (!availableSpaces.length) {
      W(null);
      M([]);
      S([]);
      T([]);
      MT([]);
      CM([]);
      return;
    }

    const sessionUser = await currentUser();
    const selectionKey = 'research-room:selected-workspace:' + sessionUser.id;
    let savedWorkspaceId = '';
    try {
      savedWorkspaceId = window.localStorage.getItem(selectionKey) || '';
    } catch {
      // Continue using the first available workspace if browser storage is blocked.
    }
    const selected = availableSpaces.find((space: W) => space.id === savedWorkspaceId) || availableSpaces[0];
    await load(selected);
  };
  const load = async (x: W) => {
    const d = await call('get', '/api/workspaces/' + x.id);
    const sessionUser = await currentUser();
    try {
      window.localStorage.setItem('research-room:selected-workspace:' + sessionUser.id, x.id);
    } catch {
      // The database remains the source of truth when browser storage is unavailable.
    }
    const savedMapQuery = (() => {
      try {
        return window.localStorage.getItem('research-room-map:' + x.id) || d.workspace.institution || 'Philippines';
      } catch {
        return d.workspace.institution || 'Philippines';
      }
    })();
    MAPQ(savedMapQuery);
    AMQ(savedMapQuery);
    W(d.workspace);
    M(d.members || []);
    S((d.sections || []).sort((a: S, b: S) => a.order - b.order));
    T(d.tasks || []);
    MT(d.meetings || []);
  };
  useEffect(() => {
    let active = true;
    let loadedForUser = '';
    // Keep Supabase's auth callback synchronous. Fetch data only after it returns.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const nextUser = session?.user;
      U(nextUser ? userView(nextUser) : null);

      if (!nextUser) {
        loadedForUser = '';
        SP([]);
        W(null);
        L(false);
        return;
      }

      if (
        (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') ||
        loadedForUser === nextUser.id
      ) {
        return;
      }

      loadedForUser = nextUser.id;
      window.setTimeout(() => {
        if (!active) return;
        void reloadSpaces()
          .catch(e => {
            if (active) E(e instanceof Error ? e.message : 'Could not load workspaces.');
          })
          .finally(() => {
            if (active) L(false);
          });
      }, 0);
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  const switchWorkspace = (workspaceId: string) => {
    const selected = spaces.find(space => space.id === workspaceId);
    if (!selected || selected.id === w?.id) return;
    void run(async () => {
      await load(selected);
      CM([]);
      P('Overview');
    }, 'Workspace switched.');
  };
  const reorderSections = (fromId: string, targetId: string) => {
    void run(async () => {
      const ordered = [...sections].sort((a, b) => a.order - b.order);
      const fromIndex = ordered.findIndex(section => section.id === fromId);
      const toIndex = ordered.findIndex(section => section.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const [moving] = ordered.splice(fromIndex, 1);
      ordered.splice(toIndex, 0, moving);
      const updated = ordered.map((section, order) => ({ ...section, order }));
      await Promise.all(updated.map(section => call('put', '/api/sections/' + section.id, section)));
      S(updated);
    }, 'Document section order saved.');
  };
  const exportDocument = () => {
    try {
      const blob = createDocxBlob(w!, sections);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = (w?.researchTitle || w?.title || 'Research-Room').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'research-document';
      link.href = url; link.download = fileName + '.docx';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      MSG('DOCX export prepared.'); E('');
    } catch (e) { E(e instanceof Error ? e.message : 'Could not export the document.'); }
  };
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
    });
  const signInWithGoogle = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;
    });
  const signup = () =>
    run(async () => {
      if (authPassword.length < 6) throw new Error('Use a password with at least 6 characters.');
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: { name: authEmail.trim().split('@')[0] },
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
      if (!data.session || !data.user) {
        AMODE('signin');
        MSG('Account created. Check your email to confirm it, then sign in.');
        return;
      }
      U(userView(data.user));
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
      if (!isOwner) throw Error('Only the workspace owner can create tasks or set deadlines.');
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
        topic: chatTopic,
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
  const deadlines = tasks
    .filter(t => t.status !== 'Done' && !!t.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
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
                  placeholder={authMode === 'signin' ? 'Enter your password' : 'At least 6 characters'}
                />
              </label>
              <button className="primary wide" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                <ChevronRight size={16} />
              </button>
              <div className="auth-divider"><span>or continue with</span></div>
              <button className="google-auth wide" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
                <span className="google-g" aria-hidden="true">G</span>
                Continue with Google
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
          <small>WORKSPACES</small>
          <select aria-label="Switch workspace" value={w.id} onChange={e => switchWorkspace(e.target.value)}>
            {spaces.map(space => <option key={space.id} value={space.id}>{space.title}</option>)}
          </select>
          <button type="button" className="workspace-action" onClick={() => { WF({ title: 'Research workspace', researchTitle: '', institution: '', program: 'Bachelor of Science in Information Technology' }); MOD('create'); }}>
            <Plus size={13} /> New workspace
          </button>
          <button type="button" className="workspace-action secondary-action" onClick={() => { CODE(''); MOD('join'); }}>
            <Users size={13} /> Join with code
          </button>
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
                {isOwner && <button className="primary" onClick={() => P('Tasks')}>
                  <Plus size={16} /> Add a task
                </button>}
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
              <div className="cols dashboard-lower">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Upcoming deadlines</h3>
                      <small>Open tasks ordered by due date</small>
                    </div>
                    <button onClick={() => P('Tasks')}>Manage tasks →</button>
                  </div>
                  {deadlines.map(t => {
                    const label = deadlineLabel(t.dueDate);
                    const tone = label.includes('overdue') ? ' overdue' : label === 'Due today' ? ' today' : '';
                    return (
                      <div className="deadline-item" key={t.id}>
                        <CalendarDays size={17} />
                        <span className="deadline-copy">
                          <b>{t.title}</b>
                          <small>{t.assigneeName || 'Unassigned'} · {date(t.dueDate)}</small>
                        </span>
                        <em className={'deadline-tag' + tone}>{label}</em>
                      </div>
                    );
                  })}
                  {!deadlines.length && (
                    <p className="muted">No upcoming deadlines yet. Add a due date to a task and it will appear here.</p>
                  )}
                </section>
                <section className="panel map-panel">
                  <div className="panel-head">
                    <div>
                      <h3><MapPin size={15} /> Research location map</h3>
                      <small>Find your school, meeting place, or field site</small>
                    </div>
                  </div>
                  <form className="map-search" onSubmit={e => {
                    e.preventDefault();
                    const nextQuery = mapQuery.trim();
                    if (!nextQuery) {
                      E('Enter a location to show it on the map.');
                      return;
                    }
                    try {
                      window.localStorage.setItem('research-room-map:' + w.id, nextQuery);
                    } catch {
                      // Keep the current map available for this session.
                    }
                    AMQ(nextQuery);
                    MSG('Map location updated.');
                  }}>
                    <input
                      aria-label="Search map location"
                      value={mapQuery}
                      onChange={e => MAPQ(e.target.value)}
                      placeholder="Search a place or address"
                    />
                    <button className="secondary" type="submit">Show map</button>
                  </form>
                  <div className="map-frame">
                    <iframe
                      title={'Map showing ' + activeMapQuery}
                      src={'https://maps.google.com/maps?q=' + encodeURIComponent(activeMapQuery) + '&output=embed'}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="map-foot">
                    <span>Showing: {activeMapQuery}</span>
                    <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activeMapQuery)} target="_blank" rel="noreferrer">Open full map ↗</a>
                  </div>
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
                <div className="document-actions">
                  <button className="secondary" onClick={exportDocument} disabled={!sections.length}>
                    <FileDown size={15} /> Export .docx
                  </button>
                  <button className="primary" onClick={addTemplate}>
                    <Plus size={16} /> Add template sections
                  </button>
                </div>
              </div>
              <div className="doc-layout">
                <section className="panel index">
                  <h3>Contents · {sections.length}</h3>
                  <p className="section-order-tip"><GripVertical size={13} /> Drag sections to rearrange the document.</p>
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
                        draggable
                        onDragStart={e => { DSI(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const fromId = draggedSectionId || e.dataTransfer.getData('text/plain'); if (fromId && fromId !== s.id) void reorderSections(fromId, s.id); DSI(''); }}
                        onDragEnd={() => DSI('')}
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
                {isOwner ? <section className="panel">
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
                </section> : <section className="panel owner-restricted">
                  <h3>Task creation is owner-only</h3>
                  <p>Only the workspace owner can create tasks or set and change deadlines. You can still view the plan and update task status.</p>
                  <small>Ask your research leader to add a task if new work needs to be assigned.</small>
                </section>}
                <section className="panel">
                  <h3>Team task list · {tasks.length}</h3>
                  {tasks.map(t => (
                    <article className="task-card" key={t.id}>
                      <div className="panel-head">
                        <small>{t.priority} priority</small>
                        {isOwner && <button className="danger" onClick={() => CONF(t.id)}>
                          <Trash2 size={14} />
                        </button>}
                      </div>
                      <b>{t.title}</b>
                      {t.description && <p>{t.description}</p>}
                      <p className="muted">
                        {t.assigneeName || 'Unassigned'} · {date(t.dueDate)}
                      </p>
                      {isOwner && <label className="task-deadline-edit">
                        Deadline
                        <input type="date" value={t.dueDate || ''} onChange={e => changeTask(t, { dueDate: e.target.value })} />
                      </label>}
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
                        {isOwner ? <label>
                          Assignee
                          <select
                            value={t.assigneeId || ''}
                            onChange={e => {
                              const m = members.find(m => m.userId === e.target.value);
                              changeTask(t, { assigneeId: e.target.value, assigneeName: m?.name || '' });
                            }}
                          >
                            <option value="">Unassigned</option>
                            {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                          </select>
                        </label> : <div className="task-assignee-readonly">
                          <small>Assigned to</small>
                          <b>{t.assigneeName || 'Unassigned'}</b>
                        </div>}
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
                <div className="chat-tools">
                  <label className="chat-search">
                    <Search size={14} />
                    <input value={chatSearch} onChange={e => CSEARCH(e.target.value)} placeholder="Search research discussions…" aria-label="Search messages" />
                  </label>
                  <label className="chat-filter">
                    <span>Topic</span>
                    <select value={chatFilter} onChange={e => CFILTER(e.target.value)}>
                      {['All topics', ...CHAT_TOPICS].map(topic => <option key={topic}>{topic}</option>)}
                    </select>
                  </label>
                </div>
                <div className="chat-messages" aria-live="polite">
                  {visibleChatMessages.map(m => (
                    <article className={'chat-message ' + (m.senderId === user.userId ? 'mine' : 'theirs')} key={m.id}>
                      <div className="chat-message-meta">
                        <strong>{m.senderId === user.userId ? 'You' : m.senderName}</strong>
                        <span className="chat-topic-tag">{m.topic || 'General'}</span>
                        <time>{new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                      </div>
                      <p>{m.text}</p>
                    </article>
                  ))}
                  {!visibleChatMessages.length && (
                    <div className="chat-empty">
                      <MessageCircle size={30} />
                      <strong>{chatMessages.length ? 'No matching messages' : 'Start your group conversation'}</strong>
                      <p>{chatMessages.length ? 'Try a different topic or search phrase.' : 'Use the topic selector to keep Chapter 1, Chapter 2, literature review and methodology discussions organised.'}</p>
                    </div>
                  )}
                </div>
                <div className="chat-prompts">
                  <small>RESEARCH QUICK PROMPTS</small>
                  <div>
                    <button type="button" onClick={() => { CTopic('Literature Review'); CD(d => (d ? d + '\n' : '') + 'Could you share the citation, publication year, method, key finding, and limitation of this study?'); }}>Ask for a citation</button>
                    <button type="button" onClick={() => { CTopic('Chapter 1'); CD(d => (d ? d + '\n' : '') + 'What evidence supports this research problem, and what gap does our study address?'); }}>Clarify the research gap</button>
                    <button type="button" onClick={() => { CTopic('Methodology'); CD(d => (d ? d + '\n' : '') + 'What data, participants, instruments, and evaluation criteria do we still need to define?'); }}>Review methodology</button>
                  </div>
                </div>
                <form className="chat-composer" onSubmit={e => { e.preventDefault(); void sendChat(); }}>
                  <label className="chat-topic-picker">
                    Discussion topic
                    <select value={chatTopic} onChange={e => CTopic(e.target.value)}>
                      {CHAT_TOPICS.map(topic => <option key={topic}>{topic}</option>)}
                    </select>
                  </label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={chatDraft}
                    onChange={e => CD(e.target.value)}
                    placeholder="Share a research question, source, draft paragraph, decision, or progress update…"
                    aria-label="Message your research group"
                  />
                  <div className="chat-composer-footer">
                    <small>{chatDraft.length}/2000 characters · Keep claims tied to sources and separate evidence from assumptions.</small>
                    <button className="primary" type="submit" disabled={busy || !chatDraft.trim()}>
                      <Send size={15} /> Send to team
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
      {(modal === 'create' || modal === 'join') && (
        <div className="shade">
          <form className="modal" onSubmit={e => { e.preventDefault(); modal === 'create' ? create() : join(); }}>
            <button type="button" className="close" onClick={() => MOD('')}><X size={18} /></button>
            <h2>{modal === 'create' ? 'Create another workspace' : 'Join a workspace'}</h2>
            {modal === 'create' ? <>
              {[
                ['Workspace name', 'title'],
                ['Thesis title', 'researchTitle'],
                ['School / institution', 'institution'],
                ['Degree program', 'program'],
              ].map(([label, key]) => (
                <label key={key}>
                  {label}
                  <input required={key === 'title'} value={(wf as any)[key]} onChange={e => WF({ ...wf, [key]: e.target.value })} />
                </label>
              ))}
            </> : <label>Workspace join code
              <input required value={code} onChange={e => CODE(e.target.value.toUpperCase())} maxLength={12} placeholder="Ask the owner for the code" />
            </label>}
            <div className="actions">
              <button type="button" className="secondary" onClick={() => MOD('')}>Cancel</button>
              <button className="primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : modal === 'create' ? 'Create workspace' : 'Join workspace'}</button>
            </div>
            {err && <p className="error">{err}</p>}
          </form>
        </div>
      )}
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
