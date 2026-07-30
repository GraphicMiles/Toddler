import { useState } from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { validatorRegistry } from '../skills/validators/ValidatorRegistry.js';

export default function SkillValidatorSettings() {
  const [activeValidators, setActiveValidators] = useState(validatorRegistry.getActiveValidators());
  const [trustedSources, setTrustedSources] = useState([...validatorRegistry.trustedSources]);
  const [newSource, setNewSource] = useState('');

  const available = validatorRegistry.getAllAvailableValidators();

  const toggleValidator = (key) => {
    const next = activeValidators.includes(key)
      ? activeValidators.filter(item => item !== key)
      : [...activeValidators, key];
    validatorRegistry.setActiveValidators(next);
    setActiveValidators(next);
  };

  const addTrustedSource = () => {
    if (!newSource.trim()) return;
    validatorRegistry.addTrustedSource(newSource.trim());
    setTrustedSources([...validatorRegistry.trustedSources]);
    setNewSource('');
  };

  const removeTrustedSource = (source) => {
    validatorRegistry.removeTrustedSource(source);
    setTrustedSources([...validatorRegistry.trustedSources]);
  };

  const descriptionFor = key => ({
    'strict-security': 'Enterprise security scanner. Recommended default.',
    'basic-syntax': 'Light syntax and manifest checks.',
    passthrough: 'No validation. Use only with trusted sources.',
  })[key] || 'Validator rule';

  return (
    <section className="settings-card">
      <h3><ShieldCheck size={16} /> Skill validation rules</h3>
      <p className="setting-help first">Configure which validators run when importing skills.</p>

      <div className="setting-field">
        <label className="setting-label">Active validators</label>
        <div className="settings-list">
          {available.map(key => {
            const isActive = activeValidators.includes(key);
            return (
              <label key={key} className={`settings-check-card ${isActive ? 'active' : ''}`}>
                <input type="checkbox" checked={isActive} onChange={() => toggleValidator(key)} />
                <span><strong>{key}</strong><small>{descriptionFor(key)}</small></span>
                {isActive && <CheckCircle size={16} />}
              </label>
            );
          })}
        </div>
      </div>

      <div className="setting-field">
        <label className="setting-label" htmlFor="trusted-source">Trusted skill sources</label>
        <p className="setting-help">Skills from these sources bypass security validation.</p>
        <div className="setting-row">
          <input id="trusted-source" value={newSource} onChange={event => setNewSource(event.target.value)} placeholder="github.com/mycompany/skills" />
          <button onClick={addTrustedSource}>Add</button>
        </div>
        {trustedSources.length > 0 && (
          <div className="settings-pill-row">
            {trustedSources.map(source => (
              <span className="settings-pill" key={source}>{source}<button onClick={() => removeTrustedSource(source)} aria-label={`Remove ${source}`}>×</button></span>
            ))}
          </div>
        )}
      </div>

      <p className="setting-help">Skills containing <code>// @forgeai-trusted</code> are automatically accepted.</p>
    </section>
  );
}
