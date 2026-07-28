import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, Wifi, Bug, Cpu } from 'lucide-react';
import { readErrorLog, clearErrorLog } from '../utils/errorLog.js';
import { skillRegistry } from '../skills/skillRegistry.js';
import { scanSkillPackage } from '../skills/skillScanner.js';
import { parseSkillMarkdown } from '../skills/skillPackage.js';
import { clearGithubToken, getFullAutonomyStatus, hasGithubToken, pickSkillFile, setFullAutonomy, storeGithubToken } from '../nativeBridge.js';
import { readProjectMemory } from '../memory/agentMemory.js';
import { AUTONOMY_LEVELS, readAutonomyLevel, writeAutonomyLevel } from '../agent/autonomyPolicy.js';
import { RESPONSE_QUALITY, readResponseQuality, writeResponseQuality } from '../agent/responseQuality.js';
import { 
  createSafetyPolicy, 
  getCurrentSafetyPolicy, 
  saveSafetyPolicy, 
  POLICY_LEVELS,
  getLevelConfig 
} from '../safety/SafetyPolicy.js';
import AutomationSettings from './AutomationSettings.jsx';
import SkillValidatorSettings from './SkillValidatorSettings.jsx';
import ResearchSettings from './ResearchSettings.jsx';
import GitHubAutomationSettings from './GitHubAutomationSettings.jsx';
import SocialMediaSettings from './SocialMediaSettings.jsx';
import TaskTimeline from './TaskTimeline.jsx';
import ProjectMemoryPanel from './ProjectMemoryPanel.jsx';
import RepositoryIndexPanel from './RepositoryIndexPanel.jsx';
import './Settings.css';

export default function Settings({
  endpoint,
  onEndpointChange,
  onClearChat,
  onReset,
  isNative = false,
  workspaceId = 'no-workspace',
  workspaceProvider = null,
  workspaceTree = [],
}) {
  const [value, setValue] = useState(endpoint);
  const [errors, setErrors] = useState(() => readErrorLog());
  const [skills, setSkills] = useState(() => skillRegistry.list());
  const [autonomy, setAutonomy] = useState(readAutonomyLevel);
  const [responseQuality, setResponseQuality] = useState(readResponseQuality);
  const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem('forgeai_google_api_key') || '');
  const [googleCx, setGoogleCx] = useState(() => localStorage.getItem('forgeai_google_cx') || '');
  const [githubPat, setGithubPat] = useState('');
  const [githubStored, setGithubStored] = useState(false);
  const [nativeFullAutonomy, setNativeFullAutonomy] = useState(false);
  
  // Safety Policy State
  const [safetyPolicy, setSafetyPolicy] = useState(() => getCurrentSafetyPolicy());
  const [developerMode, setDeveloperMode] = useState(() => {
    const policy = getCurrentSafetyPolicy();
    return policy.getLevel() === POLICY_LEVELS.UNRESTRICTED;
  });
  
  const memory = readProjectMemory(workspaceId);
  useEffect(() => {
    if (!isNative) return;
    hasGithubToken().then(result => setGithubStored(Boolean(result.stored))).catch(() => {});
    getFullAutonomyStatus().then(result => setNativeFullAutonomy(Boolean(result.enabled))).catch(() => {});
  }, [isNative]);

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
  const changeAutonomy = async value => {
    if (value === AUTONOMY_LEVELS.FULL) {
      const accepted = window.confirm('Full Autonomous mode allows the local model to run arbitrary app-sandbox shell commands, modify app-private Git clones, use configured network research, commit, rebase, push, and trigger GitHub APIs without per-action approval. Web content can contain prompt injection. Enable it?');
      if (!accepted) return;
    }
    setAutonomy(writeAutonomyLevel(value));
    if (isNative) {
      const result = await setFullAutonomy(value === AUTONOMY_LEVELS.FULL);
      setNativeFullAutonomy(Boolean(result.enabled));
    }
  };
  const importSkill = async () => {
    try {
      const selected = await pickSkillFile();
      if (!selected?.content) return;
      const manifest = parseSkillMarkdown(selected.content);
      const report = scanSkillPackage(manifest, { 'SKILL.md': selected.content });
      if (report.verdict === 'reject') throw new Error(`Security scanner rejected this skill with ${report.summary.critical} critical finding(s).`);
      if (report.verdict === 'review' && !window.confirm(`Skill scanner found ${report.summary.warnings} warning(s). Install it disabled for review?`)) return;
      const installed = skillRegistry.install(manifest, report);
      setSkills(skillRegistry.list());
      alert(`${installed.name} was imported in disabled mode. Review its instructions and permissions before enabling it.`);
    } catch (error) {
      alert(`Skill import failed: ${error.message}`);
    }
  };
  const removeSkill = id => {
    if (!window.confirm('Remove this external skill?')) return;
    skillRegistry.remove(id);
    setSkills(skillRegistry.list());
  };

  // === Safety Policy Handlers ===
  const changeSafetyLevel = (newLevel) => {
    if (newLevel === POLICY_LEVELS.UNRESTRICTED) {
      const confirmed = window.confirm(
        '⚠️ WARNING: Unrestricted mode disables most safety checks including skill scanning, patch validation, terminal restrictions, and sensitive path blocking.\n\n' +
        'This is intended only for enterprise power users and local AI research with trusted models.\n\n' +
        'Are you sure you want to enable unrestricted mode?'
      );
      if (!confirmed) return;
    }

    const newConfig = getLevelConfig(newLevel);
    const newPolicy = createSafetyPolicy(newConfig);
    
    saveSafetyPolicy(newPolicy);
    setSafetyPolicy(newPolicy);
    setDeveloperMode(newLevel === POLICY_LEVELS.UNRESTRICTED);
  };

  const toggleDeveloperMode = () => {
    if (!developerMode) {
      // Turning ON developer mode → unrestricted
      changeSafetyLevel(POLICY_LEVELS.UNRESTRICTED);
    } else {
      // Turning OFF → go back to strict
      changeSafetyLevel(POLICY_LEVELS.STRICT);
    }
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
          {isNative && <button onClick={importSkill}>Import SKILL.md</button>}
          {skills.map(skill => (
            <div className="setting-row" key={skill.id} style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={skill.enabled} onChange={event => toggleSkill(skill.id, event.target.checked)} />
              <span style={{ flex: 1 }}><strong>{skill.name}</strong>{skill.external ? ' · External' : ''}<br /><small>{skill.description}</small></span>
              {skill.external && <button className="danger" onClick={() => removeSkill(skill.id)}>Remove</button>}
            </div>
          ))}
          <label className="setting-label" htmlFor="autonomy-level">Autonomy level</label>
          <select id="autonomy-level" value={autonomy} onChange={event => { void changeAutonomy(event.target.value); }}>
            <option value={AUTONOMY_LEVELS.OFF}>Off</option>
            <option value={AUTONOMY_LEVELS.SUGGEST}>Suggest only</option>
            <option value={AUTONOMY_LEVELS.READ_ONLY}>Automatic read-only context</option>
            <option value={AUTONOMY_LEVELS.PREPARE}>Prepare patches for approval</option>
            <option value={AUTONOMY_LEVELS.FULL}>Full Autonomous — terminal, network, Git writes</option>
          </select>
          <label className="setting-label" htmlFor="response-quality">Response quality</label>
          <select id="response-quality" value={responseQuality} onChange={event => setResponseQuality(writeResponseQuality(event.target.value))}>
            <option value={RESPONSE_QUALITY.FAST}>Fast — one model pass</option>
            <option value={RESPONSE_QUALITY.BALANCED}>Balanced — normal streaming</option>
            <option value={RESPONSE_QUALITY.REVIEWED}>Reviewed — draft, critic, revision</option>
          </select>
          <p className="setting-help">Reviewed mode uses three local generations and is slower. The 135M smoke-test model always falls back to one pass.</p>
          <p className="setting-help">{nativeFullAutonomy ? 'FULL AUTONOMY ACTIVE: app-sandbox terminal, autonomous writes, network research, and Git remote writes are enabled. Use Stop to interrupt active work.' : 'Restricted modes never auto-apply writes and never execute commands.'}</p>
          <p className="setting-help">Project memory: {memory.facts.length} approved fact(s), {memory.tasks.length} bounded task record(s). Model guesses are not persisted as facts.</p>
        </section>

        {isNative && (
          <section className="settings-card">
            <h3>Online research and GitHub</h3>
            <p className="setting-help">Without Google credentials, research uses Wikipedia and Google News RSS. Google Programmable Search requires an API key and Search Engine ID.</p>
            <label className="setting-label" htmlFor="google-api-key">Google API key</label>
            <input id="google-api-key" type="password" value={googleApiKey} onChange={event => setGoogleApiKey(event.target.value)} />
            <label className="setting-label" htmlFor="google-cx">Programmable Search Engine ID</label>
            <input id="google-cx" value={googleCx} onChange={event => setGoogleCx(event.target.value)} />
            <button onClick={() => { localStorage.setItem('forgeai_google_api_key', googleApiKey.trim()); localStorage.setItem('forgeai_google_cx', googleCx.trim()); }}>Save search settings</button>
            <label className="setting-label" htmlFor="github-pat">GitHub PAT — encrypted with Android Keystore</label>
            <input id="github-pat" type="password" value={githubPat} onChange={event => setGithubPat(event.target.value)} placeholder={githubStored ? 'Token stored' : 'github_pat_...'} />
            <div className="setting-row">
              <button onClick={async () => { await storeGithubToken(githubPat); setGithubPat(''); setGithubStored(true); }}>Store PAT</button>
              <button className="danger" onClick={async () => { await clearGithubToken(); setGithubStored(false); }}>Clear PAT</button>
            </div>
            <p className="setting-help">PAT stored: {githubStored ? 'Yes' : 'No'}. The token is never returned to JavaScript after storage and is not added to terminal environment variables.</p>
          </section>
        )}

        <ProjectMemoryPanel workspaceId={workspaceId} />
        {workspaceProvider && <RepositoryIndexPanel workspaceId={workspaceId} workspaceProvider={workspaceProvider} workspaceTree={workspaceTree} />}
        <TaskTimeline workspaceId={workspaceId} />

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

        {/* Safety Policy Configuration - Enterprise & Power User Feature */}
        <section className="settings-card">
          <h3>🛡️ Safety Policy</h3>
          <p className="setting-help">
            Enterprise &amp; power-user configurable safety levels. Default: <strong>Strict</strong>.
          </p>
          
          <div style={{ marginBottom: '12px' }}>
            <label className="setting-label">Current Policy Level</label>
            <div style={{ 
              padding: '8px 12px', 
              background: safetyPolicy.isUnrestricted() ? '#451a03' : '#1f2937', 
              borderRadius: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <strong>{safetyPolicy.getLevel().toUpperCase()}</strong>
              {safetyPolicy.isUnrestricted() && <span style={{ color: '#f59e0b' }}>• UNRESTRICTED</span>}
            </div>
          </div>

          <label className="setting-label" htmlFor="safety-level">Compliance Level</label>
          <select 
            id="safety-level" 
            value={safetyPolicy.getLevel()} 
            onChange={e => changeSafetyLevel(e.target.value)}
          >
            <option value={POLICY_LEVELS.STRICT}>Strict (Enterprise default)</option>
            <option value={POLICY_LEVELS.MODERATE}>Moderate</option>
            <option value={POLICY_LEVELS.MINIMAL}>Minimal</option>
            <option value={POLICY_LEVELS.UNRESTRICTED}>Unrestricted (Power user / Research)</option>
          </select>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={developerMode} 
                onChange={toggleDeveloperMode}
              />
              <span><strong>Developer Mode</strong> (Unrestricted)</span>
            </label>
            <p className="setting-help" style={{ fontSize: '12px', marginTop: '4px' }}>
              Skips non-critical validations. Use with caution. Affects skill scanner, patch validation, terminal commands, and workspace restrictions.
            </p>
          </div>

          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.75 }}>
            <strong>Active rules:</strong> {safetyPolicy.getPolicySummary().activeRules.join(', ')}
          </div>
        </section>

        {/* Automation Tiers Section */}
        <AutomationSettings />

        {/* Skill Validator Settings */}
        <SkillValidatorSettings />

        {/* Research Pipeline Settings */}
        <ResearchSettings />

        {/* GitHub Automation Settings */}
        <GitHubAutomationSettings />

        {/* Social Media Automation Settings */}
        <SocialMediaSettings />
      </div>
    </div>
  );
}
