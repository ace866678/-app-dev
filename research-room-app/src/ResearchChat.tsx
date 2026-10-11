import { BookOpen, MessageCircle, RefreshCw, Search, Send, Smile, AtSign, FileText, Terminal, ChevronRight } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useEffect, useState } from 'react';
import { AvatarArt } from './ProfileAvatar';

type Message = { id: string; workspaceId: string; senderId: string; senderName: string; text: string; topic: string; createdAt: string };
type Member = { id: string; userId: string; name: string; avatarUrl?: string; role: string };
type SelectedMention = { userId: string; name: string };
type SlashCommand = { syntax: string; description: string; insert: string };
type Props = {
  workspaceTitle: string; memberCount: number; refresh: () => void;
  search: string; onSearch: (value: string) => void;
  filter: string; onFilter: (value: string) => void;
  messages: Message[]; visible: Message[]; userId: string; topics: string[];
  chapterTopics: string[]; onOpenChapter: (chapter: string) => void;
  topic: string; onTopic: (value: string) => void; draft: string;
  onDraft: (value: string) => void; busy: boolean; send: (mentionedUserIds: string[]) => void;
  members: Member[]; onlineUserIds: string[];
  onCreateTopic: (topic: string, openDocument: boolean) => void;
  onNavigate: (page: string) => void;
};

const slashCommands: SlashCommand[] = [
  { syntax: '/help', description: 'Show the command guide', insert: '/help' },
  { syntax: '/topic <name>', description: 'Create a chat topic linked to a document chapter', insert: '/topic ' },
  { syntax: '/chapter <name>', description: 'Create a linked chapter and open Document', insert: '/chapter ' },
  { syntax: '/doc', description: 'Open the document for this chapter/topic', insert: '/doc' },
  { syntax: '/meetings', description: 'Open research meetings', insert: '/meetings' },
  { syntax: '/tasks', description: 'Open the task board', insert: '/tasks' },
  { syntax: '/team', description: 'Open the team list', insert: '/team' },
  { syntax: '/workspaces', description: 'Return to the workspace list', insert: '/workspaces' },
  { syntax: '/clear', description: 'Clear topic filters and chat search', insert: '/clear' },
  { syntax: '/me <text>', description: 'Post an italic action-style message', insert: '/me ' },
];

export default function ResearchChat(p: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [commandNotice, setCommandNotice] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<SelectedMention[]>([]);
  const mentionMatch = p.draft.match(/(?:^|\s)@([^\s@]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1] : null;
  const showMentionMenu = mentionQuery !== null || mentionMenuOpen;
  const mentionCandidates = p.members.filter(member => member.userId !== p.userId && (
    !mentionQuery || member.name.toLowerCase().includes(mentionQuery.toLowerCase())
  ));
  const headerTopic = p.filter === 'All topics' ? 'All research discussions' : p.filter;

  useEffect(() => {
    if (!p.draft) setSelectedMentions([]);
  }, [p.draft]);

  const updateDraft = (value: string) => {
    p.onDraft(value);
    setSelectedMentions(current => current.filter(mention => value.includes('@' + mention.name)));
    if (/(?:^|\s)@[^\s@]*$/.test(value)) setMentionMenuOpen(true);
    if (!value.startsWith('/')) setCommandNotice('');
  };

  const insertMention = (member: Member) => {
    const token = '@' + member.name;
    const value = mentionQuery !== null
      ? p.draft.replace(/@([^\s@]*)$/, token + ' ')
      : p.draft + (p.draft && !p.draft.endsWith(' ') ? ' ' : '') + token + ' ';
    p.onDraft(value);
    setSelectedMentions(current => current.some(item => item.userId === member.userId) ? current : [...current, { userId: member.userId, name: member.name }]);
    setMentionMenuOpen(false);
  };

  const clearComposerMenus = () => {
    setSelectedMentions([]);
    setMentionMenuOpen(false);
    setEmojiOpen(false);
    setCommandMenuOpen(false);
  };

  const sendMessage = () => {
    const value = p.draft.trim();
    if (!value) return;
    const commandMatch = value.match(/^\/([a-z]+)(?:\s+([\s\S]*))?$/i);
    const command = commandMatch?.[1]?.toLowerCase();
    const argument = (commandMatch?.[2] || '').trim();

    if (command && command !== 'me') {
      switch (command) {
        case 'help':
        case 'commands':
          p.onDraft('');
          setSelectedMentions([]);
          setMentionMenuOpen(false);
          setEmojiOpen(false);
          setCommandNotice('');
          setCommandMenuOpen(true);
          return;
        case 'topic':
        case 'chapter':
          if (!argument) {
            setCommandMenuOpen(true);
            setCommandNotice('Add a name after the command, for example: /topic Research Design');
            return;
          }
          if (argument.length > 100) {
            setCommandNotice('Topic names must be 100 characters or fewer.');
            return;
          }
          p.onCreateTopic(argument, command === 'chapter');
          p.onDraft('');
          setCommandNotice('');
          clearComposerMenus();
          return;
        case 'doc':
          if (p.chapterTopics.some(chapter => chapter.toLowerCase() === p.topic.toLowerCase())) p.onOpenChapter(p.topic);
          else p.onNavigate('Document');
          p.onDraft('');
          clearComposerMenus();
          return;
        case 'meetings':
          p.onNavigate('Meetings');
          p.onDraft('');
          clearComposerMenus();
          return;
        case 'tasks':
          p.onNavigate('Tasks');
          p.onDraft('');
          clearComposerMenus();
          return;
        case 'team':
          p.onNavigate('Team');
          p.onDraft('');
          clearComposerMenus();
          return;
        case 'workspaces':
          p.onNavigate('Workspaces');
          p.onDraft('');
          clearComposerMenus();
          return;
        case 'clear':
          p.onSearch('');
          p.onFilter('All topics');
          p.onTopic('General');
          p.onDraft('');
          setCommandNotice('Chat search and topic filters cleared.');
          clearComposerMenus();
          return;
        default:
          setCommandMenuOpen(true);
          setCommandNotice('Unknown command. Choose a command below or type /help.');
          return;
      }
    }

    const ids = selectedMentions.filter(mention => value.includes('@' + mention.name)).map(mention => mention.userId);
    p.send([...new Set(ids)]);
    setSelectedMentions([]);
    setMentionMenuOpen(false);
    setEmojiOpen(false);
    setCommandMenuOpen(false);
  };

  const renderMessageText = (text: string) => {
    if (/^\/me\s+/i.test(text)) {
      return <><span className="chat-action-label">ACTION</span> <em>{text.replace(/^\/me\s+/i, '')}</em></>;
    }
    return text.split(/(@[^\s@]+(?:\s[^\s@]+)?)/g).map((part, index) =>
      part.startsWith('@') ? <mark className="chat-mention-highlight" key={index}>{part}</mark> : <span key={index}>{part}</span>
    );
  };

  return (
    <div className="chat-workspace-layout">
      <section className="panel chat-panel">
        <div className="chat-header chat-header-prominent">
          <div className="chat-room-icon"><MessageCircle size={23} /></div>
          <div className="chat-header-text"><span className="chat-header-eyebrow">RESEARCH DISCUSSION</span><strong className="chat-room-title">{headerTopic}</strong><small>{p.workspaceTitle} · {p.filter === 'All topics' ? 'All topic messages' : 'Topic conversation'}</small></div>
          <div className="chat-header-controls">
            <div className="posting-topic-chip"><span>New messages go to</span><b>{p.topic}</b></div>
            {p.filter !== 'All topics' && p.chapterTopics.some(chapter => chapter.toLowerCase() === p.filter.toLowerCase()) && <button type="button" className="secondary chat-open-document" onClick={() => p.onOpenChapter(p.filter)}><FileText size={14} /> Open chapter</button>}
            <button className="chat-refresh-icon" aria-label="Refresh messages" onClick={p.refresh}><RefreshCw size={15} /></button>
          </div>
        </div>
        <div className="chat-tools"><label className="chat-search"><Search size={16} /><input value={p.search} onChange={event => p.onSearch(event.target.value)} placeholder="Search messages in this topic…" aria-label="Search messages" /></label>{p.filter !== 'All topics' && <button className="secondary" onClick={() => p.onFilter('All topics')}>Clear filter</button>}</div>
        <div className="chat-messages" aria-live="polite">
          {p.visible.map(message => {
            const member = p.members.find(item => item.userId === message.senderId);
            const mine = message.senderId === p.userId;
            const online = p.onlineUserIds.includes(message.senderId);
            return <div className={'chat-message-row ' + (mine ? 'mine' : 'theirs')} key={message.id}>
              <span className="chat-avatar"><AvatarArt value={member?.avatarUrl} name={message.senderName} /><i className={'presence-dot ' + (online ? 'online' : 'offline')} /></span>
              <article className={'chat-message ' + (mine ? 'mine' : 'theirs')}>
                <div className="chat-message-meta"><strong>{mine ? 'You' : message.senderName}</strong><span className="chat-topic-tag">{message.topic || 'General'}</span><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>
                <p>{renderMessageText(message.text)}</p>
              </article>
            </div>;
          })}
          {!p.visible.length && <div className="chat-empty"><MessageCircle size={32} /><strong>{p.messages.length ? 'No matching messages' : 'Start your group conversation'}</strong><p>{p.messages.length ? 'Try another topic or search phrase.' : 'Choose a topic from the list on the right and share your research updates.'}</p></div>}
        </div>
        <form className="chat-composer" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
          <div className="chat-composer-top"><span>Posting to <b>{p.topic}</b></span><div className="chat-composer-tools">
            <button type="button" className="emoji-toggle" aria-label="Mention a teammate" aria-expanded={showMentionMenu} onClick={() => setMentionMenuOpen(value => !value)}><AtSign size={16} /> Mention</button>
            <button type="button" className="emoji-toggle" aria-label="Add emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen(value => !value)}><Smile size={17} /> Emoji</button>
            <button type="button" className="emoji-toggle" aria-label="Show chat commands" aria-expanded={commandMenuOpen} onClick={() => setCommandMenuOpen(value => !value)}><Terminal size={16} /> Commands</button>
          </div></div>
          {commandNotice && <p className="chat-command-notice" role="status">{commandNotice}</p>}
          {commandMenuOpen && <div className="chat-command-menu" aria-label="Chat slash commands">
            <div className="chat-command-menu-heading"><span>Chat commands</span><small>Type a command or select one to insert it</small></div>
            {slashCommands.map(command => <button type="button" key={command.syntax} onClick={() => { p.onDraft(command.insert); setCommandNotice(''); setCommandMenuOpen(false); }}><code>{command.syntax}</code><span>{command.description}</span><ChevronRight size={14} /></button>)}
          </div>}
          {showMentionMenu && <div className="chat-mention-menu" role="listbox" aria-label="Mention a teammate">
            <div className="chat-mention-menu-title">{mentionQuery ? 'Matching teammates' : 'Choose a teammate to mention'}</div>
            {mentionCandidates.map(member => <button type="button" role="option" key={member.userId} onClick={() => insertMention(member)}>
              <span className="mention-option-avatar"><AvatarArt value={member.avatarUrl} name={member.name} /></span>
              <span><b>{member.name}</b><small>{member.role === 'owner' ? 'Owner / Leader' : 'Member'}</small></span>
            </button>)}
            {!mentionCandidates.length && <p className="muted">No matching teammate. Try a different name.</p>}
          </div>}
          {emojiOpen && <div className="chat-emoji-picker-shell"><EmojiPicker emojiStyle="native" width={320} height={340} lazyLoadEmojis previewConfig={{ showPreview: false }} onEmojiClick={emoji => { updateDraft(p.draft + emoji.emoji); setEmojiOpen(false); }} /></div>}
          <textarea rows={3} maxLength={2200} value={p.draft} onChange={event => updateDraft(event.target.value)} placeholder="Write a message. Type @ to mention a teammate, or /help for commands…" aria-label="Message your research group" />
          <div className="chat-composer-footer"><small>{p.draft.length}/2200 characters · @mentions notify teammates · /help lists commands</small><button className="primary" type="submit" disabled={p.busy || !p.draft.trim()}><Send size={16} /> Send message</button></div>
        </form>
      </section>
      <aside className="panel chat-right-rail"><div className="rail-section topics-rail">
        <div className="rail-heading"><div><h3>Research topics</h3><small>Chapter topics are connected to the document; use /topic to add one</small></div><BookOpen size={20} /></div>
        <div className="topic-nav-list">{['All topics', ...p.topics].map(topic => {
          const count = topic === 'All topics' ? p.messages.length : p.messages.filter(message => (message.topic || 'General') === topic).length;
          return <button type="button" key={topic} className={'topic-nav-item' + (p.filter.toLowerCase() === topic.toLowerCase() ? ' active' : '')} onClick={() => { p.onFilter(topic); if (topic !== 'All topics') p.onTopic(topic); }}>
            <span className="topic-bullet"><MessageCircle size={17} /></span><span className="topic-nav-label">{topic}</span><span className="topic-count">{count}</span>
          </button>;
        })}</div>
        <div className="topic-rail-note"><span className="topic-rail-live-dot" /><span>{p.topics.length} research topics · {p.messages.length} messages</span></div>
      </div></aside>
    </div>
  );
}
