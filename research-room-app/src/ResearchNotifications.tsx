import { Bell, BookOpen, CalendarDays, ListTodo, MessageCircle, Users, X, AtSign } from 'lucide-react';

type Notice = {
  id: string; workspaceId: string;
  kind: 'message' | 'meeting' | 'task' | 'ownership' | 'document' | 'mention';
  content: string; metadata: Record<string, any>; createdAt: string; readAt?: string | null;
};
type Props = {
  unread: number; notifications: Notice[]; onToggle: () => void; onClose: () => void;
  open: (notice: Notice) => void; markRead: () => void; enableDesktop: () => void;
};
const iconFor = (kind: Notice['kind']) => {
  if (kind === 'message') return <MessageCircle size={14} />;
  if (kind === 'mention') return <AtSign size={14} />;
  if (kind === 'meeting') return <CalendarDays size={14} />;
  if (kind === 'task') return <ListTodo size={14} />;
  if (kind === 'document') return <BookOpen size={14} />;
  return <Users size={14} />;
};
export default function ResearchNotifications(p: Props) {
  return <>
    <button type="button" className="notification-button" aria-label="Open notifications" onClick={p.onToggle}><Bell size={16} /><span>Notifications</span>{p.unread > 0 && <b>{p.unread > 99 ? '99+' : p.unread}</b>}</button>
    <div className="notifications-popover">
      <div className="panel-head"><div><h3>Notifications</h3><small>{p.unread} unread</small></div><button type="button" className="icon-quiet" aria-label="Close notifications" onClick={p.onClose}><X size={14} /></button></div>
      {p.notifications.slice(0, 10).map(notice => <button type="button" key={notice.id} className={'notification-row' + (!notice.readAt ? ' unread' : '')} onClick={() => p.open(notice)}>
        <span className={'notification-kind-icon ' + notice.kind}>{iconFor(notice.kind)}</span>
        <span className="notification-row-copy"><b>{notice.content}</b><small>{new Date(notice.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span>
        {!notice.readAt && <i />}
      </button>)}
      {!p.notifications.length && <p className="muted">New workspace activity will appear here.</p>}
      <div className="notification-popover-actions"><button className="secondary" onClick={p.enableDesktop}>Enable desktop alerts</button>{p.unread > 0 && <button className="secondary" onClick={p.markRead}>Mark read</button>}</div>
    </div>
  </>;
}