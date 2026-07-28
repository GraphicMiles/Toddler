import { useState } from 'react';
import { RefreshCw, Trash2, Wifi, Bug, Cpu } from 'lucide-react';
import { readErrorLog, clearErrorLog } from '../utils/errorLog.js';
import { skillRegistry } from '../skills/skillRegistry.js';
import { readProjectMemory } from '../memory/agentMemory.js';
import { AUTONOMY_LEVELS, readAutonomyLevel, writeAutonomyLevel } from '../agent/autonomyPolicy.js';
import './Settings.css';

export default function Settings({
  endpoint,
  onEndpointChange,
  onClearChat,
  onReset,
  isNative = false,
  workspaceId = 'no-workspace',
}) {
  const [value, setValue] = useState(endpoint);
  const [errors, setErrors] = useState(() => readErrorLog());
  const [skills, setSkills] = useState(() => skillRegistry.list());
  const [autonomy, setAutonomy] = useState(readAutonomyLevel);
  const memory = readProjectMemory(workspaceId);

  const save = () => {
    const next = value.trim().replace(/\/$/, '');
    if (!next) return;
    localStorage.setItem('forgeai_endpoint', next);
    onEndpointChange?.(next);
  };
  const toggleSkill = (id, enabled) => {
    skillRegistry.setEnabled(id, enabled);
    setSkills(skillRegistry.list());
  };

  return (
    <div className="settings-screen">
      <div className="screen-pad">
        <div className="section-head">
          <h2>User & Settings</h2>
          <p>Runtime, privacy, and device diagnostics</p>
        </div>

        {!isNative && (
          <section className="settings-card">
            <h3><Wifi size={16} /> Ollama development preview</h3>
            <label className="setting-label" htmlFor="ollama-endpoint">Endpoint</label>
            <div className="setting-row">
              <input id="ollama-endpoint" value={value} onChange={event => setValue(event.target.value)} placeholder="http://localhost:11434" />
              <button onClick={save}><RefreshCw size={14} /> Save</button>
            </div>
            <p className="setting-help">Browser requests may require CORS. Android production inference uses the bundled llama.cpp runtime instead.</p>
          </section>
        )}

        <section className="settings-card">
          <h3>Local data</h3>
          <p className="setting-help">Chats and model metadata stay in app storage. Android GGUF inference works offline after a model is installed.</p>
          <div className="setting-row">
            <button onClick={onClearChat}>Clear chat history</button>
            <button className="danger" onClick={onReset}><Trash2 size={14} /> Reset app data</button>
          </div>
        </section>

        <section className="settings-card">
          <h3>Android agent skills</h3>
          <p className="setting-help">Skills load on demand and only receive their declared ForgeAI tools. Skill scripts are never executed on Android.</p>
          {skills.map(skill => (
            <label className="setting-row" key={skill.id} style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={skill.enabled} onChange={event => toggleSkill(skill.id, event.target.checked)} />
              <span><strong>{skill.name}</strong><br /><small>{skill.description}</small></span>
            </label>
          ))}
          <label className="setting-label" htmlFor="autonomy-level">Autonomy level</label>
          <select id="autonomy-level" value={autonomy} onChange={event => { setAutonomy(writeAutonomyLevel(event.target.value)); }}>
            <option value={AUTONOMY_LEVELS.OFF}>Off</option>
            <option value={AUTONOMY_LEVELS.SUGGEST}>Suggest only</option>
            <option value={AUTONOMY_LEVELS.READ_ONLY}>Automatic read-only context</option>
            <option value={AUTONOMY_LEVELS.PREPARE}>Prepare patches for approval</option>
          </select>
          <p className="setting-help">Android never auto-applies writes and never executes commands, regardless of this setting.</p>
          <p className="setting-help">Project memory: {memory.facts.length} approved fact(s), {memory.tasks.length} bounded task record(s). Model guesses are not persisted as facts.</p>
        </section>

        <section className="settings-card">
          <h3><Bug size={16} /> Error log</h3>
          <p className="setting-help">Runtime errors are stored locally on this device for debugging.</p>
          <div className="setting-row">
            <button onClick={() => setErrors(readErrorLog())}>Refresh log</button>
            <button onClick={() => { clearErrorLog(); setErrors([]); }}>Clear log</button>
          </div>
          <pre style={{ maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11, color: '#fca5a5' }}>
            {errors.length ? errors.map(error => `${error.time} [${error.context}] ${error.message}`).join('\n') : 'No recorded errors.'}
          </pre>
        </section>

        <section className="settings-card">
          <h3><Cpu size={16} /> Runtime</h3>
          <p className="setting-help">
            {isNative
              ? 'Android uses the bundled direct llama.cpp CPU runtime. Select or mount a model from My Collection.'
              : 'Web mode uses Ollama only as a development preview.'}
          </p>
          <p className="setting-help">Platform: {typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() || 'web'}</p>
        </section>
      </div>
    </div>
  );
}
