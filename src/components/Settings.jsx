import { useEffect, useState } from 'react';
import { Bot, Bug, Cpu, Database, Plug, RefreshCw, Shield, SlidersHorizontal, Trash2, Wifi } from 'lucide-react';
import { readErrorLog, clearErrorLog, recordError } from '../utils/errorLog.js';
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
  getLevelConfig,
} from '../safety/SafetyPolicy.js';
import AutomationSettings from './AutomationSettings.jsx';
import SkillValidatorSettings from './SkillValidatorSettings.jsx';
import ResearchSettings from './ResearchSettings.jsx';
import GitHubAutomationSettings from './GitHubAutomationSettings.jsx';
import SocialMediaSettings from './SocialMediaSettings.jsx';
import ExperimentalFeatures from './ExperimentalFeatures.jsx';
import TaskTimeline from './TaskTimeline.jsx';
import ProjectMemoryPanel from './ProjectMemoryPanel.jsx';
import RepositoryIndexPanel from './RepositoryIndexPanel.jsx';
import DropdownMenu from './DropdownMenu.jsx';
import './Settings.css';

const SETTINGS_SECTIONS = Object.freeze([
  { id: 'general', label: 'General', icon: SlidersHorizontal, description: 'Runtime endpoint, local data, and app basics.' },
  { id: 'agent', label: 'Agent', icon: Bot, description: 'Autonomy, response quality, memory, and repository context.' },
  { id: 'integrations', label: 'Integrations', icon: Plug, description: 'Research, GitHub, social automation, and experimental features.' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Safety policy, skills, validators, and trust settings.' },
  { id: 'diagnostics', label: 'Diagnostics', icon: Bug, description: 'Runtime status and local error logs.' },
]);

function SettingsHeader({ activeSection, onSectionChange }) {
  return (
    <div className="settings-nav-shell">
      <div className="settings-nav-title">
        <span className="settings-eyebrow">Settings</span>
      </div>
      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {SETTINGS_SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={activeSection === section.id}
              className={activeSection === section.id ? 'active' : ''}
              onClick={() => onSectionChange(section.id)}
              title={section.description}
            >
              <Icon size={18} />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingCard({ title, icon: Icon, children, description }) {
  return (
    <section className="settings-card">
      <h3>{Icon && <Icon size={16} />} {title}</h3>
      {description && <p className="setting-help first">{description}</p>}
      {children}
    </section>
  );
}

function SettingField({ label, htmlFor, children, help }) {
  return (
    <div className="setting-field">
      <label className="setting-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {help && <p className="setting-help">{help}</p>}
    </div>
  );
}

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
  const [activeSection, setActiveSection] = useState('general');
  const [notice, setNotice] = useState(null);
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
  const [safetyPolicy, setSafetyPolicy] = useState(() => getCurrentSafetyPolicy());
  const [developerMode, setDeveloperMode] = useState(() => getCurrentSafetyPolicy().getLevel() === POLICY_LEVELS.UNRESTRICTED);

  const memory = readProjectMemory(workspaceId);

  const showNotice = (message, type = 'success') => setNotice({ message, type, at: Date.now() });

  useEffect(() => setValue(endpoint), [endpoint]);

  useEffect(() => {
    if (!isNative) return;
    hasGithubToken().then(result => setGithubStored(Boolean(result.stored))).catch(error => recordError(error, 'settings-github-token-status'));
    getFullAutonomyStatus().then(result => setNativeFullAutonomy(Boolean(result.enabled))).catch(error => recordError(error, 'settings-autonomy-status'));
  }, [isNative]);

  const saveEndpoint = () => {
    const next = value.trim().replace(/\/$/, '');
    if (!next) return showNotice('Endpoint cannot be empty.', 'error');
    try { localStorage.setItem('forgeai_endpoint', next); }
    catch (error) { recordError(error, 'settings-save-endpoint'); }
    onEndpointChange?.(next);
    showNotice('Runtime endpoint saved.');
  };

  const toggleSkill = (id, enabled) => {
    try {
      skillRegistry.setEnabled(id, enabled);
      setSkills(skillRegistry.list());
      showNotice('Skill setting updated.');
    } catch (error) {
      recordError(error, 'settings-toggle-skill');
      showNotice(error.message, 'error');
    }
  };

  const changeAutonomy = async nextValue => {
    if (nextValue === AUTONOMY_LEVELS.FULL) {
      const accepted = window.confirm('Full Autonomous mode allows the local model to run arbitrary app-sandbox shell commands, modify app-private Git clones, use configured network research, commit, rebase, push, and trigger GitHub APIs without per-action approval. Web content can contain prompt injection. Enable it?');
      if (!accepted) return;
    }
    try {
      setAutonomy(writeAutonomyLevel(nextValue));
      if (isNative) {
        const result = await setFullAutonomy(nextValue === AUTONOMY_LEVELS.FULL);
        setNativeFullAutonomy(Boolean(result.enabled));
      }
      showNotice('Autonomy level updated.');
    } catch (error) {
      recordError(error, 'settings-full-autonomy');
      showNotice(`Could not update autonomy: ${error.message}`, 'error');
    }
  };

  const changeResponseQuality = nextValue => {
    try {
      setResponseQuality(writeResponseQuality(nextValue));
      showNotice('Response quality updated.');
    } catch (error) {
      recordError(error, 'settings-response-quality');
      showNotice(error.message, 'error');
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
      showNotice(`${installed.name} was imported disabled for review.`);
    } catch (error) {
      recordError(error, 'settings-import-skill');
      showNotice(`Skill import failed: ${error.message}`, 'error');
    }
  };

  const removeSkill = id => {
    if (!window.confirm('Remove this external skill?')) return;
    try {
      skillRegistry.remove(id);
      setSkills(skillRegistry.list());
      showNotice('External skill removed.');
    } catch (error) {
      recordError(error, 'settings-remove-skill');
      showNotice(error.message, 'error');
    }
  };

  const changeSafetyLevel = newLevel => {
    if (newLevel === POLICY_LEVELS.UNRESTRICTED) {
      const confirmed = window.confirm(
        '⚠️ WARNING: Unrestricted mode disables most safety checks including skill scanning, patch validation, terminal restrictions, and sensitive path blocking.\n\n' +
        'This is intended only for enterprise power users and local AI research with trusted models.\n\n' +
        'Are you sure you want to enable unrestricted mode?'
      );
      if (!confirmed) return;
    }

    const newPolicy = createSafetyPolicy(getLevelConfig(newLevel));
    const saved = saveSafetyPolicy(newPolicy);
    if (!saved) showNotice('Safety policy changed for this session, but could not be persisted.', 'error');
    else showNotice('Safety policy updated.');
    setSafetyPolicy(newPolicy);
    setDeveloperMode(newLevel === POLICY_LEVELS.UNRESTRICTED);
  };

  const toggleDeveloperMode = () => changeSafetyLevel(developerMode ? POLICY_LEVELS.STRICT : POLICY_LEVELS.UNRESTRICTED);

  const saveSearchSettings = () => {
    try {
      localStorage.setItem('forgeai_google_api_key', googleApiKey.trim());
      localStorage.setItem('forgeai_google_cx', googleCx.trim());
      showNotice('Search settings saved.');
    } catch (error) {
      recordError(error, 'settings-save-search');
      showNotice(`Could not save search settings: ${error.message}`, 'error');
    }
  };

  const storePat = async () => {
    try {
      if (!githubPat.trim()) throw new Error('Enter a GitHub PAT first.');
      await storeGithubToken(githubPat.trim());
      setGithubPat('');
      setGithubStored(true);
      showNotice('GitHub token stored securely.');
    } catch (error) {
      recordError(error, 'settings-store-github-token');
      showNotice(`Could not store token: ${error.message}`, 'error');
    }
  };

  const clearPat = async () => {
    try {
      await clearGithubToken();
      setGithubStored(false);
      showNotice('GitHub token cleared.');
    } catch (error) {
      recordError(error, 'settings-clear-github-token');
      showNotice(`Could not clear token: ${error.message}`, 'error');
    }
  };

  const renderGeneral = () => (
    <div className="settings-section-grid">
      {!isNative && (
        <SettingCard icon={Wifi} title="Ollama development preview" description="Browser mode uses Ollama as a local development endpoint. Android production inference uses the bundled llama.cpp runtime.">
          <SettingField label="Endpoint" htmlFor="ollama-endpoint">
            <div className="setting-row">
              <input id="ollama-endpoint" value={value} onChange={event => setValue(event.target.value)} placeholder="http://localhost:11434" />
              <button onClick={saveEndpoint}><RefreshCw size={14} /> Save</button>
            </div>
          </SettingField>
        </SettingCard>
      )}

      <SettingCard icon={Database} title="Local data" description="Chats and model metadata stay in app storage. Android GGUF inference works offline after a model is installed.">
        <div className="setting-row wrap">
          <button onClick={onClearChat}>Clear active chat</button>
          <button className="danger" onClick={onReset}><Trash2 size={14} /> Reset app data</button>
        </div>
      </SettingCard>
    </div>
  );

  const renderAgent = () => (
    <div className="settings-section-grid">
      <SettingCard icon={Bot} title="Agent behavior" description="Control the approval model, response quality, and how much the agent can do without asking.">
        <div className="settings-two-col">
          <SettingField label="Autonomy level" htmlFor="autonomy-level" help={nativeFullAutonomy ? 'Native full autonomy is enabled.' : 'Restricted modes never auto-apply writes or execute commands.'}>
            <DropdownMenu
              value={autonomy}
              onChange={next => { void changeAutonomy(next); }}
              label="Autonomy level"
              options={[
                { value: AUTONOMY_LEVELS.OFF, label: 'Off' },
                { value: AUTONOMY_LEVELS.SUGGEST, label: 'Suggest only' },
                { value: AUTONOMY_LEVELS.READ_ONLY, label: 'Automatic read-only context' },
                { value: AUTONOMY_LEVELS.PREPARE, label: 'Prepare patches for approval' },
                { value: AUTONOMY_LEVELS.FULL, label: 'Full Autonomous — terminal, network, Git writes' },
              ]}
            />
          </SettingField>
          <SettingField label="Response quality" htmlFor="response-quality" help="Reviewed mode uses three local generations and is slower.">
            <DropdownMenu
              value={responseQuality}
              onChange={changeResponseQuality}
              label="Response quality"
              options={[
                { value: RESPONSE_QUALITY.FAST, label: 'Fast — one model pass' },
                { value: RESPONSE_QUALITY.BALANCED, label: 'Balanced — normal streaming' },
                { value: RESPONSE_QUALITY.REVIEWED, label: 'Reviewed — draft, critic, revision' },
              ]}
            />
          </SettingField>
        </div>
        <p className="setting-help">Project memory: {memory.facts.length} approved fact(s), {memory.tasks.length} bounded task record(s). Model guesses are not persisted as facts.</p>
      </SettingCard>

      <AutomationSettings />
      <ProjectMemoryPanel workspaceId={workspaceId} />
      {workspaceProvider && <RepositoryIndexPanel workspaceId={workspaceId} workspaceProvider={workspaceProvider} workspaceTree={workspaceTree} />}
      <TaskTimeline workspaceId={workspaceId} />
    </div>
  );

  const renderIntegrations = () => (
    <div className="settings-section-grid">
      {isNative && (
        <SettingCard icon={Plug} title="Native research and GitHub credentials" description="Google search credentials are optional. GitHub PATs are stored in the native credential vault.">
          <div className="settings-two-col">
            <SettingField label="Google API key" htmlFor="google-api-key">
              <input id="google-api-key" type="password" value={googleApiKey} onChange={event => setGoogleApiKey(event.target.value)} />
            </SettingField>
            <SettingField label="Programmable Search Engine ID" htmlFor="google-cx">
              <input id="google-cx" value={googleCx} onChange={event => setGoogleCx(event.target.value)} />
            </SettingField>
          </div>
          <button onClick={saveSearchSettings}>Save search settings</button>
          <div className="settings-divider" />
          <SettingField label="GitHub PAT" htmlFor="github-pat" help={`PAT stored: ${githubStored ? 'Yes' : 'No'}. The token is never returned to JavaScript after storage.`}>
            <input id="github-pat" type="password" value={githubPat} onChange={event => setGithubPat(event.target.value)} placeholder={githubStored ? 'Token stored' : 'github_pat_...'} />
          </SettingField>
          <div className="setting-row wrap">
            <button onClick={() => { void storePat(); }}>Store PAT</button>
            <button className="danger" onClick={() => { void clearPat(); }}>Clear PAT</button>
          </div>
        </SettingCard>
      )}
      {!isNative && (
        <SettingCard icon={Plug} title="Native-only integrations" description="GitHub token vault and native research credentials are available in the Android build. Web mode keeps these disabled to avoid storing secrets insecurely." />
      )}
      <ResearchSettings />
      <GitHubAutomationSettings />
      <SocialMediaSettings />
      <ExperimentalFeatures />
    </div>
  );

  const renderSecurity = () => (
    <div className="settings-section-grid">
      <SettingCard icon={Shield} title="Safety policy" description="Enterprise and power-user configurable safety levels. Strict is the default.">
        <div className="policy-status">
          <span>Current policy</span>
          <strong>{safetyPolicy.getLevel().toUpperCase()}</strong>
          {safetyPolicy.isUnrestricted() && <em>UNRESTRICTED</em>}
        </div>
        <SettingField label="Compliance level" htmlFor="safety-level">
          <DropdownMenu
            value={safetyPolicy.getLevel()}
            onChange={changeSafetyLevel}
            label="Compliance level"
            options={[
              { value: POLICY_LEVELS.STRICT, label: 'Strict (Enterprise default)' },
              { value: POLICY_LEVELS.MODERATE, label: 'Moderate' },
              { value: POLICY_LEVELS.MINIMAL, label: 'Minimal' },
              { value: POLICY_LEVELS.UNRESTRICTED, label: 'Unrestricted (Power user / Research)' },
            ]}
          />
        </SettingField>
        <label className="toggle-row">
          <input type="checkbox" checked={developerMode} onChange={toggleDeveloperMode} />
          <span><strong>Developer Mode</strong> — unrestricted safety mode</span>
        </label>
        <p className="setting-help">Active rules: {safetyPolicy.getPolicySummary().activeRules.join(', ')}</p>
      </SettingCard>

      <SettingCard icon={Shield} title="Android agent skills" description="Skills load on demand and only receive their declared ForgeAI tools. Skill scripts are never executed on Android.">
        {isNative && <button onClick={importSkill}>Import SKILL.md</button>}
        <div className="settings-list">
          {skills.map(skill => (
            <label className="settings-toggle-row" key={skill.id}>
              <span className="settings-row-icon"><Shield size={18} /></span>
              <span className="settings-toggle-copy"><strong>{skill.name}{skill.external ? ' · External' : ''}</strong><small>{skill.description}</small></span>
              {skill.external && <button className="danger compact" type="button" onClick={(event) => { event.preventDefault(); removeSkill(skill.id); }}>Remove</button>}
              <input className="settings-switch" type="checkbox" checked={skill.enabled} onChange={event => toggleSkill(skill.id, event.target.checked)} />
            </label>
          ))}
        </div>
      </SettingCard>

      <SkillValidatorSettings />
    </div>
  );

  const renderDiagnostics = () => (
    <div className="settings-section-grid">
      <SettingCard icon={Cpu} title="Runtime" description={isNative ? 'Android uses the bundled direct llama.cpp CPU runtime. Select or mount a model from My Collection.' : 'Web mode uses Ollama only as a development preview.'}>
        <p className="setting-help">Platform: {typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() || 'web'}</p>
      </SettingCard>
      <SettingCard icon={Bug} title="Error log" description="Runtime errors are stored locally on this device for debugging.">
        <div className="setting-row wrap">
          <button onClick={() => setErrors(readErrorLog())}>Refresh log</button>
          <button onClick={() => { clearErrorLog(); setErrors([]); showNotice('Error log cleared.'); }}>Clear log</button>
        </div>
        <pre className="settings-error-log">
          {errors.length ? errors.map(error => `${error.time} [${error.context}] ${error.message}`).join('\n') : 'No recorded errors.'}
        </pre>
      </SettingCard>
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === 'agent') return renderAgent();
    if (activeSection === 'integrations') return renderIntegrations();
    if (activeSection === 'security') return renderSecurity();
    if (activeSection === 'diagnostics') return renderDiagnostics();
    return renderGeneral();
  };

  const activeMeta = SETTINGS_SECTIONS.find(section => section.id === activeSection) || SETTINGS_SECTIONS[0];

  return (
    <div className="settings-screen">
      <div className="screen-pad settings-layout-pad">
        <SettingsHeader activeSection={activeSection} onSectionChange={setActiveSection} />
        {notice && <div className={`settings-notice ${notice.type}`}>{notice.message}</div>}
        <div className="settings-section-heading compact">
          <h3>{activeMeta.label}</h3>
          <p>{activeMeta.description}</p>
        </div>
        {renderActiveSection()}
      </div>
    </div>
  );
}
