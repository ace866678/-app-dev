import { CalendarDays, ChevronRight, Plus, Save, Trash2, X, Users, LockKeyhole } from 'lucide-react';

type Mt = { id: string; title: string; date: string; agenda: string[]; notes: string };
type Form = { title: string; date: string; notes: string };
type Props = {
  canManage: boolean; meetings: Mt[]; expanded: boolean; onToggleExpanded: () => void;
  selected: Mt | null; onSelect: (meeting: Mt) => void; onDelete: (id: string) => void;
  selectedAgenda: string[]; onChangeSelectedAgenda: (items: string[], id: string) => void;
  onSaveAgenda: () => void; onSaveNotes: (meeting: Mt, notes: string) => void;
  form: Form; onFormChange: (key: keyof Form, value: string) => void;
  agenda: string[]; onNewAgendaChange: (agenda: string[]) => void;
  onCreate: () => void; busy: boolean; onDashboard: () => void;
};

const dateLabel = (value?: string) => {
  if (!value) return 'Date not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date not set' : parsed.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function ResearchMeetings(p: Props) {
  const list = [...p.meetings].sort((a, b) => !a.date ? 1 : !b.date ? -1 : new Date(a.date).getTime() - new Date(b.date).getTime());
  return <>
    <div className="heading"><div><small>TEAM CHECK-IN</small><h1>Research meetings</h1><p>{p.canManage ? 'As workspace owner / leader, you manage scheduling and meeting edits.' : 'View the group schedule and meeting notes; scheduling is managed by the owner / leader.'}</p></div><button className="secondary" onClick={p.onDashboard}><CalendarDays size={15} /> Dashboard calendar</button></div>
    <div className="meetings-workspace">
      <section className="panel meeting-schedule-panel">
        <div className="panel-head"><div><h3>Meeting schedule · {p.meetings.length}</h3><small>Upcoming dates and times are listed first.</small></div><CalendarDays size={18} /></div>
        <div className="meeting-schedule-list">
          {list.slice(0, p.expanded ? undefined : 5).map(meeting => <button type="button" key={meeting.id} className={'meeting-schedule-row' + (p.selected?.id === meeting.id ? ' selected' : '')} onClick={() => p.onSelect(meeting)}>
            <span className="meeting-date-chip"><b>{meeting.date && !Number.isNaN(new Date(meeting.date).getTime()) ? new Date(meeting.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBD'}</b><small>{meeting.date && !Number.isNaN(new Date(meeting.date).getTime()) ? new Date(meeting.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'No time'}</small></span>
            <span className="meeting-schedule-copy"><b>{meeting.title}</b><small>{dateLabel(meeting.date)}</small></span><ChevronRight size={15} />
          </button>)}
          {!list.length && <p className="muted">No meetings have been scheduled yet.</p>}
        </div>
        {p.meetings.length > 5 && <button className="secondary wide meetings-expand" onClick={p.onToggleExpanded}>{p.expanded ? 'Show fewer' : 'Show all ' + p.meetings.length + ' meetings'}</button>}
        {p.selected && <div className="meeting-detail">
          <div className="panel-head"><div><h3>{p.selected.title}</h3><small>{dateLabel(p.selected.date)}</small></div>{p.canManage ? <button className="danger" onClick={() => p.onDelete(p.selected!.id)}><Trash2 size={14} /> Delete meeting</button> : <span className="role-pill member">View only</span>}</div>
          {p.canManage ? <div className="agenda-builder meeting-agenda-builder">
            <div className="agenda-builder-heading"><div><b>Meeting agenda</b><small>Add, remove, or edit talking points.</small></div><button type="button" className="secondary agenda-add" onClick={() => p.onChangeSelectedAgenda([...p.selectedAgenda, ''], p.selected!.id)}><Plus size={13} /> Add item</button></div>
            {p.selectedAgenda.map((item, index) => <div className="agenda-edit-row" key={p.selected!.id + '-' + index}><span>{String(index + 1).padStart(2, '0')}</span><input value={item} placeholder="What should the group discuss?" aria-label={'Agenda item ' + (index + 1)} onChange={event => p.onChangeSelectedAgenda(p.selectedAgenda.map((value, i) => i === index ? event.target.value : value), p.selected!.id)} /><button type="button" className="icon-quiet" aria-label="Remove agenda item" onClick={() => p.onChangeSelectedAgenda(p.selectedAgenda.filter((_value, i) => i !== index), p.selected!.id)}><X size={14} /></button></div>)}
            <button className="secondary save-agenda-button" onClick={p.onSaveAgenda} disabled={p.busy}><Save size={14} /> Save agenda</button>
          </div> : <div className="meeting-readonly-panel"><b>Meeting agenda</b>{p.selected.agenda?.length ? <ol>{p.selected.agenda.map((item, index) => <li key={index}>{item}</li>)}</ol> : <p className="muted">No agenda items have been added yet.</p>}</div>}
          <label>Shared meeting notes<textarea rows={3} defaultValue={p.selected.notes || ''} readOnly={!p.canManage} disabled={!p.canManage} onBlur={event => { if (p.canManage) p.onSaveNotes(p.selected!, event.currentTarget.value); }} key={p.selected.id} />{!p.canManage && <small>Only the owner / leader can edit shared meeting notes.</small>}</label>
        </div>}
      </section>
      {p.canManage ? <section className="panel meeting-create-panel">
        <div className="meeting-owner-heading"><h3>Schedule a meeting</h3><span className="role-pill owner"><Users size={12} /> Owner / Leader</span></div>
        <p className="muted">Choose a date, time, title, and your agenda.</p>
        <form onSubmit={event => { event.preventDefault(); p.onCreate(); }}>
          <label>Meeting name<input required value={p.form.title} onChange={event => p.onFormChange('title', event.target.value)} placeholder="e.g. Chapter 1 review" /></label>
          <label>Date & time<input required type="datetime-local" value={p.form.date} onChange={event => p.onFormChange('date', event.target.value)} /></label>
          <label>Initial notes<textarea rows={3} value={p.form.notes} onChange={event => p.onFormChange('notes', event.target.value)} placeholder="Decisions needed, sources to bring, goals…" /></label>
          <div className="agenda-builder"><div className="agenda-builder-heading"><div><b>My agenda</b><small>You control these items.</small></div><button type="button" className="secondary agenda-add" onClick={() => p.onNewAgendaChange([...p.agenda, ''])}><Plus size={13} /> Add item</button></div>
            {p.agenda.map((item, index) => <div className="agenda-edit-row" key={'new-' + index}><span>{String(index + 1).padStart(2, '0')}</span><input value={item} placeholder="e.g. Review sources for Chapter 2" aria-label={'New meeting agenda ' + (index + 1)} onChange={event => p.onNewAgendaChange(p.agenda.map((value, i) => i === index ? event.target.value : value))} /><button type="button" className="icon-quiet" aria-label="Remove agenda item" onClick={() => p.onNewAgendaChange(p.agenda.filter((_value, i) => i !== index))}><X size={14} /></button></div>)}
          </div>
          <button className="primary wide" disabled={p.busy}><Plus size={15} /> Schedule research meeting</button>
        </form>
      </section> : <section className="panel meeting-member-note"><LockKeyhole size={21} /><h3>Meeting management is restricted</h3><p>Members can view the schedule, agenda, and notes. Only the workspace owner / leader can create, edit, or delete meetings.</p></section>}
    </div>
  </>;
}