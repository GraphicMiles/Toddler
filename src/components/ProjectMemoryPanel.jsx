import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { readProjectMemory, rememberProjectFact, removeProjectFact, updateProjectFact } from '../memory/agentMemory.js';
import './ProjectMemoryPanel.css';

export default function ProjectMemoryPanel({ workspaceId }) {
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState({});
  const memory = readProjectMemory(workspaceId);
  void revision;

  const addFact = () => {
    try {
      rememberProjectFact(workspaceId, { text: draft, provenance: 'user', approved: true });
      setDraft('');
      setRevision(value => value + 1);
    } catch (error) { alert(error.message); }
  };

  return (
    <section className="settings-card project-memory-panel">
      <h3>Approved project memory</h3>
      <p className="setting-help">Only facts you add or explicitly approve are used in future agent prompts. File contents and model guesses are not saved here.</p>
      <div className="memory-add-row">
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Example: Use CSS modules; never add broad storage permissions." />
        <button onClick={addFact} disabled={!draft.trim()}><Plus size={14} /> Add</button>
      </div>
      {memory.facts.length === 0 ? <p className="setting-help">No approved project facts yet.</p> : memory.facts.map(fact => (
        <div className="memory-fact" key={fact.id}>
          <textarea value={editing[fact.id] ?? fact.text} onChange={event => setEditing(current => ({ ...current, [fact.id]: event.target.value }))} />
          <small>{fact.provenance}</small>
          <button title="Save fact" onClick={() => {
            try {
              updateProjectFact(workspaceId, fact.id, editing[fact.id] ?? fact.text);
              setEditing(current => { const next = { ...current }; delete next[fact.id]; return next; });
              setRevision(value => value + 1);
            } catch (error) { alert(error.message); }
          }}><Save size={13} /></button>
          <button className="danger" title="Remove fact" onClick={() => { removeProjectFact(workspaceId, fact.id); setRevision(value => value + 1); }}><Trash2 size={13} /></button>
        </div>
      ))}
    </section>
  );
}
