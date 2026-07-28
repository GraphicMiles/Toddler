import { useState } from 'react';
import { validatorRegistry } from '../skills/validators/ValidatorRegistry.js';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';

export default function SkillValidatorSettings() {
  const [activeValidators, setActiveValidators] = useState(validatorRegistry.getActiveValidators());
  const [trustedSources, setTrustedSources] = useState([...validatorRegistry.trustedSources]);
  const [newSource, setNewSource] = useState('');

  const available = validatorRegistry.getAllAvailableValidators();

  const toggleValidator = (key) => {
    let next;
    if (activeValidators.includes(key)) {
      next = activeValidators.filter(k => k !== key);
    } else {
      next = [...activeValidators, key];
    }
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

  return (
    <section className="settings-card">
      <h3>🛡️ Skill Validation Rules</h3>
      <p className="setting-help">
        Configure which validators run when importing skills. Enterprise deployments can use relaxed rules.
      </p>

      {/* Active Validators */}
      <div style={{ margin: '16px 0' }}>
        <label className="setting-label">Active Validators</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {available.map(key => {
            const isActive = activeValidators.includes(key);
            const ValidatorClass = {
              'strict-security': 'StrictSecurityScanner',
              'basic-syntax': 'BasicSyntaxChecker',
              'passthrough': 'PassthroughValidator'
            }[key];

            return (
              <label key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: isActive ? '#1e3a8a' : '#111827',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <input 
                  type="checkbox" 
                  checked={isActive}
                  onChange={() => toggleValidator(key)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{key}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {key === 'strict-security' && 'Enterprise security scanner (recommended)'}
                    {key === 'basic-syntax' && 'Light syntax & manifest checks'}
                    {key === 'passthrough' && 'No validation — use only with trusted sources'}
                  </div>
                </div>
                {isActive && <CheckCircle size={16} color="#60a5fa" />}
              </label>
            );
          })}
        </div>
      </div>

      {/* Trusted Sources */}
      <div style={{ marginTop: '24px' }}>
        <label className="setting-label">Trusted Skill Sources</label>
        <p className="setting-help">Skills from these sources bypass security validation.</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
            placeholder="github.com/mycompany/skills"
            style={{ flex: 1, padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: '6px' }}
          />
          <button onClick={addTrustedSource} style={{ padding: '8px 16px' }}>Add</button>
        </div>

        {trustedSources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {trustedSources.map(source => (
              <div key={source} style={{
                background: '#1f2937',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {source}
                <button onClick={() => removeTrustedSource(source)} style={{ color: '#f87171' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
        Skills containing <code style={{ background: '#374151', padding: '1px 4px' }}>// @forgeai-trusted</code> are automatically accepted.
      </div>
    </section>
  );
}