import { BookOpen, MessageCircle, RefreshCw, Search, Send, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useState } from 'react';

type Message = {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  text: string;
  topic: string;
  createdAt: string;
};
type Member = { id: string; userId: string; name: string; avatarUrl?: string; role: string };
type Props = {
  workspaceTitle: string; memberCount: number; refresh: () => void;
  search: string; onSearch: (value: string) => void;
  filter: string; onFilter: (value: string) => void;
  messages: Message[]; visible: Message[]; userId: string; topics: string[];
  topic: string; onTopic: (value: string) => void; draft: string;
  onDraft: (value: string) => void; busy: boolean; send: () => void;
  members: Member[]; onlineUserIds: string[];
};

export default function ResearchChat(p: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const headerTopic = p.filter === 'All topics' ? 'All research discussions' : p.filter;

  return (
    <div className="chat-workspace-layout">
      <section className="panel chat-panel">
        <div className="chat-header chat-header-prominent">
          <div className="chat-room-icon"><MessageCircle size={23} /></div>
          <div className="chat-header-text"><span className="chat-header-eyebrow">RESEARCH DISCUSSION</span><strong className="chat-room-title">{headerTopic}</strong><small>{p.workspaceTitle} · {p.filter === 'All topics' ? 'All topic messages' : 'Topic conversation'}</small></div>
          <div className="chat-header-controls"><div className="posting-topic-chip"><span>New messages go to</span><b>{p.topic}</b></div><button className="chat-refresh-icon" aria-label="Refresh messages" onClick={p.refresh}><RefreshCw size={15} /></button></div>
        </div>
        <div className="chat-tools"><label className="chat-search"><Search size={16} /><input value={p.search} onChange={event => p.onSearch(event.target.value)} placeholder="Search messages in this topic…" aria-label="Search messages" /></label>{p.filter !== 'All topics' && <button className="secondary" onClick={() => p.onFilter('All topics')}>Clear filter</button>}</div>
        <div className="chat-messages" aria-live="polite">
          {p.visible.map(message => {
            const member = p.members.find(item => item.userId === message.senderId);
            const mine = message.senderId === p.userId;
            const online = p.onlineUserIds.includes(message.senderId);
            return <div className={'chat-message-row ' + (mine ? 'mine' : 'theirs')} key={message.id}>
              <span className="chat-avatar">{member?.avatarUrl ? <img src={member.avatarUrl} alt={message.senderName + ' profile'} referrerPolicy="no-referrer" /> : (message.senderName || '?').slice(0, 1).toUpperCase()}<i className={'presence-dot ' + (online ? 'online' : 'offline')} /></span>
              <article className={'chat-message ' + (mine ? 'mine' : 'theirs')}>
                <div className="chat-message-meta"><strong>{mine ? 'You' : message.senderName}</strong><span className="chat-topic-tag">{message.topic || 'General'}</span><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>
                <p>{message.text}</p>
              </article>
            </div>;
          })}
          {!p.visible.length && <div className="chat-empty"><MessageCircle size={32} /><strong>{p.messages.length ? 'No matching messages' : 'Start your group conversation'}</strong><p>{p.messages.length ? 'Try another topic or search phrase.' : 'Choose a topic from the list on the right and share your research updates.'}</p></div>}
        </div>
        <form className="chat-composer" onSubmit={event => { event.preventDefault(); p.send(); }}>
          <div className="chat-composer-top"><span>Posting to <b>{p.topic}</b></span><button type="button" className="emoji-toggle" aria-label="Add emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen(value => !value)}><Smile size={17} /> Emoji</button></div>
          {emojiOpen && <div className="chat-emoji-picker-shell"><EmojiPicker emojiStyle="native" width={320} height={340} lazyLoadEmojis previewConfig={{ showPreview: false }} onEmojiClick={emoji => { p.onDraft(p.draft + emoji.emoji); setEmojiOpen(false); }} /></div>}
          <textarea rows={3} maxLength={2000} value={p.draft} onChange={event => p.onDraft(event.target.value)} placeholder="Write a research question, source, or progress update…" aria-label="Message your research group" />
          <div className="chat-composer-footer"><small>{p.draft.length}/2000 characters</small><button className="primary" type="submit" disabled={p.busy || !p.draft.trim()}><Send size={16} /> Send message</button></div>
        </form>
      </section>
      <aside className="panel chat-right-rail"><div className="rail-section topics-rail">
        <div className="rail-heading"><div><h3>Research topics</h3><small>Select a topic to open its messages</small></div><BookOpen size={20} /></div>
        <div className="topic-nav-list">{['All topics', ...p.topics].map(topic => {
          const count = topic === 'All topics' ? p.messages.length : p.messages.filter(message => (message.topic || 'General') === topic).length;
          return <button type="button" key={topic} className={'topic-nav-item' + (p.filter === topic ? ' active' : '')} onClick={() => { p.onFilter(topic); if (topic !== 'All topics') p.onTopic(topic); }}><span className="topic-bullet"><MessageCircle size={17} /></span><span className="topic-nav-label">{topic}</span><span className="topic-count">{count}</span></button>;
        })}</div>
        <div className="topic-rail-note"><span className="topic-rail-live-dot" /><span>{p.topics.length} research topics · {p.messages.length} messages</span></div>
      </div></aside>
    </div>
  );
}