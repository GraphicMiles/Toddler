import { useState } from 'react';
import { CheckCircle2, CircleDashed, RefreshCw, XCircle } from 'lucide-react';
import { readProjectMemory } from '../memory/agentMemory.js';
import './TaskTimeline.css';

const STATUS_ICON = {
  verified: CheckCircle2,
  failed: XCircle,
  rejected: XCircle,
  cancelled: XCircle,
};

export default function TaskTimeline({ workspaceId }) {
  const [revision, setRevision] = useState(0);
  const memory = readProjectMemory(workspaceId);
  const tasks = memory.tasks.slice(0, 10);
  void revision;

  return (
    <section className="settings-card task-timeline">
      <div className="task-timeline-head">
        <div><h3>Agent task timeline</h3><p className="setting-help">Local bounded records; workspace source content is not copied into memory.</p></div>
        <button onClick={() => setRevision(value => value + 1)} title="Refresh task timeline"><RefreshCw size={14} /></button>
      </div>
      {tasks.length === 0 ? <p className="setting-help">No agent patch tasks for this workspace yet.</p> : tasks.map(task => {
        const Icon = STATUS_ICON[task.status] || CircleDashed;
        return (
          <details key={task.id} className="task-timeline-item">
            <summary>
              <Icon size={15} />
              <span>{task.request}</span>
              <strong>{task.status}</strong>
            </summary>
            <div className="task-timeline-body">
              {task.files?.length > 0 && <div><b>Files:</b> {task.files.join(', ')}</div>}
              {(task.events || []).map((event, index) => (
                <div className="task-event" key={`${event.at}-${index}`}>
                  <time>{new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  <span>{event.type}</span>
                  {event.message && <small>{event.message}</small>}
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </section>
  );
}
